import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, Clock, MapPin, DollarSign, MessageCircle, AlertCircle, CheckCircle, Loader2, AlertTriangle } from 'lucide-react'
import { collection, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'

interface RequestServiceModalProps {
  isOpen: boolean
  onClose: () => void
  provider: {
    id: string
    name: string
    avatar: string
    specialty: string
    priceFrom?: number
  }
}

export const RequestServiceModal = ({ isOpen, onClose, provider }: RequestServiceModalProps) => {
  const { user } = useSimpleAuth()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    service: provider.specialty || '',
    description: '',
    address: {
      street: '',
      number: '',
      neighborhood: '',
      city: 'Diamantina',
      state: 'MG',
      complement: '',
    },
    scheduledDate: '',
    scheduledTime: '',
    budgetProposed: provider.priceFrom || 0,
    urgency: 'normal' as 'normal' | 'urgent',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validações
    if (!user) {
      setError('Você precisa estar logado para solicitar serviços')
      return
    }

    if (!formData.service.trim()) {
      setError('Informe o tipo de serviço')
      return
    }

    if (!formData.description.trim()) {
      setError('Descreva o serviço que você precisa')
      return
    }

    if (!formData.address.street.trim() || !formData.address.number.trim() || !formData.address.neighborhood.trim()) {
      setError('Preencha o endereço completo')
      return
    }

    if (!formData.scheduledDate || !formData.scheduledTime) {
      setError('Informe a data e hora desejadas')
      return
    }

    setLoading(true)

    try {
      await addDoc(collection(db, 'serviceRequests'), {
        clientId: user.id,
        clientName: user.name,
        clientAvatar: user.avatar || `https://i.pravatar.cc/150?u=${user.id}`,
        clientPhone: user.phone || '',
        providerId: provider.id,
        providerName: provider.name,
        service: formData.service,
        description: formData.description,
        address: formData.address,
        scheduledDate: formData.scheduledDate,
        scheduledTime: formData.scheduledTime,
        budgetProposed: formData.budgetProposed,
        urgency: formData.urgency,
        status: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onClose()
        // Reset form
        setFormData({
          service: provider.specialty || '',
          description: '',
          address: {
            street: '',
            number: '',
            neighborhood: '',
            city: 'Diamantina',
            state: 'MG',
            complement: '',
          },
          scheduledDate: '',
          scheduledTime: '',
          budgetProposed: provider.priceFrom || 0,
          urgency: 'normal',
        })
      }, 2000)
    } catch (err) {
      console.error('Erro ao criar solicitação:', err)
      setError('Erro ao enviar solicitação. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: any) => {
    if (field.startsWith('address.')) {
      const addressField = field.split('.')[1]
      setFormData(prev => ({
        ...prev,
        address: { ...prev.address, [addressField]: value }
      }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  // Data mínima (hoje)
  const today = new Date().toISOString().split('T')[0]

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl max-h-[90vh] bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={provider.avatar}
                  alt={provider.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-primary"
                />
                <div>
                  <h2 className="text-lg font-black text-white">Solicitar Serviço</h2>
                  <p className="text-sm text-muted">{provider.name}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-background rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>

            {/* Conteúdo com scroll */}
            <div className="px-6 py-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {success ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-12 text-center"
                >
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-10 h-10 text-green-400" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">Solicitação Enviada!</h3>
                  <p className="text-muted">O prestador receberá sua solicitação em instantes.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Erro */}
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  )}

                  {/* Serviço */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                      <MessageCircle className="w-4 h-4 text-primary" />
                      Tipo de Serviço
                    </label>
                    <input
                      type="text"
                      value={formData.service}
                      onChange={e => handleChange('service', e.target.value)}
                      placeholder="Ex: Instalação elétrica, Limpeza de casa..."
                      className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white text-sm placeholder:text-muted outline-none focus:border-primary transition-colors"
                      required
                    />
                  </div>

                  {/* Descrição */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                      Descrição Detalhada
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={e => handleChange('description', e.target.value)}
                      placeholder="Descreva o serviço que você precisa, incluindo detalhes importantes..."
                      rows={4}
                      className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white text-sm placeholder:text-muted outline-none focus:border-primary transition-colors resize-none"
                      required
                    />
                  </div>

                  {/* Endereço */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      Endereço
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={formData.address.street}
                        onChange={e => handleChange('address.street', e.target.value)}
                        placeholder="Rua"
                        className="bg-background border border-border rounded-lg px-4 py-3 text-white text-sm placeholder:text-muted outline-none focus:border-primary transition-colors"
                        required
                      />
                      <input
                        type="text"
                        value={formData.address.number}
                        onChange={e => handleChange('address.number', e.target.value)}
                        placeholder="Número"
                        className="bg-background border border-border rounded-lg px-4 py-3 text-white text-sm placeholder:text-muted outline-none focus:border-primary transition-colors"
                        required
                      />
                      <input
                        type="text"
                        value={formData.address.neighborhood}
                        onChange={e => handleChange('address.neighborhood', e.target.value)}
                        placeholder="Bairro"
                        className="bg-background border border-border rounded-lg px-4 py-3 text-white text-sm placeholder:text-muted outline-none focus:border-primary transition-colors"
                        required
                      />
                      <input
                        type="text"
                        value={formData.address.city}
                        onChange={e => handleChange('address.city', e.target.value)}
                        placeholder="Cidade"
                        className="bg-background border border-border rounded-lg px-4 py-3 text-white text-sm placeholder:text-muted outline-none focus:border-primary transition-colors"
                        required
                      />
                      <input
                        type="text"
                        value={formData.address.complement}
                        onChange={e => handleChange('address.complement', e.target.value)}
                        placeholder="Complemento (opcional)"
                        className="sm:col-span-2 bg-background border border-border rounded-lg px-4 py-3 text-white text-sm placeholder:text-muted outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  {/* Data e Hora */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        Data
                      </label>
                      <input
                        type="date"
                        value={formData.scheduledDate}
                        onChange={e => handleChange('scheduledDate', e.target.value)}
                        min={today}
                        className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-primary transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                        <Clock className="w-4 h-4 text-primary" />
                        Hora
                      </label>
                      <input
                        type="time"
                        value={formData.scheduledTime}
                        onChange={e => handleChange('scheduledTime', e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-primary transition-colors"
                        required
                      />
                    </div>
                  </div>

                  {/* Orçamento */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                      <DollarSign className="w-4 h-4 text-primary" />
                      Orçamento (opcional)
                    </label>
                    <input
                      type="number"
                      value={formData.budgetProposed}
                      onChange={e => handleChange('budgetProposed', Number(e.target.value))}
                      placeholder="Valor estimado"
                      min={0}
                      step={0.01}
                      className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white text-sm placeholder:text-muted outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  {/* Urgência */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                      <AlertTriangle className="w-4 h-4 text-primary" />
                      Urgência
                    </label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleChange('urgency', 'normal')}
                        className={`flex-1 px-4 py-3 rounded-lg font-semibold text-sm transition-colors ${
                          formData.urgency === 'normal'
                            ? 'bg-primary text-background'
                            : 'bg-background border border-border text-muted hover:text-white'
                        }`}
                      >
                        Normal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChange('urgency', 'urgent')}
                        className={`flex-1 px-4 py-3 rounded-lg font-semibold text-sm transition-colors ${
                          formData.urgency === 'urgent'
                            ? 'bg-red-500 text-white'
                            : 'bg-background border border-border text-muted hover:text-white'
                        }`}
                      >
                        Urgente
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Footer */}
            {!success && (
              <div className="px-6 py-4 border-t border-border flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-background border border-border text-muted font-semibold rounded-lg hover:text-white transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-primary hover:bg-primary-dark text-background font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar Solicitação'
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
