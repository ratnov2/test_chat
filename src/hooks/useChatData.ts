import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage, getChatHistory, getChats, type Credentials } from '../api'
import { fromHistory } from '../mappers'
import { actions } from '../store'

export type SyncStatus = 'loading' | 'ready' | 'error'

export function useChatsSync(creds: Credentials) {
  const [state, setState] = useState<{ status: SyncStatus; error?: string }>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const ctl = new AbortController()
    getChats(creds, ctl.signal)
      .then((list) => {
        actions.syncChats(list ?? [])
        setState({ status: 'ready' })
      })
      .catch((e) => {
        if (ctl.signal.aborted) return
        console.error(e)
        setState({ status: 'error', error: errorMessage(e) })
      })
    return () => ctl.abort()
  }, [creds, attempt])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  return { ...state, retry }
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
