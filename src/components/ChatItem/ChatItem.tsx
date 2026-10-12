import { useEffect, useRef } from 'react'
import { actions, chatAvatar, chatTitle, type Chat, type Message, type User } from '../../store'
import { Avatar } from '../Avatar/Avatar'
import styles from './ChatItem.module.css'

interface Props {
  chat: Chat
  index: number
  active: boolean
  users: Record<string, User>
  last?: Message
  onVisible: (chatId: string) => void
}

export const ChatItem = ({ chat, index, active, users, last, onVisible }: Props) => {
  const ref = useRef<HTMLDivElement>(null)
  const title = chatTitle(users, chat)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        onVisible(chat.id)
        io.disconnect()
      }
    })
    io.observe(el)
    return () => io.disconnect()
  }, [chat.id, onVisible])

  return (
    <div
      ref={ref}
      className={`${styles.item}${active ? ` ${styles.active}` : ''}`}
      style={{ transform: `translateY(calc(var(--chat-row-height) * ${index}))` }}
      onClick={() => actions.setActiveChat(chat.id)}
    >
      <Avatar id={chat.id} src={chatAvatar(users, chat)} title={title} />
      <div className={styles.meta}>
        <div className={styles.title}>{title}</div>
        <div className={styles.last}>{last?.text}</div>
      </div>
    </div>
  )
}
