import {
  Activity,
  Cable,
  Gauge,
  Percent,
  Plug,
  Ruler,
  Trash,
  Zap,
} from 'lucide-react'
import {
  lineMaterialOrDefault,
  MAX_VOLTAGE_DROP_PERCENT,
  RHO_ALUMINUM,
  RHO_COPPER,
  shortCircuitEndLineCurrentA,
} from '@/domain/calculations'
import type { ConductorMaterial, ElectricalLine, RcdLeakageSensitivity } from '@/domain/types'
import { useElectroStore } from '@/store/useElectroStore'

type ElectricalLineUpdatePatch = Partial<
  Pick<
    ElectricalLine,
    | 'name'
    | 'power'
    | 'isWetZone'
    | 'roomId'
    | 'cableLengthM'
    | 'socketOutletLine'
    | 'material'
    | 'isIncomerLine'
    | 'rcdSensitivityUserSet'
    | 'rcdLeakageMa'
  >
>

function endShortCircuitCurrentLabel(line: ElectricalLine): string {
  const L = line.cableLengthM
  const S = line.suggestedCable
  if (L == null || L <= 0 || S <= 0) return '—'
  const isc = shortCircuitEndLineCurrentA(L, S, lineMaterialOrDefault(line.material))
  if (!Number.isFinite(isc)) return '—'
  return `${Math.round(isc)} А`
}

