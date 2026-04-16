// Proxy for Financial Modeling Prep API — keeps the API key server-side.
// GET /api/fmp/fundamentals?ticker=AMZN
// Returns: { profile, metrics } or { error }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const key = process.env.FMP_API_KEY
  if (!key) return res.status(503).json({ error: 'FMP_API_KEY not configured' })

  const { ticker } = req.query
  if (!ticker) return res.status(400).json({ error: 'ticker param required' })

  const sym = ticker.toUpperCase().trim()
  const base = 'https://financialmodelingprep.com/api/v3'

  try {
    const [profileRes, metricsRes, incomeRes, cashRes] = await Promise.all([
      fetch(`${base}/profile/${sym}?apikey=${key}`),
      fetch(`${base}/key-metrics-ttm/${sym}?apikey=${key}`),
      fetch(`${base}/income-statement/${sym}?limit=2&apikey=${key}`),
      fetch(`${base}/cash-flow-statement/${sym}?limit=1&apikey=${key}`),
    ])

    const [profileData, metricsData, incomeData, cashData] = await Promise.all([
      profileRes.json(),
      metricsRes.json(),
      incomeRes.json(),
      cashRes.json(),
    ])

    const profile  = Array.isArray(profileData)  ? profileData[0]  : null
    const metrics  = Array.isArray(metricsData)  ? metricsData[0]  : null
    const income0  = Array.isArray(incomeData)   ? incomeData[0]   : null  // latest
    const income1  = Array.isArray(incomeData)   ? incomeData[1]   : null  // prior year
    const cash0    = Array.isArray(cashData)     ? cashData[0]     : null

    if (!profile) return res.status(404).json({ error: `Ticker ${sym} not found` })

    // Revenue growth YoY
    const revNow  = income0?.revenue ?? 0
    const revPrev = income1?.revenue ?? 0
    const revGrowth = revPrev > 0 ? ((revNow - revPrev) / revPrev) * 100 : null

    // FCF = operating cash flow - capex
    const ocf  = cash0?.operatingCashFlow ?? 0
    const capex = Math.abs(cash0?.capitalExpenditure ?? 0)
    const fcf  = ocf - capex
    const fcfMargin = revNow > 0 ? (fcf / revNow) * 100 : null
    const opMargin  = income0 && income0.revenue > 0
      ? (income0.operatingIncome / income0.revenue) * 100 : null
    const grossMargin = income0 && income0.revenue > 0
      ? (income0.grossProfit / income0.revenue) * 100 : null

    return res.status(200).json({
      ticker: sym,
      companyName: profile.companyName,
      description: profile.description,
      sector: profile.sector,
      industry: profile.industry,
      price: profile.price,
      mktCap: profile.mktCap,
      // Formatted for display
      revenue:     revNow,
      revenueGrowth: revGrowth,
      fcf,
      fcfMargin,
      opMargin,
      grossMargin,
      peRatio:   metrics?.peRatioTTM ?? null,
      pfcfRatio: metrics?.pfcfRatioTTM ?? null,
    })
  } catch (err) {
    console.error('FMP error:', err)
    return res.status(502).json({ error: 'FMP request failed', details: err.message })
  }
}
