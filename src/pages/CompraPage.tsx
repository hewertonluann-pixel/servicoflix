import { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, RefreshCw, CheckCircle, ArrowLeft, ShoppingCart, Info, Eye, TrendingUp, Clock, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { usePrestadorStatus } from '@/hooks/usePrestadorStatus'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'

const CHECKOUT_FUNCTION_URL = 'https://southamerica-east1-prontto-60341.cloudfunctions.net/createCheckoutSession'

// Price IDs reais do painel Stripe
const PRICE_IDS = {
  assinatura: 'price_mensal_real',               // ⚠️ Substitua pelo Price ID real da assinatura
  creditos30: 'price_1TELvUEW46ts4yeZGUhuQvqJ',  // R$ 29,90 — 30 dias
}

export function CompraPage() {
  const { diasScore, estaAtivo, temAssinatura, estaExpirado } = usePrestadorStatus()
  const { user, isProvider } = useSimpleAuth()
  const navigate = useNavigate()
  const [hoveredPlan, setHoveredPlan] = useState<'assinatura' | 'creditos' | null>(null)
  const [showExplainer, setShowExplainer] = useState(false)
  const [loading, setLoading] = useState<'assinatura' | 'creditos' | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  if (!user || !isProvider) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted">Acesso restrito a prestadores.</p>
      </div>
    )
  }

  async function handleComprar(plano: 'assinatura' | 'creditos') {
    setErro(null)
    setLoading(plano)
    try {
      const priceId = plano === 'assinatura' ? PRICE_IDS.assinatura : PRICE_IDS.creditos30
      const origin = window.location.origin

      const resp = await fetch(CHECKOUT_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user!.uid,
          priceId,
          successUrl: `${origin}/compra/sucesso?plano=${plano}`,
          cancelUrl: `${origin}/compra`,
        }),
      })

      if (!resp.ok) {
        const data = await resp.json()
        throw new Error(data.error || 'Erro ao criar sessão de pagamento')
      }

      const { url } = await resp.json()
      window.location.href = url
    } catch (err: any) {
      setErro(err.message || 'Erro inesperado. Tente novamente.')
    } finally {
      setLoading(null)
    }
  }

  const titulo = estaExpirado ? 'Reativar Acesso' : 'Adquirir Créditos'
  const subtitulo = estaExpirado
    ? 'Seu acesso expirou — escolha um plano para reativar'
    : temAssinatura
      ? 'Sua assinatura está ativa. Você pode adquirir créditos adicionais.'
      : 'Escolha um plano para manter seu perfil visível'

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-8 text-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted hover:text-white transition-colors text-sm mb-6 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>

          <div className="flex items-center justify-center gap-2 mb-3">
            {estaExpirado
              ? <Zap className="w-6 h-6 text-primary" fill="currentColor" />
              : <ShoppingCart className="w-6 h-6 text-primary" />
            }
            <h1 className="text-3xl font-black text-white">{titulo}</h1>
          </div>

          {estaExpirado ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-full text-red-400 text-sm font-semibold">
              <Zap className="w-4 h-4" />
              {subtitulo}
            </div>
          ) : estaAtivo ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full text-green-400 text-sm font-semibold">
              <CheckCircle className="w-4 h-4" />
              {temAssinatura ? 'Assinatura ativa' : `⚡ ${diasScore} dias restantes`}
            </div>
          ) : (
            <p className="text-muted text-sm">{subtitulo}</p>
          )}
        </div>

        {/* Erro */}
        {erro && (
          <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
            {erro}
          </div>
        )}

        {/* ── Como funcionam os créditos ── */}
        <div className="mb-8 bg-surface border border-border rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowExplainer(!showExplainer)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-background/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-white">Como funcionam os créditos? <span className="text-primary">⚡</span></span>
            </div>
            <span className="text-muted text-xs">{showExplainer ? 'Fechar ▲' : 'Ver mais ▼'}</span>
          </button>

          {showExplainer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="px-5 pb-5 border-t border-border"
            >
              <div className="mt-4 flex items-start gap-4 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-primary" fill="currentColor" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white mb-1">1 raio (⚡) = 1 dia de exposição</p>
                  <p className="text-sm text-muted">Cada crédito representa um dia em que seu perfil fica ativo e visível para clientes na plataforma. Quando seus créditos acabam, seu perfil sai da listagem automaticamente.</p>
                </div>
              </div>

              <div className="mt-4 grid sm:grid-cols-3 gap-3">
                <div className="flex flex-col items-center text-center p-4 bg-background rounded-xl border border-border">
                  <Eye className="w-6 h-6 text-blue-400 mb-2" />
                  <p className="text-xs font-bold text-white mb-1">Visibilidade</p>
                  <p className="text-xs text-muted">Seu perfil aparece na busca e na home enquanto tiver créditos ativos</p>
                </div>
                <div className="flex flex-col items-center text-center p-4 bg-background rounded-xl border border-border">
                  <TrendingUp className="w-6 h-6 text-green-400 mb-2" />
                  <p className="text-xs font-bold text-white mb-1">Acumulável</p>
                  <p className="text-xs text-muted">Comprou 30 dias com 15 restantes? Seu score vai para 45 dias automaticamente</p>
                </div>
                <div className="flex flex-col items-center text-center p-4 bg-background rounded-xl border border-border">
                  <Clock className="w-6 h-6 text-yellow-400 mb-2" />
                  <p className="text-xs font-bold text-white mb-1">Desconto diário</p>
                  <p className="text-xs text-muted">1 crédito é descontado por dia. Você sempre sabe quantos dias faltam</p>
                </div>
              </div>

              <div className="mt-4 p-4 bg-background rounded-xl border border-border">
                <p className="text-xs font-bold text-white mb-3">Assinatura vs Créditos avulsos</p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-xs text-muted">
                    <RefreshCw className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span><span className="text-white font-semibold">Assinatura mensal:</span> R$ 19,90/mês. Seu perfil fica sempre ativo sem precisar renovar. Ideal para quem quer visibilidade constante.</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-muted">
                    <Zap className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" fill="currentColor" />
                    <span><span className="text-white font-semibold">Créditos avulsos:</span> R$ 29,90 por 30 dias. Pague só quando quiser. Perfeito para quem trabalha em períodos específicos.</span>
                  </div>
                </div>
              </div>
            </motion.div>
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
              <div className="text-5xl font-black text-white mb-1">R$ 19,90</div>
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

            <button
              onClick={() => handleComprar('assinatura')}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-background font-bold rounded-xl hover:bg-primary/90 transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading === 'assinatura' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Aguarde...</>
              ) : (
                <><RefreshCw className="w-4 h-4" /> Ativar Assinatura Mensal</>
              )}
            </button>
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
              <div className="text-5xl font-black text-white mb-1">R$ 29,90</div>
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

            <button
              onClick={() => handleComprar('creditos')}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-2 py-4 bg-yellow-500/20 border-2 border-yellow-500/40 text-yellow-400 font-bold rounded-xl hover:bg-yellow-500/30 transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading === 'creditos' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Aguarde...</>
              ) : (
                <><Zap className="w-4 h-4" fill="currentColor" /> Comprar 30 Dias ⚡</>
              )}
            </button>
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
          <a href="https://wa.me/5538999999999" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            WhatsApp
          </a>
        </p>

      </div>
    </div>
  )
}
