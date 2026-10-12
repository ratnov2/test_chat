import { useEffect, useRef, useState, type SyntheticEvent } from 'react'
import styles from './Composer.module.css'

function insertPlainText(el: HTMLElement, text: string) {
  const sel = getSelection()
  if (!sel?.rangeCount) return
  const range = sel.getRangeAt(0)
  range.deleteContents()
  const node = document.createTextNode(text)
  range.insertNode(node)
  range.setStartAfter(node)
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

interface Props {
  focusKey: string
  onSend: (text: string) => void
  onHeightChange: (height: number) => void
}

export const Composer = ({ focusKey, onSend, onHeightChange }: Props) => {
  const [text, setText] = useState('')
  const form = useRef<HTMLFormElement>(null)
  const field = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLDivElement>(null)
  const heightCb = useRef(onHeightChange)

  useEffect(() => {
    heightCb.current = onHeightChange
  })
  useEffect(() => {
    input.current?.focus()
  }, [focusKey])

  useEffect(() => {
    const ro = new ResizeObserver(() => {
      if (field.current && input.current) field.current.style.height = `${input.current.offsetHeight}px`
    })
    ro.observe(input.current!)
    const roForm = new ResizeObserver(() => heightCb.current(form.current!.offsetHeight))
    roForm.observe(form.current!)
    return () => {
      ro.disconnect()
      roForm.disconnect()
    }
  }, [])

  const submit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    const t = text.trim()
    if (!t) return
    setText('')
    input.current!.innerHTML = ''
    onSend(t)
  }

  return (
    <form className={styles.composer} ref={form} onSubmit={submit}>
      <div className={styles.field} ref={field}>
        <div
          ref={input}
          className={styles.input}
          contentEditable
          role="textbox"
          aria-multiline="true"
          data-placeholder="Сообщение"
          onInput={(e) => {
            const el = e.currentTarget
            if (!el.innerText.trim()) el.innerHTML = ''
            setText(el.innerText)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              form.current?.requestSubmit()
            }
          }}
          onPaste={(e) => {
            e.preventDefault()
            insertPlainText(e.currentTarget, e.clipboardData.getData('text/plain'))
          }}
        />
      </div>
      <button type="submit" disabled={!text.trim()}>
        ➤
      </button>
    </form>
  )
}
