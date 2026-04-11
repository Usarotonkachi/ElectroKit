import { create } from 'zustand'
import { useMemo } from 'react'
import catalogJson from '@/data/catalog.json'
import catalogPricesJson from '@/data/catalogPrices.json'
import type { CatalogPricesFile } from '@/application/bomCalculations'
import { buildAggregatedMaterialBom } from '@/application/bomCalculations'
import {
  cableSizingExplanationHints,
  checkSafetyLimits,
  enrichElectricalLine,
  rcdFireProtectionHint,
  rcdWetZoneLeakageHint,
  socketGroupRcdHint,
  socketOutletOverloadHints,
  totalPowerW,
  voltageDropSevereHint,
} from '@/domain/calculations'
import type {
  AppliancePreset,
  CatalogItem,
  ConductorMaterial,
  ElectricalLine,
  ElectricalLineInput,
  LineVoltage,
  RcdLeakageSensitivity,
  Room,
} from '@/domain/types'

const catalog = catalogJson as CatalogItem[]
const catalogPrices = catalogPricesJson as CatalogPricesFile

function newId(): string {
  return crypto.randomUUID()
}

function draftFromLine(
  l: Pick<
    ElectricalLine,
    | 'id'
    | 'roomId'
    | 'name'
    | 'power'
    | 'voltage'
    | 'isWetZone'
    | 'isIncomerLine'
    | 'rcdSensitivityUserSet'
    | 'rcdLeakageMa'
    | 'cableLengthM'
    | 'socketOutletLine'
    | 'material'
  >
): ElectricalLineInput {
  return {
    id: l.id,
    roomId: l.roomId,
    name: l.name,
    power: l.power,
    voltage: l.voltage,
    isWetZone: l.isWetZone,
    isIncomerLine: l.isIncomerLine,
    rcdSensitivityUserSet: l.rcdSensitivityUserSet,
    rcdLeakageMa: l.rcdLeakageMa,
    cableLengthM: l.cableLengthM,
    socketOutletLine: l.socketOutletLine,
    material: l.material,
  }
}

/** Пресеты бытовых приборов (мощность в Вт) */
export const APPLIANCE_PRESETS: AppliancePreset[] = [
  { name: 'Стиральная машина', defaultPower: 2500, isWetZone: true },
  { name: 'Розетки (группа)', defaultPower: 2200, isWetZone: false },
  { name: 'Кондиционер', defaultPower: 1500, isWetZone: false },
  { name: 'Электродуховка / плита', defaultPower: 3500, isWetZone: false },
  { name: 'Общее освещение', defaultPower: 500, isWetZone: false },
]

const initialRooms: Room[] = (() => {
  const id = newId()
  return [{ id, name: 'Кухня' }]
})()

interface ElectroState {
  rooms: Room[]
  lines: ElectricalLine[]
  lineVoltage: LineVoltage
  activeRoomId: string | null

  setVoltage: (v: LineVoltage) => void
  setActiveRoom: (id: string | null) => void
  addRoom: (name?: string) => void
  removeRoom: (roomId: string) => void
  renameRoom: (roomId: string, name: string) => void

  addLine: (
    roomId: string,
    input: {
      name: string
      powerW: number
      isWetZone: boolean
      isIncomerLine?: boolean
      cableLengthM?: number
      socketOutletLine?: boolean
      material?: ConductorMaterial
      rcdSensitivityUserSet?: boolean
      rcdLeakageMa?: RcdLeakageSensitivity
    }
  ) => void
  removeLine: (lineId: string) => void
  updateLine: (
    lineId: string,
    patch: Partial<
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
  ) => void
}

