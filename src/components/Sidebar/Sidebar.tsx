import { useMemo } from 'react'
import type { Credentials } from '../../api'
import type { SyncStatus } from '../../hooks/useChatData'
import { useStore } from '../../store'
import { ChatItem } from '../ChatItem/ChatItem'
import { ChatListError } from '../ChatListError/ChatListError'
import { ChatListSkeleton } from '../ChatListSkeleton/ChatListSkeleton'
import { NewChatForm } from '../NewChatForm/NewChatForm'
import styles from './Sidebar.module.css'

interface Props {
  className?: string
  creds: Credentials
  status: SyncStatus
  error?: string
  onRetry: () => void
  onLogout: () => void
  onChatVisible: (chatId: string) => void
}

export const Sidebar = ({ className, creds, status, error, onRetry, onLogout, onChatVisible }: Props) => {
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
      {status === 'loading' && list.length > 0 && (
        <div className={styles.progress} role="progressbar" aria-label="Обновление" />
      )}
      {status === 'error' && list.length > 0 && (
        <ChatListError compact message="Не удалось обновить чаты" onRetry={onRetry} />
      )}
      {status === 'loading' && list.length === 0 && <ChatListSkeleton />}
      {status === 'error' && list.length === 0 && (
        <ChatListError message={error ?? 'Не удалось выполнить запрос'} onRetry={onRetry} />
      )}
      {status === 'ready' && list.length === 0 && (
        <div className={styles.empty}>Чатов пока нет. Введите номер телефона, чтобы начать.</div>
      )}
      {list.length > 0 && (
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
      )}
      <button className={styles.logout} onClick={onLogout}>
        Выйти
      </button>
    </aside>
  )
}
