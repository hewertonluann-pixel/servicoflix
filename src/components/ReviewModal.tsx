import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, X, Loader2, CheckCircle } from 'lucide-react'
import { submitReview, getUserReviewForProvider } from '@/lib/reviewUtils'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'
import { Review } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  providerId: string
  providerName: string
  chatId?: string
}

export const ReviewModal = ({ open, onClose, providerId, providerName, chatId }: Props) => {
  const { user } = useSimpleAuth()
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [existing, setExisting] = useState<Review | null>(null)
  const [loadingExisting, setLoadingExisting] = useState(false)

  // Carrega avaliação existente ao abrir
  useEffect(() => {
    if (!open || !user?.id) return
    setLoadingExisting(true)
    setDone(false)
    setError('')
    getUserReviewForProvider(user.id, providerId).then((rev) => {
      if (rev) {
        setExisting(rev)
        setRating(rev.rating)
        setComment(rev.comment || '')
      } else {
        setExisting(null)
        setRating(0)
        setComment('')
      }
    }).finally(() => setLoadingExisting(false))
  }, [open, user?.id, providerId])

  const handleSubmit = async () => {
    if (!user || rating === 0) return
    setSaving(true)
    setError('')
    try {
      await submitReview({
        providerId,
        clientId: user.id,
        clientName: user.name,
        clientAvatar: user.avatar || '',
        rating,
        comment,
        chatId,
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
            ) : (
              <>
                {/* Estrelas */}
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
                  <p className={`text-sm font-semibold h-5 transition-colors ${activeRating > 0 ? 'text-yellow-400' : 'text-muted'}`}>
                    {starLabels[activeRating]}
                  </p>
                </div>

                {/* Comentário */}
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

                {/* Botão */}
                <button
                  onClick={handleSubmit}
                  disabled={rating === 0 || saving}
                  className="w-full py-3.5 bg-primary text-background font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Enviando...' : existing ? 'Salvar alterações' : 'Publicar avaliação'}
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
