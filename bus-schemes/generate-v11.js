// v11 — vertical column layout, two-color system (yellow bus, teal trolleybus)
// Moscow-inspired: shared trunk, branches peel off to sides with rounded corners
const fs = require('fs');

// ─── Config ───
const COLORS = {
    bus: '#F5A623',
    trolleybus: '#00897B',
    metro: '#E74C3C',
    text: '#1a1a2e',
    dimText: '#999',
    bg: '#ffffff',
};

const L = {
    rowHeight: 52,        // vertical spacing between stops
    colWidth: 170,        // horizontal spacing between columns
    lineWidth: 5,         // route line thickness
    lineGap: 16,          // gap between parallel bus/trolley lines (wider to avoid overlap)
    dotRadius: 3,         // white stop dot radius
    dotStroke: 1.5,       // dot border width
    cornerRadius: 16,     // rounded corner for branch turns
    paddingTop: 110,      // space for header + route index
    paddingBottom: 80,    // space for legend
    paddingSide: 80,
    fontSize: 12,
    metroFontSize: 9,
    headerFontSize: 22,
    indexFontSize: 11,
    branchLabelSize: 8,
    termBadgeW: 52,
    termBadgeH: 24,
    termBadgeR: 12,
    nameGap: 10,          // gap between dot and stop name text
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

// ─── Build Tree ───
const stopName = process.argv[2] || 'Нямiга';
const matching = routes.filter(r => r.stops.some(s => s.name === stopName));
const rsd = matching.map(r => {
    const idx = r.stops.findIndex(s => s.name === stopName);
    return { route: r, stops: r.stops.slice(idx) };
});

function buildTree(sel, data) {
    const root = {
        stop: sel, isMetro: data[0]?.stops[0]?.is_metro || false,
        routes: data.map(d => d.route), children: [], depth: 0,
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
        for (const [, g] of groups) {
            const ch = {
                stop: g.si.name, isMetro: g.si.is_metro,
                routes: g.entries.map(e => e.route), children: [],
                depth: node.depth + 1, _rem: g.entries
            };
            node.children.push(ch);
            build(ch);
        }
    })(root);
    return root;
}

// ─── Layout: trunk-preserving column assignment ───
function layoutTree(root) {
    let nextCol = 0;

    function assign(node) {
        if (!node.children.length) {
            node.col = nextCol++;
            return;
        }
        // Primary child = most routes (trunk continuation)
        const primary = node.children.reduce((a, b) =>
            b.routes.length > a.routes.length ? b : a, node.children[0]);

        // Split non-primary into left (trolley-heavy) and right (bus-heavy)
        const left = [], right = [];
        for (const c of node.children) {
            if (c === primary) continue;
            const tCount = c.routes.filter(r => r.type === 'trolleybus').length;
            const bCount = c.routes.filter(r => r.type === 'bus').length;
            if (tCount > bCount) left.push(c);
            else right.push(c);
        }

        // Assign columns: left branches → primary → right branches
        for (const c of left) assign(c);
        assign(primary);
        for (const c of right) assign(c);

        // Keep trunk straight: parent col = primary's col
        node.col = primary.col;
    }

    assign(root);
    return nextCol;
}

function maxDepth(n) {
    return !n.children.length ? n.depth : Math.max(...n.children.map(maxDepth));
}

const tree = buildTree(stopName, rsd);
const totalCols = layoutTree(tree);
const md = maxDepth(tree);

// ─── Coordinate helpers ───
const W = L.paddingSide * 2 + Math.max(totalCols, 1) * L.colWidth;
const H = L.paddingTop + (md + 2) * L.rowHeight + L.paddingBottom;
const PX = (col) => L.paddingSide + (col + 0.5) * L.colWidth;
const PY = (depth) => L.paddingTop + depth * L.rowHeight;
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ─── Type helpers ───
function getTypes(node) {
    return [...new Set(node.routes.map(r => r.type))].sort();
}

