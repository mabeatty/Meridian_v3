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
      title: title.trim(),
      link: link.trim(),
      source: feed.name,
      category: feed.category,
      pubDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      type: 'feed',
    })
  }
  return items
}

async function fetchStockNews(tickers: string[]): Promise<any[]> {
  const apiKey = process.env.FINNHUB_API_KEY
  if (!apiKey || !tickers.length) return []

  const to = new Date().toISOString().split('T')[0]
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const seen = new Set<string>()
  const items: any[] = []

  await Promise.all(tickers.map(async ticker => {
    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${from}&to=${to}&token=${apiKey}`,
        { signal: AbortSignal.timeout(5000) }
      )
      const articles = await res.json()
      if (!Array.isArray(articles)) return

      for (const a of articles.slice(0, 10)) {
        if (!a.headline || !a.url) continue
        // Deduplicate by URL
        if (seen.has(a.url)) continue
        seen.add(a.url)
        items.push({
          id: Buffer.from(a.url).toString('base64').slice(0, 16),
          title: a.headline.trim(),
          link: a.url,
          source: a.source ?? ticker,
          ticker,
          pubDate: new Date(a.datetime * 1000).toISOString(),
          type: 'market',
        })
      }
    } catch (e) {
      console.error(`Finnhub news error for ${ticker}:`, e)
    }
  }))

  return items.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()).slice(0, 30)
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const refresh = new URL(req.url).searchParams.get('refresh') === 'true'

  // Check cache (60 min TTL)
  const { data: cached } = await supabase
    .from('widget_cache')
    .select('data,fetched_at')
    .eq('user_id', user.id)
    .eq('widget_key', 'news')
    .single()

  if (!refresh && cached && (Date.now() - new Date(cached.fetched_at).getTime()) / 60000 < 60) {
    return NextResponse.json({ data: cached.data, cached: true })
  }

  // Fetch RSS feeds and stock positions in parallel
  const [feedsRes, positionsRes] = await Promise.all([
    supabase.from('news_feeds').select('*').eq('user_id', user.id).eq('enabled', true),
    supabase.from('stock_positions').select('ticker').eq('user_id', user.id),
  ])

  const feeds = feedsRes.data ?? []
  const tickers = (positionsRes.data ?? []).map((p: any) => p.ticker)

  // Fetch RSS and stock news in parallel
  const [rssResults, marketItems] = await Promise.all([
    Promise.allSettled(feeds.map(async feed => {
      const r = await fetch(feed.url, { headers: { 'User-Agent': 'Meridian/1.0' }, signal: AbortSignal.timeout(5000) })
      return { feed, xml: await r.text() }
    })),
    fetchStockNews(tickers),
  ])

  // Parse RSS
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
    // Keep legacy items field for any other consumers
    items: feedItems.slice(0, 30),
  }

  await supabase.from('widget_cache').upsert(
    { user_id: user.id, widget_key: 'news', data, fetched_at: data.fetched_at },
    { onConflict: 'user_id,widget_key' }
  )

  return NextResponse.json({ data, cached: false })
}
