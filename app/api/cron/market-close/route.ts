import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const POLYGON_API_KEY = process.env.POLYGON_API_KEY

async function getPrevClose(tickers: string[]): Promise<Record<string, { open: number; high: number; low: number; close: number; volume: number }>> {
  if (!POLYGON_API_KEY || !tickers.length) return {}

  try {
    const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${tickers.join(',')}&apiKey=${POLYGON_API_KEY}`
    const res = await fetch(url)
    const data = await res.json()

    const results: Record<string, any> = {}
    if (data.status === 'OK' && Array.isArray(data.tickers)) {
      for (const t of data.tickers) {
        const d = t.day ?? t.prevDay
        if (d?.c > 0) {
          results[t.ticker] = {
            open: d.o ?? 0,
            high: d.h ?? 0,
            low: d.l ?? 0,
            close: d.c,
            volume: d.v ?? 0,
          }
        }
      }
    }
    return results
  } catch (e) {
    console.error('Polygon prev close error:', e)
    return {}
  }
}

export async function GET(req: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient()

  // Get all unique tickers across all users' positions
  const { data: positions } = await supabase
    .from('stock_positions')
    .select('ticker, user_id, dip_trigger, shares, cost_basis')

  if (!positions?.length) {
    return NextResponse.json({ message: 'No positions found' })
  }

  const tickers = Array.from(new Set(positions.map((p: any) => p.ticker)))
  const today = new Date().toISOString().split('T')[0]

  // Fetch prices from Polygon
  const prices = await getPrevClose(tickers)

  if (!Object.keys(prices).length) {
    return NextResponse.json({ error: 'No price data returned' }, { status: 500 })
  }

  // Write to price_history
  const historyRows = Object.entries(prices).map(([ticker, data]) => ({
    ticker,
    date: today,
    open: data.open,
    high: data.high,
    low: data.low,
    close: data.close,
    volume: data.volume,
    adjusted_close: data.close,
  }))

  const { error: historyError } = await supabase
    .from('price_history')
    .upsert(historyRows, { onConflict: 'ticker,date' })

  if (historyError) {
    console.error('price_history upsert error:', historyError)
  }

  // Update stock_prices cache
  const priceRows = Object.entries(prices).map(([ticker, data]) => {
    const prevClose = data.open // approximate; snapshot gives us today's data
    const change = data.close - prevClose
    const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0
    return {
      ticker,
      current_price: data.close,
      daily_change: change,
      daily_change_pct: changePct,
      updated_at: new Date().toISOString(),
    }
  })

  await supabase.from('stock_prices').upsert(priceRows)

  // Check dip triggers per user
  const alertRows: any[] = []
  const userPositions: Record<string, any[]> = {}
  for (const pos of positions) {
    if (!userPositions[pos.user_id]) userPositions[pos.user_id] = []
    userPositions[pos.user_id].push(pos)
  }

  for (const [userId, userPos] of Object.entries(userPositions)) {
    for (const pos of userPos) {
      if (!pos.dip_trigger) continue
      const price = prices[pos.ticker]
      if (!price) continue
      if (price.close <= pos.dip_trigger) {
        alertRows.push({
          user_id: userId,
          ticker: pos.ticker,
          trigger_price: pos.dip_trigger,
          close_price: price.close,
          triggered_at: new Date().toISOString(),
          seen: false,
        })
      }
    }
  }

  if (alertRows.length > 0) {
    await supabase.from('dip_alerts').insert(alertRows)
  }

  return NextResponse.json({
    success: true,
    date: today,
    tickers_processed: tickers.length,
    prices_written: historyRows.length,
    dip_alerts_fired: alertRows.length,
    dip_alerts: alertRows.map(a => ({ ticker: a.ticker, close: a.close_price, trigger: a.trigger_price })),
  })
}
