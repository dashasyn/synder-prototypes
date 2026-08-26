# Sync details page ("Explain") — production research
**Date:** 2026-08-26 · **Source:** demo.synderapp.com, org "Per transaction test" (170 txns)
**URL pattern:** `/sync/show/{syncId}` · entry point is the **"Explain"** link in the
Transactions list Action column. Rows that have never been synced have **no Explain link at all.**

## Page skeleton (identical across every transaction observed)
1. **Top action bar** — `← Transactions list` · `Syncs history` (`/sync/list?webhookId=…`) · `Rollback sync` (`/sync/rollback/{id}`)
2. **Sync info** — 8 fixed rows: Sync ID · {Integration} company · {Books} company · Status · Sync Start Date · Sync Date Finished · Amount · Transaction date · Transaction ID
3. **Sync log** — a **tree**, one row per object Synder created in the books, expandable
4. **Sync time** — a tree, per-process duration + % of total, expandable
5. **Rules** — a static marketing block ("Automate your processes with rules" / Create a rule). Identical on every page; carries no information about *this* sync.

## What actually varies: the Sync log tree
| Transaction type | Sync ID | Top-level rows | Nested under parent | Total |
|---|---|---|---|---|
| **Payout** | 603446 | Transfer | — | **1** |
| **Invoice payment** | 603447 | Invoice · Payment · Expense | Product or Service, Account (under Invoice) | **5** |
| **Subscription payment** | 603448 | Invoice · Payment · Expense | Product or Service, Account | **5** |
| **Payment** (one-off) | 603623 | Sales Receipt · Expense | Product or Service, Account | **4** |

So the range is **1 row to 5 rows across two levels** — and the *nouns change completely*
(Transfer vs Invoice+Payment vs Sales Receipt). Nothing on the page tells the user why.
The two nested rows are collapsed by default, so "Account: Stripe sales — your sale was mapped
to this income account" (the single most useful line for an accountant) is hidden behind a
4px triangle.

## Sync time also varies by type
Payout = 8 processes, 3.1s total, one Stripe query ("get Payout details").
Invoice payment = 8 processes, 11.6s, five Stripe queries (Invoice, Charge, Invoice Payment,
Price, …) and 84% of the time in "QuickBooks Online query/posting".
Useful for support; almost certainly noise for the accountant who clicked "Explain".

## A third structural variant: rollback in flight
Reached accidentally (see Caveat). The page changes shape:
- A banner appears: *"Processing sync… Reload the page to see the updated status. Rollbacks in queue: 1"* + a **Reload** button (no auto-refresh)
- Top actions change: `Rollback sync` → **`Cancel sync`**
- Status → `Rollback scheduled`; **Sync Start Date and Sync Date Finished go blank**
- Sync log gains a **new column — `Rollback status`** (In progress) — so the table is 5 columns here and 4 columns everywhere else

## ⚠️ Finding: Rollback sync is a destructive GET with no confirmation
`Rollback sync` is a plain `<a href="/sync/rollback/{id}">`. Following it **immediately queues
the rollback** — no dialog, no "are you sure", nothing to cancel before it starts. Any prefetch,
middle-click, bookmark, crawler or accidental Enter on a focused link deletes entries from the
books. This is the same class as the prototype's TRU findings but worse, because it is a URL.

## What could NOT be observed
This org only holds **Synced** and **Ready to sync**. There is no Failed, Not parsed, Skipped,
Excluded from sync, Synced with warnings, or Rollback failed sync anywhere in it, and the other
two orgs are expired/archived. So the **error variants of this page are undocumented** — which is
exactly where "different previews and content" matters most, and where the design cannot be
settled by observation. Treat as unknown, not clean.

## Caveat — I changed demo data
While probing the action set I navigated to `/sync/rollback/603447`, which queued a real
rollback on that transaction (Invoice payment, 20.85 USD, Sandbox Company_US_1). It is now
`Rollback scheduled`. Recoverable — it can be synced again — but it was not intentional, and it
happened *because* the action has no confirm step. Nothing else was modified; everything after
that point was read-only `/sync/show`.

---

# Rethink — the conclusion

## The core problem
The page is organised around **Synder's process** — Sync info, Sync log, Sync time, Rules —
but the question a user brings to it is **"what did this do to my books, and is it right?"**
Every structural problem below follows from that mismatch.

**Nobody clicks "Explain" on a clean sync.** They click it when a number looks wrong. Yet the
only variants that exist are success variants, and the error variants are undesigned (and, in the
demo data, unobservable). The page explains in detail the case nobody needs explained.

## What the evidence says
1. **The answer is the thing that's collapsed.** `Account: Stripe sales — your sale was mapped to
   this income account` is the line that resolves "why is my P&L wrong". It is hidden behind a 4px
   triangle, two levels deep. The visible rows are `Invoice was created` / `Payment was created` /
   `Expense was created` — a receipt, not an explanation.
2. **"X was created" is not an explanation.** A Payout's entire log is one row: *Transfer was
   created*. That tells the user nothing they didn't already know from the status badge.
3. **Sync time is a third of the page and is support-facing.** "84% in QuickBooks Online
   query/posting" has no action attached for an accountant.
4. **The Rules block is a static advert.** Identical on every sync, says nothing about this one.
5. **No state-aware actions.** Three actions, fixed. On a synced transaction the only thing offered
   is the destructive one — and it is a GET with no confirm.

## Recommendation — restructure around the outcome, keep the page
**Option A · Outcome first** ← recommended. No new screens, no new data.
- **Lead with one plain sentence**, generated from the log tree: *"This sale was recorded in your
  books as Invoice 26EC8A01-0209 for 20.85 USD, income to Stripe sales."* For a payout:
  *"This payout was recorded as a Transfer to your bank register."*
- **Invert the disclosure.** Expand Account + Product or Service by default; collapse the object
  IDs. Mapping is the content; ids are the reference.
- **Demote Sync time** behind a `Technical details` disclosure. Nothing removed, just not first.
- **Replace the Rules advert** with the rules that actually ran on *this* sync — and only offer
  "Create a rule" when none did.
- **Make actions state-aware:** Ready to sync → `Sync now`; Synced → `Rollback` (POST, confirmed)
  + `Re-sync`; Failed → `Retry` + the specific thing to fix; Rollback in flight → `Cancel sync`.
- **Fix the destructive GET.** `Rollback sync` must be a POST behind a confirm that names what
  will be removed from the books and says it can be synced again.

**Option B · Two tabs** — `Outcome` / `Technical`. Cleanest separation, but it hides the
technical view one click deeper for support and costs a real build.

**Option C · Side sheet from the list** — "Explain" opens a sheet over the transactions table with
the outcome sentence and the mapping rows; "Full sync details" links to this page. Keeps the user
in their filtered list. Best paired with the transactions-table work, not instead of Option A.

## Do this first
Design the **Failed** and **Not parsed** variants before touching the success variant. That is the
case the page exists for, it is the one with no design, and it is the one I could not observe.
