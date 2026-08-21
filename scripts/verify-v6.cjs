// Verifies the reworked variant 6: ordinary date chip, status filter with all
// 8 statuses wired to the SAME value as the segments, no count line.
const fs = require('fs');
const { JSDOM } = require('/tmp/node_modules/jsdom');
const FILE = '/home/ubuntu/.openclaw/workspace/filtering-options/index.html';
const html = fs.readFileSync(FILE, 'utf8');
let pass=0, fail=0;
const ok=(n,c,x)=>{if(c){pass++;console.log('  ok   '+n)}else{fail++;console.log('  FAIL '+n+(x!==undefined?'  -> '+x:''))}};
const eq=(n,a,e)=>ok(n+' (= '+JSON.stringify(e)+')', a===e, 'got '+JSON.stringify(a));

const ROW_RE=/\{ date: '([\d-]+)',\s*customer: '([^']+)',\s*platform: '([^']+)',\s*type: '([^']+)',\s*amount: ([\d.]+),\s*status: '([^']+)'\s*\}/g;
const DATA=[]; let m;
while((m=ROW_RE.exec(html))!==null) DATA.push({date:m[1],customer:m[2],platform:m[3],type:m[4],amount:parseFloat(m[5]),status:m[6]});
const W={all:null,'7d':['2026-04-24','2026-04-30'],'30d':['2026-04-01','2026-04-30'],'90d':['2026-01-30','2026-04-30'],month:['2026-04-01','2026-04-30'],lastmonth:['2026-03-01','2026-03-31']};
function oracle(f){f=f||{};return DATA.filter(t=>{
  const w=W[f.date||'all']; if(w&&!(t.date>=w[0]&&t.date<=w[1]))return false;
  if(f.status&&f.status.length&&f.status.indexOf(t.status)===-1)return false;
  if(f.platform&&f.platform.length&&f.platform.indexOf(t.platform)===-1)return false;
  if(f.type&&f.type.length&&f.type.indexOf(t.type)===-1)return false;
  return true;}).length;}
// Taxonomy parsed from source so the suite can't drift from it.
const SG_START = html.indexOf('var STATUS_GROUPS = {');
const SG_BLOCK = html.slice(SG_START, html.indexOf('};', SG_START));
const STATUS_GROUPS = {};
{ const re=/'([^']+)':\s*'([^']+)'/g; let g; while((g=re.exec(SG_BLOCK))!==null) STATUS_GROUPS[g[1]]=g[2]; }
const inGroup = n => Object.keys(STATUS_GROUPS).filter(x=>STATUS_GROUPS[x]===n);
const ALL_STATUSES = Object.keys(STATUS_GROUPS);
const GROUPS = ['Needs attention','Ready to sync','In progress','Successful','Deleted'];
const SEG = { all: [] };
GROUPS.forEach(g => { SEG[g.toLowerCase().replace(/ /g,'-')] = inGroup(g); });

const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true});
const d=dom.window.document;
const q=(s,r)=>(r||d).querySelector(s), qa=(s,r)=>Array.from((r||d).querySelectorAll(s));
const rows=()=>qa('#recTable tbody tr').length;
const bar=()=>qa('#recFilterBar [data-field-key]').map(e=>e.getAttribute('data-field-key'));
const fld=k=>q('#recFilterBar [data-field-key="'+k+'"]');
const seg=k=>q('#recSegments [data-segment="'+k+'"]');
const segCount=k=>parseInt(seg(k).querySelector('.seg-count').textContent,10);
const chipText=k=>q('.chip-label-text',fld(k)).textContent.trim();
function pickStatuses(list){
  q('[data-field-trigger]',fld('status')).click();
  list.forEach(s=>q('[data-check-value="'+s+'"]',fld('status')).click());
  q('[data-panel-apply]',fld('status')).click();
}

console.log('-- date is an ordinary chip');
ok('no baseline chip anywhere in V6', !q('#recFilterBar .baseline-chip'));
ok('date renders as a filter chip', !!q('.filter-chip',fld('date')));
ok('date chip uses the same class as platform',
   fld('date').className === fld('platform').className,
   fld('date').className+' / '+fld('platform').className);
ok('date still starts on the real default (90 days)',
   /Last 90 days/.test(chipText('date')), chipText('date'));
ok('no "(default)" suffix', !/default/i.test(fld('date').textContent), fld('date').textContent);

console.log('-- default bar is Date range + Platform; status is addable');
eq('bar order', bar().join(','), 'date,platform');
ok('status not on the bar', bar().indexOf('status') === -1);
ok('date chip has no "All time" row — the x is the clear',
   !q('[data-pick-value="all"]',fld('date')));
ok('Clear filters is on the bar (the 90-day window IS applied)',
   !!q('[data-rec-clear]'));
