# Mike Torres — UX Feedback: "Missing in Accounting" Reasons
*Persona: Shopify + Amazon seller, ~$180K/year, no accounting background, has rage-quit tools before*

---

## Idea A — Assessment

**First reaction:** That orange banner catches my eye, which is good. But then I read it and my brain locks up. "Resolve all transactions in Not matched and Discrepancy to finish reconciliation" — I don't know what "reconciliation" means in this context. Are my books broken? Did I do something wrong? The word "discrepancy" makes me nervous.

The three bullet points feel like homework. Step one tells me to go to Settings → Payouts → Enable something. Okay, but *do I need to do all three steps? Just one? In order?* It doesn't say. I'm already hovering over the close tab.

**Biggest problem:** One banner for 1,002 rows means I have no idea *which* transactions need which fix. I'd read the banner, think "okay I guess I'll check Settings," go there, come back… and still see 1,002 rows. I'd assume the tool is broken and give up.

**Close-tab risk: HIGH.** Too much to read, no clear single next action.

---

## Idea B — Assessment

**First reaction:** Oh, this is way better. Each row tells me *why that specific transaction* is missing. I can scan the "Missing reason" column and immediately see if it's the same problem repeated or a bunch of different things.

The chips ("Payout sync", "Rolled back", "Excluded from…") at least give me a label. But the truncated text underneath — "Enable the p… Settings. Go… Enable 'Pro…" — is useless. It cuts off right before the part I need. Feels like the tool is teasing me.

**What I'd want:** Click the chip, get a plain-English popup that says exactly what happened AND exactly what to do. One sentence max. No accounting terms.

**Close-tab risk: MEDIUM.** The per-row reason is a great idea, but the truncated text kills the momentum.

---

## Recommendation

**Go with Idea B** but fix the inline text. Don't truncate the explanation — either show it fully in a tooltip/popover on click, or make the chip itself a button that opens a short "here's what to do" panel. Keep the banner from Idea A as a *summary only* (e.g., "10 transactions need attention — most are a quick settings fix"), not a wall of instructions.

Bonus: If 8 out of 10 rows have the same reason, surface that upfront: *"Most of these are missing because payout processing is off. Fix it in one click →"*

---

## Copy Suggestions (plain non-accountant language)

1. **Instead of:** "Resolve all transactions in Not matched and Discrepancy to finish reconciliation."
   **Try:** "These sales didn't make it into your books yet. Here's why — and how to fix each one."

2. **Instead of:** "Check if the payout processing is enabled. Go to Settings → Payouts → Enable 'Process payouts'"
   **Try:** "Your Stripe payouts aren't being recorded. Turn this on in Settings → it takes 10 seconds."

3. **Instead of chip label "Payout sync"**
   **Try:** "Not recorded yet" or "Stripe payout missed"

4. **Instead of:** "Sync all not-synced transactions for the selected time period."
   **Try:** "These sales exist in Stripe but weren't pulled in. Click Sync to bring them over."

5. **Instead of:** "If the transactions are still missing in accounting, create missing transaction in books manually."
   **Try:** "Still missing after syncing? Add it yourself — we'll walk you through it (takes 2 minutes)."
