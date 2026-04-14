# BLUEPRINT OS — Claude Code Context

## What is this?
Blueprint OS is a Bloomberg Terminal-style personal finance dashboard. Dark navy/black background, green/amber accent colors, monospace fonts for all numbers. Built for speed — weekly budget check-in under 3 minutes, monthly net worth update under 5 minutes. Gamified to build long-term habit.

## Stack
- React 18 + Vite
- Tailwind CSS
- Recharts
- Supabase (auth + PostgreSQL)
- React Router DOM
- Lucide React icons
- Hosted on Vercel (auto-deploy from GitHub)

## Design System

### Colors (CSS variables in src/styles/theme.css)
```css
--bg-primary:     #0a0e1a
--bg-secondary:   #111827
--bg-tertiary:    #1f2937
--accent-green:   #00ff88
--accent-amber:   #fbbf24
--accent-red:     #ff4444
--accent-blue:    #3b82f6
--accent-cyan:    #06b6d4
--text-primary:   #f9fafb
--text-secondary: #9ca3af
--text-dim:       #4b5563
--border:         #1f2937
```

### Typography
- Numbers: JetBrains Mono (Google Fonts) — monospace, right-aligned
- Labels/body: Inter (Google Fonts)
- Positive values: accent-green with ▲ prefix
- Negative values: accent-red with ▼ prefix
- Large numbers abbreviated: $93.2K, $1.17M

### UI Rules
- Stat cards: subtle neon glow on hover (`box-shadow: 0 0 12px var(--accent-blue)`)
- Progress bars: animate width on load
- Error states: amber only (red is reserved for financial negatives)
- Empty states: always include a clear CTA

---

## Routes
```
/              Command Center (main dashboard)
/budget        Weekly Budget
/networth      Monthly Net Worth
/portfolio     Blueprint Portfolio
/milestones    Life Milestones & Goals
/settings      Config, targets, profile
/login         Auth page
```

### Top Nav
- Left: "BLUEPRINT OS" wordmark
- Center: tab links
- Right: last updated timestamp + live clock (monospace) + user avatar
- Mobile: bottom nav bar instead

---

## Pages & Widgets

### Command Center (/)
CSS Grid layout with 8 widgets:
1. **Net Worth Ticker** — hero number, MoM change, daily velocity, timestamp
2. **Weekly Score** — 0–100 score, letter grade, color-coded, animates on render
3. **Streak & Badges** — current streak, longest streak, last 3 badges
4. **Asset Breakdown** — donut chart, color-coded by category
5. **Budget Status** — 8 progress bars, traffic light colors
6. **Milestone Progress** — progress bars with ETA
7. **Net Worth Chart** — line chart, 3M/6M/1Y/ALL toggle
8. **Receivables** — list with mark-as-received + add new

### Budget Tab (/budget)
- Left: quick entry form (8 categories, week selector, running total)
- Right: bar chart, MoM comparison, 3-month rolling average panel
- History table with CSV export
- Self-learning budget suggestion after 3 months of data

### Net Worth Tab (/networth)
- Left: monthly entry form (all accounts + liabilities)
- Right: stacked bar chart, account table
- Projections panel: 1yr/3yr/5yr/10yr
- Annual summary

### Portfolio Tab (/portfolio)
- Holdings table with DCA tracker
- Limit orders panel (informational)
- Allocation vs target chart

### Milestones Tab (/milestones)
- Progress bars with ETA for each milestone
- Achievement unlock animations

---

