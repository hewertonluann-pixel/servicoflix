import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
  collection,
  increment,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

/** Gera um chatId determinístico a partir de dois UIDs */
export const getChatId = (uid1: string, uid2: string): string =>
  [uid1, uid2].sort().join('_')

export interface ChatParticipantInfo {
  name: string
  avatar: string
  providerAvatar?: string
  googlePhotoURL?: string  // foto Google — fallback confiável mesmo após URL de Storage expirar
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
  currentUser: { id: string; name: string; avatar?: string; providerAvatar?: string; googlePhotoURL?: string },
  otherUser: { id: string; name: string; avatar?: string; providerAvatar?: string; googlePhotoURL?: string },
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
          ...(currentUser.googlePhotoURL ? { googlePhotoURL: currentUser.googlePhotoURL } : {}),
        },
        [otherUser.id]: {
          name: otherUser.name,
          avatar: otherUser.avatar || '',
          ...(otherUser.providerAvatar ? { providerAvatar: otherUser.providerAvatar } : {}),
          ...(otherUser.googlePhotoURL ? { googlePhotoURL: otherUser.googlePhotoURL } : {}),
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
  }).catch(() => {})
}

/**
 * Exclui um chat e todas as suas mensagens do Firestore.
 * Usa writeBatch para deletar mensagens em lote (limite 500 por batch).
 */
export const deleteChat = async (chatId: string): Promise<void> => {
  const messagesRef = collection(db, 'chats', chatId, 'messages')
  const messagesSnap = await getDocs(messagesRef)

  // Deleta mensagens em lotes de até 500
  const batchSize = 500
  const docs = messagesSnap.docs
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = writeBatch(db)
    docs.slice(i, i + batchSize).forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }

  // Deleta o documento do chat
  await deleteDoc(doc(db, 'chats', chatId))
}
