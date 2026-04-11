/**
 * Инженерная логика расчётов.
 * Однофазный: I = P / (U·cos φ). Трёхфазный (симметричная нагрузка): I = P / (√3·U·cos φ).
 */

import type {
  ConductorMaterial,
  ElectricalLine,
  ElectricalLineInput,
  LineVoltage,
  RcdLeakageSensitivity,
  Room,
  SafetyWarning,
} from './types'

const SQRT3 = Math.sqrt(3)

/** cos φ по умолчанию для бытовых нагрузок */
export const DEFAULT_COS_PHI = 0.95

/** Стандартные номиналы модульных автоматов, А */
export const STANDARD_MCB_AMPS = [6, 10, 16, 20, 25, 32, 40, 50, 63] as const

/** Удельное сопротивление при ~20 °C, Ом·мм²/м (для R = ρ·L/S) */
export const RHO_COPPER = 0.017
export const RHO_ALUMINUM = 0.028

/** γ = 1/ρ, м/(Ом·мм²); для меди — совместимость с прежними формулами */
export const COPPER_CONDUCTIVITY_GAMMA = 1 / RHO_COPPER

/** Ряд сечений меди ВВГ, мм² */
export const CABLE_SECTION_SCHEDULE_COPPER = [1.5, 2.5, 4, 6, 10, 16, 25, 35] as const

/** Ряд сечений алюминия (СИП / воздушные линии, ПУЭ), минимум 16 мм² */
export const CABLE_SECTION_SCHEDULE_ALUMINUM = [16, 25, 35, 50, 70, 95] as const

/** @deprecated используйте CABLE_SECTION_SCHEDULE_COPPER */
export const CABLE_SECTION_SCHEDULE = CABLE_SECTION_SCHEDULE_COPPER

export function resistivityOhmMm2PerM(material: ConductorMaterial): number {
  return material === 'aluminum' ? RHO_ALUMINUM : RHO_COPPER
}

export function cableSectionSchedule(material: ConductorMaterial): readonly number[] {
  return material === 'aluminum' ? CABLE_SECTION_SCHEDULE_ALUMINUM : CABLE_SECTION_SCHEDULE_COPPER
}

export function lineMaterialOrDefault(material?: ConductorMaterial): ConductorMaterial {
  return material ?? 'copper'
}

/** Допустимое падение напряжения в линии, % (ориентир для освещения/розеток по практике) */
export const MAX_VOLTAGE_DROP_PERCENT = 5

/**
 * Расчётный ток, А.
 * @param powerW — активная мощность, Вт
 * @param voltage — 230 В (1ф) или 400 В линейное (3ф)
 */
export function calculateCurrent(
  powerW: number,
  voltage: LineVoltage,
  cosPhi: number = DEFAULT_COS_PHI
): number {
  if (powerW <= 0 || cosPhi <= 0) return 0
  if (voltage === 230) {
    return powerW / (230 * cosPhi)
  }
  return powerW / (SQRT3 * 400 * cosPhi)
}

/**
 * Подбор автомата: минимальный стандартный номинал ≥ I·1,13 (требование к отключающей способности/селективности в MVP).
 */
export function getSuggestedMCB(current: number): number {
  const required = current * 1.13
  for (const rating of STANDARD_MCB_AMPS) {
    if (rating >= required) return rating
  }
  return STANDARD_MCB_AMPS[STANDARD_MCB_AMPS.length - 1]
}

/**
 * Сечение меди **VVGнг(A)-LS** по номиналу линейного автомата (квартирная проводка, РФ).
 *
 * Ориентиры: **ПУЭ-7**, табл. 6.1.3-3 (допустимые длительные токи для медных жил при +25 °C;
 * скрытая установка, одна жила в пучке — типовой случай). Номинал автомата не должен
 * превышать допустимый ток кабеля; здесь подбирается **минимальное стандартное сечение**,
 * удовлетворяющее этой связке в бытовой практике (не замена проектного расчёта по длине линии,
 * способу прокладки и группе).
 *
 * Типовая связка «автомат → VVGнг» для щитовых линий: 10 А — 1,5 мм²; 16 А — 2,5 мм²;
 * 20–25 А — 4 мм²; 32 А — 6 мм²; 40–50 А — 10 мм²; 63 А — 16 мм².
 */
