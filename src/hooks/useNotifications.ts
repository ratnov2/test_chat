import { useEffect } from 'react'
import { deleteNotification, receiveNotification, type Credentials } from '../api'
import { fromNotification } from '../mappers'
import { actions } from '../store'

export function useNotifications(creds: Credentials) {
  useEffect(() => {
    const ctrl = new AbortController()
    ;(async () => {
      while (!ctrl.signal.aborted) {
        try {
          const n = await receiveNotification(creds, ctrl.signal)
          if (!n) continue
          const item = fromNotification(n.body)
          if (item) actions.addMessage(item.msg, item)
          else console.debug('[notification skipped]', n.body.typeWebhook, n.body)
          await deleteNotification(creds, n.receiptId)
        } catch (e) {
          if (ctrl.signal.aborted) return
          console.error(e)
          await new Promise((r) => setTimeout(r, 3000))
        }
      }
    })()
    return () => ctrl.abort()
  }, [creds])
}