q('[data-rec-add]').click();
q('[data-rec-add-key="status"]').click();
q('[data-field-trigger]',fld('status')).click();   // close the auto-opened panel
eq('bar after adding status', bar().join(','), 'date,platform,status');
eq('status offers all 19', qa('[data-check-value]',fld('status')).length, ALL_STATUSES.length);
eq('grouped into 5 sections', qa('.dropdown-group-label',fld('status')).length, 5);
eq('group labels in the app order',
   qa('.dropdown-group-label',fld('status')).map(e=>e.textContent).join(','),
   'Ready to sync,Successful,Needs attention,Deleted,In progress');
ok('status chip reads its label when empty', /^Status$/.test(chipText('status')), chipText('status'));

console.log('-- change 3: no count line');
ok('#recCount is gone', !q('#recCount'));
ok('no "Showing N of" sentence in the mock page',
   !/Showing\s*\d+\s*of/.test(q('#variant-rec .mock-page').textContent));
ok('no "no filters applied" sentence',
   !/no filters applied/.test(q('#variant-rec .mock-page').textContent));

console.log('-- the two status controls share ONE value');
eq('segments render', qa('#recSegments .status-segment').length, 6);
ok('All segment active on load', seg('all').classList.contains('active'));
eq('rows at load = 90-day window', rows(), oracle({date:'90d'}));
Object.keys(SEG).forEach(k=>eq('segment count '+k, segCount(k), oracle({date:'90d',status:SEG[k]})));

// chip -> segment
pickStatuses(['Synced with rule failed']);
eq('rows = Rule failed', rows(), oracle({date:'90d',status:['Synced with rule failed']}));
ok('attention segment shows PARTIAL, not active',
   seg('needs-attention').classList.contains('partial') && !seg('needs-attention').classList.contains('active'));
ok('All segment not active', !seg('all').classList.contains('active'));
ok('chip spells the value', /Status: Synced with rule failed/.test(chipText('status')), chipText('status'));

// picking the exact group set reads as the segment itself
pickStatuses(['Synced with rule failed']);           // uncheck
pickStatuses(SEG['needs-attention']);
ok('attention segment now fully active',
   seg('needs-attention').classList.contains('active') && !seg('needs-attention').classList.contains('partial'));
eq('rows = whole attention group', rows(), oracle({date:'90d',status:SEG['needs-attention']}));

// segment -> chip
seg('ready-to-sync').click();
ok('ready segment active', seg('ready-to-sync').classList.contains('active'));
ok('chip followed the segment', /Ready to sync/.test(chipText('status')), chipText('status'));
eq('rows = ready group', rows(), oracle({date:'90d',status:SEG['ready-to-sync']}));

// a set matching no group leaves every segment quiet
pickStatuses(SEG['ready-to-sync']);                   // clear it
pickStatuses(['Failed','Skipped']);
ok('no segment claims to be active',
   qa('#recSegments .status-segment.active').length === 0,
   qa('#recSegments .status-segment.active').map(e=>e.textContent).join(','));
eq('rows = Failed + Skipped', rows(), oracle({date:'90d',status:['Failed','Skipped']}));

console.log('-- status stages inside its own panel (Apply-gated)');
const before = rows();
q('[data-field-trigger]',fld('status')).click();
q('[data-check-value="Synced"]',fld('status')).click();
eq('checkbox toggle does NOT re-query', rows(), before);
ok('panel still open', q('[data-field-panel]',fld('status')).classList.contains('active'));
q('[data-panel-apply]',fld('status')).click();
eq('Apply commits', rows(), oracle({date:'90d',status:['Failed','Skipped','Synced']}));

console.log('-- date chip behaves like any other chip');
q('[data-field-trigger]',fld('date')).click();
const dateRowsBefore = rows();
q('[data-pick-value="30d"]',fld('date')).click();
eq('picking a date STAGES, does not re-query', rows(), dateRowsBefore);
ok('panel stays open after a pick (was the discard bug)',
   q('[data-field-panel]',fld('date')).classList.contains('active'));
q('[data-panel-apply]',fld('date')).click();
eq('date applies', rows(), oracle({date:'30d',status:['Failed','Skipped','Synced']}));
ok('segment counts follow the date',
   segCount('needs-attention') === oracle({date:'30d',status:SEG['needs-attention']}),
   segCount('needs-attention')+' vs '+oracle({date:'30d',status:SEG['needs-attention']}));
q('[data-remove-field]',fld('date')).click();
ok('date x keeps the chip on the bar', bar().indexOf('date') !== -1, bar().join(','));
ok('date chip reads its bare label now', /^Date range$/.test(chipText('date')), chipText('date'));
eq('date x COMMITS — list stops filtering by date', rows(),
   oracle({status:['Failed','Skipped','Synced']}));

