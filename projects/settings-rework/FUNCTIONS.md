# Function inventory — Organization settings / Manage subscription / Update plan

Captured live from `demo.synderapp.com` v11.7.54 on 2026-07-31.
Every function below must exist in all three prototypes. IDs are used by the validator report.

## Page 1 — Organization settings `/organizations/settings`

| ID | Function | Current UI |
|----|----------|-----------|
| O1 | View plan name + cadence + Active chip + "Active till" date | Summary card |
| O2 | Go to Manage subscription | Text link, top-right of card |
| O3 | View integrations (name, platform, timezone, connection status) | Card grid |
| O4 | Reconnect a broken integration | Amber button in card |
| O5 | Add integration | Dashed placeholder card |
| O6 | Per-integration overflow menu | `…` in card corner |
| O7 | View accounting company + status + explanation | Card |
| O8 | Connect / reconnect accounting company | Green "Connect to QuickBooks" |
| O9 | Create a new organization (only way to change accounting platform) | Inline link |
| O10 | View users list (Name, Role, Status) + seats available | Table + "Users available: 2" |
| O11 | Invite user — Name*, Profession*, Email*, role Manager / Member | Modal |
| O12 | Per-user overflow menu | `…` in row |
| O13 | Link an accounting firm by Firm ID | Nested tab + input + Apply |
| O14 | Edit organization name | Text input |
| O15 | Edit organization address (line 1, line 2, country, state, city, ZIP) + Update | Form + button |
| O16 | Notification frequency for Synder activity | Select (Weekly) |
| O17 | Reconciliation reminder on/off | Toggle, saves silently |

## Page 2 — Manage subscription `/organizations/settings/manageSubscription`

| ID | Function | Current UI |
|----|----------|-----------|
| S1 | Current plan name, list price struck through, discounted price, cadence | Left card |
| S2 | Itemized receipt — Product / Qty / Unit price / Amount, discount %, total per month | "What's included?" popover |
| S3 | View card on file (•••• 4242) | Card icon + last 4 |
| S4 | Change card | Opens **Stripe hosted portal, new tab** |
| S5 | Next billing date | Bold line |
| S6 | Go to plan comparison | "Upgrade your plan" link |
| S7 | Cancel subscription | Link → confirm modal ("I want to stay" / "Cancel subscription") → reason survey |
| S8 | Get subscription invoices | Opens **Stripe hosted portal, new tab** (same portal as S4) |
| S9 | Autocharge when sync balance depleted | Toggle |
| S10 | Buy more monthly transactions / additional users | Steppers + "Update plan" — **no price shown before commit** |
| S11 | Subscribe to Invoicing | Separate card, tier select "Up to 20 invoices – $49.00" + Subscribe |
| S12 | Subscribe to Smart rules | Separate card, tier select "Up to 3 rules – $19.99" + Subscribe |
| S13 | Historical transactions balance + purchase | Card + modal (Total $30.00, Cancel / Buy) |
| S14 | Earn free transactions | Link → **synder.com/make-more-credits, new tab** |

## Page 3 — Update plan `/organizations/billing?action=UPGRADE` ("Choose your plan")

| ID | Function | Current UI |
|----|----------|-----------|
| P1 | Compare Essential / Pro / Premium, current marked "Your plan" | 3 cards |
| P2 | Configure quantities per plan: monthly transactions, smart rules, invoicing, additional users | Steppers inside each card |
| P3 | Pro Standard ↔ Max switch | Toggle in Pro card |
| P4 | Stay on current plan | "Stay on plan" |
| P5 | Switch plan | "Update plan" |
| P6 | Request custom pricing | "Talk to us" (Premium) |
| P7 | Per-plan itemized breakdown | "What's included?" |
| P8 | Change card from plan card | Link in current-plan card |
| P9 | Compare features: Core functionalities, Add-ons, Other Synder products, Support | 4 collapsed accordions × 3 plans |
| P10 | Request a special plan | "Need a special plan?" → Contact us |
| P11 | Apply coupon | Input + Apply code |
| P12 | FAQ | 7 expandable items |

**Total: 43 functions.**

## Problems the redesign has to solve

1. **Add-on quantities are sold in three different UIs.** Steppers + "Update plan" (S10), tier select + "Subscribe" (S11, S12), and steppers inside plan cards (P2). Same products, three interaction models, three price models.
2. **No price before commit.** S10 and P2 both change what you pay with zero running total. The only itemization is hidden behind a "What's included?" popover that describes the *current* state, not the pending one.
3. **Naming collides.** "Subscription" (H1), "Manage subscription" (link), "Upgrade your plan" (link), "Update plan" (two different buttons doing two different things), "Choose your plan" (H1), `/billing` (route). Six names, one job.
4. **Two save models on one page.** O15 needs an explicit Update; O17 saves silently. No feedback on either.
5. **Billing leaves the product.** S4 and S8 both hand off to the same Stripe portal in a new tab, so card and invoice history live outside Synder.
6. **Status is buried.** O3 and O7 both showed failures ("Connection lost", "Disconnected") with nothing at page top to surface them.
7. **Single-tab tab bar.** O-page renders a tab strip containing only "Synder sync", plus a second nested tab strip inside Users.
8. **Feature comparison is hidden by default** (P9) on the one screen whose entire job is comparison — while 7 FAQs sit expanded-by-default below it, several of which exist only because the UI above them is unclear (what counts as a transaction, why currency is locked, whether discounts carry over).