## Component Structure
```
src/
├── components/
│   ├── layout/
│   │   ├── TopNav.jsx
│   │   ├── BottomNav.jsx
│   │   └── PageWrapper.jsx
│   ├── widgets/
│   │   ├── NetWorthTicker.jsx
│   │   ├── WeeklyScore.jsx
│   │   ├── StreakBadges.jsx
│   │   ├── AssetBreakdown.jsx
│   │   ├── BudgetStatus.jsx
│   │   ├── MilestoneProgress.jsx
│   │   ├── NetWorthChart.jsx
│   │   └── Receivables.jsx
│   ├── forms/
│   │   ├── BudgetEntryForm.jsx
│   │   ├── NetWorthEntryForm.jsx
│   │   └── ReceivableForm.jsx
│   ├── charts/
│   │   ├── NetWorthLineChart.jsx
│   │   ├── AssetDonutChart.jsx
│   │   ├── BudgetBarChart.jsx
│   │   └── AllocationChart.jsx
│   └── ui/
│       ├── StatCard.jsx
│       ├── ProgressBar.jsx
│       ├── Badge.jsx
│       ├── TrafficLight.jsx
│       └── MonoNumber.jsx
├── pages/
│   ├── Dashboard.jsx
│   ├── Budget.jsx
│   ├── NetWorth.jsx
│   ├── Portfolio.jsx
│   ├── Milestones.jsx
│   ├── Settings.jsx
│   └── Login.jsx
├── context/
│   ├── AuthContext.jsx
│   └── DataContext.jsx
├── hooks/
│   ├── useNetWorth.js
│   ├── useBudget.js
│   ├── useGamification.js
│   └── useMilestones.js
├── lib/
│   ├── supabase.js
│   ├── calculations.js
│   ├── gamification.js
│   └── formatters.js
└── styles/
    ├── theme.css
    └── index.css
```

---

## Supabase Tables
```sql
net_worth_entries (id, user_id, entry_date, accounts JSONB, total_assets, total_liabilities, net_worth, notes, created_at)
budget_entries (id, user_id, week_start, week_end, categories JSONB, total_spent, weekly_score, notes, created_at)
milestones (id, user_id, name, target_amount, current_amount, is_achieved, achieved_date, created_at)
receivables (id, user_id, person_name, amount, description, created_date, received_date, is_received)
portfolio_positions (id, user_id, ticker, shares, avg_cost, target_allocation, dca_biweekly, notes, updated_at)
dca_confirmations (id, user_id, period_start, all_fired, notes, created_at)
gamification (id, user_id, current_streak, longest_streak, last_entry_date, badges_earned JSONB, weekly_scores JSONB, created_at)
```

---

## Key Calculations
```js
fiNumber = annualExpenses * 25                          // Default: $47,000 * 25 = $1,175,000
velocity = (netWorthNow - netWorth30DaysAgo) / 30       // Daily avg growth
monthlyGrowthRate = (netWorthNow - netWorth3MonthsAgo) / 3
monthsToMilestone = (milestoneTarget - netWorthNow) / monthlyGrowthRate

// Weekly Score (0-100)
score += 25  // budget entry submitted this week
score += 25  // monthly spending pace <= monthly budget
score += 25  // net worth >= last month
score += 25  // DCA confirmed this period

// Self-learning budget (activates after 3mo data)
suggestedBudget[cat] = rollingAvg[cat] * 1.10

// Savings rate
savingsRate = (monthlyIncome - totalMonthlyExpenses) / monthlyIncome * 100
// monthlyIncome = $6,010
// fixed expenses = $3,557
```

---

## Seed Data (April 2026 Baseline)

### Net Worth
```
Blueprint (Robinhood):   $13,245
Roth IRA:                $11,000
Trading Account:         $19,000
RH Bank Savings:         $6,192
CEFCU Checking:          $6,307
CEFCU Savings:           $1,344
Crypto (Coinbase):       $37,204
Hyperliquid:             $2,000
AMEX balance:            -$188
Receivables:             $1,400 (Andrew)
NET WORTH:               ~$97,504
```

### Budget Targets (monthly)
```
Food & Dining:      $100
Groceries:          $180
Transport:          $30
Shopping:           $65
Entertainment:      $50
Health & Personal:  $45
Travel:             $40
Miscellaneous:      $40
TOTAL:              $550/month
```

### Milestones
```
Runway:           $47,000    (12mo expenses liquid)
Foundation:       $100,000   (six figures)
Freedom Starter:  $500,000
FI Number:        $1,175,000 (auto-calculated)
Trading FT:       $3,000,000
Generational:     $10,000,000
```

