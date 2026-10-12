export type Id = string

export const ME_ID: Id = 'me'

export interface User {
  id: Id
  name?: string
  phone?: string
  avatar?: string
}

export type ChatType = 'user' | 'group' | 'channel' | 'bot'

export interface Chat {
  id: Id
  type: ChatType
  peerId?: Id
  title?: string
  avatar?: string
  messageIds: Id[]
}

export interface Message {
  id: Id
  chatId: Id
  senderId: Id
  text: string
  ts: number
}
