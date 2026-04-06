import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: cached } = await supabase
    .from('widget_cache')
    .select('data,fetched_at')
    .eq('user_id', user.id)
    .eq('widget_key', 'finance')
    .single()

  if (cached && (Date.now() - new Date(cached.fetched_at).getTime()) / 60000 < 60) {
    return NextResponse.json({ data: cached.data, cached: true })
  }

  const { data: tokens } = await supabase
    .from('oauth_tokens')
    .select('access_token, item_id')
    .eq('user_id', user.id)
    .eq('provider', 'plaid')

  if (!tokens?.length) return NextResponse.json({ data: null, error: 'not_connected', cached: false })

  const base = process.env.PLAID_ENV === 'production'
    ? 'https://production.plaid.com'
    : 'https://sandbox.plaid.com'

  try {
    // Fetch accounts from all connected institutions
    const allAccounts: any[] = []

    await Promise.all(tokens.map(async tok => {
      const r = await fetch(`${base}/accounts/balance/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.PLAID_CLIENT_ID,
          secret: process.env.PLAID_SECRET,
          access_token: tok.access_token,
        }),
      })
      const pd = await r.json()
      if (pd.error_code) {
        console.error(`Plaid error for item ${tok.item_id}:`, pd.error_message)
        return
      }
      const accounts = (pd.accounts ?? []).map((a: any) => ({
        id: a.account_id,
        name: a.name,
        type: a.type,
        subtype: a.subtype,
        balance: a.balances.current ?? 0,
        available_balance: a.balances.available ?? null,
        currency: a.balances.iso_currency_code ?? 'USD',
        mask: a.mask ?? '****',
        item_id: tok.item_id,
      }))
      allAccounts.push(...accounts)
    }))

    const total_cash = allAccounts.filter(a => a.type === 'depository').reduce((s, a) => s + a.balance, 0)
    const total_investments = allAccounts.filter(a => a.type === 'investment').reduce((s, a) => s + a.balance, 0)
    const total_credit_balance = allAccounts.filter(a => a.type === 'credit').reduce((s, a) => s + a.balance, 0)

    const data = {
      accounts: allAccounts,
      net_worth: total_cash + total_investments - total_credit_balance,
      total_cash,
      total_investments,
      total_credit_balance,
      fetched_at: new Date().toISOString(),
    }

    await supabase.from('widget_cache').upsert(
      { user_id: user.id, widget_key: 'finance', data, fetched_at: data.fetched_at },
      { onConflict: 'user_id,widget_key' }
    )

    return NextResponse.json({ data, cached: false })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { public_token } = await req.json()

  const base = process.env.PLAID_ENV === 'production'
    ? 'https://production.plaid.com'
    : 'https://sandbox.plaid.com'

  const r = await fetch(`${base}/item/public_token/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.PLAID_CLIENT_ID,
      secret: process.env.PLAID_SECRET,
      public_token,
    }),
  })

  const d = await r.json()
  if (!d.access_token) return NextResponse.json({ error: d.error_message }, { status: 500 })

  // Store with item_id to support multiple institutions
  await supabase.from('oauth_tokens').upsert(
    {
      user_id: user.id,
      provider: 'plaid',
      access_token: d.access_token,
      item_id: d.item_id,
      metadata: { item_id: d.item_id },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,provider,item_id' }
  )

  // Clean up any stale null item_id rows
  await supabase.from('oauth_tokens')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', 'plaid')
    .is('item_id', null)

  // Invalidate cache
  await supabase.from('widget_cache')
    .delete()
    .eq('user_id', user.id)
    .eq('widget_key', 'finance')

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const item_id = new URL(req.url).searchParams.get('item_id')

  if (item_id) {
    await supabase.from('oauth_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', 'plaid')
      .eq('item_id', item_id)
  } else {
    // Delete all Plaid tokens
    await supabase.from('oauth_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', 'plaid')
  }

  await supabase.from('widget_cache')
    .delete()
    .eq('user_id', user.id)
    .eq('widget_key', 'finance')

  return NextResponse.json({ success: true })
}