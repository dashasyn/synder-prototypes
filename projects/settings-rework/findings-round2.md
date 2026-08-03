# Settings rework — Round 2 validator findings (2026-08-03)

Targets: `proto-a.html`, `proto-b.html`, `proto-c.html`, `manage-subscription-v2.html` (local files, newer than published).
Validators run: UX, Domain (accountant), Clarity (biz owner), Fidelity (vs spec), Trust (does the UI lie?).
Nothing applied yet — awaiting Ignat's direction.

## Per-validator ranking

| Validator | Ranking (best → worst) |
|---|---|
| UX | **v2 · A · C · B** — see Addendum 2; the earlier "C · A · v2 · B" row was wrong |
| Domain | v2 · A · B · C (2nd instance: v2 · C · A · B) |
| Trust | A · v2 · B · C |
| Fidelity | v2 · A · B · C (A/B/C effectively tied) |
| Clarity | no explicit ranking; A and B each drew 1 Critical, C drew 0 |

Aggregate Critical count: A = 2 · B = 5 · C = 3 · v2 = 4 (v2's are within a narrower, deeper scope).

## Corroborated (2+ validators) — fix regardless of which layout wins

1. **Coupon Apply is a no-op** — A, B, C, v2. UX + Trust + (implicitly) Domain.
   Toast claims a discount applied; no total, receipt or breakdown ever changes. v2 and C go further and explicitly
   promise "appears as a line in the breakdown" / show "Coupon: None applied" right next to the success toast.
2. **Historical-transactions balance never updates after purchase** — A, B, C, v2. UX + Trust + Domain.
   Toast quotes a specific new pool size; the tile stays at its pre-purchase figure. In v2, `1000` doubles as the
   "nothing bought" sentinel, so buying exactly the minimum always renders "0".
3. **Cancel subscription leaves the page reading "Active"** — A, B, C (v2 handles it). Trust, 3× Critical.
   Only evidence is a 4-second toast; plan chip, next-charge date and cancel-tile copy never change.
4. **Primary price/plan display goes stale after a confirmed change** — B and C, Critical. Trust + Domain.
   B: header "Paying now", rail receipt, payment-tile amount, and the matrix "Your plan" / "Upgrade" column tags all
   frozen. C: the overview Plan card (plan name + $/mo + transactions) frozen after `applyCart()`.
5. **Trial state fabricates proration** — v2, Critical. UX + Trust.
   `baseline()` gives trial the same monthly as active, so a plan change during trial shows "credit for 11 unused
   months" and can warn about forfeiting money that was never paid.
6. **No downgrade guardrails / no forfeiture disclosure** — A, B, C. Domain, 3× High.
   Quantities can be reduced below live usage (seats, smart rules, transaction ceiling) with no warning, and the
   "unused balance is credited automatically" copy never discloses that a downgrade can forfeit paid months —
   contradicting the same page's "final and non-refundable" FAQ. v2 is the only one that solves both.
7. **Autocharge toggle with no rate and no cap** — A, B, C, v2. Clarity, High in each.
   The one control that can take money unattended states no rate, no ceiling, and no user-settable cap.
8. **Premium steppers price things that don't count** — A, C. UX.
   Selecting Premium keeps live steppers with per-item dollar amounts while the total resolves to "Custom"/quote.
9. **Abandoned draft persists** — A, C. UX.
   Closing the drawer/panel via ✕, scrim or Escape never resets `sel` to `CURRENT`, so the next open shows the
   abandoned draft — one click from an unintended confirm.

## Single-validator, layout-level (not bugs — design decisions)

- **B: connection-failure alert is behind the secondary tab.** Page defaults to Billing; "2 connections need
  attention" only exists in the Organization pane. Reintroduces the exact "status is buried" problem the rework
  targets. (UX, High, 90)
- **B: the matrix is the page and it's the least legible part.** Same row shows a stepper in one column and grey
  "included" text in others; "negotiated" appears where a price should be; nothing marks which column the user has
  today; ~23 feature rows always expanded. (UX + Clarity)
- **B: pending billing edits vanish when switching tabs** — sticky total bar is `display:none`d, no cue survives. (UX)
- **C: Cancel subscription is filed under a card called "Billing help"**, alongside coupons and FAQs; nothing on the
  9-card overview says "subscription" or "cancel". Clarity reads this as deliberate. (Clarity, High)
- **C: "Save details" doesn't save** — it stages into the cart; footer resets to "No changes" and the user leaves
  believing the address is stored. (UX)
- **A: "Review & confirm" never reviews.** Pressing it closes the drawer and announces the change as done; no screen
  ever states what hits the card today, and "prorated credit" first appears after the money decision. (Clarity, Critical)
- **B: "nothing is charged until you confirm" + a monthly-only figure** on an annual plan — is it $220 or $2,640?
  No summary anywhere. (Clarity, Critical)
- **v2: comparison collapsed by default** (`<details id="cmpBox">` closed) while A and C show it open. (UX, Medium)
- **v2: rail breakdown doesn't sum to the total.** The extra-seats line is billed at full rate while `priceOf()`
  discounts the whole bundle, so line items don't reconcile whenever seats exceed the plan minimum. (Domain, Critical)
- **v2: "Next charge" is hardcoded `$1,104.00`** in `renderStrip()` regardless of `CURRENT.monthly` — upgrade to Pro
  and "You pay $220" sits next to "Next charge $1,104.00 for 12 months". (Trust, Critical)
- **v2: invoice history shows a "Refunded" row** on a screen that states purchases are final and non-refundable. (Domain)

## Fidelity — the 43-function contract holds

- A: 43/43 · B: 43/43 · C: 43/43 · v2: 14/14 of the Manage-subscription slice. Nothing missing or dead.
- Shared label drift vs the live capture, in all four: "Invite user" should be **"Add user"** (O11); "Open billing
  portal" / "Open portal" should be **"Get subscription invoices"** (S8). Invite-modal field order is
  Name → Email → Profession; production is Name → Profession → Email.
- A/B/C have no loading or disabled interim state on any network-bound action (O4, O8, S13, P5) — instant toast only.
  v2 is the only one with loading/error/trial/past-due/expired/no-card states.

## Recommendation

**Build A's shell with v2's billing engine. Drop B.**

- A ranks 1st on Trust, 2nd on Domain and Fidelity, 2nd on UX — the only layout whose confirm loop
  (`renderPageState()`) rewrites every persistent price and plan indicator it displays.
- A's one Critical (no real "you'll be charged $X today" step) is exactly what v2 already built: the review modal,
  the downgrade guardrails, the forfeiture disclosure, and the 9 states.
- C is the structural runner-up — 3rd on UX (all three instances), zero Clarity Criticals, and the cart model genuinely prevents
  surprise charges — but the same cart model produces its own honesty problems ("Save details" doesn't save, plan
  card goes stale after `applyCart()`), and Cancel filed under "Billing help" is the single worst trust signal in
  the set.
- B is last on three of four rankings and carries 5 Criticals. Two of its problems are structural, not bugs: the
  critical connection alert sits behind a tab nobody lands on, and the matrix — the whole page — is the part both
  UX and Clarity understood least.

**This reverses the earlier recommendation of B**, which was made on layout logic before any validator pass. B's
"answer what Pro costs at my volume without navigating" advantage is real, but it can be imported into A's drawer;
the buried-alert and matrix-legibility problems cannot be fixed without dismantling what makes B B.

## Addendum — late Domain instance (3 items not in the table above)

A second Domain pass landed after this file was written. Its Criticals duplicate items 4 and 6 and A's
"Review & confirm never reviews", but it adds three copy findings I verified in source. None change the ranking.

1. **A: "balance" means two different things on one page.** The FAQ answer at `proto-a.html:305` —
   "Anything left on your current balance is credited against the new charge automatically" — sits three lines
   below "Purchases are final and non-refundable" (`:302`), and in the same column as a card reading
   "1,000 — Transactions left this month" (`:250`). A bookkeeper can read that as unused sync allowance converting
   into money. Fix: never use "balance" for both the transaction allowance and the prepaid subscription value, and
   state the forfeit case explicitly as v2 does (`manage-subscription-v2.html:825`). Domain calls this Critical; I'd
   call it High — it's the same forfeiture problem as item 6, wearing a vocabulary problem on top.
2. **"Processing fees are free" is ambiguous — and it's in A, B *and* C, not just B.** The validator attributed this
   to B alone and credited A with correct wording. A's *FAQ* is correct; A's *stepper description* is not.
   `proto-a.html:574`, `proto-b.html:514`, `proto-c.html:663` all read "Processing fees are free." Only v2 gets it
   right: "Processing fees are never charged" (`:389`). The bad reading is "fees aren't synced at all", which would
   have someone not look for Stripe/PayPal fee entries at reconciliation — gross sales booked without the expense.
   Cheapest fix in the whole set: one string, three files.
3. **A: the sync-balance card shows remaining only.** "1,000 / Transactions left this month" with no
   used-of-included and no reset date, while the breakdown row separately says "Monthly transactions (1,000
   included)" — so 1,000 could mean entitlement or nothing-consumed-yet. v2 already shows used-of-included plus a
   6-month trend; port it. Medium.

