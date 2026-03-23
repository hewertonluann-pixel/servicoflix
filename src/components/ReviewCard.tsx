import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, CheckCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { UserAvatar } from '@/components/UserAvatar'
import { Review } from '@/types'
import { replyToReview, deleteReply } from '@/lib/reviewUtils'

interface Props {
  review: Review
  isProviderOwner?: boolean  // true = prestador logado vendo suas próprias avaliações
}

const formatDate = (createdAt: any): string => {
  if (!createdAt) return ''
  const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt)
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export const ReviewCard = ({ review, isProviderOwner = false }: Props) => {
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [saving, setSaving] = useState(false)

  const clientName = review.clientName || review.userName || 'Usuário'
  const clientAvatar = review.clientAvatar || review.userAvatar || ''

  const handleSaveReply = async () => {
    if (!replyText.trim()) return
    setSaving(true)
    try {
      await replyToReview(review.id, {
        text: replyText.trim(),
        providerName: '',   // preenchido pelo contexto do dashboard
        providerAvatar: '',
      })
      setReplyText('')
      setReplyOpen(false)
    } catch (err) {
      console.error('[ReviewCard] Erro ao responder:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteReply = async () => {
    setSaving(true)
    try {
      await deleteReply(review.id)
    } catch (err) {
      console.error('[ReviewCard] Erro ao excluir resposta:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-background border border-border rounded-xl p-4 space-y-3"
    >
      {/* Cabeçalho */}
      <div className="flex items-start gap-3">
        <UserAvatar src={clientAvatar} name={clientName} size={40} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white font-semibold text-sm">{clientName}</p>
            {review.verified && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 border border-primary/30 text-primary text-[10px] font-semibold rounded-full">
                <CheckCircle className="w-3 h-3" />
                Serviço verificado
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className="w-3.5 h-3.5 text-yellow-400"
                  fill={star <= review.rating ? 'currentColor' : 'none'}
                />
              ))}
            </div>
            <span className="text-xs text-muted">{formatDate(review.createdAt)}</span>
            {review.updatedAt && (
              <span className="text-xs text-muted">(editado)</span>
            )}
          </div>
        </div>
      </div>

      {/* Comentário */}
      {review.comment && (
        <p className="text-muted text-sm leading-relaxed">{review.comment}</p>
      )}

      {/* Resposta do prestador (existente) */}
      {review.reply && (
        <div className="bg-surface border border-border rounded-lg p-3 ml-4 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-primary">
              ↳ Resposta do prestador
            </p>
            {isProviderOwner && (
              <button
                onClick={handleDeleteReply}
                disabled={saving}
                className="text-xs text-red-400 hover:underline disabled:opacity-50"
              >
                Excluir
              </button>
            )}
          </div>
          <p className="text-muted text-sm leading-relaxed">{review.reply.text}</p>
          <p className="text-xs text-muted/60">{formatDate(review.reply.createdAt)}</p>
        </div>
      )}

      {/* Botão responder (apenas prestador, sem resposta ainda) */}
      {isProviderOwner && !review.reply && (
        <div>
          <button
            onClick={() => setReplyOpen((v) => !v)}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {replyOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {replyOpen ? 'Cancelar' : 'Responder'}
          </button>

          <AnimatePresence>
            {replyOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-2"
              >
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Escreva sua resposta..."
                  rows={3}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-white text-sm focus:border-primary outline-none transition-colors resize-none"
                />
                <button
                  onClick={handleSaveReply}
                  disabled={!replyText.trim() || saving}
                  className="mt-2 px-4 py-2 bg-primary text-background text-xs font-bold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {saving ? 'Salvando...' : 'Publicar resposta'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}
