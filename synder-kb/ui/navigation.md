# Synder UI Structure & Navigation

> Overview of the Synder application layout, main sections, and navigation patterns as experienced by users.

---

## Top-Level Layout

```
[Organization Switcher] (upper-left)    [Person Icon] (upper-right)
─────────────────────────────────────────────────────────────────
[Left Sidebar Nav]    [Main Content Area]
```

---

## Left Sidebar Navigation

The primary navigation. Items vary based on plan and features enabled.

### Core Sections

| Nav Item | What's Here |
|----------|-------------|
| **Dashboard** | Overview metrics, recent sync activity |
| **Platform Transactions** | All imported transactions, filterable by status/platform/date |
| **Sync** | Summary Sync view (Summary mode only) |
| **Smart Rules** | Rules list, create/edit rules |
| **Reports** | Reconciliation reports, RevRec reports |
| **Settings** | Per-integration settings, org settings |

### Secondary/Feature-Gated Sections

| Nav Item | Availability |
|----------|-------------|
| **Revenue Recognition** | RevRec module enabled |
| **Insights** | Insights product subscribed |
| **Reconciliation** | Reconciliation feature |

---

## Organization Switcher (Upper-Left)

- Shows current organization name
- Click to see all orgs you belong to
- "Create organization" option here
- "Connect client" option (for accountants with multiple clients)

> **UX note:** This is also where users realize they're in the wrong org — a common source of confusion when users manage multiple companies.

---

## Person Icon Menu (Upper-Right)

Click → reveals:
- **My Account** — user profile, password, invite users, billing
- **Organization Settings** — integrations, accounting platform, org details

### My Account sub-sections
- Profile settings
- **Users section** — Add User button, user list, roles, delete users

### Organization Settings sub-sections
- **Accounting company** — reconnect/view the linked accounting platform
- **Add integration** — connect additional payment/sales platforms
- Org name (editable)

---

## Platform Transactions View

The main working area for Per-Transaction sync mode users.

**Key UI elements:**
- **Filter bar** — filter by: status, platform, date range, transaction type
- **Transaction list** — each row shows: date, platform, type, amount, sync status
- **Explain link** — appears under each status; opens error details and fix guidance
- **Three-dot menu** per transaction — actions: Sync, Rollback, Export
- **Bulk actions** — Select all → Actions dropdown → Sync / Rollback / Export to Excel
- **"Select all transactions" button** — appears after filtering

### Transaction Status Colors/Categories
- 🔴 **Failed** — error occurred; check Explain link
- 🟡 **Ready to Sync** — imported but not yet sent to books
- 🟡 **Pending** — payment not yet finalized by processor
- 🟢 **Synced** — successfully in books
- ⚪ **Skipped** — duplicate detected, not re-synced
- ⚪ **Deleted** — rolled back from books
- 🔵 **In Progress / Scheduled** — currently processing

---

## Summary Sync View

Used in Summary mode. Shows daily or per-payout summaries.

**Key UI elements:**
- Summary list with date, status, transaction count
- **Preview** button → opens Summary Preview modal
- **Sync** button per summary

### Summary Preview Modal
Two tabs:
1. **Summary Lines** — individual line items; click any blue amount for **drilldown** to constituent transactions
2. **Aggregated View** — roll-up by Account or Description; shows Debits, Credits, Grand Total

### Summary Statuses
- **Fully Fetched** — all transactions present, ready to sync
- **Partially Fetched** — some transactions still pending from platform (common with Amazon)
- **Synced** — journal entry created in books
- **Close-Ready** — validated, approved for month-end posting

---

## Settings Layout

**Access:** Left sidebar → Settings (or Person icon → Organization Settings → [integration])

**Structure:**
- Integration selector at top (tabs for each connected platform)
- Within each integration: tabs by category
  - General (sync mode, timezone, special order types)
  - Sales (clearing account, income account, payout account)
  - Products/Services (product mapping, auto-create settings)
  - Tax (tax codes, Apply Taxes toggle)
  - Fees (fee account mapping)
- **Update button** at bottom of each settings page (must click to save)

> ⚠️ **UX friction point:** Users frequently forget to click Update after changing settings. No autosave.

---

## Smart Rules View

**Access:** Left sidebar → Smart Rules

**Layout:**
- Rules list with name, trigger, status (enabled/disabled)
- "Create rule" button
- Rule editor: trigger → condition → action flow
- Execution logs per rule

---

## Reports View

**Access:** Left sidebar → Reports

**Available reports (varies by plan/feature):**
- Transaction Reconciliation
- Deferred Revenue Reconciliation (RevRec)
- Debits & Credits Report (RevRec)

---

## Changelog

Accessible within Settings area. Shows a timestamped log of all setting changes made within the organization — useful for diagnosing why syncs changed behavior.

> **UX note for researchers:** The Changelog is a power-user feature. New users don't know it exists and miss it when debugging.

---

## Key UI Terminology

| UI Label | What It Means |
|----------|--------------|
| "Explain" (link) | Opens error details + fix suggestions for a failed/warned transaction |
| "Rollback" (action) | Removes transaction records from books; status → Deleted |
| "Sync" (action) | Pushes transaction to books |
| "Update" (button) | Saves settings changes |
| "Import" | Fetches transactions from platform into Synder (not yet to books) |
| "Ready to Sync" | Imported into Synder, not yet sent to books |
| "Auto-Sync" | Toggle that enables automatic background syncing |
