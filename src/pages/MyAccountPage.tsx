import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, CheckCircle, XCircle, AlertCircle, Calendar,
  DollarSign, Star, MessageCircle, FileText, TrendingUp,
  Loader2, MapPin, X, Send, User, Briefcase, Settings, Sparkles, ChevronRight
} from 'lucide-react'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'
import { useNavigate, Link } from 'react-router-dom'
import {
  collection, query, where, getDocs, doc,
  updateDoc, addDoc, getDoc, Timestamp, orderBy, serverTimestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { createOrGetChat } from '@/lib/chatUtils'
import { SimpleLoginPage } from '@/pages/SimpleLoginPage'

type RequestStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'rejected'
type Tab = 'requests' | 'history'
type StatusFilter = 'all' | RequestStatus

interface ServiceRequest {
  id: string
  clientId: string
  providerId: string
  providerName?: string
  providerAvatar?: string
  service: string
  description: string
  status: RequestStatus
  budgetProposed?: number
  scheduledDate?: string
  scheduledTime?: string
  address?: { neighborhood?: string; city?: string }
  createdAt: Timestamp
  updatedAt?: Timestamp
  reviewId?: string
}

interface ReviewModal {
  requestId: string
  providerId: string
  providerName: string
  providerAvatar: string
  service: string
}

const statusConfig = {
  pending:     { label: 'Pendente',      color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', icon: Clock },
  accepted:    { label: 'Aceito',        color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',    icon: CheckCircle },
  in_progress: { label: 'Em Andamento', color: 'text-primary bg-primary/10 border-primary/20',       icon: TrendingUp },
  completed:   { label: 'Concluído',    color: 'text-green-400 bg-green-400/10 border-green-400/20', icon: CheckCircle },
  cancelled:   { label: 'Cancelado',    color: 'text-red-400 bg-red-400/10 border-red-400/20',      icon: XCircle },
  rejected:    { label: 'Recusado',     color: 'text-gray-400 bg-gray-400/10 border-gray-400/20',   icon: XCircle },
}

// Gera URL de avatar com iniciais via UI Avatars (sem mockup externo)
const avatarFallback = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1a1a2e&color=a78bfa&bold=true&size=80`

export const MyAccountPage = () => {
  const { user, loading: authLoading, isProvider, isClient } = useSimpleAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('requests')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const [reviewModal, setReviewModal] = useState<ReviewModal | null>(null)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return
      setLoading(true)
      try {
        const q = query(
          collection(db, 'serviceRequests'),
          where('clientId', '==', user.id),
          orderBy('createdAt', 'desc')
        )
        const snap = await getDocs(q)
        const data: ServiceRequest[] = []

        for (const d of snap.docs) {
          const req = { id: d.id, ...d.data() } as ServiceRequest

          // Busca dados do prestador se nome ou avatar estiverem ausentes
          if ((!req.providerName || !req.providerAvatar) && req.providerId) {
            try {
              const provSnap = await getDoc(doc(db, 'users', req.providerId))
              if (provSnap.exists()) {
                const pd = provSnap.data()
                req.providerName = req.providerName || pd.providerProfile?.professionalName || pd.name || 'Prestador'
                req.providerAvatar = req.providerAvatar || pd.providerProfile?.avatar || pd.avatar || ''
              }
            } catch {}
          }

          data.push(req)
        }

        setRequests(data)
      } catch (err) {
        console.error('[MyAccountPage] erro ao carregar:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id])

  const handleCancel = async (requestId: string) => {
    if (!confirm('Cancelar esta solicitação?')) return
    setActionLoading(requestId)
    try {
      await updateDoc(doc(db, 'serviceRequests', requestId), {
        status: 'cancelled',
        updatedAt: Timestamp.now(),
      })
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'cancelled' } : r))
    } catch (err) {
      console.error(err)
      alert('Erro ao cancelar. Tente novamente.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleOpenChat = async (request: ServiceRequest) => {
    if (!user?.id || !request.providerId) return
    setActionLoading(request.id)
    try {
      const chatId = await createOrGetChat(
        { id: user.id, name: user.name, avatar: user.avatar || '' },
        {
          id: request.providerId,
          name: request.providerName || 'Prestador',
          avatar: request.providerAvatar || '',
        }
      )
      navigate(`/chat/${chatId}`)
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(null)
    }
  }

  const openReviewModal = (req: ServiceRequest) => {
    setReviewModal({
      requestId: req.id,
      providerId: req.providerId,
      providerName: req.providerName || 'Prestador',
      providerAvatar: req.providerAvatar || '',
      service: req.service,
    })
    setRating(0)
    setHoverRating(0)
    setReviewText('')
  }

  const handleSubmitReview = async () => {
    if (!reviewModal || rating === 0 || !user?.id) return
    setSubmittingReview(true)
    try {
      const reviewRef = await addDoc(collection(db, 'reviews'), {
        clientId: user.id,
        clientName: user.name,
        clientAvatar: user.avatar || '',
        providerId: reviewModal.providerId,
        requestId: reviewModal.requestId,
        service: reviewModal.service,
        rating,
        text: reviewText.trim(),
        createdAt: serverTimestamp(),
      })

      await updateDoc(doc(db, 'serviceRequests', reviewModal.requestId), {
        reviewId: reviewRef.id,
      })

      const allReviewsSnap = await getDocs(
        query(collection(db, 'reviews'), where('providerId', '==', reviewModal.providerId))
      )
      const ratings = allReviewsSnap.docs.map(d => d.data().rating as number)
      const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length

      await updateDoc(doc(db, 'users', reviewModal.providerId), {
        'providerProfile.rating': Math.round(avg * 10) / 10,
        'providerProfile.reviewCount': ratings.length,
      }).catch(() => {})

      setRequests(prev =>
        prev.map(r => r.id === reviewModal.requestId ? { ...r, reviewId: reviewRef.id } : r)
      )
      setReviewModal(null)
    } catch (err) {
      console.error('[Review] erro:', err)
      alert('Erro ao enviar avaliação. Tente novamente.')
    } finally {
      setSubmittingReview(false)
    }
  }

  const formatDate = (val: any): string => {
    if (!val) return '-'
    const date = val?.toDate ? val.toDate() : new Date(val)
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) +
      ' às ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  // Aguarda o Firebase resolver o estado de autenticação
  if (authLoading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  // Usuário não autenticado — exibe a tela de login (mobile e desktop)
  if (!user) {
    return <SimpleLoginPage />
  }

  const activeRequests = requests.filter(r => !['completed', 'cancelled', 'rejected'].includes(r.status))
  const historyRequests = requests.filter(r => ['completed', 'cancelled', 'rejected'].includes(r.status))

  const displayed = activeTab === 'requests' ? activeRequests : historyRequests
  const filtered = statusFilter === 'all' ? displayed : displayed.filter(r => r.status === statusFilter)

  const stats = {
    completed: historyRequests.filter(r => r.status === 'completed').length,
    spent: requests
      .filter(r => r.status === 'completed')
      .reduce((s, r) => s + (r.budgetProposed || 0), 0),
    pending: activeRequests.filter(r => r.status === 'pending').length,
    active: activeRequests.length,
  }

  const shortcutCards = [
    isClient && {
      to: '/meu-perfil-cliente',
      icon: User,
      label: 'Perfil Cliente',
      desc: 'Editar dados e endereço',
      color: 'text-blue-400',
      border: 'border-blue-500/20 hover:border-blue-400/50',
      bg: 'bg-blue-500/10',
    },
    isProvider && {
      to: '/meu-perfil',
      icon: Briefcase,
      label: 'Painel Prestador',
      desc: 'Métricas, serviços e créditos',
      color: 'text-primary',
      border: 'border-primary/20 hover:border-primary/50',
      bg: 'bg-primary/10',
    },
    !isProvider && {
      to: '/tornar-se-prestador',
      icon: Sparkles,
      label: 'Ser Prestador',
      desc: 'Ofereça seus serviços',
      color: 'text-yellow-400',
      border: 'border-yellow-500/20 hover:border-yellow-400/50',
      bg: 'bg-yellow-500/10',
    },
    {
      to: '/configuracoes',
      icon: Settings,
      label: 'Configurações',
      desc: 'Preferências da conta',
      color: 'text-muted',
      border: 'border-border hover:border-white/30',
      bg: 'bg-surface',
    },
  ].filter(Boolean) as {
    to: string; icon: any; label: string; desc: string;
    color: string; border: string; bg: string
  }[]

  return (
    <div className="min-h-screen pt-16 pb-20 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-1">Minha Conta</h1>
          <p className="text-muted text-sm">Gerencie seus perfis e acompanhe suas solicitações</p>
        </div>

        {/* ── Hub de Atalhos ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {shortcutCards.map((card, i) => (
            <motion.div
              key={card.to}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link
                to={card.to}
                className={`flex flex-col gap-2 p-4 rounded-xl border ${card.border} ${card.bg} transition-all group`}
              >
                <div className="flex items-center justify-between">
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                  <ChevronRight className="w-4 h-4 text-muted group-hover:text-white transition-colors" />
                </div>
                <div>
                  <p className={`text-sm font-bold ${card.color}`}>{card.label}</p>
                  <p className="text-[11px] text-muted leading-tight">{card.desc}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: CheckCircle, label: 'Concluídos', value: stats.completed, color: 'text-green-400' },
            { icon: DollarSign, label: 'Total Gasto', value: `R$ ${stats.spent.toLocaleString('pt-BR')}`, color: 'text-primary' },
            { icon: TrendingUp, label: 'Em Andamento', value: stats.active, color: 'text-blue-400' },
            { icon: AlertCircle, label: 'Pendentes', value: stats.pending, color: 'text-yellow-400' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-surface border border-border rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`w-5 h-5 ${s.color}`} />
                <p className="text-xs text-muted">{s.label}</p>
              </div>
              <p className="text-2xl font-black text-white">{s.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-surface border border-border rounded-xl p-2 mb-6 flex gap-2">
          <button
            onClick={() => { setActiveTab('requests'); setStatusFilter('all') }}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'requests' ? 'bg-primary text-background' : 'text-muted hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4 inline mr-2" />
            Solicitações ({activeRequests.length})
          </button>
          <button
            onClick={() => { setActiveTab('history'); setStatusFilter('all') }}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'history' ? 'bg-primary text-background' : 'text-muted hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Histórico ({historyRequests.length})
          </button>
        </div>

        {/* Filtros de status */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {['all', ...(activeTab === 'requests'
            ? ['pending', 'accepted', 'in_progress']
            : ['completed', 'cancelled', 'rejected']
          )].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s as StatusFilter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-background'
                  : 'bg-surface border border-border text-muted hover:text-white'
              }`}
            >
              {s === 'all' ? 'Todos' : statusConfig[s as RequestStatus]?.label}
              {' '}({s === 'all' ? displayed.length : displayed.filter(r => r.status === s).length})
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {/* Vazio */}
        {!loading && filtered.length === 0 && (
          <div className="bg-surface border border-border rounded-xl p-10 text-center">
            <AlertCircle className="w-12 h-12 text-muted mx-auto mb-3" />
            <p className="text-white font-semibold mb-1">Nenhuma solicitação encontrada</p>
            <p className="text-muted text-sm">Explore prestadores e solicite um serviço</p>
          </div>
        )}

        {/* Lista */}
        {!loading && (
          <div className="space-y-4">
            {filtered.map((req, i) => {
              const cfg = statusConfig[req.status]
              const StatusIcon = cfg.icon
              const isCompleted = req.status === 'completed'
              const alreadyReviewed = !!req.reviewId

              return (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="bg-surface border border-border rounded-xl p-4 sm:p-6 hover:border-primary/40 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Avatar — foto real do Firestore, fallback com iniciais */}
                    <img
                      src={req.providerAvatar || avatarFallback(req.providerName || 'Prestador')}
                      alt={req.providerName}
                      className="w-14 h-14 rounded-xl object-cover shrink-0"
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-white truncate">{req.service}</h3>
                          <p className="text-sm text-muted">com {req.providerName || 'Prestador'}</p>
                        </div>
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold whitespace-nowrap ${cfg.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {cfg.label}
                        </div>
                      </div>

                      <p className="text-sm text-muted mb-3 line-clamp-2">{req.description}</p>

                      <div className="flex flex-wrap gap-3 text-xs text-muted mb-4">
                        {req.scheduledDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(req.scheduledDate).toLocaleDateString('pt-BR')}
                            {req.scheduledTime && ` às ${req.scheduledTime}`}
                          </span>
                        )}
                        {req.budgetProposed && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5" />
                            R$ {req.budgetProposed.toLocaleString('pt-BR')}
                          </span>
                        )}
                        {req.address?.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {req.address.neighborhood ? `${req.address.neighborhood}, ` : ''}{req.address.city}
                          </span>
                        )}
                      </div>

                      {/* Ações */}
                      <div className="flex flex-wrap gap-2">
                        {!['cancelled', 'rejected'].includes(req.status) && (
                          <button
                            onClick={() => handleOpenChat(req)}
                            disabled={actionLoading === req.id}
                            className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 border border-primary/30 text-primary text-xs font-bold rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === req.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <MessageCircle className="w-3.5 h-3.5" />}
                            Chat
                          </button>
                        )}

                        {req.status === 'pending' && (
                          <button
                            onClick={() => handleCancel(req.id)}
                            disabled={actionLoading === req.id}
                            className="flex items-center gap-1.5 px-3 py-2 bg-surface border border-border text-muted text-xs font-semibold rounded-lg hover:border-red-400 hover:text-red-400 transition-colors disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Cancelar
                          </button>
                        )}

                        {isCompleted && !alreadyReviewed && (
                          <button
                            onClick={() => openReviewModal(req)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-bold rounded-lg hover:bg-yellow-500/20 transition-colors"
                          >
                            <Star className="w-3.5 h-3.5" />
                            Avaliar
                          </button>
                        )}

                        {isCompleted && alreadyReviewed && (
                          <span className="flex items-center gap-1.5 px-3 py-2 text-xs text-green-400">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Avaliado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border">
                    <p className="text-[11px] text-muted">Solicitado em {formatDate(req.createdAt)}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* ===== Modal de Avaliação ===== */}
      <AnimatePresence>
        {reviewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setReviewModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-black text-white">Avaliar Serviço</h2>
                <button onClick={() => setReviewModal(null)} className="p-1.5 text-muted hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Prestador no modal — foto real, fallback com iniciais */}
              <div className="flex items-center gap-3 mb-6 p-3 bg-background rounded-xl">
                <img
                  src={reviewModal.providerAvatar || avatarFallback(reviewModal.providerName)}
                  alt={reviewModal.providerName}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <p className="text-white font-bold text-sm">{reviewModal.providerName}</p>
                  <p className="text-muted text-xs">{reviewModal.service}</p>
                </div>
              </div>

              <div className="mb-5">
                <p className="text-sm text-muted mb-3">Como foi o serviço?</p>
                <div className="flex items-center gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-10 h-10 transition-colors ${
                          star <= (hoverRating || rating)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-muted'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-center text-xs text-muted mt-2">
                    {['', 'Péssimo', 'Ruim', 'Regular', 'Bom', 'Excelente!'][rating]}
                  </p>
                )}
              </div>

              <div className="mb-6">
                <textarea
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  placeholder="Conte como foi a experiência (opcional)..."
                  rows={3}
                  maxLength={500}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white text-sm placeholder:text-muted outline-none focus:border-primary transition-colors resize-none"
                />
                <p className="text-[11px] text-muted text-right mt-1">{reviewText.length}/500</p>
              </div>

              <button
                onClick={handleSubmitReview}
                disabled={rating === 0 || submittingReview}
                className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-background font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-40"
              >
                {submittingReview
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <><Send className="w-4 h-4" /> Enviar Avaliação</>}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
