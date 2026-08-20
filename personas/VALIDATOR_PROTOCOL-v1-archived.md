# Validator Protocol — Orchestrator Instructions

This file defines how the main orchestrator (Dasha) runs the validator pipeline.

## Triggers

Any of these fire the pipeline — **a URL is not required**:
- `Review` / `Review this` / `Review it` / `Check this` / `Check the design`
- `Review with validators` / `Run the validators`
- `Review: [prototype name or URL]` — explicit target
- `Build + Review: [task brief]` — build prototype first, then validate (full flow)

A Figma link or Jira ticket alone is also a valid target.

---

## Step 0 — Resolve the target (do this first, always)

When no URL is given, resolve the target in this order and **state which one you picked**:

1. **The prototype discussed in this conversation** — the normal case
2. **The file most recently edited in this session**
3. **Newest modified prototype in the repo** — `ls -t` across `projects/prototypes/*/index.html` and `reports/*/index.html`
4. **Ask** — only if genuinely ambiguous. One question: "Which one — [top 2 candidates]?"

Never stall on a missing URL when context makes the target obvious. Resolving silently and stating the choice beats asking.

If the target is a local file not yet published, review the local file and note that the live URL may lag.

Always open the report with the resolved target so a wrong guess is caught immediately:

```
Round 1 — Platform Transactions v2
Target: projects/prototypes/platform-transactions/index.html (most recent edit)
```

---

## Step 1 — Pre-flight check (before building)
Only for `Build + Review`. Confirm:
- [ ] Task brief has all required fields
- [ ] Reference material is accessible (fetch Figma/URL if linked)
- [ ] Required states are listed

If anything is missing, ask Ignat for the one missing thing. Do not start building.

---

