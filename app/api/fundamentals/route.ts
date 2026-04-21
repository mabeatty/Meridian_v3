import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function fetchFundamentals(ticker: string): Promise<{ pe_trailing: number | null; pe_forward: number | null }> {
  const apiKey = process.env.ALPHAVANTAGE_API_KEY
  if (!apiKey) return { pe_trailing: null, pe_forward: null }

  try {
    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker}&apikey=${apiKey}`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const data = await res.json()

    const pe_trailing = data.PERatio && data.PERatio !== 'None' ? parseFloat(data.PERatio) : null
    const pe_forward = data.ForwardPE && data.ForwardPE !== 'None' ? parseFloat(data.ForwardPE) : null

    return { pe_trailing, pe_forward }
  } catch (e) {
    console.error(`AlphaVantage fundamentals error for ${ticker}:`, e)
    return { pe_trailing: null, pe_forward: null }
  }
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const refresh = url.searchParams.get('refresh') === 'true'

  // Get all tickers for this user
  const { data: positions } = await supabase
    .from('stock_positions')
    .select('ticker')
    .eq('user_id', user.id)

  const tickers = (positions ?? []).map((p: any) => p.ticker)
  if (!tickers.length) return NextResponse.json({ data: {} })

  // Read existing cache
  const { data: cached } = await supabase
    .from('stock_fundamentals')
    .select('*')
    .in('ticker', tickers)

  const cachedMap: Record<string, any> = {}
  for (const row of cached ?? []) cachedMap[row.ticker] = row

  const now = Date.now()
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000

  // Find tickers that need a fresh fetch (missing or older than 24h)
  const tickersToFetch = refresh
    ? tickers
    : tickers.filter(t => {
        if (!cachedMap[t]) return true
        return (now - new Date(cachedMap[t].updated_at).getTime()) > TWENTY_FOUR_HOURS
      })

  // Fetch stale tickers one at a time to respect rate limits
  // AlphaVantage free = 25 calls/day — fetch up to 25 at once but no more
  const toFetch = tickersToFetch.slice(0, 25)

  for (const ticker of toFetch) {
    const fundamentals = await fetchFundamentals(ticker)
    await supabase
      .from('stock_fundamentals')
      .upsert({
        ticker,
        pe_trailing: fundamentals.pe_trailing,
        pe_forward: fundamentals.pe_forward,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'ticker' })
    cachedMap[ticker] = { ...cachedMap[ticker], ...fundamentals, ticker }
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 200))
  }

  // Return map of ticker -> fundamentals
  const result: Record<string, any> = {}
  for (const ticker of tickers) {
    result[ticker] = {
      pe_trailing: cachedMap[ticker]?.pe_trailing ?? null,
      pe_forward: cachedMap[ticker]?.pe_forward ?? null,
    }
  }

  return NextResponse.json({ data: result, fetched: toFetch.length })
}
