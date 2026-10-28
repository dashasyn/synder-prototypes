# Round 2 context — Inventory sync v3, VARIANT 1

## Primary task
A Synder user with QuickBooks and Shopify connects their Shopify stores to Inventory Sync, gets each store ready, turns sync on, and later checks what was sent and fixes stock differences.

## What this variant is
Variant 1: setup happens inside the product. With no store connected the Overview shows every Shopify integration as a "Not connected" card and an info alert explains the first steps; the other tabs show only an info alert with Connect store. Overview = three columns: Activity block (+ Stock check block under it) · Sync · Shopify stores. Stock check tab = a list of comparisons; open one to see its differences. Activity and Mappings tabs are shared with variant 2 and are reviewed in THIS round only.

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
https://dashasyn.github.io/synder-prototypes/projects/inventory-sync-v3/?l=1&s=1 — the dark top bar is a prototype switcher (Variant 1/2; State 1 First setup / 2 Store needs fixes / 3 All connected), NOT product UI. Review Variant 1 only. Sample data. Fetch only if the state map does not cover something.

## Evidence (read this, not the DOM)
State map (real Chromium): /home/ubuntu/synder-prototypes/projects/inventory-sync-v3/round2-v1/statemap.json — controls[] with commit paths, states[] (full page text + geometry), observations[] (incl. tooltip texts), not_exercised[]. Mechanical CSS is in auto-findings.json (clean) — do not report spacing/colour/font size.
