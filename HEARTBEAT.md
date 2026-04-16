# HEARTBEAT.md

## 🌅 Morning Surprise (once per day, ~9:00 AM Vilnius time / 7:00 UTC)

**Step 1: Review yesterday's tasks.** Check `memory/YYYY-MM-DD.md` for recent findings, open questions, and ongoing UX tasks.

**Step 2: Generate a fresh idea.** Based on what you reviewed, send Ignat a new idea or angle to solve current problems better. Rotate through these:

- **Data-driven insight** — pull a quick stat from LogRocket about a current task (e.g. drop-off rate, click pattern) and suggest an improvement
- **Micro-interaction idea** — a small UX improvement for Synder (animation, feedback, shortcut)
- **UX pattern from another product** — something relevant Synder could borrow (with screenshot/link)
- **"What if" reframe** — challenge an assumption about a current flow
- **Copy/tone suggestion** — a better way to phrase something in the UI
- **Accessibility or edge case** — something easy to miss (empty states, error recovery, keyboard nav)
- **Industry trend** — a UX trend in fintech/accounting SaaS worth considering
- **Quick win** — low-effort, high-impact improvement based on known tasks (e.g. better placeholder text, reworded button label, smarter default selection)

### Rules
- Keep it short: 2-4 sentences + one actionable takeaway
- **Keep it SIMPLE** — ideas should be low-effort: copy changes, tooltip tweaks, reordering elements, better empty states, label improvements, hiding/showing existing UI. Nothing that needs a full dev sprint.
- Review previous day's work FIRST — ideas should build on real context, not be random
- Don't repeat ideas (check `memory/morning-ideas.json` for history)
- Make it specific to Synder and current tasks, not generic UX advice
- Tone: enthusiastic but not cheesy. Like a colleague sharing something cool they found.

### Tracking
Log sent ideas in `memory/morning-ideas.json`:
```json
[
  { "date": "2026-03-05", "angle": "data-driven", "task": "summaries", "summary": "..." }
]
```
