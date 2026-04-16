import { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, BookmarkPlus, BookmarkCheck, RefreshCw, Wifi, WifiOff, Loader2, X, AlertCircle, LayoutGrid, List } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Private } from '../components/ui/Private'

// ─── Position data (researched April 2026) ──────────────────────────────────
const POSITION_DATA = [
  { t:'AMZN', n:'Amazon.com', a:16,
    funds:['$717B','+12%','$11B*','1.6%*','11.2%','~49%'], note:'*FCF compressed by $132B capex',
    thesis:'AWS ($129B rev, +20% YoY, 35% margins) is the primary engine. FCF temporarily suppressed by $200B capex guided for 2026. Bet: capex today = pricing power and margin expansion in 2027–2029. AI inference runs on AWS.',
    risk:'Capex ROIC disappoints; cloud growth decelerates below 15%',
    sc:{bull:{p:[320,520,1100]},base:{p:[270,390,720]},bear:{p:[200,270,440]}}},

  { t:'NVDA', n:'NVIDIA Corporation', a:8,
    funds:['$216B','+65%','$36B OCF','~30%','~55%','73–75%'], note:'Data center = 91% of revenue',
    thesis:'Every major AI model runs on NVDA hardware. CUDA ecosystem has a 20-year head start. Revenue $216B growing 65%. Blackwell architecture ramping. Hyperscaler capex cycles still early innings.',
    risk:'Custom silicon captures 30%+ training; China export restrictions limit TAM',
    sc:{bull:{p:[380,680,1800]},base:{p:[270,440,980]},bear:{p:[180,240,440]}}},

  { t:'META', n:'Meta Platforms', a:8,
    funds:['$201B','+22%','$43.6B','21.7%','41%','~82%'], note:'3.43B DAP; WhatsApp $2B ARR',
    thesis:'Most capital-efficient large-cap AI compounder. $201B rev, $43.6B FCF, 41% op margin, 3.43B daily active people. Llama open-source moat. WhatsApp monetization crossing $2B ARR. PEG below 1.',
    risk:'Regulatory breakup of Instagram/WhatsApp; user attrition to younger platforms',
    sc:{bull:{p:[940,1600,3800]},base:{p:[720,1050,2200]},bear:{p:[460,580,1100]}}},

  { t:'GOOGL', n:'Alphabet Inc.', a:10,
    funds:['$400B+','+14%','~$70B','~17%','31.6%','~57%'], note:'Cloud +48% Q4; YouTube >$60B/yr',
    thesis:'Most undervalued mega-cap at ~18x forward earnings. Revenue crossed $400B. Cloud growing 48% Q4 with margins expanding to 24%. Gemini is Apple\'s default AI. Waymo optionality unpriced.',
    risk:'DOJ antitrust forces search monetization changes; OpenAI erodes search share',
    sc:{bull:{p:[520,860,2000]},base:{p:[390,580,1200]},bear:{p:[260,320,560]}}},

  { t:'TSLA', n:'Tesla Inc.', a:11,
    funds:['$94.8B','−3%','$6.2B','6.5%','2–6%','16–18%'], note:'Energy +81% YoY; Robotaxi live June 2025',
    thesis:'Binary bet on physical AI. Automotive is the financing vehicle. Energy storage growing 80%+ YoY. Robotaxi live in Austin/Bay Area. Cybercab production started April 2026. 10yr bull: autonomous driving + Optimus at scale.',
    risk:'Cybercab fails commercial scale; Waymo outcompetes; automotive margin stays compressed',
    sc:{bull:{p:[700,1400,4500]},base:{p:[420,620,1400]},bear:{p:[180,210,320]}}},

  { t:'NOW', n:'ServiceNow Inc.', a:7,
    funds:['$13.3B','+21%','$4.6B','35%','31%','~83%'], note:'RPO $24.3B; zero long-term debt',
    thesis:'Operating system enterprises run workflows on. $13.3B revenue +21%, $4.6B FCF +34%, $24.3B backlog, zero debt, 83% subscription gross margins. Now Assist AI on track for $1B ACV by 2026.',
    risk:'NRR drops below 115%; enterprise AI disrupts workflow automation demand',
    sc:{bull:{p:[160,280,720]},base:{p:[120,195,440]},bear:{p:[75,95,200]}}},

  { t:'INTU', n:'Intuit Inc.', a:5,
    funds:['$18.8B','+16%','$6.1B','32%','~41%','~82%'], note:'QBO +22%; FY26 guided +12–13%',
    thesis:'$6.1B FCF on $84M capex = capital-light perfection. QuickBooks 7M+ SMB subscribers with near-zero churn. TurboTax 40%+ US tax filing market. Down 51% from highs on AI disruption fears that ignore Intuit IS building the AI tools.',
    risk:'AI-native accounting tools erode QuickBooks market share; TurboTax free-file expansion',
    sc:{bull:{p:[560,900,2200]},base:{p:[420,640,1400]},bear:{p:[270,320,600]}}},

  { t:'AMD', n:'Advanced Micro Devices', a:8,
    funds:['$34.6B','+34%','$7.8B','~22%','~22%','~52%'], note:'Data center $16.6B +32%; Meta $60B deal',
    thesis:'Data center revenue $16.6B +32% YoY. Meta $60B infrastructure commitment validates AMD as genuine NVDA alternative. OpenAI partnership. MI350/MI400 roadmap targeting 80%+ CAGR in AI revenue.',
    risk:'CUDA ecosystem moat persists; ROCm fails to achieve software parity',
    sc:{bull:{p:[480,820,2200]},base:{p:[340,540,1300]},bear:{p:[160,200,380]}}},

  { t:'SMH', n:'VanEck Semiconductor ETF', a:8,
    funds:['ETF','27.5% avg','N/A','0.35% ER','N/A','N/A'], note:'NVDA 18%, TSM 11%, AVGO 8%, ASML 5%',
    thesis:'25 largest semiconductor companies. Holds NVDA (18%), TSM (11%), AVGO (8%), ASML (5%), AMD (5%). De-risked chip thesis with built-in TSMC and ASML exposure.',
    risk:'Concentrated in AI capex cycle; any pullback in semiconductor spending hits entire basket',
    sc:{bull:{p:[720,1200,3200]},base:{p:[540,840,1900]},bear:{p:[300,380,760]}}},

  { t:'VST', n:'Vistra Corp.', a:4,
    funds:['~$16B','AI-driven','$3.6B FCF','~$5.9B EBITDA','N/A','N/A'], note:'6.4GW nuclear; 2026 EBITDA $6.8–7.6B',
    thesis:'41GW fleet — nuclear baseload + flexible gas + battery storage — uniquely positioned for AI data center power demand. $3.6B FCF, $5.9B EBITDA 2025. Nuclear PTCs from IRA provide earnings floor.',
    risk:'AI capex compression; power demand overestimated; nuclear regulatory risk',
    sc:{bull:{p:[280,440,900]},base:{p:[200,300,580]},bear:{p:[110,135,240]}}},

  { t:'VOO', n:'Vanguard S&P 500 ETF', a:10,
    funds:['S&P 500','~10% hist.','N/A','0.03% ER','N/A','N/A'], note:'Market floor; 500 US large-caps',
    thesis:'Non-negotiable market anchor. Provides baseline compounding floor regardless of individual stock thesis outcomes. Historical 10% CAGR across 30+ year periods. Not a conviction bet — a structural necessity.',
    risk:'Prolonged bear market; structural index concentration in mega-cap tech',
    sc:{bull:{p:[840,1300,3200]},base:{p:[720,1050,2400]},bear:{p:[530,700,1400]}}},

  { t:'HOOD', n:'Robinhood Markets', a:2,
    funds:['$4.5B','+52%','Profitable','Growing','~30% adj','N/A'], note:'11 business lines >$100M ARR each',
    thesis:'Revenue $4.5B +52% YoY. 11 business lines each generating $100M+ annualized. Net deposits $20B/quarter. 3.9M Gold subscribers. Bitstamp acquisition expands crypto globally.',
    risk:'PFOF regulatory risk; crypto bear market cuts transaction revenue; market downturn hits trading volumes',
    sc:{bull:{p:[140,240,620]},base:{p:[100,160,380]},bear:{p:[45,60,120]}}},

  { t:'NBIS', n:'Nebius Group', a:3,
    funds:['$530M','351% YoY','Pre-scale','Neg→Pos 2H26','~35%','N/A'], note:'ARR $1.25B; MSFT $17.4B deal',
    thesis:'Pure-play neo-cloud GPU infrastructure. Revenue $530M +351% YoY. Microsoft $17.4B + Meta $3B five-year deals. Sold out all available capacity. $7–9B ARR target end of 2026.',
    risk:'$16–20B 2026 capex plan execution; GPU supply dependency on NVDA; EBITDA still negative until H2 2026',
    sc:{bull:{p:[380,680,2200]},base:{p:[220,380,900]},bear:{p:[80,100,200]}}},
]

