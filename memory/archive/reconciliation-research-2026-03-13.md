# Transaction Reconciliation UX Research
Date: 2026-03-13
Researcher: Dasha
Method: LogRocket Galileo (session analysis, funnels), Playwright (live page walkthroughs), competitive review

## Key Numbers
- 501 sessions/mo visited Tx Reconciliation landing page
- 148 went to /create (29.5%)
- 85 completed to detail page (17%)
- 22.5% clicked "Start reconciling" CTA
- 0 rage clicks on landing page (users not frustrated there - they just don't convert)
- 0 sessions under 30s (users spend real time on page)
- Multiple server maintenance errors blocking completions

## Key Findings
1. Beta badge = financial data fear
2. "Start matching" CTA sounds like immediate action, not config
3. No reversibility info anywhere
4. Form has 5+ required fields: date range (2), automation mode (x2 - one per column!), integration, clearing account
5. Clearing account field appears only after integration selected - hidden complexity
6. Submit-then-validate (button always active = punitive discovery)
7. No progress indicator
8. Transaction Verification is the mature comparison - disabled button, template, guide link
9. "Server maintenance" errors blocking completions in multiple sessions
10. "Account not mapped" errors on detail page - prerequisites not surfaced upfront

## Competitive notes
- A2X: "Revenue reconciliation in minutes" - strong time-to-value framing
- Xero: AI-powered matching, social proof (89% save time)
- Both: no Beta labels, clear value props
