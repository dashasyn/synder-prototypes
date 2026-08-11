---
name: feedback-review-method
description: How to run design reviews — validators vs personas, and multi-instance cross-checking
metadata:
  type: feedback
---

Use **validators by default** for all design reviews. Personas are for user-type questions only (e.g. "how would a CFO read this?").

Validators are coded, scoped, severity-tagged subagents. They don't drift into opinion-land. Output is structured and scannable.

**Multi-instance rule:** Run **3 instances of the same validator in parallel** on the same design and cross-check findings. Catches edge cases a single pass misses. Apply this to all validator runs, not just complex reviews.

**Why:** Personas were dropped because they produced vague, hard-to-act-on feedback. Validators replaced them with coded findings (UX-1, CLR-1, etc.). Multi-instance was added 2026-07-24 after Ignat confirmed it's the right direction.

**How to apply:** Every time a validator review is requested, spin 3 parallel instances, merge findings, flag anything 2+ instances caught as higher-confidence.
