# New User Flow Analysis — Summary
**Date:** March 20, 2026 | **Analyst:** Dasha | **Data period:** 30–90 days

---

## Key Numbers
- **1,101** sessions reached onboarding page (last 30 days)
- **63.9%** drop-off at role selection ("Choose an option") — the #1 problem
- **34.4%** overall funnel completion rate
- **2** active JavaScript bugs blocking user flows

---

## Top 3 Critical Issues

### 1. Role Selection Abandonment (63.9% drop-off)
The "Choose an option" dropdown on `/onboarding/index` loses nearly two-thirds of all users. The label provides zero context about what's being selected or why. Users land, see an opaque selector, and leave.

**Fix:** Replace with visual card-based selector with clear descriptions ("I sell on marketplaces", "I have an online store", "I run SaaS"). Consider auto-detecting from signup context.

### 2. TypeError Blocking Mapping Page (Active Bug)
`TypeError: Cannot read properties of undefined (reading 'email')` — affects 3+ sessions, still active today. Completely prevents new users from completing onboarding when they reach the mapping/currency step.

**Fix:** P0 hotfix. Add null-check for email property. Investigate race condition.

### 3. No Progress Indication or Welcome Context
Users go from signup directly to role selection with no welcome screen, no progress bar, no "here's what to expect." The marketing site promises "three simple steps" but the app doesn't show them.

**Fix:** Add welcome interstitial + persistent progress stepper showing Step X of Y.

---

## Additional Major Findings

- **Fragmented onboarding paths:** Sync and RevRec have completely separate onboarding flows at different URLs
- **No post-onboarding guidance:** First-session users scatter to 9+ different pages with no guided path
- **Pricing inconsistency:** Plan names differ across pages (Starter/Medium/Scale/Enterprise vs Essential/Pro)
- **Product Mapping JSON bug:** "Converting circular structure to JSON" error breaks Product Mappings
- **Cookie banner friction:** "Accept all cookies" is a top click event for new users

---

## Recommendations (Prioritized)

### Immediate (This Sprint)
1. Fix TypeError on Mapping page (P0 bug)
2. Fix circular JSON error in Product Mappings
3. Redesign role selection UX (biggest ROI opportunity)

### Next Sprint
4. Add progress stepper to onboarding
5. Add welcome/context screen after signup
6. Create post-onboarding guided checklist
7. Standardize pricing/plan names across site

### Backlog
8. Unify Sync and RevRec onboarding flows
9. Add pricing calculator/slider
10. Simplify pricing comparison table
11. Implement SSR for signup page
12. Minimize cookie banner on conversion pages
13. Offer enhanced onboarding support on all plans (30-day chat for everyone)

---

## Limitations
- No visual screenshots (browser unavailable; app is authenticated SPA)
- Some LogRocket queries hit rate limits before full analysis
- "Average time to first sync" metric could not be retrieved
- Signup form itself not walkable without creating a fresh account

## Full Report
See `report.html` in this directory for the complete analysis with flow map, friction log, copy audit, and behavioral data.

---

## LogRocket Dashboard Links
- [Onboarding Funnel](https://app.logrocket.com/vn4kxj/synder_test/metric/create?galileoChatID=019d0ad8-91fd-7348-a7aa-4c0cdd9aa0f4)
- [Session Replay Dashboard](https://app.logrocket.com/vn4kxj/synder_test/sessions)
