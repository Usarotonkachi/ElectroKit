import { Bolt } from 'lucide-react'
import { lineMaterialOrDefault, roomNameById } from '@/domain/calculations'
import { useElectroStore } from '@/store/useElectroStore'

/** Один модуль «1P» на DIN-рейке: клювики сверху, корпус, рычаг автомата. */
function DinMcbModule({
  amps,
  label,
  title,
}: {
  amps: number
  label: string
  title: string
}) {
  return (
    <div
      className="group relative flex w-[52px] shrink-0 flex-col items-center"
      title={title}
    >
      {/* Клювики крепления к DIN-рейке (характерный силуэт) */}
      <div className="relative flex h-2.5 w-full justify-center gap-[5px] px-1">
        <div className="h-full w-3 rounded-t-sm bg-gradient-to-b from-zinc-500 to-zinc-700 shadow-sm" />
        <div className="h-full w-3 rounded-t-sm bg-gradient-to-b from-zinc-500 to-zinc-700 shadow-sm" />
      </div>

      {/* Корпус автомата */}
      <div className="relative w-full overflow-hidden rounded-b-md border border-l border-r border-b border-zinc-600 bg-gradient-to-b from-zinc-800 via-zinc-900 to-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        {/* Окно с маркировкой */}
        <div className="mx-1 mt-1 flex h-6 items-center justify-center rounded border border-zinc-700/80 bg-black/40 px-0.5">
          <span className="font-mono text-[11px] font-bold tabular-nums text-yellow-400">
            {amps}A
          </span>
        </div>

        {/* Рычаг (клавиша) — положение «включено» */}
        <div className="mx-2 my-1.5 flex justify-center">
          <div className="relative h-5 w-8 rounded-sm bg-zinc-950 shadow-inner ring-1 ring-zinc-700/90">
            <div
              className="absolute left-0.5 top-0.5 h-4 w-5 rounded-sm bg-gradient-to-b from-amber-400 via-yellow-500 to-amber-600 shadow-md ring-1 ring-amber-300/40 transition group-hover:from-amber-300 group-hover:to-amber-500"
              style={{ transform: 'rotate(-12deg)' }}
            />
            <div className="absolute bottom-0.5 right-0.5 h-1 w-1 rounded-full bg-zinc-600" />
          </div>
        </div>

        {/* Подпись линии */}
        <div className="border-t border-zinc-800/90 px-1 pb-1 pt-0.5">
          <p className="line-clamp-2 min-h-[22px] text-center text-[8px] leading-tight text-zinc-500">
            {label}
          </p>
        </div>
      </div>
    </div>
  )
}

/** Визуализация щита: модули на DIN-рейке. */
export function SchematicView() {
  const rooms = useElectroStore((s) => s.rooms)
  const lines = useElectroStore((s) => s.lines)

  return (
    <div className="rounded-md border border-slate-800 bg-slate-900/80 p-4 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-100">
        <Bolt className="h-4 w-4 text-yellow-500" />
        Щит (схема)
      </h3>
      {lines.length === 0 ? (
        <p className="text-sm text-slate-500">Добавьте линии — здесь появятся модули автоматов.</p>
      ) : (
        <div className="space-y-4">
          <div className="rounded border border-dashed border-slate-600 bg-slate-950/80 px-3 py-2 text-center text-xs text-slate-500">
            Ввод / УЗМ / главный автомат (вне MVP)
          </div>

          <div>
            <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">
              DIN-рейка 35 мм
            </div>
            <div className="relative rounded-sm bg-gradient-to-b from-slate-600 via-slate-700 to-slate-800 px-3 py-4 shadow-inner">
              {/* Паз рейки */}
              <div className="absolute inset-x-4 top-1/2 h-1 -translate-y-1/2 rounded-full bg-slate-900/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]" />
              <div className="relative flex flex-wrap items-end justify-center gap-3 gap-y-4">
                {lines.map((line) => (
                  <DinMcbModule
                    key={line.id}
                    amps={line.suggestedMCB}
                    label={line.name}
                    title={`${roomNameById(rooms, line.roomId)} — ${line.name} · ${lineMaterialOrDefault(line.material) === 'aluminum' ? 'Al' : 'Cu'} ${line.suggestedCable} мм²`}
                  />
                ))}
              </div>
            </div>
          </div>

          <p className="text-[10px] leading-relaxed text-slate-600">
            Условное изображение 1P-модулей: клювики крепления, окно номинала, положение рычага «ON».
            PE / N — шины (не показаны).
          </p>
        </div>
      )}
    </div>
  )
}
