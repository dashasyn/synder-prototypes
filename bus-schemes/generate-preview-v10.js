// v10 — replace tick marks with small colored dots at stops
const fs = require('fs');

const COLORS = {
    bus: { line: '#F5A623', badge: '#F5A623' },
    trolleybus: { line: '#4CAF50', badge: '#4CAF50' }
};
const L = {
    colWidth: 170, rowHeight: 40, lineWidth: 5,
    tickW: 10, tickH: 4, dotRadius: 3, dotStroke: 1.5,
    paddingTop: 100, paddingBottom: 100, paddingSide: 30,
    badgeWidth: 50, badgeHeight: 24, badgeRadius: 12,
    fontSize: 12, routeFontSize: 11, headerFontSize: 20,
    branchFontSize: 9,
    parallelGap: 10,
    barOffset: 16, // how far below the branch-point stop the horizontal bar sits
};

// ─── Parse CSV ───
const csv = fs.readFileSync('data/routes.csv', 'utf8');
const csvLines = csv.trim().split('\n');
const hdr = csvLines[0].split(',').map(h => h.trim().toLowerCase());
const iR = hdr.indexOf('route_number'), iT = hdr.indexOf('type'),
      iO = hdr.indexOf('stop_order'), iN = hdr.indexOf('stop_name'), iM = hdr.indexOf('is_metro');
const routeMap = new Map();
for (let i = 1; i < csvLines.length; i++) {
    const c = csvLines[i].split(',').map(s => s.trim());
    if (c.length < 5) continue;
    const k = c[iR];
    if (!routeMap.has(k)) routeMap.set(k, { route_number: k, type: c[iT].includes('trolley') ? 'trolleybus' : 'bus', stops: [] });
    routeMap.get(k).stops.push({ order: parseInt(c[iO]), name: c[iN], is_metro: c[iM] === 'yes' });
}
for (const r of routeMap.values()) r.stops.sort((a, b) => a.order - b.order);
const routes = Array.from(routeMap.values());

// ─── Build tree ───
const stopName = process.argv[2] || 'Нямiга';
const matching = routes.filter(r => r.stops.some(s => s.name === stopName));
const rsd = matching.map(r => {
    const idx = r.stops.findIndex(s => s.name === stopName);
    return { route: r, stops: r.stops.slice(idx) };
});

function buildTree(sel, data) {
    const root = {
        stop: sel, isMetro: data[0]?.stops[0]?.is_metro || false,
        routes: data.map(d => d.route), children: [], depth: 0, x: 0,
        _rem: data.map(d => ({ route: d.route, stops: d.stops.slice(1) }))
    };
    (function build(node) {
        const groups = new Map();
        for (const rs of node._rem) {
            if (!rs.stops.length) continue;
            const ns = rs.stops[0];
            if (!groups.has(ns.name)) groups.set(ns.name, { si: ns, entries: [] });
            groups.get(ns.name).entries.push({ route: rs.route, stops: rs.stops.slice(1) });
        }
        for (const [sn, g] of groups) {
            const ch = { stop: sn, isMetro: g.si.is_metro, routes: g.entries.map(e => e.route),
                children: [], depth: node.depth + 1, x: 0, _rem: g.entries };
            node.children.push(ch);
            build(ch);
        }
    })(root);
    return root;
}

function layoutTree(root) {
    let li = 0;
    (function lay(n) {
        if (!n.children.length) { n.x = li++; return; }
        n.children.sort((a, b) => {
            const at = a.routes.some(r => r.type === 'trolleybus');
            const bt = b.routes.some(r => r.type === 'trolleybus');
            if (at !== bt) return bt ? -1 : 1;
            return a.routes[0].route_number.localeCompare(b.routes[0].route_number, 'be', { numeric: true });
        });
        for (const c of n.children) lay(c);
        n.x = (n.children[0].x + n.children[n.children.length - 1].x) / 2;
    })(root);
    return li;
}

function maxDepth(n) { return !n.children.length ? n.depth : Math.max(...n.children.map(maxDepth)); }

