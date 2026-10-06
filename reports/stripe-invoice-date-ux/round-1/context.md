# Round 1 context — Stripe invoice date prototype

**Target:** https://dashasyn.github.io/synder-ux-prototypes/prototypes/stripe-invoice-date/
**Primary task:** Choose which date (created vs issued) Stripe invoices carry in the books and in RevRec schedules, and understand what that choice changes.

## Product facts (from the FDD "[Stripe] Invoice date setting", the authoritative spec, no Figma)
- Three settings ship together:
  (1) Per Transaction Stripe settings → Invoices: new **Invoice date** setting = Created date / Issued date.
  (2) Summary Sync **Sales recording date** gains Invoice issued date, next to Invoice created date and Payment date.
  (3) RevRec **Schedule start date** gains Invoice issued date. "Invoice date" is renamed to "Invoice created date" (label only).
- Issued date = Stripe `finalized_at` (the "Date of issue" on the invoice PDF, when the customer becomes liable). Created = when the Stripe invoice/draft was created.
- Defaults: new Stripe connections → Issued date. Existing connections → Created date. No silent re-dating of existing orgs, no migration.
- The Synder transactions table ALWAYS shows the created date. The accounting entry date follows the setting. Sync info (the transaction drilldown) must show the issued date and make clear when the accounting date differs from created (FDD S1.5).
- Plan gate: Pro and above. Below Pro the control is shown under "Upgrade to use" (not hidden). On trial it is available. For Summary, FDD §2 gates "the Summary Sales recording date values introduced here", while S2.3 says the control is "shown, not changeable until Pro+".
- RevRec lock: if RevRec Schedule start = Invoice created date or Invoice issued date, the Sync Invoice date setting cannot be changed. The user is pointed to Schedule start date. If Schedule start = Payment date, the Sync setting can be changed.
- Stripe provider settings save immediately with no confirmation step. RevRec Schedule start change opens a confirmation (inform, not block). The change applies going forward only, and existing schedules keep their dates until a success specialist rebuilds a subscription. Changing the setting alone never re-dates existing schedules.
- RevRec schedule details get an issued-date column for all RevRec orgs. It is blank for rows synced before the release.
- The Sales-tab "Posting date" (cash / balance-transaction side; options Created date / Balance date) is renamed so it is not confused with the new Invoice date. The new label is left to Figma. Behaviour is unchanged.
- Worked example: a 6-month $60,000 subscription, invoice created 2025-12-28, issued 2026-01-06. On Created, recognition puts $10,000 into December 2025 (possibly an already-closed period). On Issued, December is untouched.

## Known issues to ignore
- The dark variant bar at the top is prototype chrome, not product UI. Don't review it as product.
- The four existing Invoices-tab toggles are static context (not clickable). That is intentional.
- Font sizes and visual tokens are handled by a separate deterministic check. Don't report font sizes.

## Known real friction
None of personas/KNOWN_FRICTION.md (KF-1…KF-9) applies directly to a settings select. Treat it as "none".

## Already resolved
None. This is round 1.
