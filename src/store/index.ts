import type { ApiChat } from '../api'
import type { MessageItem } from '../mappers'
import { createStore } from './createStore'
import { ME_ID, type Chat, type ChatType, type Id, type Message, type User } from './models'
import { clearScroll, initPersistence } from './persistence'

export * from './models'
export { saveScroll, scrollPositions, type ScrollPos } from './persistence'

export interface State {
  users: Record<Id, User>
  chats: Record<Id, Chat>
  messages: Record<Id, Message>
  activeChatId: Id | null
}

const initialState: State = { users: {}, chats: {}, messages: {}, activeChatId: null }

const store = createStore<State>(initialState)

export const useStore = store.useStore
export const initStore = () => initPersistence(initialState, store.subscribe, store.getState, store.setState)

const phoneFromChatId = (chatId: Id) => /^(\d+)@c\.us$/.exec(chatId)?.[1]

function upsertUser(users: State['users'], id: Id, name?: string, phone?: string): State['users'] {
  const prev = users[id]
  const next = { name: name || prev?.name, phone: phone ?? prev?.phone ?? phoneFromChatId(id) }
  if (prev && prev.name === next.name && prev.phone === next.phone) return users
  return { ...users, [id]: { ...prev, id, ...next } }
}

interface ChatOpts {
  type?: ChatType
  name?: string
  phone?: string
}

function upsertChat(state: Pick<State, 'users' | 'chats'>, chatId: Id, opts: ChatOpts = {}) {
  let { users, chats } = state
  let chat = chats[chatId]
  if (chat) {
    if (!chat.peerId && opts.name && chat.title !== opts.name) {
      chat = { ...chat, title: opts.name }
      chats = { ...chats, [chatId]: chat }
    }
  } else {
    const type = opts.type ?? (chatId.endsWith('@g.us') ? 'group' : 'user')
    chat = {
      id: chatId,
      type,
      messageIds: [],
      ...(type === 'user' || type === 'bot' ? { peerId: chatId } : { title: opts.name }),
    }
    chats = { ...chats, [chatId]: chat }
  }
  if (chat.peerId) users = upsertUser(users, chat.peerId, opts.name, opts.phone)
  return { users, chats }
}

function addMessages(state: State, items: MessageItem[]): Partial<State> {
  let { users, chats } = state
  const messages = { ...state.messages }
  const touched = new Set<Id>()
  for (const { msg, chatName, senderName } of items) {
    if (messages[msg.id]) continue
    ;({ users, chats } = upsertChat({ ...state, users, chats }, msg.chatId, { name: chatName }))
    const chat = chats[msg.chatId]
    if (msg.senderId !== ME_ID && msg.senderId !== chat.peerId) users = upsertUser(users, msg.senderId, senderName)
    messages[msg.id] = msg
    chats = { ...chats, [chat.id]: { ...chat, messageIds: [...chat.messageIds, msg.id] } }
    touched.add(chat.id)
  }
  if (!touched.size) return {}
  for (const id of touched) {
    chats[id] = { ...chats[id], messageIds: [...chats[id].messageIds].sort((a, b) => messages[a].ts - messages[b].ts) }
  }
  return { users, chats, messages }
}

export const actions = {
  setActiveChat: (id: Id | null) => store.setState({ activeChatId: id }),
  ensureChat: (id: Id) => store.setState((s) => upsertChat(s, id)),
  syncChats: (list: ApiChat[]) =>
    store.setState((s) => {
      let acc = s
      for (const c of list) {
        const { users, chats } = upsertChat(acc, c.chatId, {
          type: c.type,
          name: c.name || undefined,
          phone: c.phoneNumber ? String(c.phoneNumber) : undefined,
        })
        acc = { ...acc, users, chats }
      }
      return { users: acc.users, chats: acc.chats }
    }),
  addMessage: (msg: Message, extra: Omit<MessageItem, 'msg'> = {}) =>
    store.setState((s) => addMessages(s, [{ msg, ...extra }])),
  addMessages: (items: MessageItem[]) => store.setState((s) => addMessages(s, items)),
  setAvatar: (chatId: Id, src: string) =>
    store.setState((s) => {
      const chat = s.chats[chatId]
      if (!chat) return {}
      if (chat.peerId) {
        const user = s.users[chat.peerId]
        return { users: { ...s.users, [chat.peerId]: { ...user, id: chat.peerId, avatar: src } } }
      }
      return { chats: { ...s.chats, [chatId]: { ...chat, avatar: src } } }
    }),
  reset: () => {
    clearScroll()
    store.setState(initialState)
  },
}

const userName = (user: User | undefined, fallback: Id) => user?.name || (user?.phone ? `+${user.phone}` : fallback)

export const chatTitle = (users: State['users'], chat: Chat) =>
  chat.peerId ? userName(users[chat.peerId], chat.id) : chat.title || chat.id

export const chatAvatar = (users: State['users'], chat: Chat) =>
  chat.peerId ? users[chat.peerId]?.avatar : chat.avatar
