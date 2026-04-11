import { Bolt } from 'lucide-react'
import { useSmartHints } from '@/store/useElectroStore'

/** Мягкие инженерные подсказки (УЗО для розеток, ΔU). */
export function SmartHintsBanner() {
  const hints = useSmartHints()
  if (hints.length === 0) return null

  return (
    <div className="mx-4 mt-2 space-y-2 lg:mx-6">
      {hints.map((text) => (
        <div
          key={text}
          className="flex items-start gap-2.5 rounded-md border border-sky-500/25 bg-sky-500/5 px-3 py-2 text-sm text-sky-100/95"
          role="status"
        >
          <Bolt className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" aria-hidden />
          <p className="leading-snug">{text}</p>
        </div>
      ))}
    </div>
  )
}
