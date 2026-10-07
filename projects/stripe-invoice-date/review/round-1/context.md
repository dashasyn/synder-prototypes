# Round 1 context: Stripe invoice date prototype (Dasha's)

**Target:** https://dashasyn.github.io/synder-prototypes/projects/stripe-invoice-date/
**Primary task:** choose which date (created vs issued) Stripe invoices carry in the books, in Summary sales and in RevRec schedules, and understand what that choice changes.

## What is in scope
Only what this feature adds or changes:
- **Invoices tab:** the *Invoice date* row, including its lock note and plan gate.
- **Sales tab:** the renamed *Payment posting date* (label + description).
- **Sync details:** the *Issued date* and *Date in books* rows.
- **Summary settings:** the *Sales recording date* card (options + description + gate).
- **RevRec Recognition settings:** *Schedule start date* (options) and its confirmation dialog.
- **Spec note "Schedule details":** the new *Invoice issued date* column and the post-change rows.
- Cross-screen behaviour between these.

Everything around them (other settings, their descriptions, the app sidebar, the Configuration and Settings overlays, banners) is the **live product**, rebuilt from Ignat's screenshots of production. It is context, so don't report problems in live strings that this feature doesn't touch.

## Product facts (FDD "[Stripe] Invoice date setting", the authoritative spec; no Figma)
- There are three settings, and they ship together.
  1. Per Transaction Stripe settings → Invoices gets a new **Invoice date** setting: Created date / Issued date.
  2. Summary Sync **Sales recording date** gains Invoice issued date, next to Invoice created date and Payment date.
  3. RevRec **Schedule start date** gains Invoice issued date, and "Invoice date" is renamed to "Invoice created date" (label only).
- **Issued date** = Stripe `finalized_at` ("Date of issue" on the invoice PDF, when the customer becomes liable). **Created** = when the Stripe invoice/draft was created.
- **Defaults:** new Stripe connections get Issued. Existing connections keep Created. Nothing is silently re-dated, and there is no migration.
- **Transactions table:** it always shows the created date. The accounting entry date follows the setting. Sync info must show the issued date and make it clear when the accounting date differs from created (S1.5).
- **Plan gate:** Pro and above. Below Pro the control is shown under "Upgrade to use", not hidden. On trial it's available.
- **RevRec lock:** if Schedule start = Invoice created date or Invoice issued date, the Sync Invoice date can't be changed and the user is pointed to Schedule start. If Schedule start = Payment date, it can be changed. Schedule start itself is always changeable by the RevRec user ("do not implement a lock").
- **Saving:** Stripe provider settings have no confirmation step. Changing RevRec Schedule start opens a confirmation (it informs, it doesn't block). The change applies going forward only, and existing schedules keep their dates until a success specialist rebuilds a subscription.
- **Issued-date column:** RevRec schedule details get one for all RevRec orgs. It is blank for rows synced before the release.
- **Sales tab:** "Posting date" (the cash / balance-transaction side; options Created date / Balance date) is renamed so it isn't confused with Invoice date. Behaviour doesn't change.
- **Worked example:** a 6-month $60,000 subscription, invoice created 2025-12-28, issued 2026-01-06. On Created, $10,000 of recognition lands in December 2025 (possibly already closed). On Issued, December is untouched.

## Decisions already made — do not re-flag
See `../findings-log.json` → `declined`:
- the placement under *Sync unpaid (open) invoices*
- the plan-gate pattern
- the option-level Summary gate
- Update as the save model on Stripe settings

## Open with Ignat (you may comment)
- A combined Invoice date description is proposed but not applied.
- Whether the RevRec confirmation dialog duplicates the page's existing blue banner.
- Live *Sales recording date* is org-level while Issued is Stripe-only.

## Known issues to ignore
- The dark bar at the top is prototype chrome.
- "[live copy not captured]" markers and the spec-note tag are honest placeholders.
- Font sizes are checked separately (auto check is clean).

## Known real friction
None of KF-1…KF-9 applies directly.
