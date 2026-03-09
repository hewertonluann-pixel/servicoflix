import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  collection,
  increment,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

/** Gera um chatId determinístico a partir de dois UIDs */
export const getChatId = (uid1: string, uid2: string): string =>
  [uid1, uid2].sort().join('_')

export interface ChatParticipantInfo {
  name: string
  avatar: string  // avatar pessoal
  providerAvatar?: string  // avatar profissional (se for prestador)
}

export interface ChatMeta {
  id: string
  participants: string[]
  participantsInfo: Record<string, ChatParticipantInfo>
  lastMessage: string
  lastMessageAt: any
  lastMessageBy: string
  unreadCount: Record<string, number>
  relatedServiceRequest?: string
}

export interface Message {
  id: string
  senderId: string
  text: string
  createdAt: any
  readAt?: any
  type: 'text' | 'image' | 'service_request'
}

/**
 * Busca ou cria um chat entre dois usuários.
 * Retorna o chatId.
 */
export const createOrGetChat = async (
  currentUser: { id: string; name: string; avatar?: string; providerAvatar?: string },
  otherUser: { id: string; name: string; avatar?: string; providerAvatar?: string },
  relatedServiceRequest?: string
): Promise<string> => {
  const chatId = getChatId(currentUser.id, otherUser.id)
  const chatRef = doc(db, 'chats', chatId)
  const chatSnap = await getDoc(chatRef)

  if (!chatSnap.exists()) {
    await setDoc(chatRef, {
      participants: [currentUser.id, otherUser.id],
      participantsInfo: {
        [currentUser.id]: {
          name: currentUser.name,
          avatar: currentUser.avatar || '',
          ...(currentUser.providerAvatar ? { providerAvatar: currentUser.providerAvatar } : {}),
        },
        [otherUser.id]: {
          name: otherUser.name,
          avatar: otherUser.avatar || '',
          ...(otherUser.providerAvatar ? { providerAvatar: otherUser.providerAvatar } : {}),
        },
      },
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
      lastMessageBy: currentUser.id,
      unreadCount: {
        [currentUser.id]: 0,
        [otherUser.id]: 0,
      },
      ...(relatedServiceRequest ? { relatedServiceRequest } : {}),
    })
  }

  return chatId
}

/**
 * Envia uma mensagem e atualiza os metadados do chat.
 */
export const sendMessage = async (
  chatId: string,
  senderId: string,
  receiverId: string,
  text: string,
  type: Message['type'] = 'text'
): Promise<void> => {
  const trimmed = text.trim()
  if (!trimmed) return

  const messagesRef = collection(db, 'chats', chatId, 'messages')
  await addDoc(messagesRef, {
    senderId,
    text: trimmed,
    createdAt: serverTimestamp(),
    type,
  })

  const chatRef = doc(db, 'chats', chatId)
  await updateDoc(chatRef, {
    lastMessage: trimmed,
    lastMessageAt: serverTimestamp(),
    lastMessageBy: senderId,
    [`unreadCount.${receiverId}`]: increment(1),
  })
}

/**
 * Zera o contador de não lidos do usuário ao abrir o chat.
 */
export const markChatAsRead = async (chatId: string, userId: string): Promise<void> => {
  const chatRef = doc(db, 'chats', chatId)
  await updateDoc(chatRef, {
    [`unreadCount.${userId}`]: 0,
  }).catch(() => {})  // silencia se o chat ainda não existe
}
