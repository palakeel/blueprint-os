import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const { code, error } = req.query

  if (error) return res.redirect('/portfolio?schwab=error')
  if (!code)  return res.status(400).json({ error: 'No authorization code' })

  const credentials = Buffer.from(
    `${process.env.SCHWAB_CLIENT_ID}:${process.env.SCHWAB_CLIENT_SECRET}`
  ).toString('base64')

  const tokenRes = await fetch('https://api.schwabapi.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization':  `Basic ${credentials}`,
      'Content-Type':   'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type:   'authorization_code',
      code,
      redirect_uri: process.env.SCHWAB_REDIRECT_URI,
    }),
  })

  const tokens = await tokenRes.json()
  if (!tokenRes.ok) {
    console.error('Token exchange failed:', tokens)
    return res.redirect('/portfolio?schwab=error')
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  await supabase.from('schwab_tokens').upsert({
    id:            'singleton',
    access_token:  tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at:    new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    updated_at:    new Date().toISOString(),
  })

  res.redirect('/portfolio?schwab=connected')
}