// Fallback prices (April 15, 2026) used when Schwab is not connected
const FALLBACK_PRICES = {
  AMZN:248.67, NVDA:199.12, META:674.90, GOOGL:338.65, TSLA:395.83,
  NOW:95.70, INTU:394.42, AMD:258.82, VST:164.15, SMH:453.90,
  VOO:644.63, HOOD:89.36, NBIS:165.90,
}

const FUND_LABELS = ['Revenue','Rev Gr','FCF','FCF Mg','Op Mg','Gr Mg']
const CACHE_TTL   = 24 * 60 * 60 * 1000 // 24 hours

// ─── Pure math helpers ───────────────────────────────────────────────────────

function interpolatePrice(ticker, scenario, years, livePrices) {
  const pos  = POSITION_DATA.find(x => x.t === ticker)
  if (!pos) return 0
  const curr = livePrices[ticker] ?? FALLBACK_PRICES[ticker] ?? 0
  const pts  = [
    { y: 0,  p: curr },
    { y: 3,  p: pos.sc[scenario].p[0] },
    { y: 5,  p: pos.sc[scenario].p[1] },
    { y: 10, p: pos.sc[scenario].p[2] },
  ]
  if (years <= 0) return curr
  if (years >= 10) {
    const cagr10 = Math.pow(pts[3].p / curr, 1 / 10) - 1
    return pts[3].p * Math.pow(1 + cagr10, years - 10)
  }
  let lo = pts[0], hi = pts[1]
  for (let i = 0; i < pts.length - 1; i++) {
    if (years >= pts[i].y && years <= pts[i + 1].y) { lo = pts[i]; hi = pts[i + 1]; break }
  }
  if (hi.y === lo.y) return lo.p
  const cagr = Math.pow(hi.p / lo.p, 1 / (hi.y - lo.y)) - 1
  return lo.p * Math.pow(1 + cagr, years - lo.y)
}

function annualReturn(ticker, scenario, years, livePrices) {
  const curr   = livePrices[ticker] ?? FALLBACK_PRICES[ticker] ?? 0
  const target = interpolatePrice(ticker, scenario, years, livePrices)
  return years > 0 ? Math.pow(target / curr, 1 / years) - 1 : 0
}

function dcaFV(baseContrib, posReturn, years, growthRate) {
  let fv = 0
  for (let y = 1; y <= years; y++) {
    const contrib = baseContrib * Math.pow(1 + growthRate, y - 1)
    fv += contrib * Math.pow(1 + posReturn, years - y + 0.5)
  }
  return fv
}

