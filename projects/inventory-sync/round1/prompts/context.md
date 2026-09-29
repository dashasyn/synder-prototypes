# Round 1 context — Inventory sync setup flow (v3, commit 26106a1)

## Primary task
A Synder user with Shopify and QuickBooks sets up inventory sync so that Shopify stock follows QuickBooks quantities, and then keeps it running.

## Background (the feature)
New beta feature: Synder reads quantity changes in QuickBooks Online every minute and pushes the change (delta, not the total) to Shopify. Because only changes are sent, a stock difference that exists before sync is turned on never closes by itself. A QuickBooks item mapped to two Shopify products only updates one of them (observed on the real demo). The "Created product should be: Inventory" setting is per Shopify integration and lives in Synder Settings → Products/Services.

## Prototype
https://dashasyn.github.io/synder-prototypes/projects/inventory-sync/  — dark top bar is a prototype state switcher (1 · First setup / 2 · Sync running), NOT product UI. Fetch the URL only if the state map doesn't cover something.

## Evidence (read this, not the DOM)
State map (real Chromium): /home/ubuntu/synder-prototypes/projects/inventory-sync/round1/statemap.json — controls[] with before/action/after + liveness and commit paths, states[] (full Overview text in 11 states with each step's state), observations[], not_exercised[]. Mechanical CSS issues are already covered in auto-findings.json — don't report spacing/colour.

## Known real friction to check against
- KF-2 · Import → Sync drop-off 97.2%: users believe importing is the whole job; the next required action wasn't obvious. Check: after a step completes, is the next required action obvious and adjacent? Does the UI ever imply the job is done when it isn't?
- KF-4 · Onboarding stepper labels are dead clicks: users expect step labels to navigate. Check: are step indicators clickable, or clearly non-interactive?
- KF-8 · Product Mapping "Create" blocked by an undiscoverable keystroke. Check: committing a value never needs a hidden keystroke.

## Already resolved (do not re-flag)
None — round 1.

## Decided by Ignat — do NOT flag
- Step 2 cannot deep-link to Products/Services; the product can only open general Settings. A popup is impossible. The numbered path + "Check again" is the chosen pattern.
- Strict order: one open step at a time is intentional.
- The second/third store (any store added via "Connect another Shopify store") is SAMPLE data, labelled "Sample" — its numbers are placeholders.
- "Disable" was removed on purpose (only Pause) until the developer explains the difference.

## Known prototype limitations (not design findings — list as gaps if they block you)
- "Check again" always succeeds (the "still not changed" branch is not built).
- "Open Settings" and "View in Shopify" only toast / have no target.
- Toasts stand in for real navigation.