/**
 * Минимальное сечение по номиналу АВ и материалу (нагрев; алюминий — ниже допустимый ток при том же S).
 * Алюминий: ряд с 16 мм² (типично СИП/ВЛ).
 */
export function getSuggestedCable(
  mcbRating: number,
  material: ConductorMaterial = 'copper'
): number {
  if (mcbRating <= 0) {
    return material === 'aluminum' ? 16 : 1.5
  }
  if (material === 'aluminum') {
    if (mcbRating <= 10) return 16
    if (mcbRating <= 16) return 25
    if (mcbRating <= 25) return 35
    if (mcbRating <= 32) return 50
    if (mcbRating <= 50) return 70
    return 95
  }
  if (mcbRating <= 10) return 1.5
  if (mcbRating <= 16) return 2.5
  if (mcbRating <= 25) return 4
  if (mcbRating <= 32) return 6
  if (mcbRating <= 50) return 10
  return 16
}

/**
 * Падение напряжения в линии, В (активная составляющая).
 * Однофазная 230 В: ΔU = 2·ρ·P·L / (S·U); эквивалентно 2·P·L / (γ·S·U), γ = 1/ρ.
 */
export function calculateVoltageDropVolts(
  powerW: number,
  lengthM: number,
  sectionMm2: number,
  lineVoltage: LineVoltage,
  material: ConductorMaterial = 'copper'
): number {
  if (powerW <= 0 || lengthM <= 0 || sectionMm2 <= 0) return 0
  const g = 1 / resistivityOhmMm2PerM(material)
  if (lineVoltage === 230) {
    return (2 * powerW * lengthM) / (g * sectionMm2 * 230)
  }
  return (SQRT3 * powerW * lengthM) / (g * sectionMm2 * 400)
}

export function voltageDropPercent(
  powerW: number,
  lengthM: number,
  sectionMm2: number,
  lineVoltage: LineVoltage,
  material: ConductorMaterial = 'copper'
): number {
  const u = lineVoltage === 230 ? 230 : 400
  const dU = calculateVoltageDropVolts(powerW, lengthM, sectionMm2, lineVoltage, material)
  return (dU / u) * 100
}

function nextLargerCableSection(
  sectionMm2: number,
  material: ConductorMaterial
): number | null {
  const sched = cableSectionSchedule(material)
  const idx = sched.findIndex((s) => s >= sectionMm2)
  if (idx === -1) return null
  return sched[idx + 1] ?? null
}

function normalizeSectionToSchedule(
  minFromMcb: number,
  material: ConductorMaterial
): number {
  const sched = cableSectionSchedule(material)
  const found = sched.find((s) => s >= minFromMcb)
  return found ?? sched[sched.length - 1]
}

/**
 * Оценка тока КЗ в конце линии (петля «фаза—Н»): R = 2·L/(γ·S), I_sc = U/R.
 */
export const SHORT_CIRCUIT_CALC_VOLTAGE = 230

/** Автомат C: ориентир для электромагнитного расцепителя — не ниже **10·In**. */
export const C_CURVE_MAGNETIC_MIN_FACTOR = 10

/** Активное сопротивление петли «туда—обратно», Ом: R = 2·ρ·L / S */
export function lineLoopResistanceOhm(
  lengthM: number,
  sectionMm2: number,
  material: ConductorMaterial = 'copper'
): number {
  if (lengthM <= 0 || sectionMm2 <= 0) return Number.POSITIVE_INFINITY
  const rho = resistivityOhmMm2PerM(material)
  return (2 * rho * lengthM) / sectionMm2
}

export function shortCircuitEndLineCurrentA(
  lengthM: number,
  sectionMm2: number,
  material: ConductorMaterial = 'copper'
): number {
  const R = lineLoopResistanceOhm(lengthM, sectionMm2, material)
  if (!Number.isFinite(R) || R <= 0) return Number.POSITIVE_INFINITY
  return SHORT_CIRCUIT_CALC_VOLTAGE / R
}

export function isShortCircuitSufficientForCCurve(
  iscA: number,
  mcbNominalA: number
): boolean {
  if (mcbNominalA <= 0) return true
  return iscA >= C_CURVE_MAGNETIC_MIN_FACTOR * mcbNominalA
}

