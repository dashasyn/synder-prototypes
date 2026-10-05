# Round 2 context — Inventory sync v3, VARIANT 2

## Primary task
A Synder user with QuickBooks and Shopify connects their Shopify stores to Inventory Sync, gets each store ready, turns sync on, and later checks what was sent and fixes stock differences.

## What this variant is
Variant 2: before the first store is ready the user sees no tabs — an empty state (QuickBooks → Shopify logos, store select, Connect store), then a 2-step onboarding for that store (1 Enable inventory tracking via Open Settings, 2 choose location + Finish setup), then the full product with sync still off and a toast "ready, click Enable". Overview = a top line of 4 tiles (Held · Failed · Pending · Applied in 24h), then Sync + Stock check (left, narrow) and Shopify stores (right, wide). Stock check tab opens straight on the differences of the latest comparison of every store (Store filter, Unresolved only, bulk actions across stores), older comparisons in a collapsible "Previous comparisons". Activity and Mappings tabs, store cards, Sync block, dialogs and the ⋯ menu are IDENTICAL to variant 1 and are reviewed in the variant 1 round — do not review them here; focus on what differs.

## The feature (facts, from the CSM Guide SET/4297555974 and the live demo)
QuickBooks Online is the source of truth. Synder checks QuickBooks every 5 minutes and sends stock *changes* (not totals) to every connected Shopify store at one chosen location. A difference that exists before sync starts never closes by itself; the nightly comparison (02:30 UTC) lists differences; "Update Shopify qty" sends the difference so Shopify matches QuickBooks; "Ignore" marks it reviewed. Pause keeps reading and queues changes; Disable stops reading and changes made while disabled are never sent. A change is Held when e.g. the QuickBooks item is not mapped to a product in that store; Retry sends it after the fix. Mapping is by SKU, then by name, or manual. The Synder setting "Created product should be" (Settings › Products/Services) must be Inventory for each store's integration.

## Already resolved (do not re-flag)
- AUTO-1 (round 1): spacing 6px off the grid → fixed.

## Decided by Ignat — do NOT flag (findings-log.json → declined, plus later decisions)
- No "Check again" for the inventory setting: the product detects it automatically; in the prototype "Open Settings" sets it at once.
- The location is never preselected, even when a store has one location.
- Stock differences are not on the store card; they have their own "Stock check" block.
- Activity statuses have no descriptions; no secondary headline text in Activity; no dividers.
- No separate "Approve in Shopify" step: Connect is automated (redirect and back, or loader + toast).
- Enable works once at least one store has a location and "Created product should be: Inventory"; mapping does not block Enable.
- The Overview Stock check block is informative only: no "Update all", no status chip, no "last check" summary line, no "open N nights"; it links to the details ("Review differences"). Nothing changes stock from the Overview.
- Synder toasts have no Undo (product pattern). Filters clear with ×, there is no "All" option in the Status filter.
- Store names are shown instead of Shopify domains everywhere.
- Page subtitle "Pushes QuickBooks Online stock movements into your Shopify store." and production table columns (Variant "Default Title", "Delta"-like Change column) are kept from production on purpose.

## Known prototype limitations (list as gaps if they block you)
- Run now only toasts; there are no Failed sample events; the Shopify install redirect is simulated by an in-page loader; external links (View in Shopify, QuickBooks documents) only toast.

## Canonical terminology (Domain, Clarity only)
/home/ubuntu/.openclaw/workspace/vocabulary.md

## Known real friction to check against
- KF-2 · Import → Sync drop-off 97.2%: users believed importing was the whole job. Check: after a step completes, is the next required action obvious and adjacent? Does the UI imply the job is done when it is not?
- KF-4 · Onboarding stepper labels are dead clicks. Check: do numbered steps/rows look clickable when they are not?
- KF-8 · Product Mapping "Create" blocked by an undiscoverable keystroke. Check: committing a value never needs a hidden keystroke.

## Prototype
https://dashasyn.github.io/synder-prototypes/projects/inventory-sync-v3/?l=2&s=1 — the dark top bar is a prototype switcher, NOT product UI. Review Variant 2 only. Sample data. Fetch only if the state map does not cover something.

## Evidence (read this, not the DOM)
State map (real Chromium): /home/ubuntu/synder-prototypes/projects/inventory-sync-v3/round2-v2/statemap.json — controls[] with commit paths, states[] (full page text + geometry), observations[], not_exercised[]. Mechanical CSS is in auto-findings.json (clean) — do not report spacing/colour/font size.
