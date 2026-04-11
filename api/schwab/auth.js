export default function handler(req, res) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     process.env.SCHWAB_CLIENT_ID,
    redirect_uri:  process.env.SCHWAB_REDIRECT_URI,
    scope:         'readonly',
  })
  res.redirect(`https://api.schwabapi.com/v1/oauth/authorize?${params}`)
}