// Word-wrap for stop names
function wrapText(text, maxChars) {
    if (text.length <= maxChars) return [text];
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
        if (cur && cur.length + 1 + w.length > maxChars) { lines.push(cur); cur = w; }
        else cur = cur ? cur + ' ' + w : w;
    }
    if (cur) lines.push(cur);
    return lines;
}

const tree = buildTree(stopName, rsd);
const leafCount = layoutTree(tree);
const md = maxDepth(tree);

const W = L.paddingSide * 2 + Math.max(leafCount, 1) * L.colWidth;
const H = L.paddingTop + (md + 1) * L.rowHeight + L.paddingBottom + 80;
const PX = (x) => L.paddingSide + (x + 0.5) * L.colWidth;
const PY = (d) => L.paddingTop + d * L.rowHeight;
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function getTypes(node) { return [...new Set(node.routes.map(r => r.type))].sort(); }
function typeOffsets(types) {
    if (types.length === 1) return [{ type: types[0], dx: 0, dy: 0 }];
    return types.map((t, i) => ({
        type: t,
        dx: -L.parallelGap / 2 + i * L.parallelGap,
        dy: -L.parallelGap / 2 + i * L.parallelGap,
    }));
}

// ─── SVG ───
let svg = '';
svg += `<rect width="${W}" height="${H}" fill="#fff" rx="16"/>`;
svg += `<text x="${W / 2}" y="36" text-anchor="middle" font-size="${L.headerFontSize}" font-weight="700" fill="#1a1a2e">${esc(stopName)}</text>`;
svg += `<g transform="translate(${W / 2},56)"><rect x="-30" y="-11" width="60" height="22" rx="11" fill="#E74C3C" opacity=".12"/><text x="0" y="4" text-anchor="middle" font-size="11" fill="#E74C3C" font-weight="600">Вы тут</text></g>`;

function drawLine(x1, y1, x2, y2, color) {
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${L.lineWidth}" stroke-linecap="square"/>`;
}

// ── Render edges: clean comb structure ──
function renderEdges(node) {
    if (!node.children.length) return;

    const nx = PX(node.x), ny = PY(node.depth);
    const nOff = typeOffsets(getTypes(node));

    if (node.children.length === 1) {
        // Single child — straight vertical, no branching
        const child = node.children[0];
        const cx = PX(child.x), cy = PY(child.depth);
        const cOff = typeOffsets(getTypes(child));
        for (const co of cOff) {
            const no = nOff.find(n => n.type === co.type);
            const dx1 = no ? no.dx : co.dx;
            drawLine(nx + dx1, ny, cx + co.dx, cy, COLORS[co.type].line);
        }
        renderEdges(child);
        return;
    }

    // ── Multiple children: comb structure ──
    // 1. Short trunk stub from node down to the horizontal bar
    const barY = ny + L.barOffset;

    for (const { type, dx } of nOff) {
        drawLine(nx + dx, ny, nx + dx, barY, COLORS[type].line);
    }

    // 2. For each child: horizontal from trunk to child x, then vertical to child y
    for (const child of node.children) {
        const cx = PX(child.x), cy = PY(child.depth);
        const cOff = typeOffsets(getTypes(child));

        for (const co of cOff) {
            const no = nOff.find(n => n.type === co.type);
            const trunkDx = no ? no.dx : 0;
            const childDx = co.dx;
            const dy = co.dy || 0;
            const color = COLORS[co.type].line;

            // Horizontal segment (at barY + dy)
            drawLine(nx + trunkDx, barY + dy, cx + childDx, barY + dy, color);
            // Vertical drop from bar to child
            drawLine(cx + childDx, barY + dy, cx + childDx, cy, color);
        }
    }

    // Recurse
    for (const child of node.children) renderEdges(child);
}

