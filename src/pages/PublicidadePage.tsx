import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toPng } from 'html-to-image'
import { motion } from 'framer-motion'
import {
  Megaphone, Download, Copy, RefreshCw, LogOut,
  Monitor, Square, Smartphone, ChevronDown,
} from 'lucide-react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'
import AdCanvas, { AdConfig, AdFormat, AdTemplate } from '@/components/ads/AdCanvas'

const ADMIN_UIDS = ['Glhzl4mWRkNjttVBLaLhoUWLWxf1', '5KqkZ0SPnpMkKO684W7fZBWHo4J2']

const FORMAT_LABELS: Record<AdFormat, { label: string; sub: string; icon: React.ReactNode }> = {
  outdoor:  { label: 'Outdoor',          sub: '1200 × 628',  icon: <Monitor className="w-4 h-4" /> },
  post:     { label: 'Post Instagram',   sub: '1080 × 1080', icon: <Square className="w-4 h-4" /> },
  stories:  { label: 'Stories',          sub: '1080 × 1920', icon: <Smartphone className="w-4 h-4" /> },
}

const TEMPLATES: { id: AdTemplate; label: string; emoji: string; desc: string }[] = [
  { id: 'dark-destaque',     label: 'Dark Destaque',      emoji: '🎬', desc: 'Com card de profissional' },
  { id: 'verde-urgencia',    label: 'Verde Urgência',     emoji: '⚡', desc: 'Chamada de ação forte' },
  { id: 'minimalista',       label: 'Minimalista',        emoji: '✦',  desc: 'Limpo, só texto e logo' },
  { id: 'profissional-mes',  label: 'Profissional do Mês',emoji: '⭐', desc: 'Destaque um prestador' },
]

const ACCENTS = [
  { label: 'Verde',   value: '#10b981' },
  { label: 'Azul',    value: '#3b82f6' },
  { label: 'Roxo',    value: '#a855f7' },
  { label: 'Laranja', value: '#f97316' },
  { label: 'Rosa',    value: '#ec4899' },
]

const DEFAULT_CONFIG: AdConfig = {
  format: 'outdoor',
  template: 'dark-destaque',
  headline: 'O serviço certo, do jeito certo.',
  subtext: 'Encontre faxineiras, eletricistas, encanadores e muito mais.',
  cta: 'Encontrar profissional',
  accent: '#10b981',
  showLogo: true,
  providerName: '',
  providerSpecialty: '',
  providerCity: '',
  providerAvatar: '',
  providerRating: '5.0',
}

interface ProviderOption {
  id: string
  name: string
  specialty: string
  city: string
  avatar: string
  rating: string
}

