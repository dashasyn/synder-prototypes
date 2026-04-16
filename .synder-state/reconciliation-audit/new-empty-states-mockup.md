# New Empty States — Transaction & Balance Reconciliation
## Context
Synder updated both reconciliation pages ~March 24, 2026. Previous states were minimal (Balance Recon = blank page + one account selector; Transaction Recon = minimal, no guidance). New states add an illustration, description, and FAQ accordion.

---

## PAGE 1: Transaction Reconciliation (new empty state)
URL: go.synder.com/ui/transactionReconciliation
Label in nav: "Transaction reconciliation [Beta]"

### Page header
"Transaction reconciliation" + Beta badge

### Illustration
A graphic showing documents/transactions with checkmarks being matched — implies verification of data accuracy.

### Headline
"No reconciliations yet"

### Description text
"Run transaction reconciliation to verify that every transaction synced to your accounting software matches your original records. Catch discrepancies early and keep your books accurate."

### Primary CTA button
"New reconciliation" → navigates to /ui/transactionReconciliation/create

### FAQ accordion (collapsible Q&A, all closed by default)
**Q: What is transaction reconciliation?**
A: Transaction reconciliation is the process of comparing transactions synced to your accounting software against the source platform (e.g. Stripe, Shopify) to confirm they match. It helps identify missing transactions, duplicate syncs, or amount discrepancies.

**Q: When should I run transaction reconciliation?**
A: Run it after each sync period (monthly or quarterly) or any time you notice inconsistencies in your accounting reports. It's especially useful after large import batches or platform reconnections.

**Q: What discrepancies will reconciliation find?**
A: Reconciliation flags: missing transactions (in Synder but not in books, or vice versa), amount mismatches, duplicate entries, and transactions with incorrect dates or categories.

**Q: How long does a reconciliation take?**
A: Typically 1–5 minutes depending on the number of transactions. You'll get a summary report with all matched and unmatched items.

**Q: Can I reconcile a specific time period?**
A: Yes. When you create a new reconciliation, you can select a custom date range, a specific integration (e.g. Stripe only), or reconcile all platforms at once.

---

## PAGE 2: Balance Reconciliation (new empty state)
URL: go.synder.com/accounting/public/reconciliation/index.html/start

### Page header
"Balance reconciliation"

### Illustration
A scale or balance graphic showing two sides being compared — Synder data vs. financial source.

### Headline
"Reconcile your account balances"

### Description text
"Balance reconciliation compares your Synder totals against your original financial sources — bank statements, payment processor reports — to ensure every dollar is accounted for. Select an account below to get started."

### Account selector (form control, retained from old state)
Label: "Account"
Dropdown: "Select account..." (lists connected integrations: Stripe, Shopify, etc.)

### Secondary link
"Learn more" → help docs

### FAQ accordion (collapsible Q&A, all closed by default)
**Q: What is balance reconciliation?**
A: Balance reconciliation verifies that the total amounts in Synder match the totals reported by your original financial source (e.g. your Stripe dashboard or bank statement). It's a high-level check that your sync is capturing the right total amounts.

**Q: How is this different from transaction reconciliation?**
A: Transaction reconciliation checks individual transactions one by one. Balance reconciliation checks total amounts for a period — it's faster and shows if there's a gap, but doesn't tell you which specific transaction caused it.

**Q: Which accounts can I reconcile?**
A: Any connected integration with transaction data in Synder — Stripe, Shopify, PayPal, Square, and others. Select the account from the dropdown to begin.

**Q: What do the results mean?**
A: A "matched" result means your Synder totals equal your source totals for the selected period — your sync is complete and accurate. A "discrepancy" means there's a gap that needs investigation.

**Q: How often should I reconcile?**
A: Monthly is standard accounting practice. Some businesses reconcile weekly or after every import to catch issues early.

---

## PAGE 3: Reconciliation Details (updated page)
URL: go.synder.com/ui/transactionReconciliation/result/* or processLog/*

### What changed
The details page was also updated. It now shows:
- Clear matched vs. unmatched transaction breakdown
- Color-coded status indicators (green = matched, red = discrepancy, grey = excluded)
- Expandable row details showing the source transaction vs. the booked transaction side-by-side
- Export button for CSV download
- "Fix in Synder" quick action link on discrepancy rows

---

## DESIGN CONTEXT
- Synder uses MUI (Material UI) components
- Primary blue: #0053cc
- Neutral background with white content cards
- Accordion/FAQ uses standard MUI Accordion component with expand icon
- All FAQ questions are collapsed by default — user must actively click to expand
- The illustration is a custom SVG (not a stock image)
