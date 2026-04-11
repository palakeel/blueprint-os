import { createClient } from '@supabase/supabase-js'

async function getValidToken(supabase) {
  const { data: row } = await supabase
    .from('schwab_tokens')
    .select('*')
    .eq('id', 'singleton')
    .single()
  if (!row) return null
  if (new Date(row.expires_at) <= new Date(Date.now() + 120_000)) {
    const credentials = Buffer.from(
      `${process.env.SCHWAB_CLIENT_ID}:${process.env.SCHWAB_CLIENT_SECRET}`
    ).toString('base64')
    const refreshRes = await fetch('https://api.schwabapi.com/v1/oauth/token', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: row.refresh_token }),
    })
    const refreshed = await refreshRes.json()
    if (!refreshRes.ok) return null
    await supabase.from('schwab_tokens').update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token || row.refresh_token,
      expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    }).eq('id', 'singleton')
    return refreshed.access_token
  }
  return row.access_token
}

export default async function handler(req, res) {
  const ticker = req.query.ticker || 'SCHD'

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const accessToken = await getValidToken(supabase)
  if (!accessToken) return res.status(401).json({ error: 'not_connected' })

  const raw = await fetch(
    `https://api.schwabapi.com/marketdata/v1/quotes?symbols=${ticker}&fields=quote,extended`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  ).then(r => r.json())

  res.json(raw)
}