function lineOffsets(types) {
    if (types.length === 1) return [{ type: types[0], dx: 0 }];
    // Trolley on LEFT, bus on RIGHT — so branches peel off without crossing
    return [
        { type: 'trolleybus', dx: -L.lineGap / 2 },
        { type: 'bus', dx: L.lineGap / 2 },
    ].filter(o => types.includes(o.type));
}

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

// ─── SVG layers ───
let bgSvg = '';
let edgeSvg = '';
let nodeSvg = '';
let labelSvg = '';

// ─── Background & Header ───
bgSvg += `<rect width="${W}" height="${H}" fill="${COLORS.bg}" rx="16"/>`;
bgSvg += `<text x="${PX(tree.col)}" y="36" text-anchor="middle" font-size="${L.headerFontSize}" font-weight="700" fill="${COLORS.text}">${esc(stopName)}</text>`;
bgSvg += `<g transform="translate(${PX(tree.col)},56)">`;
bgSvg += `<rect x="-30" y="-11" width="60" height="22" rx="11" fill="${COLORS.metro}" opacity=".15"/>`;
bgSvg += `<text x="0" y="4" text-anchor="middle" font-size="11" fill="${COLORS.metro}" font-weight="600">Вы тут</text></g>`;

// ─── Route Index (top bar) ───
const busRoutes = matching.filter(r => r.type === 'bus').map(r => r.route_number).sort((a, b) => a.localeCompare(b, 'be', { numeric: true }));
const trolleyRoutes = matching.filter(r => r.type === 'trolleybus').map(r => r.route_number).sort((a, b) => a.localeCompare(b, 'be', { numeric: true }));

let indexX = L.paddingSide;
const indexY = 80;
if (busRoutes.length) {
    bgSvg += `<rect x="${indexX}" y="${indexY - 10}" width="${12}" height="${12}" rx="3" fill="${COLORS.bus}"/>`;
    bgSvg += `<text x="${indexX + 16}" y="${indexY}" font-size="${L.indexFontSize}" fill="${COLORS.text}" font-weight="600">${busRoutes.join(', ')}</text>`;
    indexX += 20 + busRoutes.join(', ').length * 6.5;
}
if (trolleyRoutes.length) {
    indexX += 15;
    bgSvg += `<rect x="${indexX}" y="${indexY - 10}" width="${12}" height="${12}" rx="3" fill="${COLORS.trolleybus}"/>`;
    bgSvg += `<text x="${indexX + 16}" y="${indexY}" font-size="${L.indexFontSize}" fill="${COLORS.text}" font-weight="600">${trolleyRoutes.join(', ')}</text>`;
}

// ─── Render Edges ───
const KAPPA = 0.5523; // Bezier quarter-circle constant

// Draw a single curved branch: down → horizontal → down, with rounded corners
function drawBranchPath(x1, y1, x2, y2, cornerY, color) {
    const goRight = x2 > x1;
    const R = Math.min(L.cornerRadius,
        Math.abs(x2 - x1) * 0.45,
        Math.max(1, cornerY - y1 - 1),
        Math.max(1, y2 - cornerY - 1)
    );
    const k = KAPPA * R;

    let d;
    if (goRight) {
        d = [
            `M${x1},${y1}`,
            `V${cornerY - R}`,
            `C${x1},${cornerY - R + k} ${x1 + R - k},${cornerY} ${x1 + R},${cornerY}`,
            `H${x2 - R}`,
            `C${x2 - R + k},${cornerY} ${x2},${cornerY + R - k} ${x2},${cornerY + R}`,
            `V${y2}`,
        ].join(' ');
    } else {
        d = [
            `M${x1},${y1}`,
            `V${cornerY - R}`,
            `C${x1},${cornerY - R + k} ${x1 - R + k},${cornerY} ${x1 - R},${cornerY}`,
            `H${x2 + R}`,
            `C${x2 + R - k},${cornerY} ${x2},${cornerY + R - k} ${x2},${cornerY + R}`,
            `V${y2}`,
        ].join(' ');
    }
    edgeSvg += `<path d="${d}" fill="none" stroke="${color}" stroke-width="${L.lineWidth}" stroke-linecap="round"/>`;
}

