import { Plus, Trash, X } from 'lucide-react'
import { useElectroStore } from '@/store/useElectroStore'

export interface RoomsListPanelProps {
  /** Закрыть выезжающую панель после выбора помещения / по кнопке */
  onRequestClose?: () => void
}

/** Список помещений: общий контент для десктоп-сайдбара и мобильного drawer */
export function RoomsListPanel({ onRequestClose }: RoomsListPanelProps) {
  const rooms = useElectroStore((s) => s.rooms)
  const activeRoomId = useElectroStore((s) => s.activeRoomId)
  const setActiveRoom = useElectroStore((s) => s.setActiveRoom)
  const addRoom = useElectroStore((s) => s.addRoom)
  const removeRoom = useElectroStore((s) => s.removeRoom)
  const renameRoom = useElectroStore((s) => s.renameRoom)

  const closeIfDrawer = () => onRequestClose?.()

  return (
    <>
      <div className="border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Помещения
          </h2>
          {onRequestClose ? (
            <button
              type="button"
              onClick={closeIfDrawer}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              aria-label="Закрыть меню"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {rooms.map((r) => {
            const active = r.id === activeRoomId
            return (
              <li key={r.id}>
                <div
                  className={`group flex items-center gap-1 rounded-md ${
                    active
                      ? 'bg-slate-800 ring-1 ring-yellow-500/40'
                      : 'hover:bg-slate-800/60'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveRoom(r.id)
                      closeIfDrawer()
                    }}
                    className="min-h-11 min-w-0 flex-1 truncate px-3 py-2.5 text-left text-sm font-medium text-slate-100"
                  >
                    {r.name}
                  </button>
                  <button
                    type="button"
                    title="Удалить помещение"
                    onClick={() => removeRoom(r.id)}
                    className="mr-1 flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-red-500/15 hover:text-red-400 lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
                {active && (
                  <input
                    className="mt-1 min-h-11 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600"
                    defaultValue={r.name}
                    onBlur={(e) => renameRoom(r.id, e.target.value || r.name)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                    }}
                    aria-label="Название помещения"
                  />
                )}
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="border-t border-slate-800 p-2">
        <button
          type="button"
          onClick={() => {
            addRoom()
            closeIfDrawer()
          }}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-dashed border-slate-700 py-2.5 text-sm text-slate-500 transition hover:border-yellow-500/50 hover:text-yellow-500/90"
        >
          <Plus className="h-4 w-4" />
          Добавить помещение
        </button>
      </div>
    </>
  )
}

/** Десктоп: фиксированный сайдбар (виден только от lg) */
export function SidebarRooms() {
  return (
    <aside className="hidden h-full min-h-0 w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-950 lg:flex">
      <RoomsListPanel />
    </aside>
  )
}
