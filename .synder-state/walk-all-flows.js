/**
 * Walk all Synder onboarding role flows
 * Captures screenshots + text at every step for each role
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://demo.synderapp.com';
const STORAGE_STATE = path.join(__dirname, 'storage-state.json');
const OUT_DIR = path.join(__dirname, '..');
// Note: script is in .synder-state/, output dirs are also in .synder-state/
const FLOWS_DIR = __dirname;

const log = (msg) => {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function navigateToOnboarding(page) {
  await page.goto(`${BASE_URL}/dailysummary/public/summaries/index.html`, { waitUntil: 'networkidle', timeout: 60000 });
  await sleep(2000);
  
  // Open org switcher and click Connect client
  await page.locator('text=Per transaction').first().click();
  await sleep(1000);
  await page.locator('text=Connect client').first().click();
  await sleep(5000);
  
  const url = page.url();
  log(`After connect client: ${url}`);
  
  // Should be on onboarding now - navigate to role step
  const text = await page.locator('body').innerText();
  if (!text.includes('How would you describe your role')) {
    // Try clicking "Tell us about you" tab
    try {
      await page.locator('text=Tell us about you').first().click();
      await sleep(2000);
    } catch(e) {
      // Try Back button
      try {
        await page.locator('button:has-text("Back")').click();
        await sleep(2000);
      } catch(e2) {}
    }
  }
}

async function selectRole(page, roleName) {
  // Open role dropdown
  await page.locator('.common-select__control').first().click();
  await sleep(500);
  await page.locator(`.common-select__option:has-text("${roleName}")`).click();
  await sleep(500);
}

async function getStepInfo(page) {
  const text = await page.locator('body').innerText();
  const url = page.url();
  // Get step tabs
  const tabs = await page.locator('[class*="stepper"], [class*="steps"], [class*="wizard"]').allInnerTexts().catch(() => []);
  return { text, url, tabs };
}

async function clickIndustryArea(page) {
  // Industries field requires clicking in the area below label
  try {
    const industryLabel = page.locator('text=Choose the industries you serve');
    const box = await industryLabel.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height + 30);
      await sleep(800);
      const opts = await page.locator('[class*="option"]').allInnerTexts();
      const industries = opts.filter(o => o.trim() && !['Back', 'Next step'].includes(o));
      if (industries.length > 0) {
        // Click first option
        await page.locator('[class*="option"]').first().click();
        await sleep(500);
        return industries;
      }
    }
  } catch(e) {
    log(`Industry click failed: ${e.message}`);
  }
  return [];
}

async function walkRole(roleName, dirName) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: STORAGE_STATE,
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  const dir = path.join(FLOWS_DIR, dirName);
  
  const flowData = {
    role: roleName,
    steps: [],
    fields: {},
    errors: []
  };

  try {
    log(`\n===== WALKING: ${roleName} =====`);
    
    await page.goto(`${BASE_URL}/onboarding/index`, { waitUntil: 'networkidle', timeout: 60000 });
    await sleep(5000);
    
    // Get to role selection
    let text = await page.locator('body').innerText();
    if (!text.includes('How would you describe your role')) {
      try {
        await page.locator('text=Tell us about you').first().click();
        await sleep(2000);
      } catch(e) {}
    }
    
    // ===== STEP 1: Role selection =====
    log('Step 1: Selecting role');
    await page.screenshot({ path: `${dir}/01-role-selection.png` });
    
    text = await page.locator('body').innerText();
    
    // Get all available role options
    await page.locator('.common-select__control').first().click();
    await sleep(500);
    const allRoles = await page.locator('.common-select__option').allInnerTexts();
    flowData.fields.availableRoles = allRoles;
    await page.screenshot({ path: `${dir}/01b-roles-open.png` });
    
    // Select our role
    await page.locator(`.common-select__option:has-text("${roleName}")`).click();
    await sleep(500);
    await page.screenshot({ path: `${dir}/01c-role-selected.png` });
    
    const stepTabs1 = await page.locator('[class*="navigation"], [class*="stepper"], [class*="tabs"]').first().innerText().catch(() => '');
    flowData.steps.push({
      stepNum: 1,
      title: 'Tell us about you',
      subTitle: 'Role selection',
      url: page.url(),
      tabs: stepTabs1,
      fields: ['Role dropdown'],
      screenshot: '01c-role-selected.png'
    });
    
    // Click Next
    await page.locator('button:has-text("Next step")').click();
    await sleep(4000);
    
    // ===== STEP 1b or 2: Practice/Business Info =====
    log('Step 2: Practice/Business info');
    text = await page.locator('body').innerText();
    const step2Title = text.match(/Info about your practice|Provide business details|Provide Client details/)?.[0] || 'Unknown';
    
    await page.screenshot({ path: `${dir}/02-info-empty.png`, fullPage: true });
    
    // Get all field labels
    const fieldLabels = await page.locator('label, [class*="label"]').allInnerTexts();
    const cleanLabels = fieldLabels.filter(l => l.trim() && l.length < 100);
    log(`Fields on step 2: ${JSON.stringify(cleanLabels)}`);
    flowData.fields.step2Fields = cleanLabels;

    // Try to fill all select controls
    const selects = page.locator('.common-select__control');
    const selectCount = await selects.count();
    log(`Found ${selectCount} common-select controls`);
    
    const selectData = {};
    
    for (let i = 0; i < selectCount; i++) {
      try {
        await selects.nth(i).click();
        await sleep(600);
        const opts = await page.locator('.common-select__option').allInnerTexts();
        if (opts.length > 0) {
          selectData[`dropdown_${i}`] = opts;
          log(`Dropdown ${i} options: ${JSON.stringify(opts.slice(0, 8))}`);
          await page.screenshot({ path: `${dir}/02-dropdown-${i}-open.png` });
          // Pick a mid option to avoid edge cases
          const midIdx = Math.min(1, opts.length - 1);
          await page.locator('.common-select__option').nth(midIdx).click();
          await sleep(500);
        }
      } catch(e) {
        log(`Dropdown ${i} error: ${e.message}`);
      }
    }
    flowData.fields.step2Dropdowns = selectData;
    
    // Try industries field (non-standard component)
    const industryOpts = await clickIndustryArea(page);
    if (industryOpts.length > 0) {
      flowData.fields.industryOptions = industryOpts;
      log(`Industry options found: ${JSON.stringify(industryOpts.slice(0, 8))}`);
      await page.screenshot({ path: `${dir}/02-industry-open.png` });
    }
    
    // Fill text inputs (business name, email, website etc)
    const textInputs = await page.locator('input[type="text"], input[type="email"], input:not([type])').all();
    log(`Found ${textInputs.length} text inputs`);
    for (let i = 0; i < textInputs.length; i++) {
      try {
        const placeholder = await textInputs[i].getAttribute('placeholder') || '';
        const name = await textInputs[i].getAttribute('name') || '';
        log(`  Input ${i}: placeholder="${placeholder}" name="${name}"`);
        
        if (placeholder.toLowerCase().includes('name') || name.toLowerCase().includes('name')) {
          await textInputs[i].fill('Dasha Test Co');
        } else if (placeholder.toLowerCase().includes('email')) {
          await textInputs[i].fill('test@dashatest.com');
        } else if (placeholder.toLowerCase().includes('website') || name.toLowerCase().includes('website')) {
          await textInputs[i].fill('https://dashatest.com');
        } else {
          await textInputs[i].fill('Test value');
        }
        await sleep(300);
      } catch(e) {
        log(`  Input ${i} fill error: ${e.message}`);
      }
    }
    
    // Handle radio buttons (accountant question)
    try {
      const noRadio = page.locator('input[type="radio"][value="No"], input[type="radio"] + label:has-text("No")');
      if (await noRadio.count() > 0) {
        await noRadio.first().click({ force: true });
        await sleep(300);
        log('Selected "No" for accountant question');
      }
    } catch(e) {}
    
    await page.screenshot({ path: `${dir}/02-filled.png`, fullPage: true });
    
    const stepTabs2 = await page.locator('body').innerText().then(t => t.split('\n').filter(l => l.trim()).slice(1, 6).join(' | '));
    flowData.steps.push({
      stepNum: 2,
      title: step2Title,
      url: page.url(),
      tabs: stepTabs2,
      fields: cleanLabels,
      screenshot: '02-filled.png'
    });
    
    // Click Next
    await page.locator('button:has-text("Next step")').click();
    await sleep(5000);
    
    // ===== STEP 3 =====
    log('Step 3: After next');
    text = await page.locator('body').innerText();
    const step3Title = text.match(/Select integrations|Provide Client details|Select accounting software/)?.[0] || text.split('\n').filter(l => l.trim()).slice(5, 7).join(' ');
    
    await page.screenshot({ path: `${dir}/03-step3.png`, fullPage: true });
    log('Step 3 text (first 1000): ' + text.substring(0, 1000));
    
    // Get integration options if visible
    let integrationOptions = [];
    try {
      integrationOptions = await page.locator('[class*="platform"], [class*="integration"], [class*="connector"]').allInnerTexts();
      integrationOptions = integrationOptions.filter(t => t.trim() && t.length < 50).slice(0, 30);
    } catch(e) {}
    
    // Also check for any visible platforms by looking for image alt texts or labels
    try {
      const imgAlts = await page.locator('img[alt]').evaluateAll(imgs => imgs.map(img => img.alt).filter(a => a));
      log('Image alts:', imgAlts.slice(0, 20));
    } catch(e) {}
    
    flowData.steps.push({
      stepNum: 3,
      title: step3Title,
      url: page.url(),
      text: text.substring(0, 800),
      integrationOptions,
      screenshot: '03-step3.png'
    });
    
    // Try to proceed to step 4 if possible (select integrations)
    try {
      // Click a platform / integration
      const platforms = page.locator('[class*="platform"], [data-cy*="platform"], img[alt]');
      const pCount = await platforms.count();
      log(`Found ${pCount} platform elements`);
      
      if (pCount > 0) {
        await platforms.first().click({ force: true });
        await sleep(1000);
        await page.screenshot({ path: `${dir}/03b-integration-selected.png` });
      }
      
      // Click Next
      await page.locator('button:has-text("Next step")').click();
      await sleep(5000);
      
      // ===== STEP 4 =====
      text = await page.locator('body').innerText();
      await page.screenshot({ path: `${dir}/04-step4.png`, fullPage: true });
      log('Step 4 text: ' + text.substring(0, 800));
      
      flowData.steps.push({
        stepNum: 4,
        title: 'Connect integrations',
        url: page.url(),
        text: text.substring(0, 800),
        screenshot: '04-step4.png'
      });
    } catch(e) {
      log(`Step 3→4 failed: ${e.message}`);
    }
    
  } catch(e) {
    log(`Flow error: ${e.message}`);
    flowData.errors.push(e.message);
    await page.screenshot({ path: `${dir}/error.png` }).catch(() => {});
  }
  
  // Save flow data
  fs.writeFileSync(`${dir}/flow-data.json`, JSON.stringify(flowData, null, 2));
  log(`Saved flow data for ${roleName}`);
  
  await browser.close();
  return flowData;
}

// Main: walk each role
(async () => {
  const roles = [
    { name: 'Accounting or Bookkeeping Firm', dir: 'flow-acct' },
    { name: 'Business owner / Executive manager', dir: 'flow-bizowner' },
    { name: 'Staff Accountant', dir: 'flow-staff' },
    { name: 'Other', dir: 'flow-other' },
  ];
  
  const allFlows = {};
  
  for (const role of roles) {
    try {
      const data = await walkRole(role.name, role.dir);
      allFlows[role.name] = data;
    } catch(e) {
      log(`FATAL error for ${role.name}: ${e.message}`);
      allFlows[role.name] = { error: e.message };
    }
  }
  
  fs.writeFileSync(path.join(FLOWS_DIR, 'all-flows.json'), JSON.stringify(allFlows, null, 2));
  log('\n===== ALL FLOWS COMPLETE =====');
  log('Saved to all-flows.json');
})();
