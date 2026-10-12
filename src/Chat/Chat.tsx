import { useCallback, useEffect, useMemo, useRef } from 'react'
import { sendMessage, type Credentials } from '../api'
import { Avatar } from '../components/Avatar/Avatar'
import { Composer } from '../components/Composer/Composer'
import { MessageList, type MessageListHandle } from '../components/MessageList/MessageList'
import { Sidebar } from '../components/Sidebar/Sidebar'
import { useAvatars } from '../hooks/useAvatars'
import { useChatHistory, useChatsSync } from '../hooks/useChatData'
import { useNotifications } from '../hooks/useNotifications'
import styles from './Chat.module.css'
import { ME_ID, actions, chatAvatar, chatTitle, saveScroll, useStore } from '../store'

export const Chat = ({ creds, onLogout }: { creds: Credentials; onLogout: () => void }) => {
  const active = useStore((s) => s.activeChatId)
  const chats = useStore((s) => s.chats)
  const users = useStore((s) => s.users)
  const messages = useStore((s) => s.messages)
  const main = useRef<HTMLElement>(null)
  const list = useRef<MessageListHandle>(null)

  useChatsSync(creds)
  useChatHistory(creds, active)
  useNotifications(creds)
  const requestAvatar = useAvatars(creds)
  useEffect(() => {
    if (active) requestAvatar(active)
  }, [active, requestAvatar])

  const current = active ? chats[active] : undefined
  const currentMessages = useMemo(() => current?.messageIds.map((id) => messages[id]) ?? [], [current, messages])

  const send = async (text: string) => {
    if (!active) return
    saveScroll(active, { top: 0, atBottom: true })
    try {
      const r = await sendMessage(creds, active, text)
      actions.addMessage({ id: r.idMessage, chatId: active, senderId: ME_ID, text, ts: Date.now() })
    } catch (err) {
      console.error(err)
    }
  }

  const onComposerHeight = useCallback((h: number) => {
    list.current?.keepBottom(() => main.current?.style.setProperty('--composer-h', `${h}px`))
  }, [])

  return (
    <div className={styles.app} data-open={!!current}>
      <Sidebar className={styles.sidebar} creds={creds} onLogout={onLogout} onChatVisible={requestAvatar} />
      <main className={styles.main} ref={main}>
        {current ? (
          <>
            <header className={styles.header}>
              <Avatar id={current.id} src={chatAvatar(users, current)} title={chatTitle(users, current)} size={40} />
              {chatTitle(users, current)}
            </header>
            <MessageList ref={list} chatId={current.id} messages={currentMessages} />
            <Composer focusKey={current.id} onSend={send} onHeightChange={onComposerHeight} />
          </>
        ) : (
          <div className={styles.empty}>Выберите чат или создайте новый по номеру телефона</div>
        )}
      </main>
    </div>
  )
}
