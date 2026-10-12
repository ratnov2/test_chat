export interface Credentials {
  apiUrl: string
  idInstance: string
  apiTokenInstance: string
}

export const DEFAULT_API_URL = 'https://api.green-api.com'

const base = (c: Credentials, method: string) =>
  `${c.apiUrl.replace(/\/$/, '')}/waInstance${c.idInstance}/${method}/${c.apiTokenInstance}`

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(`GREEN-API: ${res.status} ${await res.text()}`)
  const text = await res.text()
  return (text ? JSON.parse(text) : null) as T
}

const post = <T>(c: Credentials, method: string, body: unknown) =>
  request<T>(base(c, method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

export const checkAccount = (c: Credentials, phone: string) =>
  post<{ exist: boolean; chatId: string }>(c, 'checkAccount', { phoneNumber: Number(phone) })

export const sendMessage = (c: Credentials, chatId: string, message: string) =>
  post<{ idMessage: string }>(c, 'sendMessage', { chatId, message })

export const getAvatar = (c: Credentials, chatId: string) =>
  post<{ urlAvatar?: string; base64Avatar?: string; available: boolean }>(c, 'getAvatar', { chatId })

export interface ApiHistoryMessage {
  type: 'incoming' | 'outgoing'
  idMessage: string
  timestamp: number
  typeMessage: string
  chatId: string
  textMessage?: string
  caption?: string
  senderId?: string
  senderName?: string
  senderContactName?: string
  extendedTextMessage?: { text?: string }
}

export const getChatHistory = (c: Credentials, chatId: string, count = 100) =>
  post<ApiHistoryMessage[] | null>(c, 'getChatHistory', { chatId, count })

export interface ApiChat {
  chatId: string
  name: string
  type: 'user' | 'group' | 'channel' | 'bot'
  phoneNumber: number
}

export const getChats = (c: Credentials) => request<ApiChat[] | null>(base(c, 'getChats'))

export interface Notification {
  receiptId: number
  body: {
    typeWebhook: string
    timestamp: number
    idMessage: string
    senderData?: { chatId: string; chatName?: string; sender?: string; senderName?: string }
    messageData?: {
      typeMessage: string
      textMessageData?: { textMessage: string }
      extendedTextMessageData?: { text: string }
    }
  }
}

export const receiveNotification = (c: Credentials, signal?: AbortSignal) =>
  request<Notification | null>(`${base(c, 'receiveNotification')}?receiveTimeout=10`, { signal })

export const deleteNotification = (c: Credentials, receiptId: number) =>
  request<{ result: boolean }>(`${base(c, 'deleteNotification')}/${receiptId}`, { method: 'DELETE' })
