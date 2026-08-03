# Settings rework — Round 2 validator findings (2026-08-03)

Targets: `proto-a.html`, `proto-b.html`, `proto-c.html`, `manage-subscription-v2.html` (local files, newer than published).
Validators run: UX, Domain (accountant), Clarity (biz owner), Fidelity (vs spec), Trust (does the UI lie?).
Nothing applied yet — awaiting Ignat's direction.

## Per-validator ranking

| Validator | Ranking (best → worst) |
|---|---|
| UX | C · A · v2 · B |
| Domain | v2 · A · B · C |
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
- C is the structural runner-up — best UX ranking, zero Clarity Criticals, and the cart model genuinely prevents
  surprise charges — but the same cart model produces its own honesty problems ("Save details" doesn't save, plan
  card goes stale after `applyCart()`), and Cancel filed under "Billing help" is the single worst trust signal in
  the set.
- B is last on three of four rankings and carries 5 Criticals. Two of its problems are structural, not bugs: the
  critical connection alert sits behind a tab nobody lands on, and the matrix — the whole page — is the part both
  UX and Clarity understood least.

**This reverses the earlier recommendation of B**, which was made on layout logic before any validator pass. B's
"answer what Pro costs at my volume without navigating" advantage is real, but it can be imported into A's drawer;
the buried-alert and matrix-legibility problems cannot be fixed without dismantling what makes B B.
