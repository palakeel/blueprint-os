// GET /api/coingecko/prices?ids=bitcoin,ethereum,solana
// Returns: { bitcoin: { usd, usd_24h_change }, ... }
// No API key required for CoinGecko public API.
// Server-side proxy caches for 60s to avoid rate limits (30 req/min free tier).

const CACHE = new Map() // in-memory for serverless warm instances
const CACHE_TTL = 60_000 // 60 seconds

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { ids } = req.query
  if (!ids) return res.status(400).json({ error: 'ids param required (comma-separated CoinGecko IDs)' })

  const cacheKey = ids.toLowerCase().split(',').sort().join(',')
  const cached   = CACHE.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return res.status(200).json(cached.data)
  }

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`
    const cgRes = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    })

    if (!cgRes.ok) {
      const text = await cgRes.text()
      return res.status(502).json({ error: 'CoinGecko request failed', status: cgRes.status, details: text })
    }

    const data = await cgRes.json()
    CACHE.set(cacheKey, { ts: Date.now(), data })
    return res.status(200).json(data)
  } catch (err) {
    console.error('CoinGecko error:', err)
    return res.status(502).json({ error: 'CoinGecko request failed', details: err.message })
  }
}