## Addendum 2 — the three UX instances, reconciled, across all 11 prototypes (2026-08-03)

The UX lens was run as three independent instances over the full set of eleven (A, B, C, v2, Concepts 3-in-1,
V1 Unified Settings, V2 Billing Hub, V3 Org Health Dashboard, Sketch V1, Sketch V2 Tabbed, Sketch V2 Long page).
A second Domain instance covered the same eleven.

**All three UX instances independently produced the same top four: v2 · A · C · B.** The "C · A · v2 · B" row in the
table above did not come from any of them and is corrected. Full-11 Domain returned v2 · C · A · B — so v2 is 1st on
4 of 4 completed lenses at this scope, and B is last on 4 of 4.

### Unanimous — 3 of 3 UX instances, same defect

- **A — the page teaches 3–4 different rules for "is this saved / charged yet?"** Notifications commit on change,
  Organization details via a sticky savebar, plan/add-ons via the drawer footer, modals on their own primary button.
  A's own copy asserts one model that the Buy modal contradicts. (High, 85–90)
- **B — steppers are live only in the selected plan's column, and Premium never prices anything.** The one question a
  comparison matrix exists to answer, it cannot answer; pricing another plan means selecting it, which stages a change.
  (High–Critical, 84–90)
- **B — 4 rows that change the bill share one uniform table with ~24 static feature rows**, under ~300px of permanent
  chrome. The monthly "add 500 transactions" job re-scrolls a marketing comparison every visit. (High, 80–85)
