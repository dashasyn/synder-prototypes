// ─── Configuration ───
const COLORS = {
    bus: { line: '#F5A623', badge: '#F5A623', badgeText: '#fff' },
    trolleybus: { line: '#4CAF50', badge: '#4CAF50', badgeText: '#fff' }
};

const LAYOUT = {
    colWidth: 180,        // horizontal space per leaf branch
    rowHeight: 36,        // vertical space per stop
    lineWidth: 6,         // route line thickness
    tickW: 12,            // stop tick width (protrudes right)
    tickH: 5,             // stop tick height
    paddingTop: 100,      // space for header
    paddingBottom: 80,    // space at bottom for badges
    paddingSide: 30,      // left/right padding
    badgeWidth: 52,
    badgeHeight: 26,
    badgeRadius: 13,
    fontSize: 12,
    routeFontSize: 12,
    headerFontSize: 20,
    branchFontSize: 9,    // route numbers at branch points
};

let routeData = [];
let allStops = [];

// ─── CSV Parser ───
function parseCSV(text) {
    const lines = text.trim().split('\n');
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());

    const iRoute = header.indexOf('route_number');
    const iType = header.indexOf('type');
    const iOrder = header.indexOf('stop_order');
    const iName = header.indexOf('stop_name');
    const iMetro = header.indexOf('is_metro');

    if ([iRoute, iType, iOrder, iName, iMetro].includes(-1)) {
        throw new Error('CSV павінен мець калонкі: route_number, type, stop_order, stop_name, is_metro');
    }

    const routeMap = new Map();
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        if (cols.length < 5) continue;

        const routeKey = cols[iRoute];
        const type = cols[iType].toLowerCase();
        const order = parseInt(cols[iOrder]);
        const name = cols[iName];
        const isMetro = cols[iMetro].toLowerCase() === 'yes' || cols[iMetro].toLowerCase() === 'да';

        if (!routeMap.has(routeKey)) {
            routeMap.set(routeKey, {
                route_number: routeKey,
                type: type.includes('trolley') ? 'trolleybus' : 'bus',
                stops: []
            });
        }
        routeMap.get(routeKey).stops.push({ order, name, is_metro: isMetro });
    }

    for (const route of routeMap.values()) {
        route.stops.sort((a, b) => a.order - b.order);
    }
    return Array.from(routeMap.values());
}

function getAllStops(routes) {
    const stopSet = new Set();
    for (const route of routes) {
        for (const stop of route.stops) stopSet.add(stop.name);
    }
    return Array.from(stopSet).sort();
}

function findRoutesForStop(routes, stopName) {
    return routes.filter(r => r.stops.some(s => s.name === stopName));
}

function getStopsFromHere(route, stopName) {
    const idx = route.stops.findIndex(s => s.name === stopName);
    if (idx === -1) return [];
    return route.stops.slice(idx);
}

// ─── Tree Building ───
// Build a prefix tree (trie) from route stop sequences
function buildRouteTree(selectedStop, routeStopsData) {
    // routeStopsData = [{ route, stops: [from selected stop to end] }]
    const rootStop = routeStopsData[0]?.stops[0];
    const root = {
        stop: selectedStop,
        isMetro: rootStop?.is_metro || false,
        routes: routeStopsData.map(rs => rs.route),
        children: [],
        depth: 0,
        x: 0,
        // Track remaining stops per route for subtree building
        _remaining: routeStopsData.map(rs => ({ route: rs.route, stops: rs.stops.slice(1) }))
    };

    function buildChildren(node) {
        // Group routes by their next stop
        const groups = new Map();
        for (const rs of node._remaining) {
            if (rs.stops.length === 0) continue; // route ends here
            const nextStop = rs.stops[0];
            if (!groups.has(nextStop.name)) {
                groups.set(nextStop.name, { stopInfo: nextStop, entries: [] });
            }
            groups.get(nextStop.name).entries.push({
                route: rs.route,
                stops: rs.stops.slice(1) // remaining after next stop
            });
        }

        for (const [stopName, g] of groups) {
            const child = {
                stop: stopName,
                isMetro: g.stopInfo.is_metro,
                routes: g.entries.map(e => e.route),
                children: [],
                depth: node.depth + 1,
                x: 0,
                _remaining: g.entries
            };
            node.children.push(child);
            buildChildren(child);
        }
    }

    buildChildren(root);
    return root;
}

