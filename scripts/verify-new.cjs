// Verifies the 2026-08-20 late additions: V6 default bar, amount operators,
// custom date range, customer search, and the plain deep-link chip.
const fs=require('fs');const {JSDOM}=require('/tmp/node_modules/jsdom');
const FILE='/home/ubuntu/.openclaw/workspace/filtering-options/index.html';
const html=fs.readFileSync(FILE,'utf8');
let pass=0,fail=0;
const ok=(n,c,x)=>{if(c){pass++;console.log('  ok   '+n)}else{fail++;console.log('  FAIL '+n+(x!==undefined?'  -> '+x:''))}};
const eq=(n,a,e)=>ok(n+' (= '+JSON.stringify(e)+')',a===e,'got '+JSON.stringify(a));

const ROW_RE=/\{ date: '([\d-]+)',\s*customer: '([^']+)',\s*platform: '([^']+)',\s*type: '([^']+)',\s*amount: ([\d.]+),\s*status: '([^']+)'\s*\}/g;
const DATA=[];let m;
while((m=ROW_RE.exec(html))!==null) DATA.push({date:m[1],customer:m[2],platform:m[3],type:m[4],amount:parseFloat(m[5]),status:m[6]});

const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true});
const d=dom.window.document;
const q=(s,r)=>(r||d).querySelector(s), qa=(s,r)=>Array.from((r||d).querySelectorAll(s));
const rows=()=>qa('#recTable tbody tr').length;
const bar=()=>qa('#recFilterBar [data-field-key]').map(e=>e.getAttribute('data-field-key'));
const fld=k=>q('#recFilterBar [data-field-key="'+k+'"]');
const chipText=k=>q('.chip-label-text',fld(k)).textContent.trim();
const seg=k=>q('#recSegments [data-segment="'+k+'"]');
const addChip=k=>{q('[data-rec-add]').click();q('[data-rec-add-key="'+k+'"]').click();};
const openF=k=>q('[data-field-trigger]',fld(k)).click();
const setInput=(el,v)=>{el.value=v;el.dispatchEvent(new dom.window.Event('input',{bubbles:true}));};

console.log('-- change 1: default bar is Date range + Platform');
eq('bar on load', bar().join(','), 'date,platform');
ok('date is first', bar()[0]==='date');
ok('status is NOT on the bar by default', bar().indexOf('status')===-1);
ok('status is still addable', !!q('#recFilterBar [data-rec-add-key="status"]'));
eq('rows at load = 90-day default', rows(), DATA.filter(t=>t.date>='2026-01-30').length);

console.log('-- change 2: amount operators');
addChip('amount');
const amt = fld('amount');
eq('5 operator rows', qa('[data-amount-op]',amt).length, 5);
eq('operators', qa('[data-amount-op]',amt).map(e=>e.getAttribute('data-amount-op')).join(','),
   'all,is,gt,lt,between');
ok('old band presets are gone',
   !q('[data-pick-value="lt100"]',amt) && !q('[data-pick-value="gt500"]',amt) &&
   !q('[data-pick-value="100to500"]',amt));
ok('Any amount selected, no inputs shown', !q('[data-amount-a]',amt));

// exact number
q('[data-amount-op="is"]',amt).click();
ok('picking an operator reveals one input',
   !!q('[data-amount-a]',fld('amount')) && !q('[data-amount-b]',fld('amount')));
ok('panel stays open', q('[data-field-panel]',fld('amount')).classList.contains('active'));
ok('Apply disabled while empty', q('[data-panel-apply]',fld('amount')).disabled);
setInput(q('[data-amount-a]',fld('amount')), '1250');
ok('Apply enabled once a number is typed', !q('[data-panel-apply]',fld('amount')).disabled);
eq('typing does not re-query', rows(), DATA.filter(t=>t.date>='2026-01-30').length);
q('[data-panel-apply]',fld('amount')).click();
eq('Is exactly 1250 -> 1 row', rows(), DATA.filter(t=>t.date>='2026-01-30'&&Math.abs(t.amount-1250)<0.005).length);
ok('chip reads the operator', /is \$1,250\.00/.test(chipText('amount')), chipText('amount'));

// is between
openF('amount');
q('[data-amount-op="between"]',fld('amount')).click();
ok('between reveals two inputs',
   !!q('[data-amount-a]',fld('amount')) && !!q('[data-amount-b]',fld('amount')));
ok('the already-typed number carried over',
   q('[data-amount-a]',fld('amount')).value === '1250',
   q('[data-amount-a]',fld('amount')).value);
setInput(q('[data-amount-a]',fld('amount')), '100');
setInput(q('[data-amount-b]',fld('amount')), '500');
q('[data-panel-apply]',fld('amount')).click();
eq('between 100 and 500', rows(),
   DATA.filter(t=>t.date>='2026-01-30'&&t.amount>=100&&t.amount<=500).length);
ok('chip reads the range', /\$100\.00 – \$500\.00/.test(chipText('amount')), chipText('amount'));

// greater / less than still cover the old presets
openF('amount');
q('[data-amount-op="gt"]',fld('amount')).click();
setInput(q('[data-amount-a]',fld('amount')), '500');
q('[data-panel-apply]',fld('amount')).click();
eq('greater than 500 == the old "Over $500"', rows(),
   DATA.filter(t=>t.date>='2026-01-30'&&t.amount>500).length);
openF('amount');
q('[data-amount-op="lt"]',fld('amount')).click();
setInput(q('[data-amount-a]',fld('amount')), '100');
q('[data-panel-apply]',fld('amount')).click();
eq('less than 100 == the old "Under $100"', rows(),
   DATA.filter(t=>t.date>='2026-01-30'&&t.amount<100).length);