- **B — seats are priced on Billing and consumed on Organization**, and the bridge is a sentence, not a control. (Medium)
- **C — nothing on the overview is editable; every task is a level deep.** Cheapest edit = card → panel → wizard →
  cart → confirm, and the panel closes on every queue action. (High, 85–88)
- **C — the only commit control is a non-sticky header cart**, far from the panel where the work happens; after the
  toast expires the pending state survives as a small badge (KF-2). (High, 84–88)
- **C — free edits and paid changes share one commit.** "Nothing has been charged or saved yet" covers two different
  kinds of consequence in one sentence. (High)
- **v2 — the plan switch is the most hidden control on a page called "Manage subscription."** It sits inside a
  collapsed `<details id="cmpBox">` behind the page's only secondary-weight button, while lower-stakes quantity
  steppers are always visible. This is v2's #1 defect on all three instances. (High, 72–85)
- **v2 — guardrails are computed only in `openConfirm()`.** The page prices an impossible configuration with a
  valid-looking total and an enabled CTA; the block only appears after the user commits to reviewing. (Medium, 76–85)

### 2 of 3

- **A — commit weight is inverted against reversibility.** The $30 one-time historical purchase (irreversible,
  non-refundable) commits on one click; a $12/mo seat change (reversible, prorated) requires "Review & confirm". (High, 90)
- **A — current cost and proposed cost are never on screen together.** The 720px drawer and its scrim cover the page's
  own breakdown table. (Medium, 78–80)
