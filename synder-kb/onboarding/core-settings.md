# Core Settings Configuration

> The settings that must be configured before the first sync. Getting these right prevents 90% of common errors. Estimated time: 10–15 minutes.

> ⚠️ **Do not enable Auto-Sync until settings are validated with a test sync.**

---

## Accessing Settings

- Left menu → **Settings**
- Select your integration at the top (e.g., Stripe, Shopify, PayPal)
- Multiple tabs: General, Sales, Products/Services, Tax, etc.

---

## The 6 Core Settings

### 1. Income Account
**What it controls:** Where Synder records sales revenue.

**How it works:**
- Income accounts are linked to **products**, not set globally in Synder
- Each product in QBO/Xero has an income account assigned
- When syncing, Synder uses the account tied to the matched product
- If product doesn't exist: Synder auto-creates it using the **default income account** set in Settings

**Risk if skipped:** Revenue posts to wrong or uncategorized account → inaccurate P&L.

**Setup path:** Settings → [Integration] → Sales → Default Income Account

---

### 2. Clearing Account
**What it controls:** Intermediate account between payment platform balance and bank account.

**How it works:**
- Synder auto-creates a default clearing account per integration (e.g., "Stripe Required for Synder")
- Sales post to clearing account first; payouts transfer clearing → bank
- The clearing account balance should reflect funds "in transit" at your payment processor

**Risk if misconfigured:** If you point clearing account to your main checking account, payouts won't reconcile.

**Rule:** Keep one dedicated clearing account **per payment platform**. Never use your main bank account.

**Setup path:** Settings → [Integration] → Sales → Clearing Account (default is fine for most users)

---

### 3. Processing Fees Account
**What it controls:** Where platform fees (Stripe, PayPal, etc.) are recorded as expenses.

**Risk if skipped:** Fees netted against income instead of tracked as separate expenses → understated true costs.

**Setup path:** Settings → [Integration] → Sales → Fee Account
> Use or create an expense account like "Payment Processing Fees" or "Merchant Fees"

---

### 4. Product Mapping
**What it controls:** How Synder matches platform products to accounting items.

**Options:**
- **Auto-create:** Synder creates new product in QBO/Xero using platform product name/SKU
- **Manual mapping:** User explicitly maps each platform product to an accounting item
- **CSV bulk import:** Upload a mapping file for large catalogs

**Risk if skipped:** Duplicate products in accounting, or sync errors if product not found.

**Special cases:**
- Products with special characters in names may fail auto-create → manual mapping required
- Shipping items have separate mapping rules
- SKU-based matching requires the e-commerce platform to be connected at sync time

**Setup path:** Settings → [Integration] → Products/Services tab → Product mapping section

---

### 5. Tax Settings
**What it controls:** How sales tax is recorded.

**Key toggle — Apply Taxes:**
- **ON:** Synder includes tax data from transactions (maps to tax codes)
- **OFF:** Transactions sync without tax details (use if handling tax separately)

**Risk if skipped:** Tax not recorded, or posted to wrong tax code → problems at filing.

**Setup path:** Settings → [Integration] → Tax section

---

### 6. Sync Mode
**What it controls:** Per-Transaction vs Summary. See `sync-modes.md` for full detail.

**Setup path:** Settings → [Integration] → General → Sync Mode

---

## Account Types Summary

| Account | Role | Example Name |
|---------|------|--------------|
| Income Account | Where revenue posts | "Sales Income" |
| Clearing Account | Platform balance in transit | "Stripe Clearing" |
| Bank Account | Real checking account | "Business Checking" |
| Fee Account | Processing fees as expenses | "Merchant Fees" |

---

## First Sync Workflow

1. **Don't turn on Auto-Sync yet**
2. Import 5 transactions (small date range, last 3 days)
3. Review in Synder before syncing
4. Sync 1–2 test transactions
5. Open QBO/Xero and verify:
   - Amount correct?
   - Income to right account?
   - Fees to fee account?
   - Clearing received gross amount?
6. If anything wrong: **Rollback in Synder** → fix settings → re-sync
7. After validation: Enable Auto-Sync

> ⚠️ Never edit synced transactions directly in QBO/Xero. Always Rollback in Synder first, fix settings, then re-sync. Manual edits risk being overwritten or creating duplicates.

---

## Shopify-Specific Settings

| Setting | Path | Notes |
|---------|------|-------|
| Time Zone | Settings → Shopify → General | Must match Shopify store timezone to avoid date mismatches |
| Manual Orders | Settings → Shopify → General | Enable to sync cash/check/bank transfer orders |
| POS Orders | Settings → Shopify → General | Enable for in-person Shopify POS sales |
| Other Orders | Settings → Shopify → General | Orders paid via unsupported gateways (Klarna, Afterpay) |
| Shop Cash | Settings → Shopify → Additional Settings | Must add manually or Shop Cash transactions will be missing |

---

## Auto-Sync Notes

- **Trial users:** Must sync manually (no auto-sync)
- **Pro plan users:** Auto-sync intentionally paused until onboarding call with CSM
- **Paid plans (Medium+):** Auto-sync available after enabling in Settings

**Path to enable:** Settings → [Integration] → Auto-Sync toggle → Set start date → Save

> Auto-sync only works **forward** from enabled date. Missed/historical transactions require manual import.

---

## Update Button

After changing any settings: click **Update** at bottom of settings page to save. Changes don't apply to already-synced transactions — only to future syncs.
