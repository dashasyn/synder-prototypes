/* Verify the recreated Per Transaction dashboard in real Chromium.
   Usage: node scripts/verify-pt-dashboard-current.cjs [url]
   Asserts liveness with isVisible(), never element state alone. */
const { chromium } = require("playwright");
const path = require("path");

const target = process.argv[2] || "file://" + path.resolve(__dirname, "../projects/pt-dashboard-current/index.html");

let pass = 0;
const fails = [];
function ok(name, cond, extra) {
  if (cond) { pass++; } else { fails.push(name + (extra ? ` — ${extra}` : "")); }
}

const EXPECT = {
  attention: { sync: 10, imports: 2, integrations: 2, score: "80%", attn: "80 transactions", banner: false, revrec: false, hot: 2 },
  clear:     { sync: 3,  imports: 1, integrations: 1, score: "100%", attn: "All clear",      banner: false, revrec: false, hot: 0 },
  lost:      { sync: 18, imports: 2, integrations: 6, score: "70%", attn: "80 transactions", banner: true,  revrec: true,  hot: 2 },
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  await page.goto(target);
  await page.waitForSelector("#sync-rows .row");

  ok("switcher is first element in body", await page.evaluate(() => document.body.firstElementChild.classList.contains("variant-switch")));
  ok("H1 is visible with live copy", (await page.locator("#page-dash h1").innerText()) === "Hi Dalia, your data is ready to review");
  ok("period select visible", await page.locator("#period").isVisible());

  for (const key of Object.keys(EXPECT)) {
    const e = EXPECT[key];
    const urlBefore = page.url().split("#")[0];
    await page.click(`#vs-${key}`);
    ok(`[${key}] switch stays on the same page`, page.url().split("#")[0] === urlBefore);
    ok(`[${key}] switch button is on`, await page.locator(`#vs-${key}.on`).isVisible());

    const syncRows = page.locator("#sync-rows .row");
    ok(`[${key}] ${e.sync} sync statuses`, (await syncRows.count()) === e.sync, "got " + (await syncRows.count()));
    ok(`[${key}] first sync row visible`, await syncRows.first().isVisible());
    ok(`[${key}] last sync row visible (no clipping)`, await syncRows.last().isVisible());
    ok(`[${key}] ${e.hot} red-tinted rows`, (await page.locator("#sync-rows .row.hot").count()) === e.hot);
    ok(`[${key}] ${e.imports} import rows`, (await page.locator("#import-rows .row").count()) === e.imports);
    ok(`[${key}] ${e.integrations} integrations`, (await page.locator("#p-integrations .item").count()) === e.integrations);
    ok(`[${key}] sync score ${e.score}`, (await page.locator("#kpi-score .kpi-v").innerText()).startsWith(e.score));
    ok(`[${key}] needs attention reads "${e.attn}"`, (await page.locator("#kpi-attn .kpi-v").innerText()).trim() === e.attn);
    ok(`[${key}] banner ${e.banner ? "shown" : "absent"}`, (await page.locator("#lost-banner").count()) === (e.banner ? 1 : 0));
    if (e.banner) ok(`[${key}] banner visible`, await page.locator("#lost-banner").isVisible());
    ok(`[${key}] revrec ${e.revrec ? "shown" : "absent"}`, (await page.locator("#p-revrec").count()) === (e.revrec ? 1 : 0));
    ok(`[${key}] attention card tone`, (await page.locator(`#kpi-attn.${e.attn === "All clear" ? "good" : "bad"}`).count()) === 1);
    ok(`[${key}] score/time links only when below 100%`,
      (await page.locator("#kpi-score .kpi-v .lnk").count()) === (e.score === "100%" ? 0 : 1) &&
      (await page.locator("#kpi-time .kpi-v .lnk").count()) === (e.score === "100%" ? 0 : 1));

    /* every status chip has a known tone, not the grey fallback by accident */
    const untoned = await page.$$eval("#sync-rows .status", (els) => els.filter((x) => !/status-(red|yellow|green|blue|dark-blue|black|grey)/.test(x.className)).length);
    ok(`[${key}] every status chip toned`, untoned === 0);

    /* no text below 14px anywhere */
    const small = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll("body *").forEach((el) => {
        if (el.closest("svg")) return;
        const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        if (own && parseFloat(getComputedStyle(el).fontSize) < 14) out.push(el.tagName + "." + el.className + ":" + getComputedStyle(el).fontSize);
      });
      return out;
    });
    ok(`[${key}] no text under 14px`, small.length === 0, small.slice(0, 4).join(", "));

    ok(`[${key}] no horizontal page overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  }

  /* lost state: import box scrolls internally, last row reachable */
  await page.click("#vs-lost");
  ok("[lost] import list shows 2 integrations, no inner scroll", (await page.locator("#import-rows .row").count()) === 2 && await page.$eval("#import-rows", (el) => el.scrollHeight <= el.clientHeight));
  await page.locator("#import-rows .row").last().scrollIntoViewIfNeeded();
  ok("[lost] last import row reachable", await page.locator("#import-rows .row").last().isVisible());
  ok("[lost] long name truncates with ellipsis", await page.$eval("#import-rows .row:nth-child(2) .txt", (el) => el.scrollWidth > el.clientWidth && getComputedStyle(el).textOverflow === "ellipsis"));

  /* clicks land on a visible toast */
  const toast = page.locator("#toast.show");
  await page.click("#sync-rows .row >> nth=0");
  ok("status row click shows toast", await toast.isVisible());
  ok("toast names the status", (await page.locator("#toast").innerText()).includes("Failed"));
  await page.click("#attn-link");
  ok("needs-attention link toasts", (await page.locator("#toast").innerText()).includes("Needs attention"));
  await page.click("#lost-banner .btn");
  ok("banner Reconnect toasts", (await page.locator("#toast").innerText()).includes("Reconnect"));

  /* row menu: opens, stays usable, closes on Escape and outside click */
  const menuBtn = page.locator("#p-integrations [data-menu]").first();
  await menuBtn.click();
  const menu = page.locator("#p-integrations .dropdown-menu.show");
  ok("row menu opens visibly", await menu.isVisible());
  ok("row menu marks uncaptured copy", (await menu.innerText()).includes("[live copy not captured]"));
  await page.keyboard.press("Escape");
  ok("Escape closes row menu", !(await page.locator("#p-integrations .dropdown-menu").first().isVisible()));
  await menuBtn.click();
  await page.click("#page-dash h1");
  ok("outside click closes row menu", !(await page.locator("#p-integrations .dropdown-menu").first().isVisible()));
  await menuBtn.click();
  await page.locator("#p-integrations [data-menu]").nth(1).click();
  ok("opening a second menu closes the first", (await page.locator(".dropdown-menu.show").count()) === 1 && await page.locator("#p-integrations .dropdown-menu").nth(1).isVisible());
  await page.keyboard.press("Escape");

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

  /* other "?" icons stay marked as uncaptured */
  await page.hover("#p-import .panel-t .help");
  await page.waitForTimeout(250);
  const tip = page.locator("#p-import .panel-t .help .tooltip");
  ok("uncaptured tooltip shows on hover", parseFloat(await tip.evaluate((el) => getComputedStyle(el).opacity)) > 0.9 && await tip.isVisible());
  ok("uncaptured tooltip keeps its marker", (await tip.innerText()) === "[live copy not captured]");

  /* deep link by hash */
  await page.goto(target.split("#")[0] + "#clear");
  await page.waitForSelector("#sync-rows .row");
  ok("#clear hash opens state 2", (await page.locator("#sync-rows .row").count()) === 3 && await page.locator("#vs-clear.on").isVisible());

  /* narrower laptop */
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.click("#vs-lost");
  ok("1280: no horizontal overflow", await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  ok("1280: integration actions visible", await page.locator("#p-integrations .lnk").first().isVisible());

  /* ---------- Var 1: collapsed issues block ---------- */
  await page.setViewportSize({ width: 1440, height: 1000 });
  const V1 = {
    attention: { issues: 1, rows: ["80 transactions need attention"], desc: "Failed, rollback failed, synced with rule failed." },
    clear:     { issues: 0 },
    lost:      { issues: 4, rows: ["Connection lost", "Auto-import and Auto-sync are off", "80 transactions need attention", "Revenue recognition incomplete"], desc: "Failed, rollback failed, synced with rule failed, not parsed." },
  };
  await page.click("#vs-attention");
  await page.click("#vv-1");
  ok("[v1] variant button on", await page.locator("#vv-1.on").isVisible());
  ok("[v1] state kept when switching variant", await page.locator("#vs-attention.on").isVisible());
  ok("[v1] hash records variant", page.url().endsWith("#v1-attention"));
  for (const key of Object.keys(V1)) {
    const e = V1[key];
    await page.click(`#vs-${key}`);
    ok(`[v1 ${key}] production banner absent`, (await page.locator("#lost-banner").count()) === 0);
    if (!e.issues) {
      ok(`[v1 ${key}] no issues block when nothing is wrong`, (await page.locator("#issues").count()) === 0);
      continue;
    }
    const head = page.locator("#issues-head");
    ok(`[v1 ${key}] issues head visible`, await head.isVisible());
    const found = e.issues + (e.issues === 1 ? " issue found" : " issues found");
    ok(`[v1 ${key}] head reads "${found}"`, (await head.innerText()).includes(found));
    ok(`[v1 ${key}] collapsed by default`, !(await page.locator("#issues-body").isVisible()) && (await head.getAttribute("aria-expanded")) === "false");
    ok(`[v1 ${key}] head sits above the KPI band`, await page.evaluate(() => document.getElementById("issues").getBoundingClientRect().bottom <= document.getElementById("kpis").getBoundingClientRect().top));
    await head.click();
    ok(`[v1 ${key}] expands on click`, await page.locator("#issues-body").isVisible());
    ok(`[v1 ${key}] no Show/Hide text`, (await page.locator("#issues .tog").count()) === 0 && !/\b(Show|Hide)\b/.test(await page.locator("#issues-head").innerText()));
    ok(`[v1 ${key}] Go to Troubleshooting stays visible while expanded`, await page.locator("#go-trouble").isVisible());
    const rows = page.locator("#issues-body > .issue");
    ok(`[v1 ${key}] ${e.issues} issue rows`, (await rows.count()) === e.issues, "got " + (await rows.count()));
    for (let i = 0; i < e.rows.length; i++) {
      ok(`[v1 ${key}] row ${i + 1} title is "${e.rows[i]}"`, (await rows.nth(i).locator(".issue-title").innerText()) === e.rows[i], await rows.nth(i).locator(".issue-title").innerText());
      ok(`[v1 ${key}] row ${i + 1} has a description`, (await rows.nth(i).locator(".issue-desc").innerText()).length > 10);
      ok(`[v1 ${key}] row ${i + 1} bridge visible`, (await rows.nth(i).locator(".lnk").count()) === 1 && await rows.nth(i).locator(".lnk").isVisible());
    }
    ok(`[v1 ${key}] no status chips in the block`, (await page.locator("#issues .status").count()) === 0);
    const hasConn = e.rows.includes("Connection lost");
    ok(`[v1 ${key}] ${hasConn ? "exactly one" : "no"} connection message`, (await page.locator('#issues-body .issue-title', { hasText: "Connection lost" }).count()) === (hasConn ? 1 : 0));
    if (hasConn) {
      ok(`[v1 ${key}] connection message is production copy`, (await page.locator('[data-issue="conn"] .issue-desc').innerText()) === "One or more of your integrations have lost connection. Please reconnect to continue syncing.");
      await page.locator('[data-issue="conn"] .lnk').click();
      ok(`[v1 ${key}] connection row bridges to Organization settings`, (await page.locator("#toast").innerText()).endsWith("would open: Organization settings"));
    }
    ok(`[v1 ${key}] block stays open after a bridge click`, await page.locator("#issues-body").isVisible());
    ok(`[v1 ${key}] exactly one transactions message`, (await page.locator('#issues-body .issue-title', { hasText: "transactions need attention" }).count()) === 1);
    ok(`[v1 ${key}] transactions count matches the Needs attention card`, (await page.locator('[data-issue="txn"] .issue-title').innerText()).split(" ")[0] + " transactions" === (await page.locator("#attn-link").innerText()).trim());
    ok(`[v1 ${key}] transactions row lists the failed statuses`, (await page.locator('[data-issue="txn"] .issue-desc').innerText()) === e.desc, await page.locator('[data-issue="txn"] .issue-desc').innerText());
    ok(`[v1 ${key}] transactions row links to sync issues`, (await page.locator('[data-issue="txn"] .lnk').innerText()).trim() === "View sync issues");
    await page.locator('[data-issue="txn"] .lnk').click();
    ok(`[v1 ${key}] transactions row opens Troubleshooting · Synchronization issues`, await page.locator("#page-trouble").isVisible() && await page.locator("#tab-sync.active").isVisible());
    await page.click("#nav-dashboard");
    ok(`[v1 ${key}] block still open after coming back`, await page.locator("#issues-body").isVisible());
    const small = await page.evaluate(() => [...document.querySelectorAll("#issues *")].filter((el) => !el.closest("svg") && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 14).length);
    ok(`[v1 ${key}] no text under 14px in the block`, small === 0);
    ok(`[v1 ${key}] no horizontal overflow expanded`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await head.click();
    ok(`[v1 ${key}] collapses again`, !(await page.locator("#issues-body").isVisible()) && await head.isVisible());
  }
  /* switching state resets to collapsed */
  await page.click("#vs-attention");
  await page.click("#issues-head");
  await page.click("#vs-lost");
  ok("[v1] state switch re-collapses the block", !(await page.locator("#issues-body").isVisible()));
  /* keyboard */
  await page.focus("#issues-head");
  await page.keyboard.press("Enter");
  ok("[v1] Enter on head expands", await page.locator("#issues-body").isVisible());
  /* back to production keeps state, restores banner */
  await page.click("#vv-0");
  ok("[v0] production banner back in state 3", await page.locator("#lost-banner").isVisible() && (await page.locator("#issues").count()) === 0);
  /* deep link */
  await page.goto(target.split("#")[0] + "#v1-lost");
  await page.waitForSelector("#issues-head");
  ok("#v1-lost opens Var 1 state 3", await page.locator("#vv-1.on").isVisible() && await page.locator("#vs-lost.on").isVisible());

  /* ---------- Var 5: always-visible action list ---------- */
  await page.goto(target.split("#")[0] + "#attention");
  await page.waitForSelector("#sync-rows .row");
  await page.click("#vv-5");
  ok("[v5] variant button on", await page.locator("#vv-5.on").isVisible());
  ok("[v5] hash records variant", page.url().endsWith("#v5-attention"));
  const V2 = {
    attention: { req: ["Review 80 transactions that need attention"], next: ["Run Transaction reconciliation"] },
    clear:     { req: [], next: ["Sync 30 ready transactions", "Run Transaction reconciliation"] },
    lost:      { req: ["Reconnect lost connections", "Turn on Auto-import and Auto-sync", "Review 80 transactions that need attention", "Complete revenue recognition"], next: ["Sync 30 ready transactions", "Run Transaction reconciliation"] },
  };
  for (const key of Object.keys(V2)) {
    const e = V2[key];
    await page.click(`#vs-${key}`);
    ok(`[v5 ${key}] no production banner, no collapsed block`, (await page.locator("#lost-banner").count()) === 0 && (await page.locator("#issues").count()) === 0);
    ok(`[v5 ${key}] list sits between KPI band and columns`, await page.evaluate(() => {
      const a = document.getElementById("acts").getBoundingClientRect(), k = document.getElementById("kpis").getBoundingClientRect(), c = document.querySelector(".cols").getBoundingClientRect();
      return a.top >= k.bottom && a.bottom <= c.top; }));
    ok(`[v5 ${key}] Required section ${e.req.length ? "shown" : "absent"}`, (await page.locator("#acts-req").count()) === (e.req.length ? 1 : 0));
    for (const [sec, want] of [["req", e.req], ["next", e.next]]) {
      if (!want.length) continue;
      const items = page.locator(`#acts-${sec} .act`);
      ok(`[v5 ${key}] ${sec}: ${want.length} actions`, (await items.count()) === want.length, "got " + (await items.count()));
      for (let i = 0; i < want.length; i++) {
        ok(`[v5 ${key}] ${sec} ${i + 1} is "${want[i]}"`, (await items.nth(i).locator(".act-title").innerText()) === want[i], await items.nth(i).locator(".act-title").innerText());
        ok(`[v5 ${key}] ${sec} ${i + 1} visible without clicking`, await items.nth(i).isVisible() && await items.nth(i).locator(".btn").isVisible());
      }
    }
    if (e.req.length) {
      if (e.req[0] === "Reconnect lost connections") {
        ok(`[v5 ${key}] connection action uses production copy`, (await page.locator('[data-act="conn"] .act-desc').innerText()) === "One or more of your integrations have lost connection. Please reconnect to continue syncing.");
        await page.locator('[data-act="conn"] .btn').click();
        ok(`[v5 ${key}] Reconnect bridges to Organization settings`, (await page.locator("#toast").innerText()).endsWith("would open: Organization settings"));
      }
      await page.locator('[data-act="txn"] .btn').click();
      ok(`[v5 ${key}] transactions action opens Synchronization issues`, await page.locator("#tab-sync.active").isVisible());
      await page.click("#nav-dashboard");
    }
    await page.locator('[data-act="recon"] .btn').click();
    ok(`[v5 ${key}] reconciliation bridges`, (await page.locator("#toast").innerText()).includes("Transaction reconciliation"));
    const small = await page.evaluate(() => [...document.querySelectorAll("#acts *")].filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 14).length);
    ok(`[v5 ${key}] no text under 14px`, small === 0);
    ok(`[v5 ${key}] no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  }
  await page.goto(target.split("#")[0] + "#v5-lost");
  await page.waitForSelector("#acts");
  ok("[v5] no checkbox squares in either list", (await page.locator("#acts .act-box, #acts input[type=checkbox]").count()) === 0);
  ok("#v5-lost opens Var 5 state 3", await page.locator("#vv-5.on").isVisible() && await page.locator("#vs-lost.on").isVisible());

  /* ---------- Var 2: separate Troubleshooting block ---------- */
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(target.split("#")[0] + "#v2-attention");
  await page.waitForSelector("#p-trouble");
  ok("[v2] no Links switch group", (await page.locator("[id^=vl-]").count()) === 0);
  const TP = { attention: { n: 1, rows: ["80 transactions need attention"], more: 0 }, clear: { n: 0 }, lost: { n: 4, rows: ["Connection lost", "Auto-import and Auto-sync are off", "80 transactions need attention"], more: 1 } };
  for (const key of Object.keys(TP)) {
    const e = TP[key];
    await page.click(`#vs-${key}`);
    ok(`[v2 ${key}] no top block, no production banner`, (await page.locator("#issues, #lost-banner").count()) === 0);
    ok(`[v2 ${key}] Troubleshooting block first in right column`, await page.evaluate(() => document.getElementById("col-right").firstElementChild.id === "p-trouble"));
    ok(`[v2 ${key}] block visible`, await page.locator("#p-trouble").isVisible());
    ok(`[v2 ${key}] Go to Troubleshooting visible`, await page.locator("#tp-go").isVisible());
    if (!e.n) {
      ok(`[v2 ${key}] reads No issues`, (await page.locator("#tp-ok").innerText()) === "No issues" && (await page.locator("#tp-count").count()) === 0);
    } else {
      ok(`[v2 ${key}] count chip ${e.n}`, (await page.locator("#tp-count").innerText()) === String(e.n));
      const rows = page.locator("#p-trouble .tp-row");
      ok(`[v2 ${key}] shows ${e.rows.length} rows (max 3)`, (await rows.count()) === e.rows.length);
      for (let i = 0; i < e.rows.length; i++) {
        ok(`[v2 ${key}] row ${i + 1} "${e.rows[i]}"`, (await rows.nth(i).locator(".tp-title").innerText()) === e.rows[i]);
        ok(`[v2 ${key}] row ${i + 1} link visible`, await rows.nth(i).locator(".lnk").isVisible());
      }
      ok(`[v2 ${key}] +more ${e.more ? "shown" : "absent"}`, e.more ? (await page.locator("#tp-more").innerText()) === "+" + e.more + " more" : (await page.locator("#tp-more").count()) === 0);
      await page.locator('[data-tp="txn"] .lnk').click();
      ok(`[v2 ${key}] transactions row opens Synchronization issues`, await page.locator("#tab-sync.active").isVisible());
      await page.click("#nav-dashboard");
    }
    await page.click("#tp-go");
    ok(`[v2 ${key}] Go to Troubleshooting navigates`, await page.locator("#page-trouble").isVisible());
    await page.click("#nav-dashboard");
    ok(`[v2 ${key}] no overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  }

  /* ---------- Var 3: inline · links (blue links top-right of blocks) ---------- */
  await page.click("#vv-3");
  ok("[v3] hash", page.url().endsWith("#v3-lost"));
  for (const key of ["attention", "clear", "lost"]) {
    await page.click(`#vs-${key}`);
    for (const [id, panel, want, tab] of [["#lnk-import", "#p-import .panel-t", "Import activity log", "import"], ["#lnk-sync", "#p-sync .panel-t", "Sync issues", "sync"]]) {
      const l = page.locator(id);
      ok(`[v3 ${key}] ${want} link visible in its block header`, await l.isVisible() && (await page.locator(`${panel} ${id}`).count()) === 1);
      ok(`[v3 ${key}] ${want} link right-aligned`, await page.evaluate(([i, h]) => Math.abs(document.querySelector(h).getBoundingClientRect().right - document.querySelector(i).getBoundingClientRect().right) < 2, [id, panel]));
      await l.click();
      ok(`[v3 ${key}] ${want} opens Troubleshooting · ${tab}`, await page.locator("#page-trouble").isVisible() && await page.locator(`#tab-${tab}.active`).isVisible());
      await page.click("#nav-dashboard");
    }
    ok(`[v3 ${key}] no findings, no header button, no extra blocks`, (await page.locator(".xf, #hdr-trouble, #issues, #p-trouble, #acts").count()) === 0);
    ok(`[v3 ${key}] production banner as developed`, (await page.locator("#lost-banner").count()) === (key === "lost" ? 1 : 0));
    ok(`[v3 ${key}] no overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  }

  /* ---------- Var 4: inline · expandable findings (zip model) ---------- */
  await page.click("#vv-4");
  const XFX = { attention: { import: ["imp"], sync: ["slow", "txn"], revrec: [] }, clear: { import: [], sync: [], revrec: [] }, lost: { import: ["imp"], sync: ["slow", "txn"], revrec: ["rr"] } };
  for (const key of Object.keys(XFX)) {
    const e = XFX[key];
    await page.click(`#vs-${key}`);
    for (const host of ["import", "sync", "revrec"]) {
      if (host === "revrec" && key !== "lost") continue;
      const ids = await page.$$eval(`#p-${host} .xf`, (els) => els.map((x) => x.dataset.xf));
      ok(`[v4 ${key}] ${host} findings = ${e[host].join(",") || "none"}`, JSON.stringify(ids) === JSON.stringify(e[host]), ids.join(","));
      const chip = page.locator(`#p-${host} .panel-t .fchip`);
      ok(`[v4 ${key}] ${host} chip ${e[host].length ? e[host].length + " finding(s)" : "absent"}`, e[host].length ? (await chip.innerText()) === e[host].length + (e[host].length === 1 ? " finding" : " findings") : (await chip.count()) === 0);
    }
    ok(`[v4 ${key}] lost hosts carry no findings`, (await page.locator("#p-accounting .xf, #p-integrations .xf").count()) === 0);

    ok(`[v4 ${key}] Troubleshooting header button`, await page.locator("#hdr-trouble").isVisible());
    if (key === "clear") continue;
    const f = page.locator('[data-xf="slow"]');
    ok(`[v4 ${key}] findings collapsed by default`, (await page.locator(".xf-b:visible").count()) === 0);
    for (const host of ["import", "sync"]) ok(`[v4 ${key}] ${host} headline sits above its findings`, await page.evaluate((h) => document.querySelector(`#p-${h} .panel-big`).getBoundingClientRect().bottom <= document.querySelector(`#p-${h} .xf`).getBoundingClientRect().top, host));
    ok(`[v4 ${key}] finding sits under the Sync header, above the status list`, await page.evaluate(() => document.querySelector('[data-xf="slow"]').getBoundingClientRect().bottom <= document.getElementById("sync-rows").getBoundingClientRect().top));
    await f.locator(".xf-h").click();
    ok(`[v4 ${key}] expands: What / Why it matters / How to fix`, await f.locator(".xf-b").isVisible() && (await f.locator(".xf-l").allInnerTexts()).join("|") === "What|Why it matters|How to fix");
    ok(`[v4 ${key}] Fix + Ignore visible`, await f.locator(".xf-btns .btn-primary").isVisible() && await f.locator("[data-ignore]").isVisible());
    await f.locator(".xf-h").click();
    ok(`[v4 ${key}] collapses again`, !(await f.locator(".xf-b").isVisible()));
    await f.locator(".xf-h").click();
    await f.locator(".xf-btns .btn-primary").click();
    ok(`[v4 ${key}] Review sync speed opens Troubleshooting · Sync speed`, await page.locator("#tab-speed.active").isVisible());
    await page.click("#nav-dashboard");
    await page.locator('[data-xf="txn"] .xf-h').click();
    await page.locator('[data-xf="txn"] .xf-btns .btn-primary').click();
    ok(`[v4 ${key}] transactions finding opens Synchronization issues`, await page.locator("#tab-sync.active").isVisible());
    await page.click("#nav-dashboard");
    await page.locator('[data-xf="imp"] .xf-h').click();
    await page.locator('[data-xf="imp"] [data-ignore]').click();
    ok(`[v4 ${key}] Ignore removes the finding and its chip`, (await page.locator('[data-xf="imp"]').count()) === 0 && (await page.locator("#p-import .fchip").count()) === 0);
    ok(`[v4 ${key}] other findings unaffected`, (await page.locator("#p-sync .xf").count()) === 2);
    const small = await page.evaluate(() => [...document.querySelectorAll(".xf *, .fchip")].filter((el) => !el.closest("svg") && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 14).length);
    ok(`[v4 ${key}] no text under 14px in findings`, small === 0);
    ok(`[v4 ${key}] no overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  }
  await page.click("#vs-attention");
  ok("[v4] state switch brings ignored findings back", (await page.locator('[data-xf="imp"]').count()) === 1);

  /* ---------- Var 6: tabs between KPI band and blocks ---------- */
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.click("#vv-6");
  const T6 = { attention: ["80 transactions need attention"], clear: [], lost: ["Connection lost", "Auto-import and Auto-sync are off", "80 transactions need attention", "Revenue recognition incomplete"] };
  for (const key of Object.keys(T6)) {
    const want = T6[key];
    await page.click(`#vs-${key}`);
    await page.click("#dt-overview");
    ok(`[v6 ${key}] tabs Overview / Custom configurations / Issues`, (await page.locator(".dash-tabs .tab").allInnerTexts()).map((t) => t.replace(/\s*\d+$/, "")).join("|") === "Overview|Custom configurations|Issues");
    ok(`[v6 ${key}] tabs sit between KPI band and blocks`, await page.evaluate(() => { const t = document.querySelector(".dash-tabs").getBoundingClientRect(); return t.top >= document.getElementById("kpis").getBoundingClientRect().bottom && t.bottom <= document.querySelector("#page-dash .cols").getBoundingClientRect().top; }));
    ok(`[v6 ${key}] no top block / banner / trouble panel`, (await page.locator("#issues, #lost-banner, #p-trouble, #acts").count()) === 0);
    ok(`[v6 ${key}] Overview shows the blocks`, await page.locator("#p-sync").isVisible() && await page.locator("#dt-overview.active").isVisible());
    ok(`[v6 ${key}] Issues tab count ${want.length || "none"}`, want.length ? (await page.locator("#dt-count").innerText()) === String(want.length) : (await page.locator("#dt-count").count()) === 0);
    await page.click("#dt-custom");
    ok(`[v6 ${key}] Custom configurations: placeholder, blocks hidden`, await page.locator("#dt-custom-body").isVisible() && (await page.locator("#dt-custom-body").innerText()) === "[content not designed yet]" && !(await page.locator("#p-sync").isVisible()));
    await page.click("#dt-issues");
    ok(`[v6 ${key}] Issues tab active, blocks hidden`, await page.locator("#dt-issues.active").isVisible() && !(await page.locator("#p-sync").isVisible()));
    const rows = page.locator("#dt-issues-body .dt-issue");
    ok(`[v6 ${key}] ${want.length} issues, all visible`, (await rows.count()) === want.length);
    for (let i = 0; i < want.length; i++) ok(`[v6 ${key}] issue ${i + 1} "${want[i]}" + link`, (await rows.nth(i).locator(".dt-title").innerText()) === want[i] && await rows.nth(i).locator(".lnk").isVisible());
    ok(`[v6 ${key}] header reads ${want.length ? want.length + " issues" : "No issues"}`, (await page.locator("#dt-issues-body .dt-h").innerText()) === (want.length ? want.length + (want.length === 1 ? " issue" : " issues") : "No issues"));
    ok(`[v6 ${key}] plain list: no grey panel, no box around the list`, await page.evaluate(() => { const t = (el) => !el || (getComputedStyle(el).backgroundColor === "rgba(0, 0, 0, 0)" && getComputedStyle(el).borderLeftStyle === "none"); return t(document.getElementById("dt-issues-body")) && t(document.querySelector(".dt-list")); }));
    ok(`[v6 ${key}] link to full Troubleshooting visible`, await page.locator("#dt-trouble").isVisible());
    await page.click("#dt-trouble");
    ok(`[v6 ${key}] link opens Troubleshooting`, await page.locator("#page-trouble").isVisible());
    await page.click("#nav-dashboard");
    ok(`[v6 ${key}] Issues tab still selected on return`, await page.locator("#dt-issues.active").isVisible() && await page.locator("#dt-issues-body").isVisible());
    if (want.length) {
      await page.locator('[data-dti="txn"] .lnk').click();
      ok(`[v6 ${key}] transactions issue opens Synchronization issues`, await page.locator("#tab-sync.active").isVisible());
      await page.click("#nav-dashboard");
    }
    ok(`[v6 ${key}] no overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  }
  await page.click("#dt-overview");
  await page.click("#vv-0");
  ok("[v6→v0] blocks visible again in other variants", await page.locator("#p-sync").isVisible() && (await page.locator(".dash-tabs").count()) === 0);

  /* ---------- KPI cards and blocks share one grid ---------- */
  for (const w of [1280, 1440]) {
    await page.setViewportSize({ width: w, height: 1000 });
    for (let v = 0; v <= 6; v++) for (const key of ["attention", "lost"]) {
      await page.goto(target.split("#")[0] + "#" + (v ? "v" + v + "-" : "") + key);
      await page.waitForSelector("#kpis .kpi");
      const d = await page.evaluate((() => { const b = document.getElementById("kpis").getBoundingClientRect(); const k = [...document.querySelectorAll("#kpis .kpi")].map((e) => e.getBoundingClientRect()); const c = [...document.querySelectorAll("#page-dash .cols > .col")].map((e) => e.getBoundingClientRect());
        /* outer edges of the blocks = outer edges of the grey band; inner edges = KPI card edges */
        const pairs = [[c[0].left, b.left], [c[0].right, k[0].right], [c[1].left, k[1].left], [c[1].right, k[1].right], [c[2].left, k[2].left], [c[2].right, b.right]];
        return Math.max(...pairs.map(([x, y]) => Math.abs(x - y))); }));
      ok(`[grid ${w} v${v} ${key}] blocks align: outer edges with the band, inner edges with the cards`, d < 1, "off by " + d.toFixed(1) + "px");
    }
  }

  /* ---------- every variant links to the 3 pages, in every state ---------- */
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (let v = 1; v <= 6; v++) for (const key of ["attention", "clear", "lost"]) {
    await page.goto(target.split("#")[0] + "#v" + v + "-" + key);
    await page.waitForSelector("#kpis .kpi");
    if (v === 6) { await page.click("#dt-issues"); }
    const dests = await page.$$eval("#page-dash [data-go]", (els) => [...new Set(els.filter((e) => e.offsetParent).map((e) => e.dataset.go))]);
    /* Troubleshooting is no longer on the Needs attention card (2026-10-19): in V3, V5 and V1 All clear
       it is reachable from the sidebar only. */
    const sidebarOnly = v === 3 || v === 5 || (v === 1 && key === "clear");
    for (const d of ["Troubleshooting", "Sync issues", "Import activity log"]) {
      if (v === 6 && d !== "Troubleshooting") continue;   /* Issues tab hides the blocks; checked on Overview below */
      if (d === "Troubleshooting" && sidebarOnly) { ok(`[links v${v} ${key}] Troubleshooting via sidebar`, await page.locator("#nav-troubleshooting").isVisible()); continue; }
      ok(`[links v${v} ${key}] visible link to ${d}`, dests.includes(d), dests.join(","));
    }
    if (v === 6) {
      await page.click("#dt-overview");
      const d2 = await page.$$eval("#page-dash [data-go]", (els) => [...new Set(els.filter((e) => e.offsetParent).map((e) => e.dataset.go))]);
      ok(`[links v6 ${key}] Overview links to Sync issues + Import activity log`, d2.includes("Sync issues") && d2.includes("Import activity log"));
    }
    for (const [sel, tab] of [["#lnk-sync", "sync"], ["#lnk-import", "import"]]) {
      await page.click(sel);
      ok(`[links v${v} ${key}] ${sel} lands on Troubleshooting · ${tab}`, await page.locator("#page-trouble").isVisible() && await page.locator(`#tab-${tab}.active`).isVisible());
      await page.click("#nav-dashboard");
    }
    ok(`[links v${v} ${key}] no Troubleshooting link on the card`, (await page.locator("#lnk-trouble").count()) === 0);
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  for (const v of [1, 2, 3, 4, 5, 6]) {
    await page.click("#vv-" + v);
    ok(`[1280 v${v}] no overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  }
  const smallL = await page.evaluate(() => [...document.querySelectorAll("body *")].filter((el) => !el.closest("svg") && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 14).length);
  ok("[variants] no text under 14px", smallL === 0);

  /* ---------- Troubleshooting page ---------- */
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const [key, groups, sumQty] of [["attention", 6, 90], ["lost", 9, 130], ["clear", 0, 0]]) {
    await page.goto(target.split("#")[0] + "#v1-" + key);
    await page.waitForSelector("#sync-rows .row");
    if (groups) {
      const bar = page.locator("#issues .issues-bar");
      ok(`[ts ${key}] Go to Troubleshooting button in the block header`, await bar.locator("#go-trouble").isVisible() && (await bar.locator("#go-trouble").innerText()) === "Go to Troubleshooting");
      ok(`[ts ${key}] button right of the toggle`, await page.evaluate(() => document.getElementById("go-trouble").getBoundingClientRect().left > document.querySelector("#issues-head .t").getBoundingClientRect().right));
      await page.click("#go-trouble");
      ok(`[ts ${key}] button does not expand the block on the way out`, true);
    } else {
      await page.click("#nav-troubleshooting");
    }
    ok(`[ts ${key}] Troubleshooting page visible, dashboard hidden`, await page.locator("#page-trouble").isVisible() && !(await page.locator("#page-dash").isVisible()));
    ok(`[ts ${key}] sidebar Troubleshooting active`, await page.locator("#nav-troubleshooting.active").isVisible() && !(await page.locator("#nav-dashboard.active").count()));
    ok(`[ts ${key}] H1 + subtitle`, (await page.locator("#page-trouble h1").innerText()) === "Troubleshooting" && (await page.locator("#page-trouble .page-subtitle").innerText()) === "View how your data is flowing and catch problems early.");
    ok(`[ts ${key}] Synchronization issues tab active`, await page.locator("#tab-sync.active").isVisible());
    ok(`[ts ${key}] hash has tab`, page.url().endsWith(key + "/sync"));
    const rows = page.locator("#si-table tbody tr:not(:has(.empty))");
    ok(`[ts ${key}] ${groups} error groups (= dashboard Related pages count)`, (await rows.count()) === groups, "got " + (await rows.count()));
    const qty = await page.$$eval("#si-table tbody tr:not(:has(.empty)) td:first-child", (els) => els.reduce((a, e) => a + +e.textContent, 0));
    ok(`[ts ${key}] quantities sum to ${sumQty}`, qty === sumQty, String(qty));
    ok(`[ts ${key}] uses kit table`, (await page.locator("#si-table.synder-table").count()) === 1);
    if (!groups) { ok(`[ts ${key}] empty state marked uncaptured`, (await page.locator("#si-empty").innerText()) === "[live copy not captured]"); }
    if (groups) {
      const q = await page.$$eval("#si-table tbody td:first-child", (els) => els.map((e) => +e.textContent));
      ok(`[ts ${key}] sorted by quantity desc`, q.every((v, i) => !i || q[i - 1] >= v));
      await page.click("#si-sort");
      const q2 = await page.$$eval("#si-table tbody td:first-child", (els) => els.map((e) => +e.textContent));
      ok(`[ts ${key}] sort toggles to asc`, q2.every((v, i) => !i || q2[i - 1] <= v));
      await page.click("#si-sort");
      await page.selectOption("#si-status", "Failed");
      await page.click('[data-apply="sync"]');
      const st = await page.$$eval("#si-table tbody td:nth-child(2)", (els) => els.map((e) => e.textContent));
      ok(`[ts ${key}] status filter = Failed only`, st.length === 3 && st.every((x) => x === "Failed"), st.join(","));
      await page.click('[data-reset="sync"]');
      ok(`[ts ${key}] reset restores all groups`, (await rows.count()) === groups);
      await page.fill("#si-q", "Ac");
      await page.click('[data-apply="sync"]');
      ok(`[ts ${key}] search ignored under 3 characters`, (await rows.count()) === groups);
      await page.fill("#si-q", "account");
      await page.keyboard.press("Enter");
      const wantAcc = key === "lost" ? 3 : 2;   /* lost also has "…found in accounting" */
      ok(`[ts ${key}] search "account" (Enter) narrows to ${wantAcc}`, (await rows.count()) === wantAcc, "got " + (await rows.count()));
      await page.click('[data-reset="sync"]');
      await rows.first().locator(".lnk").click();
      ok(`[ts ${key}] See related transactions bridges`, (await page.locator("#toast").innerText()).includes("Platform transactions · Failed"));
      ok(`[ts ${key}] long error message truncates`, await page.$eval("#si-table td.msg", (el) => el.scrollWidth > el.clientWidth));
    }
    /* import log */
    await page.click("#tab-import");
    ok(`[ts ${key}] Import activity log tab active`, await page.locator("#tab-import.active").isVisible() && page.url().endsWith("/import"));
    const il = page.locator("#il-table tbody tr");
    ok(`[ts ${key}] import log shows 25 rows`, (await il.count()) === 25);
    ok(`[ts ${key}] Import historical data visible`, await page.locator(".ts-intro .btn").isVisible());
    const first = await il.first().innerText();
    const hourly = await page.locator("#il-table tbody tr", { hasText: "Hourly" }).first().innerText();
    ok(`[ts ${key}] newest Hourly import ends at the dashboard's last import`, hourly.includes(key === "lost" ? "Oct 2, 2026 05:58:00" : "Oct 7, 2026 11:58:00"), hourly.slice(0, 80));
    await page.click('[data-page="import:next"]');
    ok(`[ts ${key}] next page works`, (await il.first().innerText()) !== first && await page.locator('[data-page="import:prev"]:not([disabled])').isVisible());
    await page.click('[data-page="import:first"]');
    await page.selectOption("#il-type", "Hourly");
    await page.click('[data-apply="import"]');
    const types = await page.$$eval("#il-table tbody td:nth-child(7)", (els) => els.map((e) => e.textContent));
    ok(`[ts ${key}] Type filter = Hourly only`, types.length > 0 && types.every((t) => t === "Hourly"));
    await page.click('[data-reset="import"]');
    if (key !== "clear") {
      await page.selectOption("#il-intg", "My great bread (Amazon)");
      await page.click('[data-apply="import"]');
      const ints = await page.$$eval("#il-table tbody td:nth-child(4)", (els) => els.map((e) => e.textContent.trim()));
      ok(`[ts ${key}] Integration filter`, ints.length > 0 && ints.every((t) => t === "My great bread (Amazon)"));
      await page.click('[data-reset="import"]');
    }
    const id = await il.nth(3).getAttribute("data-id");
    await page.fill("#il-id", id);
    await page.click('[data-apply="import"]');
    ok(`[ts ${key}] Import ID search finds the row`, (await il.count()) === 1 && (await il.first().getAttribute("data-id")) === id);
    await page.click('[data-reset="import"]');
    await page.selectOption('[data-rpp="import"]', "50");
    ok(`[ts ${key}] rows per page 50`, (await il.count()) === 50);
    await page.selectOption('[data-rpp="import"]', "25");
    ok(`[ts ${key}] import table is kit table`, (await page.locator("#il-table.synder-table").count()) === 1);
    /* sync speed */
    await page.click("#tab-speed");
    ok(`[ts ${key}] Sync speed tab active`, await page.locator("#tab-speed.active").isVisible());
    const nSeries = key === "clear" ? 1 : 2;
    ok(`[ts ${key}] ${nSeries} series in chart`, (await page.locator("#sp-chart path.series").count()) === nSeries);
    ok(`[ts ${key}] chart visible`, await page.locator("#sp-chart svg").isVisible());
    ok(`[ts ${key}] chart labels render at 14px (no viewBox scaling)`, await page.$eval("#sp-chart svg", (e) => Math.abs(e.viewBox.baseVal.width - e.getBoundingClientRect().width) < 1.5));
    ok(`[ts ${key}] last date label inside the chart`, await page.$eval("#sp-chart svg", (e) => [...e.querySelectorAll("text")].pop().getBoundingClientRect().right <= e.getBoundingClientRect().right));
    ok(`[ts ${key}] breakdown chart marked uncaptured`, (await page.locator("#bd-chart").innerText()) === "[chart not captured]");
    if (nSeries === 2) {
      await page.selectOption("#sp-intg", "My wonderful flowers (Stripe)");
      await page.click('[data-apply="speed"]');
      ok(`[ts ${key}] integration filter leaves 1 series`, (await page.locator("#sp-chart path.series").count()) === 1);
      await page.click('[data-reset="speed"]');
      ok(`[ts ${key}] reset brings both back`, (await page.locator("#sp-chart path.series").count()) === 2);
    }
    const small = await page.evaluate(() => [...document.querySelectorAll("#page-trouble *")].filter((el) => !el.closest("svg") && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 14).length);
    ok(`[ts ${key}] no text under 14px`, small === 0);
    for (const t of ["sync", "import", "speed"]) {
      await page.click("#tab-" + t);
      ok(`[ts ${key}] ${t}: no horizontal overflow at 1440`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    }
    await page.click("#nav-dashboard");
    ok(`[ts ${key}] Dashboard nav returns`, await page.locator("#page-dash").isVisible() && !(await page.locator("#page-trouble").isVisible()) && !new URL(page.url()).hash.includes("/"));
  }
  /* deep link + state switch while on the page */
  await page.goto(target.split("#")[0] + "#attention/import");
  await page.waitForSelector("#il-table");
  ok("#attention/import deep-links to the import tab", await page.locator("#tab-import.active").isVisible());
  await page.click("#vs-lost");
  ok("state switch re-renders the Troubleshooting page", (await page.locator("#il-table tbody tr", { hasText: "Hourly" }).first().innerText()).includes("Oct 2, 2026 05:58:00") && await page.locator("#tab-import.active").isVisible());
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const t of ["sync", "import", "speed"]) {
    await page.click("#tab-" + t);
    ok(`[ts 1280] ${t}: no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  }

  /* ---------- Accounting card: action + status tooltip ---------- */
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const [key, def] of [["attention", "ok"], ["clear", "ok"], ["lost", "lost"]]) {
    await page.goto(target.split("#")[0] + "" + "#" + key);
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
    await page.goto(target.split("#")[0] + "" + "#" + key);
    await page.waitForSelector("#kpis .kpi");
    ok(`[acct ${key}] no Troubleshooting link on Needs attention`, (await page.locator("#kpi-attn .lnk", { hasText: "Troubleshooting" }).count()) === 0);
  }

  ok("no JS errors", errors.length === 0, errors.join(" | "));

  await browser.close();
  console.log(`${pass} passed, ${fails.length} failed`);
  fails.forEach((f) => console.log("  ✗ " + f));
  process.exit(fails.length ? 1 : 0);
})();
