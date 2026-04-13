import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ─── Curated high-quality financial RSS feeds ─────────────────
const MARKET_FEEDS = [
  { name: 'Reuters Business', url: 'https://feeds.reuters.com/reuters/businessNews' },
  { name: 'Reuters Markets', url: 'https://feeds.reuters.com/reuters/UKmarkets' },
  { name: 'Financial Times', url: 'https://www.ft.com/rss/home' },
  { name: 'WSJ Markets', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories' },
  { name: 'MarketWatch', url: 'https://feeds.marketwatch.com/marketwatch/topstories' },
  { name: 'Barrons', url: 'https://www.barrons.com/xml/rss/3_7514.xml' },
  { name: 'Seeking Alpha', url: 'https://seekingalpha.com/market_currents.xml' },
  { name: 'Bloomberg Markets', url: 'https://feeds.bloomberg.com/markets/news.rss' },
  { name: 'CNBC Top News', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html' },
  { name: 'The Economist', url: 'https://www.economist.com/finance-and-economics/rss.xml' },
]

function parseRSS(xml: string, feedName: string): any[] {
  const items: any[] = []
  const matches = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g))
  for (const m of matches) {
    const item = m[1]
    const title = item.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] || item.match(/<title>(.*?)<\/title>/)?.[1] || ''
    const link = item.match(/<link>(.*?)<\/link>/)?.[1] || item.match(/<guid>(https?:\/\/[^<]+)<\/guid>/)?.[1] || ''
    const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || ''
    const description = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]>/)?.[1] || item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || ''
    if (!title || !link) continue
    items.push({
      id: Buffer.from(link).toString('base64').slice(0, 16),
      title: title.replace(/<[^>]+>/g, '').trim(),
      link: link.trim(),
      source: feedName,
      pubDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      description: description.replace(/<[^>]+>/g, '').trim().slice(0, 200),
      type: 'feed',
    })
  }
  return items
}

// Check if an article is relevant to any of the user's tickers
function findMatchingTicker(title: string, description: string, tickers: string[]): string | null {
  const text = (title + ' ' + description).toUpperCase()
  // Also map common company names to tickers
  const NAME_MAP: Record<string, string> = {
    'NVIDIA': 'NVDA', 'BROADCOM': 'AVGO', 'AMAZON': 'AMZN', 'GOOGLE': 'GOOGL',
    'ALPHABET': 'GOOGL', 'VISTRA': 'VST', 'EXXON': 'XOM', 'CHEVRON': 'CVX',
    'CONSTELLATION ENERGY': 'CEG', 'IRIDIUM': 'IRDM', 'KNIFE RIVER': 'KNF',
  }
  // Check ticker symbols first (word boundary match)
  for (const ticker of tickers) {
    const regex = new RegExp(`\\b${ticker}\\b`, 'i')
    if (regex.test(text)) return ticker
  }
  // Check company names
  for (const [name, ticker] of Object.entries(NAME_MAP)) {
    if (tickers.includes(ticker) && text.includes(name)) return ticker
  }
  return null
}

async function fetchMarketNews(tickers: string[]): Promise<any[]> {
  if (!tickers.length) return []

  const results = await Promise.allSettled(
    MARKET_FEEDS.map(async feed => {
      const r = await fetch(feed.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Meridian/1.0)' },
        signal: AbortSignal.timeout(6000),
      })
      const xml = await r.text()
      return parseRSS(xml, feed.name)
    })
  )

  const allItems: any[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') allItems.push(...r.value)
  }

  // Filter to only articles mentioning user's tickers or company names
  const tickerItems: any[] = []
  const seen = new Set<string>()

  for (const item of allItems) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    const ticker = findMatchingTicker(item.title, item.description, tickers)
    if (ticker) {
      tickerItems.push({ ...item, ticker, type: 'market' })
    }
  }

  return tickerItems
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 40)
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
    fetchMarketNews(tickers),
  ])

  const feedItems: any[] = []
  for (const r of rssResults) {
    if (r.status !== 'fulfilled') continue
    feedItems.push(...parseRSS(r.value.xml, r.value.feed.name))
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