function renderEdges(node) {
    if (!node.children.length) return;

    const px = PX(node.col);
    const py = PY(node.depth);
    const pOff = lineOffsets(getTypes(node));

    // Primary child = trunk continuation (most routes)
    const primary = node.children.reduce((a, b) =>
        b.routes.length > a.routes.length ? b : a, node.children[0]);

    // Trunk: straight vertical lines down to primary
    for (const po of pOff) {
        const pcOff = lineOffsets(getTypes(primary));
        const co = pcOff.find(c => c.type === po.type);
        if (!co) continue;
        const cx = PX(primary.col);
        const cy = PY(primary.depth);
        edgeSvg += `<line x1="${px + po.dx}" y1="${py}" x2="${cx + co.dx}" y2="${cy}" stroke="${COLORS[po.type]}" stroke-width="${L.lineWidth}" stroke-linecap="round"/>`;
    }

    // Branches: sorted by direction, furthest first in each direction
    const branches = node.children.filter(c => c !== primary);
    const rightBranches = branches.filter(c => c.col > node.col)
        .sort((a, b) => (b.col - node.col) - (a.col - node.col)); // furthest first
    const leftBranches = branches.filter(c => c.col < node.col)
        .sort((a, b) => (node.col - b.col) - (node.col - a.col)); // furthest first

    // Branch corner positions: push down ~1/3 between parent and child for proper 90° curves
    const childMinY = Math.min(...branches.map(c => PY(c.depth)));
    const availableV = childMinY - py;
    const slotH = L.lineWidth + 4;
    const baseY = py + Math.max(L.cornerRadius + 2, availableV * 0.3);

    function processBranchGroup(group, goRight) {
        group.forEach((child, slotIdx) => {
            const cx = PX(child.col);
            const cy = PY(child.depth);
            const cOff = lineOffsets(getTypes(child));

            cOff.forEach((co, typeIdx) => {
                const po = pOff.find(p => p.type === co.type);
                if (!po) return;

                // Outer type curves FIRST (smaller cornerY), inner curves second
                // Right turn: teal (left) is outer → typeIdx doesn't matter if single type
                // For dual types going same direction: outer = further from center of turn
                let typeOrder = 0;
                if (cOff.length > 1) {
                    // For right turn: outer is the one with smaller dx (left side = teal)
                    // For left turn: outer is the one with larger dx (right side = bus)
                    const outerType = goRight ? 'trolleybus' : 'bus';
                    typeOrder = co.type === outerType ? 0 : 1;
                }

                const cornerY = baseY + slotIdx * slotH + typeOrder * (L.lineWidth + 2);
                drawBranchPath(px + po.dx, py, cx + co.dx, cy, cornerY, COLORS[co.type]);
            });
        });
    }

    processBranchGroup(rightBranches, true);
    processBranchGroup(leftBranches, false);

    for (const ch of node.children) renderEdges(ch);
}

