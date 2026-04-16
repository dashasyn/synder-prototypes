# Synder Product Overview

> AI-driven accounting infrastructure that connects 30+ sales/payment platforms to accounting software. Automates bookkeeping for ecommerce, SaaS, and multi-channel retail.

---

## What Synder Does

Synder sits between payment/sales platforms (Stripe, Shopify, PayPal, Amazon, etc.) and accounting software (QuickBooks, Xero, Sage Intacct, NetSuite). It automatically imports, categorizes, and syncs transaction data — sales, fees, refunds, taxes — so users don't manually enter transactions.

**Core value proposition:** Eliminate manual data entry. Reconcile in minutes, not hours. Maintain GAAP-compliant books automatically.

---

## Three Core Products

### 1. Synder Sync
Automated multi-channel sales transaction bookkeeping.

- Syncs sales, fees, taxes, refunds from 30+ platforms
- Two sync modes: Per-Transaction or Summary (daily/per-payout)
- Supports reconciliation, COGS tracking, inventory tracking
- Import frequency: daily (Starter) or hourly (Medium+)

**Who uses it:** Ecommerce businesses, multi-channel sellers, accounting firms managing clients.

### 2. Synder RevRec
GAAP/ASC 606 revenue recognition for subscription businesses.

- Primary integration: Stripe (subscriptions)
- Also supports Excel imports for non-Stripe data
- Tracks upgrades, downgrades, cancellations, prorations
- Waterfall reports by month or customer
- Deferred revenue reconciliation reports
- Multicurrency support

**Who uses it:** SaaS companies, subscription businesses needing GAAP-compliant revenue recognition.

### 3. Synder Insights
Business intelligence dashboards for cross-platform analytics.

- KPI tracking across all connected platforms
- Sales analytics, product reports, customer cohorts
- Daily/weekly email digest notifications

**Who uses it:** Business owners and managers wanting aggregated sales data without accounting detail.

---

## Integration Landscape

### Accounting Platforms (Books)
- QuickBooks Online (most common)
- QuickBooks Desktop
- Xero
- Sage Intacct (Scale plan+)
- Oracle NetSuite (Scale plan+)
- Custom ERP

### Sales & Payment Platforms (Integrations)
Stripe, PayPal, Shopify, Amazon, eBay, Walmart, Etsy, WooCommerce, Wix, Square, BigCommerce, Clover, TikTok Shop, Faire, Ecwid, ShipStation, Squarespace, Magento, and more (30+).

---

## Key Architecture Rules

> ⚠️ **Critical constraint:** One organization = one accounting platform. Users **cannot** switch accounting platforms within an org. To change platforms, they must create a new organization with its own billing.

- Multiple sales integrations can connect to one org (e.g., Stripe + Shopify + PayPal all → one QuickBooks Online)
- Each org is billed separately
- Accountants manage multiple client orgs from one login

---

## Pricing Tiers (Sync)

| Plan | Transactions/mo | Integrations | Import Frequency | Notes |
|------|----------------|--------------|------------------|-------|
| Starter | Up to 500 | 2 slots | Daily | Basic support |
| Medium | 500–3K | Unlimited | Hourly | — |
| Scale | 3K–50K | Unlimited | Hourly | Sage Intacct, NetSuite access |
| Enterprise | 50K+ | Unlimited | Hourly | Slack support, custom dev |

> Smart Rules and QuickBooks Desktop require Scale plan minimum.

---

## User Journey (High Level)

1. **Sign up** → provide business details
2. **Select products** (Sync / Insights / both)
3. **Connect accounting platform** (one per org, irreversible)
4. **Choose sync mode** (Per-Transaction or Summary)
5. **Connect sales/payment integrations** (one or more)
6. **Configure settings** (income accounts, clearing accounts, fees, products)
7. **Test sync** (manual, small batch)
8. **Enable auto-sync**
9. **Ongoing:** review transactions, reconcile, fix errors

---

## Terminology Summary

| Term | Meaning |
|------|---------|
| Organization (org) | A workspace tied to one accounting platform |
| Integration | A connected payment/sales platform |
| Books | The accounting platform (QBO, Xero, etc.) |
| Sync | Posting a transaction from Synder to books |
| Rollback | Removing a synced transaction from books |
| Clearing account | Intermediate account for platform balances |
| Smart Rules | Conditional automation rules applied at sync time |
| Per-Transaction | Sync mode: one entry per sale |
| Summary Sync | Sync mode: aggregated daily/payout journal entries |
