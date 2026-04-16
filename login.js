const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium-browser', args: ['--no-sandbox'] });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('https://demo.synderapp.com/auth', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Get all input fields and buttons
  const inputs = await page.$$eval('input', els => els.map(e => ({ type: e.type, name: e.name, placeholder: e.placeholder, id: e.id })));
  console.log('Inputs:', JSON.stringify(inputs, null, 2));
  
  const buttons = await page.$$eval('button', els => els.map(e => ({ text: e.textContent.trim(), type: e.type })));
  console.log('Buttons:', JSON.stringify(buttons, null, 2));
  
  const links = await page.$$eval('a', els => els.map(e => ({ text: e.textContent.trim(), href: e.href })));
  console.log('Links:', JSON.stringify(links, null, 2));
  
  // Get visible text
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
  console.log('Page text:', bodyText);
  
  await browser.close();
})().catch(e => console.error('Error:', e.message));
