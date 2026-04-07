function escapeCell(value) {
  const str = String(value ?? '')
  return str.includes(',') || str.includes('"') || str.includes('\n')
    ? `"${str.replace(/"/g, '""')}"`
    : str
}

function buildCSV(headers, rows) {
  const lines = [
    headers.join(','),
    ...rows.map(row => headers.map(h => escapeCell(row[h])).join(',')),
  ]
  return lines.join('\n')
}

function download(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportBudgetCSV(entries, budgetTargets) {
  const categories = Object.keys(budgetTargets)
  const headers = ['week_start', 'week_end', ...categories, 'total_spent', 'weekly_score', 'notes']

  const rows = entries.map(e => {
    const row = {
      week_start:   e.week_start,
      week_end:     e.week_end,
      total_spent:  e.total_spent,
      weekly_score: e.weekly_score ?? '',
      notes:        e.notes ?? '',
    }
    for (const cat of categories) row[cat] = e.categories?.[cat] ?? 0
    return row
  })

  download(`blueprint-budget-${new Date().toISOString().split('T')[0]}.csv`, buildCSV(headers, rows))
}

export function exportNetWorthCSV(entries) {
  const accounts = entries.length > 0 ? Object.keys(entries[0].accounts ?? {}) : []
  const headers  = ['entry_date', ...accounts, 'total_assets', 'total_liabilities', 'net_worth', 'notes']

  const rows = entries.map(e => {
    const row = {
      entry_date:       e.entry_date,
      total_assets:     e.total_assets,
      total_liabilities: e.total_liabilities,
      net_worth:        e.net_worth,
      notes:            e.notes ?? '',
    }
    for (const acc of accounts) row[acc] = e.accounts?.[acc] ?? 0
    return row
  })

  download(`blueprint-networth-${new Date().toISOString().split('T')[0]}.csv`, buildCSV(headers, rows))
}