/** @deprecated используйте isShortCircuitSufficientForCCurve */
export function isShortCircuitBelowCCurveMagnetic(
  iscA: number,
  mcbNominalA: number
): boolean {
  return !isShortCircuitSufficientForCCurve(iscA, mcbNominalA)
}

export interface CableResolution {
  suggestedCable: number
  voltageDropPercent: number | undefined
  cableUpsizedForVoltageDrop: boolean
  cableUpsizedForShortCircuit: boolean
  scProtectionUnsatisfiedAtMaxCable: boolean
  voltageDropUnsatisfiedAtMaxCable: boolean
}

/**
 * Подбор сечения по ряду: одновременно ΔU ≤ 5% и I_sc ≥ 10·In (характеристика C).
 * При невозможности — максимальное сечение из ряда и флаги «критической» ситуации.
 */
export function resolveCableWithVoltageDrop(
  mcbRating: number,
  powerW: number,
  lineVoltage: LineVoltage,
  cableLengthM: number | undefined,
  material: ConductorMaterial = 'copper'
): CableResolution {
  const minByMcb = getSuggestedCable(mcbRating, material)
  let s = normalizeSectionToSchedule(minByMcb, material)

  const empty = (): CableResolution => ({
    suggestedCable: s,
    voltageDropPercent: undefined,
    cableUpsizedForVoltageDrop: false,
    cableUpsizedForShortCircuit: false,
    scProtectionUnsatisfiedAtMaxCable: false,
    voltageDropUnsatisfiedAtMaxCable: false,
  })

  if (cableLengthM == null || cableLengthM <= 0) {
    return empty()
  }

  let upsizedVd = false
  let upsizedSc = false

  while (true) {
    const vd = voltageDropPercent(powerW, cableLengthM, s, lineVoltage, material)
    const vdOk = vd <= MAX_VOLTAGE_DROP_PERCENT
    const isc = shortCircuitEndLineCurrentA(cableLengthM, s, material)
    const scOk = isShortCircuitSufficientForCCurve(isc, mcbRating)

    if (vdOk && scOk) {
      return {
        suggestedCable: s,
        voltageDropPercent: vd,
        cableUpsizedForVoltageDrop: upsizedVd,
        cableUpsizedForShortCircuit: upsizedSc,
        scProtectionUnsatisfiedAtMaxCable: false,
        voltageDropUnsatisfiedAtMaxCable: false,
      }
    }

    if (!vdOk) upsizedVd = true
    if (!scOk) upsizedSc = true

    const next = nextLargerCableSection(s, material)
    if (next === null || next <= s) {
      return {
        suggestedCable: s,
        voltageDropPercent: vd,
        cableUpsizedForVoltageDrop: upsizedVd,
        cableUpsizedForShortCircuit: upsizedSc,
        scProtectionUnsatisfiedAtMaxCable: !scOk,
        voltageDropUnsatisfiedAtMaxCable: !vdOk,
      }
    }
    s = next
  }
}

/** Пояснения к автоматически увеличенному сечению (для SmartHints). */
export function cableSizingExplanationHints(lines: ElectricalLine[]): string[] {
  const out: string[] = []
  if (lines.some((l) => l.cableUpsizedForShortCircuit)) {
    out.push(
      'Сечение увеличено для обеспечения срабатывания защиты при КЗ (характеристика C, ориентир 10·In).'
    )
  }
  if (lines.some((l) => l.cableUpsizedForVoltageDrop)) {
    out.push('Сечение увеличено для ограничения падения напряжения на длинной линии.')
  }
  if (lines.some((l) => l.scProtectionUnsatisfiedAtMaxCable)) {
    out.push(
      'Критическая длина трассы: при максимальном сечении из применимого ряда (медь до 35 мм², алюминий до 95 мм²) ток КЗ в конце линии всё ещё недостаточен для надёжного срабатывания автомата C. Укоротите линию или выполните полный расчёт.'
    )
  }
  return out
}

/** Типичный предел бытовой розетки Schuko (А) */
export const HOUSEHOLD_SOCKET_MAX_A = 16

/** Название содержит «розетк» (без учёта регистра) или задан флаг розеточной линии */
export function isSocketLineDeclared(name: string, socketOutletLine?: boolean): boolean {
  if (socketOutletLine === true) return true
  return /розетк/i.test(name.trim())
}

/**
 * Риск перегрузки розетки: линия считается розеточной, но номинал АВ > 16 А.
 * Расчёт номинала АВ не меняется.
 */
