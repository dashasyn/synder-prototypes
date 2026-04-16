# Accounting Platform Differences

> How each supported accounting platform (Books) behaves differently in Synder. Critical for understanding platform-specific UX flows, limitations, and support scope.

---

## Platform Selection is Permanent

> ⚠️ **Reminder:** Selecting an accounting platform during org setup is a one-way decision. Users cannot switch platforms within an org. They must create a new organization (with new billing) to use a different accounting system.

---

## QuickBooks Online (QBO)

**Most common integration.** Full feature support.

### Connection
- OAuth-based, instant
- Requires admin access in QBO
- Prompted for sync mode (Per-Transaction or Summary) immediately after connecting

### Feature Support
| Feature | Availability |
|---------|-------------|
| Per-Transaction mode | ✅ Full |
| Summary mode | ✅ Full |
| Smart Rules | ✅ Full |
| Smart Reconciliation | ✅ Full |
| Revenue Recognition (RevRec) | ✅ Full |
| Deferred Revenue Reconciliation Report | ✅ Full |
| Product mapping | ✅ Full |
| Multi-currency | ✅ (must enable in QBO first: Settings → Advanced → Currency) |
| Auto-sync | ✅ |

### QBO-Specific Behaviors

**Multi-currency constraint:** Customer records in QBO are tied to a specific currency. If a transaction comes in for a customer in a different currency, QBO requires a separate customer record. Synder auto-creates one — expected behavior, not a bug.

**"Automatically Apply Credits" conflict:** QBO's automation setting conflicts with Synder's invoice payment application. Warning appears in Synder; must be disabled in QBO (Settings → Advanced → Automation).

**Accounting periods:** QBO allows locking accounting periods. Attempting to sync into a locked period returns an error. Must reopen the period in QBO first.

**Doc Numbers:** If QBO Doc Numbers are enabled, Synder's transaction IDs are replaced, breaking line-by-line matching in the Deferred Revenue Reconciliation Report.

**Product income accounts:** Products in QBO have income accounts assigned. Synder respects these assignments — changing a product's account in QBO affects future syncs.

### Plans Required
- Most features: Starter+
- RevRec: requires RevRec add-on
- Sage/NetSuite: N/A (separate platforms)

---

## Xero

**Full-featured, second most common.** Similar to QBO with some differences.

### Connection
- OAuth-based
- Admin access required in Xero
- Sync mode choice presented after connection

### Feature Support
| Feature | Availability |
|---------|-------------|
| Per-Transaction mode | ✅ Full |
| Summary mode | ✅ Full |
| Smart Rules | ✅ Most types |
| Smart Reconciliation | ✅ Full |
| RevRec | Limited (primarily QBO) |
| Multi-currency | ✅ |
| Auto-sync | ✅ |

### Xero-Specific Behaviors

**"No Items Available to Sell" error:** Xero items must be marked "I sell this item" to be usable in sales transactions. Auto-created items may not have this checked. Fix: Edit item in Xero → enable "I sell this item."

**Duplicate contacts error:** Xero doesn't handle duplicate customer records gracefully. "Customer already exists" errors require merging/deduplicating contacts in Xero directly.

**Track categories:** Xero equivalent of QBO Classes. Smart Rules can apply track categories.

---

## QuickBooks Desktop

**More complex setup; requires local connector software.**

### Connection
- Requires installing **Synder Connector** on the same machine as QB Desktop
- Not cloud-based — connector bridges Synder cloud to local QB file
- Re-connection needed if QB Desktop file moves or machine changes

### Feature Support
| Feature | Availability |
|---------|-------------|
| Per-Transaction mode | ✅ |
| Summary mode | ✅ |
| Smart Rules | Scale plan + Connector v1.9.0+ only |
| Smart Reconciliation | Limited |
| RevRec | Limited |
| Multi-user mode | Restricted during sync (operations not allowed in multi-user mode) |

### QB Desktop-Specific Behaviors

**Multi-user mode:** QB Desktop's multi-user mode can cause rollback failures. Error: "Operation not allowed while in multi-user mode." Must switch to single-user mode for rollbacks.

