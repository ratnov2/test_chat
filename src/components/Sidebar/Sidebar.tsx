import { useMemo } from 'react'
import type { Credentials } from '../../api'
import { useStore } from '../../store'
import { ChatItem } from '../ChatItem/ChatItem'
import { NewChatForm } from '../NewChatForm/NewChatForm'
import styles from './Sidebar.module.css'

interface Props {
  className?: string
  creds: Credentials
  onLogout: () => void
  onChatVisible: (chatId: string) => void
}

export const Sidebar = ({ className, creds, onLogout, onChatVisible }: Props) => {
  const chats = useStore((s) => s.chats)
  const users = useStore((s) => s.users)
  const messages = useStore((s) => s.messages)
  const active = useStore((s) => s.activeChatId)

  const list = useMemo(
    () =>
      Object.values(chats)
        .map((chat) => ({ chat, last: messages[chat.messageIds.at(-1) ?? ''] }))
        .sort((a, b) => (b.last?.ts ?? 0) - (a.last?.ts ?? 0)),
    [chats, messages],
  )

  return (
    <aside className={`${styles.sidebar} ${className ?? ''}`}>
      <NewChatForm creds={creds} />
      <div className={styles.list}>
        <div className={styles.listInner} style={{ height: `calc(var(--chat-row-height) * ${list.length})` }}>
          {list.map(({ chat, last }, i) => (
            <ChatItem
              key={chat.id}
              chat={chat}
              index={i}
              active={chat.id === active}
              users={users}
              last={last}
              onVisible={onChatVisible}
            />
          ))}
        </div>
      </div>
      <button className={styles.logout} onClick={onLogout}>
        Выйти
      </button>
    </aside>
  )
}
