import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'
import { 
  CheckCircle, X, Clock, MapPin, Briefcase, Star, AlertCircle, 
  Shield, User, Mail, Phone, Calendar
} from 'lucide-react'

interface PendingProvider {
  id: string
  name: string
  email: string
  avatar: string
  providerProfile: {
    professionalName?: string
    specialty: string
    bio: string
    city: string
    neighborhood: string
    priceFrom: number
    skills: string[]
    phone?: string
    status: string
    submittedAt: string
  }
}

const ADMIN_UID = 'Glhzl4mWRkNjttVBLaLhoUWLWxf1' // Seu UID

export const AdminApprovalPage = () => {
  const { user } = useSimpleAuth()
  const navigate = useNavigate()
  const [pendingProviders, setPendingProviders] = useState<PendingProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    // Verifica se é admin
    if (user && user.id !== ADMIN_UID) {
      navigate('/')
      return
    }

    loadPendingProviders()
  }, [user, navigate])

  const loadPendingProviders = async () => {
    try {
      setLoading(true)
      const usersSnap = await getDocs(collection(db, 'users'))
      const pending: PendingProvider[] = []

      usersSnap.docs.forEach(d => {
        const data = d.data()
        
        // Busca perfis pendentes de aprovação
        if (data.providerProfile?.status === 'pending') {
          pending.push({
            id: d.id,
            name: data.name || 'Sem nome',
            email: data.email || '',
            avatar: data.avatar || `https://i.pravatar.cc/150?u=${d.id}`,
            providerProfile: data.providerProfile
          })
        }
      })

      // Ordena por data de envio (mais recentes primeiro)
      pending.sort((a, b) => {
        const dateA = new Date(a.providerProfile.submittedAt).getTime()
        const dateB = new Date(b.providerProfile.submittedAt).getTime()
        return dateB - dateA
      })

      setPendingProviders(pending)
    } catch (err) {
      console.error('Erro ao carregar solicitações:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (providerId: string) => {
    try {
      setProcessing(providerId)
      const userRef = doc(db, 'users', providerId)
      
      await updateDoc(userRef, {
        roles: ['client', 'provider'], // Adiciona role de provider
        'providerProfile.status': 'approved',
        'providerProfile.approvedAt': new Date().toISOString(),
        'providerProfile.verified': true
      })

      console.log('✅ Prestador aprovado:', providerId)
      
      // Remove da lista local
      setPendingProviders(prev => prev.filter(p => p.id !== providerId))
    } catch (err) {
      console.error('Erro ao aprovar:', err)
      alert('Erro ao aprovar prestador')
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (providerId: string) => {
    if (!confirm('Tem certeza que deseja rejeitar esta solicitação?')) return

    try {
      setProcessing(providerId)
      const userRef = doc(db, 'users', providerId)
      
      await updateDoc(userRef, {
        'providerProfile.status': 'rejected',
        'providerProfile.rejectedAt': new Date().toISOString()
      })

      console.log('❌ Prestador rejeitado:', providerId)
      
      // Remove da lista local
      setPendingProviders(prev => prev.filter(p => p.id !== providerId))
    } catch (err) {
      console.error('Erro ao rejeitar:', err)
      alert('Erro ao rejeitar prestador')
    } finally {
      setProcessing(null)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen pt-16 pb-20 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-muted mx-auto mb-4" />
          <p className="text-muted">Carregando...</p>
        </div>
      </div>
    )
  }

  if (user.id !== ADMIN_UID) {
    return null // Redirecionado
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-16 pb-20 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted">Carregando solicitações...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-16 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        {/* Cabeçalho */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">Área de Administração</h1>
              <p className="text-muted text-sm">Aprovação de Prestadores</p>
            </div>
          </div>
        </motion.div>

        {/* Estatísticas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid sm:grid-cols-3 gap-4 mb-8"
        >
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted text-xs mb-1">Pendentes</p>
                <p className="text-2xl font-black text-white">{pendingProviders.length}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted text-xs mb-1">Aguardando</p>
                <p className="text-2xl font-black text-yellow-400">{pendingProviders.length}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted text-xs mb-1">Ações</p>
                <p className="text-2xl font-black text-primary">Aprovar/Rejeitar</p>
              </div>
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
          </div>
        </motion.div>

        {/* Lista de solicitações */}
        {pendingProviders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-surface border border-border rounded-xl p-8 text-center"
          >
            <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-black text-white mb-2">Nenhuma solicitação pendente</h3>
            <p className="text-muted text-sm">Todas as solicitações foram processadas.</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {pendingProviders.map((provider, i) => {
              const professionalName = provider.providerProfile.professionalName || provider.name
              
              return (
                <motion.div
                  key={provider.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * (i + 1) }}
                  className="bg-surface border border-border rounded-xl p-4 sm:p-6"
                >
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Avatar e Info Básica */}
                    <div className="flex items-start gap-4 flex-1">
                      <img 
                        src={provider.avatar} 
                        alt={professionalName}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border-2 border-background"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-black text-white truncate">{professionalName}</h3>
                            <p className="text-primary text-sm font-semibold">{provider.providerProfile.specialty}</p>
                          </div>
                          <div className="flex items-center gap-1 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 px-2 py-1 rounded-full text-xs font-semibold shrink-0">
                            <Clock className="w-3 h-3" />
                            Pendente
                          </div>
                        </div>

                        {/* Dados do usuário */}
                        <div className="space-y-1 text-xs text-muted mb-3">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" />
                            <span className="text-white font-medium">Nome pessoal:</span> {provider.name}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5" />
                            {provider.email}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            {provider.providerProfile.city}, {provider.providerProfile.neighborhood}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            Enviado em: {new Date(provider.providerProfile.submittedAt).toLocaleDateString('pt-BR')}
                          </div>
                        </div>

                        {/* Bio */}
                        <p className="text-muted text-sm leading-relaxed mb-3 line-clamp-3">
                          {provider.providerProfile.bio}
                        </p>

                        {/* Skills */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {provider.providerProfile.skills.map((skill, idx) => (
                            <span key={idx} className="px-2 py-1 bg-background border border-border rounded-full text-xs text-muted">
                              {skill}
                            </span>
                          ))}
                        </div>

                        {/* Preço */}
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted">Preço base:</span>
                          <span className="text-white font-bold">R$ {provider.providerProfile.priceFrom}</span>
                        </div>
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex sm:flex-col gap-2 sm:w-32 shrink-0">
                      <button
                        onClick={() => handleApprove(provider.id)}
                        disabled={processing === provider.id}
                        className="flex-1 sm:flex-none px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {processing === provider.id ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span className="hidden sm:inline">Aprovar</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleReject(provider.id)}
                        disabled={processing === provider.id}
                        className="flex-1 sm:flex-none px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {processing === provider.id ? (
                          <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <X className="w-4 h-4" />
                            <span className="hidden sm:inline">Rejeitar</span>
                          </>
                        )}
                      </button>
                    </div>
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
