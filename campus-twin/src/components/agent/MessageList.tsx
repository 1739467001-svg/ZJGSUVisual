import { useEffect, useRef } from 'react'
import { useCampusStore } from '../../store/campusStore'

export function MessageList() {
  const messages = useCampusStore((s) => s.messages)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' })
  }, [messages.length])

  if (!messages.length) return null
  return (
    <div className="flex flex-col gap-1.5">
      {messages.map((m, i) =>
        m.role === 'user' ? (
          <div key={i} className="self-end rounded-md bg-brand px-3 py-1.5 text-[13px] text-white">
            {m.text}
          </div>
        ) : (
          <div
            key={i}
            className="whitespace-pre-line rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[13px] leading-5 text-slate-700"
          >
            {m.text}
          </div>
        ),
      )}
      <div ref={endRef} />
    </div>
  )
}
