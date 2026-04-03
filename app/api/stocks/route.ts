import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TICKERS = ['NVDA', 'AVGO', 'AMZN', 'GOOGL', 'VST', 'XOM', 'CVX', 'CEG', 'KNF', 'IRDM']

const BUCKETS: Record<string, string> = {
  NVDA: 'AI Core', AVGO: 'AI Core', AMZN: 'AI Core',
  GOOGL: 'AI Core', VST: 'AI Core',
  XOM: 'Energy', CVX: 'Energy',
  CEG: 'Nuclear',
  KNF: 'Obscure', IRDM: 'Obscure',
}

const DIP_TRIGGERS: Record<string, number> = {
  NVDA: 174, AVGO: 309, AMZN: 201, VST: 154, GOOGL: 291,
}

const TARGET_ALLOCATIONS: Record<string, number> = {
  'AI Core': 76, 'Energy': 13, 'Nuclear': 4, 'Obscure': 7,
}

async function fetchPrices(): Promise<Record<string, { price: number; change: number; changePct: number }>> {
  const apiKey = process.env.FINNHUB_API_KEY
  const results: Record<string, { price: number; change: number; changePct: number }> = {}

  await Promise.all(TICKERS.map(async ticker => {
    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`
      )
      const data = await res.json()
      results[ticker] = {
        price: data.c ?? 0,
        change: data.d ?? 0,
        changePct: data.dp ?? 0,
      }
    } catch {
      results[ticker] = { price: 0, change: 0, changePct: 0 }
    }
  }))

  return results
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const refresh = new URL(req.url).searchParams.get('refresh') === 'true'

  // Check cache first (prices updated within last 5 minutes)
  const { data: cachedPrices } = await supabase
    .from('stock_prices')
    .select('*')
    .in('ticker', TICKERS)

  const cacheAge = cachedPrices?.[0]?.updated_at
    ? (Date.now() - new Date(cachedPrices[0].updated_at).getTime()) / 1000 / 60
    : 999

  let prices: Record<string, { price: number; change: number; changePct: number }> = {}

  if (!refresh && cacheAge < 5 && cachedPrices?.length === TICKERS.length) {
    // Use cache
    for (const p of cachedPrices) {
      prices[p.ticker] = { price: p.current_price, change: p.daily_change, changePct: p.daily_change_pct }
    }
  } else {
    // Fetch fresh prices
    prices = await fetchPrices()

    // Update cache
    await supabase.from('stock_prices').upsert(
      Object.entries(prices).map(([ticker, data]) => ({
        ticker,
        current_price: data.price,
        daily_change: data.change,
        daily_change_pct: data.changePct,
        updated_at: new Date().toISOString(),
      }))
    )
  }

  // Get positions
  const { data: positions } = await supabase
    .from('stock_positions')
    .select('*')
    .eq('user_id', user.id)

  // Get war chest
  const { data: warChest } = await supabase
    .from('war_chest')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // Build holdings
  const holdings = TICKERS.map(ticker => {
    const position = positions?.find(p => p.ticker === ticker)
    const price = prices[ticker] ?? { price: 0, change: 0, changePct: 0 }
    const shares = position?.shares ?? 0
    const costBasis = position?.cost_basis ?? 0
    const currentValue = shares * price.price
    const totalCost = shares * costBasis
    const gainLoss = currentValue - totalCost
    const gainLossPct = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0

    return {
      ticker,
      bucket: BUCKETS[ticker],
      shares,
      costBasis,
      currentPrice: price.price,
      dailyChange: price.change,
      dailyChangePct: price.changePct,
      currentValue,
      gainLoss,
      gainLossPct,
      dipTrigger: DIP_TRIGGERS[ticker] ?? null,
      atDip: DIP_TRIGGERS[ticker] ? price.price <= DIP_TRIGGERS[ticker] : false,
    }
  })

  // Calculate allocations
  const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0)
  const bucketValues: Record<string, number> = {}
  for (const h of holdings) {
    bucketValues[h.bucket] = (bucketValues[h.bucket] ?? 0) + h.currentValue
  }
  const allocations = Object.entries(TARGET_ALLOCATIONS).map(([bucket, target]) => ({
    bucket,
    target,
    current: totalValue > 0 ? (bucketValues[bucket] ?? 0) / totalValue * 100 : 0,
    value: bucketValues[bucket] ?? 0,
  }))

  return NextResponse.json({
    holdings,
    allocations,
    totalValue,
    totalGainLoss: holdings.reduce((s, h) => s + h.gainLoss, 0),
    warChest: warChest?.available_cash ?? 0,
    pricesUpdatedAt: cachedPrices?.[0]?.updated_at ?? new Date().toISOString(),
  })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, ticker, shares, cost_basis, war_chest } = await req.json()

  if (type === 'position') {
    const { error } = await supabase
      .from('stock_positions')
      .upsert({ user_id: user.id, ticker, shares, cost_basis, bucket: BUCKETS[ticker], updated_at: new Date().toISOString() },
        { onConflict: 'user_id,ticker' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (type === 'war_chest') {
    const { error } = await supabase
      .from('war_chest')
      .upsert({ user_id: user.id, available_cash: war_chest, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}