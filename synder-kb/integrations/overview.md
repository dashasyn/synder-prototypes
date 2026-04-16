# Integration Landscape

> Overview of all platform types Synder connects, how they're categorized, and the key connection patterns.

---

## Two Types of Integrations

Synder distinguishes between two types of connected platforms:

| Type | Synder Term | Examples | Role |
|------|-------------|---------|------|
| **Accounting platform** | "Books" | QBO, Xero, Sage Intacct | Where transactions are recorded |
| **Sales/Payment platform** | "Integration" | Stripe, Shopify, PayPal | Where transactions originate |

**Rule:** One org = one accounting platform. Unlimited sales/payment integrations per org.

---

## Sales & Payment Platform Categories

### Payment Processors
Pure payment processing. Synder syncs charges, refunds, payouts, fees.
- **Stripe** — most feature-complete integration (invoices, subscriptions, RevRec)
- **PayPal** — payment + payout sync
- **Square** — payment + payout
- **Authorize.net** — payment processing
- **Braintree** — Stripe-like processor

### E-Commerce Platforms
Online stores. Synder syncs orders, products, customer data. Often paired with a separate payment processor.
- **Shopify** — most popular, deepest integration
- **WooCommerce** — WordPress-based store
- **BigCommerce** — enterprise ecommerce
- **Magento** — enterprise ecommerce
- **Wix** — SMB ecommerce
- **Squarespace** — SMB ecommerce
- **Ecwid** — widget-based store

### Marketplaces
Multi-seller platforms. Synder handles settlement reports and payout-based reconciliation.
- **Amazon** — largest marketplace; delayed settlement data common
- **eBay** — marketplace + PayPal/Managed Payments
- **Etsy** — handmade/vintage marketplace
- **Walmart** — marketplace

### Specialty Platforms
- **Clover** — POS + payments
- **TikTok Shop** — social commerce
- **Faire** — wholesale B2B marketplace
- **ShipStation** — shipping management (order sync)
- **AfterPay / Clearpay** — BNPL payment method
- **Affirm** — BNPL payment method
- **Amazon Pay** — payment method

---

## How Connections Work

### OAuth-Based (Most Platforms)
1. User clicks "Connect" in Synder
2. Redirected to platform's authorization page
3. User logs in + approves access
4. Returned to Synder with connection active
5. Synder displays "Connected" badge

**Examples:** Stripe, Shopify, PayPal, Square, Etsy, eBay, WooCommerce

### App Installation (Shopify)
- Synder appears as an app in the Shopify App Store
- Click "Install App" grants access
- Shopify Payments auto-connects with the Shopify store

### API Key-Based (Enterprise)
- User generates API credentials in the platform
- Provides credentials to Synder manually
- **Examples:** Sage Intacct, NetSuite, Amazon

### Connector (QB Desktop)
- Requires downloading and running the Synder Connector app locally
- Acts as a bridge between Synder cloud and QB Desktop file

---

## Smart Reconciliation: Platform Pair Requirements

Smart Reconciliation (matching e-commerce orders with payment processor transactions) requires specific platform combinations:

| E-Commerce | Compatible Payment Processors |
|-----------|------------------------------|
| Shopify | Stripe, PayPal, Square, Authorize.net, Braintree, Affirm, Afterpay, Amazon Pay |
| WooCommerce | Stripe, PayPal, Square, Authorize.net, Affirm, Afterpay, Amazon Pay |
| BigCommerce | Stripe, PayPal, Square, Authorize.net, Braintree, Affirm, Afterpay, Amazon Pay |
| eBay | PayPal only (matches by buyer username + date window) |
| Ecwid | Stripe, Square (direct order ID matching) |
| Wix | PayPal (direct order ID matching) |
| Squarespace | Stripe |

**Not available with Summary Sync.**

---

## Connection Health

### What Can Break Connections
- OAuth token expired (periodic re-auth required)
- User changes platform password
- Platform revokes app access
- Admin permissions changed

### Indicators
- Integration shows "Disconnected" status in Settings
- Auto-sync stops
- Error: "Platform disconnected" on transactions

### Reconnecting
Settings → Integrations → Find the platform → Re-authorize
Then manually sync any transactions from the disconnection gap period.

---

## Multi-Gateway Best Practice

When a store accepts multiple payment methods (Shopify Payments + PayPal + Stripe):
- **Connect ALL gateways** to Synder
- Each gateway gets its own clearing account
- Missing gateway = missing or incomplete transactions for those orders
- Reconcile each gateway's clearing account separately

**Special payment methods** that need explicit setup in Synder:
- Shopify Shop Cash → Settings → Shopify → Additional Settings
- Afterpay/Clearpay → connect as separate integration
- Gift cards → special handling (may show as line items)

---

## Amazon Specifics

Amazon has unique data delivery timing:
- Settlement reports are released on a delay (often 1–3 days after period end)
- Synder can't fetch complete data until the settlement report is released
- Results in "Partially Fetched" summaries
- **Best practice:** Sync Amazon summaries with a 1-day delay

Amazon data flow: Sales → held by Amazon → Settlement Report released → Synder fetches → Synder syncs

---

## Platform Connection Limits

| Plan | Integration Slots |
|------|-------------------|
| Starter | 2 |
| Medium | Unlimited |
| Scale | Unlimited |
| Enterprise | Unlimited |

> The 2-slot limit on Starter affects users with more than 2 sales platforms (e.g., Shopify + Stripe + PayPal = 3 platforms → requires Medium plan).

---

## Excel Import (Fallback Integration)

For platforms Synder doesn't natively support:
- Import transaction data from Excel spreadsheet
- Supported format: Synder-provided template
- Transactions behave like regular synced transactions (can sync, rollback, reconcile)
- Available on all plans

**Common uses:**
- Platforms in Synder's roadmap but not yet live
- Custom ERP data
- Non-Stripe subscription data for RevRec
