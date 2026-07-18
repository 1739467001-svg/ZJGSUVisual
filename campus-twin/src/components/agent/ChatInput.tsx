import { useState } from 'react'
import { Send } from 'lucide-react'
import { useCampusStore } from '../../store/campusStore'

export function ChatInput() {
  const [text, setText] = useState('')
  const running = useCampusStore((s) => s.running)
  const submitCommand = useCampusStore((s) => s.submitCommand)

  const submit = () => {
    const t = text.trim()
    if (!t || running) return
    setText('')
    void submitCommand(t)
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <textarea
        rows={3}
        value={text}
        disabled={running}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault()
            submit()
          }
        }}
        placeholder="例如：帮我找一个现在空着、有投影、能坐 8 个人的会议室…"
        className="w-full resize-none rounded-md border border-slate-200 bg-slate-50 p-2 text-[13px] text-slate-700 placeholder:text-slate-400 focus:border-brand focus:outline-none disabled:opacity-60"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">{running ? 'Agent 执行中…' : '回车发送 · 规则解析 断网可演'}</span>
        <button
          type="button"
          onClick={submit}
          disabled={running || !text.trim()}
          className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-dark disabled:bg-brand/40"
        >
          <Send size={12} />
          发送
        </button>
      </div>
    </div>
  )
}
