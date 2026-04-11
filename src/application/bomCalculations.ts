/**
 * Агрегированная спецификация материалов (автоматы, УЗО, кабель) и смета по прайсу.
 */

import { lineMaterialOrDefault, minRcdNominalAmpsForMcb } from '@/domain/calculations'
import type { CatalogItem, ElectricalLine } from '@/domain/types'
import { findRcd } from './bomBuilder'

export type MaterialBomCategory = 'mcb' | 'rcd' | 'cable'

export interface CatalogPricesFile {
  meta?: { region?: string; note?: string }
  mcb: Record<string, { priceRub: number; note?: string }>
  rcd: Record<string, { priceRub: number; note?: string }>
  cablePerMeter: Record<string, { priceRub: number; note?: string }>
}

export interface MaterialBomRow {
  category: MaterialBomCategory
  aggregationKey: string
  label: string
  quantity: number
  unit: 'шт' | 'м'
  unitPriceRub: number | null
  lineTotalRub: number
}

export interface MaterialBomResult {
  rows: MaterialBomRow[]
  totalRub: number
  cableLinesWithoutLength: number
}

function mcbPolesForVoltage(line: ElectricalLine): 1 | 3 {
  return line.voltage === 230 ? 1 : 3
}

export function mcbAggregationKey(line: ElectricalLine): string {
  const p = mcbPolesForVoltage(line)
  return `c${line.suggestedMCB}-${p}p`
}

export function mcbDisplayLabel(line: ElectricalLine): string {
  const p = mcbPolesForVoltage(line)
  return `Автомат C${line.suggestedMCB} ${p}P`
}

function rcdAggregationKey(nominal: number, sensitivityMa: number): string {
  return `${nominal}-2p-${sensitivityMa}`
}

export function rcdDisplayLabel(nominal: number, sensitivityMa: number): string {
  const fire = sensitivityMa === 100 || sensitivityMa === 300 ? ' (пожарное)' : ''
  return `УЗО ${nominal} А, 2P, ${sensitivityMa} мА${fire}`
}

/** Ключ в catalogPrices.cablePerMeter */
export function cablePriceKey(line: ElectricalLine): string {
  const mat = lineMaterialOrDefault(line.material)
  const s = line.suggestedCable
  if (mat === 'aluminum') return `sip-2x${s}-al`
  const cores = line.voltage === 230 ? 3 : 5
  return `vvgng-${cores}x${s}-cu`
}

/** Подпись кабеля в спецификации (как в ТЗ) */
export function cableDisplayLabel(line: ElectricalLine): string {
  const mat = lineMaterialOrDefault(line.material)
  const s = line.suggestedCable
  if (mat === 'aluminum') return `СИП-4 2×${s} мм²`
  const cores = line.voltage === 230 ? 3 : 5
  return `ВВГнг-LS ${cores}×${s} мм²`
}

/** Длина с запасом 10 % для одной линии, м */
export function cableLengthWithReserveM(line: ElectricalLine): number | null {
  const L = line.cableLengthM
  if (L == null || L <= 0) return null
  return L * 1.1
}

function lookupMcbPrice(key: string, prices: CatalogPricesFile): number | null {
  const row = prices.mcb[key]
  return row != null ? row.priceRub : null
}

function lookupRcdPrice(key: string, prices: CatalogPricesFile): number | null {
  const row = prices.rcd[key]
  return row != null ? row.priceRub : null
}

function lookupCablePrice(key: string, prices: CatalogPricesFile): number | null {
  const row = prices.cablePerMeter[key]
  return row != null ? row.priceRub : null
}

/**
 * Обходит линии, суммирует автоматы (C + полюса), УЗО (по подбору из каталога), кабель (L+10 %).
 */
export function buildAggregatedMaterialBom(
  lines: ElectricalLine[],
  catalog: CatalogItem[],
  prices: CatalogPricesFile
): MaterialBomResult {
  const mcbMap = new Map<string, { label: string; qty: number }>()
  const rcdMap = new Map<string, { label: string; qty: number }>()
  const cableMap = new Map<string, { label: string; meters: number }>()

  let cableLinesWithoutLength = 0

  for (const line of lines) {
    const mk = mcbAggregationKey(line)
    const ml = mcbDisplayLabel(line)
    const prevM = mcbMap.get(mk)
    if (prevM) prevM.qty += 1
    else mcbMap.set(mk, { label: ml, qty: 1 })

    const minRcd = minRcdNominalAmpsForMcb(line.suggestedMCB)
    const rcdItem = findRcd(catalog, line.rcdLeakageMa, minRcd)
    const sm = rcdItem?.sensitivityMa
    if (rcdItem && sm != null) {
      const rk = rcdAggregationKey(rcdItem.nominal, sm)
      const rl = rcdDisplayLabel(rcdItem.nominal, sm)
      const prevR = rcdMap.get(rk)
      if (prevR) prevR.qty += 1
      else rcdMap.set(rk, { label: rl, qty: 1 })
    }

    const wire = cableLengthWithReserveM(line)
    if (wire != null) {
      const ck = cablePriceKey(line)
      const cl = cableDisplayLabel(line)
      const prevC = cableMap.get(ck)
      if (prevC) prevC.meters += wire
      else cableMap.set(ck, { label: cl, meters: wire })
    } else {
      cableLinesWithoutLength += 1
    }
  }

  const rows: MaterialBomRow[] = []

  const mcbKeys = [...mcbMap.keys()].sort()
  for (const key of mcbKeys) {
    const { label, qty } = mcbMap.get(key)!
    const unitPrice = lookupMcbPrice(key, prices)
    rows.push({
      category: 'mcb',
      aggregationKey: key,
      label,
      quantity: qty,
      unit: 'шт',
      unitPriceRub: unitPrice,
      lineTotalRub: unitPrice != null ? unitPrice * qty : 0,
    })
  }

  const rcdKeys = [...rcdMap.keys()].sort()
  for (const key of rcdKeys) {
    const { label, qty } = rcdMap.get(key)!
    const unitPrice = lookupRcdPrice(key, prices)
    rows.push({
      category: 'rcd',
      aggregationKey: key,
      label,
      quantity: qty,
      unit: 'шт',
      unitPriceRub: unitPrice,
      lineTotalRub: unitPrice != null ? unitPrice * qty : 0,
    })
  }

  const cableKeys = [...cableMap.keys()].sort()
  for (const key of cableKeys) {
    const { label, meters } = cableMap.get(key)!
    const unitPrice = lookupCablePrice(key, prices)
    const qty = Math.round(meters * 10) / 10
    rows.push({
      category: 'cable',
      aggregationKey: key,
      label,
      quantity: qty,
      unit: 'м',
      unitPriceRub: unitPrice,
      lineTotalRub: unitPrice != null ? Math.round(unitPrice * meters * 100) / 100 : 0,
    })
  }

  const totalRub = Math.round(rows.reduce((s, r) => s + r.lineTotalRub, 0))

  return { rows, totalRub, cableLinesWithoutLength }
}
