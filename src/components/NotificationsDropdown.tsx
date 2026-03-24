import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Bell, MessageCircle, Calendar, MapPin, X,
  CheckCircle, XCircle, MessageSquare, Image as ImageIcon,
  Video as VideoIcon, Music, Loader2
} from 'lucide-react'
import {
  collection, query, where, getDocs,
  Timestamp, orderBy, limit, updateDoc, doc, writeBatch
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'
import { UserAvatar } from '@/components/UserAvatar'

interface ServiceRequest {
  id: string
  clientId: string
  clientName: string
  clientAvatar: string
  service: string
  description: string
  scheduledDate: string
  scheduledTime: string
  address: { neighborhood: string; city: string }
  urgency: 'normal' | 'urgent'
  status: string
  createdAt: Timestamp
}

interface CommentNotif {
  id: string
  type: 'media_comment'
  read: boolean
  commenterName: string
  commenterAvatar: string
  commentText: string
  mediaId: string
  mediaType: 'photo' | 'video' | 'audio'
  createdAt: Timestamp
}

interface NotificationsDropdownProps {
  isOpen: boolean
  onClose: () => void
}

const mediaTypeLabel = (type: 'photo' | 'video' | 'audio') =>
  type === 'photo' ? 'foto' : type === 'video' ? 'vídeo' : 'áudio'

const mediaTypeIcon = (type: 'photo' | 'video' | 'audio') => {
  if (type === 'video') return VideoIcon
  if (type === 'audio') return Music
  return ImageIcon
}

export const NotificationsDropdown = ({ isOpen, onClose }: NotificationsDropdownProps) => {
  const { user } = useSimpleAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [commentNotifs, setCommentNotifs] = useState<CommentNotif[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !user?.id) return
    setLoading(true)

    const loadAll = async () => {
      try {
        // Solicitações pendentes
        const reqQ = query(
          collection(db, 'serviceRequests'),
          where('providerId', '==', user.id),
          where('status', '==', 'pending'),
          orderBy('createdAt', 'desc'),
          limit(5)
        )
        const reqSnap = await getDocs(reqQ)
        setRequests(reqSnap.docs.map(d => ({ id: d.id, ...d.data() })) as ServiceRequest[])

        // Comentários não lidos
        const comQ = query(
          collection(db, 'notifications', user.id, 'items'),
          where('type', '==', 'media_comment'),
          where('read', '==', false),
          orderBy('createdAt', 'desc'),
          limit(10)
        )
        const comSnap = await getDocs(comQ)
        setCommentNotifs(comSnap.docs.map(d => ({ id: d.id, ...d.data() })) as CommentNotif[])
      } catch (err) {
        console.error('[NotificationsDropdown] Erro:', err)
      } finally {
        setLoading(false)
      }
    }

    loadAll()
  }, [isOpen, user?.id])

  const handleAccept = async (e: React.MouseEvent, requestId: string) => {
    e.stopPropagation()
    setActionLoading(requestId)
    try {
      await updateDoc(doc(db, 'serviceRequests', requestId), {
        status: 'accepted',
        updatedAt: Timestamp.now(),
        acceptedAt: Timestamp.now(),
      })
      setRequests(prev => prev.filter(r => r.id !== requestId))
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (e: React.MouseEvent, requestId: string) => {
    e.stopPropagation()
    if (!confirm('Recusar esta solicitação?')) return
    setActionLoading(requestId)
    try {
      await updateDoc(doc(db, 'serviceRequests', requestId), {
        status: 'rejected',
        updatedAt: Timestamp.now(),
      })
      setRequests(prev => prev.filter(r => r.id !== requestId))
    } finally {
      setActionLoading(null)
    }
  }

  const handleMarkCommentRead = async (notifId: string) => {
    if (!user?.id) return
    try {
      await updateDoc(
        doc(db, 'notifications', user.id, 'items', notifId),
        { read: true }
      )
      setCommentNotifs(prev => prev.filter(n => n.id !== notifId))
    } catch (err) {
      console.error('[NotificationsDropdown] markRead:', err)
    }
  }

  const handleMarkAllCommentsRead = async () => {
    if (!user?.id || commentNotifs.length === 0) return
    try {
      const batch = writeBatch(db)
      commentNotifs.forEach(n =>
        batch.update(doc(db, 'notifications', user.id, 'items', n.id), { read: true })
      )
      await batch.commit()
      setCommentNotifs([])
    } catch (err) {
      console.error('[NotificationsDropdown] markAllRead:', err)
    }
  }

  const getTimeAgo = (timestamp: Timestamp) => {
    if (!timestamp?.toDate) return ''
    const diff = Date.now() - timestamp.toDate().getTime()
    const m = Math.floor(diff / 60000)
    const h = Math.floor(diff / 3600000)
    const d = Math.floor(diff / 86400000)
    if (m < 1) return 'Agora'
    if (m < 60) return `${m}min`
    if (h < 24) return `${h}h`
    return `${d}d`
  }

  const totalCount = requests.length + commentNotifs.length

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-96 max-w-[calc(100vw-2rem)] bg-surface border border-border rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-bold text-white">Notificações</h3>
                {totalCount > 0 && (
                  <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-bold rounded-full">
                    {totalCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {commentNotifs.length > 0 && (
                  <button
                    onClick={handleMarkAllCommentsRead}
                    className="text-[10px] text-muted hover:text-primary transition-colors"
                  >
                    Marcar lidas
                  </button>
                )}
                <button onClick={onClose} className="p-1 hover:bg-background rounded-lg transition-colors">
                  <X className="w-4 h-4 text-muted" />
                </button>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="max-h-[480px] overflow-y-auto divide-y divide-border">
              {loading ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              ) : totalCount === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="w-12 h-12 text-muted mx-auto mb-3" />
                  <p className="text-sm text-muted">Nenhuma notificação nova</p>
                </div>
              ) : (
                <>
                  {/* ── Solicitações de serviço ── */}
                  {requests.length > 0 && (
                    <div>
                      <p className="px-4 py-2 text-[10px] font-bold text-muted uppercase tracking-wider bg-background/50">
                        Solicitações de serviço
                      </p>
                      {requests.map((request) => (
                        <div
                          key={request.id}
                          onClick={() => { onClose(); navigate(`/prestador/solicitacoes?highlight=${request.id}`) }}
                          className="p-4 hover:bg-background transition-colors cursor-pointer"
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <div className="relative">
                              <img
                                src={request.clientAvatar}
                                alt={request.clientName}
                                className="w-10 h-10 rounded-full object-cover border-2 border-border"
                              />
                              {request.urgency === 'urgent' && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-surface" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-white truncate">{request.clientName}</p>
                              <p className="text-xs text-primary font-semibold">Nova solicitação de serviço</p>
                            </div>
                            <span className="text-xs text-muted">{getTimeAgo(request.createdAt)}</span>
                          </div>
                          <div className="space-y-1.5 mb-3">
                            <div className="flex items-center gap-2">
                              <MessageCircle className="w-3.5 h-3.5 text-muted" />
                              <p className="text-sm text-white line-clamp-1">{request.service}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-muted" />
                              <p className="text-xs text-muted">
                                {new Date(request.scheduledDate).toLocaleDateString('pt-BR')} às {request.scheduledTime}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-muted" />
                              <p className="text-xs text-muted truncate">{request.address.neighborhood}, {request.address.city}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => handleAccept(e, request.id)}
                              disabled={actionLoading === request.id}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />Aceitar
                            </button>
                            <button
                              onClick={(e) => handleReject(e, request.id)}
                              disabled={actionLoading === request.id}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5" />Recusar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── Comentários em mídia ── */}
                  {commentNotifs.length > 0 && (
                    <div>
                      <p className="px-4 py-2 text-[10px] font-bold text-muted uppercase tracking-wider bg-background/50">
                        Comentários no portfólio
                      </p>
                      {commentNotifs.map((notif) => {
                        const MediaIcon = mediaTypeIcon(notif.mediaType)
                        return (
                          <div
                            key={notif.id}
                            className="p-4 hover:bg-background transition-colors cursor-pointer flex items-start gap-3"
                            onClick={() => handleMarkCommentRead(notif.id)}
                          >
                            <UserAvatar
                              src={notif.commenterAvatar}
                              name={notif.commenterName}
                              size={36}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                <p className="text-sm font-bold text-white">{notif.commenterName}</p>
                                <span className="text-xs text-muted">comentou na sua</span>
                                <span className="inline-flex items-center gap-1 text-xs text-primary font-semibold">
                                  <MediaIcon className="w-3 h-3" />
                                  {mediaTypeLabel(notif.mediaType)}
                                </span>
                              </div>
                              <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                                &ldquo;{notif.commentText}&rdquo;
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <span className="text-[10px] text-muted">{getTimeAgo(notif.createdAt)}</span>
                              <div className="w-2 h-2 bg-primary rounded-full" title="Não lida" />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {requests.length > 0 && (
              <div className="px-4 py-3 border-t border-border">
                <button
                  onClick={() => { onClose(); navigate('/prestador/solicitacoes') }}
                  className="w-full py-2 text-sm text-primary font-semibold hover:text-primary-light transition-colors"
                >
                  Ver todas as solicitações
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