function LineCardMobile({
  line,
  updateLine,
  removeLine,
}: {
  line: ElectricalLine
  updateLine: (id: string, patch: ElectricalLineUpdatePatch) => void
  removeLine: (id: string) => void
}) {
  const drop = line.voltageDropPercent
  const dropBad = drop != null && drop > MAX_VOLTAGE_DROP_PERCENT

  return (
    <article className="rounded-lg border border-slate-800 bg-slate-900/90 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
        <h3 className="min-w-0 flex-1 text-base font-semibold leading-snug text-slate-100">
          {line.name}
        </h3>
        <button
          type="button"
          onClick={() => removeLine(line.id)}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-red-500/15 hover:text-red-400"
          title="Удалить линию"
          aria-label="Удалить линию"
        >
          <Trash className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-6">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
            <Zap className="h-3.5 w-3.5 shrink-0 text-yellow-500/80" aria-hidden />
            Автомат
          </div>
          <p
            className={`text-2xl font-bold tabular-nums ${
              line.socketOverloadRisk ? 'text-orange-400' : 'text-yellow-400'
            }`}
            title={`Мин. номинал УЗО: ≥ ${line.minRcdNominalA} А`}
          >
            C{line.suggestedMCB} А
          </p>
        </div>
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
            <Cable className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            Кабель
          </div>
          <p className="text-2xl font-bold tabular-nums text-slate-100">
            {line.suggestedCable} мм²
          </p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
        <div className="flex gap-2 rounded-md bg-slate-950/80 px-2 py-2">
          <Gauge className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          <div>
            <dt className="text-[10px] uppercase text-slate-500">P</dt>
            <dd className="font-mono text-slate-200">
              <input
                type="text"
                inputMode="decimal"
                className="w-full min-h-10 rounded border border-slate-700 bg-slate-900 px-2 py-1.5 font-mono text-sm text-slate-100"
                value={line.power}
                onChange={(e) => {
                  const v = parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.'))
                  if (!Number.isNaN(v) && v > 0) updateLine(line.id, { power: v })
                }}
                aria-label="Мощность, Вт"
              />
            </dd>
          </div>
        </div>
        <div className="flex gap-2 rounded-md bg-slate-950/80 px-2 py-2">
          <Plug className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          <div>
            <dt className="text-[10px] uppercase text-slate-500">U, В</dt>
            <dd className="font-mono text-slate-300">{line.voltage}</dd>
          </div>
        </div>
        <div className="flex gap-2 rounded-md bg-slate-950/80 px-2 py-2">
          <Ruler className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          <div>
            <dt className="text-[10px] uppercase text-slate-500">L, м</dt>
            <dd className="font-mono text-slate-200">
              <input
                type="text"
                inputMode="decimal"
                className="w-full min-h-10 rounded border border-slate-700 bg-slate-900 px-2 py-1.5 font-mono text-sm text-slate-100"
                value={line.cableLengthM ?? ''}
                placeholder="—"
                onChange={(e) => {
                  const raw = e.target.value.trim().replace(',', '.')
                  if (raw === '') {
                    updateLine(line.id, { cableLengthM: undefined })
                    return
                  }
                  const v = parseFloat(raw)
                  if (!Number.isNaN(v) && v > 0) updateLine(line.id, { cableLengthM: v })
                }}
                aria-label="Длина кабеля, м"
              />
            </dd>
          </div>
        </div>
        <div className="flex gap-2 rounded-md bg-slate-950/80 px-2 py-2">
          <Percent className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          <div>
            <dt className="text-[10px] uppercase text-slate-500">ΔU, %</dt>
            <dd
              className={`font-mono tabular-nums ${
                dropBad ? 'font-semibold text-red-400' : 'text-slate-300'
              }`}
            >
              {drop != null ? drop.toFixed(2) : '—'}
            </dd>
          </div>
        </div>
        <div className="flex gap-2 rounded-md bg-slate-950/80 px-2 py-2">
          <Activity className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          <div>
            <dt className="text-[10px] uppercase text-slate-500">I расч, А</dt>
            <dd className="font-mono tabular-nums text-slate-300">
              {line.calculatedAmps.toFixed(2)}
            </dd>
          </div>
        </div>
        <div className="flex gap-2 rounded-md bg-slate-950/80 px-2 py-2">
          <Zap className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          <div>
            <dt className="text-[10px] uppercase text-slate-500">ТКЗ, конец</dt>
            <dd className="font-mono tabular-nums text-slate-300">{endShortCircuitCurrentLabel(line)}</dd>
          </div>
        </div>
      </dl>

      <div className="mt-4 space-y-3 border-t border-slate-800/80 pt-3">
        <div>
          <span className="mb-1.5 block text-[10px] font-medium uppercase text-slate-500">
            УЗО, мА
          </span>
          <select
            title={
              line.suggestedRcdLeakageMa !== line.rcdLeakageMa
                ? `Рекомендуется ${line.suggestedRcdLeakageMa} мА`
                : 'Ток утечки УЗО'
            }
            value={line.rcdLeakageMa}
            onChange={(e) =>
              updateLine(line.id, {
                rcdLeakageMa: Number(e.target.value) as RcdLeakageSensitivity,
                rcdSensitivityUserSet: true,
              })
            }
            className="min-h-11 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
          >
            <option value={10}>10</option>
            <option value={30}>30</option>
            <option value={100}>100</option>
            <option value={300}>300</option>
          </select>
          {line.suggestedRcdLeakageMa !== line.rcdLeakageMa ? (
            <p className="mt-1 text-[10px] text-slate-600">реком. {line.suggestedRcdLeakageMa} мА</p>
          ) : null}
        </div>
        <div>
          <span className="mb-1.5 block text-[10px] font-medium uppercase text-slate-500">
            Материал жил
          </span>
          <select
            value={lineMaterialOrDefault(line.material)}
            onChange={(e) =>
              updateLine(line.id, { material: e.target.value as ConductorMaterial })
            }
            className="min-h-11 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
          >
            <option value="copper">Медь (Cu)</option>
            <option value="aluminum">Алюминий (Al)</option>
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-800/80 pt-3">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={line.socketOutletLine === true}
            onChange={(e) => updateLine(line.id, { socketOutletLine: e.target.checked })}
            className="h-5 w-5 rounded border-slate-600 bg-slate-950 text-orange-500"
          />
          Розетки
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={line.isWetZone}
            onChange={(e) => updateLine(line.id, { isWetZone: e.target.checked })}
            className="h-5 w-5 rounded border-slate-600 bg-slate-950 text-cyan-500"
          />
          Влаж. зона
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={line.isIncomerLine === true}
            onChange={(e) =>
              updateLine(line.id, {
                isIncomerLine: e.target.checked ? true : undefined,
              })
            }
            className="h-5 w-5 rounded border-slate-600 bg-slate-950 text-amber-500"
          />
          Ввод
        </label>
      </div>
    </article>
  )
}

