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

async function fetchPolygonNews(tickers: string[]): Promise<any[]> {
  const apiKey = process.env.POLYGON_API_KEY
  if (!apiKey || !tickers.length) return []

  const seen = new Set<string>()
  const items: any[] = []

  // Fetch news for each ticker — Polygon filters by primary ticker
  await Promise.all(tickers.map(async ticker => {
    try {
      const url = `https://api.polygon.io/v2/reference/news?ticker=${ticker}&limit=10&sort=published_utc&order=desc&apiKey=${apiKey}`
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
      const data = await res.json()

      if (!Array.isArray(data.results)) return

      for (const a of data.results) {
        if (!a.title || !a.article_url) continue
        if (seen.has(a.article_url)) continue
        seen.add(a.article_url)

        // Only include articles where this ticker is a primary subject
        const tickerTags = (a.tickers ?? []).map((t: string) => t.toUpperCase())
        if (!tickerTags.includes(ticker.toUpperCase())) continue

        // Filter out low-quality publishers
        const source = a.publisher?.name ?? ''
        const blocked = ['yahoo', 'benzinga sponsored', 'globe newswire', 'accesswire', 'pr newswire', 'business wire']
        if (blocked.some(b => source.toLowerCase().includes(b))) continue

        items.push({
          id: Buffer.from(a.article_url).toString('base64').slice(0, 16),
          title: a.title.trim(),
          link: a.article_url,
          source: source,
          ticker,
          pubDate: a.published_utc,
          type: 'market',
          description: a.description ?? null,
          tickers: tickerTags,
        })
      }
    } catch (e) {
      console.error(`Polygon news error for ${ticker}:`, e)
    }
  }))

  return items
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 40)
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const refresh = new URL(req.url).searchParams.get('refresh') === 'true'

  // Check cache (30 min TTL for news)
  const { data: cached } = await supabase
    .from('widget_cache')
    .select('data,fetched_at')
    .eq('user_id', user.id)
    .eq('widget_key', 'news')
    .single()

  if (!refresh && cached && (Date.now() - new Date(cached.fetched_at).getTime()) / 60000 < 30) {
    return NextResponse.json({ data: cached.data, cached: true })
  }

  // Fetch RSS feeds and stock positions in parallel
  const [feedsRes, positionsRes] = await Promise.all([
    supabase.from('news_feeds').select('*').eq('user_id', user.id).eq('enabled', true),
    supabase.from('stock_positions').select('ticker').eq('user_id', user.id),
  ])

  const feeds = feedsRes.data ?? []
  const tickers = (positionsRes.data ?? []).map((p: any) => p.ticker)

  // Fetch RSS and Polygon news in parallel
  const [rssResults, marketItems] = await Promise.all([
    Promise.allSettled(feeds.map(async feed => {
      const r = await fetch(feed.url, { headers: { 'User-Agent': 'Meridian/1.0' }, signal: AbortSignal.timeout(5000) })
      return { feed, xml: await r.text() }
    })),
    fetchPolygonNews(tickers),
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
    items: feedItems.slice(0, 30),
  }

  await supabase.from('widget_cache').upsert(
    { user_id: user.id, widget_key: 'news', data, fetched_at: data.fetched_at },
    { onConflict: 'user_id,widget_key' }
  )

  return NextResponse.json({ data, cached: false })
}