// ─── Tree Layout ───
// Assign x positions: leaves get consecutive integers, internal nodes centered
function layoutTree(root) {
    let leafIdx = 0;

    function layout(node) {
        if (node.children.length === 0) {
            node.x = leafIdx;
            leafIdx++;
            return;
        }

        // Sort children: trolleybuses left, buses right; then by route number
        node.children.sort((a, b) => {
            const aHasTrolley = a.routes.some(r => r.type === 'trolleybus');
            const bHasTrolley = b.routes.some(r => r.type === 'trolleybus');
            if (aHasTrolley !== bHasTrolley) return aHasTrolley ? -1 : 1;
            return a.routes[0].route_number.localeCompare(b.routes[0].route_number, 'be', { numeric: true });
        });

        for (const child of node.children) {
            layout(child);
        }

        // Center among children
        const firstX = node.children[0].x;
        const lastX = node.children[node.children.length - 1].x;
        node.x = (firstX + lastX) / 2;
    }

    layout(root);
    return leafIdx;
}

function getMaxDepth(node) {
    if (node.children.length === 0) return node.depth;
    return Math.max(...node.children.map(getMaxDepth));
}

// ─── SVG Rendering ───
function generateSchemeSVG(stopName, routes) {
    const matchingRoutes = findRoutesForStop(routes, stopName);
    if (matchingRoutes.length === 0) return null;

    // Get remaining stops for each route
    const routeStopsData = matchingRoutes.map(r => ({
        route: r,
        stops: getStopsFromHere(r, stopName)
    }));

    // Build and layout tree
    const tree = buildRouteTree(stopName, routeStopsData);
    const leafCount = layoutTree(tree);
    const maxDepth = getMaxDepth(tree);

    // SVG dimensions
    const svgWidth = LAYOUT.paddingSide * 2 + Math.max(leafCount, 1) * LAYOUT.colWidth;
    const svgHeight = LAYOUT.paddingTop + (maxDepth + 1) * LAYOUT.rowHeight + LAYOUT.paddingBottom + 60;

    const px = (nodeX) => LAYOUT.paddingSide + (nodeX + 0.5) * LAYOUT.colWidth;
    const py = (depth) => LAYOUT.paddingTop + depth * LAYOUT.rowHeight;

    let svg = '';

    // Background
    svg += `<rect width="${svgWidth}" height="${svgHeight}" fill="#ffffff" rx="16"/>`;

    // Header
    const centerX = svgWidth / 2;
    svg += `<text x="${centerX}" y="36" text-anchor="middle" font-size="${LAYOUT.headerFontSize}" font-weight="700" fill="#1a1a2e">${escapeXml(stopName)}</text>`;
    svg += `<g transform="translate(${centerX}, 54)">`;
    svg += `<rect x="-28" y="-10" width="56" height="20" rx="10" fill="#E74C3C" opacity="0.15"/>`;
    svg += `<text x="0" y="4" text-anchor="middle" font-size="11" fill="#E74C3C" font-weight="600">Вы тут</text>`;
    svg += `</g>`;

    // ── Render tree edges (lines) first, then nodes on top ──
    function renderEdges(node) {
        for (const child of node.children) {
            const x1 = px(node.x), y1 = py(node.depth);
            const x2 = px(child.x), y2 = py(child.depth);
            const edgeColor = getBranchColor(child);

            if (Math.abs(x1 - x2) < 1) {
                // Straight vertical
                svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${edgeColor}" stroke-width="${LAYOUT.lineWidth}" stroke-linecap="round"/>`;
            } else {
                // Curved branch: cubic bezier
                const midY = y1 + (y2 - y1) * 0.5;
                svg += `<path d="M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}" fill="none" stroke="${edgeColor}" stroke-width="${LAYOUT.lineWidth}" stroke-linecap="round"/>`;
            }

            renderEdges(child);
        }
    }

    function renderNodes(node) {
        const nx = px(node.x), ny = py(node.depth);
        const isRoot = node.depth === 0;
        const isLeaf = node.children.length === 0;
        const nodeColor = isRoot ? '#E74C3C' : getBranchColor(node);

        // Stop tick (horizontal bar to the right)
        svg += `<rect x="${nx}" y="${ny - LAYOUT.tickH/2}" width="${LAYOUT.tickW}" height="${LAYOUT.tickH}" rx="1" fill="${nodeColor}"/>`;

        // Metro icon to the left
        if (node.isMetro && !isRoot) {
            svg += drawMetroIcon(nx - 16, ny);
        }

        // Stop name label
        if (!isRoot) {
            const labelX = nx + LAYOUT.tickW + 6;
            const weight = (node.isMetro || isMajorStop(node)) ? '700' : '400';
            svg += `<text x="${labelX}" y="${ny + 4}" font-size="${LAYOUT.fontSize}" font-weight="${weight}" fill="#333">${escapeXml(node.stop)}</text>`;
        }

        // Branch point annotations: show route numbers going each way
        if (node.children.length > 1) {
            for (const child of node.children) {
                const cx = px(child.x);
                const routeNums = child.routes.map(r => {
                    const num = r.route_number.replace(/^[АA]/, '').replace(/^[ТT]/, '');
                    return num;
                }).join(', ');
                // Position annotation near branch start
                const annX = (nx + cx) / 2;
                const annY = ny + LAYOUT.rowHeight * 0.35;
                svg += `<text x="${annX}" y="${annY}" text-anchor="middle" font-size="${LAYOUT.branchFontSize}" fill="#999" font-style="italic">${routeNums}</text>`;
            }
        }

        // Terminal badges (leaf nodes)
        if (isLeaf) {
            const termRoutes = node.routes;
            termRoutes.forEach((route, i) => {
                const badgeY = ny + 22 + i * 28;
                const badgeColor = COLORS[route.type];
                svg += drawBadge(nx, badgeY, route.route_number, badgeColor);
            });
        }

        for (const child of node.children) {
            renderNodes(child);
        }
    }

    renderEdges(tree);
    renderNodes(tree);

    // Legend
    const legendY = svgHeight - 25;
    svg += `<g transform="translate(${LAYOUT.paddingSide}, ${legendY})">`;
    svg += `<rect x="0" y="-8" width="16" height="16" rx="3" fill="${COLORS.bus.badge}"/>`;
    svg += `<text x="22" y="5" font-size="12" fill="#666">Аўтобус</text>`;
    svg += `<rect x="100" y="-8" width="16" height="16" rx="3" fill="${COLORS.trolleybus.badge}"/>`;
    svg += `<text x="122" y="5" font-size="12" fill="#666">Тралейбус</text>`;
    svg += drawMetroIcon(215, 0);
    svg += `<text x="232" y="5" font-size="12" fill="#666">Метро</text>`;
    svg += `</g>`;

    return `<svg xmlns="http://www.w3.org/2000/svg" class="scheme-svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">${svg}</svg>`;
}

