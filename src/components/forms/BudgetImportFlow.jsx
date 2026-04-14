import { useState, useRef } from 'react'
import { Upload, X, Loader2, AlertCircle, ChevronDown, Plus, Trash2, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { getWeekStart, formatWeekLabel, formatMoney } from '../../lib/formatters'
import { processBudgetSave } from '../../lib/gamificationActions'
import { useToast } from '../../context/ToastContext'
import { BADGE_DEFINITIONS } from '../../lib/gamification'

// Steps
const STEP_UPLOAD  = 'upload'
const STEP_LOADING = 'loading'
const STEP_REVIEW  = 'review'
const STEP_DONE    = 'done'

const fieldStyle = {
  backgroundColor: 'var(--bg-primary)',
  borderColor: 'var(--border)',
  color: 'var(--text-primary)',
}

// Compress an image File to JPEG, max 1024px wide, quality 0.75
async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX = 1024
      let { width, height } = img
      if (width > MAX) {
        height = Math.round((height * MAX) / width)
        width  = MAX
      }
      const canvas = document.createElement('canvas')
      canvas.width  = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        blob => {
          if (!blob) return reject(new Error('Compression failed'))
          const reader = new FileReader()
          reader.onload = () => {
            // Strip the data URL prefix to get raw base64
            const base64 = reader.result.split(',')[1]
            resolve({ data: base64, mediaType: 'image/jpeg' })
          }
          reader.onerror = reject
          reader.readAsDataURL(blob)
        },
        'image/jpeg',
        0.75
      )
    }
    img.onerror = reject
    img.src = url
  })
}