function fmtK(n) {
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`
  return `$${Math.round(n).toLocaleString()}`
}

// ─── Cache helpers ───────────────────────────────────────────────────────────

function getCached(key) {
  try {
    const item = localStorage.getItem(key)
    if (!item) return null
    const { ts, data } = JSON.parse(item)
    if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(key); return null }
    return data
  } catch { return null }
}

function setCache(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })) } catch {}
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function ScenarioLabel({ s }) {
  const cfg = {
    bull: { label: 'BULL', color: 'var(--accent-green)' },
    base: { label: 'BASE', color: 'var(--accent-amber)' },
    bear: { label: 'BEAR', color: 'var(--accent-red)' },
  }[s]
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
      style={{ backgroundColor: cfg.color + '18', color: cfg.color, fontFamily: "'JetBrains Mono', monospace" }}>
      {cfg.label}
    </span>
  )
}

function PositionCard({ pos, livePrices, isWatchlist = false, onRemove, forceOpen, forceKey }) {
  const [open, setOpen] = useState(true)
  const curr = livePrices[pos.t] ?? FALLBACK_PRICES[pos.t] ?? 0

  // Sync with external expand/collapse all
  useEffect(() => {
    if (forceKey > 0) setOpen(forceOpen)
  }, [forceKey]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rounded-lg border overflow-hidden transition-colors"
      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b cursor-pointer select-none hover:opacity-80"
        style={{ borderColor: 'var(--border)' }}
        onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3">
          <div>
            <div className="text-sm font-bold" style={{ color: 'var(--accent-cyan)', fontFamily: "'JetBrains Mono', monospace" }}>
              {pos.t}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-dim)' }}>{pos.n}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pos.a != null && (
            <span className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ backgroundColor: 'var(--accent-blue)22', color: 'var(--accent-blue)', fontFamily: "'JetBrains Mono', monospace" }}>
              {pos.a}%
            </span>
          )}
          {isWatchlist && onRemove && (
            <button onClick={e => { e.stopPropagation(); onRemove() }}
              className="p-1 rounded hover:opacity-70 transition-opacity"
              style={{ color: 'var(--text-dim)' }}>
              <X size={12} />
            </button>
          )}
          <span className="text-xs" style={{ color: 'var(--text-dim)' }}>{open ? '▾' : '▸'}</span>
        </div>
      </div>

      {open && (
        <>
          {/* Fundamentals */}
          <div className="grid grid-cols-3 gap-px border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--border)' }}>
            {pos.funds.map((v, i) => (
              <div key={i} className="px-3 py-2" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {FUND_LABELS[i]}
                </div>
                <div className="text-xs font-medium" style={{ color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {v}
                </div>
              </div>
            ))}
          </div>
          {pos.note && (
            <div className="px-3 py-1.5 text-[10px] border-b" style={{ color: 'var(--text-dim)', borderColor: 'var(--border)', fontFamily: "'JetBrains Mono', monospace" }}>
              {pos.note}
            </div>
          )}

          {/* Scenarios */}
          <div className="px-4 py-3">
            <div className="grid grid-cols-4 gap-2 mb-2 text-[10px] text-center"
              style={{ color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace" }}>
              <div></div><div>3YR</div><div>5YR</div><div>10YR</div>
            </div>
            {['bull', 'base', 'bear'].map(s => {
              const color = s === 'bull' ? 'var(--accent-green)' : s === 'base' ? 'var(--accent-amber)' : 'var(--accent-red)'
              return (
                <div key={s} className="grid grid-cols-4 gap-2 py-1.5 border-t items-center"
                  style={{ borderColor: 'var(--border)' }}>
                  <ScenarioLabel s={s} />
                  {pos.sc[s].p.map((p, i) => {
                    const upside = curr > 0 ? ((p / curr - 1) * 100).toFixed(0) : 0
                    const sign   = upside >= 0 ? '+' : ''
                    return (
                      <div key={i} className="text-center">
                        <div className="text-xs font-semibold tabular-nums" style={{ color, fontFamily: "'JetBrains Mono', monospace" }}>
                          ${p.toLocaleString()}
                        </div>
                        <div className="text-[10px] tabular-nums" style={{ color, fontFamily: "'JetBrains Mono', monospace" }}>
                          {sign}{upside}%
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Thesis */}
          <div className="px-4 pb-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs mt-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {pos.thesis.slice(0, 220)}{pos.thesis.length > 220 ? '…' : ''}
            </p>
            <div className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded border"
              style={{ color: 'var(--accent-red)', borderColor: 'var(--accent-red)44', backgroundColor: 'var(--accent-red)0a', fontFamily: "'JetBrains Mono', monospace" }}>
              ⚠ {pos.risk}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

const TABS = ['Analysis', 'Portfolio Model', 'Lookup', 'Watchlist', 'Methodology']

export function Model() {
  const { portfolio } = useData()
  const { user } = useAuth()

  // Prices
  const [prices,      setPrices]      = useState(FALLBACK_PRICES)
  const [priceStatus, setPriceStatus] = useState('idle')

  // Tab / view
  const [activeTab,  setActiveTab]  = useState('Analysis')
  const [cardView,   setCardView]   = useState(true)
  const [allOpen,    setAllOpen]    = useState(true)
  const [forceKey,   setForceKey]   = useState(0)

  const toggleAll = () => {
    const next = !allOpen
    setAllOpen(next)
    setForceKey(k => k + 1)
  }

  // Portfolio model controls
  const blueprintPos = useMemo(() => portfolio.filter(p => (p.account ?? 'Blueprint') === 'Blueprint'), [portfolio])
  const [scenario,   setScenario]   = useState('bull')
  const [horizon,    setHorizon]    = useState(10)
  const [annualDCA,  setAnnualDCA]  = useState(() =>
    Math.round(blueprintPos.reduce((s, p) => s + (p.dca_biweekly ?? 0), 0) * 26)
  )
  const [dcaGrowth,  setDcaGrowth]  = useState(0)
  const [manualPort, setManualPort] = useState(null) // null = auto from portfolio

  const startPort = useMemo(() => {
    if (manualPort != null) return manualPort
    return blueprintPos.reduce((s, p) => s + p.shares * (prices[p.ticker] ?? FALLBACK_PRICES[p.ticker] ?? p.avg_cost), 0)
  }, [blueprintPos, prices, manualPort])

  // Lookup
  const [query,         setQuery]         = useState('')
  const [lookupResult,  setLookupResult]  = useState(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError,   setLookupError]   = useState('')
  const [lookupCached,  setLookupCached]  = useState(false)

  // Watchlist
  const [watchlist,    setWatchlist]    = useState([])
  const [wlLoading,    setWlLoading]    = useState(false)
  const [savingTicker, setSavingTicker] = useState(null)

  // ── Fetch prices from Schwab ────────────────────────────────────────────────
  const fetchPrices = useCallback(async () => {
    const tickers = POSITION_DATA.map(p => p.t).join(',')
    setPriceStatus('loading')
    try {
      const res  = await fetch(`/api/schwab/quotes?tickers=${encodeURIComponent(tickers)}`)
      const data = await res.json()
      if (res.status === 401 || data.error === 'not_connected') {
        setPriceStatus('not_connected')
      } else if (!res.ok) {
        setPriceStatus('error')
      } else {
        const flat = {}
        for (const [sym, q] of Object.entries(data)) flat[sym] = q.price
        setPrices(flat)
        setPriceStatus('connected')
      }
    } catch {
      setPriceStatus('error')
    }
  }, [])

  useEffect(() => { fetchPrices() }, [fetchPrices])

  // ── Load watchlist ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    setWlLoading(true)
    supabase.from('watchlist').select('*').eq('user_id', user.id).order('added_at', { ascending: false })
      .then(({ data }) => { if (data) setWatchlist(data) })
      .finally(() => setWlLoading(false))
  }, [user])

  // ── Stock Lookup ────────────────────────────────────────────────────────────
  const handleLookup = async () => {
    const sym = query.trim().toUpperCase()
    if (!sym) return
    setLookupError('')
    setLookupResult(null)
    setLookupCached(false)

    // Check cache
    const cacheKey = `blueprint_lookup_${sym}`
    const cached   = getCached(cacheKey)
    if (cached) { setLookupResult(cached); setLookupCached(true); return }

    setLookupLoading(true)
    try {
      // 1. Get fundamentals from FMP
      const fmpRes = await fetch(`/api/fmp/fundamentals?ticker=${sym}`)
      if (!fmpRes.ok) {
        const err = await fmpRes.json().catch(() => ({}))
        if (fmpRes.status === 503) throw new Error('FMP API key not configured yet — add FMP_API_KEY to Vercel env vars.')
        if (fmpRes.status === 404) throw new Error(`Ticker "${sym}" not found on FMP.`)
        throw new Error(err.error || 'FMP request failed')
      }
      const fundamentals = await fmpRes.json()

      // 2. Get live price (FMP profile has price too; use Schwab if available)
      const livePrice = prices[sym] ?? fundamentals.price ?? 0

      // 3. AI scenario analysis
      const analyzeRes = await fetch('/api/model/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker:      sym,
          companyName: fundamentals.companyName,
          price:       livePrice,
          fundamentals,
        }),
      })
      if (!analyzeRes.ok) throw new Error('AI analysis failed')
      const { analysis } = await analyzeRes.json()

      const result = {
        t:    sym,
        n:    fundamentals.companyName ?? sym,
        a:    null,   // no target allocation for lookup stocks
        funds: analysis.funds ?? [],
        note:  analysis.note  ?? '',
        thesis: analysis.thesis ?? '',
        risk:   analysis.risk   ?? '',
        sc:     analysis.sc     ?? { bull: { p: [0,0,0] }, base: { p: [0,0,0] }, bear: { p: [0,0,0] } },
        price: livePrice,
        sector: fundamentals.sector,
      }

      setCache(cacheKey, result)
      setLookupResult(result)
    } catch (err) {
      setLookupError(err.message || 'Something went wrong')
    } finally {
      setLookupLoading(false)
    }
  }

  // ── Watchlist save / remove ─────────────────────────────────────────────────
  const saveToWatchlist = async (item) => {
    if (!user) return
    setSavingTicker(item.t)
    const { data, error } = await supabase.from('watchlist').upsert({
      user_id:      user.id,
      ticker:       item.t,
      company_name: item.n,
      analysis:     { thesis: item.thesis, risk: item.risk, note: item.note, funds: item.funds, sc: item.sc },
      price_at_add: item.price ?? null,
    }, { onConflict: 'user_id,ticker' }).select().single()
    if (!error && data) {
      setWatchlist(prev => {
        const exists = prev.find(w => w.ticker === item.t)
        return exists ? prev.map(w => w.ticker === item.t ? data : w) : [data, ...prev]
      })
    }
    setSavingTicker(null)
  }

  const removeFromWatchlist = async (ticker) => {
    if (!user) return
    await supabase.from('watchlist').delete().eq('user_id', user.id).eq('ticker', ticker)
    setWatchlist(prev => prev.filter(w => w.ticker !== ticker))
  }

  const isInWatchlist = (ticker) => watchlist.some(w => w.ticker === ticker)

  // ── Portfolio model computation ─────────────────────────────────────────────
  const portfolioRows = useMemo(() => {
    return POSITION_DATA.map(pos => {
      const curr      = prices[pos.t] ?? FALLBACK_PRICES[pos.t] ?? 0
      const target    = interpolatePrice(pos.t, scenario, horizon, prices)
      const ret       = curr > 0 ? ((target / curr - 1) * 100) : 0
      const posAlloc  = pos.a / 100
      const startVal  = startPort * posAlloc
      const projStart = startVal * (curr > 0 ? target / curr : 1)
      const ar        = annualReturn(pos.t, scenario, horizon, prices)
      const dcaVal    = dcaFV(annualDCA * posAlloc, ar, horizon, dcaGrowth / 100)
      const total     = projStart + dcaVal
      return { ...pos, curr, target, ret, startVal, projStart, dcaVal, total }
    })
  }, [prices, scenario, horizon, startPort, annualDCA, dcaGrowth])

  const portTotals = useMemo(() => {
    const totStart = portfolioRows.reduce((s, r) => s + r.startVal,  0)
    const totProj  = portfolioRows.reduce((s, r) => s + r.projStart, 0)
    const totDca   = portfolioRows.reduce((s, r) => s + r.dcaVal,    0)
    const totTotal = portfolioRows.reduce((s, r) => s + r.total,     0)
    const totRet   = totStart > 0 ? ((totTotal / totStart - 1) * 100) : 0
    let   totalInvested = 0
    for (let y = 1; y <= horizon; y++) totalInvested += annualDCA * Math.pow(1 + dcaGrowth / 100, y - 1)
    const multiple = startPort > 0 ? (totTotal / startPort).toFixed(1) : '—'
    return { totStart, totProj, totDca, totTotal, totRet, totalInvested, multiple }
  }, [portfolioRows, horizon, annualDCA, dcaGrowth, startPort])

  const snapProjections = useMemo(() => {
    const hors = [3, 5, 10].includes(horizon) ? [3, 5, 10] : [3, 5, 10, horizon]
    return hors.map(h => {
      const scenarios = ['bull', 'base', 'bear'].map(s => {
        let tot = 0
        POSITION_DATA.forEach(pos => {
          const alloc = pos.a / 100
          const sv    = startPort * alloc
          const curr  = prices[pos.t] ?? FALLBACK_PRICES[pos.t] ?? 0
          const tgt   = interpolatePrice(pos.t, s, h, prices)
          const ar    = annualReturn(pos.t, s, h, prices)
          const dv    = dcaFV(annualDCA * alloc, ar, h, dcaGrowth / 100)
          tot += curr > 0 ? sv * (tgt / curr) + dv : sv + dv
        })
        return { s, tot }
      })
      let inv = 0
      for (let y = 1; y <= h; y++) inv += annualDCA * Math.pow(1 + dcaGrowth / 100, y - 1)
      return { h, scenarios, totalInvested: startPort + inv }
    })
  }, [prices, scenario, horizon, startPort, annualDCA, dcaGrowth])

  const scColor = scenario === 'bull' ? 'var(--accent-green)' : scenario === 'base' ? 'var(--accent-amber)' : 'var(--accent-red)'

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4">

      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Portfolio Model</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
            13 positions · April 2026 · Fundamental scenario analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          {priceStatus === 'not_connected' && (
            <a href="/api/schwab/auth"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium"
              style={{ backgroundColor: 'var(--accent-amber)', color: '#0a0e1a' }}>
              <WifiOff size={12} /> Connect Schwab
            </a>
          )}
          {priceStatus === 'connected' && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded text-xs border"
              style={{ color: 'var(--accent-green)', borderColor: 'var(--accent-green)44' }}>
              <Wifi size={11} /> Live
              <button onClick={fetchPrices} className="ml-1 hover:opacity-70"><RefreshCw size={10} /></button>
            </div>
          )}
          {priceStatus === 'loading' && (
            <span className="text-xs" style={{ color: 'var(--text-dim)' }}>Fetching prices…</span>
          )}
          {priceStatus === 'idle' && (
            <span className="text-xs" style={{ color: 'var(--text-dim)' }}>Fallback prices</span>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-4 py-2 text-xs font-medium whitespace-nowrap border-b-2 -mb-px transition-colors"
            style={{
              color:       activeTab === tab ? 'var(--accent-cyan)' : 'var(--text-dim)',
              borderColor: activeTab === tab ? 'var(--accent-cyan)' : 'transparent',
            }}>
            {tab}
            {tab === 'Watchlist' && watchlist.length > 0 && (
              <span className="ml-1.5 px-1 py-0.5 rounded text-[9px]"
                style={{ backgroundColor: 'var(--accent-blue)22', color: 'var(--accent-blue)' }}>
                {watchlist.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Analysis tab ─────────────────────────────────────────────────── */}
      {activeTab === 'Analysis' && (
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
              {POSITION_DATA.length} positions
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleAll}
                className="px-2.5 py-1.5 rounded text-xs border transition-colors"
                style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
                {allOpen ? 'Collapse All' : 'Expand All'}
              </button>
              <button
                onClick={() => setCardView(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs border transition-colors"
                style={{
                  backgroundColor: cardView ? 'var(--accent-blue)22' : 'transparent',
                  borderColor:     cardView ? 'var(--accent-blue)' : 'var(--border)',
                  color:           cardView ? 'var(--accent-blue)' : 'var(--text-dim)',
                }}>
                <LayoutGrid size={11} /> Cards
              </button>
              <button
                onClick={() => setCardView(false)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs border transition-colors"
                style={{
                  backgroundColor: !cardView ? 'var(--accent-blue)22' : 'transparent',
                  borderColor:     !cardView ? 'var(--accent-blue)' : 'var(--border)',
                  color:           !cardView ? 'var(--accent-blue)' : 'var(--text-dim)',
                }}>
                <List size={11} /> List
              </button>
            </div>
          </div>

          {cardView ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {POSITION_DATA.map(pos => (
                <PositionCard key={pos.t} pos={pos} livePrices={prices} forceOpen={allOpen} forceKey={forceKey} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-dim)' }}>
                      <th className="text-left px-4 py-2 font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Ticker</th>
                      <th className="text-right px-4 py-2 font-medium">Alloc</th>
                      <th className="text-right px-4 py-2 font-medium">Price</th>
                      {['Bull 5yr','Base 5yr','Bear 5yr','Bull 10yr','Base 10yr','Bear 10yr'].map(h => (
                        <th key={h} className="text-right px-3 py-2 font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {POSITION_DATA.map(pos => {
                      const curr = prices[pos.t] ?? FALLBACK_PRICES[pos.t] ?? 0
                      const pct  = p => curr > 0 ? ((p / curr - 1) * 100).toFixed(0) : 0
                      const fmt  = (p, color) => (
                        <td key={p} className="px-3 py-2 text-right tabular-nums whitespace-nowrap"
                          style={{ color, fontFamily: "'JetBrains Mono', monospace" }}>
                          ${p.toLocaleString()}
                          <span className="text-[10px] ml-1">({pct(p) >= 0 ? '+' : ''}{pct(p)}%)</span>
                        </td>
                      )
                      return (
                        <tr key={pos.t} className="border-t" style={{ borderColor: 'var(--border)' }}>
                          <td className="px-4 py-2.5 font-bold" style={{ color: 'var(--accent-cyan)', fontFamily: "'JetBrains Mono', monospace" }}>
                            {pos.t}
                            <div className="text-[10px] font-normal" style={{ color: 'var(--text-dim)' }}>{pos.n}</div>
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: 'var(--accent-blue)', fontFamily: "'JetBrains Mono', monospace" }}>
                            {pos.a}%
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                            ${curr.toFixed(2)}
                          </td>
                          {fmt(pos.sc.bull.p[1], 'var(--accent-green)')}
                          {fmt(pos.sc.base.p[1], 'var(--accent-amber)')}
                          {fmt(pos.sc.bear.p[1], 'var(--accent-red)')}
                          {fmt(pos.sc.bull.p[2], 'var(--accent-green)')}
                          {fmt(pos.sc.base.p[2], 'var(--accent-amber)')}
                          {fmt(pos.sc.bear.p[2], 'var(--accent-red)')}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Portfolio Model tab ───────────────────────────────────────────── */}
      {activeTab === 'Portfolio Model' && (
        <div className="space-y-5">
          {/* Controls */}
          <div className="rounded-lg border p-4 flex flex-wrap gap-6 items-end"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            {/* Scenario */}
            <div>
              <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace" }}>
                Scenario
              </div>
              <div className="flex gap-2">
                {[['bull','BULL','var(--accent-green)'],['base','BASE','var(--accent-amber)'],['bear','BEAR','var(--accent-red)']].map(([s,label,color]) => (
                  <button key={s} onClick={() => setScenario(s)}
                    className="px-3 py-1.5 rounded text-xs font-semibold border transition-all"
                    style={{
                      color:           scenario === s ? color : 'var(--text-dim)',
                      borderColor:     scenario === s ? color : 'var(--border)',
                      backgroundColor: scenario === s ? color + '18' : 'transparent',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Horizon */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace" }}>
                Horizon (years)
              </label>
              <div className="flex items-center gap-2">
                <input type="number" value={horizon} min="1" max="30"
                  onChange={e => setHorizon(Math.max(1, Math.min(30, parseInt(e.target.value) || 10)))}
                  className="w-20 text-sm px-2 py-1.5 rounded border outline-none text-right tabular-nums"
                  style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }} />
                <span className="text-xs" style={{ color: 'var(--text-dim)' }}>yrs</span>
              </div>
            </div>

            {/* Annual DCA */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace" }}>
                Annual DCA
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--text-dim)' }}>$</span>
                <input type="number" value={annualDCA} min="0"
                  onChange={e => setAnnualDCA(parseFloat(e.target.value) || 0)}
                  className="w-24 text-sm px-2 py-1.5 rounded border outline-none text-right tabular-nums"
                  style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }} />
              </div>
            </div>

            {/* Starting portfolio */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace" }}>
                Starting Value
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--text-dim)' }}>$</span>
                <input type="number" value={Math.round(startPort)} min="0"
                  onChange={e => setManualPort(parseFloat(e.target.value) || 0)}
                  className="w-28 text-sm px-2 py-1.5 rounded border outline-none text-right tabular-nums"
                  style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }} />
                {manualPort != null && (
                  <button onClick={() => setManualPort(null)}
                    className="text-[10px] hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--accent-cyan)' }}>
                    reset
                  </button>
                )}
              </div>
              {manualPort == null && (
                <div className="text-[10px] mt-1" style={{ color: 'var(--text-dim)' }}>
                  auto · {priceStatus === 'connected' ? 'live prices' : 'fallback prices'}
                </div>
              )}
            </div>

            {/* DCA growth */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace" }}>
                DCA Growth/yr
              </label>
              <div className="flex items-center gap-2">
                <input type="number" value={dcaGrowth} min="0" max="50" step="1"
                  onChange={e => setDcaGrowth(parseFloat(e.target.value) || 0)}
                  className="w-20 text-sm px-2 py-1.5 rounded border outline-none text-right tabular-nums"
                  style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }} />
                <span className="text-xs" style={{ color: 'var(--text-dim)' }}>%</span>
              </div>
            </div>
          </div>

          {/* Stat boxes */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Starting Value',    value: fmtK(startPort),                          sub: 'current portfolio' },
              { label: 'Total DCA',         value: fmtK(portTotals.totalInvested),            sub: dcaGrowth > 0 ? `+${dcaGrowth}%/yr growth` : `$${Math.round(annualDCA/12).toLocaleString()}/mo` },
              { label: 'Projected Total',   value: fmtK(portTotals.totTotal),                 sub: `${scenario} case, ${horizon}yr`, color: scColor },
              { label: 'Portfolio Multiple',value: portTotals.multiple + '×',                 sub: 'vs starting value', color: scColor },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="rounded-lg border p-4"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {label}
                </div>
                <div className="text-xl font-bold tabular-nums" style={{ color: color ?? 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                  <Private>{value}</Private>
                </div>
                <div className="text-[11px] mt-1" style={{ color: 'var(--text-dim)' }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Projection table */}
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <div className="px-4 py-2.5 border-b text-[10px] font-semibold uppercase tracking-wider"
              style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border)', color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace" }}>
              Position Breakdown — {scenario.toUpperCase()} · {horizon}yr
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-dim)' }}>
                    {['Ticker','Alloc','Price','Target','Return','Start $','Proj (price)','+DCA Value','Total'].map(h => (
                      <th key={h} className={`px-3 py-2 font-medium ${h==='Ticker'?'text-left':'text-right'}`}
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {portfolioRows.map(r => {
                    const sign = r.ret >= 0 ? '+' : ''
                    return (
                      <tr key={r.t} className="border-t" style={{ borderColor: 'var(--border)' }}>
                        <td className="px-3 py-2.5 font-bold" style={{ color: 'var(--accent-cyan)', fontFamily: "'JetBrains Mono', monospace" }}>{r.t}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>{r.a}%</td>
                        <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>${r.curr.toFixed(2)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: scColor, fontFamily: "'JetBrains Mono', monospace" }}>${Math.round(r.target).toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: scColor, fontFamily: "'JetBrains Mono', monospace" }}>{sign}{r.ret.toFixed(1)}%</td>
                        <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}><Private>${Math.round(r.startVal).toLocaleString()}</Private></td>
                        <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: scColor, fontFamily: "'JetBrains Mono', monospace" }}><Private>${Math.round(r.projStart).toLocaleString()}</Private></td>
                        <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: scColor, fontFamily: "'JetBrains Mono', monospace" }}><Private>+${Math.round(r.dcaVal).toLocaleString()}</Private></td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-semibold" style={{ color: scColor, fontFamily: "'JetBrains Mono', monospace" }}><Private>${Math.round(r.total).toLocaleString()}</Private></td>
                      </tr>
                    )
                  })}
                  <tr className="border-t-2 font-semibold" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-3 py-2.5" style={{ color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>TOTAL</td>
                    <td className="px-3 py-2.5 text-right" style={{ color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace" }}>100%</td>
                    <td className="px-3 py-2.5 text-right" style={{ color: 'var(--text-dim)' }}>—</td>
                    <td className="px-3 py-2.5 text-right" style={{ color: 'var(--text-dim)' }}>—</td>
                    <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: scColor, fontFamily: "'JetBrains Mono', monospace" }}>
                      {portTotals.totRet >= 0 ? '+' : ''}{portTotals.totRet.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}><Private>${Math.round(portTotals.totStart).toLocaleString()}</Private></td>
                    <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: scColor, fontFamily: "'JetBrains Mono', monospace" }}><Private>${Math.round(portTotals.totProj).toLocaleString()}</Private></td>
                    <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: scColor, fontFamily: "'JetBrains Mono', monospace" }}><Private>+${Math.round(portTotals.totDca).toLocaleString()}</Private></td>
                    <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: scColor, fontFamily: "'JetBrains Mono', monospace" }}><Private>${Math.round(portTotals.totTotal).toLocaleString()}</Private></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Snapshot projections */}
          <div className={`grid gap-3 ${snapProjections.length === 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3'}`}>
            {snapProjections.map(({ h, scenarios, totalInvested }) => (
              <div key={h} className="rounded-lg border p-4" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                <div className="text-[10px] uppercase tracking-wider mb-3" style={{ color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {h}-Year (incl. DCA)
                </div>
                {scenarios.map(({ s, tot }) => {
                  const color = s === 'bull' ? 'var(--accent-green)' : s === 'base' ? 'var(--accent-amber)' : 'var(--accent-red)'
                  return (
                    <div key={s} className="flex justify-between items-center mb-1.5">
                      <span className="text-xs capitalize" style={{ color }}>{s}</span>
                      <span className="text-sm font-semibold tabular-nums" style={{ color, fontFamily: "'JetBrains Mono', monospace" }}>
                        <Private>{fmtK(tot)}</Private>
                      </span>
                    </div>
                  )
                })}
                <div className="text-[10px] mt-2 pt-2 border-t" style={{ color: 'var(--text-dim)', borderColor: 'var(--border)', fontFamily: "'JetBrains Mono', monospace" }}>
                  Total invested: <Private>{fmtK(totalInvested)}</Private>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace" }}>
            ⚠ Model is for planning purposes only. Not financial advice. Price targets derived from fundamental extrapolation — actual results will differ materially.
          </p>
        </div>
      )}

      {/* ── Stock Lookup tab ──────────────────────────────────────────────── */}
      {activeTab === 'Lookup' && (
        <div className="space-y-5">
          <div className="rounded-lg border p-5" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
              Search any ticker. Claude analyzes the fundamentals using the same 3-driver framework (Revenue CAGR → FCF Margin → Exit Multiple) and generates Bull/Base/Bear scenarios.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1 max-w-xs">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && !lookupLoading && handleLookup()}
                  placeholder="AAPL"
                  className="w-full pl-8 pr-3 py-2 rounded border outline-none text-sm uppercase"
                  style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}
                />
              </div>
              <button
                onClick={handleLookup}
                disabled={lookupLoading || !query.trim()}
                className="px-4 py-2 rounded text-sm font-medium transition-opacity"
                style={{ backgroundColor: 'var(--accent-blue)', color: 'white', opacity: (lookupLoading || !query.trim()) ? 0.6 : 1 }}>
                {lookupLoading ? <Loader2 size={14} className="animate-spin" /> : 'Analyze'}
              </button>
            </div>
            {lookupCached && (
              <p className="text-[11px] mt-2" style={{ color: 'var(--text-dim)' }}>
                Cached result · refreshes in 24hrs
              </p>
            )}
            {lookupError && (
              <div className="flex items-start gap-2 mt-3 p-3 rounded border"
                style={{ backgroundColor: 'var(--accent-amber)0a', borderColor: 'var(--accent-amber)44' }}>
                <AlertCircle size={14} style={{ color: 'var(--accent-amber)', flexShrink: 0, marginTop: 1 }} />
                <p className="text-xs" style={{ color: 'var(--accent-amber)' }}>{lookupError}</p>
              </div>
            )}
          </div>

          {lookupLoading && (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Fetching fundamentals + generating scenarios…</p>
              <p className="text-xs" style={{ color: 'var(--text-dim)' }}>This takes 5–10 seconds</p>
            </div>
          )}

          {lookupResult && !lookupLoading && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
                  AI-generated · {lookupResult.sector ?? 'Unknown sector'}
                </span>
                {user ? (
                  <button
                    onClick={() => isInWatchlist(lookupResult.t) ? removeFromWatchlist(lookupResult.t) : saveToWatchlist(lookupResult)}
                    disabled={savingTicker === lookupResult.t}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border transition-opacity hover:opacity-80"
                    style={{
                      color:           isInWatchlist(lookupResult.t) ? 'var(--accent-green)' : 'var(--text-secondary)',
                      borderColor:     isInWatchlist(lookupResult.t) ? 'var(--accent-green)44' : 'var(--border)',
                      backgroundColor: isInWatchlist(lookupResult.t) ? 'var(--accent-green)0a' : 'transparent',
                    }}>
                    {isInWatchlist(lookupResult.t)
                      ? <><BookmarkCheck size={12} /> Saved</>
                      : <><BookmarkPlus size={12} /> Save to Watchlist</>}
                  </button>
                ) : (
                  <span className="text-xs" style={{ color: 'var(--text-dim)' }}>Sign in to save</span>
                )}
              </div>
              <div className="max-w-sm">
                <PositionCard pos={lookupResult} livePrices={{ [lookupResult.t]: lookupResult.price }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Watchlist tab ─────────────────────────────────────────────────── */}
      {activeTab === 'Watchlist' && (
        <div className="space-y-4">
          {!user && (
            <div className="rounded-lg border p-8 text-center" style={{ borderColor: 'var(--border)' }}>
              <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Sign in to save and view your watchlist</p>
            </div>
          )}
          {user && wlLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-dim)' }} />
            </div>
          )}
          {user && !wlLoading && watchlist.length === 0 && (
            <div className="rounded-lg border p-8 text-center" style={{ borderColor: 'var(--border)' }}>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No saved stocks yet</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                Use the Lookup tab to analyze any ticker, then save it here
              </p>
            </div>
          )}
          {user && !wlLoading && watchlist.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {watchlist.map(item => {
                const pos = {
                  t:      item.ticker,
                  n:      item.company_name ?? item.ticker,
                  a:      null,
                  funds:  item.analysis?.funds  ?? [],
                  note:   item.analysis?.note   ?? '',
                  thesis: item.analysis?.thesis ?? '',
                  risk:   item.analysis?.risk   ?? '',
                  sc:     item.analysis?.sc     ?? { bull:{p:[0,0,0]}, base:{p:[0,0,0]}, bear:{p:[0,0,0]} },
                  price:  item.price_at_add,
                }
                const lp = prices[item.ticker]
                  ? { [item.ticker]: prices[item.ticker] }
                  : { [item.ticker]: item.price_at_add ?? 0 }
                return (
                  <div key={item.id}>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className="text-[10px]" style={{ color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace" }}>
                        Added {new Date(item.added_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
                        {item.price_at_add ? ` · $${item.price_at_add} at save` : ''}
                      </span>
                    </div>
                    <PositionCard pos={pos} livePrices={lp} isWatchlist
                      onRemove={() => removeFromWatchlist(item.ticker)} />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Methodology tab ───────────────────────────────────────────────── */}
      {activeTab === 'Methodology' && (
        <div className="space-y-4 max-w-3xl">
          {[
            {
              title: 'Framework: Fundamental Scenario Analysis',
              body: `Each position is modeled using three internally consistent scenarios. Unlike Monte Carlo (which uses historical price volatility) or analyst consensus (which extrapolates near-term estimates), this approach changes multiple business drivers simultaneously to tell coherent stories about alternative futures.\n\nEvery scenario changes all three drivers together — a bear case isn't just a lower price target, it's a coherent story where growth slows, margins compress, and the market re-rates the multiple.`,
              items: [
                { title: 'Driver 1 — Revenue CAGR', body: 'Derived from current growth rate, TAM size, competitive position, and historical precedent at similar scale. Not extrapolated from analyst estimates.' },
                { title: 'Driver 2 — FCF Margin', body: 'Where free cash flow margins go as the business scales. Capital-light models expand naturally; capex-heavy cycles show compression then recovery.' },
                { title: 'Driver 3 — Exit Multiple', body: 'P/FCF the market pays at horizon end. Verified against each company\'s historical average range. Bull = expansion; Bear = compression.' },
              ]
            },
            {
              title: 'Macro Treatment',
              body: null,
              items: [
                { title: 'Base case', body: 'Neutral macro. No recession, stable rates, continued AI capex cycle. Company performance at current trajectory.' },
                { title: 'Bull case', body: 'Favorable macro. Soft landing holds, AI investment accelerates, no major regulatory disruption. Companies capture TAM faster.' },
                { title: 'Bear case', body: 'Mild macro headwind. 12–18 month slowdown, enterprise spending caution, multiple compression. Thesis intact but execution delayed ~18–24 months. NOT a recession scenario.' },
              ]
            },
            {
              title: 'DCA Model',
              body: `Annual contributions are distributed proportionally by target allocation weight and compounded at each position's scenario-implied annual return rate. Mid-year entry is assumed for conservatism (half-year compounding in year 1). Starting portfolio compounds separately from new contributions.\n\nThe DCA input reflects your actual current program ($294/biweekly = $7,644/yr). Use it to model what happens if you increase contributions as income grows.`,
              items: []
            },
          ].map(({ title, body, items }) => (
            <div key={title} className="rounded-lg border p-5" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{title}</h3>
              {body && body.split('\n\n').map((p, i) => (
                <p key={i} className="text-sm mb-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{p}</p>
              ))}
              {items.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                  {items.map(({ title: t, body: b }) => (
                    <div key={t} className="rounded p-3 border" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}>
                      <div className="text-[10px] uppercase tracking-wider mb-2 font-semibold" style={{ color: 'var(--accent-blue)', fontFamily: "'JetBrains Mono', monospace" }}>
                        {t}
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>{b}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