// ─── Render Nodes ───
function renderNodes(node) {
    const nx = PX(node.col);
    const ny = PY(node.depth);
    const isRoot = node.depth === 0;
    const isLeaf = !node.children.length;
    const types = getTypes(node);
    const offsets = lineOffsets(types);

    // White dots at each stop (on each line)
    for (const { type, dx } of offsets) {
        const tc = isRoot ? COLORS.metro : COLORS[type];
        nodeSvg += `<circle cx="${nx + dx}" cy="${ny}" r="${L.dotRadius}" fill="#fff" stroke="${tc}" stroke-width="${L.dotStroke}"/>`;
    }

    // Metro icon
    if (node.isMetro) {
        const leftDx = offsets[0].dx;
        nodeSvg += `<circle cx="${nx + leftDx - 16}" cy="${ny}" r="7" fill="${COLORS.metro}"/>`;
        nodeSvg += `<text x="${nx + leftDx - 16}" y="${ny + 3.5}" text-anchor="middle" font-size="${L.metroFontSize}" font-weight="700" fill="#fff">М</text>`;
    }

    // Stop name — placed to the right normally, to the left for left-side branches
    if (!isRoot) {
        const trunkCol = tree.col;
        const nameOnLeft = node.col < trunkCol; // left-side branches: names go left
        const fw = node.isMetro ? '600' : '400';
        const nameLines = wrapText(node.stop, 18);
        const lineH = L.fontSize + 2;
        const startY = ny + 4 - ((nameLines.length - 1) * lineH) / 2;

        if (nameOnLeft) {
            const leftDx = offsets[0].dx;
            const lx = nx + leftDx - L.nameGap;
            nameLines.forEach((ln, i) => {
                nodeSvg += `<text x="${lx}" y="${startY + i * lineH}" font-size="${L.fontSize}" font-weight="${fw}" fill="${COLORS.text}" text-anchor="end">${esc(ln)}</text>`;
            });
        } else {
            const rightDx = offsets[offsets.length - 1].dx;
            const lx = nx + rightDx + L.nameGap;
            nameLines.forEach((ln, i) => {
                nodeSvg += `<text x="${lx}" y="${startY + i * lineH}" font-size="${L.fontSize}" font-weight="${fw}" fill="${COLORS.text}">${esc(ln)}</text>`;
            });
        }
    }

    // Branch route labels (small numbers near the child, not the parent)
    if (node.children.length > 1) {
        for (const child of node.children) {
            const cx = PX(child.col);
            const cy = PY(child.depth) - 8; // just above the first child stop
            const nums = child.routes.map(r => r.route_number).join(', ');
            labelSvg += `<text x="${cx}" y="${cy}" text-anchor="middle" font-size="${L.branchLabelSize}" fill="${COLORS.dimText}" font-weight="600">${nums}</text>`;
        }
    }

    // Terminus badges (large route number pills at leaf nodes)
    if (isLeaf) {
        const allRoutes = [...node.routes.filter(r => r.type === 'bus'), ...node.routes.filter(r => r.type === 'trolleybus')];
        allRoutes.forEach((route, i) => {
            const by = ny + 22 + i * (L.termBadgeH + 5);
            const bc = COLORS[route.type];
            nodeSvg += `<rect x="${nx - L.termBadgeW / 2}" y="${by - L.termBadgeH / 2}" width="${L.termBadgeW}" height="${L.termBadgeH}" rx="${L.termBadgeR}" fill="${bc}"/>`;
            nodeSvg += `<text x="${nx}" y="${by + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">${esc(route.route_number)}</text>`;
        });
    }

    for (const ch of node.children) renderNodes(ch);
}

renderEdges(tree);
renderNodes(tree);

// ─── Legend ───
const ly = H - 30;
bgSvg += `<g transform="translate(${L.paddingSide},${ly})">`;
bgSvg += `<rect x="0" y="-8" width="14" height="14" rx="3" fill="${COLORS.bus}"/><text x="20" y="4" font-size="11" fill="${COLORS.dimText}">Аўтобус</text>`;
bgSvg += `<rect x="100" y="-8" width="14" height="14" rx="3" fill="${COLORS.trolleybus}"/><text x="120" y="4" font-size="11" fill="${COLORS.dimText}">Тралейбус</text>`;
bgSvg += `<circle cx="225" cy="0" r="7" fill="${COLORS.metro}"/><text x="225" y="3.5" text-anchor="middle" font-size="9" font-weight="700" fill="#fff">М</text><text x="238" y="4" font-size="11" fill="${COLORS.dimText}">Метро</text>`;
bgSvg += `</g>`;

// ─── Assemble SVG ───
const full = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="font-family:'Segoe UI',system-ui,sans-serif">${bgSvg}${edgeSvg}${nodeSvg}${labelSvg}</svg>`;
fs.writeFileSync('preview-v11.svg', full);
console.log(`v11 done: ${W}×${H}, cols:${totalCols}, depth:${md}, routes:${matching.length}`);
