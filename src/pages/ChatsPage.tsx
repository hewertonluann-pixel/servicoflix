import { useEffect, useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Loader2, ArrowLeft, Compass, Trash2, AlertTriangle, MoreVertical, Flag, ShieldX } from 'lucide-react'
import { ChatMeta, deleteChat, blockUser, unblockUser } from '@/lib/chatUtils'
import { useBlockedUsers } from '@/hooks/useBlockedUsers'
import { UserAvatar } from '@/components/UserAvatar'
import { resolveAvatarFromDoc } from '@/lib/avatarUtils'
import { ReportModal } from '@/components/ReportModal'

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
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [deleteSuccess, setDeleteSuccess] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [reportChatId, setReportChatId] = useState<string | null>(null)
  const [reportUserId, setReportUserId] = useState<string | null>(null)

  // Bloqueio
  const [confirmBlockData, setConfirmBlockData] = useState<{ chatId: string; otherId: string; otherName: string } | null>(null)
  const [blockingId, setBlockingId] = useState<string | null>(null)
  const { isBlocked } = useBlockedUsers(user?.id)

  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openMenuId) {
        const ref = menuRefs.current[openMenuId]
        if (ref && !ref.contains(e.target as Node)) {
          setOpenMenuId(null)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openMenuId])

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
    setConfirmDeleteId(null)
    setRemovingId(chatId)
    setDeletingId(chatId)

    await new Promise((res) => setTimeout(res, 320))

    setChats((prev) => prev.filter((c) => c.id !== chatId))
    setRemovingId(null)

    try {
      await deleteChat(chatId)
      setDeleteSuccess(true)
      setTimeout(() => setDeleteSuccess(false), 3000)
    } catch (err) {
      console.error('[ChatsPage] Erro ao excluir chat:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const handleBlock = async () => {
    if (!confirmBlockData || !user?.id) return
    setBlockingId(confirmBlockData.otherId)
    try {
      await blockUser(user.id, confirmBlockData.otherId)
      setConfirmBlockData(null)
    } catch (err) {
      console.error('[ChatsPage] Erro ao bloquear:', err)
    } finally {
      setBlockingId(null)
    }
  }

  const handleUnblock = async (otherId: string) => {
    if (!user?.id) return
    try {
      await unblockUser(user.id, otherId)
    } catch (err) {
      console.error('[ChatsPage] Erro ao desbloquear:', err)
    }
  }

  const totalUnread = chats.reduce((sum, c) => sum + (c.unreadCount?.[user.id] || 0), 0)

  return (
    <>
      {/* Toast de sucesso */}
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
              <AnimatePresence initial={false}>
                {chats.map((chat, i) => {
                  const otherId = chat.participants.find((p) => p !== user.id) || ''
                  const otherInfo = chat.participantsInfo?.[otherId]
                  const unread = chat.unreadCount?.[user.id] || 0
                  const isRemoving = removingId === chat.id
                  const isMenuOpen = openMenuId === chat.id
                  const blocked = isBlocked(otherId)

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
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{
                        opacity: isRemoving ? 0 : 1,
                        x: isRemoving ? 60 : 0,
                        scale: isRemoving ? 0.95 : 1,
                        height: isRemoving ? 0 : 'auto',
                      }}
                      exit={{ opacity: 0, x: 60, scale: 0.95, height: 0 }}
                      transition={{
                        duration: 0.3,
                        ease: 'easeInOut',
                        delay: isRemoving ? 0 : i * 0.04,
                      }}
                      style={{ overflow: 'hidden' }}
                      className={`w-full border rounded-xl p-4 flex items-center gap-4 hover:border-primary/50 transition-colors ${
                        blocked
                          ? 'bg-yellow-500/5 border-yellow-500/20 opacity-70'
                          : unread > 0
                          ? 'bg-primary/5 border-primary/30'
                          : 'bg-surface border-border'
                      }`}
                    >
                      {/* Área clicável do chat */}
                      <button
                        onClick={() => navigate(`/chat/${chat.id}`)}
                        className="flex-1 flex items-center gap-4 text-left min-w-0"
                      >
                        <div className="relative shrink-0">
                          <UserAvatar src={otherAvatar} name={otherName} size={48} />
                          {unread > 0 && !blocked && (
                            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-primary text-background text-[10px] font-black rounded-full flex items-center justify-center px-1">
                              {unread > 9 ? '9+' : unread}
                            </span>
                          )}
                          {blocked && (
                            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-500/20 border border-yellow-500/40 rounded-full flex items-center justify-center text-[10px]">
                              🚫
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5 gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className={`text-sm truncate ${unread > 0 && !blocked ? 'font-bold text-white' : 'font-semibold text-white/80'}`}>
                                {otherName}
                              </p>
                              {blocked && (
                                <span className="shrink-0 px-1.5 py-0.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-[10px] font-semibold rounded-md">
                                  Bloqueado
                                </span>
                              )}
                            </div>
                            <p className={`text-[11px] shrink-0 ${unread > 0 && !blocked ? 'text-primary font-semibold' : 'text-muted'}`}>
                              {formatRelative(chat.lastMessageAt)}
                            </p>
                          </div>
                          <p className={`text-xs truncate ${unread > 0 && !blocked ? 'text-white/70 font-medium' : 'text-muted'}`}>
                            {blocked
                              ? 'Você bloqueou este usuário'
                              : `${chat.lastMessageBy === user.id ? 'Você: ' : ''}${chat.lastMessage || 'Sem mensagens ainda'}`
                            }
                          </p>
                        </div>
                      </button>

                      {/* Menu "..." */}
                      <div
                        className="relative shrink-0"
                        ref={(el) => { menuRefs.current[chat.id] = el }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenMenuId(isMenuOpen ? null : chat.id)
                          }}
                          className="p-2 rounded-full hover:bg-background transition-colors text-muted hover:text-white"
                          aria-label="Mais opções"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        <AnimatePresence>
                          {isMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -4 }}
                              transition={{ duration: 0.15 }}
                              className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-xl shadow-xl py-1 z-50"
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenMenuId(null)
                                  setConfirmDeleteId(chat.id)
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-background text-left text-red-400 text-sm"
                              >
                                <Trash2 className="w-4 h-4" />
                                Excluir conversa
                              </button>

                              {blocked ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setOpenMenuId(null)
                                    handleUnblock(otherId)
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-background text-left text-green-400 text-sm"
                                >
                                  <ShieldX className="w-4 h-4" />
                                  Desbloquear usuário
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setOpenMenuId(null)
                                    setConfirmBlockData({ chatId: chat.id, otherId, otherName })
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-background text-left text-yellow-400 text-sm"
                                >
                                  <ShieldX className="w-4 h-4" />
                                  Bloquear usuário
                                </button>
                              )}

                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenMenuId(null)
                                  setReportUserId(otherId)
                                  setReportChatId(chat.id)
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-background text-left text-muted text-sm"
                              >
                                <Flag className="w-4 h-4" />
                                Denunciar
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Excluir conversa */}
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

      {/* Modal: Bloquear usuário */}
      {confirmBlockData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-yellow-500/15 flex items-center justify-center shrink-0">
                <ShieldX className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Bloquear usuário</h3>
                <p className="text-sm text-muted">{confirmBlockData.otherName}</p>
              </div>
            </div>
            <p className="text-sm text-muted mb-6">
              Você não poderá mais enviar ou receber mensagens desta pessoa. Você pode desbloquear a qualquer momento.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmBlockData(null)}
                disabled={blockingId === confirmBlockData.otherId}
                className="flex-1 py-2.5 rounded-xl border border-border text-muted font-semibold text-sm hover:text-white transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleBlock}
                disabled={blockingId === confirmBlockData.otherId}
                className="flex-1 py-2.5 rounded-xl bg-yellow-500 text-background font-bold text-sm hover:bg-yellow-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {blockingId === confirmBlockData.otherId
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <ShieldX className="w-4 h-4" />
                }
                {blockingId === confirmBlockData.otherId ? 'Bloqueando...' : 'Bloquear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ReportModal */}
      {reportUserId && reportChatId && (
        <ReportModal
          open={!!(reportUserId && reportChatId)}
          onClose={() => { setReportUserId(null); setReportChatId(null) }}
          reportedUserId={reportUserId}
          chatId={reportChatId}
          reportedByUserId={user.id}
        />
      )}
    </>
  )
}
