// Archived transactions — shown when "Show only archived txns" is ON
const ARCHIVED_TRANSACTIONS = [
  { id: "po_1SwAv7E4pygkgelbRPoXg3rb", customer: null, type: "Payout", amount: "21.61", currency: "USD", date: "03:00 02 Feb, 2026", status: "synced" },
  { id: "po_1Sv5SEE4pygkgelblv7pgtxg", customer: null, type: "Payout", amount: "21.61", currency: "USD", date: "03:00 30 Jan, 2026", status: "synced" },
  { id: "po_1Suj0DE4pygkgelbmyG9R9xH", customer: null, type: "Payout", amount: "21.61", currency: "USD", date: "03:00 29 Jan, 2026", status: "synced" },
];

// Transaction data — mirrors production "Per transaction" org
const TRANSACTIONS = [
  { id: "po_1TAK5aE4pygkgelbR8glSXdq", customer: null, type: "Payout", amount: "48.52", currency: "USD", date: "03:00 13 Mar, 2026", status: "synced" },
  { id: "ch_3T84Z1E4pygkgelb19f9ZuKC", customer: "Pamela Andersen", type: "Invoice payment", amount: "20.85", currency: "USD", date: "23:01 06 Mar, 2026", status: "synced" },
  { id: "ch_3T84YME4pygkgelb08CKv2Y8", customer: "Pamela Andersen", type: "Subscription payment", amount: "30.00", currency: "USD", date: "23:00 06 Mar, 2026", status: "synced" },
  { id: "po_1SwAv7E4pygkgelbRPoXg3rb", customer: null, type: "Payout", amount: "21.61", currency: "USD", date: "03:00 02 Feb, 2026", status: "synced" },
  { id: "po_1Sv5SEE4pygkgelblv7pgtxg", customer: null, type: "Payout", amount: "21.61", currency: "USD", date: "03:00 30 Jan, 2026", status: "synced" },
  { id: "po_1Suj0DE4pygkgelbmyG9R9xH", customer: null, type: "Payout", amount: "21.61", currency: "USD", date: "03:00 29 Jan, 2026", status: "synced" },
  { id: "po_1SuMhHE4pygkgelbNjgbpFce", customer: null, type: "Payout", amount: "21.61", currency: "USD", date: "03:00 28 Jan, 2026", status: "synced" },
  { id: "po_1Su0DzE4pygkgelbxyZl1u0H", customer: null, type: "Payout", amount: "21.61", currency: "USD", date: "03:00 27 Jan, 2026", status: "synced" },
  { id: "po_1StdtCE4pygkgelbQwePWSta", customer: null, type: "Payout", amount: "64.83", currency: "USD", date: "03:00 26 Jan, 2026", status: "synced" },
  { id: "ch_3St8n0E4pygkgelb0NSim7zc", customer: "Anna Karenina", type: "Payment", amount: "22.56", currency: "USD", date: "18:30 24 Jan, 2026", status: "synced" },
  { id: "ch_3SsmJfE4pygkgelb09nENSPW", customer: "Anna Karenina", type: "Payment", amount: "22.56", currency: "USD", date: "18:30 23 Jan, 2026", status: "synced" },
  { id: "ch_3SsQxRE4pygkgelb0wT2KLMP", customer: "Anna Karenina", type: "Payment", amount: "22.56", currency: "USD", date: "18:30 22 Jan, 2026", status: "synced" },
  { id: "po_1SsHWpE4pygkgelbA7kd3nFq", customer: null, type: "Payout", amount: "43.22", currency: "USD", date: "03:00 22 Jan, 2026", status: "synced" },
  { id: "ch_3Ss4kME4pygkgelb0LpR9nQ2", customer: "Boris Nikolayev", type: "Invoice payment", amount: "15.00", currency: "USD", date: "14:12 21 Jan, 2026", status: "synced" },
  { id: "po_1Srv3IE4pygkgelbzwP8xM2f", customer: null, type: "Payout", amount: "21.61", currency: "USD", date: "03:00 21 Jan, 2026", status: "synced" },
  { id: "ch_3SrjHnE4pygkgelb1K3mP7vR", customer: "Pamela Andersen", type: "Subscription payment", amount: "30.00", currency: "USD", date: "21:00 20 Jan, 2026", status: "ready" },
  { id: "ch_3SrN4FE4pygkgelb0xWn2Lk9", customer: "Viktor Tsoi", type: "Payment", amount: "45.00", currency: "USD", date: "15:45 20 Jan, 2026", status: "ready" },
  { id: "po_1SrZqDE4pygkgelbBn4h6RpW", customer: null, type: "Payout", amount: "88.17", currency: "USD", date: "03:00 20 Jan, 2026", status: "ready" },
  { id: "ch_3Sr1YzE4pygkgelb0qMn8Tt5", customer: "Anna Karenina", type: "Payment", amount: "22.56", currency: "USD", date: "18:30 19 Jan, 2026", status: "ready" },
  { id: "po_1SrDkNE4pygkgelbQ2vx7Hp3", customer: null, type: "Payout", amount: "21.61", currency: "USD", date: "03:00 19 Jan, 2026", status: "ready" },
  { id: "ch_3SqfTrE4pygkgelb1N7pK2wM", customer: "Boris Nikolayev", type: "Invoice payment", amount: "15.00", currency: "USD", date: "10:20 18 Jan, 2026", status: "ready" },
  { id: "po_1SqxHmE4pygkgelbfR3t5YnK", customer: null, type: "Payout", amount: "43.22", currency: "USD", date: "03:00 18 Jan, 2026", status: "ready" },
  { id: "ch_3SqLz4E4pygkgelb0vT6Mp8R", customer: "Viktor Tsoi", type: "Payment", amount: "45.00", currency: "USD", date: "16:30 17 Jan, 2026", status: "pending" },
  { id: "po_1Sqb9FE4pygkgelbwN2h8Xp6", customer: null, type: "Payout", amount: "67.56", currency: "USD", date: "03:00 17 Jan, 2026", status: "pending" },
  { id: "ch_3Sq0gNE4pygkgelb1R8nL5xP", customer: "Pamela Andersen", type: "Subscription payment", amount: "30.00", currency: "USD", date: "21:00 16 Jan, 2026", status: "pending" },
];
