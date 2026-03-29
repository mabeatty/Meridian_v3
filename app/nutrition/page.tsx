import { Header } from '@/components/layout/Header'
export default function Page() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header />
      <div className="flex-1 flex items-center justify-center text-text-tertiary text-sm font-mono">
        nutrition — coming soon
      </div>
    </div>
  )
}