export const PublicidadePage = () => {
  const { user, loading: authLoading } = useSimpleAuth()
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLDivElement>(null)

  const [config, setConfig] = useState<AdConfig>(DEFAULT_CONFIG)
  const [providers, setProviders] = useState<ProviderOption[]>([])
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const isAdmin = user && ADMIN_UIDS.includes(user.id)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const set = (patch: Partial<AdConfig>) => setConfig(c => ({ ...c, ...patch }))

  useEffect(() => {
    if (!authLoading && isAdmin) {
      getDocs(collection(db, 'users')).then(snap => {
        const list: ProviderOption[] = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as any))
          .filter((u: any) => u.roles?.includes('provider'))
          .map((u: any) => ({
            id: u.id,
            name: u.providerProfile?.professionalName || u.name || '',
            specialty: u.providerProfile?.specialty || '',
            city: u.providerProfile?.city || '',
            avatar: u.providerProfile?.avatar || u.avatar || '',
            rating: u.providerProfile?.rating || '5.0',
          }))
        setProviders(list)
      }).catch(() => {})
    }
  }, [authLoading, isAdmin])

  const handleProviderSelect = (id: string) => {
    if (!id) { set({ providerName: '', providerSpecialty: '', providerCity: '', providerAvatar: '', providerRating: '' }); return }
    const p = providers.find(p => p.id === id)
    if (p) set({ providerName: p.name, providerSpecialty: p.specialty, providerCity: p.city, providerAvatar: p.avatar, providerRating: p.rating })
  }

  const handleDownload = async () => {
    if (!canvasRef.current) return
    setDownloading(true)
    try {
      const png = await toPng(canvasRef.current, { pixelRatio: 2, cacheBust: true })
      const a = document.createElement('a')
      a.download = `servicoflix-${config.format}-${config.template}.png`
      a.href = png
      a.click()
      showToast('✅ Download iniciado!')
    } catch { showToast('❌ Erro ao gerar imagem') }
    finally { setDownloading(false) }
  }

  const handleCopy = async () => {
    if (!canvasRef.current) return
    try {
      const png = await toPng(canvasRef.current, { pixelRatio: 2, cacheBust: true })
      const res = await fetch(png)
      const blob = await res.blob()
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setCopied(true)
      showToast('✅ Imagem copiada!')
      setTimeout(() => setCopied(false), 2500)
    } catch { showToast('❌ Navegador não suporta copiar imagem') }
  }

  const inputCls = 'w-full bg-background border border-border rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-primary transition-colors placeholder:text-muted'

  // Guards de acesso
  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!user) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-2xl font-black text-white mb-4">Login Necessário</h1>
        <button onClick={() => navigate('/entrar')} className="px-6 py-3 bg-primary text-background font-bold rounded-xl">Fazer Login</button>
      </div>
    </div>
  )
  if (!isAdmin) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-2xl font-black text-white mb-2">Acesso Negado</h1>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-primary text-background font-bold rounded-xl">Voltar</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">

      {/* Toast */}
      {toast && (
        <motion.div initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="fixed top-4 right-4 z-50 px-5 py-3 rounded-xl font-semibold text-sm shadow-lg bg-surface border border-border text-white">
          {toast}
        </motion.div>
      )}

      {/* Header */}
      <div className="bg-surface border-b border-border sticky top-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white">Publicidade</h1>
              <p className="text-xs text-muted">Gerador de Artes · ServiçoFlix</p>
            </div>
          </div>
          <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-sm text-muted hover:text-white transition-colors">
            <LogOut className="w-4 h-4" /> Painel Admin
          </button>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-8 py-8 flex flex-col xl:flex-row gap-8">

        {/* ── Painel de controles ── */}
        <aside className="xl:w-80 shrink-0 space-y-6">

          {/* Formato */}
          <section className="bg-surface border border-border rounded-2xl p-5">
            <h2 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Formato</h2>
            <div className="flex flex-col gap-2">
              {(Object.entries(FORMAT_LABELS) as [AdFormat, typeof FORMAT_LABELS[AdFormat]][]).map(([id, { label, sub, icon }]) => (
                <button key={id} onClick={() => set({ format: id })}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                    config.format === id
                      ? 'border-primary bg-primary/10 text-white'
                      : 'border-border text-muted hover:text-white hover:border-primary/40'
                  }`}>
                  {icon}
                  <div>
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="text-xs text-muted">{sub}px</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Template */}
          <section className="bg-surface border border-border rounded-2xl p-5">
            <h2 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Template</h2>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => set({ template: t.id })}
                  className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all ${
                    config.template === t.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/40'
                  }`}>
                  <span className="text-xl">{t.emoji}</span>
                  <p className="text-xs font-bold text-white leading-tight">{t.label}</p>
                  <p className="text-[10px] text-muted">{t.desc}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Textos */}
          <section className="bg-surface border border-border rounded-2xl p-5 space-y-3">
            <h2 className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Textos</h2>
            <div>
              <label className="text-xs text-muted block mb-1">Headline</label>
              <input value={config.headline} onChange={e => set({ headline: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Subtexto</label>
              <textarea value={config.subtext} onChange={e => set({ subtext: e.target.value })} rows={2} className={inputCls + ' resize-none'} />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Botão CTA</label>
              <input value={config.cta} onChange={e => set({ cta: e.target.value })} className={inputCls} />
            </div>
          </section>

          {/* Cor de acento */}
          <section className="bg-surface border border-border rounded-2xl p-5">
            <h2 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Cor de Acento</h2>
            <div className="flex gap-2 flex-wrap">
              {ACCENTS.map(a => (
                <button key={a.value} onClick={() => set({ accent: a.value })}
                  title={a.label}
                  style={{ background: a.value }}
                  className={`w-8 h-8 rounded-full transition-all ${
                    config.accent === a.value ? 'ring-2 ring-white ring-offset-2 ring-offset-surface scale-110' : 'opacity-70 hover:opacity-100'
                  }`} />
              ))}
            </div>
          </section>

          {/* Profissional */}
          <section className="bg-surface border border-border rounded-2xl p-5 space-y-3">
            <h2 className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Profissional em Destaque</h2>
            <div className="relative">
              <select
                onChange={e => handleProviderSelect(e.target.value)}
                className={inputCls + ' appearance-none pr-8'}
              >
                <option value="">— Nenhum —</option>
                {providers.map(p => (
                  <option key={p.id} value={p.id}>{p.name} · {p.specialty}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            </div>
            {config.providerName && (
              <>
                <div>
                  <label className="text-xs text-muted block mb-1">Nome</label>
                  <input value={config.providerName} onChange={e => set({ providerName: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-muted block mb-1">Especialidade</label>
                  <input value={config.providerSpecialty} onChange={e => set({ providerSpecialty: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-muted block mb-1">Cidade</label>
                  <input value={config.providerCity} onChange={e => set({ providerCity: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-muted block mb-1">Avaliação</label>
                  <input value={config.providerRating} onChange={e => set({ providerRating: e.target.value })} className={inputCls} />
                </div>
              </>
            )}
          </section>

          {/* Opções */}
          <section className="bg-surface border border-border rounded-2xl p-5">
            <label className="flex items-center gap-3 cursor-pointer">
              <div onClick={() => set({ showLogo: !config.showLogo })}
                className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${
                  config.showLogo ? 'bg-primary' : 'bg-border'
                }`}>
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  config.showLogo ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </div>
              <span className="text-sm text-white">Mostrar logo ServiçoFlix</span>
            </label>
          </section>

          {/* Botão reset */}
          <button onClick={() => setConfig(DEFAULT_CONFIG)}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-surface border border-border text-muted hover:text-white rounded-xl text-sm transition-colors">
            <RefreshCw className="w-4 h-4" /> Resetar configurações
          </button>
        </aside>

        {/* ── Área de preview ── */}
        <main className="flex-1 flex flex-col gap-6">

          {/* Barra de ações */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-white">Preview</h2>
              <p className="text-xs text-muted">
                {FORMAT_LABELS[config.format].label} · {FORMAT_LABELS[config.format].sub}px
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border text-sm font-semibold text-muted hover:text-white rounded-xl transition-colors">
                <Copy className="w-4 h-4" />
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
              <button onClick={handleDownload} disabled={downloading}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-background text-sm font-bold rounded-xl hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {downloading
                  ? <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                  : <Download className="w-4 h-4" />}
                Baixar PNG
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div className="bg-surface border border-border rounded-2xl p-6 overflow-auto flex items-start justify-start">
            <AdCanvas ref={canvasRef} config={config} />
          </div>

          {/* Dica */}
          <p className="text-xs text-muted text-center">
            💡 O PNG exportado terá resolução 2× (alta qualidade) independente do zoom de preview.
          </p>
        </main>
      </div>
    </div>
  )
}
