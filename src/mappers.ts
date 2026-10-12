import type { ApiHistoryMessage, Notification } from './api'
import { ME_ID, type Message } from './store'

export interface MessageItem {
  msg: Message
  chatName?: string
  senderName?: string
}

const isGroup = (chatId: string) => chatId.endsWith('@g.us')

export function fromNotification({
  typeWebhook,
  idMessage,
  timestamp,
  senderData,
  messageData,
}: Notification['body']): MessageItem | null {
  const incoming = typeWebhook === 'incomingMessageReceived'
  const outgoing = typeWebhook === 'outgoingMessageReceived'
  const text = messageData?.textMessageData?.textMessage ?? messageData?.extendedTextMessageData?.text
  if (!(incoming || outgoing) || !senderData || !text) return null

  const { chatId, chatName, sender, senderName } = senderData
  return {
    msg: { id: idMessage, chatId, senderId: outgoing ? ME_ID : (sender ?? chatId), text, ts: timestamp * 1000 },
    chatName: incoming && !isGroup(chatId) ? senderName || chatName : chatName,
    senderName,
  }
}

export function fromHistory(chatId: string, h: ApiHistoryMessage): MessageItem | null {
  const text = h.textMessage ?? h.extendedTextMessage?.text ?? h.caption
  if (!text) return null
  const out = h.type === 'outgoing'
  return {
    msg: { id: h.idMessage, chatId, senderId: out ? ME_ID : (h.senderId ?? chatId), text, ts: h.timestamp * 1000 },
    senderName: out ? undefined : h.senderContactName || h.senderName,
  }
}