- **B — the "2 connections need attention" alert is inside the Organization pane and Billing is the default tab.**
  On load, the only trace is a small numeral. (Critical, 92 / High, 85)
- **v2 — the 8-reason cancel taxonomy is mandatory** before anything proceeds; no path for a user who has decided, and
  no distinction between churn and a firm routinely closing finished client orgs. (Medium)

### Single-instance but verified, worth fixing

- **v2 — the Smart-rules downgrade block is a genuine dead end.** Confirm goes disabled with "Resolve the issue above"
  and the only remedy offered undoes the downgrade; there is no link to delete a rule. The Users block, by contrast,
  offers both "Keep N seats" and "Remove someone first". Domain corroborates from the other side: the block never names
  *which* rules stop, and smart rules drive categorisation, so an unspecified subset silently ceasing is a books problem.
- **v2 — "Schedule it for renewal instead" leaves no trace.** `scheduleAtRenewal()` resets `sel` to `CURRENT` and
  reports only via toast; nothing afterwards shows a change is scheduled and there is no way to view or cancel it.
- **v2 — "See a smaller option" has no destination** — a toast explaining that right-sizing is advisory and that no plan
  below Essential exists.
- **A — Pro Max exists only behind a Standard/Max toggle inside the Pro card** and never appears in "Compare all
  features" (3 columns: Essential/Pro/Premium). A whole price tier is unreachable from the comparison.

### Round 1 is disqualified on money, not on layout

Ten of the eleven let a recurring or one-time charge commit on a single click to a success toast — no amount in the
button label, no proration, no card named, no undo. Four show a total next to that button that provably excludes other
priced controls on the same screen. The specific blockers:

- **V2 Billing Hub** — the five-plan tier ladder is inert (no handlers) and sits exactly where KF-4 says users click;
  the only button beside it re-selects the tab already open. The plan cannot be changed anywhere on the screen.
  Domain adds: the same plan's entitlement reads 1,000 in the breakdown and 500 in the stepper.
- **V3 Org Health Dashboard** — whole-card `onclick="toggleAddon(...)"`: clicking a card to read it arms a +$8–$20/mo
  change and moves the total, and the add-ons sit *below* the commit button. Dirty state is inferred by comparing the
  total to a hardcoded number, so −$8 +$8 reads "no changes" while Smart Rules is off. Domain's blocker: autocharge is
  redefined as auto-renewal, so switching it off to avoid a renewal silently stops transactions reaching the books.
- **V1 Unified Settings** — "Apply changes" commits a recurring price change on one click; `calcTotal()` sums only
  transactions and seats, so a $199/mo Invoicing tier changes the bill without changing the displayed total.
- **Concepts 3-in-1** — every action is `href="#"`; the commit path is entirely unbuilt. The breakdown doesn't foot
  (20% of $293 is $58.60, shown as $52.00) and $241.00 is labelled both "next invoice" and "monthly total" on a yearly
  cycle where the invoice would be ~$2,892.
- **Sketch V1** — all seven billable rows show the identical "20% / 95 USD/mo", the table never totals, and the cancel
  dialog promises a free plan that does not exist.
- **Sketch V2 (both)** — five add-ons share one description that only fits Invoicing, all priced $0.00 beside a live
  Add button, seat entitlement of 2 against a roster of 3, no total anywhere.

### What this does to the recommendation

It strengthens it and shifts the emphasis. The round-2 verdict was "A's shell + v2's billing engine, drop B." With the
UX lens reconciled, **v2's commit model is the part that is not negotiable** — it is 1st on every completed lens at
full scope, and the reason is always the same: it is the only prototype that names the amount, names the forfeit,
blocks a downgrade with specific consequences, and offers a reversible alternative. A remains the right shell (fastest
expert path, one page, live drawer total), but A's four coexisting commit contracts have to collapse into v2's one
before it ships. B stays dropped. C stays the structural runner-up.

The one fix that costs almost nothing and is now confirmed from two directions: **v2's plan switch must come out of the
collapsed disclosure.** All three UX instances named it independently as the top defect of the winning prototype.
