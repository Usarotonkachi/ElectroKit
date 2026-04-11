import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Bolt } from 'lucide-react'
import { computeSuggestedRcdLeakageMa } from '@/domain/calculations'
import type { ConductorMaterial, RcdLeakageSensitivity } from '@/domain/types'
import { APPLIANCE_PRESETS, useElectroStore } from '@/store/useElectroStore'

export function AddElectricalLine() {
  const rooms = useElectroStore((s) => s.rooms)
  const activeRoomId = useElectroStore((s) => s.activeRoomId)
  const addLine = useElectroStore((s) => s.addLine)

  const roomId = activeRoomId ?? rooms[0]?.id
  const [name, setName] = useState('')
  const [powerW, setPowerW] = useState('1000')
  const [lengthM, setLengthM] = useState('')
  const [wetZone, setWetZone] = useState(false)
  const [incomerLine, setIncomerLine] = useState(false)
  const [socketOutletLine, setSocketOutletLine] = useState(false)
  const [material, setMaterial] = useState<ConductorMaterial>('copper')
  const [rcdLeakageMa, setRcdLeakageMa] = useState<RcdLeakageSensitivity>(30)
  const [rcdUserLocked, setRcdUserLocked] = useState(false)

  const powerN = useMemo(() => {
    const p = parseFloat(powerW.replace(/\s/g, '').replace(',', '.'))
    return Number.isNaN(p) || p <= 0 ? 0 : p
  }, [powerW])

  const suggestedFromForm = useMemo(
    () =>
      computeSuggestedRcdLeakageMa({
        name,
        power: powerN,
        isWetZone: wetZone,
        isIncomerLine: incomerLine,
      }),
    [name, powerN, wetZone, incomerLine]
  )

  useEffect(() => {
    if (!rcdUserLocked) setRcdLeakageMa(suggestedFromForm)
  }, [suggestedFromForm, rcdUserLocked])

  if (!roomId) {
    return (
      <p className="text-sm text-slate-500">Создайте помещение, чтобы добавить линию.</p>
    )
  }

  function applyPreset(index: number) {
    const p = APPLIANCE_PRESETS[index]
    if (p) {
      setName(p.name)
      setPowerW(String(p.defaultPower))
      setWetZone(p.isWetZone)
      setSocketOutletLine(/розетк/i.test(p.name))
      setRcdUserLocked(false)
      setIncomerLine(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const p = parseFloat(powerW.replace(/\s/g, '').replace(',', '.'))
    if (Number.isNaN(p) || p <= 0) return
    const lenRaw = lengthM.trim().replace(',', '.')
    const len = lenRaw === '' ? undefined : parseFloat(lenRaw)
    if (len !== undefined && (Number.isNaN(len) || len <= 0)) return
    const nameTrim = name.trim() || 'Линия'
    addLine(roomId, {
      name: nameTrim,
      powerW: p,
      isWetZone: wetZone,
      isIncomerLine: incomerLine || undefined,
      cableLengthM: len,
      socketOutletLine: socketOutletLine ? true : undefined,
      material,
      rcdSensitivityUserSet: rcdUserLocked,
      ...(rcdUserLocked ? { rcdLeakageMa } : {}),
    })
    setName('')
    setPowerW('1000')
    setLengthM('')
    setWetZone(false)
    setIncomerLine(false)
    setSocketOutletLine(false)
    setMaterial('copper')
    setRcdUserLocked(false)
    setRcdLeakageMa(30)
  }

  return (
    <div className="rounded-md border border-slate-800 bg-slate-900/80 p-4 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100">
        <Bolt className="h-4 w-4 text-yellow-500" />
        Новая электрическая линия
      </h3>

      <p className="mb-3 text-xs text-slate-500">Пресеты — типовая мощность (Вт) и влажная зона</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {APPLIANCE_PRESETS.map((p, i) => (
          <button
            key={p.name}
            type="button"
            onClick={() => applyPreset(i)}
            className="min-h-11 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-yellow-500/50 hover:text-yellow-500/90 md:min-h-0 md:py-1.5"
          >
            {p.name} ({p.defaultPower} Вт)
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-slate-500">
            Наименование линии
            <input
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: розетки кухня"
            />
          </label>
          <label className="block text-xs text-slate-500">
            Мощность, Вт
            <input
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100"
              value={powerW}
              onChange={(e) => setPowerW(e.target.value)}
              inputMode="numeric"
            />
          </label>
        </div>

        <label className="block text-xs text-slate-500">
          Длина линии, м (необязательно; для оценки ΔU на длинных трассах)
          <input
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 sm:max-w-xs"
            value={lengthM}
            onChange={(e) => setLengthM(e.target.value)}
            placeholder="Например: 60"
            inputMode="decimal"
          />
        </label>

        <div>
          <span className="mb-1.5 block text-xs text-slate-500">Материал кабеля</span>
          <div className="inline-flex rounded-md border border-slate-700 bg-slate-950 p-0.5">
            <button
              type="button"
              onClick={() => setMaterial('copper')}
              className={`min-h-11 rounded px-4 py-2 text-xs font-medium transition md:min-h-0 md:px-3 md:py-1.5 ${
                material === 'copper'
                  ? 'bg-slate-200 text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Медь
            </button>
            <button
              type="button"
              onClick={() => setMaterial('aluminum')}
              className={`min-h-11 rounded px-4 py-2 text-xs font-medium transition md:min-h-0 md:px-3 md:py-1.5 ${
                material === 'aluminum'
                  ? 'bg-slate-200 text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Алюминий
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={socketOutletLine}
            onChange={(e) => setSocketOutletLine(e.target.checked)}
            className="rounded border-slate-600 bg-slate-950 text-orange-500 focus:ring-orange-500/40"
          />
          Розеточная линия (если в названии нет слова «розетк»)
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={wetZone}
            onChange={(e) => setWetZone(e.target.checked)}
            className="rounded border-slate-600 bg-slate-950 text-yellow-500 focus:ring-yellow-500/40"
          />
          Влажная зона (рекомендуется УЗО 10 мА)
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={incomerLine}
            onChange={(e) => setIncomerLine(e.target.checked)}
            className="rounded border-slate-600 bg-slate-950 text-amber-500 focus:ring-amber-500/40"
          />
          Линия ввода (после главного автомата); при P &gt; 7 кВт — противопожарное УЗО 100/300 мА
        </label>

        <div className="rounded-md border border-slate-800 bg-slate-950/80 px-3 py-2">
          <label className="block text-xs text-slate-500">
            Ток утечки УЗО, мА
            <select
              value={rcdLeakageMa}
              onChange={(e) => {
                setRcdUserLocked(true)
                setRcdLeakageMa(Number(e.target.value) as RcdLeakageSensitivity)
              }}
              className="mt-1 w-full max-w-xs rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-200"
            >
              <option value={10}>10 (влажные зоны, персональная защита)</option>
              <option value={30}>30 (розетки, освещение)</option>
              <option value={100}>100 (противопожарное на вводе)</option>
              <option value={300}>300 (противопожарное, селективность)</option>
            </select>
          </label>
          <p className="mt-2 text-[10px] text-slate-600">
            Автоподбор: ключевые слова в названии (ванна, санузел, стирал…), влажная зона → 10 мА; иначе 30 мА;
            ввод &gt;7 кВт → 100 мА. Рекомендуемый номинал УЗО по току — на ступень выше автомата линии.
          </p>
          {!rcdUserLocked ? (
            <p className="mt-1 text-[10px] text-slate-500">
              Сейчас: {suggestedFromForm} мА (по правилам). Смените значение в списке, чтобы зафиксировать вручную.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setRcdUserLocked(false)}
              className="mt-2 text-[10px] text-yellow-600/90 underline hover:text-yellow-500"
            >
              Снова подставлять УЗО автоматически
            </button>
          )}
        </div>

        <button
          type="submit"
          className="min-h-12 w-full rounded-md bg-slate-100 py-3 text-sm font-semibold text-slate-900 shadow hover:bg-white md:min-h-0 md:w-auto md:py-2.5 md:px-6"
        >
          Добавить линию в текущее помещение
        </button>
      </form>
    </div>
  )
}
