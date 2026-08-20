const { chromium } = require('/home/ubuntu/.openclaw/workspace/node_modules/playwright');
const FILE = 'file:///home/ubuntu/.openclaw/workspace/filtering-options/index.html';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1340, height: 1100 } });
  await p.goto(FILE);
  await p.addStyleTag({ content: '.page-header{position:static !important}' });
  await p.click('.nav-tab[data-variant="groups"]');
  const shot = async (name) => {
    await p.locator('#variant-groups .mock-page').screenshot({ path: '/tmp/'+name+'.png' });
    console.log('wrote /tmp/'+name+'.png');
  };
  await shot('v8a-all');
  await p.click('#groupsTabs [data-group="attention"]');
  await shot('v8b-group');
  await p.click('#groupsSub [data-sub-status="Rule failed"]');
  await shot('v8c-narrowed');
  await p.click('#groupsFilterBar [data-groups-add]');
  await p.click('#groupsFilterBar [data-groups-add-key="platform"]');
  await shot('v8d-scope-panel');
  await p.keyboard.press('Escape');
  await p.click('#groupsDeepLinkBtn');
  await p.click('[data-deeplink="Pending"]');
  await shot('v8e-deeplink');
  await p.click('#groupsTabs [data-group="all"]');
  await p.click('#groupsSub [data-sub-trigger]');
  await shot('v8f-all-dropdown');
  await b.close();
})();
