import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Download, Share, Plus, CheckCircle, Smartphone, Monitor, Apple, Chrome } from 'lucide-react'
import { Link } from 'react-router-dom'

type Platform = 'android' | 'ios' | 'desktop' | 'unknown'

function detectPlatform(): Platform {
  const ua = navigator.userAgent
  if (/android/i.test(ua)) return 'android'
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (/macintosh|windows|linux/i.test(ua)) return 'desktop'
  return 'unknown'
}

export function InstallPage() {
  const [platform, setPlatform] = useState<Platform>('unknown')
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [installed, setInstalled] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [activeTab, setActiveTab] = useState<Platform>('android')

  useEffect(() => {
    setPlatform(detectPlatform())
    setActiveTab(detectPlatform() === 'unknown' ? 'android' : detectPlatform())

    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)

    const installedHandler = () => setInstalled(true)
    window.addEventListener('appinstalled', installedHandler)

    // Verifica se já está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    setInstalling(true)
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setDeferredPrompt(null)
    setInstalling(false)
  }

  const benefits = [
    { icon: '⚡', text: 'Abre instantaneamente, sem carregar o browser' },
    { icon: '🔔', text: 'Receba notificações de mensagens e solicitações' },
    { icon: '📴', text: 'Funciona mesmo com internet lenta' },
    { icon: '🏠', text: 'Fica na tela inicial igual a um app nativo' },
    { icon: '🆓', text: '100% gratuito, sem precisar da App Store' },
  ]

  const steps = {
    android: [
      { icon: <Chrome className="w-5 h-5 text-blue-400" />, title: 'Abra no Chrome', desc: 'Certifique-se de estar usando o Google Chrome' },
      { icon: <Download className="w-5 h-5 text-primary" />, title: 'Toque em "Instalar"', desc: 'Um banner vai aparecer na parte de baixo da tela automaticamente' },
      { icon: <CheckCircle className="w-5 h-5 text-green-400" />, title: 'Confirme a instalação', desc: 'O app aparecerá na sua tela inicial como qualquer outro app' },
    ],
    ios: [
      { icon: <Apple className="w-5 h-5 text-muted" />, title: 'Abra no Safari', desc: 'A instalação só funciona pelo navegador Safari no iPhone/iPad' },
      { icon: <Share className="w-5 h-5 text-blue-400" />, title: 'Toque em Compartilhar', desc: 'O ícone de compartilhar fica na barra inferior do Safari (quadrado com seta)' },
      { icon: <Plus className="w-5 h-5 text-primary" />, title: 'Adicionar à Tela de Início', desc: 'Role para baixo no menu e toque em "Adicionar à Tela de Início"' },
      { icon: <CheckCircle className="w-5 h-5 text-green-400" />, title: 'Confirme', desc: 'Toque em "Adicionar" no canto superior direito' },
    ],
    desktop: [
      { icon: <Chrome className="w-5 h-5 text-blue-400" />, title: 'Abra no Chrome ou Edge', desc: 'A instalação de PWA funciona no Chrome e Microsoft Edge' },
      { icon: <Monitor className="w-5 h-5 text-primary" />, title: 'Clique no ícone de instalar', desc: 'Procure o ícone de computador/download na barra de endereço (canto direito)' },
      { icon: <CheckCircle className="w-5 h-5 text-green-400" />, title: 'Confirme a instalação', desc: 'Clique em "Instalar" na janela que aparecer' },
    ],
  }

  const tabLabels: Record<string, { label: string; icon: React.ReactNode }> = {
    android: { label: 'Android', icon: <Smartphone className="w-4 h-4" /> },
    ios: { label: 'iPhone / iPad', icon: <Apple className="w-4 h-4" /> },
    desktop: { label: 'Computador', icon: <Monitor className="w-4 h-4" /> },
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-16 px-4">
      <div className="max-w-xl mx-auto">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="w-20 h-20 bg-primary/20 border-2 border-primary/40 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <img src="/icon-192.png" alt="ServiçoFlix" className="w-14 h-14 rounded-2xl" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Instale o ServiçoFlix</h1>
          <p className="text-muted text-sm">Tenha o app na sua tela inicial — grátis, sem App Store</p>
        </motion.div>

        {/* Botão instalar Android (quando disponível) */}
        <AnimatePresence>
          {platform === 'android' && deferredPrompt && !installed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-8"
            >
              <button
                onClick={handleInstall}
                disabled={installing}
                className="w-full flex items-center justify-center gap-3 py-4 bg-primary text-background font-black text-lg rounded-2xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 disabled:opacity-70"
              >
                {installing ? (
                  <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-6 h-6" />
                )}
                {installing ? 'Instalando...' : '📲 Instalar Agora'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Já instalado */}
        {installed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-2xl"
          >
            <CheckCircle className="w-6 h-6 text-green-400 shrink-0" />
            <div>
              <p className="text-green-400 font-bold text-sm">App instalado com sucesso!</p>
              <p className="text-muted text-xs">O ServiçoFlix já está na sua tela inicial.</p>
            </div>
          </motion.div>
        )}

        {/* Benefícios */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface border border-border rounded-2xl p-5 mb-6"
        >
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Por que instalar?</h2>
          <div className="space-y-3">
            {benefits.map((b, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xl shrink-0">{b.icon}</span>
                <p className="text-sm text-muted">{b.text}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Instruções por plataforma */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-surface border border-border rounded-2xl overflow-hidden"
        >
          {/* Tabs */}
          <div className="flex border-b border-border">
            {(['android', 'ios', 'desktop'] as Platform[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors ${
                  activeTab === tab
                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                    : 'text-muted hover:text-white'
                }`}
              >
                {tabLabels[tab].icon}
                <span className="hidden xs:inline">{tabLabels[tab].label}</span>
              </button>
            ))}
          </div>

          {/* Passos */}
          <div className="p-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                {activeTab !== 'unknown' && steps[activeTab as 'android' | 'ios' | 'desktop'].map((step, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-background border border-border rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                      {step.icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{step.title}</p>
                      <p className="text-xs text-muted mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Voltar */}
        <div className="mt-8 text-center">
          <Link to="/" className="text-sm text-muted hover:text-white transition-colors">
            ← Voltar ao início
          </Link>
        </div>

      </div>
    </div>
  )
}