export function BudgetImportFlow({ onSuccess, onCancel }) {
  const { user } = useAuth()
  const { budgetTargets, setBudgetEntries, gamification, setGamification, latestNetWorth, prevNetWorth } = useData()
  const { addToast } = useToast()

  const categories = Object.keys(budgetTargets)
  const weekStart  = getWeekStart()
  const weekEnd    = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekStartISO = weekStart.toISOString().split('T')[0]
  const weekEndISO   = weekEnd.toISOString().split('T')[0]

  const [step,        setStep]        = useState(STEP_UPLOAD)
  const [files,       setFiles]       = useState([])        // { file, previewUrl }
  const [transactions, setTransactions] = useState([])      // { id, date, merchant, amount, category }
  const [error,       setError]       = useState('')
  const [saving,      setSaving]      = useState(false)
  const [notes,       setNotes]       = useState('')

  const fileInputRef = useRef(null)
  const dropRef      = useRef(null)

  // --- File handling ---
  const addFiles = (incoming) => {
    const valid = Array.from(incoming)
      .filter(f => f.type.startsWith('image/'))
      .slice(0, 5 - files.length)
    const newEntries = valid.map(f => ({ file: f, previewUrl: URL.createObjectURL(f) }))
    setFiles(prev => [...prev, ...newEntries].slice(0, 5))
  }

  const removeFile = (idx) => {
    setFiles(prev => {
      URL.revokeObjectURL(prev[idx].previewUrl)
      return prev.filter((_, i) => i !== idx)
    })
  }

  const onDragOver  = (e) => { e.preventDefault(); dropRef.current?.classList.add('drag-over') }
  const onDragLeave = ()  => { dropRef.current?.classList.remove('drag-over') }
  const onDrop      = (e) => {
    e.preventDefault()
    dropRef.current?.classList.remove('drag-over')
    addFiles(e.dataTransfer.files)
  }

  // --- Parse ---
  const handleParse = async () => {
    if (!files.length) return
    setError('')
    setStep(STEP_LOADING)

    try {
      // Compress all images
      const compressed = await Promise.all(files.map(f => compressImage(f.file)))

      const res = await fetch('/api/budget/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: compressed,
          weekStart: weekStartISO,
          weekEnd:   weekEndISO,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Parse failed')
      }

      const { transactions: parsed } = await res.json()

      // Stamp each row with a local id for keyed rendering
      const rows = (parsed || []).map((t, i) => ({ ...t, id: `ai-${Date.now()}-${i}` }))
      setTransactions(rows)
      setStep(STEP_REVIEW)
    } catch (err) {
      setError(err.message || 'Something went wrong')
      setStep(STEP_UPLOAD)
    }
  }

  // --- Review helpers ---
  const updateRow = (id, field, value) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t))
  }

  const deleteRow = (id) => {
    setTransactions(prev => prev.filter(t => t.id !== id))
  }

  const addRow = () => {
    setTransactions(prev => [
      ...prev,
      { id: `manual-${Date.now()}`, date: weekEndISO, merchant: '', amount: 0, category: categories[0] }
    ])
  }

  // Aggregate totals by category for the summary
  const totals = categories.reduce((acc, cat) => {
    acc[cat] = transactions.filter(t => t.category === cat).reduce((s, t) => s + (parseFloat(t.amount) || 0), 0)
    return acc
  }, {})

  const totalSpent  = Object.values(totals).reduce((a, b) => a + b, 0)
  const weeklyBudget = Object.values(budgetTargets).reduce((a, b) => a + b, 0) / 4.33

  // --- Save ---
  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const cats = Object.fromEntries(categories.map(c => [c, totals[c]]))
      const payload = { categories: cats, total_spent: totalSpent, notes }

      if (user) {
        const { data, error: err } = await supabase
          .from('budget_entries')
          .insert({
            ...payload,
            user_id:      user.id,
            week_start:   weekStartISO,
            week_end:     weekEndISO,
            weekly_score: null,
          })
          .select().single()
        if (err) throw err
        setBudgetEntries(prev => [data, ...prev])
        processBudgetSave(user, gamification, {
          savedEntry: data, totalSpent, weeklyBudget,
          netWorthNow:  latestNetWorth?.net_worth,
          netWorthPrev: prevNetWorth?.net_worth,
          weekStart,
        }).then(result => {
          if (result?.updated) setGamification(result.updated)
          for (const badge of result?.newBadges ?? []) {
            const def = BADGE_DEFINITIONS.find(b => b.id === badge.id)
            if (def) addToast({ icon: def.icon, title: 'Achievement Unlocked!', message: def.name })
          }
        })
      } else {
        const local = {
          ...payload,
          id:         `local-${Date.now()}`,
          week_start: weekStartISO,
          week_end:   weekEndISO,
          created_at: new Date().toISOString(),
        }
        setBudgetEntries(prev => [local, ...prev])
      }

      setStep(STEP_DONE)
    } catch (err) {
      setError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // ============================================================
  // Render
  // ============================================================

  if (step === STEP_DONE) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-10">
        <div className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--accent-green)', opacity: 0.15 }}>
        </div>
        <div className="w-12 h-12 rounded-full flex items-center justify-center absolute"
          style={{ backgroundColor: 'transparent', border: '2px solid var(--accent-green)' }}>
          <Check size={22} style={{ color: 'var(--accent-green)' }} />
        </div>
        <p className="text-sm font-semibold mt-8" style={{ color: 'var(--accent-green)' }}>Budget entry saved!</p>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {formatMoney(totalSpent)} across {transactions.length} transactions
        </p>
        <button
          onClick={onSuccess}
          className="mt-2 px-4 py-2 rounded text-sm font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--accent-blue)', color: 'white' }}>
          Done
        </button>
      </div>
    )
  }

  if (step === STEP_LOADING) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Reading transactions...</p>
        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Claude is parsing your screenshots</p>
      </div>
    )
  }

  if (step === STEP_REVIEW) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Week: <span style={{ color: 'var(--accent-cyan)' }}>{formatWeekLabel(weekStart)}</span>
          </span>
          <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} found
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="rounded p-4 text-center space-y-2 border" style={{ borderColor: 'var(--border)' }}>
            <AlertCircle size={18} className="mx-auto" style={{ color: 'var(--accent-amber)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No transactions extracted</p>
            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
              Try clearer screenshots or add rows manually
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: 'var(--text-dim)' }}>
                  <th className="text-left pb-2 font-medium pr-2">Date</th>
                  <th className="text-left pb-2 font-medium pr-2">Merchant</th>
                  <th className="text-right pb-2 font-medium pr-2">Amount</th>
                  <th className="text-left pb-2 font-medium pr-2">Category</th>
                  <th className="pb-2 w-6"></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                    <td className="py-1.5 pr-2">
                      <input
                        type="date"
                        value={t.date}
                        onChange={e => updateRow(t.id, 'date', e.target.value)}
                        className="w-[118px] text-xs px-1.5 py-0.5 rounded border outline-none"
                        style={fieldStyle}
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="text"
                        value={t.merchant}
                        onChange={e => updateRow(t.id, 'merchant', e.target.value)}
                        className="w-full min-w-[100px] text-xs px-1.5 py-0.5 rounded border outline-none"
                        style={fieldStyle}
                      />
                    </td>
                    <td className="py-1.5 pr-2 text-right">
                      <input
                        type="number"
                        value={t.amount}
                        onChange={e => updateRow(t.id, 'amount', parseFloat(e.target.value) || 0)}
                        step="0.01" min="0"
                        className="w-20 text-right text-xs px-1.5 py-0.5 rounded border outline-none tabular-nums"
                        style={{ ...fieldStyle, fontFamily: "'JetBrains Mono', monospace", color: 'var(--accent-green)' }}
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <div className="relative">
                        <select
                          value={t.category}
                          onChange={e => updateRow(t.id, 'category', e.target.value)}
                          className="appearance-none w-full text-xs px-1.5 py-0.5 pr-5 rounded border outline-none"
                          style={fieldStyle}
                        >
                          {categories.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <ChevronDown size={10} className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none"
                          style={{ color: 'var(--text-dim)' }} />
                      </div>
                    </td>
                    <td className="py-1.5">
                      <button onClick={() => deleteRow(t.id)}
                        className="p-0.5 rounded hover:opacity-70 transition-opacity"
                        style={{ color: 'var(--accent-red)' }}>
                        <Trash2 size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button
          onClick={addRow}
          className="flex items-center gap-1 text-xs transition-opacity hover:opacity-70"
          style={{ color: 'var(--accent-cyan)' }}>
          <Plus size={12} /> Add row
        </button>

        {/* Category totals summary */}
        <div className="rounded p-3 border space-y-1.5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
          <p className="text-[10px] font-semibold mb-2" style={{ color: 'var(--text-dim)' }}>CATEGORY TOTALS</p>
          {categories.filter(c => totals[c] > 0).map(c => (
            <div key={c} className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{c}</span>
              <span className="text-xs tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-primary)' }}>
                {formatMoney(totals[c])}
              </span>
            </div>
          ))}
          <div className="border-t pt-1.5 flex justify-between" style={{ borderColor: 'var(--border)' }}>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Total</span>
            <span className="text-xs tabular-nums font-semibold"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: totalSpent > weeklyBudget ? 'var(--accent-red)' : 'var(--accent-green)' }}>
              {formatMoney(totalSpent)}
              <span className="font-normal ml-1" style={{ color: 'var(--text-dim)' }}>/ {formatMoney(weeklyBudget)}</span>
            </span>
          </div>
        </div>

        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={2}
          className="w-full text-sm px-2 py-1.5 rounded border outline-none resize-none"
          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        />

        {error && (
          <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--accent-amber)' }}>
            <AlertCircle size={12} /> {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setStep(STEP_UPLOAD)}
            className="flex-1 py-2 rounded text-sm border transition-opacity hover:opacity-70"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            Back
          </button>
          <button
            onClick={handleSave}
            disabled={saving || transactions.length === 0}
            className="flex-1 py-2 rounded text-sm font-semibold transition-opacity"
            style={{ backgroundColor: 'var(--accent-blue)', color: 'white', opacity: (saving || transactions.length === 0) ? 0.6 : 1 }}>
            {saving ? 'Saving...' : 'Save Budget Entry'}
          </button>
        </div>
      </div>
    )
  }

  // STEP_UPLOAD
  return (
    <div className="space-y-4">
      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        Week: <span style={{ color: 'var(--accent-cyan)' }}>{formatWeekLabel(weekStart)}</span>
      </div>

      {/* Drop zone */}
      <div
        ref={dropRef}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className="rounded-lg border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-2 py-8 transition-colors"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-primary)' }}>
        <Upload size={22} style={{ color: 'var(--text-dim)' }} />
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Drop screenshots here or <span style={{ color: 'var(--accent-blue)' }}>browse</span>
        </p>
        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
          AMEX, RH Gold, Coinbase card — up to 5 images
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => addFiles(e.target.files)}
      />

      {/* Thumbnails */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div key={i} className="relative w-16 h-16 rounded border overflow-hidden group"
              style={{ borderColor: 'var(--border)' }}>
              <img src={f.previewUrl} alt="" className="w-full h-full object-cover" />
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                className="absolute top-0.5 right-0.5 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: 'white' }}>
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--accent-amber)' }}>
          <AlertCircle size={12} /> {error}
        </p>
      )}

      <div className="space-y-2">
        <button
          onClick={handleParse}
          disabled={!files.length}
          className="w-full py-2.5 rounded font-semibold text-sm transition-opacity"
          style={{ backgroundColor: 'var(--accent-blue)', color: 'white', opacity: files.length ? 1 : 0.5 }}>
          Parse Screenshots with AI
        </button>
        <button
          onClick={onCancel}
          className="w-full py-2 rounded text-sm border transition-opacity hover:opacity-70"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
          Use manual entry instead
        </button>
      </div>
    </div>
  )
}
