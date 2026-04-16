# LogRocket Raw Findings
**Queried:** March 20, 2026 via Galileo AI API

## Query 1: Drop-off Points (chatID: 019d0ad8-91fd-7348-a7aa-4c0cdd9aa0f4)

### Funnel Data (30 days)
| Step | Sessions | Drop-off |
|------|----------|----------|
| Visited onboarding page | 1,101 | — |
| Clicked "Choose an option" | 398 | **63.9%** |
| Clicked "Next step" | 667 | — |
| Full funnel completion | ~34.4% | — |

### Metrics Created
- 3-step conversion funnel: Visit → Choose an option → Next step
- Session count: Users who visited but did NOT click "Next step"
- Session count: Users who visited but did NOT click "Choose an option"
- Session count: Visitors to onboarding page (30 days)
- Session count: Visitors to onboarding page (90 days)
- Session count: Users who clicked "Choose an option" (30 days)

### Context Items Retrieved
- click_text: "Choose an option" (reranker: 0.084)
- URL: /onboarding/index (reranker: 0.069)
- URL: /revenueRecognitionOnboarding/index (reranker: 0.047)
- click_text: "Next step" (reranker: 0.040)

---

## Query 2: Time to First Sync (chatID: 019d0ad8-cb22-7c6b-9049-5022b8aa18c2)
**Status:** Error (INTERNAL_SERVER_ERROR, isGenerationMismatch: true)
Could not retrieve this metric.

---

## Query 3: Most Frequent Errors (chatID: 019d0ad8-cd85-709c-8e9e-46d7d64bea21)

### Errors Found
1. **TypeError: Cannot read properties of undefined (reading 'email')**
   - 3 distinct user sessions
   - Most recently: March 20, 2026 (today)
   - Blocks Mapping page from loading
   - Users can't proceed past currency-list step

2. **TypeError: Converting circular structure to JSON**
   - 3 occurrences, 1 user
   - Date: March 16, 2026
   - Triggers on Product Mappings interaction
   - App attempts to serialize a DOM element

### Network Errors
- 0 issues found (all errors are client-side JS)

### Context Items Retrieved
- click_text: "Failed" (reranker: 0.087)
- URL: /onboarding/index (reranker: 0.044)
- URL: synder.com/ (reranker: 0.037)
- URL: ui.synder.com/createFlow (reranker: 0.037)
- click_text: "Import historical data" (reranker: 0.025)
- click_text: "Add integration" (reranker: 0.023)

---

## Query 4: Onboarding Completion Rate (chatID: 019d0ad8-cf72-7913-b29b-8fa3149c4be0)

### Metrics Created
- Session count: Visitors to onboarding page (30 days)
- Session count: Visitors to RevRec onboarding (30 days)
- Click count: "Next step" clicks (30 days)
- Click count: "Choose an option" clicks (30 days)
- 3-step funnel (90 days): Visit → Choose an option → Next step

### Notes
- Galileo asked for the completion URL/event (what URL = onboarding done)
- This suggests there may not be a distinct "onboarding complete" event tracked
- Metric errors occurred when trying to analyze funnel results

---

## Query 5: Common First-Session Pages (chatID: 019d0ad8-d15e-7772-bda8-e78516d9371a)

### Pages Visited by New Users (First Session, 90 days)
Metrics created for each page (session count for user_session_count = 1):

| Page | URL Pattern |
|------|------------|
| Onboarding | /onboarding/index |
| Business Insights | /accounting/public/businessInsights/index.html |
| RevRec Onboarding | /revenueRecognitionOnboarding/index |
| User List | /user/list |
| User Profile | /user/show/* |
| Company Settings | /company/settings/* |
| Organization View | /organizations/view/* |
| Reconciliation | /accounting/public/reconciliation/index.html/start/* |
| Dimensions | /accounting/public/dimensions/index.html/* |
| Smart Rules | /rules/rules/* |
| Marketing Site | synder.com/industry/*, synder.com/success-stories/* |

### Click Events by New Users
| Click Text | Metric Created |
|-----------|---------------|
| Control panel | Weekly session count, 90 days |
| Transactions | Daily session count, 90 days |
| Invoices | Weekly unique user count, 90 days |

### Context Items (Top 25 by reranker score)
1. /onboarding/index (0.203)
2. /businessInsights/index.html (0.127)
3. /revenueRecognitionOnboarding/index (0.123)
4. /user/list (0.118)
5. /user/show/* (0.117)
6. /company/settings/* (0.109)
7. /organizations/view/* (0.100)
8. /reconciliation/index.html/start/* (0.100)
9. /dimensions/index.html/* (0.089)
10. /rules/rules/* (0.087)
