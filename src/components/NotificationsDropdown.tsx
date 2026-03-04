import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Bell, MessageCircle, Calendar, MapPin, Clock, X, CheckCircle, XCircle } from 'lucide-react'
import { collection, query, where, getDocs, Timestamp, orderBy, limit, updateDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'

interface ServiceRequest {
  id: string
  clientId: string
  clientName: string
  clientAvatar: string
  service: string
  description: string
  scheduledDate: string
  scheduledTime: string
  address: {
    neighborhood: string
    city: string
  }
  urgency: 'normal' | 'urgent'
  status: string
  createdAt: Timestamp
}

interface NotificationsDropdownProps {
  isOpen: boolean
  onClose: () => void
}

export const NotificationsDropdown = ({ isOpen, onClose }: NotificationsDropdownProps) => {
  const { user } = useSimpleAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Carrega solicitações pendentes
  useEffect(() => {
    if (!isOpen || !user?.id) return

    const loadRequests = async () => {
      try {
        const q = query(
          collection(db, 'serviceRequests'),
          where('providerId', '==', user.id),
          where('status', '==', 'pending'),
          orderBy('createdAt', 'desc'),
          limit(5)
        )
        const snapshot = await getDocs(q)
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as ServiceRequest[]
        setRequests(data)
      } catch (err) {
        console.error('Erro ao carregar notificações:', err)
      } finally {
        setLoading(false)
      }
    }

    loadRequests()
  }, [isOpen, user])

  // Aceitar solicitação
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
    } catch (err) {
      console.error('Erro ao aceitar:', err)
    } finally {
      setActionLoading(null)
    }
  }

  // Recusar solicitação
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
    } catch (err) {
      console.error('Erro ao recusar:', err)
    } finally {
      setActionLoading(null)
    }
  }

  // Navegar para detalhes
  const handleViewAll = () => {
    onClose()
    navigate('/prestador/solicitacoes')
  }

  const handleClickRequest = (requestId: string) => {
    onClose()
    navigate(`/prestador/solicitacoes?highlight=${requestId}`)
  }

  const getTimeAgo = (timestamp: Timestamp) => {
    const now = Date.now()
    const date = timestamp.toDate().getTime()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Agora'
    if (minutes < 60) return `${minutes}min atrás`
    if (hours < 24) return `${hours}h atrás`
    return `${days}d atrás`
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay para fechar ao clicar fora */}
          <div
            className="fixed inset-0 z-40"
            onClick={onClose}
          />

          {/* Dropdown */}
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
                {requests.length > 0 && (
                  <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-bold rounded-full">
                    {requests.length}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-background rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-muted" />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="py-12 text-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : requests.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="w-12 h-12 text-muted mx-auto mb-3" />
                  <p className="text-sm text-muted">Nenhuma notificação nova</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {requests.map((request) => (
                    <div
                      key={request.id}
                      onClick={() => handleClickRequest(request.id)}
                      className="p-4 hover:bg-background transition-colors cursor-pointer group"
                    >
                      {/* Header do card */}
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
                          <p className="text-sm font-bold text-white truncate">
                            {request.clientName}
                          </p>
                          <p className="text-xs text-primary font-semibold">
                            Nova solicitação de serviço
                          </p>
                        </div>
                        <span className="text-xs text-muted">
                          {getTimeAgo(request.createdAt)}
                        </span>
                      </div>

                      {/* Detalhes */}
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-muted flex-shrink-0" />
                          <p className="text-sm text-white line-clamp-1">{request.service}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted flex-shrink-0" />
                          <p className="text-xs text-muted">
                            {new Date(request.scheduledDate).toLocaleDateString('pt-BR')} às {request.scheduledTime}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted flex-shrink-0" />
                          <p className="text-xs text-muted truncate">
                            {request.address.neighborhood}, {request.address.city}
                          </p>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => handleAccept(e, request.id)}
                          disabled={actionLoading === request.id}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Aceitar
                        </button>
                        <button
                          onClick={(e) => handleReject(e, request.id)}
                          disabled={actionLoading === request.id}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Recusar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {requests.length > 0 && (
              <div className="px-4 py-3 border-t border-border">
                <button
                  onClick={handleViewAll}
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
