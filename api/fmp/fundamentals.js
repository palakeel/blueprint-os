// Proxy for Financial Modeling Prep API — keeps the API key server-side.
// GET /api/fmp/fundamentals?ticker=AMZN
// Returns: { profile, metrics } or { error }
// Gracefully handles premium-gated endpoints (foreign-listed stocks, small caps)
// by returning nulls for unavailable fields rather than failing the whole request.

async function safeFetch(url) {
  try {
    const res  = await fetch(url)
    const data = await res.json()
    // FMP returns a string or object with "Premium Query Parameter" for gated endpoints
    if (!Array.isArray(data)) return null
    return data
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const key = process.env.FMP_API_KEY
  if (!key) return res.status(503).json({ error: 'FMP_API_KEY not configured' })

  const { ticker } = req.query
  if (!ticker) return res.status(400).json({ error: 'ticker param required' })

  const sym  = ticker.toUpperCase().trim()
  const base = 'https://financialmodelingprep.com/stable'

  const [profileData, metricsData, incomeData, cashData] = await Promise.all([
    safeFetch(`${base}/profile?symbol=${sym}&apikey=${key}`),
    safeFetch(`${base}/key-metrics-ttm?symbol=${sym}&apikey=${key}`),
    safeFetch(`${base}/income-statement?symbol=${sym}&limit=2&apikey=${key}`),
    safeFetch(`${base}/cash-flow-statement?symbol=${sym}&limit=1&apikey=${key}`),
  ])

  const profile = profileData?.[0] ?? null
  if (!profile) return res.status(404).json({ error: `Ticker ${sym} not found` })

  const metrics = metricsData?.[0] ?? null
  const income0 = incomeData?.[0]  ?? null  // latest
  const income1 = incomeData?.[1]  ?? null  // prior year
  const cash0   = cashData?.[0]    ?? null

  // Revenue growth YoY
  const revNow    = income0?.revenue ?? 0
  const revPrev   = income1?.revenue ?? 0
  const revGrowth = revPrev > 0 ? ((revNow - revPrev) / revPrev) * 100 : null

  // FCF = operating cash flow - capex
  const ocf      = cash0?.operatingCashFlow ?? 0
  const capex    = Math.abs(cash0?.capitalExpenditure ?? 0)
  const fcf      = ocf > 0 ? ocf - capex : null
  const fcfMargin    = revNow > 0 && fcf != null ? (fcf / revNow) * 100 : null
  const opMargin     = income0?.revenue > 0 ? (income0.operatingIncome / income0.revenue) * 100 : null
  const grossMargin  = income0?.revenue > 0 ? (income0.grossProfit    / income0.revenue) * 100 : null

  // Derive PE and PFCF from yield fields (stable API dropped ratio fields)
  const peRatio   = metrics?.earningsYieldTTM    > 0 ? 1 / metrics.earningsYieldTTM    : null
  const pfcfRatio = metrics?.freeCashFlowYieldTTM > 0 ? 1 / metrics.freeCashFlowYieldTTM : null

  return res.status(200).json({
    ticker: sym,
    companyName:   profile.companyName,
    description:   profile.description,
    sector:        profile.sector,
    industry:      profile.industry,
    price:         profile.price,
    mktCap:        profile.marketCap,
    revenue:       revNow || null,
    revenueGrowth: revGrowth,
    fcf,
    fcfMargin,
    opMargin,
    grossMargin,
    peRatio,
    pfcfRatio,
  })
}
