import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'
import { Calendar, Clock, MapPin, DollarSign, AlertCircle, CheckCircle, XCircle, Loader2, Image as ImageIcon, User, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled'

interface ServiceRequest {
  id: string
  clientId: string
  clientName: string
  clientAvatar: string
  clientEmail: string
  providerId: string
  service: string
  description: string
  address: {
    street: string
    number: string
    neighborhood: string
    city: string
    state: string
    complement: string
  }
  scheduledDate: string
  scheduledTime: string
  budgetProposed: number | null
  urgency: 'normal' | 'urgent'
  photos: string[]
  status: RequestStatus
  createdAt: Timestamp
}

export const ProviderRequestsPage = () => {
  const { user } = useSimpleAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pending' | 'accepted' | 'completed' | 'rejected'>('pending')
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Carrega solicitações em tempo real
  useEffect(() => {
    if (!user?.id) return

    const q = query(
      collection(db, 'serviceRequests'),
      where('providerId', '==', user.id)
    )

    const unsubscribe = onSnapshot(q, snapshot => {
      const reqs: ServiceRequest[] = []
      snapshot.forEach(doc => {
        reqs.push({ id: doc.id, ...doc.data() } as ServiceRequest)
      })
      
      // Ordena por data de criação (mais recente primeiro)
      reqs.sort((a, b) => {
        const aTime = a.createdAt?.toMillis() || 0
        const bTime = b.createdAt?.toMillis() || 0
        return bTime - aTime
      })
      
      setRequests(reqs)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user?.id])

  const handleAccept = async (requestId: string) => {
    setActionLoading(true)
    try {
      await updateDoc(doc(db, 'serviceRequests', requestId), {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      setSelectedRequest(null)
    } catch (err) {
      console.error('Erro ao aceitar solicitação:', err)
      alert('Erro ao aceitar solicitação. Tente novamente.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async (requestId: string) => {
    setActionLoading(true)
    try {
      await updateDoc(doc(db, 'serviceRequests', requestId), {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      setSelectedRequest(null)
    } catch (err) {
      console.error('Erro ao recusar solicitação:', err)
      alert('Erro ao recusar solicitação. Tente novamente.')
    } finally {
      setActionLoading(false)
    }
  }

  const filteredRequests = requests.filter(r => {
    if (activeTab === 'pending') return r.status === 'pending'
    if (activeTab === 'accepted') return r.status === 'accepted' || r.status === 'in_progress'
    if (activeTab === 'completed') return r.status === 'completed'
    if (activeTab === 'rejected') return r.status === 'rejected' || r.status === 'cancelled'
    return false
  })

  const pendingCount = requests.filter(r => r.status === 'pending').length
  const acceptedCount = requests.filter(r => ['accepted', 'in_progress'].includes(r.status)).length
  const completedCount = requests.filter(r => r.status === 'completed').length
  const rejectedCount = requests.filter(r => ['rejected', 'cancelled'].includes(r.status)).length

  if (!user?.roles?.includes('provider')) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white mb-2">Acesso Restrito</h1>
          <p className="text-muted mb-6">Esta área é exclusiva para prestadores.</p>
          <button onClick={() => navigate('/')} className="px-6 py-3 bg-primary text-background font-bold rounded-xl">
            Voltar ao Início
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-16 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Solicitações de Serviço</h1>
            <p className="text-sm text-muted">Gerencie seus pedidos de serviço</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { key: 'pending', label: 'Pendentes', count: pendingCount, color: 'bg-red-500' },
            { key: 'accepted', label: 'Aceitas', count: acceptedCount, color: 'bg-green-500' },
            { key: 'completed', label: 'Concluídas', count: completedCount, color: 'bg-blue-500' },
            { key: 'rejected', label: 'Recusadas', count: rejectedCount, color: 'bg-gray-500' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-primary text-background scale-105'
                  : 'bg-surface border border-border text-muted hover:text-white'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`w-6 h-6 ${activeTab === tab.key ? 'bg-background text-primary' : tab.color} rounded-full flex items-center justify-center text-xs font-bold ${
                  activeTab !== tab.key && 'text-white'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredRequests.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-muted" />
            </div>
            <h3 className="text-xl font-black text-white mb-2">Nenhuma solicitação</h3>
            <p className="text-muted text-sm">
              {activeTab === 'pending' && 'Você não tem solicitações pendentes no momento.'}
              {activeTab === 'accepted' && 'Você não tem solicitações aceitas.'}
              {activeTab === 'completed' && 'Você ainda não concluiu nenhuma solicitação.'}
              {activeTab === 'rejected' && 'Você não tem solicitações recusadas.'}
            </p>
          </div>
        )}

        {/* Request cards */}
        <div className="grid gap-4">
          {filteredRequests.map((request, index) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-surface border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => setSelectedRequest(request)}
            >
              <div className="p-5">
                {/* Header do card */}
                <div className="flex items-start gap-4 mb-4">
                  <img src={request.clientAvatar || 'https://i.pravatar.cc/150'} alt={request.clientName} className="w-12 h-12 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-bold text-white truncate">{request.clientName}</h3>
                      {request.urgency === 'urgent' && (
                        <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Urgente</span>
                      )}
                      {request.status === 'pending' && (
                        <span className="bg-yellow-500/20 text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Nova</span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-primary truncate">{request.service}</p>
                  </div>
                </div>

                {/* Descrição */}
                <p className="text-sm text-muted mb-4 line-clamp-2">{request.description}</p>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar className="w-4 h-4 text-muted" />
                    <span className="text-white font-semibold">
                      {new Date(request.scheduledDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="w-4 h-4 text-muted" />
                    <span className="text-white font-semibold">{request.scheduledTime}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <MapPin className="w-4 h-4 text-muted" />
                    <span className="text-white font-semibold truncate">{request.address.neighborhood || request.address.city}</span>
                  </div>
                  {request.budgetProposed && (
                    <div className="flex items-center gap-2 text-xs">
                      <DollarSign className="w-4 h-4 text-muted" />
                      <span className="text-primary font-bold">R$ {request.budgetProposed.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Fotos */}
                {request.photos.length > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <ImageIcon className="w-4 h-4 text-muted" />
                    <span className="text-xs text-muted">{request.photos.length} foto{request.photos.length > 1 ? 's' : ''} anexada{request.photos.length > 1 ? 's' : ''}</span>
                  </div>
                )}

                {/* Ações para pendentes */}
                {request.status === 'pending' && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={e => { e.stopPropagation(); handleReject(request.id) }}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 font-semibold text-sm rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" /> Recusar
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleAccept(request.id) }}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-background font-bold text-sm rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Aceitar
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Modal de detalhes */}
      <AnimatePresence>
        {selectedRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setSelectedRequest(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-surface border border-border rounded-2xl w-full max-w-2xl my-8"
            >
              {/* Header */}
              <div className="border-b border-border px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={selectedRequest.clientAvatar || 'https://i.pravatar.cc/150'} alt={selectedRequest.clientName} className="w-12 h-12 rounded-full object-cover" />
                  <div>
                    <h2 className="text-lg font-black text-white">{selectedRequest.service}</h2>
                    <p className="text-xs text-muted">{selectedRequest.clientName}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedRequest(null)} className="p-2 hover:bg-background rounded-lg transition-colors">
                  <XCircle className="w-5 h-5 text-muted" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                {/* Descrição */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Descrição</label>
                  <p className="text-sm text-muted">{selectedRequest.description}</p>
                </div>

                {/* Endereço */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    Endereço
                  </label>
                  <div className="bg-background border border-border rounded-lg p-3 text-sm text-white">
                    <p>{selectedRequest.address.street}, {selectedRequest.address.number}</p>
                    <p>{selectedRequest.address.neighborhood} - {selectedRequest.address.city}/{selectedRequest.address.state}</p>
                    {selectedRequest.address.complement && <p className="text-muted text-xs mt-1">{selectedRequest.address.complement}</p>}
                  </div>
                </div>

                {/* Data e Hora */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      Data
                    </label>
                    <div className="bg-background border border-border rounded-lg p-3 text-sm text-white">
                      {new Date(selectedRequest.scheduledDate).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                      <Clock className="w-4 h-4 text-primary" />
                      Horário
                    </label>
                    <div className="bg-background border border-border rounded-lg p-3 text-sm text-white">
                      {selectedRequest.scheduledTime}
                    </div>
                  </div>
                </div>

                {/* Orçamento */}
                {selectedRequest.budgetProposed && (
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                      <DollarSign className="w-4 h-4 text-primary" />
                      Orçamento proposto
                    </label>
                    <div className="bg-background border border-border rounded-lg p-3">
                      <span className="text-2xl font-black text-primary">R$ {selectedRequest.budgetProposed.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* Fotos */}
                {selectedRequest.photos.length > 0 && (
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                      <ImageIcon className="w-4 h-4 text-primary" />
                      Fotos anexadas
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedRequest.photos.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg overflow-hidden hover:opacity-80 transition-opacity">
                          <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contato */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                    <User className="w-4 h-4 text-primary" />
                    Contato do cliente
                  </label>
                  <div className="bg-background border border-border rounded-lg p-3 text-sm text-white">
                    <p>{selectedRequest.clientEmail}</p>
                  </div>
                </div>
              </div>

              {/* Footer com ações */}
              {selectedRequest.status === 'pending' && (
                <div className="border-t border-border p-4 flex gap-3">
                  <button
                    onClick={() => handleReject(selectedRequest.id)}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500/10 border border-red-500/30 text-red-400 font-semibold rounded-xl hover:bg-red-500/20 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-5 h-5" /> Recusar
                  </button>
                  <button
                    onClick={() => handleAccept(selectedRequest.id)}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-background font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />} Aceitar Solicitação
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
