import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { redirect } from 'next/navigation'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar userEmail={user.email} />
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </div>
  )
}
