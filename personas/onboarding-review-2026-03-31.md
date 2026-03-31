# Onboarding Prototype Review — 3 Persona Panel
**Date:** 2026-03-31
**Prototype:** https://dashasyn.github.io/synder-prototypes/onboarding/
**Reviewers:** Sarah Chen (CPA), Mike Torres (Business Owner), Viktor Harsch (UX Auditor)

---

## 🔴 UNIVERSAL ISSUES (flagged by all 3 personas)

### 1. Sync Mode Selection = Conversion Killer
- **Sarah:** "Per transaction" features mention "Customer & invoice tracking" — does Synder CREATE invoices in QBO? This would cause duplicates. "Summary" mentions "COGS & inventory assets" but "Per transaction" says "Product cost tracking" — what's the actual difference?
- **Mike:** "I genuinely do not know what the difference means in practice. 'Journal entries' is a college accounting class word. I did not take that class." — 🔴 40-50% quit risk
- **Viktor:** Irreversible decision during onboarding with no undo = conversion killer. "Stripe doesn't ask you to choose a webhook mode during signup."
- **THE WARNING:** "Changing sync mode later requires a new organization" — terrifies Mike, frustrates Sarah, infuriates Viktor

**FIX:** Replace with smart recommendation quiz ("How many orders/month?") OR make it changeable later OR default to Per Transaction and let users switch in settings.

### 2. Jargon Without Explanation
- "Reconcile" — appears 3 times, never defined. Mike: "I don't know what reconciliation means and I'm not going to google it"
- "Journal entries" — meaningless to business owners
- "COGS" — Mike: "COGS? I sell phone cases. Is that relevant to me?"
- "P&L" — known to most but paired with jargon ("reconcile") creates anxiety
- **Sarah agrees** these are fine FOR HER but recognizes they exclude the majority audience

**FIX:** Plain-English alternatives everywhere. "Reconcile" → "match your sales to your bank deposits." Add tooltips for technical terms.

### 3. Revenue Field — No Explanation
- **Mike:** "Why do you need this? Is this to put me in a pricing tier? Are you going to charge me more?" — 30% quit risk
- **Sarah:** "Revenue is used for what, exactly? If so, say that."
- **Viktor:** "Required field that feels invasive without explaining the value exchange"

**FIX:** Add "(helps us recommend the right plan)" or similar one-liner.

---

## 🧮 SARAH-ONLY (Accountant Issues)

### Critical (🔴)
1. **No multi-client scalability info** — "I'm entering one client here. What about the other 39? Do I repeat Screens 4b→9 for each?"
2. **Client count question with no context** — "Does it affect pricing? Can I add clients later? Is there a per-client fee? I'm not guessing — I'm leaving."
3. **Missing Chart of Accounts mapping** — "The single most important accounting configuration question and it's completely absent"
4. **Landing page ignores accountants entirely** — "Trusted by 10,000+ businesses — are any of them accounting firms?"
5. **No accounting basis question** — cash vs accrual is fundamental, never asked
6. **📊 icon for "Where do you keep your books?"** — "That's analytics iconography, not accounting. Use 📒"

### Medium (🟡)
7. Fiscal year start date missing
8. No mention of QBO bank feed conflicts
9. Industry options inconsistent: 16 on firm screen, 5 on client screen
10. No OAuth permission scope disclosure before connecting
11. Website field during onboarding = "CRM data, not configuration data"
12. "How long has your Client been in business?" — unexplained, capital "C" inconsistent

---

## 🛍️ MIKE-ONLY (Business Owner Issues)

### Would Quit (🔴)
1. **Sync mode warning** — permanent decision he doesn't understand (covered above)

### Annoyed (🟡)
2. **Sage Intacct / NetSuite on platform screen** — "They look enterprise-y. Makes me wonder if this tool is for big companies and I'm in the wrong place"
3. **"Select all that apply" missing on platform selection** — might only connect Shopify and miss Amazon
4. **Import date picker unclear** — "Do I pick from? To? A range? What happens to older transactions?"
5. **No progress indicator during import** — "Show X of Y transactions imported"

### Mildly Confused (🟢)
6. "SOC 2 Type II" — means nothing to him
7. "Intuit" SSO — doesn't know that's QuickBooks

---

## 😤 VIKTOR'S PRIORITY MATRIX

### 🔴 High Impact × Quick Dev (DO THESE FIRST)
1. **Add "~3 minutes" time estimate to welcome screen** — missing from UI despite being in design notes. Top completion driver per Appcues data.
2. **"Sign up with email ↓" arrow is ambiguous** — implies scrolling, not expanding. Use ▼ chevron or change copy.
3. **"Intuit" SSO label** — non-accountants don't know Intuit. Change to "Continue with QuickBooks (Intuit)"
4. **Revenue field: add "why we ask"** — one line of tooltip copy
5. **Sync mode: add guided recommendation** — "How many orders/month?" auto-selects mode
6. **Screen 3b "Other" free-text is a dead end** — if it doesn't route differently, it's a lie
7. **"★★★★★ 4.8/5 from 3,400+ reviews"** — no source attribution. Add G2/Capterra logo.
8. **Step descriptions are vague** — "tailor your experience" = marketing spin. Say what actually changes.

### 🟡 Low Impact × Quick Dev (EASY WINS)
1. Review source attribution (add G2 logo)
2. Replace generic avatar silhouettes with real customer logos
3. Move "Sign in" link to top-right ghost button
4. Fix emoji: 📋 for accountant → 💼 or 🧾
5. "Let's set up your account" headline — boring. Try "You're 3 minutes away from automated bookkeeping"
6. Add "select all that apply" to platform selection

### 🟠 High Impact × Long Dev (PLAN THESE)
1. UTM-based personalization on landing page
2. Mobile-first redesign of 50/50 split signup
3. Step-jumping for return/savvy users
4. Replace Screen 3b "Other" with structured options
5. Make branching logic explicit on role cards

### ⚪ Low Impact × Long Dev (BACKLOG)
1. Apple SSO cross-browser testing
2. Progress persistence (resume on tab close)
3. Future-proof role grid for 3-4 options

---

## ✅ WHAT ALL THREE AGREED WORKS WELL

1. **SSO-first progressive disclosure** — correct pattern, good execution
2. **"No credit card needed"** — reduces friction, well-placed
3. **3-step progress overview** — anxiety reducer, sets expectations
4. **Cards > dropdown for role selection** — scannable, clear differentiation
5. **Trust blocks (Screens 7a/7b)** — Sarah: "addresses my data integrity concerns." Mike: "this is the right thing to say." Viktor: "good but should appear earlier"
6. **"I don't have accounting" option** — honest, accommodating
7. **Top 6 platforms + expandable** — data-driven, reduces overwhelm
8. **Import progress + "explore while we work"** — good async pattern

---

## 🎯 TOP 5 "FIX THIS YESTERDAY" LIST

| # | Issue | Personas | Est. Effort |
|---|-------|----------|-------------|
| 1 | Sync mode = irreversible decision users don't understand | All 3 | Medium (quiz logic + copy) |
| 2 | Missing "~3 minutes" time estimate on welcome screen | Viktor | 5 min (one line of copy) |
| 3 | Revenue field has no explanation | Sarah + Mike | 5 min (tooltip) |
| 4 | Jargon never explained (reconcile, journal entries, COGS) | Mike + Viktor | 1 hour (tooltips + rewrites) |
| 5 | No multi-client scalability info for accountants | Sarah | Medium (copy + maybe UI) |
