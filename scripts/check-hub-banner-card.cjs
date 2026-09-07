/* Verify the banner-builder card on the prototype hub.
   Usage: node scripts/check-hub-banner-card.cjs [hub-url]
   With no argument it checks the local file and asserts the href + target file;
   file:// serves a directory listing for "./banner-builder/", so the
   click-through is only meaningful against the published hub. */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const repo = path.resolve(__dirname, "..");
const arg = process.argv[2];
const url = arg || "file://" + path.join(repo, "projects/index.html");
const published = !!arg;

const out = [];
const ok = (n, c, x) => out.push(`${c ? "PASS" : "FAIL"}  ${n}${x && !c ? " — " + x : ""}`);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => !document.querySelector("i[data-lucide]"), null, { timeout: 5000 }).catch(() => {});

  const card = page.locator('a.project-card[href="./banner-builder/"]');
  ok("card exists exactly once", (await card.count()) === 1, "count " + (await card.count()));
  await card.scrollIntoViewIfNeeded();
  ok("card is visible", await card.isVisible());
  ok("Campaigns group label is visible", await page.locator("div", { hasText: /^Campaigns$/ }).first().isVisible());
  ok("title renders", (await card.locator("h3").innerText()) === "Banner builder");
  ok("description mentions the overlap rule", (await card.locator("p").innerText()).includes("later start wins"));
  ok("status chip is visible", await card.locator(".project-status").isVisible());
  ok("three tags render", (await card.locator(".project-tag").count()) === 3);

  /* lucide swaps <i data-lucide> for an <svg>; a bad icon name leaves the <i> behind */
  ok("megaphone rendered as an svg", (await card.locator(".project-preview-icon svg").count()) === 1);
  ok("no unrendered <i data-lucide> in the card", (await card.locator("i[data-lucide]").count()) === 0);
  /* Pre-existing, not from this card: the "github" link icon was dropped from
     lucide's core set, so it never renders. Guard the count so a new broken
     icon name still fails this check. */
  const unrendered = await page.$$eval("i[data-lucide]", (els) => els.map((e) => e.getAttribute("data-lucide")));
  ok("no unrendered icons beyond the known github one", unrendered.every((i) => i === "github"), unrendered.join(","));

  await card.screenshot({ path: path.join(repo, "reports/hub-banner-card.png") });

  if (published) {
    await card.click();
    await page.waitForLoadState("load");
    ok("card links to the prototype", page.url().includes("banner-builder"), page.url());
    ok("prototype loads through the hub link", await page.locator("table.bb").isVisible());
    ok("no page errors", errs.length === 0, errs.join(" | "));
  } else {
    ok("target file exists on disk", fs.existsSync(path.join(repo, "projects/banner-builder/index.html")));
    ok("no page errors on the hub", errs.length === 0, errs.join(" | "));
  }

  console.log(out.join("\n"));
  await browser.close();
  if (out.some((l) => l.startsWith("FAIL"))) process.exit(1);
})();
