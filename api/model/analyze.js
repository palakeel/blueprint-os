// POST /api/model/analyze
// Body: { ticker, companyName, price, fundamentals: { revenue, revenueGrowth, fcf, fcfMargin, opMargin, grossMargin, mktCap, sector, description } }
// Returns: { ticker, companyName, analysis: { thesis, risk, note, funds, sc } }

const METHODOLOGY = `
You are a fundamental analyst performing scenario analysis using a specific 3-driver framework.

## The Framework
Each scenario (Bull / Base / Bear) simultaneously changes three drivers:
1. Revenue CAGR — derived from current growth rate, TAM, competitive position, historical precedents at similar scale
2. FCF Margin — how free cash flow margins evolve as the business scales (capital-light = natural expansion; capex-heavy = compression then recovery)
3. Exit Multiple — the P/FCF multiple the market pays at the horizon end (Bull = expansion vs today; Bear = compression)

## Scenario Definitions
- Bull: favorable macro, faster TAM capture, margin expansion, multiple expansion. Optimistic but grounded.
- Base: current trajectory, neutral macro, no major disruptions, company executes near current run rate.
- Bear: mild headwind — 12-18 month execution delay, enterprise caution, multiple compression. Thesis intact but delayed. NOT a recession scenario, NOT a worst case.

## Price Target Methodology
Starting from current price, derive implied price at 3yr, 5yr, and 10yr by:
1. Projecting revenue at scenario CAGR
2. Applying scenario FCF margin to get FCF
3. Multiplying by scenario exit P/FCF multiple
This gives a fundamental value; adjust for share count changes if relevant.

## Output Format
Return ONLY valid JSON — no markdown, no explanation, just the object:
{
  "thesis": "2-3 sentence bull-case investment thesis. What is the primary driver of long-term value?",
  "risk": "Single sentence: the #1 risk that could invalidate the thesis.",
  "note": "One short footnote about an important financial nuance (e.g. suppressed FCF due to capex, or one-time items).",
  "funds": ["$XB rev", "+Y% growth", "$ZB FCF", "W% FCF mg", "X% op mg", "Y% gr mg"],
  "sc": {
    "bull": { "p": [price_3yr, price_5yr, price_10yr] },
    "base": { "p": [price_3yr, price_5yr, price_10yr] },
    "bear": { "p": [price_3yr, price_5yr, price_10yr] }
  }
}

All prices are integers (round to nearest dollar). Be realistic — bear case should still reflect a functional business.
`

function fmt(n, decimals = 0) {
  if (n == null) return 'N/A'
  const abs = Math.abs(n)
  if (abs >= 1e12) return `$${(n / 1e12).toFixed(1)}T`
  if (abs >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`
  if (abs >= 1e6)  return `$${(n / 1e6).toFixed(1)}M`
  return `$${n.toFixed(decimals)}`
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { ticker, companyName, price, fundamentals } = req.body ?? {}
  if (!ticker || !price) return res.status(400).json({ error: 'ticker and price required' })

  const f = fundamentals ?? {}

  const userPrompt = `Analyze ${ticker} (${companyName ?? ticker}) for scenario modeling.

Current price: $${price}
Market cap: ${fmt(f.mktCap)}
Sector: ${f.sector ?? 'Unknown'}

Financials (TTM):
  Revenue: ${fmt(f.revenue)} ${f.revenueGrowth != null ? `(+${f.revenueGrowth.toFixed(0)}% YoY)` : ''}
  Free Cash Flow: ${fmt(f.fcf)} (${f.fcfMargin != null ? f.fcfMargin.toFixed(1) + '% FCF margin' : 'margin N/A'})
  Operating Margin: ${f.opMargin != null ? f.opMargin.toFixed(1) + '%' : 'N/A'}
  Gross Margin: ${f.grossMargin != null ? f.grossMargin.toFixed(1) + '%' : 'N/A'}

Business: ${f.description ? f.description.slice(0, 400) : 'No description available.'}`

  const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: METHODOLOGY,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!apiRes.ok) {
    const err = await apiRes.json().catch(() => ({}))
    return res.status(502).json({ error: 'Claude API failed', details: err })
  }

  const result  = await apiRes.json()
  const text    = result.content?.[0]?.text ?? '{}'

  let analysis
  try {
    analysis = JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    try { analysis = JSON.parse(match?.[0] ?? '{}') } catch { analysis = {} }
  }

  return res.status(200).json({ ticker, companyName: companyName ?? ticker, analysis })
}
