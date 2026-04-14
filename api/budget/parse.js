const CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Transport',
  'Shopping',
  'Entertainment',
  'Health & Personal',
  'Travel',
  'Miscellaneous',
]

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { images, weekStart, weekEnd } = req.body ?? {}

  if (!images?.length) {
    return res.status(400).json({ error: 'No images provided' })
  }
  if (images.length > 5) {
    return res.status(400).json({ error: 'Maximum 5 images per request' })
  }

  // Build Claude message content: image blocks first, then the instruction
  const content = []

  for (const img of images) {
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: img.mediaType || 'image/jpeg',
        data: img.data,
      },
    })
  }

  content.push({
    type: 'text',
    text: `You are a financial transaction parser. Extract transactions from these credit/debit card app screenshots.

Week range to include: ${weekStart ?? 'any'} to ${weekEnd ?? 'any'}

Rules:
- Only extract POSTED transactions — skip anything labeled pending, processing, or not yet settled
- Skip CC payments, ACH transfers, bank-to-bank transfers, and balance payments (these are not expenses)
- Only include transactions that fall within the week range above; discard anything outside that range
- For Amazon transactions, default category to "Groceries" (user's primary Amazon use)
- Amounts should be positive numbers (not negative)

Assign each transaction one of these exact categories: ${CATEGORIES.join(', ')}

Respond with ONLY a valid JSON array — no markdown fences, no explanation, just the array.
If no qualifying transactions are found, return an empty array.

Format:
[{"date":"YYYY-MM-DD","merchant":"Merchant Name","amount":12.34,"category":"Category Name"}]`,
  })

  const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content }],
    }),
  })

  if (!apiRes.ok) {
    const err = await apiRes.json().catch(() => ({}))
    console.error('Anthropic API error:', err)
    return res.status(502).json({ error: 'AI parsing failed', details: err })
  }

  const result = await apiRes.json()
  const text = result.content?.[0]?.text ?? '[]'

  let transactions
  try {
    transactions = JSON.parse(text)
  } catch {
    // Claude sometimes wraps JSON in markdown — try to extract the array
    const match = text.match(/\[[\s\S]*\]/)
    if (match) {
      try {
        transactions = JSON.parse(match[0])
      } catch {
        transactions = []
      }
    } else {
      transactions = []
    }
  }

  // Basic validation: ensure each entry has required fields
  transactions = (transactions || []).filter(
    t => t && typeof t.amount === 'number' && t.merchant && t.category
  )

  return res.status(200).json({ transactions })
}
