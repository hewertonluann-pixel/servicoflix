import { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, RefreshCw, CheckCircle, ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { usePrestadorStatus } from '@/hooks/usePrestadorStatus'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'

const STRIPE_LINKS = {
  assinatura: 'https://buy.stripe.com/XXXXX', // ← substitua pelo link do produto assinatura
  creditos:   'https://buy.stripe.com/YYYYY', // ← substitua pelo link do produto 30 dias
}

export function CompraPage() {
  const { diasScore, estaAtivo, temAssinatura, estaExpirado } = usePrestadorStatus()
  const { user, isProvider } = useSimpleAuth()
  const navigate = useNavigate()
  const [hoveredPlan, setHoveredPlan] = useState<'assinatura' | 'creditos' | null>(null)

  if (!user || !isProvider) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted">Acesso restrito a prestadores.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-10 text-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted hover:text-white transition-colors text-sm mb-6 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>

          <div className="flex items-center justify-center gap-2 mb-3">
            <Zap className="w-6 h-6 text-primary" fill="currentColor" />
            <h1 className="text-3xl font-black text-white">Ativar Acesso</h1>
          </div>

          {/* Status atual */}
          {estaAtivo && !estaExpirado ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full text-green-400 text-sm font-semibold">
              <CheckCircle className="w-4 h-4" />
              {temAssinatura ? 'Assinatura ativa' : `⚡ ${diasScore} dias restantes`}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-full text-red-400 text-sm font-semibold">
              <Zap className="w-4 h-4" />
              Acesso expirado — escolha um plano para reativar
            </div>
          )}
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* ── ASSINATURA MENSAL ── */}
          <motion.div
            onHoverStart={() => setHoveredPlan('assinatura')}
            onHoverEnd={() => setHoveredPlan(null)}
            whileHover={{ y: -4 }}
            className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-2 border-primary/40 rounded-2xl p-8 flex flex-col"
          >
            <div className="absolute top-4 right-4 px-2 py-1 bg-primary/20 border border-primary/40 text-primary text-[10px] font-bold rounded-full uppercase tracking-wider">
              Recomendado
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <RefreshCw className="w-5 h-5 text-primary" />
                <span className="text-sm font-bold text-primary uppercase tracking-wider">Assinatura</span>
              </div>
              <div className="text-5xl font-black text-white mb-1">R$ 20</div>
              <div className="text-muted text-sm">cobrado todo mês automaticamente</div>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {[
                'Acesso contínuo sem interrupções',
                'Perfil sempre visível na home',
                'Cancele quando quiser',
                'Nunca precisa renovar',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted">
                  <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>

            <a
              href={STRIPE_LINKS.assinatura}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-background font-bold rounded-xl hover:bg-primary/90 transition-all text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Ativar Assinatura Mensal
            </a>
          </motion.div>

          {/* ── CRÉDITOS 30 DIAS ── */}
          <motion.div
            onHoverStart={() => setHoveredPlan('creditos')}
            onHoverEnd={() => setHoveredPlan(null)}
            whileHover={{ y: -4 }}
            className="relative bg-surface border-2 border-border hover:border-primary/30 rounded-2xl p-8 flex flex-col transition-colors"
          >
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-yellow-400" fill="currentColor" />
                <span className="text-sm font-bold text-yellow-400 uppercase tracking-wider">Créditos</span>
              </div>
              <div className="text-5xl font-black text-white mb-1">R$ 20</div>
              <div className="text-muted text-sm">pagamento único • 30 dias de acesso</div>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {[
                'Pague só quando precisar',
                '30 dias adicionados ao seu score',
                'Acumule: compre 2x = 60 dias',
                'Sem compromisso mensal',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted">
                  <Zap className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" fill="currentColor" />
                  {item}
                </li>
              ))}
            </ul>

            <a
              href={STRIPE_LINKS.creditos}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-4 bg-yellow-500/20 border-2 border-yellow-500/40 text-yellow-400 font-bold rounded-xl hover:bg-yellow-500/30 transition-all text-sm"
            >
              <Zap className="w-4 h-4" fill="currentColor" />
              Comprar 30 Dias ⚡
            </a>
          </motion.div>

        </div>

        {/* Score atual */}
        {diasScore > 0 && (
          <div className="mt-8 text-center text-sm text-muted">
            Seu score atual: <span className="text-primary font-bold">⚡ {diasScore} dias</span>
            {' '}— comprar mais dias acumula no score existente
          </div>
        )}

        {/* Dúvidas */}
        <p className="mt-6 text-center text-xs text-muted">
          Dúvidas? Fale conosco via{' '}
          <a href="https://wa.me/SEU_NUMERO" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            WhatsApp
          </a>
        </p>

      </div>
    </div>
  )
}
