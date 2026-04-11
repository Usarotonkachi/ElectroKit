import { AlertTriangle } from 'lucide-react'
import type { SafetyWarning } from '@/domain/types'

interface Props {
  warning: SafetyWarning | null
  voltageLabel: string
}

export function SafetyCheckBanner({ warning, voltageLabel }: Props) {
  if (!warning) return null

  const totalKw = warning.totalW / 1000
  const limitKw = warning.limitW / 1000

  return (
    <div
      className="mx-4 mt-3 flex items-start gap-3 rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-100 lg:mx-6"
      role="alert"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden />
      <div>
        <p className="font-medium text-amber-50">
          Внимание: превышена выделенная мощность на вводной автомат ({voltageLabel})
        </p>
        <p className="mt-1.5 text-amber-100/90">
          Суммарная мощность нагрузок{' '}
          <span className="font-mono font-semibold text-amber-50">{totalKw.toFixed(2)} кВт</span>{' '}
          превышает ориентировочный порог для типового вводного устройства{' '}
          <span className="font-mono font-semibold text-amber-50">{limitKw} кВт</span>.{' '}
          {warning.message}
        </p>
      </div>
    </div>
  )
}