function getBranchColor(node) {
    const hasTrolley = node.routes.some(r => r.type === 'trolleybus');
    const hasBus = node.routes.some(r => r.type === 'bus');
    if (hasTrolley && !hasBus) return COLORS.trolleybus.line;
    if (hasBus && !hasTrolley) return COLORS.bus.line;
    // Mixed: use green (trolleybus dominant in transit schemes)
    return COLORS.trolleybus.line;
}

function isMajorStop(node) {
    return node.isMetro || node.children.length > 1;
}

function drawBadge(x, y, label, color) {
    const w = LAYOUT.badgeWidth, h = LAYOUT.badgeHeight;
    let svg = '';
    svg += `<rect x="${x - w/2}" y="${y - h/2}" width="${w}" height="${h}" rx="${LAYOUT.badgeRadius}" fill="${color.badge || color}"/>`;
    svg += `<text x="${x}" y="${y + 5}" text-anchor="middle" font-size="${LAYOUT.routeFontSize}" font-weight="700" fill="${color.badgeText || '#fff'}">${escapeXml(label)}</text>`;
    return svg;
}

function drawMetroIcon(x, y) {
    let svg = '';
    svg += `<circle cx="${x}" cy="${y}" r="7" fill="#E74C3C"/>`;
    svg += `<text x="${x}" y="${y + 4}" text-anchor="middle" font-size="10" font-weight="700" fill="#fff">М</text>`;
    return svg;
}

