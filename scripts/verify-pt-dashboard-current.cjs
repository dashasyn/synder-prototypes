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
  lost:      { sync: 18, imports: 10, integrations: 6, score: "70%", attn: "80 transactions", banner: true,  revrec: true,  hot: 2 },
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
  ok("H1 is visible with live copy", (await page.locator("h1").innerText()) === "Hi Dalia, your data is ready to review");
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
      (await page.locator("#kpi-score .lnk").count()) === (e.score === "100%" ? 0 : 1) &&
      (await page.locator("#kpi-time .lnk").count()) === (e.score === "100%" ? 0 : 1));

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
  const scrolls = await page.$eval("#import-rows", (el) => el.scrollHeight > el.clientHeight);
  ok("[lost] import list scrolls inside its card", scrolls);
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
  await page.click("h1");
  ok("outside click closes row menu", !(await page.locator("#p-integrations .dropdown-menu").first().isVisible()));
  await menuBtn.click();
  await page.locator("#p-integrations [data-menu]").nth(1).click();
  ok("opening a second menu closes the first", (await page.locator(".dropdown-menu.show").count()) === 1 && await page.locator("#p-integrations .dropdown-menu").nth(1).isVisible());
  await page.keyboard.press("Escape");

  /* tooltip */
  await page.hover("#kpi-time .help");
  await page.waitForTimeout(250);
  const tip = page.locator("#kpi-time .help .tooltip");
  ok("help tooltip shows on hover", parseFloat(await tip.evaluate((el) => getComputedStyle(el).opacity)) > 0.9 && await tip.isVisible());
  ok("tooltip marks uncaptured copy", (await tip.innerText()) === "[live copy not captured]");

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
    attention: { issues: 5, lost: 2, rows: ["Accounting connection lost", "2 integrations lost connection", "Failed", "Rollback failed", "Synced with rule failed"] },
    clear:     { issues: 0 },
    lost:      { issues: 8, lost: 6, rows: ["Accounting connection lost", "6 integrations lost connection", "Auto-import and Auto-sync off", "Failed", "Rollback failed", "Synced with rule failed", "Not parsed", "Incomplete"] },
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
    ok(`[v1 ${key}] head reads "${e.issues} issues found"`, (await head.innerText()).includes(`${e.issues} issues found`));
    ok(`[v1 ${key}] collapsed by default`, !(await page.locator("#issues-body").isVisible()) && (await head.getAttribute("aria-expanded")) === "false");
    ok(`[v1 ${key}] head sits above the KPI band`, await page.evaluate(() => document.getElementById("issues").getBoundingClientRect().bottom <= document.getElementById("kpis").getBoundingClientRect().top));
    await head.click();
    ok(`[v1 ${key}] expands on click`, await page.locator("#issues-body").isVisible());
    ok(`[v1 ${key}] toggle reads Hide`, (await head.locator(".tog").innerText()) === "Hide");
    const rows = page.locator("#issues-body > .issue");
    ok(`[v1 ${key}] ${e.issues} issue rows`, (await rows.count()) === e.issues, "got " + (await rows.count()));
    for (let i = 0; i < e.rows.length; i++) {
      const t = (await rows.nth(i).locator(".issue-h").first().innerText()).replace(/\s+/g, " ");
      ok(`[v1 ${key}] row ${i + 1} is "${e.rows[i]}"`, t.includes(e.rows[i]), t);
      ok(`[v1 ${key}] row ${i + 1} visible`, await rows.nth(i).isVisible());
    }
    /* every non-group row has exactly one visible bridge */
    const bridges = await page.$$eval("#issues-body > .issue", (els) => els.filter((el) => !el.querySelector("[data-grp]")).map((el) => el.querySelectorAll(":scope > .issue-h .lnk").length));
    ok(`[v1 ${key}] each plain row has one bridge`, bridges.every((n) => n === 1), bridges.join(","));
    /* grouped integrations: collapsed until opened */
    const grp = page.locator('[data-issue="lost"] [data-grp]');
    const sub = page.locator('[data-issue="lost"] .issue-sub');
    ok(`[v1 ${key}] integration group collapsed`, !(await sub.isVisible()));
    await grp.click();
    ok(`[v1 ${key}] integration group opens`, await sub.isVisible());
    ok(`[v1 ${key}] ${e.lost} integrations listed`, (await sub.locator(".issue-h").count()) === e.lost);
    ok(`[v1 ${key}] last integration Reconnect visible`, await sub.locator(".lnk").last().isVisible());
    await sub.locator(".lnk").first().click();
    ok(`[v1 ${key}] integration Reconnect bridges`, (await page.locator("#toast").innerText()).includes("Reconnect · My wonderful flowers (Stripe)"));
    ok(`[v1 ${key}] block stays open after a bridge click`, await sub.isVisible() && await page.locator("#issues-body").isVisible());
    await rows.filter({ hasText: "Failed" }).first().locator(".lnk").click();
    ok(`[v1 ${key}] Failed row bridges to Platform transactions`, (await page.locator("#toast").innerText()).includes("Platform transactions · Status: Failed"));
    const small = await page.evaluate(() => [...document.querySelectorAll("#issues *")].filter((el) => !el.closest("svg") && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 14).length);
    ok(`[v1 ${key}] no text under 14px in the block`, small === 0);
    ok(`[v1 ${key}] no horizontal overflow expanded`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await grp.click();
    ok(`[v1 ${key}] integration group closes`, !(await sub.isVisible()));
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

  ok("no JS errors", errors.length === 0, errors.join(" | "));

  await browser.close();
  console.log(`${pass} passed, ${fails.length} failed`);
  fails.forEach((f) => console.log("  ✗ " + f));
  process.exit(fails.length ? 1 : 0);
})();
