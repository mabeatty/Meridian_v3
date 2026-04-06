import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function fetchPrices(tickers: string[]): Promise<Record<string, { price: number; change: number; changePct: number }>> {
  const apiKey = process.env.FINNHUB_API_KEY
  const results: Record<string, { price: number; change: number; changePct: number }> = {}
  await Promise.all(tickers.map(async ticker => {
    try {
      const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`)
      const data = await res.json()
      results[ticker] = { price: data.c ?? 0, change: data.d ?? 0, changePct: data.dp ?? 0 }
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

  // Get user's positions (source of truth for which tickers exist)
  const { data: positions } = await supabase
    .from('stock_positions')
    .select('*')
    .eq('user_id', user.id)

  const tickers = (positions ?? []).map((p: any) => p.ticker)

  // Get war chest
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

  // Check price cache
  const { data: cachedPrices } = await supabase
    .from('stock_prices')
    .select('*')
    .in('ticker', tickers)

  const cacheAge = cachedPrices?.[0]?.updated_at
    ? (Date.now() - new Date(cachedPrices[0].updated_at).getTime()) / 1000 / 60
    : 999

  let prices: Record<string, { price: number; change: number; changePct: number }> = {}

  if (!refresh && cacheAge < 5 && cachedPrices?.length === tickers.length) {
    for (const p of cachedPrices) {
      prices[p.ticker] = { price: p.current_price, change: p.daily_change, changePct: p.daily_change_pct }
    }
  } else {
    prices = await fetchPrices(tickers)
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

  // Build holdings from positions
  const holdings = (positions ?? []).map((pos: any) => {
    const price = prices[pos.ticker] ?? { price: 0, change: 0, changePct: 0 }
    const currentValue = pos.shares * price.price
    const totalCost = pos.shares * (pos.cost_basis ?? 0)
    const gainLoss = currentValue - totalCost
    const gainLossPct = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0
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
    }
  })

  // Calculate allocations by bucket
  const totalValue = holdings.reduce((s: number, h: any) => s + h.currentValue, 0)
  const bucketMap: Record<string, { value: number; target: number }> = {}
  for (const h of holdings) {
    if (!bucketMap[h.bucket]) bucketMap[h.bucket] = { value: 0, target: 0 }
    bucketMap[h.bucket].value += h.currentValue
    if (h.targetAllocation) bucketMap[h.bucket].target = h.targetAllocation
  }
  const allocations = Object.entries(bucketMap).map(([bucket, { value, target }]) => ({
    bucket,
    target,
    current: totalValue > 0 ? (value / totalValue) * 100 : 0,
    value,
  }))

  return NextResponse.json({
    holdings,
    allocations,
    totalValue,
    totalGainLoss: holdings.reduce((s: number, h: any) => s + h.gainLoss, 0),
    warChest: warChest?.available_cash ?? 0,
    pricesUpdatedAt: cachedPrices?.[0]?.updated_at ?? new Date().toISOString(),
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
