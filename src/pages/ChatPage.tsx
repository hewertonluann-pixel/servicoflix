import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Send, Loader2, MessageCircle, AlertCircle, ExternalLink } from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'
import { useMessages } from '@/hooks/useMessages'
import { usePresence, useUserPresence, formatLastSeen } from '@/hooks/usePresence'
import {
  createOrGetChat,
  sendMessage,
  markChatAsRead,
  ChatParticipantInfo,
} from '@/lib/chatUtils'

const formatTime = (timestamp: any): string => {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  if (isToday) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) +
    ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export const ChatPage = () => {
  const { chatId: chatIdParam } = useParams<{ chatId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useSimpleAuth()

  const withUserId = searchParams.get('with')

  const [chatId, setChatId] = useState<string | null>(chatIdParam || null)
  const [otherUser, setOtherUser] = useState<ChatParticipantInfo & { id: string; isProvider?: boolean } | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { messages } = useMessages(chatId)

  // Publica presença do usuário atual
  usePresence()

  // Observa presença do outro usuário
  const { isOnline, lastSeen } = useUserPresence(otherUser?.id)

  useEffect(() => {
    if (!user?.id) return

    const init = async () => {
      setLoading(true)
      setError('')
      try {
        let resolvedChatId = chatIdParam || null

        if (withUserId && !chatIdParam) {
          const otherSnap = await getDoc(doc(db, 'users', withUserId))
          if (!otherSnap.exists()) {
            setError('Usuário não encontrado')
            setLoading(false)
            return
          }
          const otherData = otherSnap.data()
          const otherInfo = {
            id: withUserId,
            name: otherData.providerProfile?.professionalName || otherData.name || 'Usuário',
            avatar: otherData.avatar || '',
            providerAvatar: otherData.providerProfile?.avatar || undefined,
            isProvider: !!otherData.providerProfile,
          }
          setOtherUser(otherInfo)

          resolvedChatId = await createOrGetChat(
            {
              id: user.id,
              name: user.name,
              avatar: user.avatar || '',
            },
            otherInfo
          )
          navigate(`/chat/${resolvedChatId}`, { replace: true })
        }

        if (resolvedChatId) {
          setChatId(resolvedChatId)

          const chatSnap = await getDoc(doc(db, 'chats', resolvedChatId))
          if (chatSnap.exists()) {
            const chatData = chatSnap.data()
            const otherId = chatData.participants.find((p: string) => p !== user.id)
            if (otherId) {
              const info = chatData.participantsInfo?.[otherId]
              const otherSnap = await getDoc(doc(db, 'users', otherId))
              const isProvider = otherSnap.exists() && !!otherSnap.data().providerProfile
              setOtherUser({ id: otherId, isProvider, ...info })
            }
          }

          await markChatAsRead(resolvedChatId, user.id)
        }
      } catch (err) {
        console.error('[ChatPage] Erro ao inicializar:', err)
        setError('Erro ao carregar conversa')
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [user?.id, chatIdParam, withUserId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!text.trim() || !chatId || !user?.id || !otherUser) return
    setSending(true)
    try {
      await sendMessage(chatId, user.id, otherUser.id, text)
      setText('')
      inputRef.current?.focus()
    } catch (err) {
      console.error('[ChatPage] Erro ao enviar:', err)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const getDisplayAvatar = (senderId: string) => {
    if (senderId === user?.id) {
      return user.avatar || `https://i.pravatar.cc/40?u=${user.id}`
    }
    return otherUser?.providerAvatar || otherUser?.avatar || `https://i.pravatar.cc/40?u=${senderId}`
  }

  if (!user) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <p className="text-muted">Faça login para acessar o chat.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-white font-semibold mb-1">{error}</p>
          <button onClick={() => navigate(-1)} className="text-primary text-sm hover:underline">Voltar</button>
        </div>
      </div>
    )
  }

  const otherDisplayName = otherUser?.name || 'Conversa'
  const otherAvatar = otherUser?.providerAvatar || otherUser?.avatar || `https://i.pravatar.cc/40?u=${otherUser?.id}`

  // Subítulo de presença
  const presenceLabel = isOnline
    ? null // exibido como badge verde separado
    : formatLastSeen(lastSeen)

  return (
    <div className="flex flex-col h-screen pt-16 bg-background">
      {/* Header */}
      <div className="bg-surface border-b border-border px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={() => navigate('/chats')}
          className="p-2 hover:bg-background rounded-lg transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-muted" />
        </button>

        {otherUser?.isProvider ? (
          <Link
            to={`/prestador/${otherUser.id}`}
            className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
          >
            {/* Avatar com indicador de presença */}
            <div className="relative shrink-0">
              <img
                src={otherAvatar}
                alt={otherDisplayName}
                className="w-10 h-10 rounded-full object-cover border-2 border-border"
              />
              {isOnline && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-surface rounded-full" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-white font-semibold text-sm truncate">{otherDisplayName}</p>
                <ExternalLink className="w-3 h-3 text-muted shrink-0" />
              </div>
              <p className={`text-xs ${isOnline ? 'text-green-400 font-medium' : 'text-muted'}`}>
                {isOnline ? 'Online agora' : presenceLabel}
              </p>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative shrink-0">
              <img
                src={otherAvatar}
                alt={otherDisplayName}
                className="w-10 h-10 rounded-full object-cover border-2 border-border"
              />
              {isOnline && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-surface rounded-full" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{otherDisplayName}</p>
              <p className={`text-xs ${isOnline ? 'text-green-400 font-medium' : 'text-muted'}`}>
                {isOnline ? 'Online agora' : presenceLabel}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-16">
            <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-muted" />
            </div>
            <p className="text-white font-semibold">Nenhuma mensagem ainda</p>
            <p className="text-muted text-sm">Inicie a conversa com {otherDisplayName}</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMe = msg.senderId === user.id
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={`flex items-end gap-2 ${ isMe ? 'flex-row-reverse' : 'flex-row' }`}
              >
                {!isMe && (
                  <img
                    src={getDisplayAvatar(msg.senderId)}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover shrink-0"
                  />
                )}

                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMe
                      ? 'bg-primary text-background rounded-br-sm'
                      : 'bg-surface border border-border text-white rounded-bl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                  <p className={`text-[10px] mt-1 text-right ${ isMe ? 'text-background/60' : 'text-muted' }`}>
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-surface border-t border-border px-4 py-3 flex items-end gap-3 shrink-0">
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escreva uma mensagem..."
          rows={1}
          className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-white text-sm focus:border-primary outline-none transition-colors resize-none max-h-32"
          style={{ height: 'auto' }}
          onInput={(e) => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = Math.min(el.scrollHeight, 128) + 'px'
          }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="w-11 h-11 bg-primary text-background rounded-xl flex items-center justify-center hover:bg-primary-dark transition-colors disabled:opacity-40 shrink-0"
        >
          {sending
            ? <Loader2 className="w-5 h-5 animate-spin" />
            : <Send className="w-5 h-5" />}
        </button>
      </div>
    </div>
  )
}
