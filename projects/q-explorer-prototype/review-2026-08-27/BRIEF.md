# Validator round brief — Q-Explorer (QMS RPV CH) prototype

**Product.** Q-Explorer is the Swiss public-transport quality-management tool used by the Bundesamt
für Verkehr (BAV) and transport companies (TU) to measure punctuality, connection punctuality and
trip cancellations (DPM = Durchschnittliche Pünktlichkeitsmessung reports). Users are transport
authority analysts and TU quality staff. The UI is German-first with an EN/DE switch.

**What Ignat asked.** "Review the prototype. Check all pages, a few user flows. I want to know how
it works. Is it easy to understand." So the question in front of you is comprehension and task
completion, not visual taste.

**Round 1 — create & manage.** Primary task: log in, configure a new evaluation
(period → filters → run), manage saved and scheduled evaluations.
**Round 2 — read a report.** Primary task: open a finished evaluation, read the figures, break them
down, check a chart, drill into raw data, export.

**Reference / spec:** none exists. Fidelity was therefore not run this round — record that as a
skipped lens, not a passed one.

**Canonical terminology:** the repo's `vocabulary.md` is Synder accounting vocabulary and does NOT
apply to this product. There is no term list for Q-Explorer. For artifact-mode evidence, cite
`evidence.source` as the state-map zone + control the string came from, or the plain-language
principle it breaks (e.g. "German UI showing an English label").

**Known real friction:** `personas/KNOWN_FRICTION.md` is Synder LogRocket data — not applicable here.

**Already resolved (do not re-flag):** see `projects/q-explorer-prototype/findings-log.json`
(currently empty — this is a cold first round).

**Known issues to ignore:**
- Placeholder legal/contact copy in the Impressum/Kontaktdaten modals is deliberately marked as
  placeholder.
- The prototype has no backend: "export", "download" and "run" cannot really produce files. Do not
  report the absence of a real download. DO report a control that gives the user no feedback at all.
- Demo data volumes and invented TU/line names are fine.
