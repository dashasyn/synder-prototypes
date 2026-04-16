# Settings Map — Exact Field Reference

> Precise field names, locations, and options as found in the live app. For Stripe (per-transaction mode) unless noted.

---

## Navigation Path to Settings

**Settings → Select integration at top → Select tab**

- Integration selector: dropdown top of settings page (shows: "Stripe", "Test", etc.)
- Main tab list: General | Sales | Invoices | Products/Services | Product mapping | Taxes | Fees | Application Fees | Expenses | Payouts | Multicurrency

---

## General Tab

**Settings → [Integration] → General**

| Field | Type | Options / Notes |
|-------|------|----------------|
| Auto-import | Toggle (On/Off) | If enabled, Synder fetches all new data from the platform automatically |
| Auto-sync | Toggle (On/Off) | If enabled, all new transactions are synced to books automatically |
| Skip synchronization of duplicated transactions | Toggle (On/Off) | Skips transactions already existing in accounting |
| Process transactions in multiple currencies | Toggle (On/Off) | If OFF, only home currency transactions sync |
| Archive Pending transactions after set number of days | Toggle (On/Off) | Auto-archives long-pending transactions |
| Apply location | Toggle (On/Off) | Assigns a location to each transaction. **Requires upgrade** |
| Sync payments without invoices as | Dropdown | Sales receipts / Deposits |
| Balance Reserve account | Dropdown | All QBO accounts listed |

---

## Sales Tab — Default subtab

**Settings → [Integration] → Sales → Default**

| Field | Type | Options / Notes |
|-------|------|----------------|
| Clearing account | Dropdown | All QBO accounts. Default: "Stripe (required for Synder)" |
| Payment Method | Dropdown | Amazon / American Express / Cash / Check / Diners Club / Discover / MasterCard / Shopify / Stripe / Visa |
| Posting date | Dropdown | Created date / Balance date |
| Enable QuickBooks Doc Numbers | Toggle (On/Off) | Transactions follow QBO Doc Number sequence |
| Customer name search priority | Drag-and-drop list | Set order: Name / Shipping address / Card/payment method / Description / Email / Billing name / Billing email |
| Apply generic customer | Toggle (On/Off) | Assigns a generic customer instead of individual customer per transaction |
| Applied Balance Account | Dropdown | All income accounts (used for Stripe applied balances) |
| Sync discounts as products | Toggle (On/Off) | Upgrade required |
| Payment method mapping | Table | Map platform accounts → QBO accounts (Add line button) |

---

## Sales Tab — Refund subtab

**Settings → [Integration] → Sales → Refund**

| Field | Type | Options / Notes |
|-------|------|----------------|
| Clearing account | Dropdown | Same list as Default. Default: "Stripe clearing (Synder)" |
| Use same customer as in original transaction | Toggle (On/Off) | Matches refund to original sale's customer |
| Use the same income account as in the original transaction | Toggle (On/Off) | Posts refund to same account as original |
| Refund product | Dropdown | QBO products list |

---

## Sales Tab — Additional Settings subtabs

**Settings → [Integration] → Sales → Create additional settings**

After clicking "Create additional settings", these transaction-type-specific tabs appear:

- Adjustment
- Advance / Advance funding
- Application fee / Application fee refund
- Balance transfer inbound/outbound
- Captured payment
- Chargeback
- Collection transfer / Contribution
- Financing paydown
- Invoice / Invoice payment
- Issuing authorization hold/release
- Issuing transaction / refund / refund reversal
- Order payment
- Payment / Payment failure / Payment failure refund
- Payment network reserve hold/release
- Payment unreconciled
- Payout / Payout cancel / Payout failure
- Payout minimum balance hold/release
- Reserve transaction / Reserved funds
- Stripe currency conversion fee
- Stripe fee / Stripe fee refund
- Subscription payment
- Tax fee / Top up / Transfer / Transfer reversal

**Each subtab has its own clearing account dropdown** for that specific transaction type.

### Example — Adjustment subtab:
**Settings → [Integration] → Sales → Adjustment**

| Field | Type |
|-------|------|
| Clearing account | Dropdown — all QBO accounts |

---

## Invoices Tab

**Settings → [Integration] → Invoices**