## Step 2 — Build the prototype
Only for `Build + Review`. Skip this step for `Review:`.
- Use Synder design system (Roboto font, #0053CC primary, 8px grid, Material-based components)
- Load design tokens from: `skills/synder-explorer/references/synder-design-tokens.css`
- Include ALL required states listed in the brief
- Save to: `projects/prototypes/[task-slug]/index.html`

---

## Step 2b — Jira auto-fetch (run if ticket number provided)
If the task brief or Review trigger includes a Jira ticket (e.g. DIS-336, SD-17432):
1. Fetch the ticket via Jira API (`scripts/jira-fetch.sh` or direct API call)
2. Extract: title, description, acceptance criteria, linked Figma frames, reporter
3. If Figma frames are linked, fetch screenshots of those frames
4. Store as `reference.json` in the prototype folder
5. Pass to validators as the authoritative reference — this replaces any manual "reference" field

If no ticket is provided, skip this step. Fidelity Validator will run without a spec reference.

---

## Step 3 — Auto-scan (always run before validators)

### 3a — Discover interactive elements
Parse the prototype HTML. Extract every interactive element:
- Buttons (all `<button>` elements and `role="button"`)
- Links (`<a>` tags)
- Form controls (inputs, selects, checkboxes, radios, toggles)
- Elements with click/change/hover handlers (onclick, data-* triggers, JS-bound classes)
- Modal/sidesheet triggers, dropdown openers, tab switchers

Group into a test plan:
```
INTERACTIVE ELEMENTS FOUND:
- [element label] | type: button/link/input | expected state: [inferred from label/context]
```

### 3b — Run browser interaction tests
Open the prototype in the browser. For each interactive element:
1. Click/interact with it
2. Screenshot before + after state
3. Mark: ✅ works | ❌ broken | ⚠️ partial

Broken elements → automatic Critical findings (ID prefix: AUTO-). No validator needed.

**On round 2+:** Only test elements that were modified since the previous round. Skip elements already marked ✅ in `findings-log.json`. Pass the diff to validators instead of the full prototype.

### 3c — Style consistency check
Auto-extract all CSS values from the prototype:
- Font families and sizes
- Color values (hex, rgb, hsl)
- Border-radius values
- Spacing (padding, margin, gap)

Compare against `DESIGN_RULES.md`. Flag every deviation:
- Wrong font → flag
- Color not in palette → flag
- Border-radius > 4px on action buttons → flag
- Spacing not on 8px grid → flag

---

## Step 4 — Spawn validators in parallel
Read each validator prompt from `personas/validators/`.
Run all 5 by default. Skip Fidelity only if no reference exists.

| Validator | File | Prefix | Max findings |
|---|---|---|---|
| UX | `ux-validator.md` | UX-n | 5 |
| Domain (accountant) | `domain-validator.md` | DOM-n | 3 |
| Clarity (business owner) | `clarity-validator.md` | CLR-n | 3 |
| Fidelity (QA vs spec) | `fidelity-validator.md` | FID-n | 5 |
| Trust (does the UI lie?) | `trust-validator.md` | TRU-n | 4 |

**Multi-instance rule:** for high-stakes reviews (pre-handoff, exec-facing, or when Ignat asks for a thorough pass), run the UX validator **3× in parallel** and cross-check. Findings surfaced by 2+ instances are tagged `corroborated` and ranked first. Don't triple-run the narrow-scope validators — wasteful against their 3-finding caps.

**Do NOT embed HTML in subagent prompts.** Pass the URL — validators fetch the prototype themselves using web_fetch. This keeps spawned prompts small and avoids token/payload limits.

**On round 1:** send URL + rendered state observations + style deviations.
**On round 2+:** send URL + diff description (what changed since round N) + new screenshots. Include the full findings-log so validators know what's already resolved.

Each subagent receives:
```
SYSTEM: [full content of validator's .md file]

USER:
## Prototype URL
[URL — validator must fetch this with web_fetch before analyzing]

## Rendered state observations
[bullet-point description of interactive states, what appears after each action, dynamic behavior that isn't visible in static HTML]

## Style deviations found
[output from Step 3c]

## Reference (from Jira or manual)
[reference.json content / Figma screenshots / description]

## Known real friction (check the design against these)
[relevant entries from personas/KNOWN_FRICTION.md]

## Already resolved (do not re-flag)
[findings-log.json resolved list]

## Known issues to ignore
[from task brief, or "none"]

Return findings as JSON. Return NOTHING else.
```

Spawn all validators simultaneously. Wait for all to complete.

---

## Step 5 — Aggregate findings
1. Prepend AUTO- findings from Step 3b (broken elements)
2. Parse all validator JSON responses
3. Filter: Critical and High only (Medium → polish list)
4. Deduplicate: merge findings about the same element from multiple validators
5. Sort: Critical first, then High
6. Tag with `iteration: N`

---

## Step 6 — Present to Ignat
```
Round [N] — [prototype name]

🔴 Critical ([count]):
• [ID] [element]: [finding] → [fix]

🟠 High ([count]):
• [ID] [element]: [finding] → [fix]

🔧 Auto-applying:
• [style deviations + safe fixes]

❓ Need your call (max 3):
• [ID]: [2-option choice or yes/no]
```

---

## Step 7 — Apply + auto-publish
1. Apply auto-fixes immediately
2. Apply Ignat-approved fixes
3. Mark resolved findings in `findings-log.json`
4. Rebuild the HTML
5. **Auto-publish:** `git add [file] && git commit -m "[prototype name]: round N fixes" && git push`
6. Send Ignat the live GitHub Pages URL

---

## Step 8 — Loop or stop
- If iteration < 3 AND Critical/High remain: go to Step 3 (delta mode)
- If iteration = 3: "3 rounds complete. Remaining: [list]. Ship or hold?"
- If zero Critical/High: "All critical issues resolved. Live: [URL]"

---

## Locked items rule
Never re-flag a finding marked RESOLVED in `findings-log.json`.

## Iteration budget
Hard limit: 3 iterations. After that, Ignat decides.
