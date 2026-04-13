import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function parseRSS(xml: string, feed: any): any[] {
  const items: any[] = []
  const matches = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g))
  for (const m of matches) {
    const item = m[1]
    const title = item.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] || item.match(/<title>(.*?)<\/title>/)?.[1] || ''
    const link = item.match(/<link>(.*?)<\/link>/)?.[1] || item.match(/<guid>(https?:\/\/[^<]+)<\/guid>/)?.[1] || ''
    const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || ''
    if (!title || !link) continue
    items.push({
      id: Buffer.from(link).toString('base64').slice(0, 16),
      title: title.replace(/<[^>]+>/g, '').trim(),
      link: link.trim(),
      source: feed.name,
      pubDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      type: 'feed',
    })
  }
  return items
}

async function fetchAlphaVantageNews(tickers: string[]): Promise<any[]> {
  const apiKey = process.env.ALPHAVANTAGE_API_KEY
  if (!apiKey || !tickers.length) return []

  // AlphaVantage supports up to 50 tickers in one call
  const tickerStr = tickers.join(',')

  try {
    const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${tickerStr}&limit=50&sort=LATEST&apikey=${apiKey}`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    const data = await res.json()

    if (!Array.isArray(data.feed)) {
      console.error('AlphaVantage news error:', data)
      return []
    }

    const seen = new Set<string>()
    const items: any[] = []

    for (const a of data.feed) {
      if (!a.title || !a.url) continue
      if (seen.has(a.url)) continue
      seen.add(a.url)

      // Find which of our tickers this article is primarily about
      const articleTickers = (a.ticker_sentiment ?? []).map((t: any) => t.ticker.toUpperCase())
      const matchingTicker = tickers.find(t => articleTickers.includes(t))
      if (!matchingTicker) continue

      // Filter out low-quality sources
      const source = (a.source ?? '').toLowerCase()
      const blocked = ['yahoo', 'pr newswire', 'business wire', 'globe newswire', 'accesswire', 'benzinga']
      if (blocked.some(b => source.includes(b))) continue

      // Get sentiment score for this ticker
      const sentimentEntry = (a.ticker_sentiment ?? []).find((t: any) => t.ticker.toUpperCase() === matchingTicker)
      const sentiment = sentimentEntry?.ticker_sentiment_score ?? 0

      items.push({
        id: Buffer.from(a.url).toString('base64').slice(0, 16),
        title: a.title.trim(),
        link: a.url,
        source: a.source ?? 'Unknown',
        ticker: matchingTicker,
        pubDate: a.time_published
          ? new Date(
              a.time_published.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6')
            ).toISOString()
          : new Date().toISOString(),
        sentiment: parseFloat(sentiment).toFixed(2),
        sentimentLabel: a.overall_sentiment_label ?? null,
        type: 'market',
      })
    }

    return items
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, 40)

  } catch (e) {
    console.error('AlphaVantage news fetch error:', e)
    return []
  }
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const refresh = new URL(req.url).searchParams.get('refresh') === 'true'

  const { data: cached } = await supabase
    .from('widget_cache')
    .select('data,fetched_at')
    .eq('user_id', user.id)
    .eq('widget_key', 'news')
    .single()

  if (!refresh && cached && (Date.now() - new Date(cached.fetched_at).getTime()) / 60000 < 30) {
    return NextResponse.json({ data: cached.data, cached: true })
  }

  const [feedsRes, positionsRes] = await Promise.all([
    supabase.from('news_feeds').select('*').eq('user_id', user.id).eq('enabled', true),
    supabase.from('stock_positions').select('ticker').eq('user_id', user.id),
  ])

  const feeds = feedsRes.data ?? []
  const tickers = (positionsRes.data ?? []).map((p: any) => p.ticker)

  const [rssResults, marketItems] = await Promise.all([
    Promise.allSettled(feeds.map(async feed => {
      const r = await fetch(feed.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Meridian/1.0)' },
        signal: AbortSignal.timeout(5000),
      })
      return { feed, xml: await r.text() }
    })),
    fetchAlphaVantageNews(tickers),
  ])

  const feedItems: any[] = []
  for (const r of rssResults) {
    if (r.status !== 'fulfilled') continue
    feedItems.push(...parseRSS(r.value.xml, r.value.feed))
  }
  feedItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())

  const data = {
    feedItems: feedItems.slice(0, 30),
    marketItems,
    fetched_at: new Date().toISOString(),
    items: feedItems.slice(0, 30),
  }

  await supabase.from('widget_cache').upsert(
    { user_id: user.id, widget_key: 'news', data, fetched_at: data.fetched_at },
    { onConflict: 'user_id,widget_key' }
  )

  return NextResponse.json({ data, cached: false })
}
