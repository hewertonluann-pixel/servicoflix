import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, Clock, DollarSign, MapPin, FileText, Image as ImageIcon, AlertCircle, Loader2, Send } from 'lucide-react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'

interface Props {
  isOpen: boolean
  onClose: () => void
  provider: {
    id: string
    name: string
    avatar: string
    specialty: string
  }
}

export const RequestServiceModal = ({ isOpen, onClose, provider }: Props) => {
  const { user } = useSimpleAuth()
  const [submitting, setSubmitting] = useState(false)
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    service: '',
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
    budgetProposed: '',
    urgency: 'normal' as 'normal' | 'urgent',
    photos: [] as string[],
  })

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    if (files.length + formData.photos.length > 5) {
      setError('Máximo de 5 fotos por solicitação')
      return
    }

    setUploadingPhotos(true)
    setError('')

    try {
      const uploadPromises = files.map(async file => {
        if (file.size > 5 * 1024 * 1024) throw new Error('Imagem deve ter no máximo 5MB')
        const fileRef = storageRef(storage, `service-requests/${user?.id}/${Date.now()}_${file.name}`)
        const task = uploadBytesResumable(fileRef, file)
        await task
        return await getDownloadURL(task.snapshot.ref)
      })

      const urls = await Promise.all(uploadPromises)
      setFormData(prev => ({ ...prev, photos: [...prev.photos, ...urls] }))
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar fotos')
    } finally {
      setUploadingPhotos(false)
    }
  }

  const removePhoto = (index: number) => {
    setFormData(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      setError('Você precisa estar logado')
      return
    }

    if (!formData.service.trim() || !formData.description.trim()) {
      setError('Preencha os campos obrigatórios')
      return
    }

    if (!formData.scheduledDate || !formData.scheduledTime) {
      setError('Selecione data e horário')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const requestData = {
        clientId: user.id,
        clientName: user.name,
        clientAvatar: user.avatar || '',
        clientEmail: user.email,
        
        providerId: provider.id,
        providerName: provider.name,
        providerAvatar: provider.avatar,
        
        service: formData.service.trim(),
        description: formData.description.trim(),
        
        address: {
          ...formData.address,
          street: formData.address.street.trim(),
          number: formData.address.number.trim(),
          neighborhood: formData.address.neighborhood.trim(),
          complement: formData.address.complement.trim(),
        },
        
        scheduledDate: formData.scheduledDate,
        scheduledTime: formData.scheduledTime,
        
        budgetProposed: formData.budgetProposed ? parseFloat(formData.budgetProposed) : null,
        urgency: formData.urgency,
        
        photos: formData.photos,
        
        status: 'pending',
        paymentStatus: 'pending',
        
        timeline: [
          {
            status: 'pending',
            timestamp: new Date().toISOString(),
            by: 'client',
            message: 'Solicitação criada',
          },
        ],
        
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      await addDoc(collection(db, 'serviceRequests'), requestData)
      
      setSuccess(true)
      setTimeout(() => {
        onClose()
        setSuccess(false)
        // Reset form
        setFormData({
          service: '',
          description: '',
          address: { street: '', number: '', neighborhood: '', city: 'Diamantina', state: 'MG', complement: '' },
          scheduledDate: '',
          scheduledTime: '',
          budgetProposed: '',
          urgency: 'normal',
          photos: [],
        })
      }, 2000)
    } catch (err: any) {
      console.error('Erro ao criar solicitação:', err)
      setError('Erro ao enviar solicitação. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
        onClick={onClose}
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
              <img src={provider.avatar} alt={provider.name} className="w-12 h-12 rounded-full object-cover" />
              <div>
                <h2 className="text-lg font-black text-white">Solicitar Serviço</h2>
                <p className="text-xs text-muted">{provider.name} - {provider.specialty}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-background rounded-lg transition-colors">
              <X className="w-5 h-5 text-muted" />
            </button>
          </div>

          {/* Success message */}
          {success && (
            <div className="m-6 bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center shrink-0">
                <Send className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-400">Solicitação enviada!</p>
                <p className="text-xs text-green-400/80 mt-0.5">O prestador receberá uma notificação</p>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="m-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
              <button onClick={() => setError('')} className="ml-auto text-red-400 text-lg leading-none">×</button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Serviço */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                <FileText className="w-4 h-4 text-primary" />
                Qual serviço você precisa? *
              </label>
              <input
                type="text"
                value={formData.service}
                onChange={e => setFormData({ ...formData, service: e.target.value })}
                placeholder="Ex: Instalação elétrica, Aula de violão, Limpeza..."
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-primary transition-colors"
                required
              />
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Descreva o serviço *</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detalhe o que você precisa, quantidade, tamanho, etc."
                rows={4}
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-primary transition-colors resize-none"
                required
              />
            </div>

            {/* Endereço */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-white">
                <MapPin className="w-4 h-4 text-primary" />
                Endereço do serviço
              </label>
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  value={formData.address.street}
                  onChange={e => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
                  placeholder="Rua"
                  className="col-span-2 bg-background border border-border rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-primary transition-colors"
                />
                <input
                  type="text"
                  value={formData.address.number}
                  onChange={e => setFormData({ ...formData, address: { ...formData.address, number: e.target.value } })}
                  placeholder="Nº"
                  className="bg-background border border-border rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-primary transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={formData.address.neighborhood}
                  onChange={e => setFormData({ ...formData, address: { ...formData.address, neighborhood: e.target.value } })}
                  placeholder="Bairro"
                  className="bg-background border border-border rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-primary transition-colors"
                />
                <input
                  type="text"
                  value={formData.address.complement}
                  onChange={e => setFormData({ ...formData, address: { ...formData.address, complement: e.target.value } })}
                  placeholder="Complemento (opcional)"
                  className="bg-background border border-border rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            {/* Data e Hora */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Data *
                </label>
                <input
                  type="date"
                  value={formData.scheduledDate}
                  onChange={e => setFormData({ ...formData, scheduledDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-primary transition-colors"
                  required
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Horário *
                </label>
                <input
                  type="time"
                  value={formData.scheduledTime}
                  onChange={e => setFormData({ ...formData, scheduledTime: e.target.value })}
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
              <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-4 py-3">
                <span className="text-muted text-sm">R$</span>
                <input
                  type="number"
                  value={formData.budgetProposed}
                  onChange={e => setFormData({ ...formData, budgetProposed: e.target.value })}
                  placeholder="0,00"
                  min="0"
                  step="0.01"
                  className="flex-1 bg-transparent text-white text-sm outline-none"
                />
              </div>
              <p className="text-xs text-muted mt-1">O prestador pode propor um valor diferente</p>
            </div>

            {/* Urgência */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">Urgência</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, urgency: 'normal' })}
                  className={`flex-1 py-3 rounded-lg border transition-all ${
                    formData.urgency === 'normal'
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-background border-border text-muted hover:border-primary/50'
                  }`}
                >
                  <span className="text-sm font-semibold">Normal</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, urgency: 'urgent' })}
                  className={`flex-1 py-3 rounded-lg border transition-all ${
                    formData.urgency === 'urgent'
                      ? 'bg-red-500/10 border-red-500/30 text-red-400'
                      : 'bg-background border-border text-muted hover:border-red-500/30'
                  }`}
                >
                  <span className="text-sm font-semibold">Urgente</span>
                </button>
              </div>
            </div>

            {/* Fotos */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                <ImageIcon className="w-4 h-4 text-primary" />
                Fotos (opcional)
              </label>
              {formData.photos.length > 0 && (
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {formData.photos.map((url, i) => (
                    <div key={i} className="relative group aspect-square">
                      <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label className="flex items-center justify-center gap-2 w-full py-3 bg-background border border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                {uploadingPhotos ? (
                  <><Loader2 className="w-4 h-4 text-primary animate-spin" /> <span className="text-sm text-muted">Enviando...</span></>
                ) : (
                  <><ImageIcon className="w-4 h-4 text-primary" /> <span className="text-sm text-muted">Adicionar fotos ({formData.photos.length}/5)</span></>
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhotos || formData.photos.length >= 5}
                  className="hidden"
                />
              </label>
            </div>
          </form>

          {/* Footer */}
          <div className="border-t border-border p-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-3 bg-background border border-border text-muted font-semibold rounded-xl hover:text-white transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || uploadingPhotos}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-background font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
              ) : (
                <><Send className="w-4 h-4" /> Enviar Solicitação</>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
