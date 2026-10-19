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
  ok("no Variant switch — only State + Accounting", (await page.locator("[id^=vv-]").count()) === 0 && (await page.locator(".variant-switch .vs-opts").count()) === 2);
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
      for (const [id, panel, tab] of [["#lnk-import", "#p-import .panel-t", "import"], ["#lnk-sync", "#p-sync .panel-t", "sync"]]) {
        ok(`${t} ${id} visible in its header`, await page.locator(id).isVisible() && (await page.locator(`${panel} ${id}`).count()) === 1);
        ok(`${t} ${id} right-aligned`, await page.evaluate(([i, h]) => Math.abs(document.querySelector(h).getBoundingClientRect().right - document.querySelector(i).getBoundingClientRect().right) < 2, [id, panel]));
        await page.click(id);
        ok(`${t} ${id} opens Troubleshooting · ${tab}`, await page.locator("#page-trouble").isVisible() && await page.locator(`#tab-${tab}.active`).isVisible() && !(await page.locator("#page-dash").isVisible()));
        await page.click("#nav-dashboard");
        ok(`${t} back on dashboard after ${id}`, await page.locator("#page-dash").isVisible() && page.url().endsWith("#" + key));
      }
      const off = await page.evaluate((() => { const b = document.getElementById("kpis").getBoundingClientRect(); const k = [...document.querySelectorAll("#kpis .kpi")].map((e) => e.getBoundingClientRect()); const c = [...document.querySelectorAll("#page-dash .cols > .col")].map((e) => e.getBoundingClientRect());
        /* outer edges of the blocks = outer edges of the grey band; inner edges = KPI card edges */
        const pairs = [[c[0].left, b.left], [c[0].right, k[0].right], [c[1].left, k[1].left], [c[1].right, k[1].right], [c[2].left, k[2].left], [c[2].right, b.right]];
        return Math.max(...pairs.map(([x, y]) => Math.abs(x - y))); }));
      ok(`${t} blocks align: outer edges with the band, inner edges with the cards`, off < 1, off.toFixed(1) + "px");
      const small = await page.evaluate(() => [...document.querySelectorAll("body *")].filter((el) => !el.closest("svg") && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 14).length);
      ok(`${t} no text under 14px`, small === 0, String(small));
      ok(`${t} no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    }
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + "#attention");
  await page.waitForSelector("#sync-rows .row");
  /* KPI tooltips (production copy, shortened) */
  for (const [id, text, link] of [["#kpi-time", "Bookkeeping time saved by automatically recording transactions in your books.", "Time saved"], ["#kpi-score", "Percentage of imported transactions synced to your books.", "Sync score"]]) {
    await page.locator("#page-dash h1").hover();
    const card = page.locator(`${id} .tip-card`);
    ok(`${id} tooltip hidden until hover`, !(await card.isVisible()));
    await page.hover(`${id} .help`);
    ok(`${id} tooltip opens on hover`, await card.isVisible());
    ok(`${id} tooltip text`, (await card.locator(".tip-text").innerText()) === text, await card.locator(".tip-text").innerText());
    const r = await card.evaluate((e) => { const b = e.getBoundingClientRect(); return { w: b.width, right: b.right, vw: innerWidth }; });
    ok(`${id} tooltip fits on screen`, r.right <= r.vw);
    ok(`${id} tooltip sits under its icon`, await page.evaluate((i) => { const h = document.querySelector(i + " .help").getBoundingClientRect(), t = document.querySelector(i + " .tip-card").getBoundingClientRect(); return t.top >= h.bottom - 2 && t.top - h.bottom < 10 && t.left >= 0; }, id));
    await page.hover(`${id} .tip-link`);
    ok(`${id} tooltip stays open while moving into it`, await card.isVisible() && await card.locator(".tip-link").isVisible());
    await page.click(`${id} .tip-link`);
    ok(`${id} How is this calculated? clickable`, (await page.locator("#toast").innerText()).includes("How is this calculated? · " + link));
    await page.locator("#page-dash h1").hover();
    ok(`${id} tooltip closes on leave`, !(await card.isVisible()));
    await page.focus(`${id} .help`);
    ok(`${id} tooltip opens on keyboard focus`, await card.isVisible());
    await page.locator("#page-dash h1").click();
  }
  const smallTip = await page.evaluate(() => [...document.querySelectorAll(".tip-card *")].filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 14).length);
  ok("tooltip text ≥14px", smallTip === 0);

  /* ---------- Accounting card: action + status tooltip ---------- */
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const [key, def] of [["attention", "ok"], ["clear", "ok"], ["lost", "lost"]]) {
    await page.goto(base + "#" + key);
    await page.waitForSelector("#acct-action");
    ok(`[acct ${key}] default status = ${def}`, await page.locator(`#va-${def}.on`).isVisible());
    for (const [a, chip, since] of [["ok", "Connected", null], ["lost", "Connection lost", "Oct 2, 2026 05:58"], ["disc", "Disconnected", "Oct 5, 2026 14:20"]]) {
      await page.click(`#va-${a}`);
      const t = `[acct ${key} ${a}]`;
      ok(`${t} switch on`, await page.locator(`#va-${a}.on`).isVisible());
      ok(`${t} chip "${chip}"`, (await page.locator("#p-accounting .item-chips .status").innerText()) === chip);
      const act = page.locator("#acct-action");
      ok(`${t} action is ${a === "ok" ? "Manage" : "Reconnect"}`, (await act.innerText()).trim() === (a === "ok" ? "Manage" : "Reconnect") && await act.isVisible());
      ok(`${t} only one action on the card`, (await page.locator("#p-accounting .item-h .lnk").count()) === 1);
      ok(`${t} action stays top-right of the card`, await page.evaluate(() => { const c = document.querySelector("#p-accounting .item").getBoundingClientRect(), b = document.getElementById("acct-action").getBoundingClientRect(); return c.right - b.right < 20 && b.top - c.top < 20; }));
      await act.click();
      ok(`${t} action bridges`, (await page.locator("#toast").innerText()).includes(a === "ok" ? "Manage accounting connection" : "Reconnect · My lovely money (QuickBooks Online)"));
      if (since) {
        const tip = page.locator("#acct-status .tip-card");
        ok(`${t} tooltip hidden until hover`, !(await tip.isVisible()));
        await page.hover("#acct-status");
        ok(`${t} tooltip opens on hover`, await tip.isVisible());
        ok(`${t} tooltip copy`, (await tip.innerText()).trim() === `No transactions were synced to your books since ${since}.`, await tip.innerText());
        ok(`${t} tooltip fits on screen`, await tip.evaluate((e) => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; }));
        ok(`${t} tooltip sits right under its chip`, await page.evaluate(() => { const c = document.querySelector("#acct-status .status").getBoundingClientRect(), t = document.querySelector("#acct-status .tip-card").getBoundingClientRect(); return Math.abs(t.top - c.bottom) < 4 && Math.abs(t.left - c.left) < 16; }));
        ok(`${t} tooltip is on top (not covered)`, await page.evaluate(() => { const t = document.querySelector("#acct-status .tip-text").getBoundingClientRect(); const el = document.elementFromPoint(t.left + 10, t.top + 8); return !!el && !!el.closest("#acct-status"); }));
        await page.locator("#page-dash h1").hover();
        await page.focus("#acct-status");
        ok(`${t} tooltip opens on keyboard focus`, await tip.isVisible());
        await page.locator("#page-dash h1").click();
        ok(`${t} card tinted red`, (await page.locator("#p-accounting .item.bad").count()) === 1);
      } else {
        ok(`${t} no status tooltip when connected`, (await page.locator("#acct-status").count()) === 0);
        ok(`${t} card not tinted`, (await page.locator("#p-accounting .item.bad").count()) === 0);
      }
    }
    await page.click(key === "lost" ? "#vs-attention" : "#vs-lost");
    ok(`[acct ${key}] state change resets the Accounting switch to the state's default`, await page.locator(key === "lost" ? "#va-ok.on" : "#va-lost.on").isVisible());
  }
  ok("[acct] Needs attention card has no Troubleshooting link in any state", true);
  for (const key of ["attention", "clear", "lost"]) {
    await page.goto(base + "#" + key);
    await page.waitForSelector("#kpis .kpi");
    ok(`[acct ${key}] no Troubleshooting link on Needs attention`, (await page.locator("#kpi-attn .lnk", { hasText: "Troubleshooting" }).count()) === 0);
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