function escapeXml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Export Functions ───
function exportPNG() {
    const container = document.getElementById('scheme-container');
    const svgEl = container.querySelector('svg');
    if (!svgEl) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
        const scale = 2;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx.scale(scale, scale);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, img.width, img.height);
        ctx.drawImage(img, 0, 0);
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `scheme-${document.getElementById('stop-select').value}.png`;
        link.href = pngUrl;
        link.click();
        URL.revokeObjectURL(url);
    };
    img.src = url;
}

function exportSVG() {
    const container = document.getElementById('scheme-container');
    const svgEl = container.querySelector('svg');
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `scheme-${document.getElementById('stop-select').value}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
}

// ─── UI Logic ───
function populateStopSelect(stops) {
    const select = document.getElementById('stop-select');
    select.innerHTML = '<option value="">— абярыце прыпынак —</option>';
    stops.forEach(stop => {
        const routeCount = findRoutesForStop(routeData, stop).length;
        const opt = document.createElement('option');
        opt.value = stop;
        opt.textContent = `${stop} (${routeCount} маршр.)`;
        select.appendChild(opt);
    });
    select.disabled = false;
    document.getElementById('btn-generate').disabled = false;
}

function updateStats() {
    const stats = document.getElementById('stats');
    const busCount = routeData.filter(r => r.type === 'bus').length;
    const trolleyCount = routeData.filter(r => r.type === 'trolleybus').length;
    stats.style.display = 'flex';
    stats.innerHTML = `
        <div class="stat">🚌 Аўтобусы: <strong>${busCount}</strong></div>
        <div class="stat">🚎 Тралейбусы: <strong>${trolleyCount}</strong></div>
        <div class="stat">📍 Прыпынкі: <strong>${allStops.length}</strong></div>
        <div class="stat">🗺️ Усяго маршрутаў: <strong>${routeData.length}</strong></div>
    `;
}

function renderScheme() {
    const stopName = document.getElementById('stop-select').value;
    const container = document.getElementById('scheme-container');

    if (!stopName) {
        container.innerHTML = '<div class="placeholder"><span>👆 Абярыце прыпынак</span></div>';
        return;
    }

    const svg = generateSchemeSVG(stopName, routeData);
    if (!svg) {
        container.innerHTML = '<div class="placeholder"><span>❌ Няма маршрутаў праз гэты прыпынак</span></div>';
        return;
    }

    container.innerHTML = svg;
    document.getElementById('btn-export-png').disabled = false;
    document.getElementById('btn-export-svg').disabled = false;
}

async function loadSampleData() {
    try {
        const resp = await fetch('data/routes.csv');
        const text = await resp.text();
        loadCSVData(text);
    } catch (e) {
        alert('Памылка загрузкі ўзору: ' + e.message);
    }
}

function loadCSVData(text) {
    try {
        routeData = parseCSV(text);
        allStops = getAllStops(routeData);
        populateStopSelect(allStops);
        updateStats();
        document.getElementById('scheme-container').innerHTML =
            '<div class="placeholder"><span>✅ Дадзеныя загружаны! Абярыце прыпынак.</span></div>';
    } catch (e) {
        alert('Памылка разбору CSV: ' + e.message);
    }
}

// ─── Init ───
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-load-sample').addEventListener('click', loadSampleData);
    document.getElementById('csv-upload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => loadCSVData(ev.target.result);
        reader.readAsText(file);
    });
    document.getElementById('btn-generate').addEventListener('click', renderScheme);
    document.getElementById('stop-select').addEventListener('change', renderScheme);
    document.getElementById('btn-export-png').addEventListener('click', exportPNG);
    document.getElementById('btn-export-svg').addEventListener('click', exportSVG);
});
