# LogRocket request — Sync details ("Explain") page behaviour

**Requested by:** Ignat, 2026-08-28
**App:** `vn4kxj/synder_test` · **Page:** `/sync/show/{syncId}`
**Hard constraint:** exclude Synder employees. Users are identified by **userID**, not email, so
exclude any session whose identify traits contain `@synder.com` / `@cloudbusinessllc` /
`synder.service@`, plus internal/admin sessions (the admin view renders extra `(A)` fields —
those are staff by definition).

## What we need to know

### 1. Volume & reach
- Sessions that opened `/sync/show/*` in the last 30 and 90 days (external users only)
- Distinct users, and sessions-per-user (is this a one-off or a habit?)
- Share of `/transaction/list` sessions that ever reach `/sync/show/*`

### 2. Entry point
- Which page precedes `/sync/show/*` — is it always the "Explain" link in the transactions list,
  or do people arrive from Dashboard / Syncs history / a bookmark?
- What was the row's **sync status** when they clicked Explain? (Synced vs Synced with warnings
  vs Deleted with warnings.) This is the single most useful number: it tells us whether Explain
  is a warnings-triage tool or a general curiosity click.

### 3. Behaviour on the page
- Median and p90 time on page
- **Scroll depth** — what fraction ever reach *Sync time*, and *Rules*, at the bottom?
- Click counts per control, ranked:
  - the disclosure triangles in **Sync log** (do they expand the nested Product / Account rows at all?)
  - **Show in QuickBooks/Xero** object links
  - `Transaction ID` link out to Stripe/Shopify
  - `View connected Bank Register in …`
  - **Rollback sync** · **Sync again** · **Cancel sync**
  - **Syncs history** · **Transactions list** (back)
  - `Create a rule`, `Smart Rules Recipes`, `Settings`
  - `How to speed up the synchronization` / `Learn more` in Sync time
- Any control with ~0 clicks over 90 days — candidate for removal

### 4. Friction signals
- Rage clicks and dead clicks on this page, by element
- Sessions where the user **returns to the same syncId** more than once in a session
  (= they didn't get their answer the first time)
- Sessions that go `/sync/show/{id}` → back to list → `/sync/show/{id}` repeatedly (hunting)
- Exits straight to Help / support chat / `synder.com/help` from this page
- Errors or slow requests on the page

### 5. The rollback path
- How many external users clicked **Rollback sync**, and what happened next — did they stay to
  watch, hit **Reload**, leave, or cancel?
- Any evidence of accidental rollback (click → immediate Cancel sync, or click → support contact).
  Context: `Rollback sync` is a plain GET link with no confirmation step.

## Why we're asking
The rethink concluded the page buries its own answer: the mapping rows that explain where money
landed in the books are collapsed by default, *Sync time* (support-facing) takes a third of the
page, and *Rules* is a static advert. We need behaviour to confirm or kill that reading — in
particular **whether anyone expands the nested rows** and **whether anyone scrolls to Sync time**.
Full rethink: https://dashasyn.github.io/synder-prototypes/reports/sync-details-rethink/

## Deliverable
Numbers per section above, external users only, with session-replay links for the friction cases
(rage clicks, repeat visits to the same syncId, rollback-then-support).
