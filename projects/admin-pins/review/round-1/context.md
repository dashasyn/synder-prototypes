# Round 1 context: Admin sidebar · pinned pages (production look)

**Target:** https://dashasyn.github.io/synder-prototypes/projects/admin-pins/ (local file projects/admin-pins/index.html)
**Primary task:** a Synder support agent (an admin) jumps between customer organizations many times a day and opens their 2–3 most-used admin pages without going through the Administrative functions catalog every time.

## Users
Synder support team only (internal admins), expert daily users, desktop ≥1280px. Org names only; support has no orgs of their own.

## Decisions already made by Ignat — do not re-flag
- Pins: up to 10, manual only, added at the bottom, no reorder; Organizations pinned by default; pin icon only on the Administrative functions page (not on the pages themselves); unpin from the same icon or the sidebar on hover; pin saves instantly on click; no confirmation; long names wrap to 2 lines.
- At 10 pins: other pin icons disabled + inline error "Unpin a page to add another" next to the page title.
- No section label above pins; a 3px divider below the admin block (Administrative functions + pins).
- Sidebar must keep the production look (grey, dividers, blue icons, solid blue active row) — visual style is out of scope.
- Org switcher: search runs on Enter only (backend cost), spinner imitates the request; names only, no IDs; empty field shows Recently viewed (5) + All organizations; one org may appear in both lists.
- Switcher and row Select land on Dashboard; Select Organization on the org page keeps the user on the page; every select shows a green top-centre toast with no Undo.
- Selected org: row shows grey "Selected" text; org page shows a "Selected" chip and hides the green button.
- Failed switch → error toast (not modelled).

## Known issues to ignore
- Production shell (top bar, promo card, stub pages marked "[live page not captured]", mock filters, unwired production buttons).
- Visual taste, colour, spacing.
