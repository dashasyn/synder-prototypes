# Viktor Harsch — UX Review: Missing Transactions Reason Design

---

## Idea A — Assessment

**Score: 4/10. Looks helpful. Isn't.**

This banner is a FAQ disguised as help. It assumes the user's problem matches one of three pre-written bullet points. It doesn't. The user staring at 1,002 rows doesn't need "most common reasons" — they need *their* reason, right now.

Problems:
- **Generic advice at scale fails.** If payout processing IS already enabled, the user reads bullet 1, checks, finds it's fine, and now has less trust in your product.
- **Walls of instructional text get zero reads.** Eye-tracking studies (Nielsen, 2020) confirm users skip anything that looks like system boilerplate. Orange heading doesn't save it.
- **Permanent real estate tax.** That banner eats ~15% of vertical space on a page where table density matters. In the Idea B mockup someone added a dismiss X — even the team knows it shouldn't be permanent.
- **Zero recoverability.** Dismiss it? It's gone. Need it again? Nowhere to find it.

The one thing Idea A gets right: surfacing that something needs action before the user digs into 1,000 rows.

---

## Idea B — Assessment

**Score: 6/10. Right direction. Catastrophic execution.**

Per-row context is the correct mental model. Users work row-by-row. Giving each row its reason is how Jira, Linear, and Notion handle multi-state objects. This is table stakes (pun intended).

Problems:
- **The truncated inline paragraph is unusable.** "Enable the p… Settings. Go… Enable 'Pro…" — this is an accessibility violation and a usability failure. Truncated prose in a data cell is never acceptable. Ever.
- **All chips are orange.** No hierarchy. "Payout sync" (systemic fix, affects many rows) looks identical to "Excluded from…" (one-off config). Users can't triage.
- **"–" for unknown is an honest lie.** You're admitting you don't know. Fine. But you give users no next action. That's where trust dies.
- **Column squishes IDs and amounts.** Transaction data is the primary job. The reason column is support context. Hierarchy is inverted.

---

## Recommendation

**Ship Idea B, not Idea A. But rebuild B's execution entirely.**

Idea A is a band-aid. Idea B scales to 3 rows and 1,000 rows. Fix the chip+tooltip pattern and you have something shippable.

---

## The Actual Solution (Ship This)

**Layout spec:**

1. **Slim summary bar** above the table, below the tabs — not a banner. Single line:  
   `10 not matched: 7 Payout sync · 2 Rolled back · 1 Unknown`  
   Each label is a filter chip. Click "Payout sync" → table filters to those rows. This replaces the banner entirely.

2. **"Reason" column** — rightmost, 120px max. Chip only, no inline paragraph. Chip variants:
   - `Payout sync` — amber background `#FEF3C7`, amber text — systemic, fixable in Settings
   - `Rolled back` — slate background `#F1F5F9`, slate text — historical, informational
   - `Excluded` — same slate
   - `Unknown` — light red `#FEE2E2`, red text — needs attention

3. **Chip click/hover → popover tooltip**, max 2 sentences + one CTA link:
   - Payout sync: "Payouts aren't being synced. Enable payout processing in Settings → Payouts. [Go to Settings →]"
   - Rolled back: "This transaction was rolled back in Synder. Re-sync or create it manually in your books."
   - Unknown: "We couldn't determine why this is missing. [Contact support →]"

4. **Dismiss the banner concept entirely.** Summary bar + chips do the job without stealing vertical space.

---

## Copy Suggestions

| Location | Current | Viktor's Fix |
|---|---|---|
| Tab label | `Not matched 10` | `Not matched · 10` (visual breathing room) |
| Banner heading | "How to fix Not matched" | Delete it. Use summary bar. |
| Chip | "Payout sync" | "Payout sync" ✓ (keep, it's scannable) |
| Chip | "Excluded from..." | "Excluded" (don't truncate a chip label, ever) |
| Tooltip CTA | (none) | "Go to Settings →" / "Re-sync transactions →" |
| Unknown rows | "–" | `Unknown` chip + tooltip: "We couldn't detect the reason. Contact support." |
| Summary bar | (doesn't exist) | `10 not matched: 7 Payout sync · 2 Rolled back · 1 Unknown` |
