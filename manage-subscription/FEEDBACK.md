# Manage Subscription — Persona Feedback

> Live page: https://demo.synderapp.com/organizations/settings/manageSubscription
> Last updated: 2026-04-22 (Round 1, refreshed with live verification)
> RevRec add-on card is planned and will land on this page soon.

## Current live page — verified inventory

| Region | Contents |
|---|---|
| **Plan card** (Essential) | Card •••• 4242 / "Change card"; `$115.00` struck through → **`$92.00`** /month billed yearly; tiny "What's included?" link that opens a **price breakdown, not features**; "Next billing date: 03/13/2027"; three identical blue links stacked: *Upgrade your plan* · *Cancel subscription* · *Get subscription invoices*; toggle "Autocharge me if sync balance is depleted"; sub-section "Additional services" with counter rows *Monthly transactions 1000* and *Additional users 1*; disabled **Update plan** button (no tooltip). |
| **Invoicing** add-on | Marketing sentence + dropdown `Up to 50 invoices – $99.00` + blue **Subscribe**. |
| **Smart rules** add-on | Same pattern, `Up to 10 rules – $49.99`. |
| **My historical transactions** | Giant "0"; sub-text about historical sync; blue link *Get more transactions for free*. |
| **RevRec (coming soon)** | Separate card with its own dropdown + billing date + autocharge toggle. |

---

## Top issues — cross-persona consensus

### Critical
1. **No total cost anywhere.** Three paid items (plan + add-ons) but no "$X/month total" or next-invoice preview. Mike and Sarah both need a single hero number.
2. **"What's included?" is mislabeled.** It opens a price breakdown, not a feature list. Bait-and-switch against user intent — confirmed by all three personas.
3. **Destructive `Cancel subscription` is a plain blue link sandwiched between `Upgrade your plan` and `Get subscription invoices`.** Same color, same weight, same font, one mis-click away.
4. **`Update plan` button is disabled with no tooltip** — Mike tried to click, nothing happened. Sarah called it a standard dark pattern.
5. **Grid will not survive RevRec.** Viktor: adding a 6th card with its own billing date + autocharge toggle fragments billing state across the page. Sarah: multiple billing dates per subscription is a reconciliation nightmare.

### Important
6. **Three inconsistent add-on patterns:** counter-rows (transactions/users), dropdown+Subscribe (Invoicing/Smart rules), link-only CTA (Historical transactions).
7. **No proration / effective-date preview** when bumping transaction or user counters.
8. **Crossed-out $115 → $92** with no explanation of the promo's duration or renewal price. Sarah won't put it on a client receipt without that.
9. **"Syncs left: 1000"** in the top bar duplicates "My historical transactions: 0" in the body — two usage readouts with no relationship explained.
10. **Autocharge has no $-cap shown.** Mike: "Am I going to wake up to a $900 surprise?"
11. **"Monthly transactions: 1000"** — hard cap, soft cap, overage? Never stated.
12. **No invoice history, no tax ID field, no billing email separate from account email** — blockers for Sarah's firm workflow.

### Quick wins
- Rename "What's included?" → "See price breakdown"; add a real "See plan features" link.
- Tooltip on disabled *Update plan*: "Change a quantity above to enable."
- Unify autocharge copy: one phrasing, everywhere.
- Rename "My historical transactions" → "Historical sync balance"; drop the hero "0".
- Move *Cancel subscription* to a bottom "Danger zone" with divider + ghost style.

---

## Per-persona notes

### Sarah Chen — Accountant, CPA, firm of 12 managing ~40 SMB clients
> Confidence: high

- **Trust blockers:** mislabeled "What's included?", no renewal price next to the discount, no proration policy, no audit trail, no named user roster.
- **Firm-workflow gaps:** no invoice history / CSV export, no tax ID field, no billing email distinct from account email, no SOC-grade change log.
- **RevRec concern:** separate billing date + separate autocharge toggle per add-on will force hand-matched statement reconciliation across 40 client engagements.

**Top-5 must-fix for accountants**
1. Rename "What's included?" to "Price breakdown"; add a separate real "Features" link.
2. Show renewal price + promo end-date next to the struck-through price.
3. Proration + effective-date preview before "Update plan" commits; explain why the button is disabled.
4. One consolidated invoice across plan + all add-ons (including RevRec), one billing date, downloadable history with tax ID and billing email fields.
5. Visible change log (who/what/when) + named user roster under "Additional users."

### Mike Torres — Solo ecom founder, zero accounting background
> Confidence: high

- **Jargon that panics him:** "sync balance", "RevRec", "Additional services", "historical transactions".
- **Anxiety triggers:** Cancel-next-to-Upgrade, Update-plan greyed out with no tooltip, "autocharge me if sync balance depleted" with no $-cap, "Get more transactions for free" reading like a scam.
- **Quit-risk moment:** clicking "What's included?" and getting a price breakdown instead of features.

**5 things that would make him NOT panic**
1. Plain-English sentence: "You're covered through March 2027, nothing to do."
2. Usage bar: transactions used vs included — "312 / 1000 this month, you're fine."
3. "What's included?" → real feature list.
4. Cancel moved away, not blue, not adjacent to Upgrade.
5. $-cap visible next to autocharge.

### Viktor Harsch — Senior UX Designer (ex-Google, Booking, Revolut)
> Confidence: high

- **IA problem:** four different object types (stateful account, sales pitches, usage meter, stateful add-on) in one uniform card grid. Stripe separates Current plan / Add-ons / Usage.
- **Visual hierarchy:** three identical blue links for promo/destructive/admin actions — fails WCAG 1.4.1.
- **Scalability:** 3-column grid is already lopsided; dropping RevRec will either force a 4th column (breaks at 1280px) or push it below the fold, fragmenting autocharge settings across two places.
- **Affordance problem:** disabled *Update plan* without system-status copy violates Nielsen heuristic #1.

**Fix This Yesterday (ranked impact/effort)**
1. Rename "What's included?" + split feature list from price breakdown. H/L.
2. De-emphasize Cancel subscription, add confirmation flow. H/L.
3. Tooltip on disabled Update plan. H/L.
4. Unify add-on pattern — one component for all add-ons. H/M.
5. Redesign to stacked sections before RevRec lands — the grid will not survive it. H/M.

---

## What converged across all three personas

1. **One total, one next-invoice number, one billing date.** Everybody wants it, nobody sees it.
2. **Features ≠ Price breakdown.** Label the links correctly.
3. **Destructive link looks identical to promotional link.** Everyone flagged it independently.
4. **Disabled button without reason** is a universal annoyance.
5. **The current grid cannot hold RevRec.** Fix the structure now, not after RevRec ships.
