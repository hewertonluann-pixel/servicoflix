import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Send, Loader2, MessageCircle, AlertCircle, ExternalLink, MoreVertical, Trash2, ShieldX, Flag } from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'
import { useMessages } from '@/hooks/useMessages'
import { usePresence, useUserPresence, formatLastSeen } from '@/hooks/usePresence'
import { createOrGetChat, sendMessage, markChatAsRead, ChatParticipantInfo, deleteChat } from '@/lib/chatUtils'
import { resolveAvatarFromDoc } from '@/lib/avatarUtils'
import { UserAvatar } from '@/components/UserAvatar'

const formatTime = (timestamp: any): string => {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  if (isToday) return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
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

  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [deletingChat, setDeletingChat] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { messages } = useMessages(chatId)

  usePresence()
  const { isOnline, lastSeen } = useUserPresence(otherUser?.id)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchOtherUser = async (otherId: string, fallbackInfo?: Partial<ChatParticipantInfo>) => {
    const snap = await getDoc(doc(db, 'users', otherId))
    if (!snap.exists()) return null
    const data = snap.data()
    const isProvider = !!data.providerProfile
    const resolvedAvatar = resolveAvatarFromDoc(data)
    return {
      id: otherId,
      isProvider,
      name: data.providerProfile?.professionalName || data.name || fallbackInfo?.name || 'Usuário',
      avatar: resolvedAvatar || fallbackInfo?.avatar || '',
    }
  }

  useEffect(() => {
    if (!user?.id) return
    const init = async () => {
      setLoading(true)
      setError('')
      try {
        let resolvedChatId = chatIdParam || null

        if (withUserId && !chatIdParam) {
          const otherInfo = await fetchOtherUser(withUserId)
          if (!otherInfo) { setError('Usuário não encontrado'); setLoading(false); return }
          setOtherUser(otherInfo)
          resolvedChatId = await createOrGetChat(
            { id: user.id, name: user.name, avatar: user.avatar || '' },
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
              const fallback = chatData.participantsInfo?.[otherId]
              const freshOther = await fetchOtherUser(otherId, fallback)
              if (freshOther) setOtherUser(freshOther)
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
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleDeleteChat = async () => {
    if (!chatId) return
    setDeletingChat(true)
    try {
      await deleteChat(chatId)
      navigate('/chats', { replace: true })
    } catch (err) {
      console.error('[ChatPage] Erro ao excluir chat:', err)
    } finally {
      setDeletingChat(false)
      setConfirmDeleteOpen(false)
    }
  }

  if (!user) return <div className="min-h-screen pt-16 flex items-center justify-center"><p className="text-muted">Faça login para acessar o chat.</p></div>
  if (loading) return <div className="min-h-screen pt-16 flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
  if (error) return (
    <div className="min-h-screen pt-16 flex items-center justify-center">
      <div className="text-center"><AlertCircle className="w-10 h-10 text-muted mx-auto mb-3" /><p className="text-white font-semibold mb-1">{error}</p><button onClick={() => navigate(-1)} className="text-primary text-sm hover:underline">Voltar</button></div>
    </div>
  )

  const otherDisplayName = otherUser?.name || 'Conversa'
  const otherAvatar = otherUser?.avatar || ''
  const presenceLabel = isOnline ? null : formatLastSeen(lastSeen)

  return (
    <>
      <div className="flex flex-col h-screen pt-16 bg-background">
        {/* Header */}
        <div className="bg-surface border-b border-border px-4 py-3 flex items-center gap-3 shrink-0">
          <button onClick={() => navigate('/chats')} className="p-2 hover:bg-background rounded-lg transition-colors shrink-0">
            <ArrowLeft className="w-5 h-5 text-muted" />
          </button>

          {otherUser?.isProvider ? (
            <Link to={`/prestador/${otherUser.id}`} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity">
              <div className="relative shrink-0">
                <UserAvatar src={otherAvatar} name={otherDisplayName} size={40} />
                {isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-surface rounded-full" />}
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
                <UserAvatar src={otherAvatar} name={otherDisplayName} size={40} />
                {isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-surface rounded-full" />}
              </div>
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm truncate">{otherDisplayName}</p>
                <p className={`text-xs ${isOnline ? 'text-green-400 font-medium' : 'text-muted'}`}>
                  {isOnline ? 'Online agora' : presenceLabel}
                </p>
              </div>
            </div>
          )}

          {/* Menu "..." */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-2 rounded-full hover:bg-background transition-colors"
              aria-label="Mais opções"
            >
              <MoreVertical className="w-5 h-5 text-muted" />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-xl shadow-xl py-1 z-50"
                >
                  <button
                    onClick={() => { setMenuOpen(false); setConfirmDeleteOpen(true) }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-background text-left text-red-400 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir conversa
                  </button>

                  <button
                    onClick={() => { setMenuOpen(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-background text-left text-muted text-sm"
                  >
                    <ShieldX className="w-4 h-4" />
                    Bloquear usuário
                  </button>

                  <button
                    onClick={() => { setMenuOpen(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-background text-left text-muted text-sm"
                  >
                    <Flag className="w-4 h-4" />
                    Denunciar
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
              const avatarSrc = isMe ? (user.avatar || '') : otherAvatar
              const avatarName = isMe ? user.name : otherDisplayName
              return (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}
                  className={`flex items-end gap-2 ${ isMe ? 'flex-row-reverse' : 'flex-row' }`}
                >
                  {!isMe && <UserAvatar src={avatarSrc} name={avatarName} size={28} />}
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMe ? 'bg-primary text-background rounded-br-sm' : 'bg-surface border border-border text-white rounded-bl-sm'
                  }`}>
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
          <textarea ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Escreva uma mensagem..." rows={1}
            className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-white text-sm focus:border-primary outline-none transition-colors resize-none max-h-32"
            style={{ height: 'auto' }}
            onInput={(e) => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 128) + 'px' }}
          />
          <button onClick={handleSend} disabled={!text.trim() || sending}
            className="w-11 h-11 bg-primary text-background rounded-xl flex items-center justify-center hover:bg-primary-dark transition-colors disabled:opacity-40 shrink-0"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Modal exclusão */}
      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Excluir conversa</h3>
                <p className="text-sm text-muted">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <p className="text-sm text-muted mb-6">
              Todas as mensagens serão apagadas permanentemente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteOpen(false)}
                disabled={deletingChat}
                className="flex-1 py-2.5 rounded-xl border border-border text-muted font-semibold text-sm hover:text-white transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteChat}
                disabled={deletingChat}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deletingChat ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