export function LineCalculationsTable() {
  const rooms = useElectroStore((s) => s.rooms)
  const lines = useElectroStore((s) => s.lines)
  const activeRoomId = useElectroStore((s) => s.activeRoomId)
  const removeLine = useElectroStore((s) => s.removeLine)
  const updateLine = useElectroStore((s) => s.updateLine)

  const roomId = activeRoomId ?? rooms[0]?.id
  const roomLines = roomId ? lines.filter((l) => l.roomId === roomId) : []

  if (!roomId) {
    return (
      <p className="text-sm text-slate-500">Выберите или создайте помещение.</p>
    )
  }

  if (roomLines.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-700 bg-slate-900/80 px-4 py-8 text-center text-sm text-slate-500">
        В этом помещении пока нет линий. Добавьте линию ниже.
      </p>
    )
  }

  return (
    <div className="rounded-md border border-slate-800 bg-slate-900/80 shadow-sm md:overflow-x-auto">
      {/* Мобильные карточки: &lt; md */}
      <div className="space-y-3 p-3 md:hidden">
        {roomLines.map((line) => (
          <LineCardMobile
            key={line.id}
            line={line}
            updateLine={updateLine}
            removeLine={removeLine}
          />
        ))}
      </div>

      {/* Десктоп: таблица */}
      <div className="hidden md:block">
        <table className="w-full min-w-[1220px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2.5 font-medium">Линия</th>
              <th className="w-12 px-1 py-2.5 text-center text-[10px] font-medium leading-tight text-slate-500">
                Розет.
              </th>
              <th className="w-10 px-1 py-2.5 text-center text-[10px] font-medium leading-tight text-slate-500">
                Вл.
              </th>
              <th className="w-10 px-1 py-2.5 text-center text-[10px] font-medium leading-tight text-slate-500">
                Ввод
              </th>
              <th className="w-14 px-1 py-2.5 text-center text-[10px] font-medium leading-tight text-slate-500">
                Мат.
              </th>
              <th className="px-3 py-2.5 font-medium">P, Вт</th>
              <th className="px-3 py-2.5 font-medium">U, В</th>
              <th className="px-3 py-2.5 font-medium">L, м</th>
              <th className="px-3 py-2.5 font-medium">ΔU, %</th>
              <th className="px-3 py-2.5 font-medium">I расч, А</th>
              <th className="px-3 py-2.5 font-medium">Автомат, А</th>
              <th className="px-3 py-2.5 font-medium">Кабель, мм²</th>
              <th className="min-w-[8.5rem] px-2 py-2.5 font-medium">УЗО, мА</th>
              <th className="w-12 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {roomLines.map((line) => {
              const drop = line.voltageDropPercent
              const dropBad = drop != null && drop > MAX_VOLTAGE_DROP_PERCENT
              return (
                <tr key={line.id} className="border-b border-slate-800/80 hover:bg-slate-800/40">
                  <td className="px-3 py-2 font-medium text-slate-100">{line.name}</td>
                  <td className="px-1 py-2 text-center">
                    <label className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center">
                      <input
                        type="checkbox"
                        checked={line.socketOutletLine === true}
                        title="Линия розеточная (вручную)"
                        onChange={(e) =>
                          updateLine(line.id, { socketOutletLine: e.target.checked })
                        }
                        className="h-5 w-5 rounded border-slate-600 bg-slate-950 text-orange-500 focus:ring-orange-500/30"
                      />
                    </label>
                  </td>
                  <td className="px-1 py-2 text-center">
                    <label className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center">
                      <input
                        type="checkbox"
                        checked={line.isWetZone}
                        title="Влажная зона"
                        onChange={(e) => updateLine(line.id, { isWetZone: e.target.checked })}
                        className="h-5 w-5 rounded border-slate-600 bg-slate-950 text-cyan-500 focus:ring-cyan-500/30"
                      />
                    </label>
                  </td>
                  <td className="px-1 py-2 text-center">
                    <label className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center">
                      <input
                        type="checkbox"
                        checked={line.isIncomerLine === true}
                        title="Линия ввода (противопожарное УЗО при P > 7 кВт)"
                        onChange={(e) =>
                          updateLine(line.id, {
                            isIncomerLine: e.target.checked ? true : undefined,
                          })
                        }
                        className="h-5 w-5 rounded border-slate-600 bg-slate-950 text-amber-500 focus:ring-amber-500/30"
                      />
                    </label>
                  </td>
                  <td className="px-1 py-2 text-center">
                    <select
                      title="Материал жил"
                      value={lineMaterialOrDefault(line.material)}
                      onChange={(e) =>
                        updateLine(line.id, {
                          material: e.target.value as ConductorMaterial,
                        })
                      }
                      className="max-w-[4.5rem] rounded border border-slate-700 bg-slate-950 py-2 pl-1 pr-0 text-center text-[11px] font-mono text-slate-200"
                    >
                      <option value="copper">Cu</option>
                      <option value="aluminum">Al</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    <input
                      type="text"
                      className="min-h-10 w-20 rounded border border-transparent bg-transparent px-1 py-1 font-mono text-slate-200 hover:border-slate-600 focus:border-yellow-500/60 focus:outline-none"
                      value={line.power}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value.replace(/\s/g, '').replace(',', '.'))
                        if (!Number.isNaN(v) && v > 0) {
                          updateLine(line.id, { power: v })
                        }
                      }}
                    />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">{line.voltage}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    <input
                      type="text"
                      className="min-h-10 w-14 rounded border border-transparent bg-transparent px-1 py-1 font-mono text-slate-200 hover:border-slate-600 focus:border-yellow-500/60 focus:outline-none"
                      value={line.cableLengthM ?? ''}
                      placeholder="—"
                      onChange={(e) => {
                        const raw = e.target.value.trim().replace(',', '.')
                        if (raw === '') {
                          updateLine(line.id, { cableLengthM: undefined })
                          return
                        }
                        const v = parseFloat(raw)
                        if (!Number.isNaN(v) && v > 0) {
                          updateLine(line.id, { cableLengthM: v })
                        }
                      }}
                    />
                  </td>
                  <td
                    className={`px-3 py-2 font-mono text-xs ${
                      dropBad ? 'font-semibold text-red-400' : 'text-slate-400'
                    }`}
                  >
                    {drop != null ? drop.toFixed(2) : '—'}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-300">
                    {line.calculatedAmps.toFixed(2)}
                  </td>
                  <td
                    className={`px-3 py-2 font-mono text-xs ${
                      line.socketOverloadRisk
                        ? 'rounded-sm bg-orange-500/15 font-semibold text-orange-400 ring-1 ring-orange-500/50'
                        : 'text-yellow-500'
                    }`}
                    title={`Мин. номинал УЗО по автомату: ≥ ${line.minRcdNominalA} А`}
                  >
                    {line.suggestedMCB}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-300">
                    {line.suggestedCable}
                  </td>
                  <td className="px-2 py-2">
                    <select
                      title={
                        line.suggestedRcdLeakageMa !== line.rcdLeakageMa
                          ? `Рекомендуется ${line.suggestedRcdLeakageMa} мА`
                          : 'Ток утечки УЗО'
                      }
                      value={line.rcdLeakageMa}
                      onChange={(e) =>
                        updateLine(line.id, {
                          rcdLeakageMa: Number(e.target.value) as RcdLeakageSensitivity,
                          rcdSensitivityUserSet: true,
                        })
                      }
                      className="max-w-[9rem] min-h-10 rounded border border-slate-700 bg-slate-950 py-2 pl-1 pr-0 text-[11px] text-slate-200"
                    >
                      <option value={10}>10</option>
                      <option value={30}>30</option>
                      <option value={100}>100</option>
                      <option value={300}>300</option>
                    </select>
                    {line.suggestedRcdLeakageMa !== line.rcdLeakageMa ? (
                      <div className="mt-0.5 text-[9px] text-slate-600">
                        реком. {line.suggestedRcdLeakageMa} мА
                      </div>
                    ) : null}
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => removeLine(line.id)}
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-slate-500 hover:bg-red-500/15 hover:text-red-400"
                      title="Удалить линию"
                      aria-label="Удалить линию"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="border-t border-slate-800 px-3 py-2 text-[10px] leading-relaxed text-slate-600 md:px-3">
        <span className="md:inline">
          Сечение по ряду: медь 1,5…35 мм²; алюминий 16…95 мм². При длине — ΔU ≤ {MAX_VOLTAGE_DROP_PERCENT}
          % и I_КЗ ≥ 10·I_ном (C). ρ Cu ≈ {RHO_COPPER}, ρ Al ≈ {RHO_ALUMINUM} Ом·мм²/м. Мин. номинал УЗО —
          ступень выше автомата.
        </span>
      </p>
    </div>
  )
}
