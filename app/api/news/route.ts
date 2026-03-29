import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: cached } = await supabase.from('widget_cache').select('data,fetched_at').eq('user_id', user.id).eq('widget_key', 'news').single()
  if (cached && (Date.now() - new Date(cached.fetched_at).getTime()) / 60000 < 60) return NextResponse.json({ data: cached.data, cached: true })

  const { data: feeds } = await supabase.from('news_feeds').select('*').eq('user_id', user.id).eq('enabled', true)
  if (!feeds?.length) return NextResponse.json({ data: { items: [], fetched_at: new Date().toISOString() }, cached: false })

  const results = await Promise.allSettled(feeds.map(async feed => {
    const r = await fetch(feed.url, { headers: { 'User-Agent': 'Meridian/1.0' }, signal: AbortSignal.timeout(5000) })
    return { feed, xml: await r.text() }
  }))

  const items: any[] = []
  for (const r of results) {
    if (r.status !== 'fulfilled') continue
    const { feed, xml } = r.value
    const matches = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g))
for (const m of matches) {
      const item = m[1]
      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] || item.match(/<title>(.*?)<\/title>/)?.[1] || ''
      const link = item.match(/<link>(.*?)<\/link>/)?.[1] || item.match(/<guid>(https?:\/\/[^<]+)<\/guid>/)?.[1] || ''
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || ''
      if (!title || !link) continue
      items.push({ id: Buffer.from(link).toString('base64').slice(0, 16), title: title.trim(), link: link.trim(), source: feed.name, category: feed.category, pubDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString() })
    }
  }

  items.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
  const data = { items: items.slice(0, 30), fetched_at: new Date().toISOString() }
  await supabase.from('widget_cache').upsert({ user_id: user.id, widget_key: 'news', data, fetched_at: data.fetched_at }, { onConflict: 'user_id,widget_key' })
  return NextResponse.json({ data, cached: false })
}
