# Round 2 — Prototype reviews & what changed

> 2026-04-22 · Three personas reviewed three prototypes. Verdicts diverged by audience. Targeted fixes applied to each.

## Scoreboard

| Persona | V1 Ledger | V2 Calm Overview | V3 Unified Grid | Preferred |
|---|---|---|---|---|
| **Sarah** (Accountant) | **4/5** | 2.5/5 | 3.5/5 | **V1** — "The only one that looks like it was designed by someone who's reconciled a subscription to a GL." |
| **Mike** (Business owner) | 2/3 | **5/5** | 3/4 | **V2** — "Three glances and I know: I'm fine, I'm paying $241 next month, I can't get surprise-charged." |
| **Viktor** (UX designer) | IA 4 · Ship 3 | IA 3 · Ship 4 | **IA 5 · Ship 4** | **V3** — "The most disciplined. One card shape, state as data. Scales for RevRec-plus-N." |

**Signal:** the three audiences genuinely want three different surfaces. A single merged prototype would under-serve all three. Keep all three; fix each.

## What each persona still wants (applied to the prototype)

### Sarah — accountant fixes applied to V1 "Ledger"
| Ask | Applied? |
|---|---|
| Renewal price + promo end date next to struck-through price | ✅ Essential row now reads "Discounted $92/mo through Mar 13, 2027, then renews at $115/mo unless the discount is reapplied" |
| "One invoice" confirmed in copy | ✅ Hero subtitle + breakdown header now say "One invoice for plan + every add-on including RevRec" |
| Proration preview before Update plan | ⚠️ Promised in hero copy ("mid-cycle changes are adjusted fairly and shown inline"); full modal = next iteration |
| Full change log with who/what/when + CSV export | ✅ Change log tile now lists "Dasha added RevRec (1,000 events @ $79)" with "View full history" and "Export CSV" |
| Named additional-users roster | ✅ Row action already "Manage roster" (not just a counter) |
| Invoice history with tax ID / billing email | ✅ Already in V1; tax ID + billing email tiles surfaced |
| Explain disabled Update plan | ⚠️ V2 has the tooltip; add to V1 next pass |
| CSV export of invoices | ✅ "Export CSV" + "Download all" buttons in invoice history |

### Mike — business-owner fixes applied to V2 "Calm Overview"
| Ask | Applied? |
|---|---|
| Keep "You're all set through [date]" as hero | ✅ Remains the page hero |
| Put $500 autocharge cap near the next-charge number | ✅ Amber "🛡 Capped at $500/month — no surprise charges above this" now lives inside the next-charge card |
| Explain what happens when usage hits 1,000 | ✅ Usage note: "We'll email you at 80%. After 1,000, extra syncs cost $0.04 each — capped at your $500 autocharge limit." |
| Cancel outlined, not red-filled | ✅ Already a danger-ghost button; now also labeled "Start cancellation…" to signal a confirmation flow |
| Drop jargon "prorated mid-cycle" | ✅ Replaced with "mid-cycle changes are adjusted fairly" |

### Viktor — UX fixes applied to V3 "Unified Grid" (and shared blockers)
| Ship blocker | Applied? |
|---|---|
| Status chips not color-alone (WCAG 1.4.1) | ✅ Chips now carry glyphs: `● Active`, `+ Available`, `Top-up` |
| Tooltip on struck-through discount | ✅ Hover on V3's $115/$92 price explains discount + renewal |
| "One invoice" explicit, not implied | ✅ Summary bar: "**One invoice** for the plan + all active add-ons. Price updates live as you change quantities below." |
| Cancel confirmation flow | ✅ All three versions now state "You'll be asked to type CANCEL to confirm" in the danger zone, button suffixed "…" |
| Disabled-button tooltip | ✅ V2 has "Change a quantity above to enable"; to replicate on V1/V3 next pass |

## Converged decisions (applied to all three)
- Danger-zone copy standardized: 90-day retention + typed-CANCEL confirmation.
- Status chips carry a glyph + label, never color-only.
- "One invoice" wording present in all three.

## Ship-blockers still open (next iteration)
1. Live proration preview modal when quantities change (promised in copy, not yet built as a modal).
2. Disabled-button tooltips on V1 and V3 Update/Upgrade states (V2 demos the pattern).
3. Contrast audit on V3 summary bar + V1 dark hero secondary text (needs designer eyes + tool).
4. Keyboard focus order pass across the add-on grid.
5. Empty/loading states for usage bars.

## Recommended foundation for build
Viktor's hybrid stands: **V3 shell** → plan strip, summary bar, unified grid, billing admin row. Pull V1's **full breakdown** into a side-drawer behind "See full breakdown". Keep V2's **greeting tone** in the summary bar for operator users; let accountant users expand into V1 details.

This gives the team one codebase with one add-on component, and the flexibility to surface different density for different users (toggle `?view=calm|ledger|grid`).
