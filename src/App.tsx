import { useEffect, useState } from 'react'
import { Bolt, Menu } from 'lucide-react'
import { AddElectricalLine } from '@/components/AddElectricalLine'
import { BomTable } from '@/components/BomTable'
import { LineCalculationsTable } from '@/components/LineCalculationsTable'
import { RoomsListPanel, SidebarRooms } from '@/components/SidebarRooms'
import { SafetyCheckBanner } from '@/components/SafetyCheckBanner'
import { SchematicView } from '@/components/SchematicView'
import { SmartHintsBanner } from '@/components/SmartHintsBanner'
import { VoltageSelector } from '@/components/VoltageSelector'
import { useElectroStore, useSafetyWarning, useTotalPowerW } from '@/store/useElectroStore'

export default function App() {
  const lineVoltage = useElectroStore((s) => s.lineVoltage)
  const safety = useSafetyWarning()
  const totalW = useTotalPowerW()
  const totalKw = totalW / 1000
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    if (!mobileNavOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileNavOpen])

  const voltageLabel =
    lineVoltage === 230 ? 'однофазный ввод (7 кВт)' : 'трёхфазный ввод (15 кВт)'

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-50 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/95 px-3 py-2.5 backdrop-blur-md supports-[backdrop-filter]:bg-slate-900/90 sm:px-4 lg:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md border border-slate-700 bg-slate-950 text-slate-200 lg:hidden"
            aria-label="Открыть меню помещений"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-yellow-500/40 bg-slate-950 text-yellow-500">
            <Bolt className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight text-slate-50 sm:text-lg">
              ElectroKit
            </h1>
            <p className="hidden truncate text-xs text-slate-500 sm:block">
              Щит жилого объекта — ПУЭ-7, ориентиры РФ
            </p>
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto sm:flex-nowrap">
          <VoltageSelector />
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Bolt className="h-4 w-4 shrink-0 text-yellow-500" />
            <span>
              ΣP:{' '}
              <span className="font-mono font-semibold text-slate-100">
                {totalKw.toFixed(2)} кВт
              </span>
            </span>
          </div>
        </div>
      </header>

      <SafetyCheckBanner warning={safety} voltageLabel={voltageLabel} />
      <SmartHintsBanner />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <SidebarRooms />
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 lg:px-6 lg:py-6">
          <div className="mx-auto max-w-5xl space-y-6">
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Расчёт по линиям
              </h2>
              <LineCalculationsTable />
            </section>

            <section>
              <BomTable />
            </section>

            <section>
              <AddElectricalLine />
            </section>

            <section>
              <SchematicView />
            </section>
          </div>
        </main>
      </div>

      {/* Мобильный drawer помещений (< lg) */}
      <div
        className={`fixed inset-0 z-[60] lg:hidden ${mobileNavOpen ? '' : 'pointer-events-none'}`}
        aria-hidden={!mobileNavOpen}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${
            mobileNavOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setMobileNavOpen(false)}
          aria-label="Закрыть меню"
        />
        <aside
          className={`absolute left-0 top-0 z-[70] flex h-full w-[min(18rem,100vw)] flex-col border-r border-slate-800 bg-slate-950 shadow-2xl transition-transform duration-200 ease-out ${
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <RoomsListPanel onRequestClose={() => setMobileNavOpen(false)} />
        </aside>
      </div>
    </div>
  )
}