export function computeSocketOverloadRisk(
  suggestedMCB: number,
  name: string,
  socketOutletLine?: boolean
): boolean {
  return isSocketLineDeclared(name, socketOutletLine) && suggestedMCB > HOUSEHOLD_SOCKET_MAX_A
}

/** Предупреждения по эксплуатации розеток (для SmartHints). */
export function socketOutletOverloadHints(lines: ElectricalLine[]): string[] {
  return lines
    .filter((l) => l.socketOverloadRisk)
    .map(
      (l) =>
        `⚠️ Внимание: Стандартные бытовые розетки рассчитаны на ток до 16А (3.5 кВт). Для линии «${l.name}» выбран автомат ${l.suggestedMCB}А. Рекомендуется использовать промышленный силовой разъём или разделить нагрузку на несколько линий по 16А.`
    )
}

/** Эвристика: название похоже на розеточную группу (ПУЭ-7 — обязательная дифзащита розеток) */
export function looksLikeSocketOutletGroup(name: string): boolean {
  const n = name.trim().toLowerCase()
  if (!n) return false
  return /розетк|socket|outlet|schuko|штепсель|группа\s*р/.test(n)
}

/** Ключевые слова в названии — зоны повышенного риска (УЗО 10 мА), регистронезависимо. */
const NAME_HINTS_HIGH_SENSITIVITY_RCD = /ванна|санузел|стирал|бойлер|улиц|бассейн/i

export function nameSuggestsHighSensitivityRcdZone(name: string): boolean {
  return NAME_HINTS_HIGH_SENSITIVITY_RCD.test(name.trim())
}

/** Влажная зона по флагу или по названию. */
export function lineNeedsTenMaRcdSensitivity(line: Pick<ElectricalLine, 'name' | 'isWetZone'>): boolean {
  return line.isWetZone || nameSuggestsHighSensitivityRcdZone(line.name)
}

/** Порог мощности линии ввода для рекомендации противопожарного УЗО (однофазный ориентир 7 кВт). */
export const INCOMER_FIRE_RCD_POWER_W = 7000

/**
 * Автоподбор тока утечки УЗО: ввод >7 кВт → 100 мА; влажные/ключевые слова → 10 мА; иначе 30 мА.
 * (100 или 300 мА на вводе — в подсказке; по умолчанию предлагается 100 мА.)
 */
export function computeSuggestedRcdLeakageMa(
  input: Pick<ElectricalLine, 'name' | 'power' | 'isWetZone' | 'isIncomerLine'>
): RcdLeakageSensitivity {
  if (input.isIncomerLine === true && input.power > INCOMER_FIRE_RCD_POWER_W) return 100
  if (lineNeedsTenMaRcdSensitivity(input)) return 10
  return 30
}

/** Ряд номиналов УЗО: минимальный номинал строго выше номинала защищающего автомата. */
const RCD_NOMINAL_SCHEDULE = [25, 40, 63, 80, 100] as const

export function minRcdNominalAmpsForMcb(mcbNominalA: number): number {
  const x = RCD_NOMINAL_SCHEDULE.find((n) => n > mcbNominalA)
  return x ?? RCD_NOMINAL_SCHEDULE[RCD_NOMINAL_SCHEDULE.length - 1]
}

/** SmartHints: влажная зона / ключевые слова, но выбрано УЗО не 10 мА. */
export function rcdWetZoneLeakageHint(lines: ElectricalLine[]): string | null {
  const bad = lines.some((l) => lineNeedsTenMaRcdSensitivity(l) && l.rcdLeakageMa !== 10)
  if (!bad) return null
  return 'Для влажных зон рекомендуется УЗО 10 мА для максимальной защиты человека.'
}

/** SmartHints: линия ввода >7 кВт без противопожарной чувствительности. */
export function rcdFireProtectionHint(lines: ElectricalLine[]): string | null {
  const bad = lines.some(
    (l) =>
      l.isIncomerLine === true &&
      l.power > INCOMER_FIRE_RCD_POWER_W &&
      l.rcdLeakageMa < 100
  )
  if (!bad) return null
  return 'Для линии ввода при мощности свыше 7 кВт рекомендуется общее противопожарное УЗО 100 мА или 300 мА (на стороне вводного автомата).'
}

