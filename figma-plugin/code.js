// Dasha Remote — Figma Plugin (main thread)
// Communicates with UI iframe which polls the server for commands

figma.showUI(__html__, { width: 360, height: 480, themeColors: true });

// ─── COMMAND HANDLERS ──────────────────────────────────────────

function findNodeById(id) {
  return figma.getNodeById(id);
}

function findNodesByName(name, parent) {
  const root = parent ? figma.getNodeById(parent) : figma.currentPage;
  if (!root) return [];
  return root.findAll(n => n.name === name);
}

function findTextNodes(parent) {
  const root = parent ? figma.getNodeById(parent) : figma.currentPage;
  if (!root) return [];
  return root.findAll(n => n.type === 'TEXT');
}

async function setText(nodeId, newText) {
  const node = figma.getNodeById(nodeId);
  if (!node || node.type !== 'TEXT') return { error: 'Not a text node' };
  
  // Load fonts used by this text node
  const fonts = node.getRangeAllFontNames(0, node.characters.length);
  for (const font of fonts) {
    await figma.loadFontAsync(font);
  }
  
  node.characters = newText;
  return { ok: true, newText: node.characters };
}

async function setTextByName(name, newText, parentId) {
  const root = parentId ? figma.getNodeById(parentId) : figma.currentPage;
  if (!root) return { error: 'Parent not found' };
  const nodes = root.findAll(n => n.type === 'TEXT' && n.name === name);
  if (nodes.length === 0) return { error: `No text node named "${name}"` };
  
  const results = [];
  for (const node of nodes) {
    const fonts = node.getRangeAllFontNames(0, node.characters.length);
    for (const font of fonts) {
      await figma.loadFontAsync(font);
    }
    node.characters = newText;
    results.push({ id: node.id, newText: node.characters });
  }
  return { ok: true, count: results.length, results };
}

function getTree(nodeId, depth = 3) {
  const node = nodeId ? figma.getNodeById(nodeId) : figma.currentPage;
  if (!node) return { error: 'Node not found' };
  
  function walk(n, d) {
    const entry = {
      id: n.id,
      name: n.name,
      type: n.type,
    };
    if (n.type === 'TEXT') {
      entry.characters = n.characters;
      entry.fontSize = n.fontSize;
    }
    if (n.type === 'FRAME' || n.type === 'GROUP' || n.type === 'COMPONENT' || n.type === 'INSTANCE' || n.type === 'SECTION') {
      entry.childCount = n.children?.length || 0;
      if (d > 0 && n.children) {
        entry.children = n.children.map(c => walk(c, d - 1));
      }
    }
    return entry;
  }
  return walk(node, depth);
}

function getAllText(nodeId) {
  const node = nodeId ? figma.getNodeById(nodeId) : figma.currentPage;
  if (!node) return { error: 'Node not found' };
  
  const texts = [];
  function walk(n, path) {
    if (n.type === 'TEXT') {
      texts.push({
        id: n.id,
        name: n.name,
        text: n.characters,
        path: path,
        visible: n.visible,
        x: Math.round(n.absoluteTransform[0][2]),
        y: Math.round(n.absoluteTransform[1][2]),
        width: Math.round(n.width),
        height: Math.round(n.height)
      });
    }
    if (n.children) {
      for (const c of n.children) {
        walk(c, path + ' > ' + n.name);
      }
    }
  }
  walk(node, '');
  return { count: texts.length, texts };
}

function searchReplace(search, replace, nodeId) {
  const node = nodeId ? figma.getNodeById(nodeId) : figma.currentPage;
  if (!node) return { error: 'Node not found' };
  
  const matches = [];
  node.findAll(n => {
    if (n.type === 'TEXT' && n.characters.includes(search)) {
      matches.push({ id: n.id, name: n.name, oldText: n.characters });
    }
    return false;
  });
  return { search, replace, matchCount: matches.length, matches };
}

async function searchReplaceExecute(search, replace, nodeId) {
  const node = nodeId ? figma.getNodeById(nodeId) : figma.currentPage;
  if (!node) return { error: 'Node not found' };
  
  const results = [];
  const textNodes = node.findAll(n => n.type === 'TEXT' && n.characters.includes(search));
  
  for (const n of textNodes) {
    const fonts = n.getRangeAllFontNames(0, n.characters.length);
    for (const font of fonts) {
      await figma.loadFontAsync(font);
    }
    const oldText = n.characters;
    n.characters = n.characters.split(search).join(replace);
    results.push({ id: n.id, name: n.name, oldText, newText: n.characters });
  }
  return { ok: true, replaced: results.length, results };
}