| Field | Type | Options / Notes |
|-------|------|----------------|
| Sync open invoices | Toggle (On/Off) | Syncs unpaid Stripe invoices to QBO as open AR |
| Apply payment to open invoices | Toggle (On/Off) | Matches incoming payments to existing open invoices |
| Sync zero invoices | Toggle (On/Off) | Whether to sync $0 invoices |
| Sync unpaid (open) invoices | Toggle (On/Off) | Controls AR syncing |

---

## Products/Services Tab

**Settings → [Integration] → Products/Services**

| Field | Type | Options / Notes |
|-------|------|----------------|
| Record transactions with | Radio | Original / Common (product/service name and SKU) |
| If original product missing, use | Dropdown | Stripe product / [other fallback] |
| Configure product search priority | Link | Opens drag-and-drop priority config |
| If matching product NOT found in accounting | Radio | Create new product / Cancel synchronization |
| Created product should be | Radio | Non-inventory / Service / Inventory |
| Default income account | Dropdown | All QBO income accounts |

---

## Taxes Tab

**Settings → [Integration] → Taxes**

| Field | Type | Options / Notes |
|-------|------|----------------|
| Apply Taxes | Toggle (On/Off) | Includes tax data from transactions; maps to QBO tax codes |
| Default tax code | Dropdown | All QBO tax codes (e.g., 10.0%, 5.6%, California 8%, Tucson 9.1%) |
| Apply generic tax code | Toggle (On/Off) | Applies one tax code to all transactions |

---

## Fees Tab

**Settings → [Integration] → Fees**

| Field | Type | Options / Notes |
|-------|------|----------------|
| Clearing account | Dropdown | All QBO accounts |
| Vendor | Dropdown | QBO vendors list |
| Category | Dropdown | QBO expense accounts |
| [Multiple fee type rows] | Table | Each fee type (Stripe fee, Stripe fee refund, etc.) has own clearing account |

---

## Application Fees Tab

**Settings → [Integration] → Application Fees**

| Field | Type | Options / Notes |
|-------|------|----------------|
| Clearing account | Dropdown | All QBO accounts |
| Vendor / Category | Dropdowns | QBO vendor and expense account |

---

## Payouts Tab

**Settings → [Integration] → Payouts**

| Field | Type | Options / Notes |
|-------|------|----------------|
| Bank account | Dropdown | QBO bank accounts |

---

## Multicurrency Tab

**Settings → [Integration] → Multicurrency**

| Field | Type | Options / Notes |
|-------|------|----------------|
| Process transactions in multiple currencies | Toggle (On/Off) | Must also be enabled in QBO |

---

## Shopify-Specific Settings

### General Tab (Shopify)

**Settings → [Shopify integration] → General**

| Field | Notes |
|-------|-------|
| Timezone | Must match Shopify store timezone |
| Auto-import / Auto-sync | Same as Stripe |
| Manual Orders | Enable to sync cash/check/bank transfer orders |
| POS Orders | Enable for in-person Shopify POS sales |
| Other Orders | Orders paid via unsupported gateways |

### Sales Tab (Shopify)

**Settings → [Shopify integration] → Sales**

Same structure as Stripe Sales but with Shopify-specific clearing accounts:
- Shopify (required for Synder)
- Shopify Manual Order (required for Synder)
- Shopify POS Order (required for Synder)
- Shopify Other Order (required for Synder)

### Additional Settings (Shopify)

**Settings → [Shopify integration] → Additional settings**

| Field | Notes |
|-------|-------|
| Auto-import | Toggle |
| Auto-sync | Toggle |
| Skip duplicates | Toggle |
| Multi-currency | Toggle |
| Archive Pending | Toggle |
| Apply location | Toggle (requires upgrade) |
| Sync payments without invoices as | Dropdown: Deposits / Sales receipts |
| Balance Reserve account | Dropdown |
| Timezone | Dropdown — critical: must match Shopify store timezone |

---

## Key UX Notes

- **Update button**: Every settings page has an **Update** button at the bottom. Changes are NOT saved until clicked.
- **Upgrade required**: "Apply location" and "Sync discounts as products" show an upgrade prompt.
- **Additional settings subtabs**: Only appear after clicking "Create additional settings" on the Sales tab. This is where per-transaction-type clearing accounts live (Adjustment, Payout, Chargeback, etc.).
- **Integration switcher**: At the top of Settings — switches between Stripe, Shopify, etc.
