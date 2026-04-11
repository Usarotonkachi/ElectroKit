/**
 * BOM: сопоставление расчётного номинала автомата с полем nominal в каталоге.
 * Приоритет: точное совпадение nominal === suggestedMCB, иначе минимальный номинал ≥ suggestedMCB.
 */

import { minRcdNominalAmpsForMcb } from '@/domain/calculations'
import type { CatalogItem, ElectricalLine, RcdLeakageSensitivity } from '@/domain/types'

export interface BomLineRow {
  catalogId: string
  label: string
  brand: string
  series: string
  type: CatalogItem['type']
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface BomSummary {
  rows: BomLineRow[]
  totalRub: number
}

/**
 * Автомат: сначала MCB с nominal === suggestedMCB, иначе ближайший сверху.
 * Предпочтение бренда IEK ARMAT при равных номиналах (типовой склад РФ).
 */
export function findMcbForNominal(
  catalog: CatalogItem[],
  suggestedMCB: number
): CatalogItem | undefined {
  const mcbs = catalog.filter((c) => c.type === 'MCB')
  const exact = mcbs.filter((c) => c.nominal === suggestedMCB).sort((a, b) => {
    const pref = (x: CatalogItem) => (x.brand === 'IEK' && x.series === 'ARMAT' ? 0 : 1)
    return pref(a) - pref(b)
  })
  if (exact.length > 0) return exact[0]

  const sorted = [...mcbs].sort((a, b) => a.nominal - b.nominal)
  return sorted.find((c) => c.nominal >= suggestedMCB) ?? sorted[sorted.length - 1]
}

export function findRcd(
  catalog: CatalogItem[],
  sensitivityMa: RcdLeakageSensitivity,
  minNominal: number
): CatalogItem | undefined {
  const rcds = catalog
    .filter((c) => c.type === 'RCD' && c.sensitivityMa === sensitivityMa)
    .sort((a, b) => a.nominal - b.nominal)
  if (rcds.length === 0) return undefined
  return rcds.find((c) => c.nominal >= minNominal) ?? rcds[rcds.length - 1]
}

export function buildBomFromLines(lines: ElectricalLine[], catalog: CatalogItem[]): BomSummary {
  const counts = new Map<string, { item: CatalogItem; qty: number }>()

  function addItem(item: CatalogItem | undefined) {
    if (!item) return
    const prev = counts.get(item.id)
    if (prev) prev.qty += 1
    else counts.set(item.id, { item, qty: 1 })
  }

  for (const line of lines) {
    const mcb = findMcbForNominal(catalog, line.suggestedMCB)
    addItem(mcb)

    const minRcd = minRcdNominalAmpsForMcb(line.suggestedMCB)
    addItem(findRcd(catalog, line.rcdLeakageMa, minRcd))
  }

  const rows: BomLineRow[] = [...counts.values()].map(({ item, qty }) => ({
    catalogId: item.id,
    label: `${item.brand} ${item.series} — ${item.type} ${item.nominal} А${
      item.sensitivityMa != null ? `, ${item.sensitivityMa} мА` : ''
    }, ${item.poleCount} пол.`,
    brand: item.brand,
    series: item.series,
    type: item.type,
    quantity: qty,
    unitPrice: item.price,
    lineTotal: item.price * qty,
  }))

  rows.sort((a, b) => a.brand.localeCompare(b.brand) || a.type.localeCompare(b.type))

  const totalRub = rows.reduce((s, r) => s + r.lineTotal, 0)
  return { rows, totalRub }
}
