import { createClient } from '@supabase/supabase-js'

async function getValidToken(supabase) {
  const { data: row } = await supabase
    .from('schwab_tokens')
    .select('*')
    .eq('id', 'singleton')
    .single()

  if (!row) return null

  // Refresh if expiring within 2 minutes
  if (new Date(row.expires_at) <= new Date(Date.now() + 120_000)) {
    const credentials = Buffer.from(
      `${process.env.SCHWAB_CLIENT_ID}:${process.env.SCHWAB_CLIENT_SECRET}`
    ).toString('base64')

    const refreshRes = await fetch('https://api.schwabapi.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        refresh_token: row.refresh_token,
      }),
    })

    const refreshed = await refreshRes.json()
    if (!refreshRes.ok) return null

    await supabase.from('schwab_tokens').update({
      access_token:  refreshed.access_token,
      refresh_token: refreshed.refresh_token || row.refresh_token,
      expires_at:    new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      updated_at:    new Date().toISOString(),
    }).eq('id', 'singleton')

    return refreshed.access_token
  }

  return row.access_token
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const { tickers } = req.query
  if (!tickers) return res.status(400).json({ error: 'tickers param required' })

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const accessToken = await getValidToken(supabase)
  if (!accessToken) return res.status(401).json({ error: 'not_connected' })

  const quotesRes = await fetch(
    `https://api.schwabapi.com/marketdata/v1/quotes?symbols=${encodeURIComponent(tickers)}&fields=quote`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  )

  const raw = await quotesRes.json()
  if (!quotesRes.ok) {
    console.error('Schwab quotes error:', raw)
    return res.status(502).json({ error: 'quotes_failed', details: raw })
  }

  // Normalize to { TICKER: { price, change, changePercent } }
  const result = {}
  for (const [symbol, data] of Object.entries(raw)) {
    const q = data.quote ?? data
    result[symbol] = {
      price:         q.lastPrice ?? q.mark ?? q.closePrice ?? 0,
      change:        q.netChange ?? 0,
      changePercent: q.netPercentChangeInDouble ?? 0,
    }
  }

  res.json(result)
}
