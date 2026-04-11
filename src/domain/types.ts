/** Доменная модель ElectroKit (ПУЭ-7, ориентиры для жилых щитов РФ). */

/** Напряжение линии / объекта: фазное 230 В или линейное 400 В (3ф). */
export type LineVoltage = 230 | 400

/** Материал токоведущих жил линии (ВВГ / СИП и т.п.). */
export type ConductorMaterial = 'copper' | 'aluminum'

/** Ток утечки УЗО, мА (10/30 — персональная защита; 100/300 — противопожарная на вводе). */
export type RcdLeakageSensitivity = 10 | 30 | 100 | 300

export interface AppliancePreset {
  name: string
  /** Типовая мощность, Вт */
  defaultPower: number
  isWetZone: boolean
}

/**
 * Линия щита. Поля расчёта заполняются функциями из calculations при изменении данных.
 */
export interface ElectricalLine {
  id: string
  roomId: string
  name: string
  /** Активная мощность, Вт */
  power: number
  voltage: LineVoltage
  isWetZone: boolean
  /**
   * Линия моделирует ввод после главного автомата: при P > 7 кВт рекомендуется противопожарное УЗО 100/300 мА.
   */
  isIncomerLine?: boolean
  /**
   * Пользователь вручную выбрал ток утечки УЗО; иначе при изменении имени/зоны подставляется автоподбор.
   */
  rcdSensitivityUserSet?: boolean
  /** Рекомендованный ток утечки УЗО (ключевые слова в названии, влажная зона, ввод). */
  suggestedRcdLeakageMa: RcdLeakageSensitivity
  /** Принятый ток утечки УЗО для подбора в каталоге и смете. */
  rcdLeakageMa: RcdLeakageSensitivity
  /** Минимальный номинал УЗО, А: ступень выше номинала автомата линии. */
  minRcdNominalA: number
  /** Материал жил; по умолчанию в расчётах — медь */
  material?: ConductorMaterial
  /** Расчётный ток, А */
  calculatedAmps: number
  /** Подобранный номинал автомата, А */
  suggestedMCB: number
  /** Сечение кабеля VVGнг-LS, мм² (с учётом номинала АВ и при необходимости — ΔU) */
  suggestedCable: number
  /** Длина линии одним куском, м (для расчёта падения напряжения; загородные объекты) */
  cableLengthM?: number
  /** Падение напряжения, % от U (если длина задана и расчёт применим) */
  voltageDropPercent?: number
  /** Сечение поднято по ряду из‑за ТКЗ / автомата C */
  cableUpsizedForShortCircuit?: boolean
  /** Сечение поднято из‑за ограничения ΔU */
  cableUpsizedForVoltageDrop?: boolean
  /** При сечении 35 мм² ток КЗ всё ещё < 10·In */
  scProtectionUnsatisfiedAtMaxCable?: boolean
  /** При сечении 35 мм² ΔU всё ещё > 5% */
  voltageDropUnsatisfiedAtMaxCable?: boolean
  /** Пользователь явно отметил линию как розеточную */
  socketOutletLine?: boolean
  /**
   * Розеточная линия (по названию / флагу), но автомат > 16 А — несоответствие бытовой розетке.
   * Номинал АВ не меняется (защита кабеля); только предупреждение.
   */
  socketOverloadRisk?: boolean
}

export interface Room {
  id: string
  name: string
}

export type CatalogComponentType = 'MCB' | 'RCD' | 'RCBO'

export interface CatalogItem {
  id: string
  brand: string
  series: string
  type: CatalogComponentType
  /** Номинальный ток, А (для УЗО/АВДТ — ток устройства) */
  nominal: number
  poleCount: number
  /** Ориентировочная цена, ₽ */
  price: number
  /** Для УЗО/АВДТ — чувствительность утечки, мА */
  sensitivityMa?: number
}

export interface SafetyWarning {
  message: string
  /** Лимит, Вт */
  limitW: number
  /** Фактическая суммарная мощность, Вт */
  totalW: number
}

/** Ввод для enrichElectricalLine: расчётные поля и итоговые УЗО подставляются внутри функции. */
export type ElectricalLineInput = Omit<
  ElectricalLine,
  | 'calculatedAmps'
  | 'suggestedMCB'
  | 'suggestedCable'
  | 'voltageDropPercent'
  | 'cableUpsizedForVoltageDrop'
  | 'cableUpsizedForShortCircuit'
  | 'scProtectionUnsatisfiedAtMaxCable'
  | 'voltageDropUnsatisfiedAtMaxCable'
  | 'socketOverloadRisk'
  | 'suggestedRcdLeakageMa'
  | 'minRcdNominalA'
  | 'rcdLeakageMa'
> & {
  rcdLeakageMa?: RcdLeakageSensitivity
}
