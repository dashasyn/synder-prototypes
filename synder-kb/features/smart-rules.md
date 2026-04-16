# Smart Rules

> Smart Rules are conditional automation rules that modify or enrich transactions **after** they're synced to the accounting platform. They run as a post-sync processing step.

---

## What Smart Rules Do

Smart Rules apply if-then logic to transactions at sync time. They can:

- Fill missing information (e.g., add a class when platform doesn't provide one)
- Update transaction fields (description, product, customer, service date)
- Apply categories based on metadata or product name
- Route transactions to different accounts or classes based on conditions
- Handle special cases like disputes/chargebacks and taxes by location

---

## How Rules Work

**Processing order:**
1. Transaction synced from payment platform → creates accounting record (Sales Receipt, Invoice, etc.)
2. Smart Rule evaluates the condition against the created record
3. If condition matches → Action is applied → accounting record is updated

**Two update scopes:**
- **Update Current** — updates the entire transaction record
- **Update Line** — updates specific line items within a multi-line transaction (preferred for line-item accuracy)

---

## Trigger Types (Transaction Types)

Rules can be triggered by these accounting document types being created:
- Invoice
- Sales Receipt
- Journal Entry (for RevRec use cases)
- Payment
- Refund Receipt
- Expense/Bill

---

## Condition Fields

Rules can evaluate conditions based on:
- Shipping address
- Product name / line item product
- Description / Memo
- Currency
- Customer
- Metadata (from platforms that support it)

**Condition operators:** Contains, Equals, Starts with, etc.

---

## Action Types

When a condition matches, rules can:
- Set/update **Class** or **Location**
- Set/update **Description**
- Set/update **Service Date**
- Set/update **Customer**
- Set/update **Product or Service** (line item)
- Apply **Tax codes** (e.g., by location for Canadian GST/HST)
- Set **QuickBooks Entity Data**

---

## Creating a Rule (Example: Apply Class to Invoices)

1. Left sidebar → **Smart Rules** → Rules → **Create rule**
2. Select trigger: e.g., "Invoice" → "Created"
3. Click **Condition**:
   - Select field: "Line: Product or Service" → "Name" → "Contains" → enter keyword (e.g., "oak")
4. Click **Action**:
   - Select: "Invoice" → "Update Line" → "Set QuickBooks Entity Data"
   - Select field: "Class" → value: "Tree"
5. Click **Submit** → **Save & Close rule**
6. Sync a test transaction to verify (check logs for "Executed" status)

---

## Rule Execution Logs

After syncing with a rule active:
- Logs show "Executed" for transactions where rule applied
- Click "See Execution Details" to inspect what was changed

**Failed rule status:** Transaction shows "Rule Failed" in Platform Transactions view. Click Explain for details.

---

## Availability

| Platform | Smart Rules Available |
|----------|----------------------|
| QuickBooks Online | ✅ (all plans) |
| Xero | ✅ (most rule types) |
| QuickBooks Desktop | ✅ (Scale plan+, Connector v1.9.0+) |
| Sage Intacct | Limited |
| NetSuite | Limited |

> **QBO Revenue Recognition note:** If a rule triggers on a line item with Revenue Recognition enabled, the rule may fail with: "Enter a service date for the revenue recognition line item" — because QBO Advanced's RevRec feature requires a service date on those items. Fix: add a "Set Service Date" action to the rule, or disable QBO's native RevRec if using Synder RevRec instead.

---

## QuickBooks Desktop Specifics

- Rules require Synder Connector version 1.9.0+
- Scale plan minimum
- Available trigger fields: Shipping address, Product name, Description, Memo, Currency, Customer
- **Data freshness:** If new QBO Desktop entities (Classes, Products, Customers, Taxes) are added, click **"Fetch data from QuickBooks Desktop"** in Smart Rules to refresh the dropdown options

---

## Common Use Cases

| Use Case | Condition | Action |
|----------|-----------|--------|
| Apply class by product type | Product name Contains "oak" | Set Class = "Wood Products" |
| Route Canada sales tax | Shipping address Contains "Ontario" | Apply Tax = "HST 13%" |
| Update description when empty | Description is empty | Set Description = "Online Sale" |
| Change product on old invoices | Product name = "Legacy SKU" | Update Line → Set Product = "New SKU" |
| Categorize chargebacks | Transaction type = Dispute | Set Account = "Chargebacks Expense" |
| Apply class to RevRec journal entries | Journal Entry Created | Set Class = "Subscription Revenue" |

---

## Error: "Enter a service date for the revenue recognition line item"

**Who sees this:** QBO Advanced users with QBO's native Revenue Recognition feature enabled, who have Smart Rules on line items.

**Cause:** QBO requires a service date on any line item associated with its Revenue Recognition feature. Synder's Smart Rule creates/updates a line item without providing this required date.

**Fix:**
- Add "Set Service Date" action to the rule, OR
- Disable QBO's native Revenue Recognition if using Synder RevRec (the two shouldn't run simultaneously)

---

## Limitations

- Rules apply to **new syncs only** — existing synced transactions are not retroactively updated by a new rule
- To apply a rule to historical data: Rollback affected transactions → re-sync
- Rules can't create new transaction types (only modify existing ones)
- QBO Desktop dropdowns may be stale until "Fetch data" is clicked
