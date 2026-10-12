import { useMemo } from 'react'
import { getAvatar, type Credentials } from '../api'
import { actions } from '../store'

const MAX_PARALLEL = 3

function createAvatarLoader(creds: Credentials) {
  const requested = new Set<string>()
  const queue: string[] = []
  let running = 0

  const pump = () => {
    while (running < MAX_PARALLEL && queue.length) {
      const id = queue.shift()!
      running++
      getAvatar(creds, id)
        .then((r) => {
          const src = r?.base64Avatar ? `data:image/jpeg;base64,${r.base64Avatar}` : r?.urlAvatar
          if (src) actions.setAvatar(id, src)
        })
        .catch(() => {})
        .finally(() => {
          running--
          pump()
        })
    }
  }

  return (chatId: string) => {
    if (requested.has(chatId)) return
    requested.add(chatId)
    queue.push(chatId)
    pump()
  }
}

export const useAvatars = (creds: Credentials) => useMemo(() => createAvatarLoader(creds), [creds])
