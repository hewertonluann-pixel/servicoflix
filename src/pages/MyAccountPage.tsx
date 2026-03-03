import { useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, CheckCircle, XCircle, AlertCircle, Calendar, DollarSign, Star, MessageCircle, FileText, TrendingUp } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { ServiceRequest, ServiceHistory } from '@/types'

type Tab = 'requests' | 'history'
type StatusFilter = 'all' | 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'

export const MyAccountPage = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('requests')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Mock data (depois virá do Firestore)
  const requests: ServiceRequest[] = [
    {
      id: '1',
      providerId: '1',
      providerName: 'Maria Silva',
      providerAvatar: 'https://i.pravatar.cc/150?img=1',
      service: 'Limpeza Residencial',
      description: 'Limpeza completa de apartamento de 80m²',
      status: 'pending',
      price: 250,
      scheduledDate: '2026-03-10T14:00:00',
      createdAt: '2026-03-03T10:00:00',
      updatedAt: '2026-03-03T10:00:00',
    },
    {
      id: '2',
      providerId: '2',
      providerName: 'João Santos',
      providerAvatar: 'https://i.pravatar.cc/150?img=2',
      service: 'Reparo Elétrico',
      description: 'Instalação de novos pontos de luz',
      status: 'accepted',
      price: 180,
      scheduledDate: '2026-03-08T09:00:00',
      createdAt: '2026-03-02T15:30:00',
      updatedAt: '2026-03-02T16:00:00',
    },
    {
      id: '3',
      providerId: '3',
      providerName: 'Carlos Oliveira',
      providerAvatar: 'https://i.pravatar.cc/150?img=3',
      service: 'Encanamento',
      description: 'Troca de torneiras e conserto de vazamento',
      status: 'in_progress',
      price: 320,
      scheduledDate: '2026-03-03T13:00:00',
      createdAt: '2026-03-01T11:00:00',
      updatedAt: '2026-03-03T13:00:00',
    },
  ]

  const history: ServiceHistory[] = [
    {
      id: '101',
      providerId: '4',
      providerName: 'Ana Costa',
      providerAvatar: 'https://i.pravatar.cc/150?img=4',
      service: 'Limpeza Pós-Obra',
      completedAt: '2026-02-28T16:00:00',
      rating: 5,
      review: 'Excelente trabalho! Muito caprichosa.',
      price: 400,
      duration: '4 horas',
    },
    {
      id: '102',
      providerId: '5',
      providerName: 'Pedro Alves',
      providerAvatar: 'https://i.pravatar.cc/150?img=5',
      service: 'Pintura',
      completedAt: '2026-02-20T17:30:00',
      rating: 4,
      review: 'Bom serviço, pontual.',
      price: 600,
      duration: '2 dias',
    },
    {
      id: '103',
      providerId: '6',
      providerName: 'Lucia Fernandes',
      providerAvatar: 'https://i.pravatar.cc/150?img=6',
      service: 'Montagem de Móveis',
      completedAt: '2026-02-15T14:00:00',
      rating: 5,
      review: 'Rápida e eficiente!',
      price: 150,
      duration: '3 horas',
    },
  ]

  const getStatusConfig = (status: string) => {
    const configs = {
      pending: { label: 'Pendente', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', icon: Clock },
      accepted: { label: 'Aceito', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', icon: CheckCircle },
      in_progress: { label: 'Em Andamento', color: 'text-primary bg-primary/10 border-primary/20', icon: TrendingUp },
      completed: { label: 'Concluído', color: 'text-green-400 bg-green-400/10 border-green-400/20', icon: CheckCircle },
      cancelled: { label: 'Cancelado', color: 'text-red-400 bg-red-400/10 border-red-400/20', icon: XCircle },
    }
    return configs[status as keyof typeof configs] || configs.pending
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const filteredRequests = statusFilter === 'all' 
    ? requests 
    : requests.filter(r => r.status === statusFilter)

  const stats = {
    total: history.length,
    spent: history.reduce((sum, h) => sum + h.price, 0),
    avgRating: history.reduce((sum, h) => sum + (h.rating || 0), 0) / history.length,
    pending: requests.filter(r => r.status === 'pending').length,
  }

  return (
    <div className="min-h-screen pt-16 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">Minha Conta</h1>
          <p className="text-muted text-sm">Gerencie suas solicitações e histórico de serviços</p>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface border border-border rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              <p className="text-xs text-muted">Concluídos</p>
            </div>
            <p className="text-2xl font-black text-white">{stats.total}</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-surface border border-border rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <p className="text-xs text-muted">Total Gasto</p>
            </div>
            <p className="text-2xl font-black text-white">R$ {stats.spent}</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-surface border border-border rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-primary" />
              <p className="text-xs text-muted">Média de Avaliação</p>
            </div>
            <p className="text-2xl font-black text-white">{stats.avgRating.toFixed(1)}</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-surface border border-border rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              <p className="text-xs text-muted">Pendentes</p>
            </div>
            <p className="text-2xl font-black text-white">{stats.pending}</p>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="bg-surface border border-border rounded-xl p-2 mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'requests' ? 'bg-primary text-background' : 'text-muted hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4 inline mr-2" />
            Solicitações ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'history' ? 'bg-primary text-background' : 'text-muted hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Histórico ({history.length})
          </button>
        </div>

        {/* Conteúdo */}
        {activeTab === 'requests' ? (
          <div>
            {/* Filtros */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {(['all', 'pending', 'accepted', 'in_progress', 'completed', 'cancelled'] as StatusFilter[]).map(status => {
                const count = status === 'all' ? requests.length : requests.filter(r => r.status === status).length
                return (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      statusFilter === status 
                        ? 'bg-primary text-background' 
                        : 'bg-surface border border-border text-muted hover:text-white'
                    }`}
                  >
                    {status === 'all' ? 'Todos' : getStatusConfig(status).label} ({count})
                  </button>
                )
              })}
            </div>

            {/* Lista de solicitações */}
            <div className="space-y-4">
              {filteredRequests.length === 0 ? (
                <div className="bg-surface border border-border rounded-xl p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-muted mx-auto mb-3" />
                  <p className="text-muted">Nenhuma solicitação encontrada</p>
                </div>
              ) : (
                filteredRequests.map((request, i) => {
                  const statusConfig = getStatusConfig(request.status)
                  const StatusIcon = statusConfig.icon
                  
                  return (
                    <motion.div
                      key={request.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-surface border border-border rounded-xl p-4 sm:p-6 hover:border-primary transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Avatar */}
                        <img 
                          src={request.providerAvatar} 
                          alt={request.providerName}
                          className="w-16 h-16 rounded-xl object-cover"
                        />

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-bold text-white mb-1">{request.service}</h3>
                              <p className="text-sm text-muted">com {request.providerName}</p>
                            </div>
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold whitespace-nowrap ${statusConfig.color}`}>
                              <StatusIcon className="w-3.5 h-3.5" />
                              {statusConfig.label}
                            </div>
                          </div>

                          <p className="text-sm text-muted mb-3 line-clamp-2">{request.description}</p>

                          <div className="flex flex-wrap gap-4 text-xs text-muted">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-4 h-4" />
                              {formatDate(request.scheduledDate)}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <DollarSign className="w-4 h-4" />
                              R$ {request.price}
                            </div>
                          </div>
                        </div>

                        {/* Ações */}
                        <div className="flex sm:flex-col gap-2">
                          <button className="flex-1 sm:flex-initial px-4 py-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-dark transition-colors">
                            <MessageCircle className="w-4 h-4 inline mr-1" />
                            Chat
                          </button>
                          {request.status === 'pending' && (
                            <button className="flex-1 sm:flex-initial px-4 py-2 bg-surface border border-border text-muted text-sm font-semibold rounded-lg hover:text-white hover:border-red-400 transition-colors">
                              Cancelar
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-surface border border-border rounded-xl p-4 sm:p-6"
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Avatar */}
                  <img 
                    src={item.providerAvatar} 
                    alt={item.providerName}
                    className="w-16 h-16 rounded-xl object-cover"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-1">{item.service}</h3>
                        <p className="text-sm text-muted">com {item.providerName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">R$ {item.price}</p>
                        <p className="text-xs text-muted">{item.duration}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-1">
                        {[1,2,3,4,5].map(star => (
                          <Star 
                            key={star} 
                            className={`w-4 h-4 ${
                              star <= (item.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-muted'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted">
                        {formatDate(item.completedAt)}
                      </span>
                    </div>

                    {item.review && (
                      <p className="text-sm text-muted italic">"{item.review}"</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
