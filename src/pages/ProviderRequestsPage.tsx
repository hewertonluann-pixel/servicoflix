import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'
import { useNavigate } from 'react-router-dom'
import {
  Clock, CheckCircle, XCircle, AlertTriangle, Calendar,
  MapPin, DollarSign, User, MessageCircle, Phone,
  ChevronRight, Loader2, Filter, Search
} from 'lucide-react'
import { collection, query, where, getDocs, doc, updateDoc, Timestamp, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'

type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled'

interface ServiceRequest {
  id: string
  clientId: string
  clientName: string
  clientAvatar: string
  clientPhone?: string
  providerId: string
  service: string
  description: string
  address: {
    street: string
    number: string
    neighborhood: string
    city: string
    state: string
    complement?: string
  }
  scheduledDate: string
  scheduledTime: string
  budgetProposed?: number
  status: RequestStatus
  urgency: 'normal' | 'urgent'
  createdAt: Timestamp
  updatedAt: Timestamp
}

const statusConfig = {
  pending: {
    label: 'Pendente',
    icon: Clock,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
  },
  accepted: {
    label: 'Aceita',
    icon: CheckCircle,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
  },
  rejected: {
    label: 'Recusada',
    icon: XCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
  },
  completed: {
    label: 'Concluída',
    icon: CheckCircle,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
  },
  cancelled: {
    label: 'Cancelada',
    icon: AlertTriangle,
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/30',
  },
}

export const ProviderRequestsPage = () => {
  const { user } = useSimpleAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<RequestStatus | 'all'>('pending')
  const [searchTerm, setSearchTerm] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Carrega solicitações do Firestore
  useEffect(() => {
    const loadRequests = async () => {
      if (!user?.id) return

      try {
        const q = query(
          collection(db, 'serviceRequests'),
          where('providerId', '==', user.id),
          orderBy('createdAt', 'desc')
        )
        const snapshot = await getDocs(q)
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as ServiceRequest[]
        setRequests(data)
      } catch (err) {
        console.error('Erro ao carregar solicitações:', err)
      } finally {
        setLoading(false)
      }
    }

    loadRequests()
  }, [user])

  // Aceitar solicitação
  const handleAccept = async (requestId: string) => {
    setActionLoading(requestId)
    try {
      await updateDoc(doc(db, 'serviceRequests', requestId), {
        status: 'accepted',
        updatedAt: Timestamp.now(),
        acceptedAt: Timestamp.now(),
      })
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'accepted' } : r))
    } catch (err) {
      console.error('Erro ao aceitar:', err)
      alert('Erro ao aceitar solicitação. Tente novamente.')
    } finally {
      setActionLoading(null)
    }
  }

  // Recusar solicitação
  const handleReject = async (requestId: string) => {
    if (!confirm('Tem certeza que deseja recusar esta solicitação?')) return
    
    setActionLoading(requestId)
    try {
      await updateDoc(doc(db, 'serviceRequests', requestId), {
        status: 'rejected',
        updatedAt: Timestamp.now(),
      })
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r))
    } catch (err) {
      console.error('Erro ao recusar:', err)
      alert('Erro ao recusar solicitação. Tente novamente.')
    } finally {
      setActionLoading(null)
    }
  }

  // Filtrar solicitações
  const filteredRequests = requests.filter(req => {
    const matchesTab = activeTab === 'all' || req.status === activeTab
    const matchesSearch = 
      req.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.address.city.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesTab && matchesSearch
  })

  // Contadores por status
  const counts = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    accepted: requests.filter(r => r.status === 'accepted').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    completed: requests.filter(r => r.status === 'completed').length,
    cancelled: requests.filter(r => r.status === 'cancelled').length,
  }

  if (!user || !user.roles?.includes('provider')) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white mb-2">Acesso Restrito</h1>
          <p className="text-muted mb-6">Esta página é apenas para prestadores.</p>
          <button onClick={() => navigate('/')} className="px-6 py-3 bg-primary text-background font-bold rounded-xl">
            Voltar para Início
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pt-16 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Solicitações</h1>
            <p className="text-sm text-muted">Gerencie as solicitações de serviço</p>
          </div>
        </div>

        {/* Barra de busca */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input
              type="text"
              placeholder="Buscar por cliente, serviço ou cidade..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl pl-12 pr-4 py-3 text-white text-sm outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {[
            { key: 'pending', label: 'Pendentes' },
            { key: 'accepted', label: 'Aceitas' },
            { key: 'completed', label: 'Concluídas' },
            { key: 'all', label: 'Todas' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as RequestStatus | 'all')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary text-background'
                  : 'bg-surface text-muted hover:text-white border border-border'
              }`}
            >
              {tab.label}
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === tab.key
                  ? 'bg-background/20 text-background'
                  : 'bg-background text-muted'
              }`}>
                {counts[tab.key as keyof typeof counts]}
              </span>
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {/* Lista de solicitações */}
        {!loading && filteredRequests.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-10 h-10 text-muted" />
            </div>
            <h3 className="text-xl font-black text-white mb-2">Nenhuma solicitação</h3>
            <p className="text-muted text-sm">
              {searchTerm ? 'Nenhum resultado encontrado' : 'Você ainda não recebeu solicitações'}
            </p>
          </div>
        )}

        {!loading && (
          <div className="space-y-4">
            {filteredRequests.map((request, index) => {
              const config = statusConfig[request.status]
              const StatusIcon = config.icon

              return (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-surface border rounded-xl p-4 sm:p-6 ${config.border}`}
                >
                  {/* Header do card */}
                  <div className="flex items-start gap-3 mb-4">
                    <img
                      src={request.clientAvatar}
                      alt={request.clientName}
                      className="w-12 h-12 rounded-full object-cover border-2 border-border"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-bold text-white truncate">{request.clientName}</h3>
                        {request.urgency === 'urgent' && (
                          <span className="px-2 py-0.5 bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-bold rounded-full uppercase">
                            Urgente
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted">{request.service}</p>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${config.bg} border ${config.border}`}>
                      <StatusIcon className={`w-4 h-4 ${config.color}`} />
                      <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
                    </div>
                  </div>

                  {/* Descrição */}
                  <p className="text-sm text-white mb-4 line-clamp-2">{request.description}</p>

                  {/* Informações */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span className="text-muted">
                        {new Date(request.scheduledDate).toLocaleDateString('pt-BR')} às {request.scheduledTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="text-muted truncate">
                        {request.address.neighborhood}, {request.address.city}
                      </span>
                    </div>
                    {request.budgetProposed && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4 text-primary" />
                        <span className="text-muted">R$ {request.budgetProposed.toFixed(2)}</span>
                      </div>
                    )}
                    {request.clientPhone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-primary" />
                        <span className="text-muted">{request.clientPhone}</span>
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex flex-wrap gap-2">
                    {request.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleAccept(request.id)}
                          disabled={actionLoading === request.id}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
                        >
                          {actionLoading === request.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Aceitar
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          disabled={actionLoading === request.id}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-bold rounded-lg transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          Recusar
                        </button>
                      </>
                    )}
                    {request.status === 'accepted' && (
                      <button className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-background font-bold rounded-lg transition-colors">
                        <MessageCircle className="w-4 h-4" />
                        Abrir Chat
                      </button>
                    )}
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-surface hover:bg-background border border-border text-white font-semibold rounded-lg transition-colors">
                      Ver Detalhes
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Data de criação */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted">
                      Recebido em {request.createdAt.toDate().toLocaleDateString('pt-BR')} às {request.createdAt.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