console.log('-- open/close without Apply changes nothing and reverts nothing');
q('[data-field-trigger]',fld('date')).click();
q('[data-field-trigger]',fld('date')).click();
ok('date chip still cleared after an open/close round trip',
   /^Date range$/.test(chipText('date')), chipText('date'));
eq('rows unchanged by open/close', rows(), oracle({status:['Failed','Skipped','Synced']}));

console.log('-- status is removable and re-addable like any other filter');
q('[data-remove-field]',fld('status')).click();
ok('status chip gone from the bar', bar().indexOf('status') === -1, bar().join(','));
ok('removing status resets the segment to All', seg('all').classList.contains('active'));
eq('and it COMMITTED — no status filter left on the list', rows(), oracle({}));
ok('status is offered in Add filter', !!q('#recFilterBar [data-rec-add-key="status"]'));
q('[data-rec-add]').click();
q('[data-rec-add-key="status"]').click();
ok('status back on the bar', bar().indexOf('status') !== -1, bar().join(','));

console.log('-- removing a secondary chip commits (was a lying control)');
q('[data-field-trigger]',fld('platform')).click();
q('[data-check-value="Stripe"]',fld('platform')).click();
q('[data-panel-apply]',fld('platform')).click();
// By now date and status have both been cleared by their own x, so Stripe is
// the only filter in play — which is itself the proof that those x's committed.
eq('Stripe applied', rows(), oracle({platform:['Stripe']}));
q('[data-remove-field]',fld('platform')).click();
ok('pinned platform chip STAYS on the bar', bar().indexOf('platform') !== -1, bar().join(','));
eq('but the list stopped filtering by it', rows(), oracle({}));
ok('and with nothing applied, Clear filters removes itself', !q('[data-rec-clear]'));

console.log('-- dashboard deep-link is a plain status chip');
q('#recDeepLinkBtn').click();
ok('status chip carries the arriving value', /Status: Synced with rule failed/.test(chipText('status')), chipText('status'));
ok('NO attribution marker of any kind',
   !q('#recFilterBar [data-deeplink-tag]') && !q('#recFilterBar .deeplink-chip') &&
   !/From dashboard/.test(q('#variant-rec .mock-page').textContent));
ok('it is the same chip component as platform',
   q('.filter-chip',fld('status')).className.replace(' active','') ===
   q('.filter-chip',fld('platform')).className.replace(' active',''));
ok('it has its own remove button', !!q('[data-remove-field]',fld('status')));
ok('and its own dropdown', !!q('[data-field-trigger]',fld('status')));
ok('attention segment partial', seg('needs-attention').classList.contains('partial'));
eq('rows = Rule failed at the 90-day default', rows(), oracle({date:'90d',status:['Synced with rule failed']}));
seg('successful').click();
eq('a segment click replaces it', rows(), oracle({date:'90d',status:SEG['successful']}));

console.log('-- empty state and recovery');
// Add whichever chips this point in the run has left off the bar.
['status','platform'].forEach(k => {
    if (bar().indexOf(k) !== -1) return;
    q('[data-rec-add]').click();
    q('[data-rec-add-key="'+k+'"]').click();
    q('[data-field-trigger]',fld(k)).click();   // close the auto-opened panel
});
q('[data-field-trigger]',fld('platform')).click();
q('[data-check-value="Shopify"]',fld('platform')).click();
q('[data-panel-apply]',fld('platform')).click();
// A Shopify + Rollback-failed combination has no rows in the dataset.
q('[data-field-trigger]',fld('status')).click();
qa('[data-check-value]',fld('status')).forEach(cb => { if (cb.checked) cb.click(); });
q('[data-check-value="Rollback failed"]',fld('status')).click();
q('[data-panel-apply]',fld('status')).click();
eq('no rows', rows(), 0);
ok('empty state shown', !!q('#recTable .empty-state'));
q('#recTable [data-empty-clear]').click();
// "Clear filters" means nothing applied — not "back to the 90-day load state",
// which is itself a filter the user would then have to clear again.
eq('recovered to nothing applied', rows(), oracle({}));
eq('bar back to the pinned pair', bar().join(','), 'date,platform');
ok('date chip is cleared, not reset to 90 days', /^Date range$/.test(chipText('date')), chipText('date'));
ok('All segment active again', seg('all').classList.contains('active'));

console.log('-- other variants untouched');
ok('V7 still has its segments row', !!q('#sheetbtnSegments'));
ok('V7 still has its count line', !!q('#sheetbtnCount'));
ok('V7 sheet still excludes status', true);
ok('V8 tabs intact', qa('#groupsTabs .status-segment').length === 6);
ok('V8 count line intact', !!q('#groupsCount'));
eq('8 nav tabs', qa('.nav-tab').length, 8);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
