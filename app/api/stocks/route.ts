import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ─── Finnhub price fetch ─────────────────────────────────────
async function fetchPolygonPrices(tickers: string[]): Promise<Record<string, { price: number; change: number; changePct: number }>> {
  const apiKey = process.env.FINNHUB_API_KEY
  if (!apiKey || !tickers.length) return {}

  const results: Record<string, { price: number; change: number; changePct: number }> = {}

  await Promise.all(tickers.map(async ticker => {
    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`,
        { signal: AbortSignal.timeout(6000) }
      )
      const data = await res.json()
      if (data.c && data.c > 0) {
        results[ticker] = { price: data.c, change: data.d ?? 0, changePct: data.dp ?? 0 }
      }
    } catch (e) {
      console.error(`Finnhub price error for ${ticker}:`, e)
    }
  }))

  return results
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const refresh = new URL(req.url).searchParams.get('refresh') === 'true'

  const { data: positions } = await supabase
    .from('stock_positions')
    .select('*')
    .eq('user_id', user.id)

  const tickers = (positions ?? []).map((p: any) => p.ticker)

  const { data: warChest } = await supabase
    .from('war_chest')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!tickers.length) {
    return NextResponse.json({
      holdings: [], allocations: [], totalValue: 0, totalGainLoss: 0,
      warChest: warChest?.available_cash ?? 0, pricesUpdatedAt: null,
    })
  }

  // Read cached prices — filter out any with price = 0 (invalid)
  const { data: cachedPrices } = await supabase
    .from('stock_prices')
    .select('*')
    .in('ticker', tickers)

  const validCache = (cachedPrices ?? []).filter((p: any) => p.current_price > 0)
  const cachedMap: Record<string, any> = {}
  for (const p of validCache) cachedMap[p.ticker] = p

  const cacheAge = validCache[0]?.updated_at
    ? (Date.now() - new Date(validCache[0].updated_at).getTime()) / 1000 / 60
    : 999

  const tickersNeedingFetch = refresh
    ? tickers
    : cacheAge >= 5
      ? tickers
      : tickers.filter(t => !cachedMap[t])

  const prices: Record<string, { price: number; change: number; changePct: number }> = {}

  // Seed with valid cache first
  for (const [ticker, p] of Object.entries(cachedMap)) {
    prices[ticker] = { price: p.current_price, change: p.daily_change, changePct: p.daily_change_pct }
  }

  // Fetch live prices for missing/stale tickers via Polygon
  if (tickersNeedingFetch.length > 0) {
    const freshPrices = await fetchPolygonPrices(tickersNeedingFetch)

    if (Object.keys(freshPrices).length > 0) {
      await supabase.from('stock_prices').upsert(
        Object.entries(freshPrices).map(([ticker, data]) => ({
          ticker,
          current_price: data.price,
          daily_change: data.change,
          daily_change_pct: data.changePct,
          updated_at: new Date().toISOString(),
        }))
      )
    }

    for (const [ticker, data] of Object.entries(freshPrices)) {
      prices[ticker] = data
    }
  }

  // Fetch 30-day price history for sparklines from price_history table
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const { data: priceHistory } = await supabase
    .from('price_history')
    .select('ticker, date, close')
    .in('ticker', tickers)
    .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: true })

  // Group history by ticker
  const historyByTicker: Record<string, number[]> = {}
  for (const row of priceHistory ?? []) {
    if (!historyByTicker[row.ticker]) historyByTicker[row.ticker] = []
    historyByTicker[row.ticker].push(row.close)
  }

  const holdings = (positions ?? []).map((pos: any) => {
    const price = prices[pos.ticker] ?? { price: 0, change: 0, changePct: 0 }
    const currentValue = pos.shares * price.price
    const totalCost = pos.cost_basis ?? 0
    const gainLoss = currentValue - totalCost
    const gainLossPct = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0

    // Use real history if available, else fall back to flat line
    const history = historyByTicker[pos.ticker]
    const sparklineData = history && history.length >= 2
      ? history
      : price.price > 0
        ? [price.price, price.price]
        : []

    return {
      ticker: pos.ticker,
      bucket: pos.bucket ?? 'Other',
      shares: pos.shares ?? 0,
      costBasis: pos.cost_basis ?? 0,
      currentPrice: price.price,
      dailyChange: price.change,
      dailyChangePct: price.changePct,
      currentValue,
      gainLoss,
      gainLossPct,
      dipTrigger: pos.dip_trigger ?? null,
      atDip: pos.dip_trigger ? price.price <= pos.dip_trigger : false,
      targetAllocation: pos.target_allocation ?? null,
      sparkline: sparklineData,
    }
  })

  const totalValue = holdings.reduce((s: number, h: any) => s + h.currentValue, 0)
  const bucketMap: Record<string, { value: number; target: number }> = {}
  for (const h of holdings) {
    if (!bucketMap[h.bucket]) bucketMap[h.bucket] = { value: 0, target: 0 }
    bucketMap[h.bucket].value += h.currentValue
    if (h.targetAllocation) bucketMap[h.bucket].target = h.targetAllocation
  }
  const allocations = Object.entries(bucketMap).map(([bucket, { value, target }]) => ({
    bucket, target,
    current: totalValue > 0 ? (value / totalValue) * 100 : 0,
    value,
  }))

  return NextResponse.json({
    holdings,
    allocations,
    totalValue,
    totalGainLoss: holdings.reduce((s: number, h: any) => s + h.gainLoss, 0),
    warChest: warChest?.available_cash ?? 0,
    pricesUpdatedAt: new Date().toISOString(),
  })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, ticker, shares, cost_basis, bucket, dip_trigger, target_allocation, war_chest } = await req.json()

  if (type === 'position') {
    if (!ticker) return NextResponse.json({ error: 'Ticker required' }, { status: 400 })
    const { error } = await supabase
      .from('stock_positions')
      .upsert({
        user_id: user.id,
        ticker: ticker.toUpperCase(),
        shares: shares ?? 0,
        cost_basis: cost_basis ?? 0,
        bucket: bucket ?? 'Other',
        dip_trigger: dip_trigger ?? null,
        target_allocation: target_allocation ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,ticker' })
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

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ticker = new URL(req.url).searchParams.get('ticker')
  if (!ticker) return NextResponse.json({ error: 'Ticker required' }, { status: 400 })

  const { error } = await supabase
    .from('stock_positions')
    .delete()
    .eq('user_id', user.id)
    .eq('ticker', ticker.toUpperCase())

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
