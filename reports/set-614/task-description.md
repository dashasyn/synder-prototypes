# SET-614 — Welcome banner (Summary mode)

## Description
Show a one-time "Get started" card on the Summary Dashboard to new users after onboarding.
It gives direction to the first successful summary sync, and makes clear the user can start
immediately without waiting for the import to finish.

Replaces the original "separate welcome banner" approach (see Barbara's comment, 2026-08-18):
the welcome is delivered by the existing first-name greeting plus this 3-step card.

## Scope
- Summary mode only. Per Transaction dashboard is out of scope for this ticket.

## Placement
Summary Dashboard, stacked directly under the import progress alert and above the
Data readiness / Posting to books cards. Full content width, 3 equal columns.

## Trigger and behavior
- Appears on the first app session after onboarding is marked complete.
- Shown once per organization.
- Dismissible via X in the top-right. Once dismissed it does not return.
- Steps are static. No completion tracking, no checkmarks, no auto-dismiss on
  progress — deliberately kept simple for this iteration.

## Content

Card header: Get started in 3 steps

1. Map accounts
Mappings appear as the import runs. You don't need to map them all — a summary is
ready to sync once the accounts it uses are mapped.
Link: Map accounts → Mappings

2. Sync summaries
When a summary has all its mappings, click Sync. If something doesn't go through,
we'll show you what and why.
Link: Sync summaries → Summaries

3. Customize the results
Make the results fit your accounting flow. Change how summaries are built in
Settings, or group accounts your way with Custom groups.
Inline link: Custom groups → Custom groups
Link: Go to Settings → Settings

Illustrations: reuse the existing style — step 1 shows an account being selected,
step 2 shows integrations flowing into Books, step 3 shows the Settings card.

## Out of scope
- Changes to the onboarding flow itself
- Per Transaction dashboard version
- State-aware steps (completion, checkmarks, progressive disclosure)
- SKU / product breakdown link in step 3 — intentionally omitted to keep one clear
  action per step

## Open questions for engineering
1. Does a summary row show how many mappings it is still missing? Step 2's copy tells
   the user to sync "when a summary has all its mappings" — without that signal they
   will sync, fail, and not know why.
2. After a summary has been synced, does changing Settings or Custom groups require
   Rollback and/or Refresh before syncing again? Step 3 does not currently promise a
   redo, but users will attempt it on the summary they just synced.
3. The import progress alert above already links to Settings and Mappings. Consider
   trimming it to the progress line only, to avoid offering the same two destinations
   twice in a row.

## Copy notes
- Strings checked against the Synder copy vocabulary: Books, Import, Sync, Click,
  page names matching the sidebar, sentence case.
- Link labels match destination page names; step titles use the plural form to match
  those pages.
- Step body lengths are within ~10 characters of each other so the three columns
  stay visually balanced.
- Header alternative if the outcome should be named rather than the effort:
  "Get your first summary synced".
