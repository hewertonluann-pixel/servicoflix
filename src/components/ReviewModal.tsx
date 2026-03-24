import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, X, Loader2, CheckCircle, User, Briefcase } from 'lucide-react'
import { submitReview, getUserReviewForProvider } from '@/lib/reviewUtils'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'
import { Review } from '@/types'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getClientAvatar, getProviderAvatar } from '@/lib/avatarUtils'

interface Props {
  open: boolean
  onClose: () => void
  providerId: string
  providerName: string
  chatId?: string
}

type ReviewIdentity = 'client' | 'provider'

export const ReviewModal = ({ open, onClose, providerId, providerName, chatId }: Props) => {
  const { user, firebaseUser } = useSimpleAuth()

  const [step, setStep] = useState<'identity' | 'review'>('review')
  const [identity, setIdentity] = useState<ReviewIdentity>('client')

  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [existing, setExisting] = useState<Review | null>(null)
  const [loadingExisting, setLoadingExisting] = useState(false)

  const [clientData, setClientData] = useState<{ name: string; avatar: string } | null>(null)
  const [providerData, setProviderData] = useState<{ name: string; avatar: string } | null>(null)
  const [isAlsoProvider, setIsAlsoProvider] = useState(false)

  useEffect(() => {
    if (!open || !user?.id) return
    setDone(false)
    setError('')
    setRating(0)
    setComment('')
    setIdentity('client')

    const load = async () => {
      setLoadingExisting(true)
      try {
        const docSnap = await getDoc(doc(db, 'users', user.id))
        const data = docSnap.exists() ? docSnap.data() : null
        const googlePhotoURL = firebaseUser?.photoURL ?? null

        // ── Avatar de CLIENTE: foto pessoal (campo raiz), Google como fallback
        const clientAvatar = getClientAvatar(
          { avatar: data?.avatar },
          googlePhotoURL
        )
        const personalName = data?.name || user.name || 'Usuário'
        setClientData({ name: personalName, avatar: clientAvatar })

        // ── Verifica perfil duplo
        const roles: string[] = data?.roles || []
        const alsoProvider = roles.includes('provider') && !!data?.providerProfile
        setIsAlsoProvider(alsoProvider)

        if (alsoProvider) {
          // Avatar de PRESTADOR: providerProfile.avatar → user.avatar → Google
          // Usa getProviderAvatar que já segue essa prioridade
          const profAvatar = getProviderAvatar(
            { avatar: data?.avatar, providerProfile: data?.providerProfile },
            googlePhotoURL
          )
          const profName = data?.providerProfile?.professionalName || personalName
          setProviderData({ name: profName, avatar: profAvatar })
          setStep('identity')
        } else {
          setStep('review')
        }

        const rev = await getUserReviewForProvider(user.id, providerId)
        if (rev) {
          setExisting(rev)
          setRating(rev.rating)
          setComment(rev.comment || '')
        } else {
          setExisting(null)
        }
      } finally {
        setLoadingExisting(false)
      }
    }
    load()
  }, [open, user?.id, providerId])

  const handleSubmit = async () => {
    if (!user || rating === 0) return
    setSaving(true)
    setError('')
    try {
      const chosen = identity === 'provider' ? providerData : clientData
      await submitReview({
        providerId,
        clientId: user.id,
        clientName: chosen?.name || user.name || 'Usuário',
        clientAvatar: chosen?.avatar || '',
        rating,
        comment,
        chatId,
        reviewerRole: identity,
      })
      setDone(true)
      setTimeout(() => { onClose(); setDone(false) }, 1800)
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar avaliação.')
    } finally {
      setSaving(false)
    }
  }

  const starLabels = ['', 'Ruim', 'Regular', 'Bom', 'Ótimo', 'Excelente']
  const activeRating = hovered || rating

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-full max-w-md bg-surface border border-border rounded-2xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-white font-bold text-lg">
                  {existing ? 'Editar avaliação' : 'Avaliar prestador'}
                </h3>
                <p className="text-muted text-sm">{providerName}</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-background transition-colors"
              >
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>

            {loadingExisting ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>

            ) : done ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center py-8 gap-3"
              >
                <div className="w-14 h-14 bg-primary/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-primary" />
                </div>
                <p className="text-white font-bold text-lg">Avaliação enviada!</p>
                <p className="text-muted text-sm text-center">Obrigado pelo seu feedback.</p>
              </motion.div>

            ) : step === 'identity' ? (
              <motion.div
                key="identity"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <p className="text-sm text-muted mb-4 text-center">
                  Como você quer assinar esta avaliação?
                </p>

                <div className="space-y-3 mb-6">
                  {/* Opção: cliente */}
                  <button
                    onClick={() => setIdentity('client')}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                      identity === 'client'
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background hover:border-border/80'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-surface">
                      {clientData?.avatar ? (
                        <img src={clientData.avatar} alt={clientData.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-muted" />
                      )}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{clientData?.name}</p>
                      <p className="text-xs text-muted">Perfil de cliente</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                      identity === 'client' ? 'border-primary bg-primary' : 'border-border'
                    }`}>
                      {identity === 'client' && <div className="w-2 h-2 rounded-full bg-background" />}
                    </div>
                  </button>

                  {/* Opção: prestador */}
                  <button
                    onClick={() => setIdentity('provider')}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                      identity === 'provider'
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background hover:border-border/80'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-surface">
                      {providerData?.avatar ? (
                        <img src={providerData.avatar} alt={providerData.name} className="w-full h-full object-cover" />
                      ) : (
                        <Briefcase className="w-5 h-5 text-muted" />
                      )}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{providerData?.name}</p>
                      <p className="text-xs text-muted">Perfil de prestador</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                      identity === 'provider' ? 'border-primary bg-primary' : 'border-border'
                    }`}>
                      {identity === 'provider' && <div className="w-2 h-2 rounded-full bg-background" />}
                    </div>
                  </button>
                </div>

                <button
                  onClick={() => setStep('review')}
                  className="w-full py-3.5 bg-primary text-background font-bold rounded-xl hover:bg-primary-dark transition-colors"
                >
                  Continuar
                </button>
              </motion.div>

            ) : (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {isAlsoProvider && (
                  <div className="flex items-center justify-between mb-5 px-3 py-2.5 bg-background rounded-xl border border-border">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-surface">
                        {(identity === 'client' ? clientData : providerData)?.avatar ? (
                          <img
                            src={(identity === 'client' ? clientData : providerData)!.avatar}
                            className="w-full h-full object-cover"
                            alt=""
                          />
                        ) : (
                          identity === 'client'
                            ? <User className="w-4 h-4 text-muted" />
                            : <Briefcase className="w-4 h-4 text-muted" />
                        )}
                      </div>
                      <div>
                        <p className="text-white text-xs font-semibold">
                          {(identity === 'client' ? clientData : providerData)?.name}
                        </p>
                        <p className="text-muted text-[10px]">
                          {identity === 'client' ? 'Perfil de cliente' : 'Perfil de prestador'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setStep('identity')}
                      className="text-xs text-primary font-semibold hover:underline"
                    >
                      Trocar
                    </button>
                  </div>
                )}

                <div className="flex flex-col items-center gap-3 mb-6">
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <motion.button
                        key={star}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHovered(star)}
                        onMouseLeave={() => setHovered(0)}
                        className="p-1"
                      >
                        <Star
                          className={`w-9 h-9 transition-colors ${
                            star <= activeRating ? 'text-yellow-400' : 'text-border'
                          }`}
                          fill={star <= activeRating ? 'currentColor' : 'none'}
                        />
                      </motion.button>
                    ))}
                  </div>
                  <p className={`text-sm font-semibold h-5 transition-colors ${
                    activeRating > 0 ? 'text-yellow-400' : 'text-muted'
                  }`}>
                    {starLabels[activeRating]}
                  </p>
                </div>

                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Conte sua experiência (opcional)..."
                  rows={4}
                  maxLength={500}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white text-sm focus:border-primary outline-none transition-colors resize-none mb-1"
                />
                <p className="text-xs text-muted text-right mb-4">{comment.length}/500</p>

                {error && (
                  <p className="text-red-400 text-sm mb-4 text-center">{error}</p>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={rating === 0 || saving}
                  className="w-full py-3.5 bg-primary text-background font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Enviando...' : existing ? 'Salvar alterações' : 'Publicar avaliação'}
                </button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
