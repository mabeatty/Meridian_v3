import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const plaidEnv = process.env.PLAID_ENV ?? 'sandbox'
  const baseUrl = plaidEnv === 'production'
    ? 'https://production.plaid.com'
    : 'https://sandbox.plaid.com'

  try {
    const res = await fetch(`${baseUrl}/link/token/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.PLAID_CLIENT_ID,
        secret: process.env.PLAID_SECRET,
        client_name: 'Meridian',
        user: { client_user_id: user.id },
        products: ['transactions'],
        country_codes: ['US'],
        language: 'en',
      }),
    })

    const data = await res.json()
    if (data.error_code) throw new Error(data.error_message)
    return NextResponse.json({ link_token: data.link_token })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}