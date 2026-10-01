# Round 1 context — Inventory sync v3 (Ignat's sketches), commit f7a3121

## Primary task
A Synder user with Shopify and QuickBooks connects their Shopify stores to Inventory Sync, fixes what each store still needs, turns sync on, and later checks activity and stock differences.

## The feature (facts, from the CSM Guide SET/4297555974 and the live demo)
QuickBooks Online is the source of truth. Synder checks QuickBooks every 5 minutes and sends stock *changes* (not totals) to every connected Shopify store at one chosen location. A difference that exists before sync starts never closes by itself; the nightly comparison (02:30 UTC) lists differences, and "Accept QuickBooks" sends the difference so Shopify matches QuickBooks; "Ignore" marks it reviewed. Pause keeps reading and queues changes; Disable stops reading and changes made while disabled are never sent. A change is Held when e.g. the QuickBooks item is not matched to a product in that store; Retry sends it after the fix. Matching is by SKU, then by name. The Synder setting "Created product should be" (Settings › <integration> › Products/Services) must be Inventory for each store's integration.

## Prototype
https://dashasyn.github.io/synder-prototypes/projects/inventory-sync-v3/ — the dark top bar is a prototype switcher (Layout 1 · Activity block / 2 · Activity top line; State 1 · First setup / 2 · Store needs fixes / 3 · All connected), NOT product UI. Sample data. Fetch only if the state map doesn't cover something.

## Evidence (read this, not the DOM)
State map (real Chromium): /home/ubuntu/synder-prototypes/projects/inventory-sync-v3/round1/statemap.json — controls[] with commit paths, states[] (full page text + block geometry for 9 states over both layouts), observations[], not_exercised[]. Mechanical CSS issues are already in auto-findings.json — don't report spacing/colour.

## Canonical terminology (Domain, Clarity)
/home/ubuntu/.openclaw/workspace/vocabulary.md

## Known real friction to check against
- KF-2 · Import → Sync drop-off 97.2%: users believed importing was the whole job. Check: after a step completes, is the next required action obvious and adjacent? Does the UI imply the job is done when it isn't?
- KF-4 · Onboarding stepper labels are dead clicks. Check: do the numbered store rows look clickable when they aren't?
- KF-8 · Product Mapping "Create" blocked by an undiscoverable keystroke. Check: committing a value never needs a hidden keystroke.

## Already resolved (do not re-flag)
None — round 1.

## Decided by Ignat — do NOT flag (findings-log.json → declined)
- No "Check again" for the inventory setting: the product detects it automatically; in the prototype "Open Settings" sets it at once.
- The location is never preselected, even when a store has one location.
- Stock differences are not on the store card; they have their own "Stock check" block.
- Activity statuses have no descriptions (removed on purpose).
- No separate "Approve in Shopify" step: Connect is automated (redirect and back, or loader + toast).
- Enable works once at least one store has a location and "Created product should be: Inventory"; mapping does not block Enable.
- The tab name "Reconcile" and the page subtitle "Pushes QuickBooks Online stock movements into your Shopify store." are production names kept on purpose.

## Known prototype limitations (list as gaps if they block you)
- Run now only toasts; there are no Failed sample events; the Shopify install redirect is simulated by an in-page loader.
