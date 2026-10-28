# Round 1 summary — Admin sidebar · pinned pages (production look)
Lenses: UX ×3 (Ignat asked for UX only). Not run: Domain, Clarity, Trust, A11Y, Fidelity.
Gate: statemap PASS (4/4 panel controls exercised twice) · verify PASS (5 findings, 24–29 items inspected per pass).

Fixed (both versions, regression-tested):
1. Enter in the empty switcher silently switched to a recent org (gap in ux1+ux2, confirmed in browser).
2. Pinned sidebar row: icon/padding were dead clicks (ux2 UX-1, High, confirmed).
3. Focus dropped to <body> after unpin (AUTO-1).
Open (Ignat):
4. Stale clickable results after editing the search text (3/3 passes, Medium) — proposal: grey out until Enter.
5. "Recently viewed" counts only selected orgs (fresh eye).
Declined: cap message off-screen (ux3 UX-2) — catalog fits 1280x800.
