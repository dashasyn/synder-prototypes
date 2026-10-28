// Dasha Remote — Figma Plugin (main thread)
figma.showUI(__html__, { width: 360, height: 480 });

figma.ui.onmessage = async (msg) => {
  if (msg.type !== 'execute') return;
  
  const { cmd, args, requestId } = msg;
  let result;
  
  try {
    switch (cmd) {
      case 'ping':
        result = { ok: true, time: Date.now() };
        break;
        
      case 'getPages':
        result = figma.root.children.map(function(p) {
          return { id: p.id, name: p.name, childCount: p.children.length };
        });
        break;
        
      case 'getCurrentPage':
        result = { id: figma.currentPage.id, name: figma.currentPage.name, childCount: figma.currentPage.children.length };
        break;
        
      case 'getTree': {
        var depth = (args && args.depth) || 3;
        var rootNode = (args && args.nodeId) ? figma.getNodeById(args.nodeId) : figma.currentPage;
        if (!rootNode) { result = { error: 'Node not found' }; break; }
        
        function walkTree(n, d) {
          var entry = { id: n.id, name: n.name, type: n.type };
          if (n.type === 'TEXT') {
            entry.characters = n.characters;
            entry.fontSize = n.fontSize;
          }
          if (n.children && d > 0) {
            entry.childCount = n.children.length;
            entry.children = n.children.map(function(c) { return walkTree(c, d - 1); });
          } else if (n.children) {
            entry.childCount = n.children.length;
          }
          return entry;
        }
        result = walkTree(rootNode, depth);
        break;
      }
        
      case 'getAllText': {
        var textRoot = (args && args.nodeId) ? figma.getNodeById(args.nodeId) : figma.currentPage;
        if (!textRoot) { result = { error: 'Node not found' }; break; }
        var texts = [];
        var allNodes = textRoot.findAll(function(n) { return n.type === 'TEXT'; });
        for (var i = 0; i < allNodes.length; i++) {
          var tn = allNodes[i];
          texts.push({
            id: tn.id,
            name: tn.name,
            text: tn.characters,
            visible: tn.visible,
            width: Math.round(tn.width),
            height: Math.round(tn.height)
          });
        }
        result = { count: texts.length, texts: texts };
        break;
      }
        
      case 'getNode': {
        var node = figma.getNodeById(args.nodeId);
        if (!node) { result = { error: 'Node not found' }; break; }
        result = { id: node.id, name: node.name, type: node.type, visible: node.visible, width: Math.round(node.width), height: Math.round(node.height) };
        if (node.type === 'TEXT') {
          result.characters = node.characters;
          result.fontSize = node.fontSize;
        }
        break;
      }
      
      case 'setText': {
        var textNode = figma.getNodeById(args.nodeId);
        if (!textNode || textNode.type !== 'TEXT') { result = { error: 'Not a text node' }; break; }
        var fonts = textNode.getRangeAllFontNames(0, textNode.characters.length);
        for (var fi = 0; fi < fonts.length; fi++) {
          await figma.loadFontAsync(fonts[fi]);
        }
        textNode.characters = args.text;
        result = { ok: true, newText: textNode.characters };
        break;
      }
        
      case 'searchReplace': {
        var srRoot = (args && args.nodeId) ? figma.getNodeById(args.nodeId) : figma.currentPage;
        if (!srRoot) { result = { error: 'Node not found' }; break; }
        var matches = [];
        srRoot.findAll(function(n) {
          if (n.type === 'TEXT' && n.characters.indexOf(args.search) !== -1) {
            matches.push({ id: n.id, name: n.name, oldText: n.characters });
          }
          return false;
        });
        result = { search: args.search, replace: args.replace, matchCount: matches.length, matches: matches };
        break;
      }
        
      case 'searchReplaceExecute': {
        var sreRoot = (args && args.nodeId) ? figma.getNodeById(args.nodeId) : figma.currentPage;
        if (!sreRoot) { result = { error: 'Node not found' }; break; }
        var sreResults = [];
        var sreNodes = sreRoot.findAll(function(n) { return n.type === 'TEXT' && n.characters.indexOf(args.search) !== -1; });
        for (var si = 0; si < sreNodes.length; si++) {
          var sn = sreNodes[si];
          var sfonts = sn.getRangeAllFontNames(0, sn.characters.length);
          for (var sfi = 0; sfi < sfonts.length; sfi++) {
            await figma.loadFontAsync(sfonts[sfi]);
          }
          var oldText = sn.characters;
          sn.characters = sn.characters.split(args.search).join(args.replace);
          sreResults.push({ id: sn.id, oldText: oldText, newText: sn.characters });
        }
        result = { ok: true, replaced: sreResults.length, results: sreResults };
        break;
      }
        
      case 'findByName': {
        var fnRoot = (args && args.parentId) ? figma.getNodeById(args.parentId) : figma.currentPage;
        if (!fnRoot) { result = { error: 'Parent not found' }; break; }
        var found = fnRoot.findAll(function(n) { return n.name === args.name; });
        result = found.map(function(n) {
          return { id: n.id, name: n.name, type: n.type, characters: n.type === 'TEXT' ? n.characters : undefined };
        });
        break;
      }
        
      default:
        result = { error: 'Unknown command: ' + cmd };
    }
  } catch (e) {
    result = { error: e.message };
  }
  
  figma.ui.postMessage({ type: 'result', requestId: requestId, result: result });
};
