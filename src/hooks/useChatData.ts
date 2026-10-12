import { useEffect, useRef } from 'react'
import { getChatHistory, getChats, type Credentials } from '../api'
import { fromHistory } from '../mappers'
import { actions } from '../store'

export function useChatsSync(creds: Credentials) {
  useEffect(() => {
    getChats(creds)
      .then((list) => actions.syncChats(list ?? []))
      .catch(console.error)
  }, [creds])
}

export function useChatHistory(creds: Credentials, chatId: string | null) {
  const loaded = useRef(new Set<string>())
  useEffect(() => {
    if (!chatId || loaded.current.has(chatId)) return
    loaded.current.add(chatId)
    getChatHistory(creds, chatId)
      .then((history) => {
        const items = (history ?? []).flatMap((h) => fromHistory(chatId, h) ?? [])
        actions.addMessages(items)
      })
      .catch((e) => {
        loaded.current.delete(chatId)
        console.error(e)
      })
  }, [chatId, creds])
}
