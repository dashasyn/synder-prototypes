/* Rebuild projects/index.html (Ignat's prototype hub) as compact cards.
   Reads the existing cards, keeps title / description / date / tags / href,
   drops preview, status and screen-count. Three sections: Transport, Synder
   (with its existing subgroups), Personal. Every card opens in a new tab.
   Usage: node scripts/hub-compact.cjs <path/to/projects/index.html> */
const fs = require('fs');
const file = process.argv[2];
const src = fs.readFileSync(file, 'utf8');

const PERSONAL = new Set(['./scheme-builder/', './bus-stop-generator/']);
const strip = s => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const attr = s => s.replace(/&(?!(amp|lt|gt|quot|#\d+|[a-z]+);)/g, '&amp;').replace(/"/g, '&quot;');

const re = /<h2>([^<]*)<\/h2>|letter-spacing:\.5px;margin-bottom:12px;">([^<]*)<|<a href="([^"]*)" class="project-card"[^>]*>([\s\S]*?)<\/a>/g;
let section = null, group = null, m;
const out = { transport: [], synder: [], personal: [] };
const groups = []; // ordered synder groups
while ((m = re.exec(src))) {
  if (m[1] != null) { section = /transit|transport/i.test(m[1]) ? 'transport' : 'synder'; group = null; continue; }
  if (m[2] != null) { group = m[2].trim(); if (!groups.includes(group)) groups.push(group); continue; }
  const href = m[3], body = m[4];
  const title = (body.match(/<h3>([\s\S]*?)<\/h3>/) || [])[1];
  if (!title) continue;
  const desc = (body.match(/<p>([\s\S]*?)<\/p>/) || [, ''])[1];
  const date = (body.match(/data-lucide="calendar"[^>]*><\/i>\s*([^<]+)</) || [, ''])[1].trim();
  const tags = [...body.matchAll(/class="project-tag">([^<]*)</g)].map(t => t[1].trim());
  const card = { href, title: title.trim(), desc: desc.trim(), date, tags };
  if (PERSONAL.has(href)) out.personal.push(card);
  else if (section === 'transport') out.transport.push(card);
  else { card.group = group || 'Other'; out.synder.push(card); }
}

const cardHtml = c => `                <a href="${c.href}" class="project-card" target="_blank" rel="noopener" title="${attr(strip(c.desc))}">
                    <h3>${c.title}</h3>
                    <p>${c.desc}</p>
                    <div class="project-meta">${[c.date, ...c.tags].filter(Boolean).join(' · ')}</div>
                </a>`;
const grid = cards => `            <div class="project-grid">\n${cards.map(cardHtml).join('\n')}\n            </div>`;
const sectionHtml = (icon, name, count, inner) => `        <section class="section">
            <div class="section-header">
                <div class="section-icon"><i data-lucide="${icon}" style="width:20px;height:20px"></i></div>
                <h2>${name}</h2><span class="section-count">${count}</span>
            </div>
${inner}
        </section>`;

const synderInner = groups.filter(g => out.synder.some(c => c.group === g)).map(g =>
  `            <div class="group-label">${g}</div>\n${grid(out.synder.filter(c => c.group === g))}`).join('\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ignat's Prototype Hub</title>
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
            --bg-primary: #f5f7fa; --bg-secondary: #ffffff; --bg-tertiary: #f0f2f5;
            --border: #e1e4e8; --text-primary: #1f2328; --text-secondary: #57606a;
            --accent: #0053CC;
        }
        body { font-family: Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            background: var(--bg-primary); color: var(--text-primary); min-height: 100vh; font-size: 14px; }

        .header { background: var(--bg-secondary); border-bottom: 1px solid var(--border); padding: 16px 32px;
            display: flex; align-items: center; justify-content: space-between; }
        .header-left { display: flex; align-items: center; gap: 12px; }
        .logo { width: 36px; height: 36px; background: var(--accent); border-radius: 8px; display: flex;
            align-items: center; justify-content: center; color: #fff; }
        .header h1 { font-size: 20px; font-weight: 600; }
        .header-links { display: flex; gap: 8px; }
        .header-link { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--bg-tertiary);
            border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); text-decoration: none; font-size: 14px; }
        .header-link:hover { background: var(--border); }

        .main { max-width: 1440px; margin: 0 auto; padding: 24px 32px 48px; }
        .section { margin-bottom: 32px; }
        .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .section-icon { width: 32px; height: 32px; background: var(--accent); border-radius: 8px; display: flex;
            align-items: center; justify-content: center; color: #fff; }
        .section-header h2 { font-size: 20px; font-weight: 600; }
        .section-count { font-size: 14px; color: var(--text-secondary); }
        .group-label { font-size: 14px; font-weight: 600; color: var(--text-secondary); margin: 16px 0 8px; }

        .project-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 8px; }
        .project-card { display: block; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px;
            padding: 10px 14px; text-decoration: none; color: inherit; transition: border-color .15s, box-shadow .15s; }
        .project-card:hover { border-color: var(--accent); box-shadow: 0 2px 8px rgba(0,0,0,.08); }
        .project-card:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
        .project-card h3 { font-size: 15px; font-weight: 600; line-height: 20px;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .project-card p, .project-meta { font-size: 14px; line-height: 20px; color: var(--text-secondary);
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .project-meta { color: #8c959f; }

        .footer { border-top: 1px solid var(--border); padding: 16px 32px; text-align: center;
            color: var(--text-secondary); font-size: 14px; }
    </style>
</head>
<body>
    <header class="header">
        <div class="header-left">
            <div class="logo"><i data-lucide="layout-grid" style="width:20px;height:20px"></i></div>
            <h1>Ignat's Prototype Hub</h1>
        </div>
        <div class="header-links">
            <a href="https://dashasyn.github.io/synder-prototypes/" class="header-link">
                <i data-lucide="briefcase" style="width:16px;height:16px"></i> Synder Prototypes
            </a>
            <a href="https://github.com/dashasyn/synder-prototypes" class="header-link">
                <i data-lucide="github" style="width:16px;height:16px"></i> GitHub
            </a>
        </div>
    </header>

    <main class="main">
${sectionHtml('bus', 'Transport', out.transport.length, grid(out.transport))}

${sectionHtml('briefcase', 'Synder', out.synder.length, synderInner)}

${sectionHtml('user', 'Personal', out.personal.length, grid(out.personal))}
    </main>

    <footer class="footer"><p>Built by Ignat · Hosted on GitHub Pages</p></footer>
    <script>lucide.createIcons();</script>
</body>
</html>
`;
fs.writeFileSync(file, html);
console.log(JSON.stringify({ transport: out.transport.length, synder: out.synder.length, personal: out.personal.length,
  groups: groups.length, total: out.transport.length + out.synder.length + out.personal.length }));
