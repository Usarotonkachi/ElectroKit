import type { MaterialBomCategory } from '@/application/bomCalculations'
import { useMaterialBom } from '@/store/useElectroStore'
import { ClipboardList } from 'lucide-react'

const categoryTitle: Record<MaterialBomCategory, string> = {
  mcb: 'Автоматические выключатели',
  rcd: 'Устройства защитного отключения (УЗО)',
  cable: 'Кабель (длина с запасом 10 %)',
}

function formatQty(q: number, unit: 'шт' | 'м'): string {
  if (unit === 'шт') return String(Math.round(q))
  return q % 1 === 0 ? String(q) : q.toFixed(1)
}

export function BomTable() {
  const bom = useMaterialBom()
  const { rows, totalRub, cableLinesWithoutLength } = bom

  const mcbRows = rows.filter((r) => r.category === 'mcb')
  const rcdRows = rows.filter((r) => r.category === 'rcd')
  const cableRows = rows.filter((r) => r.category === 'cable')

  const sections: { cat: MaterialBomCategory; list: typeof rows }[] = [
    { cat: 'mcb', list: mcbRows },
    { cat: 'rcd', list: rcdRows },
    { cat: 'cable', list: cableRows },
  ]

  const hasMissingPrices = rows.some((r) => r.unitPriceRub == null)

  return (
    <div className="w-full max-md:-mx-4 max-md:rounded-none max-md:border-x-0 md:rounded-md md:border md:border-slate-800 md:bg-slate-900/80 md:p-4 md:shadow-sm">
      <div className="border-b border-slate-800 bg-slate-900/90 px-4 py-3 md:border-0 md:bg-transparent md:p-0">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-100">
          <ClipboardList className="h-4 w-4 shrink-0 text-yellow-500" />
          Итоговая спецификация и смета
        </h3>
        <p className="text-xs text-slate-500 md:mb-4">
          Сводка по линиям: автоматы по номиналу и полюсам, УЗО по номиналу и утечке, кабель по сечению и
          материалу.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-4 text-sm text-slate-500 md:px-0">Нет позиций — добавьте линии нагрузки.</p>
      ) : (
        <>
          {/* Компактный список на мобильных */}
          <div className="space-y-1 px-2 pb-2 md:hidden">
            {sections.flatMap(({ cat, list }) =>
              list.length === 0
                ? []
                : [
                    <p
                      key={`h-${cat}`}
                      className="px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                    >
                      {categoryTitle[cat]}
                    </p>,
                    ...list.map((row) => (
                      <div
                        key={`${row.category}-${row.aggregationKey}`}
                        className="flex flex-col gap-1 rounded-md border border-slate-800/80 bg-slate-950/60 px-3 py-2.5"
                      >
                        <span className="text-sm text-slate-200">{row.label}</span>
                        <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                          <span className="font-mono text-slate-400">
                            {formatQty(row.quantity, row.unit)} {row.unit}
                            {row.unitPriceRub != null ? (
                              <span className="text-slate-600"> × {row.unitPriceRub.toLocaleString('ru-RU')} ₽</span>
                            ) : null}
                          </span>
                          <span className="font-mono font-medium text-yellow-500/95">
                            {row.unitPriceRub != null
                              ? `${row.lineTotalRub.toLocaleString('ru-RU')} ₽`
                              : '—'}
                          </span>
                        </div>
                      </div>
                    )),
                  ]
            )}
          </div>

          {/* Таблица на md+ */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase text-slate-500">
                  <th className="px-3 py-2 font-medium">Группа / наименование</th>
                  <th className="px-3 py-2 text-right font-medium">Кол-во</th>
                  <th className="px-3 py-2 text-right font-medium">Ед.</th>
                  <th className="px-3 py-2 text-right font-medium">Цена, ₽</th>
                  <th className="px-3 py-2 text-right font-medium">Сумма, ₽</th>
                </tr>
              </thead>
              <tbody>
                {sections.flatMap(({ cat, list }) =>
                  list.length === 0
                    ? []
                    : [
                        <tr key={`h-${cat}`} className="bg-slate-800/40">
                          <td
                            colSpan={5}
                            className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400"
                          >
                            {categoryTitle[cat]}
                          </td>
                        </tr>,
                        ...list.map((row) => (
                          <tr
                            key={`${row.category}-${row.aggregationKey}`}
                            className="border-b border-slate-800/60"
                          >
                            <td className="px-3 py-2 pl-5 text-slate-200">{row.label}</td>
                            <td className="px-3 py-2 text-right font-mono text-slate-300">
                              {formatQty(row.quantity, row.unit)}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-500">{row.unit}</td>
                            <td className="px-3 py-2 text-right font-mono text-slate-500">
                              {row.unitPriceRub != null
                                ? row.unitPriceRub.toLocaleString('ru-RU')
                                : '—'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-medium text-yellow-500/95">
                              {row.unitPriceRub != null
                                ? row.lineTotalRub.toLocaleString('ru-RU')
                                : '—'}
                            </td>
                          </tr>
                        )),
                      ]
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 border-t border-slate-800 px-4 py-3 text-sm md:mt-4 md:px-0 md:pt-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-end sm:gap-x-2">
              <span className="text-slate-400">
                Ориентировочная стоимость материалов (РФ, розница):
              </span>
              <span className="font-mono text-lg font-semibold text-slate-100">
                {totalRub.toLocaleString('ru-RU')} руб.
              </span>
            </div>
            {cableRows.length === 0 && rows.length > 0 ? (
              <p className="text-xs text-slate-500 sm:text-right">
                В смете нет кабеля: задайте длину линии (м) в таблице — учтётся L + 10 % запаса.
              </p>
            ) : null}
            {cableLinesWithoutLength > 0 && cableRows.length > 0 ? (
              <p className="text-xs text-slate-500 sm:text-right">
                Линий без указанной длины кабеля: {cableLinesWithoutLength} (в смету по кабелю не входят).
              </p>
            ) : null}
            {hasMissingPrices ? (
              <p className="text-[11px] text-amber-600/90 sm:text-right">
                Для части позиций нет цены в прайсе — в итоге они не учтены (сумма «—»).
              </p>
            ) : null}
          </div>

          <p className="border-t border-slate-800 px-4 py-3 text-[10px] leading-relaxed text-slate-600 md:mt-3 md:border-0 md:px-0 md:py-0 md:pt-0">
            Цены являются ориентировочными и могут отличаться в магазинах. Расчёт длины кабеля включает 10 %
            запас.
          </p>
        </>
      )}
    </div>
  )
}
