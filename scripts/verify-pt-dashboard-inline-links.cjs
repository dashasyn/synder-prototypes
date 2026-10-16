/* Verify the Inline · links copy of the PT dashboard in real Chromium.
   Usage: node scripts/verify-pt-dashboard-inline-links.cjs [url]
   Asserts liveness with isVisible(), never element state alone. */
const { chromium } = require("playwright");
const path = require("path");

const target = process.argv[2] || "file://" + path.resolve(__dirname, "../projects/pt-dashboard-inline-links/index.html");
const base = target.split("#")[0];

let pass = 0;
const fails = [];
function ok(name, cond, extra) {
  if (cond) { pass++; } else { fails.push(name + (extra ? ` — ${extra}` : "")); }
}

const ST = {
  attention: { score: "80%", sync: 10, banner: false, revrec: false },
  clear:     { score: "100%", sync: 3, banner: false, revrec: false },
  lost:      { score: "70%", sync: 18, banner: true, revrec: true },
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  await page.goto(base);
  await page.waitForSelector("#sync-rows .row");

  ok("switcher is first element in body", await page.evaluate(() => document.body.firstElementChild.classList.contains("variant-switch")));
  ok("only the State group — no Variant switch", (await page.locator("[id^=vv-]").count()) === 0 && (await page.locator(".variant-switch .vs-opts").count()) === 1);
  ok("title", (await page.title()).includes("Inline links"));

  for (const w of [1440, 1280]) {
    await page.setViewportSize({ width: w, height: 1000 });
    for (const key of Object.keys(ST)) {
      const e = ST[key];
      await page.click(`#vs-${key}`);
      const t = `[${w} ${key}]`;
      ok(`${t} state on, hash`, await page.locator(`#vs-${key}.on`).isVisible() && page.url().endsWith("#" + key));
      ok(`${t} score ${e.score}`, (await page.locator("#kpi-score .kpi-v").innerText()).startsWith(e.score));
      ok(`${t} ${e.sync} sync statuses`, (await page.locator("#sync-rows .row").count()) === e.sync);
      ok(`${t} Import shows 2 integrations at most`, (await page.locator("#import-rows .row").count()) <= 2);
      ok(`${t} production banner ${e.banner ? "shown" : "absent"}`, (await page.locator("#lost-banner").count()) === (e.banner ? 1 : 0));
      ok(`${t} revrec ${e.revrec ? "shown" : "absent"}`, (await page.locator("#p-revrec").count()) === (e.revrec ? 1 : 0));
      ok(`${t} nothing from other variants`, (await page.locator("#issues, #p-trouble, #acts, .xf, #hdr-trouble, .dash-tabs").count()) === 0);
      for (const [id, panel, tab] of [["#lnk-import", "#p-import .panel-t", "import"], ["#lnk-sync", "#p-sync .panel-t", "sync"], ["#lnk-trouble", "#kpi-attn .kpi-t", "sync"]]) {
        ok(`${t} ${id} visible in its header`, await page.locator(id).isVisible() && (await page.locator(`${panel} ${id}`).count()) === 1);
        ok(`${t} ${id} right-aligned`, await page.evaluate(([i, h]) => Math.abs(document.querySelector(h).getBoundingClientRect().right - document.querySelector(i).getBoundingClientRect().right) < 2, [id, panel]));
        await page.click(id);
        ok(`${t} ${id} opens Troubleshooting · ${tab}`, await page.locator("#page-trouble").isVisible() && await page.locator(`#tab-${tab}.active`).isVisible() && !(await page.locator("#page-dash").isVisible()));
        await page.click("#nav-dashboard");
        ok(`${t} back on dashboard after ${id}`, await page.locator("#page-dash").isVisible() && page.url().endsWith("#" + key));
      }
      const off = await page.evaluate(() => { const k = [...document.querySelectorAll("#kpis .kpi")].map((e) => e.getBoundingClientRect()); const c = [...document.querySelectorAll("#page-dash .cols > .col")].map((e) => e.getBoundingClientRect());
        return Math.max(...k.map((r, i) => Math.max(Math.abs(r.left - c[i].left), Math.abs(r.right - c[i].right)))); });
      ok(`${t} KPI card edges match block edges`, off < 1, off.toFixed(1) + "px");
      const small = await page.evaluate(() => [...document.querySelectorAll("body *")].filter((el) => !el.closest("svg") && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 14).length);
      ok(`${t} no text under 14px`, small === 0, String(small));
      ok(`${t} no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    }
  }

  /* Troubleshooting page still works end to end */
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const [key, groups] of [["attention", 6], ["clear", 0], ["lost", 9]]) {
    await page.goto(base + "#" + key + "/sync");
    await page.waitForSelector("#si-table");
    ok(`[ts ${key}] deep link opens Synchronization issues`, await page.locator("#tab-sync.active").isVisible());
    ok(`[ts ${key}] ${groups} error groups`, (await page.locator("#si-table tbody tr:not(:has(.empty))").count()) === groups);
    await page.click("#tab-import");
    ok(`[ts ${key}] import log 25 rows`, (await page.locator("#il-table tbody tr").count()) === 25);
    await page.click("#tab-speed");
    ok(`[ts ${key}] sync speed chart`, await page.locator("#sp-chart svg").isVisible());
    await page.click("#nav-troubleshooting");
    ok(`[ts ${key}] sidebar Troubleshooting opens the main tab`, await page.locator("#tab-sync.active").isVisible());
    await page.click("#nav-dashboard");
    ok(`[ts ${key}] Dashboard nav returns`, await page.locator("#page-dash").isVisible() && page.url().endsWith("#" + key));
  }

  /* legacy variant hashes don't break the copy */
  await page.goto(base + "#v1-lost");
  await page.waitForSelector("#sync-rows .row");
  ok("foreign variant hash falls back to the default state, still Inline · links", await page.locator("#lnk-sync").isVisible() && (await page.locator("#issues").count()) === 0);

  ok("no JS errors", errors.length === 0, errors.join(" | "));
  await browser.close();
  console.log(`${pass} passed, ${fails.length} failed`);
  fails.forEach((f) => console.log("  ✗ " + f));
  process.exit(fails.length ? 1 : 0);
})();
