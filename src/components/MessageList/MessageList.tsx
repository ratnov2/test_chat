import { useImperativeHandle, useLayoutEffect, useRef, type Ref } from 'react'
import { ME_ID, saveScroll, scrollPositions, type Message, type ScrollPos } from '../../store'
import styles from './MessageList.module.css'

const BOTTOM_THRESHOLD = 40
const SMOOTH_MS = 500

export interface MessageListHandle {
  keepBottom: (change: () => void) => void
}

const isAtBottom = (el: HTMLElement) => el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD

function measure(el: HTMLElement): ScrollPos {
  const { scrollTop, children } = el
  let lo = 0
  let hi = children.length - 1
  let idx = children.length
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const c = children[mid] as HTMLElement
    if (c.offsetTop + c.offsetHeight > scrollTop) {
      idx = mid
      hi = mid - 1
    } else {
      lo = mid + 1
    }
  }
  const anchor = children[idx] as HTMLElement | undefined
  return {
    top: scrollTop,
    atBottom: isAtBottom(el),
    anchorId: anchor?.dataset.id,
    offset: anchor ? anchor.offsetTop - scrollTop : undefined,
  }
}

function restoreAnchor(el: HTMLElement, saved: ScrollPos) {
  const anchor = saved.anchorId ? el.querySelector<HTMLElement>(`[data-id="${CSS.escape(saved.anchorId)}"]`) : null
  el.scrollTop = anchor ? anchor.offsetTop - (saved.offset ?? 0) : saved.top
}

interface Props {
  chatId: string
  messages: Message[]
  ref?: Ref<MessageListHandle>
}

export const MessageList = ({ chatId, messages, ref }: Props) => {
  const el = useRef<HTMLDivElement>(null)
  const prev = useRef<{ chatId: string | null; tail?: string }>({ chatId: null })
  const smoothUntil = useRef(0)
  const frame = useRef(0)
  const tail = messages.at(-1)?.id

  useImperativeHandle(
    ref,
    () => ({
      keepBottom(change) {
        const e = el.current
        const wasBottom = !!e && isAtBottom(e)
        change()
        if (e && wasBottom) e.scrollTop = e.scrollHeight
      },
    }),
    [],
  )

  useLayoutEffect(() => {
    const e = el.current
    if (!e) return
    const switched = prev.current.chatId !== chatId
    const hasNewTail = !switched && prev.current.tail !== tail
    prev.current = { chatId, tail }

    const saved = scrollPositions.get(chatId)
    if (!saved || saved.atBottom) {
      if (hasNewTail) {
        smoothUntil.current = Date.now() + SMOOTH_MS
        e.scrollTo({ top: e.scrollHeight, behavior: 'smooth' })
        setTimeout(() => saveScroll(chatId, { top: e.scrollTop, atBottom: true }), SMOOTH_MS + 20)
      } else {
        e.scrollTop = e.scrollHeight
      }
    } else {
      restoreAnchor(e, saved)
    }
  }, [chatId, tail, messages.length])

  useLayoutEffect(() => () => cancelAnimationFrame(frame.current), [])

  const onScroll = () => {
    if (frame.current) return
    frame.current = requestAnimationFrame(() => {
      frame.current = 0
      const e = el.current
      if (e && Date.now() >= smoothUntil.current) saveScroll(chatId, measure(e))
    })
  }

  return (
    <div className={styles.messages} ref={el} onScroll={onScroll}>
      {messages.map((m) => (
        <div key={m.id} data-id={m.id} className={`${styles.bubble} ${m.senderId === ME_ID ? styles.out : styles.in}`}>
          {m.text}
          <span className={styles.time}>
            {new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      ))}
    </div>
  )
}
