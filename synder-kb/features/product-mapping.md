# Product Mapping

> Product mapping tells Synder which accounting product/service item to use when recording a platform sale. Critical for accurate revenue categorization and COGS tracking.

---

## Why Product Mapping Matters

When Synder syncs a sale, it needs to post revenue to a product/service item in QBO, Xero, or other accounting software. Each product has:
- An **income account** (where revenue goes)
- (Optional) A **COGS account** and inventory type

If Synder can't find the right product, it either:
- **Auto-creates** a new product (may be mapped to wrong income account)
- **Fails the sync** with "Entity cannot be synchronized without Product or Service" error

---

## How Synder Finds Products

**Default search behavior:**
1. Search accounting platform by product name (exact match)
2. If not found: search by SKU
3. If still not found: auto-create OR fail (depending on settings)

**Product search priority** is configurable — you can control whether Synder prioritizes name match or SKU match.

---

## Product Mapping Methods

### 1. Auto-Create (Default)
Synder automatically creates a product in QBO/Xero if no match is found.

- Uses the platform product name as the new product name
- Assigns the **default income account** configured in Settings
- Creates non-inventory service item by default

**Risk:** Auto-created products may go to the wrong income account. Review auto-created products periodically.

### 2. Manual Mapping (UI)
Map individual platform products to existing accounting products in the Products/Services tab.

**Path:** Settings → [Integration] → Products/Services tab → Product mapping section

### 3. Bulk CSV Import
Upload a CSV file to map many products at once.

**Path:** Settings → Product mapping → Upload a CSV file

---

## CSV Bulk Import

### When to Use
- Large product catalogs (100+ SKUs)
- Same product sold on multiple platforms with different names/SKUs
- Initial setup when migrating from another system

### File Requirements
- Format: CSV (.csv) only
- Max size: 10MB
- Required columns:
  - **Accounting product name** — exact name as it appears in QBO/Xero (spelling, capitalization, spacing must match)
  - **Integration product name/SKU** — name or SKU from platform

### Multi-to-One Mapping
Map multiple platform identifiers to a single accounting product by separating with commas:

```
Accounting product name,Integration product name/SKU
"Hoodie Black M","HD-BLK-M, AMZ-HOOD-BLK-M, Blk Hoodie M"
```

### Import Process
1. Settings → Product mapping → Download CSV template
2. Fill in template (accounting name + integration name/SKU)
3. Click "Upload a CSV file"
4. Upload CSV → Click "Map products"
5. Notification confirms import started
6. Large files may take several minutes; API limits may require retrying

### Behavior After Import
- Future syncs use the new mappings
- **Previously synced transactions are NOT retroactively updated**
- To correct historical records: rollback affected transactions → re-sync with new mappings

### Overwrite Behavior
If a mapping exists with the same accounting product name, the CSV upload **overwrites** it.

---

## Typical Multi-Platform Scenario

**Problem:** An ecommerce brand sells the same hoodie on Shopify and Amazon:
- Shopify SKU: `HD-BLK-M`, name: "Hoodie – Black / M"
- Amazon SKU: `AMZ-HOOD-BLK-M`, name: "Blk Hoodie M"

**Goal:** Both should post to "Hoodie Black M" in the ledger.

**Without mapping:** Synder creates two separate products (possibly to different income accounts), or fails.

**With CSV mapping:** One mapping row covers both SKUs → clean, single product record.

---

## QuickBooks Desktop Product Mapping

QB Desktop has slightly different product mapping behavior:

- Products must exist in QB Desktop before mapping
- SKU matching depends on QB Desktop's item list structure
- The Synder Connector must be running and connected for product lookups to work
- **Fetch data button:** In Smart Rules (and product mapping), click "Fetch data from QuickBooks Desktop" to refresh the list of available items

---

## Common Product Mapping Errors

### "Entity cannot be synchronized without Product or Service"

**Two root causes:**
1. **Auto-create failed** — platform product name has special characters (some accounting APIs reject them)
2. **"Cancel sync if no matching product" setting active** — Synder couldn't find a match and is configured to stop

**Fix:**
- Set up explicit product mapping via CSV or manual mapping
- If special characters: create the product manually in QBO/Xero with a clean name, then map it
- Adjust "product search priority" settings

### "No matching product found in accounting"

**Cause:** Synder searched by name/SKU and found nothing.

**Common triggers:**
- Name spelled differently in accounting vs. platform (capitalization, spacing)
- Product exists in accounting but was recently created (not yet fetched)
- Multi-platform seller: Shopify disconnected at sync time → SKU data unavailable

**Fix:**
- Verify exact product name in accounting
- Set up explicit mapping
- Re-sync if product was recently created

### Auto-created product mapped to wrong income account

**Cause:** Synder auto-created the product using the default income account, which is set to a general/catch-all account.

**Fix:**
- Edit the product in QBO/Xero directly → change its income account
- **Prevention:** Set up product mapping before syncing to avoid auto-creation

---

## Product Mapping Tips

| Tip | Why |
|-----|-----|
| Set up mapping before first sync | Prevents auto-creation to wrong accounts |
| Review auto-created products weekly | Catch misrouted income early |
| Map top 10-20 products first | 80/20 rule — covers most revenue |
| Use commas in CSV to consolidate SKUs | Multi-platform consistency |
| Match accounting name exactly (case, spacing) | API matching is strict |
| Use SKU matching when names are inconsistent | More reliable than name for multi-platform |

---

## Product Mapping and Inventory

If products are set up as **inventory items** in QBO/Xero:
- Synder can track quantity changes as orders sync
- COGS recorded when items are sold
- Inventory sync is **one-way only**: platform → accounting (not back)
- Manual inventory adjustments in Shopify do NOT sync to books
- Bundles/assemblies: Large plan only

> ⚠️ Set up inventory items in accounting before syncing historical transactions. Otherwise, quantity counts will be wrong from the start.
