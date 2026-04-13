import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.ALPHAVANTAGE_API_KEY
  const { data: positions } = await supabase
    .from('stock_positions')
    .select('ticker')
    .eq('user_id', user.id)

  const tickers = (positions ?? []).map((p: any) => p.ticker)

  if (!apiKey) {
    return NextResponse.json({ error: 'ALPHAVANTAGE_API_KEY not set', tickers })
  }

  try {
    const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${tickers.join(',')}&limit=5&sort=LATEST&apikey=${apiKey}`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    const data = await res.json()
    return NextResponse.json({
      tickers,
      apiKeyPresent: true,
      apiKeyPrefix: apiKey.slice(0, 4) + '...',
      httpStatus: res.status,
      responseKeys: Object.keys(data),
      feedCount: Array.isArray(data.feed) ? data.feed.length : 'not array — ' + typeof data.feed,
      firstItem: data.feed?.[0] ? {
        title: data.feed[0].title,
        source: data.feed[0].source,
        tickers: data.feed[0].ticker_sentiment?.map((t: any) => t.ticker),
      } : null,
      rawError: data.Information ?? data.Note ?? data.message ?? null,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, tickers, apiKeyPresent: !!apiKey })
  }
}