### Blueprint Portfolio
```
SCHD   20 shares  avg $30.40   DCA $27
HOOD    8 shares  avg $68.00   DCA $5
IREN   40 shares  avg $39.00   DCA $11
VOO     2 shares  avg $595.00  DCA $38
AMZN   10 shares  avg $203.00  DCA $38
TSLA    4 shares  avg $367.00  DCA $32
GOOGL   4 shares  avg $280.00  DCA $25
META    2 shares  avg $555.00  DCA $21
AMD     2 shares  avg $198.00  DCA $27
NVDA    0 shares  limit $150   DCA $18
```

---

## Build Phases

### Phase 1 — MVP (current focus)
- [ ] Supabase project setup + all tables
- [ ] Auth: login / signup
- [ ] Net worth entry form + history table
- [ ] Budget entry form + history table
- [ ] Command center: all 8 widgets (static/manual data)
- [ ] Net worth line chart
- [ ] Milestone progress bars
- [ ] Mobile responsive layout + bottom nav

### Phase 2 — Intelligence
- [ ] Gamification: streaks, badges, weekly score
- [ ] Net worth projections + milestone ETAs
- [ ] Self-learning budget algorithm
- [ ] Score animation on render

### Phase 3 — Portfolio
- [ ] Holdings table with DCA tracker
- [ ] Limit orders panel
- [ ] Allocation vs target chart

### Phase 4 — Polish
- [ ] Receivables tracker
- [ ] Data export (CSV)
- [ ] Achievement animations
- [ ] PWA manifest

---

## Environment Variables Needed
```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Deployment
- Repo: GitHub (private) — blueprint-os
- Hosting: Vercel (auto-deploy on push to main)
- Database: Supabase free tier

---

## Session Notes

### Phase 1 — Completed (2026-04-07)
All Phase 1 deliverables built and compiling cleanly:
- ✅ Supabase schema: `supabase/schema.sql` — run in Supabase SQL Editor
- ✅ Auth: Login/signup via Supabase auth (`/login`), demo mode works without sign-in
- ✅ Net worth entry form + history table (`/networth`)
- ✅ Budget entry form + history table (`/budget`)
- ✅ Command Center: all 8 widgets — Net Worth Ticker, Weekly Score, Streak & Badges, Asset Breakdown, Budget Status, Milestone Progress, Net Worth Chart, Receivables
- ✅ Net worth line chart with 3M/6M/1Y/ALL toggle (Recharts)
- ✅ Milestone progress bars with ETA calculation
- ✅ Mobile responsive — bottom nav on mobile, top nav on desktop
- ✅ Full design system — Bloomberg Terminal dark theme, JetBrains Mono numbers, CSS glow effects
- ✅ Seed data pre-loaded (April 2026 baseline, ~$97,504 NW)

**Next step before using:** Run `supabase/schema.sql` in your Supabase SQL Editor to create all tables.

---

## Changelog

### 2026-04-07
- Fixed date timezone bug: chart was showing wrong date due to UTC midnight parsing. Fixed by appending `T12:00:00` to date-only strings everywhere.
- Fixed receivables not persisting: seed receivable (id: `seed-r1`) was never saved to Supabase on mark-as-received. Fixed by inserting to DB first if id starts with `seed` or `local`.
- Added edit/delete to all entry forms (budget, net worth). Pencil/trash icons appear on hover in history tables.

### 2026-04-08
- Integrated Schwab Market Data API for live portfolio prices. OAuth2 flow via Vercel serverless functions (`api/schwab/`). Tokens stored in `schwab_tokens` table (singleton pattern).
- Portfolio page fully rewritten: correct positions with real shares/avg cost, trade log form, edit position form, live price columns, session badge (RH/AH).
- Allocation chart redesigned: horizontal bars per ticker, color-coded green/amber/red by distance from target, vertical marker line at target.
- Schwab price field: uses `mark` (confirmed = end-of-day price, not `lastPrice` or `closePrice`).

### 2026-04-09
- Added privacy mode: Eye/EyeOff toggle in TopNav and BottomNav. Blurs all financial values using CSS `filter: blur(8px)` via `<Private>` component. Persisted in localStorage.
- Fixed milestone ETAs: was showing Jul 2576 due to linear growth formula. Switched to compound growth (8% annual + cash contributions).
- Changed color scheme to pure Bloomberg Terminal black (`--bg-primary: #000000`), replacing dark navy.
- Added auto sign-out after inactivity. Initially used `setTimeout` (1 hour) but browser throttles long timers in background tabs. Fixed with `setInterval` (checks every minute) + `visibilitychange` listener. Reduced to 30 minutes given financial data sensitivity.
- Added timezone label to clock. Hardcoded to `America/Los_Angeles` (user is in SF; system timezone showed Chicago due to VPN).
- Clock is now clickable to cycle through PT → ET → CT → UTC. Selection persisted in localStorage.

