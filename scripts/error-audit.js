const { chromium } = require("playwright");
const fs = require("fs");
const dir = "/home/ubuntu/.openclaw/workspace/.synder-state/error-audit";

const tabs = [
  { name: "General", hash: "#default-general-settings" },
  { name: "Sales", hash: "#default-sales-settings" },
  { name: "Invoices", hash: "#default-invoice-settings" },
  { name: "Products_Services", hash: "#default-item-settings" },
  { name: "Product_mapping", hash: "#default-product-mapping-settings" },
  { name: "Taxes", hash: "#default-tax-settings" },
  { name: "Fees", hash: "#default-fee-settings" },
  { name: "Application_Fees", hash: "#default-applicationFee-settings" },
  { name: "Expenses", hash: "#default-purchase-settings" },
  { name: "Payouts", hash: "#default-payout-settings" },
  { name: "Multicurrency", hash: "#default-multi-currency-settings" },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: "/home/ubuntu/.openclaw/workspace/.synder-state/storage-state.json",
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  const allErrors = [];

  // Navigate to settings
  await page.goto("https://demo.synderapp.com/controlPanel/index", { waitUntil: "networkidle", timeout: 30000 });
  await page.click('a:has-text("Settings")');
  await page.waitForTimeout(3000);

  for (const tab of tabs) {
    console.log(`\n========== TAB: ${tab.name} ==========`);

    // Click the tab link
    const tabLink = page.locator(`.nav-tabs a[href$="${tab.hash}"]`);
    await tabLink.click();
    await page.waitForTimeout(1500);

    // Screenshot default state
    await page.screenshot({ path: `${dir}/tab-${tab.name}-default.png` });

    // Get all text in the active tab pane
    const tabText = await page.evaluate((hash) => {
      const id = hash.replace("#", "");
      const pane = document.getElementById(id) || document.querySelector(".tab-pane.active .tab-pane.active") || document.querySelector(".tab-content .tab-pane.active");
      return pane ? pane.innerText : "PANE NOT FOUND";
    }, tab.hash);
    console.log("Tab text:", tabText.substring(0, 1500));

    // Find all select elements (dropdowns) in this tab
    const selectInfo = await page.evaluate((hash) => {
      const id = hash.replace("#", "");
      const pane = document.getElementById(id) || document.querySelector(".tab-pane.active .tab-pane.active");
      if (!pane) return [];
      const selects = pane.querySelectorAll("select");
      return Array.from(selects).map((s) => ({
        name: s.getAttribute("name"),
        id: s.id,
        value: s.value,
        options: Array.from(s.options).slice(0, 5).map((o) => ({ value: o.value, text: o.text })),
        required: s.required,
        label: s.closest(".form-group")?.querySelector("label")?.innerText?.trim() || "",
      }));
    }, tab.hash);
    console.log(`Found ${selectInfo.length} dropdowns`);

    // Find all toggles
    const toggleInfo = await page.evaluate((hash) => {
      const id = hash.replace("#", "");
      const pane = document.getElementById(id) || document.querySelector(".tab-pane.active .tab-pane.active");
      if (!pane) return [];
      const toggles = pane.querySelectorAll('input[type="checkbox"].toggle-checkbox, .toggle');
      return Array.from(toggles).map((t) => {
        const input = t.tagName === "INPUT" ? t : t.querySelector("input");
        const label = t.closest(".form-group")?.querySelector("label.control-label")?.innerText?.trim() || "";
        return {
          name: input?.getAttribute("name") || "",
          checked: input?.checked || false,
          label,
        };
      });
    }, tab.hash);
    console.log(`Found ${toggleInfo.length} toggles`);

    // Try clearing each dropdown to empty and clicking Update
    for (const sel of selectInfo) {
      if (!sel.name) continue;
      const hasEmpty = sel.options.some((o) => o.value === "" || o.value === "0");
      if (!hasEmpty) continue;

      console.log(`  Clearing dropdown: ${sel.label || sel.name}`);
      const originalValue = sel.value;

      // Set to empty
      await page.evaluate(
        ({ name, hash }) => {
          const id = hash.replace("#", "");
          const pane = document.getElementById(id) || document.querySelector(".tab-pane.active .tab-pane.active");
          const select = pane?.querySelector(`select[name="${name}"]`);
          if (select) {
            select.value = "";
            select.dispatchEvent(new Event("change", { bubbles: true }));
          }
        },
        { name: sel.name, hash: tab.hash }
      );
      await page.waitForTimeout(500);
    }

    // Click Update/Save button
    const updateBtn = page.locator('button:has-text("Update"), input[value="Update"]').first();
    if ((await updateBtn.count()) > 0) {
      await updateBtn.scrollIntoViewIfNeeded();
      await updateBtn.click();
      console.log("  Clicked Update");
      await page.waitForTimeout(3000);

      // Check for errors
      const errors = await page.evaluate(() => {
        const results = [];
        // Notiflix
        document.querySelectorAll('[id*="NotiflixNotify"] [class*="message"], [id*="NotiflixNotify"]').forEach((el) => {
          if (el.innerText.trim()) results.push({ type: "notiflix", text: el.innerText.trim(), class: el.className });
        });
        // Bootstrap alerts
        document.querySelectorAll(".alert").forEach((el) => {
          if (el.innerText.trim()) results.push({ type: "alert", text: el.innerText.trim() });
        });
        // Role alert
        document.querySelectorAll("[role=alert]").forEach((el) => {
          if (el.innerText.trim()) results.push({ type: "role-alert", text: el.innerText.trim() });
        });
        // Has-error class
        document.querySelectorAll(".has-error .help-block, .has-error .error-message, .error, .text-danger").forEach((el) => {
          if (el.innerText.trim()) results.push({ type: "validation", text: el.innerText.trim() });
        });
        // Toast
        document.querySelectorAll(".toast, .toast-message, [class*=Toastify], [class*=toast]").forEach((el) => {
          if (el.innerText.trim()) results.push({ type: "toast", text: el.innerText.trim() });
        });
        // SweetAlert
        document.querySelectorAll(".swal2-popup, .swal-modal").forEach((el) => {
          if (el.innerText.trim()) results.push({ type: "sweetalert", text: el.innerText.trim() });
        });
        // Modal
        document.querySelectorAll(".modal.show .modal-body, .modal.in .modal-body").forEach((el) => {
          if (el.innerText.trim()) results.push({ type: "modal", text: el.innerText.trim() });
        });
        return results;
      });

      if (errors.length > 0) {
        console.log(`  ERRORS FOUND:`, JSON.stringify(errors));
        allErrors.push({ tab: tab.name, action: "clear-dropdowns-and-save", errors });
        await page.screenshot({ path: `${dir}/err-${tab.name}-save-cleared.png` });
      } else {
        console.log("  No errors detected after save");
      }

      // Reload to reset
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(2000);
      // Re-click the tab
      const tabLink2 = page.locator(`.nav-tabs a[href$="${tab.hash}"]`);
      await tabLink2.click();
      await page.waitForTimeout(1500);
    }

    // Try toggling each toggle and looking for warnings
    for (const toggle of toggleInfo) {
      if (!toggle.name) continue;
      console.log(`  Toggling: ${toggle.label || toggle.name} (currently ${toggle.checked ? "ON" : "OFF"})`);

      const toggleEl = page.locator(`input[name="${toggle.name}"]`).first();
      const toggleBtn = toggleEl.locator("xpath=ancestor::div[contains(@class, 'toggle')]").first();

      try {
        await toggleBtn.click();
        await page.waitForTimeout(1500);

        // Check for warnings/modals/toasts
        const warnings = await page.evaluate(() => {
          const results = [];
          document.querySelectorAll('[id*="NotiflixNotify"], .modal.show .modal-body, .modal.in .modal-body, [role=alert], .alert, .swal2-popup, .toast, [class*=toast], .popover, .tooltip.in, .tooltip.show').forEach((el) => {
            if (el.innerText.trim()) results.push({ type: el.className.substring(0, 50), text: el.innerText.trim() });
          });
          return results;
        });

        if (warnings.length > 0) {
          console.log(`    WARNING:`, JSON.stringify(warnings));
          allErrors.push({ tab: tab.name, action: `toggle-${toggle.label || toggle.name}`, errors: warnings });
          await page.screenshot({ path: `${dir}/err-${tab.name}-toggle-${toggle.label.replace(/[^a-zA-Z]/g, "_")}.png` });
        }

        // Toggle back
        await toggleBtn.click();
        await page.waitForTimeout(500);
      } catch (e) {
        console.log(`    Toggle click failed: ${e.message.substring(0, 100)}`);
      }
    }
  }

  // Save results
  fs.writeFileSync(`${dir}/all-errors.json`, JSON.stringify(allErrors, null, 2));
  console.log(`\n\nTotal error groups found: ${allErrors.length}`);
  console.log("Results saved to all-errors.json");

  await context.storageState({ path: "/home/ubuntu/.openclaw/workspace/.synder-state/storage-state.json" });
  await browser.close();
})().catch((e) => console.error("FATAL:", e.message));
