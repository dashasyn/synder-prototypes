// Verifies the reworked variant 7: sheet owns every filter (status included),
// no segments row, no count line, radio rows for single-select panels.
const fs = require('fs');
const { JSDOM } = require('/tmp/node_modules/jsdom');
const FILE = '/home/ubuntu/.openclaw/workspace/filtering-options/index.html';
const html = fs.readFileSync(FILE, 'utf8');
let pass=0, fail=0;
const ok=(n,c,x)=>{if(c){pass++;console.log('  ok   '+n)}else{fail++;console.log('  FAIL '+n+(x!==undefined?'  -> '+x:''))}};
const eq=(n,a,e)=>ok(n+' (= '+JSON.stringify(e)+')', a===e, 'got '+JSON.stringify(a));

const ROW_RE = /\{ date: '([\d-]+)',\s*customer: '([^']+)',\s*platform: '([^']+)',\s*type: '([^']+)',\s*amount: ([\d.]+),\s*status: '([^']+)'\s*\}/g;
const DATA=[]; let m;
while ((m = ROW_RE.exec(html)) !== null) DATA.push({date:m[1],customer:m[2],platform:m[3],type:m[4],amount:parseFloat(m[5]),status:m[6]});
const W={all:null,'7d':['2026-04-24','2026-04-30'],'30d':['2026-04-01','2026-04-30'],'90d':['2026-01-30','2026-04-30'],month:['2026-04-01','2026-04-30'],lastmonth:['2026-03-01','2026-03-31']};
function oracle(f){f=f||{};return DATA.filter(t=>{
  const w=W[f.date||'all']; if(w&&!(t.date>=w[0]&&t.date<=w[1]))return false;
  if(f.status&&f.status.length&&f.status.indexOf(t.status)===-1)return false;
  if(f.platform&&f.platform.length&&f.platform.indexOf(t.platform)===-1)return false;
  if(f.type&&f.type.length&&f.type.indexOf(t.type)===-1)return false;
  if(f.customer&&f.customer!=='all'&&t.customer!==f.customer)return false;
  if(f.q){const q=f.q.toLowerCase(); if(t.customer.toLowerCase().indexOf(q)===-1&&t.platform.toLowerCase().indexOf(q)===-1)return false;}
  return true;});}

const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true });
const D = dom.window.document;
const q=(s,r)=>(r||D).querySelector(s), qa=(s,r)=>Array.from((r||D).querySelectorAll(s));
const rows=()=>qa('#sheetbtnTable tbody tr');
const chips=()=>qa('#sheetbtnChips .applied-chip').map(c=>c.textContent.trim());
const open=()=>q('#sheetbtnFiltersBtn').click();
const field=k=>q('#sheetbtnContent [data-field-key="'+k+'"]');

console.log('-- the three requested changes');
ok('no segments row in variant 7', !q('#sheetbtnSegments'));
ok('no "Showing N of M" count line', !q('#sheetbtnCount'));
ok('count text is gone from the section',
   !/Showing\s*\d+\s*of/.test(q('#variant-sheetbtn .mock-page').textContent),
   q('#variant-sheetbtn .mock-page').textContent.slice(0,120));
open();
eq('sheet holds all 6 filters', qa('#sheetbtnContent [data-field-key]').length, 6);
ok('status IS one of them', !!field('status'));
eq('field order', qa('#sheetbtnContent [data-field-key]').map(e=>e.getAttribute('data-field-key')).join(','),
   'date,status,platform,type,amount,customer');
eq('status offers all 8 statuses', qa('[data-check-value]', field('status')).length, 8);

console.log('-- radio rows for single-select panels');
['date','amount','customer'].forEach(k=>{
  ok(k+' renders radio rows', qa('.dropdown-radio-item input[type="radio"]', field(k)).length > 0);
  ok(k+' has no bare checkmark rows', qa('.dropdown-item', field(k)).length === 0);
});
['status','platform','type'].forEach(k=>{
  ok(k+' still renders checkboxes', qa('.dropdown-checkbox-item input[type="checkbox"]', field(k)).length > 0);
});
eq('date radios = 6 options', qa('.dropdown-radio-item', field('date')).length, 6);
ok('exactly one date radio checked',
   qa('.dropdown-radio-item input:checked', field('date')).length === 1);

console.log('-- radio picks still work and stage (Apply-gated)');
const before = rows().length;
q('.dropdown-radio-item[data-pick-value="30d"]', field('date')).click();
eq('picking a date does NOT re-query', rows().length, before);
ok('trigger text updated', /Last 30 days/.test(q('[data-field-trigger]', field('date')).textContent),
   q('[data-field-trigger]', field('date')).textContent);

console.log('-- status stages in the sheet, commits on Apply');
q('[data-check-value="Failed"]', field('status')).click();
q('[data-check-value="Pending"]', field('status')).click();
eq('status toggles do NOT re-query', rows().length, before);
ok('badge counts VALUES incl. status',
   /Apply 3 filters/.test(q('#sheetbtnApplyBtn').textContent), q('#sheetbtnApplyBtn').textContent);
q('#sheetbtnApplyBtn').click();
eq('rows after Apply', rows().length, oracle({date:'30d',status:['Failed','Pending']}).length);
ok('sheet closed', !q('#sheetbtnSheet').classList.contains('active'));
eq('badge shows 3', q('#sheetbtnBadge').textContent, '3');

console.log('-- status now gets a chip like every other dimension');
ok('a status chip exists', chips().some(c=>/^Status:/.test(c)), chips().join(' | '));
ok('chip spells the values', chips().some(c=>/Failed, Pending/.test(c)), chips().join(' | '));
eq('2 chips (date + status)', chips().length, 2);

console.log('-- removing the status chip commits');
q('#sheetbtnChips [data-drop="status"]').click();
eq('rows after dropping status', rows().length, oracle({date:'30d'}).length);
ok('status chip gone', !chips().some(c=>/^Status:/.test(c)), chips().join(' | '));

console.log('-- Reset clears everything the sheet owns, status included');
open();
q('[data-check-value="Synced"]', field('status')).click();
q('#sheetbtnResetBtn').click();
eq('draft status cleared', qa('[data-check-value]:checked', field('status')).length, 0);
ok('Apply back to neutral label', /Apply filters/.test(q('#sheetbtnApplyBtn').textContent),
   q('#sheetbtnApplyBtn').textContent);
q('#sheetbtnApplyBtn').click();
eq('all rows back', rows().length, 26);
eq('no chips', chips().length, 0);

console.log('-- search still commits on Enter and combines');
open();
q('[data-check-value="Synced"]', field('status')).click();
q('#sheetbtnApplyBtn').click();
const inp = q('#sheetbtnSearch');
inp.value = 'Stripe';
inp.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
eq('rows = Synced + Stripe search', rows().length, oracle({status:['Synced'],q:'Stripe'}).length);

console.log('-- Clear all resets status too');
q('#sheetbtnChips [data-clear]').click();
eq('rows back to search-only', rows().length, oracle({q:'Stripe'}).length);

console.log('-- other variants untouched');
ok('V6 segments still there', qa('#recSegments .status-segment').length === 5);
ok('V8 tabs still there', qa('#groupsTabs .status-segment').length === 5);
ok('V8 count line still there (it earns it)', !!q('#groupsCount'));
ok('V1 date panel still uses checkmark rows, not radios',
   qa('#currentFilterBar [data-field-key="date"] .dropdown-item').length > 0 &&
   qa('#currentFilterBar [data-field-key="date"] .dropdown-radio-item').length === 0);
eq('8 nav tabs', qa('.nav-tab').length, 8);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
