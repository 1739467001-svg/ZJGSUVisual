import { useEffect, useState } from 'react'
import { ChevronRight, Wrench } from 'lucide-react'
import type { TicketStatus } from '../../types'
import { useCampusStore } from '../../store/campusStore'
import { buildingName, deviceLabel } from '../../lib/format'

const STATUS_META: Record<TicketStatus, { label: string; cls: string }> = {
  new: { label: '待受理', cls: 'bg-gold/20 text-amber-700' },
  doing: { label: '处理中', cls: 'bg-candidate/15 text-sky-700' },
  done: { label: '已完成', cls: 'bg-brand/10 text-brand-dark' },
}

export function RepairPanel() {
  const draft = useCampusStore((s) => s.repairDraft)
  const tickets = useCampusStore((s) => s.tickets)
  const rooms = useCampusStore((s) => s.rooms)
  const createTicket = useCampusStore((s) => s.createTicket)
  const advanceTicket = useCampusStore((s) => s.advanceTicket)
  const [desc, setDesc] = useState('')

  useEffect(() => {
    setDesc(draft?.desc ?? '')
  }, [draft])

  const draftRoom = draft?.roomId ? rooms.find((r) => r.id === draft.roomId) : undefined

  return (
    <div className="p-4">
      <p className="mb-2 text-[11px] font-medium tracking-wide text-slate-400">报修单</p>
      {draft ? (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <span className="rounded bg-slate-100 px-2 py-1 text-slate-600">
              {draft.buildingId ? buildingName(draft.buildingId) : '未识别楼宇'}
            </span>
            {draftRoom && <span className="rounded bg-slate-100 px-2 py-1 text-slate-600">{draftRoom.name}</span>}
            {draft.deviceType && (
              <span className="flex items-center gap-1 rounded bg-danger/10 px-2 py-1 text-danger">
                <Wrench size={10} />
                {deviceLabel(draft.deviceType)}
              </span>
            )}
          </div>
          <textarea
            rows={2}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="mt-2 w-full resize-none rounded-md border border-slate-200 bg-slate-50 p-2 text-[13px] text-slate-700 focus:border-brand focus:outline-none"
          />
          <button
            type="button"
            disabled={!draft.roomId}
            onClick={() => createTicket({ roomId: draft.roomId!, ...(draft.deviceType ? { deviceType: draft.deviceType } : {}), desc: desc || draft.desc })}
            className="mt-2 w-full rounded-md bg-danger px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 disabled:bg-slate-200"
          >
            提交工单
          </button>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs leading-5 text-slate-400">
          在左栏说一句报修的话，例如
          <br />
          「三号楼 302 投影坏了」
        </p>
      )}

      {tickets.length > 0 && (
        <>
          <p className="mb-2 mt-5 text-[11px] font-medium tracking-wide text-slate-400">工单 · {tickets.length}</p>
          <div className="flex flex-col gap-2">
            {tickets.map((t) => {
              const room = rooms.find((r) => r.id === t.roomId)
              const meta = STATUS_META[t.status]
              return (
                <div key={t.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold tabular-nums text-slate-900">{t.id}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${meta.cls}`}>{meta.label}</span>
                  </div>
                  <p className="mt-1 text-[13px] text-slate-700">
                    {room ? `${buildingName(room.buildingId)} ${room.name}` : t.roomId} · {t.desc}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{t.assignee}</span>
                    {t.status !== 'done' && (
                      <button
                        type="button"
                        onClick={() => advanceTicket(t.id)}
                        className="flex items-center gap-0.5 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:border-brand/50 hover:text-brand-dark"
                      >
                        {t.status === 'new' ? '受理' : '办结'}
                        <ChevronRight size={11} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