/**
 * Мягкая рекомендация: для розеточных групп (не «влажная» зона по правилам выше) — УЗО 30 мА.
 */
export function socketGroupRcdHint(lines: ElectricalLine[]): string | null {
  const hit = lines.some(
    (l) => looksLikeSocketOutletGroup(l.name) && !lineNeedsTenMaRcdSensitivity(l)
  )
  if (!hit) return null
  return 'Рекомендуется установка УЗО 30 мА для розеточных групп (ПУЭ-7).'
}

/** Падение напряжения > 5% даже при максимальном сечении (после автоподбора). */
export function voltageDropSevereHint(lines: ElectricalLine[]): string | null {
  if (!lines.some((l) => l.voltageDropUnsatisfiedAtMaxCable)) return null
  return 'Для одной или нескольких линий с заданной длиной падение напряжения превышает 5% даже при максимальном сечении из ряда. Укоротите трассу, разбейте группу или выполните проектный расчёт (ПУЭ-7).'
}

/** Лимиты «типового» квартирного ввода: 7 кВт (1ф), 15 кВт (3ф) — в ваттах */
const LIMIT_SINGLE_PHASE_W = 7000
const LIMIT_THREE_PHASE_W = 15000

export function checkSafetyLimits(totalPowerW: number, voltage: LineVoltage): SafetyWarning | null {
  const limitW = voltage === 230 ? LIMIT_SINGLE_PHASE_W : LIMIT_THREE_PHASE_W
  if (totalPowerW <= limitW) return null
  return {
    message:
      'Согласуйте фактическую нагрузку с договором энергоснабжения, номиналом вводного автоматического выключателя и сечением вводного кабеля. При необходимости выполните техприсоединение или замену вводной защиты.',
    limitW,
    totalW: totalPowerW,
  }
}

/** Собрать полную линию с расчётными полями */
export function enrichElectricalLine(partial: ElectricalLineInput): ElectricalLine {
  const mat = lineMaterialOrDefault(partial.material)
  const calculatedAmps = calculateCurrent(partial.power, partial.voltage, DEFAULT_COS_PHI)
  const suggestedMCB = getSuggestedMCB(calculatedAmps)
  const suggestedRcdLeakageMa = computeSuggestedRcdLeakageMa(partial)
  const userLocked = partial.rcdSensitivityUserSet === true
  const rcdLeakageMa: RcdLeakageSensitivity =
    userLocked && partial.rcdLeakageMa != null ? partial.rcdLeakageMa : suggestedRcdLeakageMa
  const minRcdNominalA = minRcdNominalAmpsForMcb(suggestedMCB)
  const res = resolveCableWithVoltageDrop(
    suggestedMCB,
    partial.power,
    partial.voltage,
    partial.cableLengthM,
    mat
  )
  const socketOverloadRisk = computeSocketOverloadRisk(
    suggestedMCB,
    partial.name,
    partial.socketOutletLine
  )
  return {
    ...partial,
    material: mat,
    calculatedAmps,
    suggestedMCB,
    suggestedRcdLeakageMa,
    rcdLeakageMa,
    minRcdNominalA,
    suggestedCable: res.suggestedCable,
    voltageDropPercent: res.voltageDropPercent,
    cableUpsizedForVoltageDrop: res.cableUpsizedForVoltageDrop,
    cableUpsizedForShortCircuit: res.cableUpsizedForShortCircuit,
    scProtectionUnsatisfiedAtMaxCable: res.scProtectionUnsatisfiedAtMaxCable,
    voltageDropUnsatisfiedAtMaxCable: res.voltageDropUnsatisfiedAtMaxCable,
    socketOverloadRisk,
  }
}

export function enrichAllLines(drafts: ElectricalLineInput[]): ElectricalLine[] {
  return drafts.map((d) => enrichElectricalLine(d))
}

export function totalPowerW(lines: Pick<ElectricalLine, 'power'>[]): number {
  return lines.reduce((s, l) => s + l.power, 0)
}

/** Линии активного помещения */
export function linesForRoom(lines: ElectricalLine[], roomId: string): ElectricalLine[] {
  return lines.filter((l) => l.roomId === roomId)
}

/** Имя помещения по id */
export function roomNameById(rooms: Room[], roomId: string): string {
  return rooms.find((r) => r.id === roomId)?.name ?? '—'
}
