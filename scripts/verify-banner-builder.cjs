/* Verify the banner-builder proto in real Chromium.
   Usage: node scripts/verify-banner-builder.cjs [url]
   Asserts liveness with isVisible(), never element state alone. */
const { chromium } = require("playwright");
const path = require("path");

const target = process.argv[2] || "file://" + path.resolve(__dirname, "../projects/banner-builder/index.html");

let pass = 0;
const fails = [];
function ok(name, cond, extra) {
  if (cond) { pass++; } else { fails.push(name + (extra ? ` — ${extra}` : "")); }
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  await page.goto(target);
  await page.waitForSelector("#rows tr");

  /* ---------- list ---------- */
  const rows = page.locator("#rows tr");
  ok("list renders 5 seeded banners", (await rows.count()) === 5, "got " + (await rows.count()));
  ok("table is visible", await page.locator("table.bb").isVisible());
  ok("New banner button is visible", await page.locator("#newBtn").isVisible());

  /* scope the row match to the banner-text cell — a conflict warning quotes
     the *other* banner's name, so a whole-row hasText matches both rows */
  const rowText = async (needle) => {
    const r = page.locator("#rows tr", { has: page.locator(".banner-text", { hasText: needle }) });
    ok(`row "${needle}" is visible`, await r.first().isVisible());
    ok(`row "${needle}" matched exactly one row`, (await r.count()) === 1, "matched " + (await r.count()));
    return (await r.first().innerText()).replace(/\s+/g, " ");
  };

  const summer = await rowText("Summer sale");
  ok("Summer sale is Live (1–10 Sep spans today)", summer.startsWith("Live"), summer.slice(0, 40));
  const sage = await rowText("Sage Intacct");
  ok("Sage Intacct is Scheduled", sage.startsWith("Scheduled"), sage.slice(0, 40));
  const bf = await rowText("Black Friday");
  ok("Black Friday is Scheduled", bf.startsWith("Scheduled"), bf.slice(0, 40));
  const webinar = await rowText("Webinar");
  ok("past webinar is Ended", webinar.startsWith("Ended"), webinar.slice(0, 40));

  /* audience + timezone are actually rendered, not implied */
  ok("Holiday banner shows Everyone", (await rowText("Holiday support")).includes("Everyone"));
  ok("Webinar shows Accountants only", webinar.includes("Accountants"));
  ok("Black Friday carries its own timezone", bf.includes("America/New_York"));

  /* ---------- conflict detection on the list ---------- */
  const conflicts = page.locator("#rows .conflict");
  ok("exactly two conflict notes (the one overlapping pair)", (await conflicts.count()) === 2, "got " + (await conflicts.count()));
  ok("conflict note is visible", await conflicts.first().isVisible());
  ok("Summer sale row says the other banner wins (later start)", summer.includes("That one shows"), summer);
  ok("Sage row says this one wins", sage.includes("This one shows"), sage);
  ok("conflict names the shared audience", summer.includes("trial + monthly"), summer);
  ok("conflict names the other banner usefully, not just its first word",
    summer.includes("New: Sage Intacct is now"), summer);
  ok("ended banner gets no conflict note", !webinar.includes("Overlaps"));

  /* the kit's icon font is not loaded on this page, so icon-ligature spans
     would render as the literal word ("error", "warning") */
  ok("no material-icons ligatures anywhere", (await page.locator(".material-icons").count()) === 0);

  await page.screenshot({ path: "reports/banner-builder-list.png", fullPage: true });

  /* ---------- open the builder ---------- */
  await page.click("#newBtn");
  const overlay = page.locator("#builder");
  ok("builder overlay is visible", await overlay.isVisible());
  ok("body textarea is visible", await page.locator("#body").isVisible());
  ok("body textarea has focus", await page.evaluate(() => document.activeElement.id) === "body");
  ok("preview frame is visible", await page.locator(".pv-frame").isVisible());
  ok("colour swatches all visible", (await page.locator(".swatch-opt span").count()) === 4);
  for (const c of ["Blue", "Green", "Yellow", "Purple"]) {
    ok(`swatch ${c} is visible`, await page.locator(".swatch-opt span", { hasText: c }).isVisible());
  }
  ok("blue preselected", await page.locator('input[name="color"][value="blue"]').isChecked());
  ok("all four audiences visible", (await page.locator('input[name="aud"]').count()) === 4);
  ok("audience defaults to everyone", (await page.locator("#audSummary").innerText()).includes("Everyone"));

  /* ---------- submit-time validation ---------- */
  await page.click("#saveBtn");
  ok("empty save shows the form alert", await page.locator("#formAlert").isVisible());
  ok("body field marked with an error", await page.locator("#f-body.has-error").isVisible());
  ok("body error message is visible", await page.locator("#e-body").isVisible());
  ok("overlay still usable after a failed save", await overlay.isVisible());
  ok("save button still clickable after failing", await page.locator("#saveBtn").isVisible());
  ok("nothing was added on a failed save", (await rows.count()) === 5);

  /* button text without a link */
  await page.fill("#body", "Black Friday: 50% off all annual plans.");
  await page.fill("#btnText", "Claim it");
  await page.click("#saveBtn");
  ok("button text without a link is rejected", await page.locator("#f-btnLink.has-error").isVisible());
  ok("link error names the fix", (await page.locator("#e-btnLink").innerText()).includes("clear the button text"));

  /* bad url shape */
  await page.fill("#btnLink", "synder.com/pricing");
  await page.click("#saveBtn");
  ok("bare domain rejected", await page.locator("#f-btnLink.has-error").isVisible());
  await page.fill("#btnLink", "https://synder.com/pricing");

  /* link without button text */
  await page.fill("#btnText", "");
  await page.click("#saveBtn");
  ok("link without button text is rejected", await page.locator("#f-btnText.has-error").isVisible());
  await page.fill("#btnText", "Claim it");

  /* no audience */
  for (const el of await page.locator('input[name="aud"]').all()) await el.uncheck();
  ok("empty audience is called out in the summary", (await page.locator("#audSummary").innerText()).includes("show to nobody"));
  await page.click("#saveBtn");
  ok("empty audience blocks save", await page.locator("#f-aud.has-error").isVisible());
  await page.locator('input[name="aud"][value="trial"]').check();
  await page.locator('input[name="aud"][value="monthly"]').check();

  /* end before start */
  await page.fill("#startDate", "2026-11-27");
  await page.fill("#startTime", "09:00");
  await page.fill("#endDate", "2026-11-25");
  await page.click("#saveBtn");
  ok("end before start is rejected", await page.locator("#f-end.has-error").isVisible());
  await page.fill("#endDate", "2026-11-30");
  await page.fill("#endTime", "23:59");

  /* ---------- live preview truthfulness ---------- */
  await page.locator('input[name="color"][value="purple"]').check();
  const pvBg = await page.locator("#pvBanner").evaluate((el) => getComputedStyle(el).backgroundColor);
  ok("preview background follows the purple preset", pvBg === "rgb(226, 215, 255)", pvBg);
  ok("preview text mirrors the body field", (await page.locator("#pvText").innerText()).includes("50% off all annual plans"));
  ok("preview button is visible when button text is set", await page.locator("#pvBtn").isVisible());
  const pvBtnBg = await page.locator("#pvBtn").evaluate((el) => getComputedStyle(el).backgroundColor);
  ok("preview button uses the preset accent", pvBtnBg === "rgb(49, 11, 176)", pvBtnBg);
  ok("no wrap warning for a short line", (await page.locator("#wrapWarn").innerText()).trim() === "");
  {
    const note = await page.locator("#schedNote").innerText();
    ok("schedule note states the run length in days and hours", note.includes("3 days, 15 hours"), note);
  }
  ok("status preview says Scheduled", (await page.locator("#pvStatus").innerText()).includes("Scheduled"));

  /* long body -> real measured wrap warning + cap error */
  const long = "Black Friday is finally here and every single annual plan across Sync, RevRec and Insights is half price until the end of the month, so upgrade now.";
  await page.fill("#body", long);
  ok("counter turns red past the cap", await page.locator("#bodyCount.over").isVisible());
  const warn = (await page.locator("#wrapWarn").innerText()).trim();
  ok("long text reports a real measured wrap", /Wraps to \d lines/.test(warn), warn);
  await page.click("#saveBtn");
  ok("over-cap body blocks save", await page.locator("#f-body.has-error").isVisible());

  /* the error must not outlive the value that caused it */
  await page.fill("#body", "Black Friday: 50% off all annual plans.");
  ok("field error clears once the field is corrected", (await page.locator("#f-body.has-error").count()) === 0);
  ok("stale error message is gone", (await page.locator("#e-body").innerText()).trim() === "");
  ok("top alert hides when the last error clears", !(await page.locator("#formAlert").isVisible()));

  /* button removed -> preview button goes away */
  const keepBtn = "Claim it";
  await page.fill("#btnText", "");
  await page.fill("#btnLink", "");
  ok("preview button disappears for an informational banner", !(await page.locator("#pvBtn").isVisible()));
  await page.fill("#btnText", keepBtn);
  await page.fill("#btnLink", "https://synder.com/pricing");

  /* ---------- conflict warning inside the builder ---------- */
  ok("builder warns about the existing Black Friday overlap", await page.locator("#conflictNote").isVisible());
  const cnote = (await page.locator("#conflictNote").innerText()).replace(/\s+/g, " ");
  ok("builder conflict explains the tie-break", cnote.includes("later start wins"), cnote);

  await page.locator("#conflictNote").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "reports/banner-builder-builder.png", fullPage: false });
  ok("conflict note still visible after scrolling to it", await page.locator("#conflictNote").isVisible());

  /* ---------- successful save ---------- */
  await page.fill("#startDate", "2026-10-05");
  await page.fill("#endDate", "2026-10-12");
  await page.click("#saveBtn");
  ok("overlay closes on a successful save", !(await overlay.isVisible()));
  ok("success alert is visible on the list", await page.locator("#saveAlert").isVisible());
  ok("the new banner is in the list", (await rows.count()) === 6, "got " + (await rows.count()));
  const added = page.locator("#rows tr", { hasText: "50% off all annual plans" });
  ok("added banner row is visible", await added.first().isVisible());
  ok("focus returns to the New banner button", await page.evaluate(() => document.activeElement.id) === "newBtn");

  /* ---------- row menu ---------- */
  const menuBtn = page.locator("#rows .row-menu-btn").first();
  await menuBtn.click();
  ok("row menu is visible after one click", await page.locator(".row-menu").isVisible());
  ok("menu reports expanded", await menuBtn.getAttribute("aria-expanded") === "true");
  ok("Edit item is visible", await page.locator('.row-menu [data-act="edit"]').isVisible());
  await page.locator('.row-menu [data-act="edit"]').click();
  ok("Edit opens the builder", await overlay.isVisible());
  ok("Edit prefills the body", (await page.locator("#body").inputValue()).length > 0);
  ok("Edit retitles the overlay", (await page.locator("#bTitle").innerText()) === "Edit banner");
  ok("Edit relabels the primary action", (await page.locator("#saveBtn").innerText()) === "Save changes");
  await page.keyboard.press("Escape");
  ok("Escape closes the builder", !(await overlay.isVisible()));
  ok("Escape did not add a banner", (await rows.count()) === 6);

  /* duplicate + delete */
  await page.locator("#rows .row-menu-btn").first().click();
  await page.locator('.row-menu [data-act="dup"]').click();
  ok("Duplicate opens a New banner overlay", (await page.locator("#bTitle").innerText()) === "New banner");
  ok("Duplicate carries the source body", (await page.locator("#body").inputValue()).length > 0);
  await page.click("#cancelBtn");
  await page.locator("#rows .row-menu-btn").first().click();
  await page.locator('.row-menu [data-act="del"]').click();
  ok("Delete removes one row", (await rows.count()) === 5, "got " + (await rows.count()));
  ok("list still visible after delete", await page.locator("table.bb").isVisible());

  /* ---------- discussion content is on the page ---------- */
  ok("system-banner precedence is stated on the page", (await page.locator(".list-rule").innerText()).includes("System banners"));
  ok("open questions section is visible", await page.locator(".q-list").isVisible());
  ok("six open questions listed", (await page.locator(".q-list li").count()) === 6);

  /* ---------- no raw hex in the markup ---------- */
  const html = await page.content();
  const hexes = [...html.matchAll(/#[0-9A-Fa-f]{6}\b/g)].map((m) => m[0]);
  ok("no raw hex in rendered markup outside the JS colour table", hexes.length === 0, hexes.join(","));

  await page.screenshot({ path: "reports/banner-builder-list-after.png", fullPage: true });

  ok("no page errors", errors.length === 0, errors.join(" | "));

  await browser.close();
  console.log(`\n${pass} passed, ${fails.length} failed`);
  if (fails.length) { fails.forEach((f) => console.log("  FAIL  " + f)); process.exit(1); }
})();
