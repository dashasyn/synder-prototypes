/* Verify the admin sidebar pins + org switcher prototype in real Chromium.
   Usage: node scripts/verify-admin-pins.cjs [url]
   Asserts liveness with isVisible()/clicks, never element state alone. */
const { chromium } = require("playwright");
const path = require("path");

const target = process.argv[2] || "file://" + path.resolve(__dirname, "../projects/admin-pins/index.html");

let pass = 0;
const fails = [];
async function vis(loc){ try { await loc.first().waitFor({ state: "visible", timeout: 3000 }); return true; } catch (e) { return false; } }
function ok(name, cond, extra) { if (cond) pass++; else fails.push(name + (extra ? ` — ${extra}` : "")); }

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(target);
  await page.evaluate(() => localStorage.clear());
  await page.goto(target.split("#")[0] + "#admin");
  await page.reload();
  await page.waitForSelector(".af-grid");

  const pins = () => page.locator("#sb-pins .sb-pin");

  // --- defaults
  ok("no intro / no variant switcher", (await page.locator(".variant-switch").count()) === 0);
  ok("first element is the app", await page.evaluate(() => document.body.firstElementChild.classList.contains("app")));
  ok("Administrative functions H1 visible", await page.getByRole("heading", { name: "Administrative functions" }).isVisible());
  ok("27 catalog links", (await page.locator(".af-row a").count()) === 27);
  ok("27 pin buttons, all visible", (await page.locator(".af-row .pin").count()) === 27 && await page.locator(".af-row .pin").last().isVisible());
  ok("new admin: exactly 1 pin", (await pins().count()) === 1);
  ok("default pin is Organizations", (await pins().first().innerText()).includes("Organizations"));
  ok("pin row sits right after Administrative functions", await page.evaluate(() => {
    const a = document.getElementById("sb-admin"); return a.nextElementSibling && a.nextElementSibling.id === "sb-pins";
  }));
  ok("Organizations pin button pressed on Admin page", (await page.locator('.pin[data-key="organizations"]').getAttribute("aria-pressed")) === "true");

  // --- pin from Admin page
  await page.click('.pin[data-key="health-hub"]');
  ok("Health Hub appears in sidebar", await page.locator('#sb-pins [data-pin="health-hub"]').isVisible());
  ok("order = order added", (await pins().nth(1).getAttribute("data-pin")) === "health-hub");
  ok("focus stays on the pin button", await page.evaluate(() => document.activeElement.dataset.key === "health-hub"));
  await page.click('#sb-pins [data-pin="health-hub"] a');
  ok("pinned link opens its page", await vis(page.getByRole("heading", { name: "Health Hub" })));
  ok("pinned row is active", await vis(page.locator('#sb-pins [data-pin="health-hub"].on')));
  ok("uncaptured page carries marker", await vis(page.getByText("[live page not captured]")));

  // --- unpin from sidebar on hover
  await page.hover('#sb-pins [data-pin="health-hub"]');
  ok("unpin visible on hover", await page.locator('#sb-pins [data-pin="health-hub"] .unpin').isVisible());
  await page.click('#sb-pins [data-pin="health-hub"] .unpin');
  ok("unpinned from sidebar", (await page.locator('#sb-pins [data-pin="health-hub"]').count()) === 0);
  await page.hover("#content");
  ok("unpin hidden without hover/focus", !(await page.locator('#sb-pins [data-pin="organizations"] .unpin').isVisible()) || await page.evaluate(() => document.activeElement.classList.contains("unpin")));

  // --- unpin from Admin page
  await page.click("#sb-admin");
  await page.click('.pin[data-key="organizations"]');
  ok("unpin via Admin page icon", (await pins().count()) === 0);
  await page.click('.pin[data-key="organizations"]');

  // --- cap at 10
  const keys = ["users", "syncs-history", "health-hub", "org-health", "jobs", "payout-trace", "firms", "js-scripts", "sync-credits"];
  for (const k of keys) await page.click(`.pin[data-key="${k}"]`);
  ok("10 pins", (await pins().count()) === 10);
  ok("cap error visible", await page.locator("#pin-cap").isVisible());
  ok("cap error copy", (await page.locator("#pin-cap").innerText()).includes("Unpin a page to add another"));
  ok("unpinned icons disabled at cap", (await page.locator('.pin[data-key="clients"]').getAttribute("aria-disabled")) === "true");
  await page.click('.pin[data-key="clients"]', { force: true });
  ok("11th pin refused", (await pins().count()) === 10);
  ok("pinned icons still enabled at cap", (await page.locator('.pin[data-key="users"]').getAttribute("aria-disabled")) === null);
  ok("all 10 pins reachable (scroll sidebar)", await (async () => {
    const last = pins().last(); await last.scrollIntoViewIfNeeded(); return last.isVisible();
  })());
  await page.click('.pin[data-key="users"]');
  ok("cap error gone after unpin", (await page.locator("#pin-cap").count()) === 0);
  ok("disabled icons re-enabled", (await page.locator('.pin[data-key="clients"]').getAttribute("aria-disabled")) === null);

  // --- persistence
  await page.reload(); await page.waitForSelector(".af-grid");
  ok("pins persist after reload", (await pins().count()) === 9);

  // --- org switcher: own orgs, search all, Enter
  await page.click("#org-btn");
  ok("switcher opens", await page.locator("#sw").isVisible());
  ok("search field focused", await page.evaluate(() => document.activeElement.id === "sw-q"));
  ok("empty query shows own orgs", (await page.locator("#sw-list .sw-opt").count()) === 10);
  await page.fill("#sw-q", "xero rec");
  ok("search hits customer org", await page.locator("#opt-c4").isVisible());
  await page.keyboard.press("Enter");
  ok("switcher closes", !(await page.locator("#sw").isVisible()));
  ok("org header updated", (await page.locator("#org-nm").innerText()) === "Xero Reconciliation (After)");
  ok("lands on Dashboard", await vis(page.getByRole("heading", { name: "Dashboard" })));
  ok("pins visible inside customer org", await pins().first().isVisible());

  await page.click("#org-btn");
  await page.fill("#sw-q", "zzzz");
  ok("no results message", await page.locator("#sw-empty").isVisible());
  await page.keyboard.press("Escape");
  ok("Escape closes, focus back on switcher", !(await page.locator("#sw").isVisible()) && await page.evaluate(() => document.activeElement.id === "org-btn"));
  await page.click("#org-btn");
  await page.fill("#sw-q", "a");
  await page.keyboard.press("ArrowDown");
  const second = await page.locator("#sw-list .sw-opt.hl").getAttribute("data-id");
  await page.keyboard.press("Enter");
  ok("ArrowDown + Enter picks highlighted", (await page.locator("#org-nm").innerText()) === (await page.evaluate((id) => ORGS.find(o => o.id === id).name, second)));
  await page.click("#org-btn");
  await page.click("#content");
  ok("outside click closes switcher", !(await page.locator("#sw").isVisible()));

  // --- Organizations list: row Select + old path
  await page.click('#sb-pins [data-pin="organizations"] a');
  ok("Organizations list visible", await vis(page.locator(".orgs table.synder-table")));
  ok("kit table used", (await page.locator("table.synder-table").count()) === 1);
  ok("row Select visible", await page.locator('tr[data-id="c1"] .row-select').isVisible());
  ok("row Select inside the 1280 viewport (sticky column)", await page.evaluate(() => document.querySelector('tr[data-id="c1"] .row-select').getBoundingClientRect().right <= 1280));
  ok("no page-level horizontal scroll", await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.fill("#f-name", "tea");
  await page.click(".flt .btn");
  ok("Apply filters by name", (await page.locator(".orgs tbody tr").count()) === 1);
  await page.click('tr[data-id="c12"] .row-select');
  ok("row Select switches org", (await page.locator("#org-nm").innerText()) === "Tea Leaf Collective");
  await page.click('#sb-pins [data-pin="organizations"] a');
  await page.fill("#f-name", ""); await page.click(".flt .btn");
  await page.click('tr[data-id="c9"] a');
  ok("org page opens", await vis(page.locator("#btn-select-org")));
  ok("Organizations pin active on org page", await page.locator('#sb-pins [data-pin="organizations"].on').isVisible());
  await page.click("#btn-select-org");
  ok("Select Organization button still works", (await page.locator("#org-nm").innerText()) === "Northwind SaaS Ltd");

  // --- promo dismiss
  await page.click("#promo .x");
  ok("promo dismisses", (await page.locator("#promo").count()) === 0);

  // --- typography: nothing under 14px
  const small = await page.evaluate(() => {
    location.hash = "admin";
    return [...document.querySelectorAll("body *")].filter(el => el.childNodes.length && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))
      .filter(el => parseFloat(getComputedStyle(el).fontSize) < 14).map(el => el.tagName + "." + el.className + ":" + el.textContent.trim().slice(0, 20));
  });
  ok("no text under 14px", small.length === 0, small.slice(0, 5).join(" | "));
  ok("no page errors", errors.length === 0, errors.join(" | "));

  await browser.close();
  console.log(`${pass} passed, ${fails.length} failed`);
  fails.forEach((f) => console.log("FAIL: " + f));
  process.exit(fails.length ? 1 : 0);
})();
