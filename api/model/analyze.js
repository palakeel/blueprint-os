// POST /api/model/analyze
// Body: { ticker, price? }
// Claude recalls financials from training knowledge + applies 3-driver methodology.
// No external data dependency — works for any publicly listed stock.

const METHODOLOGY = `
You are a fundamental analyst performing scenario analysis using a specific 3-driver framework.

## Your Job
1. Recall the most recent available financial data for the given ticker from your training knowledge.
2. Apply the 3-driver scenario framework to generate price targets.

## The Framework
Each scenario (Bull / Base / Bear) simultaneously changes three drivers:
1. Revenue CAGR — derived from current growth rate, TAM, competitive position, historical precedents
2. FCF Margin — how free cash flow margins evolve as the business scales
3. Exit Multiple — the P/FCF multiple the market pays at the horizon end

## Scenario Definitions
- Bull: favorable macro, faster TAM capture, margin expansion, multiple expansion. Optimistic but grounded.
- Base: current trajectory, neutral macro, no major disruptions, company executes near current run rate.
- Bear: mild headwind — 12-18 month execution delay, caution, multiple compression. Thesis intact but delayed. NOT a worst case.

## Price Target Methodology
Starting from current price, derive implied price at 3yr, 5yr, 10yr by:
1. Projecting revenue at scenario CAGR
2. Applying scenario FCF margin to get FCF
3. Multiplying by scenario exit P/FCF multiple

## Output Format
Return ONLY valid JSON — no markdown, no explanation, just the object:
{
  "companyName": "Full legal company name",
  "sector": "Sector (e.g. Technology, Energy, Healthcare)",
  "funds": ["$XB rev", "+Y% YoY", "$ZB FCF", "W% FCF mg", "X% op mg", "Y% gr mg"],
  "note": "One short footnote about an important financial nuance, or empty string if none",
  "thesis": "2-3 sentence bull-case investment thesis. What is the primary driver of long-term value?",
  "risk": "Single sentence: the #1 risk that could invalidate the thesis.",
  "sc": {
    "bull": { "p": [price_3yr, price_5yr, price_10yr] },
    "base": { "p": [price_3yr, price_5yr, price_10yr] },
    "bear": { "p": [price_3yr, price_5yr, price_10yr] }
  }
}

All prices are integers (round to nearest dollar). Use N/A in funds array if a metric is unavailable.
Be realistic — bear case should still reflect a functional business.
If you don't know the exact financials, use your best estimate based on the company's business model and sector.
`

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { ticker, price } = req.body ?? {}
  if (!ticker) return res.status(400).json({ error: 'ticker required' })

  const priceStr = price > 0 ? `$${price}` : 'unknown (use your best estimate of current price)'

  const userPrompt = `Analyze ${ticker.toUpperCase()} for scenario modeling.

Current market price: ${priceStr}

Using your training knowledge, recall the most recent available financials for this company, then apply the 3-driver scenario framework to generate 3yr, 5yr, and 10yr price targets for bull, base, and bear cases.`

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

  const result = await apiRes.json()
  const text   = result.content?.[0]?.text ?? '{}'

  let analysis
  try {
    analysis = JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    try { analysis = JSON.parse(match?.[0] ?? '{}') } catch { analysis = {} }
  }

  return res.status(200).json({ ticker: ticker.toUpperCase(), analysis })
}