export const useElectroStore = create<ElectroState>((set, get) => ({
  rooms: initialRooms,
  lines: [],
  lineVoltage: 230,
  activeRoomId: initialRooms[0]?.id ?? null,

  setVoltage: (v) =>
    set((s) => ({
      lineVoltage: v,
      lines: s.lines.map((l) =>
        enrichElectricalLine({
          ...draftFromLine({ ...l, voltage: v }),
        })
      ),
    })),

  setActiveRoom: (id) => set({ activeRoomId: id }),

  addRoom: (name) => {
    const id = newId()
    set((s) => ({
      rooms: [...s.rooms, { id, name: name ?? `Помещение ${s.rooms.length + 1}` }],
      activeRoomId: id,
    }))
  },

  removeRoom: (roomId) =>
    set((s) => {
      const rooms = s.rooms.filter((r) => r.id !== roomId)
      const nextRooms = rooms.length ? rooms : [{ id: newId(), name: 'Помещение 1' }]
      const lines = s.lines.filter((l) => l.roomId !== roomId)
      return {
        rooms: nextRooms,
        lines,
        activeRoomId:
          s.activeRoomId === roomId ? nextRooms[0]?.id ?? null : s.activeRoomId,
      }
    }),

  renameRoom: (roomId, name) =>
    set((s) => ({
      rooms: s.rooms.map((r) => (r.id === roomId ? { ...r, name } : r)),
    })),

  addLine: (roomId, input) => {
    const v = get().lineVoltage
    const line = enrichElectricalLine({
      id: newId(),
      roomId,
      name: input.name,
      power: input.powerW,
      voltage: v,
      isWetZone: input.isWetZone,
      isIncomerLine: input.isIncomerLine,
      cableLengthM: input.cableLengthM,
      socketOutletLine: input.socketOutletLine,
      material: input.material,
      rcdSensitivityUserSet: input.rcdSensitivityUserSet,
      rcdLeakageMa: input.rcdLeakageMa,
    })
    set((s) => ({ lines: [...s.lines, line] }))
  },

  removeLine: (lineId) =>
    set((s) => ({
      lines: s.lines.filter((l) => l.id !== lineId),
    })),

  updateLine: (lineId, patch) =>
    set((s) => {
      const v = s.lineVoltage
      return {
        lines: s.lines.map((l) => {
          if (l.id !== lineId) return l
          const merged = { ...l, ...patch }
          return enrichElectricalLine({
            ...draftFromLine({
              id: merged.id,
              roomId: merged.roomId,
              name: merged.name,
              power: merged.power,
              voltage: v,
              isWetZone: merged.isWetZone,
              isIncomerLine: merged.isIncomerLine,
              rcdSensitivityUserSet: merged.rcdSensitivityUserSet,
              rcdLeakageMa: merged.rcdLeakageMa,
              cableLengthM: merged.cableLengthM,
              socketOutletLine: merged.socketOutletLine,
              material: merged.material,
            }),
          })
        }),
      }
    }),
}))

export function getCatalog(): CatalogItem[] {
  return catalog
}

export function useTotalPowerW(): number {
  const lines = useElectroStore((s) => s.lines)
  return useMemo(() => totalPowerW(lines), [lines])
}

export function useMaterialBom() {
  const lines = useElectroStore((s) => s.lines)
  return useMemo(
    () => buildAggregatedMaterialBom(lines, catalog, catalogPrices),
    [lines]
  )
}

export function useSafetyWarning() {
  const lines = useElectroStore((s) => s.lines)
  const lineVoltage = useElectroStore((s) => s.lineVoltage)
  return useMemo(
    () => checkSafetyLimits(totalPowerW(lines), lineVoltage),
    [lines, lineVoltage]
  )
}

/** Мягкие подсказки: УЗО для розеток, розетки >16А, пояснения к сечению, критическое ΔU */
export function useSmartHints(): string[] {
  const lines = useElectroStore((s) => s.lines)
  return useMemo(() => {
    const out: string[] = []
    const wetRcd = rcdWetZoneLeakageHint(lines)
    if (wetRcd) out.push(wetRcd)
    const fireRcd = rcdFireProtectionHint(lines)
    if (fireRcd) out.push(fireRcd)
    const rcd = socketGroupRcdHint(lines)
    if (rcd) out.push(rcd)
    out.push(...socketOutletOverloadHints(lines))
    out.push(...cableSizingExplanationHints(lines))
    const vd = voltageDropSevereHint(lines)
    if (vd) out.push(vd)
    return out
  }, [lines])
}
