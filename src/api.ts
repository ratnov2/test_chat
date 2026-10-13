export interface Credentials {
  apiUrl: string
  idInstance: string
  apiTokenInstance: string
}

export const DEFAULT_API_URL = 'https://api.green-api.com'

const base = (c: Credentials, method: string) =>
  `${c.apiUrl.replace(/\/$/, '')}/waInstance${c.idInstance}/${method}/${c.apiTokenInstance}`

const REQUEST_TIMEOUT_MS = 30_000

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Некорректный запрос',
  401: 'Неверный idInstance или apiTokenInstance',
  403: 'Доступ запрещён',
  404: 'Инстанс не найден, проверьте idInstance и apiUrl',
  429: 'Слишком много запросов, попробуйте чуть позже',
  466: 'Превышена квота инстанса GREEN-API',
}

export class ApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export const errorMessage = (e: unknown) => {
  if (e instanceof ApiError) return e.message
  if (e instanceof DOMException && e.name === 'TimeoutError') return 'Сервер слишком долго не отвечает'
  return 'Не удалось выполнить запрос'
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout
  let res: Response
  try {
    res = await fetch(url, { ...init, signal })
  } catch (e) {
    if (e instanceof TypeError) throw new ApiError('Нет соединения с сервером')
    throw e
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`GREEN-API: ${res.status} ${body}`)
    throw new ApiError(
      STATUS_MESSAGES[res.status] ?? (res.status >= 500 ? 'Ошибка сервера, попробуйте позже' : `Ошибка ${res.status}`),
      res.status,
    )
  }
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

export const getChats = (c: Credentials, signal?: AbortSignal) =>
  request<ApiChat[] | null>(base(c, 'getChats'), { signal })

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