function getNodeProps(nodeId) {
  const node = figma.getNodeById(nodeId);
  if (!node) return { error: 'Node not found' };
  
  const props = {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible,
    x: Math.round(node.x),
    y: Math.round(node.y),
    width: Math.round(node.width),
    height: Math.round(node.height),
  };
  
  if (node.type === 'TEXT') {
    props.characters = node.characters;
    props.fontSize = node.fontSize;
    props.fontName = node.fontName;
  }
  
  if (node.fills && Array.isArray(node.fills)) {
    props.fills = node.fills.map(f => ({
      type: f.type,
      color: f.color ? { r: Math.round(f.color.r * 255), g: Math.round(f.color.g * 255), b: Math.round(f.color.b * 255) } : null,
      opacity: f.opacity
    }));
  }
  
  return props;
}

function setNodeVisible(nodeId, visible) {
  const node = figma.getNodeById(nodeId);
  if (!node) return { error: 'Node not found' };
  node.visible = visible;
  return { ok: true, id: nodeId, visible: node.visible };
}

function setNodePosition(nodeId, x, y) {
  const node = figma.getNodeById(nodeId);
  if (!node) return { error: 'Node not found' };
  if (x !== undefined) node.x = x;
  if (y !== undefined) node.y = y;
  return { ok: true, id: nodeId, x: node.x, y: node.y };
}

function setNodeSize(nodeId, width, height) {
  const node = figma.getNodeById(nodeId);
  if (!node) return { error: 'Node not found' };
  node.resize(width, height);
  return { ok: true, id: nodeId, width: node.width, height: node.height };
}

async function setFill(nodeId, r, g, b, opacity) {
  const node = figma.getNodeById(nodeId);
  if (!node) return { error: 'Node not found' };
  node.fills = [{
    type: 'SOLID',
    color: { r: r / 255, g: g / 255, b: b / 255 },
    opacity: opacity !== undefined ? opacity : 1
  }];
  return { ok: true };
}

function exportNode(nodeId, format, scale) {
  const node = figma.getNodeById(nodeId);
  if (!node) return { error: 'Node not found' };
  return node.exportAsync({ format: format || 'PNG', constraint: { type: 'SCALE', value: scale || 2 } });
}

function getPages() {
  return figma.root.children.map(p => ({ id: p.id, name: p.name, childCount: p.children.length }));
}

function getCurrentPage() {
  return { id: figma.currentPage.id, name: figma.currentPage.name, childCount: figma.currentPage.children.length };
}

// ─── MESSAGE HANDLER ───────────────────────────────────────────

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'execute') {
    const { cmd, args, requestId } = msg;
    let result;
    
    try {
      switch (cmd) {
        case 'ping':
          result = { ok: true, time: Date.now() };
          break;
        case 'getPages':
          result = getPages();
          break;
        case 'getCurrentPage':
          result = getCurrentPage();
          break;
        case 'getTree':
          result = getTree(args?.nodeId, args?.depth || 3);
          break;
        case 'getAllText':
          result = getAllText(args?.nodeId);
          break;
        case 'getNode':
          result = getNodeProps(args?.nodeId);
          break;
        case 'setText':
          result = await setText(args?.nodeId, args?.text);
          break;
        case 'setTextByName':
          result = await setTextByName(args?.name, args?.text, args?.parentId);
          break;
        case 'searchReplace':
          result = searchReplace(args?.search, args?.replace, args?.nodeId);
          break;
        case 'searchReplaceExecute':
          result = await searchReplaceExecute(args?.search, args?.replace, args?.nodeId);
          break;
        case 'setVisible':
          result = setNodeVisible(args?.nodeId, args?.visible);
          break;
        case 'setPosition':
          result = setNodePosition(args?.nodeId, args?.x, args?.y);
          break;
        case 'setSize':
          result = setNodeSize(args?.nodeId, args?.width, args?.height);
          break;
        case 'setFill':
          result = await setFill(args?.nodeId, args?.r, args?.g, args?.b, args?.opacity);
          break;
        case 'export':
          const bytes = await exportNode(args?.nodeId, args?.format, args?.scale);
          // Send as base64 via UI
          figma.ui.postMessage({ type: 'exportResult', requestId, bytes: Array.from(bytes) });
          return;
        case 'findByName':
          result = findNodesByName(args?.name, args?.parentId).map(n => ({
            id: n.id, name: n.name, type: n.type,
            characters: n.type === 'TEXT' ? n.characters : undefined
          }));
          break;
        default:
          result = { error: `Unknown command: ${cmd}` };
      }
    } catch (e) {
      result = { error: e.message };
    }
    
    figma.ui.postMessage({ type: 'result', requestId, result });
  }
};