**Permission level:** Rollback failures also occur due to insufficient Windows/QB user permissions.

**Data freshness:** Product lists, customer lists, classes must be manually refreshed in Synder via "Fetch data from QuickBooks Desktop" button.

**Setup complexity:** Higher than cloud platforms. Suitable for users who need QB Desktop for specific reasons (legacy data, specific features).

---

## Sage Intacct

**Enterprise-grade. Scale plan required. ~15-minute setup.**

### Connection
Three-step manual setup:
1. Enable Web Services module in Sage Intacct
2. Add Synder as authorized Web Services user (Sender ID: `cloudbusinesshqMPP`)
3. Create a dedicated Web Services user (Business type, GL Read/Write role)
4. Enter Company ID + User ID + Password in Synder

### Feature Support
| Feature | Availability |
|---------|-------------|
| Per-Transaction mode | ✅ |
| Summary mode | ✅ |
| Smart Rules | Limited |
| Smart Reconciliation | ✅ (selected platforms) |
| RevRec | Limited |
| Multi-currency | ✅ |

### Sage Intacct-Specific Behaviors

**Dimensions:** Sage Intacct uses "dimensions" (similar to Classes in QBO) for categorization. Smart Rules can apply dimensions.

**Entities/subsidiaries:** Sage Intacct supports multi-entity accounting. Must grant Web Services user access to the appropriate entity level.

**No sync mode prompt during onboarding:** Unlike QBO/Xero, the sync mode choice is handled separately from the initial connection flow.

**Complexity:** Users new to Sage Intacct may need IT or admin help to complete the Web Services setup.

---

## Oracle NetSuite

**Enterprise ERP. Scale plan required. Most complex setup.**

### Connection
1. Provide Account ID, Consumer Key, Consumer Secret, NetSuite Role (Internal ID)
2. For Per-Transaction mode: Additional RESTlet script setup required:
   - Download script from Synder connection page
   - Create new script record in NetSuite (Customization → Scripting → New)
   - Upload script, enter Script ID and Deployment ID from Synder
   - Set Deployment Status = Released → Save & Deploy
   - Copy External URL → paste back into Synder
3. Select subsidiary and bank account

### Feature Support
| Feature | Availability |
|---------|-------------|
| Per-Transaction mode | ✅ (with RESTlet) |
| Summary mode | ✅ |
| Smart Rules | Limited |
| Smart Reconciliation | ✅ (selected platforms) |
| RevRec | Limited |
| Multi-entity/Subsidiary | ✅ |

### NetSuite-Specific Behaviors

**RESTlet requirement:** Per-Transaction mode requires a NetSuite RESTlet script to enable customer/product-level detail sync. Without it, only basic financial data syncs.

**Credentials rotation:** NetSuite uses token-based auth. If credentials change or expire, must reconnect via Organization settings → Accounting company → Connect.

**Subsidiary selection:** Must select the correct NetSuite subsidiary during connection. If multi-subsidiary, each subsidiary may need its own Synder org.

**Complexity:** Highest setup complexity of all platforms. Typically requires NetSuite admin access and familiarity with SuiteScript.

---

## Platform Comparison Table

| Capability | QBO | Xero | QB Desktop | Sage Intacct | NetSuite |
|-----------|-----|------|------------|--------------|---------|
| Setup complexity | Low | Low | Medium | High | Very High |
| Connection type | OAuth | OAuth | Local connector | API keys | Token + script |
| Per-Transaction | ✅ | ✅ | ✅ | ✅ | ✅ |
| Summary | ✅ | ✅ | ✅ | ✅ | ✅ |
| Smart Rules | ✅ Full | ✅ Most | Scale only | Limited | Limited |
| Smart Reconciliation | ✅ | ✅ | Limited | ✅ | ✅ |
| RevRec (full) | ✅ | Partial | No | Partial | Partial |
| Multi-currency | ✅ | ✅ | Limited | ✅ | ✅ |
| Plan required | Starter | Starter | Starter | Scale | Scale |
| Max feature depth | ★★★★★ | ★★★★☆ | ★★★☆☆ | ★★★☆☆ | ★★★☆☆ |