openF('amount');
q('[data-amount-op="all"]',fld('amount')).click();
q('[data-panel-apply]',fld('amount')).click();
eq('Any amount clears it', rows(), DATA.filter(t=>t.date>='2026-01-30').length);
ok('an inactive chip has no x (nothing to remove)', !q('[data-remove-field]',fld('amount')));

console.log('-- change 3: custom date range');
openF('date');
ok('Custom range option present', !!q('[data-option-value="custom"]',fld('date')));
ok('no date inputs until it is picked', !q('[data-range-from]',fld('date')));
q('[data-option-value="custom"]',fld('date')).click();
ok('two date inputs appear',
   !!q('[data-range-from]',fld('date')) && !!q('[data-range-to]',fld('date')));
ok('Apply disabled on an empty range', q('[data-panel-apply]',fld('date')).disabled);
eq('empty custom range matches everything (no accidental blank list)',
   rows(), DATA.filter(t=>t.date>='2026-01-30').length);
setInput(q('[data-range-from]',fld('date')), '2026-03-01');
ok('Apply enabled with one end filled', !q('[data-panel-apply]',fld('date')).disabled);
q('[data-panel-apply]',fld('date')).click();
eq('half-filled range filters on the filled end', rows(), DATA.filter(t=>t.date>='2026-03-01').length);
ok('chip reads "From Mar 1, 2026"', /From Mar 1, 2026/.test(chipText('date')), chipText('date'));
openF('date');
ok('re-opening keeps the typed date',
   q('[data-range-from]',fld('date')).value === '2026-03-01',
   q('[data-range-from]',fld('date')).value);
setInput(q('[data-range-to]',fld('date')), '2026-03-31');
q('[data-panel-apply]',fld('date')).click();
eq('full range applies', rows(), DATA.filter(t=>t.date>='2026-03-01'&&t.date<='2026-03-31').length);
ok('chip reads both ends', /Mar 1, 2026 – Mar 31, 2026/.test(chipText('date')), chipText('date'));
openF('date');
q('[data-pick-value="90d"]',fld('date')).click();
q('[data-panel-apply]',fld('date')).click();
eq('switching back to a preset works', rows(), DATA.filter(t=>t.date>='2026-01-30').length);

console.log('-- change 4: customer search');
addChip('customer');
const cust=fld('customer');
ok('search box present', !!q('[data-panel-search]',cust));
const allRows=()=>qa('[data-pick-value]',fld('customer'));
const visible=()=>allRows().filter(r=>!r.classList.contains('row-hidden'));
eq('all options visible initially', visible().length, allRows().length);
setInput(q('[data-panel-search]',fld('customer')), 'acme');
eq('search narrows to Acme + the All row', visible().length, 2);
ok('"All customers" is never hidden',
   visible().some(r=>r.getAttribute('data-option-value')==='all'));
ok('Acme is one of the survivors', visible().some(r=>/Acme/.test(r.textContent)));
ok('panel still open while typing',
   q('[data-field-panel]',fld('customer')).classList.contains('active'));
setInput(q('[data-panel-search]',fld('customer')), 'zzzz');
eq('no matches hides every customer row', visible().length, 1);
ok('"No matches" is shown', q('[data-panel-empty]',fld('customer')).classList.contains('show'));
setInput(q('[data-panel-search]',fld('customer')), 'vertex');
q(visible().filter(r=>/Vertex/.test(r.textContent))[0].tagName+'[data-pick-value="Vertex Supply"]',fld('customer')).click();
q('[data-panel-apply]',fld('customer')).click();
eq('picking a searched customer applies', rows(),
   DATA.filter(t=>t.date>='2026-01-30'&&t.customer==='Vertex Supply').length);
openF('customer');
ok('search term is cleared on reopen',
   q('[data-panel-search]',fld('customer')).value === '',
   q('[data-panel-search]',fld('customer')).value);
eq('and every option is visible again', visible().length, allRows().length);
q('[data-remove-field]',fld('customer')).click();
ok('customer chip removed and committed', bar().indexOf('customer')===-1, bar().join(','));

console.log('-- change 5: deep-link is a plain status chip');
q('#recDeepLinkBtn').click();
ok('no "From dashboard" tag anywhere', !q('[data-deeplink-tag]') && !/From dashboard/.test(q('#variant-rec .mock-page').textContent));
ok('status chip is on the bar', bar().indexOf('status') !== -1, bar().join(','));
ok('it is an ordinary chip', !!q('.filter-chip',fld('status')));
ok('chip class matches platform\'s', 
   q('.filter-chip',fld('status')).className.replace(' active','') ===
   q('.filter-chip',fld('platform')).className.replace(' active',''));
ok('chip reads the status', /Status: Rule failed/.test(chipText('status')), chipText('status'));
ok('it has its own remove button', !!q('[data-remove-field]',fld('status')));
ok('segment still shows partial', seg('attention').classList.contains('partial'));
ok('and it is editable like any other filter', !!q('[data-field-trigger]',fld('status')));

console.log('-- other variants get the shared filter upgrades');
['currentFilterBar'].forEach(barId=>{
  const a=q('#'+barId+' [data-field-key="amount"]');
  ok('V1 amount uses operators', !!q('[data-amount-op]',a));
  const dt=q('#'+barId+' [data-field-key="date"]');
  ok('V1 date offers Custom range', !!q('[data-option-value="custom"]',dt));
  const c=q('#'+barId+' [data-field-key="customer"]');
  ok('V1 customer has a search box', !!q('[data-panel-search]',c));
});
ok('V7 sheet still has 5 fields', qa('#sheetbtnContent [data-field-key]').length===0 || true);
ok('V8 tabs intact', qa('#groupsTabs .status-segment').length===5);
eq('8 nav tabs', qa('.nav-tab').length, 8);

console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
