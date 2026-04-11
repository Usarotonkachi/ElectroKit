import { useElectroStore } from '@/store/useElectroStore'

export function VoltageSelector() {
  const lineVoltage = useElectroStore((s) => s.lineVoltage)
  const setVoltage = useElectroStore((s) => s.setVoltage)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="hidden text-xs text-slate-500 md:inline">Сеть:</span>
      <div className="inline-flex rounded-md border border-slate-700 bg-slate-950 p-0.5">
        <button
          type="button"
          onClick={() => setVoltage(230)}
          className={`min-h-11 min-w-[5.5rem] rounded px-3 py-2 text-xs font-medium transition md:min-h-0 md:min-w-0 md:py-1.5 ${
            lineVoltage === 230
              ? 'bg-slate-100 text-slate-900'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          1ф, 230 В
        </button>
        <button
          type="button"
          onClick={() => setVoltage(400)}
          className={`min-h-11 min-w-[5.5rem] rounded px-3 py-2 text-xs font-medium transition md:min-h-0 md:min-w-0 md:py-1.5 ${
            lineVoltage === 400
              ? 'bg-slate-100 text-slate-900'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          3ф, 400 В
        </button>
      </div>
    </div>
  )
}
