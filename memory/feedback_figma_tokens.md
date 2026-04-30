---
name: Minimize Figma API token usage
description: Ignat requires minimizing Figma API calls — always cache, batch, reuse. Never re-fetch the same nodes.
type: feedback
---

Use as few Figma API tokens (calls) as possible.

**Why:** Figma tokens are paid/rate-limited and expensive. Ignat explicitly flagged this on 2026-04-24 while working on RevRec billing screens. TOOLS.md already warned "MINIMIZE API CALLS" but I was over-fetching in practice.

**How to apply:**
- Always check `.figma-cache/` before any fetch. Use `scripts/figma-fetch.sh` which caches 24h by default.
- Batch node IDs in a single `files/{KEY}/nodes?ids=a,b,c` call — never one-at-a-time.
- Before fetching an image render, check if the PNG already exists in `.figma-cache/images/`.
- Reuse cached JSON across turns in the same session — don't refetch "just to be sure".
- When Ignat gives a Figma link, extract only the node IDs you actually need — don't crawl the whole file.
- Prefer reading cached renders and extracted text over asking Figma for more detail.
- If unsure whether a call is necessary, skip it and work from what's already cached.
