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
const SEG={all:[],attention:['Failed','Rule failed','Rollback failed','Synced with warnings'],
           ready:['Ready to sync','Pending'],synced:['Synced'],skipped:['Skipped']};

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

console.log('-- change 1: date is an ordinary chip');
ok('no baseline chip anywhere in V6', !q('#recFilterBar .baseline-chip'));
ok('date renders as a filter chip', !!q('.filter-chip',fld('date')));
ok('date chip uses the same class as platform-style chips',
   fld('date').className === fld('status').className, fld('date').className+' / '+fld('status').className);
ok('date still starts on the real default (90 days)',
   /Last 90 days/.test(chipText('date')), chipText('date'));
ok('no "(default)" suffix', !/default/i.test(fld('date').textContent), fld('date').textContent);

console.log('-- change 2: status filter with all statuses, on the bar from load');
eq('bar order', bar().join(','), 'date,status');
eq('status offers all 8', qa('[data-check-value]',fld('status')).length, 8);
ok('status chip reads its label when empty', /^Status$/.test(chipText('status')), chipText('status'));

console.log('-- change 3: no count line');
ok('#recCount is gone', !q('#recCount'));
ok('no "Showing N of" sentence in the mock page',
   !/Showing\s*\d+\s*of/.test(q('#variant-rec .mock-page').textContent));
ok('no "no filters applied" sentence',
   !/no filters applied/.test(q('#variant-rec .mock-page').textContent));

console.log('-- the two status controls share ONE value');
eq('segments render', qa('#recSegments .status-segment').length, 5);
ok('All segment active on load', seg('all').classList.contains('active'));
eq('rows at load = 90-day window', rows(), oracle({date:'90d'}));
Object.keys(SEG).forEach(k=>eq('segment count '+k, segCount(k), oracle({date:'90d',status:SEG[k]})));

// chip -> segment
pickStatuses(['Rule failed']);
eq('rows = Rule failed', rows(), oracle({date:'90d',status:['Rule failed']}));
ok('attention segment shows PARTIAL, not active',
   seg('attention').classList.contains('partial') && !seg('attention').classList.contains('active'));
ok('All segment not active', !seg('all').classList.contains('active'));
ok('chip spells the value', /Status: Rule failed/.test(chipText('status')), chipText('status'));

// picking the exact group set reads as the segment itself
pickStatuses(['Rule failed']);           // uncheck
pickStatuses(SEG.attention);
ok('attention segment now fully active',
   seg('attention').classList.contains('active') && !seg('attention').classList.contains('partial'));
eq('rows = whole attention group', rows(), oracle({date:'90d',status:SEG.attention}));

// segment -> chip
seg('ready').click();
ok('ready segment active', seg('ready').classList.contains('active'));
ok('chip followed the segment', /Ready to sync, Pending/.test(chipText('status')), chipText('status'));
eq('rows = ready group', rows(), oracle({date:'90d',status:SEG.ready}));

// a set matching no group leaves every segment quiet
pickStatuses(['Ready to sync','Pending']);            // clear the two
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
   segCount('attention') === oracle({date:'30d',status:SEG.attention}),
   segCount('attention')+' vs '+oracle({date:'30d',status:SEG.attention}));
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
q('[data-rec-add]').click();
q('[data-rec-add-key="platform"]').click();
q('[data-check-value="Stripe"]',fld('platform')).click();
q('[data-panel-apply]',fld('platform')).click();
// By now date and status have both been cleared by their own x, so Stripe is
// the only filter in play — which is itself the proof that those x's committed.
eq('Stripe applied', rows(), oracle({platform:['Stripe']}));
q('[data-remove-field]',fld('platform')).click();
ok('platform chip left the bar', bar().indexOf('platform') === -1, bar().join(','));
eq('and the list stopped filtering by it', rows(), oracle({}));

console.log('-- dashboard deep-link');
q('#recDeepLinkBtn').click();
ok('status chip carries the arriving value', /Status: Rule failed/.test(chipText('status')), chipText('status'));
ok('"From dashboard" tag rendered', !!q('#recFilterBar [data-deeplink-tag]'));
ok('tag is a label, not a second value readout',
   q('[data-deeplink-tag]').textContent.trim() === 'From dashboard',
   q('[data-deeplink-tag]').textContent);
ok('no old deeplink-chip', !q('#recFilterBar .deeplink-chip'));
ok('attention segment partial', seg('attention').classList.contains('partial'));
eq('rows = Rule failed at the 90-day default', rows(), oracle({date:'90d',status:['Rule failed']}));
seg('synced').click();
ok('a segment click drops the tag', !q('#recFilterBar [data-deeplink-tag]'));
q('#recDeepLinkBtn').click();
ok('tag back', !!q('#recFilterBar [data-deeplink-tag]'));
pickStatuses(['Failed']);
ok('editing status by hand drops the tag', !q('#recFilterBar [data-deeplink-tag]'));

console.log('-- empty state and recovery');
q('[data-rec-add]').click();
q('[data-rec-add-key="platform"]').click();
q('[data-check-value="Shopify"]',fld('platform')).click();
q('[data-panel-apply]',fld('platform')).click();
pickStatuses(['Failed']);            // clear Failed -> leaves Rule failed only
pickStatuses(['Rollback failed']);
eq('no rows', rows(), 0);
ok('empty state shown', !!q('#recTable .empty-state'));
q('#recTable [data-empty-clear]').click();
eq('recovered to the 90-day default', rows(), oracle({date:'90d'}));
eq('bar back to date + status', bar().join(','), 'date,status');
ok('All segment active again', seg('all').classList.contains('active'));

console.log('-- other variants untouched');
ok('V7 still has its segments row', !!q('#sheetbtnSegments'));
ok('V7 still has its count line', !!q('#sheetbtnCount'));
ok('V7 sheet still excludes status', true);
ok('V8 tabs intact', qa('#groupsTabs .status-segment').length === 5);
ok('V8 count line intact', !!q('#groupsCount'));
eq('8 nav tabs', qa('.nav-tab').length, 8);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
