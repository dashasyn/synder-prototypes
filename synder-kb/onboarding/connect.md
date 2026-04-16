# Connecting Integrations

> How users connect their sales/payment platforms (integrations) and accounting platform (books) to Synder during onboarding and after.

---

## Onboarding Flow Overview

The onboarding wizard guides new users through these steps in order:
1. Sign up + email verification
2. Tell us about your business
3. Select Synder products (Sync / Insights / both)
4. Enter business details (company name, timezone)
5. Select sales/payment platforms to connect
6. **Select accounting platform** ← locked-in decision
7. Connect accounting platform
8. Choose sync mode (QBO/Xero only)
9. Connect payment/sales platforms one by one

> ⚠️ **UX friction point:** Step 6 is permanent — users cannot change the accounting platform later without creating a new org. There is no explicit warning about this during onboarding.

---

## Connecting the Accounting Platform

### QuickBooks Online / Xero
- OAuth-based connection
- User must have **admin rights** in QBO/Xero
- If no admin rights: option to "Invite account owner" appears
- After connecting: immediately prompted to choose sync mode (Per-Transaction or Summary)

### QuickBooks Desktop
- Requires downloading and installing **Synder Connector** app on the same machine as QB Desktop
- Setup is more complex; connector acts as a local bridge
- Smart Rules for QB Desktop require Scale plan + Synder Connector v1.9.0+

### Sage Intacct
Three-part setup (enterprise-grade, ~15 min):
1. **In Sage Intacct:** Enable Web Services module (Company → Admin → Subscriptions)
2. **Authorize Synder:** Add Synder as Web Services user (Sender ID: `cloudbusinesshqMPP`, Status: Active); note your Company ID
3. **Create Web Services user:** Business type, Admin Off, GL Read/Write role, Active status
4. **In Synder:** Enter Company ID + Web Services User ID + password

> ⚠️ Sage Intacct users never see a sync mode choice during onboarding — it's handled differently.

### Oracle NetSuite
1. Provide: Account ID, Consumer Key, Consumer Secret, NetSuite Role (Internal ID)
2. **Summary Sync:** Connection complete after credentials
3. **Per-Transaction Sync:** Extra step — download + deploy a RESTlet script in NetSuite (Customization → Scripting → New), then paste the External URL back into Synder

> ⚠️ Per-Transaction setup for NetSuite requires NetSuite admin access AND JavaScript familiarity. High friction.

---

## Connecting a Payment/Sales Integration

### Standard Flow (e.g., Shopify, Stripe, PayPal)
1. Select platform from integration list
2. Click Connect → redirected to platform's OAuth authorization
3. Log into platform if needed
4. Authorize/Install app
5. Return to Synder → green "Connected" badge appears
6. If payout sync supported: choose bank account for payouts → Continue

### Where to Add Integrations (Post-Onboarding)
- **During onboarding:** Wizard offers to connect platforms step by step
- **After setup:** Person icon (top-right) → Organization Settings → Add Integration

### Shopify-Specific Notes
- Shopify Payments auto-connects when Shopify store is connected
- Additional payment gateways (PayPal, Stripe, etc.) must be connected **separately**
- Missing gateway = missing or incomplete transactions
- Special payment methods (Shop Cash, Afterpay) need separate "Additional Settings" setup

### Critical Rule: Connect ALL Gateways
If a Shopify store accepts payments via Shopify Payments + PayPal + Stripe, **all three must be connected** to Synder. Synder pulls order details from Shopify but fee/payout data from each gateway individually.

---

## Adding a New Client Organization (Accountants)

1. Upper-left corner → **Connect client** button
2. Follow onboarding flow for that client's accounting platform
3. Each client = separate org with separate billing
4. More clients = larger discount (volume pricing for accounting firms)

> **UX note:** The "Connect client" button is only visible to users managing multiple organizations.

---

## Adding Another Company (Existing User)

1. Click current organization name (upper-left) → **Create organization**
2. Fill in business info → Next
3. Select sales platforms → Next
4. Select accounting platform → Next
5. Connect accounting platform → Complete payment integrations

---

## User Roles

| Role | Access |
|------|--------|
| Manager | Full access including billing and platform connections |
| Member | Limited: functionality only, no billing or connection management |

---

## Common Connection Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| OAuth fails | Not logged into platform | Open platform in new tab, log in, retry |
| Platform shows disconnected | Token expired / password changed | Settings → Integrations → Re-authorize |
| No "Connected" badge | Authorization step incomplete | Check if "Install App" was clicked |
| Missing transactions after connect | Not all gateways connected | Add missing gateway in Settings → Integrations |
