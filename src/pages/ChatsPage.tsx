import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'
import { motion } from 'framer-motion'
import { MessageCircle, Loader2, ArrowLeft, Compass, Trash2, AlertTriangle } from 'lucide-react'
import { ChatMeta, deleteChat } from '@/lib/chatUtils'
import { UserAvatar } from '@/components/UserAvatar'
import { resolveAvatarFromDoc } from '@/lib/avatarUtils'

const formatRelative = (timestamp: any): string => {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `${diffMin}min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h`
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export const ChatsPage = () => {
  const { user } = useSimpleAuth()
  const navigate = useNavigate()
  const [chats, setChats] = useState<ChatMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
    const [deleteSuccess, setDeleteSuccess] = useState(false)

  useEffect(() => {
    if (!user?.id) return

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.id),
      orderBy('lastMessageAt', 'desc')
    )

    const unsub = onSnapshot(q, (snap) => {
      const list: ChatMeta[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ChatMeta, 'id'>),
      }))
      setChats(list)
      setLoading(false)
    }, (err) => {
      console.error('[ChatsPage]', err)
      setLoading(false)
    })

    return () => unsub()
  }, [user?.id])

  if (!user) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center px-4">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 text-muted mx-auto mb-4" />
          <p className="text-white font-semibold mb-2">Faça login para ver suas mensagens</p>
          <button
            onClick={() => navigate('/entrar?redirect=/chats')}
            className="mt-2 px-6 py-2.5 bg-primary text-background font-bold rounded-xl text-sm"
          >
            Entrar
          </button>
        </div>
      </div>
    )
  }

  const handleDeleteChat = async (chatId: string) => {
    setDeletingId(chatId)
    try {
          let hasError = false
      await deleteChat(chatId)

            // Log para debug
      console.log('[ChatsPage] Chat excluído com sucesso:', chatId)
    } catch (err) {
      console.error('[ChatsPage] Erro ao excluir chat:', err)
            hasError = true
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)

      // Mostra mensagem de sucesso apenas se não houver erro
      if (!hasError) {
        setDeleteSuccess(true)
        setTimeout(() => setDeleteSuccess(false), 3000)
      }
    }
  }

  const totalUnread = chats.reduce((sum, c) => sum + (c.unreadCount?.[user.id] || 0), 0)

  return (
    <>
          {/* Toast de sucesso ao excluir */}
      {deleteSuccess && (
        <div className="fixed bottom-4 right-4 z-50 bg-surface border border-green-500/40 text-green-300 px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 animate-in slide-in-from-bottom">
          <MessageCircle className="w-4 h-4" />
          Conversa excluída com sucesso.
        </div>
      )}
      <div className="min-h-screen pt-16 pb-20 bg-background">
        <div className="bg-surface border-b border-border sticky top-16 z-10">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-background rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-muted" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                Mensagens
                {totalUnread > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-primary text-background text-[11px] font-black rounded-full">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </h1>
              <p className="text-xs text-muted">{chats.length} conversa{chats.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 mt-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
              <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center">
                <MessageCircle className="w-10 h-10 text-muted" />
              </div>
              <p className="text-white font-semibold text-lg">Nenhuma conversa ainda</p>
              <p className="text-muted text-sm max-w-xs">
                Quando você entrar em contato com um prestador, a conversa aparecerá aqui.
              </p>
              <Link
                to="/buscar"
                className="mt-2 flex items-center gap-2 px-6 py-2.5 bg-primary text-background font-bold rounded-xl hover:bg-primary-dark transition-colors text-sm"
              >
                <Compass className="w-4 h-4" />
                Explorar prestadores
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {chats.map((chat, i) => {
                const otherId = chat.participants.find((p) => p !== user.id) || ''
                const otherInfo = chat.participantsInfo?.[otherId]
                const unread = chat.unreadCount?.[user.id] || 0

                const otherAvatar = resolveAvatarFromDoc({
                  avatar: otherInfo?.avatar,
                  googlePhotoURL: (otherInfo as any)?.googlePhotoURL,
                  providerProfile: otherInfo?.providerAvatar
                    ? { avatar: otherInfo.providerAvatar }
                    : undefined,
                })
                const otherName = otherInfo?.name || 'Usuário'

                return (
                  <motion.div
                    key={chat.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`w-full border rounded-xl p-4 flex items-center gap-4 hover:border-primary/50 transition-all ${
                      unread > 0 ? 'bg-primary/5 border-primary/30' : 'bg-surface border-border'
                    }`}
                  >
                    {/* ✅ Tag de abertura corrigida — faltava o ">" no original */}
                    <button
                      onClick={() => navigate(`/chat/${chat.id}`)}
                      className="flex-1 flex items-center gap-4 text-left min-w-0"
                    >
                      <div className="relative shrink-0">
                        <UserAvatar src={otherAvatar} name={otherName} size={48} />
                        {unread > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-primary text-background text-[10px] font-black rounded-full flex items-center justify-center px-1">
                            {unread > 9 ? '9+' : unread}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className={`text-sm truncate ${unread > 0 ? 'font-bold text-white' : 'font-semibold text-white/80'}`}>
                            {otherName}
                          </p>
                          <p className={`text-[11px] shrink-0 ml-2 ${unread > 0 ? 'text-primary font-semibold' : 'text-muted'}`}>
                            {formatRelative(chat.lastMessageAt)}
                          </p>
                        </div>
                        <p className={`text-xs truncate ${unread > 0 ? 'text-white/70 font-medium' : 'text-muted'}`}>
                          {chat.lastMessageBy === user.id ? 'Você: ' : ''}
                          {chat.lastMessage || 'Sem mensagens ainda'}
                        </p>
                      </div>
                    </button>

                    {/* Botão de excluir */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setConfirmDeleteId(chat.id)
                      }}
                      className="shrink-0 p-2 rounded-lg text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      title="Excluir conversa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmação de exclusão */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Excluir conversa</h3>
                <p className="text-sm text-muted">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <p className="text-sm text-muted mb-6">
              Todas as mensagens desta conversa serão apagadas permanentemente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={deletingId === confirmDeleteId}
                className="flex-1 py-2.5 rounded-xl border border-border text-muted font-semibold text-sm hover:text-white transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteChat(confirmDeleteId)}
                disabled={deletingId === confirmDeleteId}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingId === confirmDeleteId ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {deletingId === confirmDeleteId ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
