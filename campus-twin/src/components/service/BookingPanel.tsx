import { Check, MapPin, Users } from 'lucide-react'
import { useCampusStore } from '../../store/campusStore'
import { buildingName, deviceLabel, walkText } from '../../lib/format'

export function BookingPanel() {
  const candidates = useCampusStore((s) => s.candidates)
  const rooms = useCampusStore((s) => s.rooms)
  const bookings = useCampusStore((s) => s.bookings)
  const confirmBooking = useCampusStore((s) => s.confirmBooking)
  const setDrill = useCampusStore((s) => s.setDrill)
  const selectBuilding = useCampusStore((s) => s.selectBuilding)

  if (!candidates) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <p className="text-xs leading-5 text-slate-400">
          在左栏说一句找空间的话，例如
          <br />
          「帮我找一个现在空着、有投影、能坐 8 个人的会议室」
        </p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <p className="mb-2 text-[11px] font-medium tracking-wide text-slate-400">
        候选空间 · {candidates.length} 间（按距正门步行排序）
      </p>
      {candidates.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
          当前时段没有完全匹配的空闲房间
        </p>
      )}
      <div className="flex flex-col gap-2">
        {candidates.map(({ roomId, walkMin }) => {
          const room = rooms.find((r) => r.id === roomId)
          if (!room) return null
          const booked = room.status === 'busy'
          return (
            <div
              key={roomId}
              role="button"
              tabIndex={0}
              onClick={() => {
                selectBuilding(room.buildingId)
                setDrill({ level: 3, buildingId: room.buildingId, floor: room.floor, roomId: room.id })
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  selectBuilding(room.buildingId)
                  setDrill({ level: 3, buildingId: room.buildingId, floor: room.floor, roomId: room.id })
                }
              }}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:border-brand/50"
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-slate-900">
                  {buildingName(room.buildingId)} {room.name}
                </span>
                <span className="flex items-center gap-1 text-[11px] tabular-nums text-slate-500">
                  <Users size={11} />
                  {room.capacity} 人
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {room.equipment.map((d) => (
                  <span key={d} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                    {deviceLabel(d)}
                  </span>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] text-brand-dark">
                  <MapPin size={11} />
                  距正门{walkMin !== null ? walkText(walkMin) : '路径未知'}
                </span>
                <button
                  type="button"
                  disabled={booked}
                  onClick={(e) => {
                    e.stopPropagation()
                    confirmBooking(roomId)
                  }}
                  className={
                    booked
                      ? 'flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-[11px] text-slate-400'
                      : 'rounded-md bg-brand px-2.5 py-1 text-[11px] font-medium text-white hover:bg-brand-dark'
                  }
                >
                  {booked ? (
                    <>
                      <Check size={11} />
                      已预约
                    </>
                  ) : (
                    '确认预约'
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {bookings.length > 0 && (
        <>
          <p className="mb-2 mt-5 text-[11px] font-medium tracking-wide text-slate-400">我的预约</p>
          <div className="flex flex-col gap-2">
            {bookings.map((b) => {
              const room = rooms.find((r) => r.id === b.roomId)
              return (
                <div key={b.id} className="rounded-lg border border-brand/30 bg-brand/5 p-3 text-[13px]">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-brand-dark">{b.id}</span>
                    <span className="text-[11px] tabular-nums text-slate-500">
                      {b.start}–{b.end}
                    </span>
                  </div>
                  <p className="mt-0.5 text-slate-700">{room ? `${buildingName(room.buildingId)} ${room.name}` : b.roomId}</p>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
