export function viewerHtml(dataUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nav Map Viewer</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0f; color: #e0e0e0; }
  #app { width: 100vw; height: 100vh; display: flex; flex-direction: column; }
  #header { padding: 12px 20px; background: #111118; border-bottom: 1px solid #222; display: flex; align-items: center; gap: 16px; }
  #header h1 { font-size: 16px; font-weight: 600; color: #fff; }
  #header .meta { font-size: 12px; color: #888; }
  #search { padding: 6px 12px; background: #1a1a24; border: 1px solid #333; border-radius: 6px; color: #e0e0e0; font-size: 13px; width: 240px; }
  #graph { flex: 1; position: relative; overflow: hidden; }
  #sidebar { position: absolute; top: 0; right: 0; width: 280px; height: 100%; background: #111118; border-left: 1px solid #222; padding: 16px; overflow-y: auto; display: none; }
  #sidebar.open { display: block; }
  #sidebar h2 { font-size: 14px; margin-bottom: 8px; }
  #sidebar .route { font-size: 12px; color: #88aaff; margin-bottom: 12px; }
  #sidebar .links { font-size: 12px; }
  #sidebar .links li { margin: 4px 0; color: #aaa; }
  .stats { position: absolute; bottom: 12px; left: 12px; font-size: 11px; color: #555; }
  .tip { position: absolute; bottom: 12px; right: 12px; font-size: 11px; color: #555; }
  svg text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
</style>
</head>
<body>
<div id="app">
  <div id="header">
    <h1 id="title">Nav Map</h1>
    <span class="meta" id="meta"></span>
    <input type="text" id="search" placeholder="Search routes..." />
  </div>
  <div id="graph">
    <div class="stats" id="stats"></div>
    <div class="tip">Scroll to zoom \\u00b7 Drag to pan \\u00b7 Click a node to inspect</div>
    <div id="sidebar">
      <h2 id="node-label"></h2>
      <div class="route" id="node-route"></div>
      <div class="links"><strong>Links to:</strong><ul id="node-links"></ul></div>
    </div>
  </div>
</div>
<script>
(async () => {
  const res = await fetch('${dataUrl}');
  const graph = await res.json();

  document.getElementById('title').textContent = graph.meta.name || 'Nav Map';
  document.getElementById('meta').textContent =
    graph.nodes.length + ' pages \\u00b7 ' + graph.edges.length + ' links \\u00b7 ' +
    'Generated ' + new Date(graph.meta.generatedAt).toLocaleDateString();
  document.getElementById('stats').textContent =
    graph.nodes.length + ' nodes, ' + graph.edges.length + ' edges, ' + graph.groups.length + ' groups';

  const container = document.getElementById('graph');
  const width = container.clientWidth;
  const height = container.clientHeight;

  // Build adjacency for sidebar
  const adj = {};
  for (const e of graph.edges) {
    if (!adj[e.source]) adj[e.source] = [];
    adj[e.source].push(e.target);
  }

  // Group colors
  const groupColors = {};
  const palette = ['#4488ff','#44cc88','#ff6644','#cc44ff','#ffaa22','#44dddd','#ff4488','#88cc44'];
  graph.groups.forEach((g, i) => { groupColors[g.id] = g.color || palette[i % palette.length]; });

  // Simple force layout using requestAnimationFrame
  const nodes = graph.nodes.map(n => ({
    ...n, x: width/2 + (Math.random()-0.5)*400, y: height/2 + (Math.random()-0.5)*400, vx: 0, vy: 0
  }));
  const nodeMap = {};
  nodes.forEach(n => { nodeMap[n.id] = n; });
  const edges = graph.edges.filter(e => nodeMap[e.source] && nodeMap[e.target]);

  // SVG setup
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.style.position = 'absolute';
  svg.style.top = '0';
  svg.style.left = '0';
  container.insertBefore(svg, container.firstChild);

  // Zoom/pan state
  let scale = 1, tx = 0, ty = 0;
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(g);

  function updateTransform() {
    g.setAttribute('transform', 'translate('+tx+','+ty+') scale('+scale+')');
  }

  svg.addEventListener('wheel', e => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    scale *= factor;
    tx = e.offsetX - (e.offsetX - tx) * factor;
    ty = e.offsetY - (e.offsetY - ty) * factor;
    updateTransform();
  }, { passive: false });

  let dragging = false, lastX, lastY;
  svg.addEventListener('mousedown', e => { if (e.target === svg || e.target === g) { dragging = true; lastX = e.clientX; lastY = e.clientY; }});
  window.addEventListener('mousemove', e => { if (dragging) { tx += e.clientX - lastX; ty += e.clientY - lastY; lastX = e.clientX; lastY = e.clientY; updateTransform(); }});
  window.addEventListener('mouseup', () => { dragging = false; });

  // Draw edges
  const edgeEls = edges.map(e => {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('stroke', '#333');
    line.setAttribute('stroke-width', '1');
    g.appendChild(line);
    return { el: line, edge: e };
  });

  // Draw nodes
  const nodeEls = nodes.map(n => {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.style.cursor = 'pointer';
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', '8');
    circle.setAttribute('fill', groupColors[n.group] || '#4488ff');
    circle.setAttribute('stroke', '#0a0a0f');
    circle.setAttribute('stroke-width', '2');
    group.appendChild(circle);
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.textContent = n.label.length > 24 ? n.label.slice(0,22)+'...' : n.label;
    text.setAttribute('x', '12');
    text.setAttribute('y', '4');
    text.setAttribute('fill', '#ccc');
    text.setAttribute('font-size', '11');
    group.appendChild(text);
    g.appendChild(group);

    group.addEventListener('click', () => {
      document.getElementById('node-label').textContent = n.label;
      document.getElementById('node-route').textContent = n.route;
      const ul = document.getElementById('node-links');
      ul.replaceChildren();
      for (const targetId of (adj[n.id] || [])) {
        const li = document.createElement('li');
        li.textContent = nodeMap[targetId] ? nodeMap[targetId].route : targetId;
        ul.appendChild(li);
      }
      document.getElementById('sidebar').classList.add('open');
    });

    return { el: group, node: n };
  });

  // Search
  document.getElementById('search').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    nodeEls.forEach(({ el, node }) => {
      const match = !q || node.label.toLowerCase().includes(q) || node.route.toLowerCase().includes(q);
      el.style.opacity = match ? '1' : '0.15';
    });
  });

  // Simple force simulation
  function tick() {
    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i+1; j < nodes.length; j++) {
        let dx = nodes[j].x - nodes[i].x;
        let dy = nodes[j].y - nodes[i].y;
        let d = Math.sqrt(dx*dx + dy*dy) || 1;
        let f = 800 / (d * d);
        nodes[i].vx -= dx/d * f;
        nodes[i].vy -= dy/d * f;
        nodes[j].vx += dx/d * f;
        nodes[j].vy += dy/d * f;
      }
    }
    // Attraction (edges)
    for (const e of edges) {
      const s = nodeMap[e.source], t = nodeMap[e.target];
      let dx = t.x - s.x, dy = t.y - s.y;
      let d = Math.sqrt(dx*dx + dy*dy) || 1;
      let f = (d - 100) * 0.01;
      s.vx += dx/d * f;
      s.vy += dy/d * f;
      t.vx -= dx/d * f;
      t.vy -= dy/d * f;
    }
    // Center gravity
    for (const n of nodes) {
      n.vx += (width/2 - n.x) * 0.001;
      n.vy += (height/2 - n.y) * 0.001;
      n.vx *= 0.9; n.vy *= 0.9;
      n.x += n.vx; n.y += n.vy;
    }
    // Update SVG
    let maxV = 0;
    edgeEls.forEach(({ el, edge }) => {
      const s = nodeMap[edge.source], t = nodeMap[edge.target];
      el.setAttribute('x1', s.x); el.setAttribute('y1', s.y);
      el.setAttribute('x2', t.x); el.setAttribute('y2', t.y);
    });
    nodeEls.forEach(({ el, node }) => {
      el.setAttribute('transform', 'translate('+node.x+','+node.y+')');
      maxV = Math.max(maxV, Math.abs(node.vx), Math.abs(node.vy));
    });
    // Stop simulation when velocities converge to save CPU
    if (maxV > 0.1) requestAnimationFrame(tick);
  }
  tick();
  updateTransform();
})();
</script>
</body>
</html>`;
}
