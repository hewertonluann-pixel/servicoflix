import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flag, X, ChevronRight, Loader2, CheckCircle } from 'lucide-react'
import { ReportReason, REPORT_REASON_LABELS, submitReport } from '@/lib/reportUtils'

interface ReportModalProps {
  open: boolean
  onClose: () => void
  reportedUserId: string
  chatId: string
  reportedByUserId: string
}

export const ReportModal = ({
  open,
  onClose,
  reportedUserId,
  chatId,
  reportedByUserId,
}: ReportModalProps) => {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null)
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleClose = () => {
    onClose()
    // Reset após fechar
    setTimeout(() => {
      setStep(1)
      setSelectedReason(null)
      setDescription('')
    }, 300)
  }

  const handleSubmit = async () => {
    if (!selectedReason) return
    setSubmitting(true)
    try {
      await submitReport(reportedByUserId, reportedUserId, chatId, selectedReason, description)
      setStep(3)
    } catch (err) {
      console.error('[ReportModal] Erro ao enviar denúncia:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const reasons = Object.entries(REPORT_REASON_LABELS) as [ReportReason, string][]

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2 }}
            className="bg-surface border border-border rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-orange-400" />
                <h3 className="font-bold text-white text-base">
                  {step === 3 ? 'Denúncia enviada' : 'Denunciar usuário'}
                </h3>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg hover:bg-background transition-colors text-muted hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Etapa 1 — Selecionar motivo */}
            {step === 1 && (
              <div className="p-5">
                <p className="text-sm text-muted mb-4">
                  Qual é o motivo da sua denúncia?
                </p>
                <div className="space-y-2">
                  {reasons.map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setSelectedReason(value)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-colors text-left ${
                        selectedReason === value
                          ? 'border-orange-400/60 bg-orange-400/10 text-orange-300'
                          : 'border-border bg-background text-white/80 hover:border-primary/40'
                      }`}
                    >
                      {label}
                      {selectedReason === value && (
                        <ChevronRight className="w-4 h-4 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setStep(2)}
                  disabled={!selectedReason}
                  className="mt-4 w-full py-2.5 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition-colors disabled:opacity-40"
                >
                  Continuar
                </button>
              </div>
            )}

            {/* Etapa 2 — Descrição opcional */}
            {step === 2 && (
              <div className="p-5">
                <p className="text-sm text-muted mb-1">
                  Descreva o que aconteceu <span className="text-muted/60">(opcional)</span>
                </p>
                <p className="text-xs text-muted/60 mb-4">
                  Sua denúncia é anônima e será analisada pela nossa equipe.
                </p>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: O usuário me enviou mensagens ofensivas..."
                  rows={4}
                  maxLength={500}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white text-sm focus:border-orange-400/60 outline-none transition-colors resize-none"
                />
                <p className="text-xs text-muted/50 text-right mt-1">
                  {description.length}/500
                </p>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setStep(1)}
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-xl border border-border text-muted font-semibold text-sm hover:text-white transition-colors disabled:opacity-50"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Flag className="w-4 h-4" />
                    )}
                    {submitting ? 'Enviando...' : 'Enviar denúncia'}
                  </button>
                </div>
              </div>
            )}

            {/* Etapa 3 — Confirmação */}
            {step === 3 && (
              <div className="p-5 flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mt-2">
                  <CheckCircle className="w-7 h-7 text-green-400" />
                </div>
                <p className="text-white font-semibold">Obrigado pela denúncia!</p>
                <p className="text-sm text-muted">
                  Nossa equipe irá analisar e tomar as medidas necessárias. Sua identidade permanece anônima.
                </p>
                <button
                  onClick={handleClose}
                  className="mt-2 w-full py-2.5 rounded-xl bg-surface border border-border text-white font-semibold text-sm hover:bg-background transition-colors"
                >
                  Fechar
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