### 2026-04-13
- Fixed budget targets being treated as weekly. CONTEXT.md confirms targets are monthly (`$550/month` total). Changed `useBudget` and `BudgetEntryForm` so the monthly targets are divided by 4.33 to derive the weekly allowance shown in the form and used for pace calculations.
- Fixed auto sign-out not firing: browser throttles long `setTimeout` in background tabs. Replaced with `setInterval` (checks every 60s) + `visibilitychange` event. Reduced inactivity window to 30 min.
- Clock timezone now cycles PT → ET → CT → UTC on click. Persisted in localStorage.
- ANTHROPIC_API_KEY added to Vercel environment variables (Tier 2 account, $40 credits loaded).

---

## Next Feature: AI-Powered Budget Import (IN PROGRESS)

### Goal
Replace manual weekly budget entry with a screenshot-based import flow. User uploads screenshots from AMEX, RH Gold, and Coinbase card apps. Claude AI reads the transactions, auto-categorizes them, and presents a line-item review screen before saving.

### Target weekly workflow
1. Screenshot transaction views from each card app (30 sec)
2. Upload screenshots on Budget page (30 sec)
3. Review AI-categorized line items, fix any misses (2-3 min)
4. Confirm → saved as weekly budget entry (10 sec)

### Spending buckets
- **Variable (weekly tracking)** → CC screenshots + manual one-offs (Venmo/cash)
  - These map to the 8 budget categories ($550/mo total)
- **Fixed (monthly, separate)** → Rent, utilities, subscriptions ($3,557/mo)
  - Pre-populated, user notes deviations only
- **CC payments from bank ACH** → IGNORE, not expenses (already captured at swipe)

### Edge cases to handle
1. **Duplicate detection** — filter by week date range at parse time; flag if transaction date outside selected week
2. **Pending vs posted** — prompt Claude to extract posted transactions only; user should screenshot after 1-2 day settlement
3. **Multiple card uploads** — accept up to 5 images in one session, merge into single transaction list
4. **Week boundary spillover** — pass week_start/week_end to Claude so it filters to correct range
5. **Unreadable screenshots** — clear error state with retry prompt
6. **Amazon transactions** — default to Groceries (user's primary Amazon use); reviewable

### Architecture
- `api/budget/parse.js` — Vercel serverless function, accepts multipart images, calls Claude claude-haiku-4-5-20251001 (vision), returns `[{date, merchant, amount, category}]`
- `src/components/forms/BudgetImportFlow.jsx` — multi-step UI:
  - Step 1: Upload (drag-drop or tap, multiple files, preview thumbnails)
  - Step 2: Review (full transaction table, category dropdown per row, running totals per category)
  - Step 3: Confirm → saves as budget entry via existing Supabase logic
- Manual one-off entry remains available as secondary flow for Venmo/cash

### Future: LLM Chat Window
- After import flow ships, wrap it in a chat interface
- User can paste context ("split rent 3 ways this month"), ask questions ("am I on track?"), add one-offs conversationally
- Same Claude API backend, chat layer on top
- This is why Tier 2 Anthropic account was set up
