import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tokens } = await supabase
    .from('oauth_tokens')
    .select('access_token, item_id')
    .eq('user_id', user.id)
    .eq('provider', 'plaid')

  if (!tokens?.length) return NextResponse.json({ error: 'No Plaid connection' }, { status: 400 })

  const base = process.env.PLAID_ENV === 'production'
    ? 'https://production.plaid.com'
    : 'https://sandbox.plaid.com'

  // Fetch last 90 days of transactions
  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  let allTransactions: any[] = []

  await Promise.all(tokens.map(async tok => {
    try {
      const res = await fetch(`${base}/transactions/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.PLAID_CLIENT_ID,
          secret: process.env.PLAID_SECRET,
          access_token: tok.access_token,
          start_date: startDate,
          end_date: endDate,
          options: { count: 500, offset: 0 },
        }),
      })
      const data = await res.json()
      if (data.error_code) {
        console.error('Plaid sync error:', data.error_message)
        return
      }
      allTransactions.push(...(data.transactions ?? []))
    } catch (e) {
      console.error('Transaction fetch error:', e)
    }
  }))

  // Filter out transfers and credit card payments
  const filtered = allTransactions.filter(t =>
    !t.pending &&
    t.amount > 0 &&
    !['Transfer', 'Payment', 'Deposit'].includes(t.category?.[0] ?? '')
  )

  // Upsert into transactions table
  if (filtered.length) {
    const rows = filtered.map(t => ({
      user_id: user.id,
      plaid_transaction_id: t.transaction_id,
      account_id: t.account_id,
      name: t.name,
      amount: t.amount,
      date: t.date,
      plaid_category: t.category?.[0] ?? null,
      pending: false,
    }))

    // Batch upsert in chunks of 100
    for (let i = 0; i < rows.length; i += 100) {
      await supabase
        .from('transactions')
        .upsert(rows.slice(i, i + 100), { onConflict: 'plaid_transaction_id', ignoreDuplicates: true })
    }
  }

  return NextResponse.json({ synced: filtered.length })
}