// ── Render nodes ──
function renderNodes(node) {
    const nx = PX(node.x), ny = PY(node.depth);
    const isRoot = node.depth === 0;
    const isLeaf = !node.children.length;
    const nTypes = getTypes(node);
    const nOff = typeOffsets(nTypes);

    // Small white dots at each stop
    for (const { type, dx } of nOff) {
        const tc = isRoot ? '#E74C3C' : COLORS[type].line;
        svg += `<circle cx="${nx + dx}" cy="${ny}" r="${L.dotRadius}" fill="#fff" stroke="${tc}" stroke-width="${L.dotStroke}"/>`;
    }

    // Metro icon
    if (node.isMetro && !isRoot) {
        const leftDx = nOff[0].dx;
        svg += `<circle cx="${nx + leftDx - 16}" cy="${ny}" r="6.5" fill="#E74C3C"/>`;
        svg += `<text x="${nx + leftDx - 16}" y="${ny + 3.5}" text-anchor="middle" font-size="9" font-weight="700" fill="#fff">М</text>`;
    }

    // Stop name — wrapped
    if (!isRoot) {
        const rightDx = nOff[nOff.length - 1].dx;
        const lx = nx + rightDx + L.dotRadius + 8;
        const fw = node.isMetro ? '600' : '400';
        const maxChars = 16;
        const nameLines = wrapText(node.stop, maxChars);
        const lineH = L.fontSize + 2;
        const startY = ny + 4 - ((nameLines.length - 1) * lineH) / 2;
        nameLines.forEach((ln, i) => {
            svg += `<text x="${lx}" y="${startY + i * lineH}" font-size="${L.fontSize}" font-weight="${fw}" fill="#333">${esc(ln)}</text>`;
        });
    }

    // Route number annotations at branch bar
    if (node.children.length > 1) {
        const barY = ny + L.barOffset;
        for (const child of node.children) {
            const cx = PX(child.x);
            const nums = child.routes.map(r => r.route_number).join(', ');
            // Above the horizontal bar, near the child's x
            svg += `<text x="${cx}" y="${barY - 5}" text-anchor="middle" font-size="${L.branchFontSize}" fill="#999" font-weight="600">${nums}</text>`;
        }
    }

    // Terminal badges
    if (isLeaf) {
        const all = [...node.routes.filter(r => r.type === 'bus'), ...node.routes.filter(r => r.type === 'trolleybus')];
        all.forEach((route, i) => {
            const by = ny + 20 + i * (L.badgeHeight + 4);
            const bc = COLORS[route.type];
            svg += `<rect x="${nx - L.badgeWidth / 2}" y="${by - L.badgeHeight / 2}" width="${L.badgeWidth}" height="${L.badgeHeight}" rx="${L.badgeRadius}" fill="${bc.badge}"/>`;
            svg += `<text x="${nx}" y="${by + 4}" text-anchor="middle" font-size="${L.routeFontSize}" font-weight="700" fill="#fff">${esc(route.route_number)}</text>`;
        });
    }

    for (const ch of node.children) renderNodes(ch);
}

renderEdges(tree);
renderNodes(tree);

// Legend
const ly = H - 25;
svg += `<g transform="translate(${L.paddingSide},${ly})">`;
svg += `<rect x="0" y="-8" width="14" height="14" rx="3" fill="${COLORS.bus.badge}"/><text x="20" y="4" font-size="11" fill="#666">Аўтобус</text>`;
svg += `<rect x="95" y="-8" width="14" height="14" rx="3" fill="${COLORS.trolleybus.badge}"/><text x="115" y="4" font-size="11" fill="#666">Тралейбус</text>`;
svg += `<circle cx="210" cy="0" r="6.5" fill="#E74C3C"/><text x="210" y="3.5" text-anchor="middle" font-size="9" font-weight="700" fill="#fff">М</text><text x="222" y="4" font-size="11" fill="#666">Метро</text>`;
svg += `</g>`;

const full = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="font-family:'Segoe UI',system-ui,sans-serif">${svg}</svg>`;
fs.writeFileSync('preview-v10.svg', full);
console.log(`Done: ${W}x${H}, leaves:${leafCount}, depth:${md}`);
