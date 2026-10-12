import type { State } from './index'
import type { Chat, Id, Message, User } from './models'

const DB_NAME = 'max-chat'
const DB_VERSION = 1
const LEGACY_KEY = 'store:v1'

type Entity = 'users' | 'chats' | 'messages'
const ENTITIES: Entity[] = ['users', 'chats', 'messages']

const open = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      for (const name of ENTITIES) db.createObjectStore(name, { keyPath: 'id' })
      db.createObjectStore('meta', { keyPath: 'key' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

const done = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = tx.onabort = () => reject(tx.error)
  })

const request = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })

const byId = <T extends { id: Id }>(list: T[]) => Object.fromEntries(list.map((x) => [x.id, x])) as Record<Id, T>

const stripAvatar = <T extends { avatar?: string }>(v: T) => {
  const { avatar: _avatar, ...rest } = v
  return rest
}

async function load(db: IDBDatabase): Promise<State> {
  const tx = db.transaction([...ENTITIES, 'meta'], 'readonly')
  const [users, chats, messages, active] = await Promise.all([
    request<User[]>(tx.objectStore('users').getAll()),
    request<Chat[]>(tx.objectStore('chats').getAll()),
    request<Message[]>(tx.objectStore('messages').getAll()),
    request<{ key: string; value: Id | null } | undefined>(tx.objectStore('meta').get('activeChatId')),
  ])
  return {
    users: byId(users),
    chats: byId(chats),
    messages: byId(messages),
    activeChatId: active?.value ?? null,
  }
}

function legacyState(): State | null {
  try {
    const raw = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? 'null')
    if (raw && typeof raw === 'object') {
      return { users: {}, chats: {}, messages: {}, activeChatId: null, ...raw }
    }
  } catch {}
  return null
}

export interface ScrollPos {
  top: number
  atBottom: boolean
  anchorId?: Id
  offset?: number
}
export const scrollPositions = new Map<Id, ScrollPos>()
let scrollDb: IDBDatabase | undefined
let scrollTimer: ReturnType<typeof setTimeout> | undefined

function flushScroll() {
  if (scrollTimer !== undefined) clearTimeout(scrollTimer)
  scrollTimer = undefined
  if (!scrollDb) return
  scrollDb
    .transaction('meta', 'readwrite')
    .objectStore('meta')
    .put({ key: 'scroll', value: Object.fromEntries(scrollPositions) })
}

export function saveScroll(chatId: Id, pos: ScrollPos) {
  scrollPositions.set(chatId, pos)
  if (scrollDb) scrollTimer ??= setTimeout(flushScroll, 300)
}

export function clearScroll() {
  scrollPositions.clear()
  flushScroll()
}

type Batch = { put: Map<string, unknown>; del: Set<Id> }
const emptyBatch = (): Batch => ({ put: new Map(), del: new Set() })

export async function initPersistence(
  initial: State,
  subscribe: (l: () => void) => () => void,
  getState: () => State,
  setState: (s: State) => void,
) {
  let db: IDBDatabase
  try {
    db = await open()
  } catch (e) {
    console.warn('IndexedDB недоступна, данные не будут сохраняться', e)
    return
  }
  scrollDb = db
  try {
    const saved = await request<{ value: Record<Id, ScrollPos> } | undefined>(
      db.transaction('meta').objectStore('meta').get('scroll'),
    )
    for (const [id, pos] of Object.entries(saved?.value ?? {})) scrollPositions.set(id, pos)
  } catch {}
  let state = await load(db)
  if (!Object.keys(state.chats).length) {
    const legacy = legacyState()
    if (legacy) {
      state = legacy
      localStorage.removeItem(LEGACY_KEY)
      await write(db, fullBatch(legacy))
    }
  }
  setState({ ...initial, ...state })
  let prev = getState()
  const pending: Record<Entity | 'meta', Batch> = {
    users: emptyBatch(),
    chats: emptyBatch(),
    messages: emptyBatch(),
    meta: emptyBatch(),
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  const flush = () => {
    timer = undefined
    const batch = { ...pending }
    for (const k of Object.keys(pending) as (keyof typeof pending)[]) pending[k] = emptyBatch()
    write(db, batch).catch((e) => console.warn('Не удалось сохранить в IndexedDB', e))
  }
  subscribe(() => {
    const next = getState()
    for (const name of ENTITIES) {
      if (prev[name] === next[name]) continue
      const a = prev[name] as Record<Id, { id: Id; avatar?: string }>
      const b = next[name] as Record<Id, { id: Id; avatar?: string }>
      for (const id in b)
        if (a[id] !== b[id]) {
          pending[name].del.delete(id)
          pending[name].put.set(id, stripAvatar(b[id]))
        }
      for (const id in a)
        if (!(id in b)) {
          pending[name].put.delete(id)
          pending[name].del.add(id)
        }
    }
    if (prev.activeChatId !== next.activeChatId)
      pending.meta.put.set('activeChatId', { key: 'activeChatId', value: next.activeChatId })
    prev = next
    timer ??= setTimeout(flush, 50)
  })
  addEventListener('pagehide', () => {
    flushScroll()
    if (timer !== undefined) {
      clearTimeout(timer)
      flush()
    }
  })
}
const fullBatch = (s: State): Record<Entity | 'meta', Batch> => {
  const b = { users: emptyBatch(), chats: emptyBatch(), messages: emptyBatch(), meta: emptyBatch() }
  for (const name of ENTITIES)
    for (const [id, v] of Object.entries(s[name])) b[name].put.set(id, stripAvatar(v as { avatar?: string }))
  b.meta.put.set('activeChatId', { key: 'activeChatId', value: s.activeChatId })
  return b
}
async function write(db: IDBDatabase, batch: Record<Entity | 'meta', Batch>) {
  const names = (Object.keys(batch) as (Entity | 'meta')[]).filter((n) => batch[n].put.size || batch[n].del.size)
  if (!names.length) return
  const tx = db.transaction(names, 'readwrite')
  for (const n of names) {
    const os = tx.objectStore(n)
    for (const v of batch[n].put.values()) os.put(v)
    for (const id of batch[n].del) os.delete(id)
  }
  await done(tx)
}
