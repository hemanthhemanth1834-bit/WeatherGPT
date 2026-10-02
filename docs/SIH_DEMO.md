# SIH DEMO FLOW — 3–5 minute live run

Total: ~4 minutes. Every step uses production data with explicit LIVE / COMPUTED / DEMO / STATIC labels where applicable.

| # | Time | Action | Expected |
|---|---|---|---|
| 1 | 0:00 | Open https://weathergpt-kappa-pink.vercel.app/ | Hero + live Pune snapshot, ticker |
| 2 | 0:20 | Click ◎ GPS (allow location) | "📍 Current Location — City, State" + refresh |
| 3 | 0:50 | Chat: "Will it rain tomorrow in Vijayawada?" | Grounded reply + source + timestamp |
| 4 | 1:20 | Forecast tab | 24h strip + sparkline + 7-day + cloud |
| 5 | 1:40 | Dashboard AQI + UV cards | Live US AQI + pollutants, UV level + advice |
| 6 | 2:00 | Alerts tab + Severe desk | Computed alerts, DEMO track, GDACS cards, 112 chips |
| 7 | 2:25 | Map tab, press ▶ radar | Live RainViewer frames playing + legend |
| 8 | 2:45 | Air·Sea tab | LIVE ADDS METAR chip + marine direction/period/SST |
| 9 | 3:05 | Agri tab (Cotton/Nagpur) + Risk Assess | Advisory + LOW–EXTREME drivers + travel line |
| 10 | 3:25 | Language → Telugu, ask; mic button | Telugu reply; mic fallback message if blocked |
| 11 | 3:45 | NWP tab → Providers health | Provider health counts shown live; WRF/MOSDAC/LLM are NOT CONFIGURED unless explicitly connected, GFS temperature source shown with provenance |
| 12 | 4:00 | Close: problem→solution→impact line | "Every number on screen came from a labelled source; LIVE values are timestamped and computed/demo values are identified." |

Fallback lines if anything stalls: "This panel shows its source and status —
FALLBACK/ESTIMATED rather than guesses." Never claim official IMD status.
