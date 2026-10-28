# Mike Torres Feedback — Reconciliation v2 Mocks

> Persona: Mike Torres, Shopify store owner (~$180K/yr), zero accounting background, closes tabs when lost.

---

## Screen 1 (Setup warning)

Okay so I come to this page to just… start the thing. I pick my dates, I see my store is connected, looks good. Then there's this red box on the left side that says "Failed and Rolled back transactions will cause discrepancy." 

I don't know what a "rolled back transaction" is. I don't know what "discrepancy" means in this context — like, will my books be wrong? Will something break? Is it bad? The warning feels urgent but it doesn't tell me what to DO. "Please check them before start reconciling" — check them WHERE? I don't see a link. There's no button that says "show me these transactions." 

My instinct is to just hit "Start reconciliation" anyway because I don't know what else to do. Or I close the tab because I'm scared I'll mess something up.

Also — why is the warning only on the left side? The right side looks totally fine, no warnings. Did I already fix the right side somehow? Or does the right side not matter? Confusing.

**Close-tab risk: HIGH.** No clear next step = freeze = bail.

---

## Screen 2 (Idea A — banner)

I land here and immediately see "There are 10 missing in accounting transactions." Okay, ten things are wrong. That's clear. I like that I can see the total number.

Then it lists: "2 payout syncs," "1 rolled back," "2 failed," "1 unknown." The colors help a little — red feels bad, blue feels like a setting thing. But the instructions after each one are still too wordy and jargon-heavy. "Go to Settings → Payouts → Enable 'Process payouts'" — okay, I can follow that. But "create a journal entry in books manually"? I don't know what a journal entry is. I don't have "books." I have QuickBooks but I barely open it.

The banner is dismissable with an X, which worries me. What if I accidentally close it? I'll lose the instructions and have no idea what to do next.

I like that the banner gives me a summary before I scroll into the table. But the table below doesn't connect back to the banner — I can't tell which row is a "payout sync" vs "failed." So after I read the banner, I'm staring at a wall of identical rows and I don't know what to fix first.

**Close-tab risk: MEDIUM.** Banner helps orient me, but instructions are still too technical.

---

## Screen 3 (Idea B — per-row chips)

Now every row has a colored label on it — "Rolled back," "Payout sync disabled," "Unknown," "Excluded from sync." And when I hover, I get a little tooltip that explains what to do.

This feels way more useful than the banner. I can go row by row and each one tells me its own story. The tooltip for "Payout sync disabled" actually tells me where to go (Settings → Payouts). I can work through the list one at a time.

BUT — "Excluded from sync" is green. Green means good. Why is a problem green? I'd skip that row thinking it's resolved. That's a real mistake waiting to happen.

Also, the tooltip for "Unknown" says "create a manual journal entry in your books to fix it." I still don't know what that means. It sends me somewhere I don't understand.

With 1,002 rows on the right side... chips would be overwhelming. But for my actual life — maybe 3–5 missing transactions a month — this is way better. I'd use this.

**Close-tab risk: LOW-MEDIUM.** Per-row context is really helpful. Green chip for a problem is a bug.

---

## Overall recommendation

**Use Idea B (per-row chips) for the results page.** It's more usable for real-world volumes (a handful of missing transactions). The banner in Idea A gives a nice summary but leaves me stranded at the table with no row-level context.

**Fix Screen 1 (setup warning) first** — it's the biggest close-tab risk right now. Add a link or button that takes me directly to the problem transactions so I'm not just staring at a warning with nowhere to go.

One hybrid idea: keep a small non-dismissable count badge ("3 issues found") at the top of the results page, then let the chips tell the per-row story. Best of both worlds.

---

## Copy rewrites (top 5, plain non-accountant language)

| Original | Mike-friendly version |
|---|---|
| "Failed and Rolled back transactions will cause discrepancy" | "Some payments didn't go through — fix them before you start or your numbers will be off" |
| "Please check them before start reconciling" | "**See the problem payments →**" (make it a clickable link) |
| "create a journal entry in books manually to cover the difference" | "You'll need to add a manual note in QuickBooks to account for this — we can't fix it automatically" |
| "Excluded from sync" (green chip) | "Not synced yet" (use yellow/amber, not green) |
| "There are 10 missing in accounting transactions:" | "10 payments didn't make it into your books — here's why:" |
