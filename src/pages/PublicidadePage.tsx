// src/pages/PublicidadePage.tsx

import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toPng } from 'html-to-image'
import {
  Download, Copy, RefreshCw, Monitor,
  Instagram, Smartphone, AlertTriangle, Check,
  Loader2, LogOut, Image, Zap
} from 'lucide-react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'

// ── Constante de UIDs admins (igual ao AdminPage) ──
const ADMIN_UIDS = ['Glhzl4mWRkNjttVBLaLhoUWLWxf1', '5KqkZ0SPnpMkKO684W7fZBWHo4J2']

// ── Tipos ──
type Formato = 'outdoor' | 'post' | 'stories'
type TemplateId = 'dark-destaque' | 'verde-urgencia' | 'minimalista' | 'profissional-mes'

interface AdConfig {
  headline: string
  subtexto: string
  cta: string
  acento: string
  mostrarLogo: boolean
  profissionalNome: string
  profissionalEspecialidade: string
  profissionalAvatar: string
  profissionalCidade: string
  avaliacao: string
}

interface Provider {
  id: string
  name: string
  specialty: string
  city: string
  avatar: string
  rating: number
}

// ── Dimensões por formato ──
const DIMENSOES: Record<Formato, { w: number; h: number; label: string; scale: number }> = {
  outdoor:  { w: 1200, h: 628,  label: '1200 × 628px', scale: 0.45 },
  post:     { w: 1080, h: 1080, label: '1080 × 1080px', scale: 0.38 },
  stories:  { w: 1080, h: 1920, label: '1080 × 1920px', scale: 0.26 },
}

// ── Templates disponíveis ──
const TEMPLATES: { id: TemplateId; label: string; desc: string; emoji: string }[] = [
  { id: 'dark-destaque',      label: 'Dark Destaque',        desc: 'Fundo escuro + profissional em destaque', emoji: '🎬' },
  { id: 'verde-urgencia',     label: 'Verde Urgência',       desc: 'Chamada de ação forte, fundo verde', emoji: '⚡' },
  { id: 'minimalista',        label: 'Minimalista',          desc: 'Logo + tagline + URL, limpo', emoji: '✨' },
  { id: 'profissional-mes',   label: 'Profissional do Mês',  desc: 'Card grande com foto e avaliação', emoji: '🏆' },
]

const CORES_ACENTO = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

const CONFIG_INICIAL: AdConfig = {
  headline: 'O serviço certo, do jeito certo.',
  subtexto: 'Encontre faxineiras, eletricistas, encanadores e muito mais.',
  cta: 'Encontre um profissional',
  acento: '#10b981',
  mostrarLogo: true,
  profissionalNome: 'João Silva',
  profissionalEspecialidade: 'Encanador',
  profissionalAvatar: '',
  profissionalCidade: 'Diamantina, MG',
  avaliacao: '4.9',
}

// ══════════════════════════════════════════
// LOGO — idêntica à Navbar do site
// ══════════════════════════════════════════

const ZapSVG = ({ color, size }: { color: string; size: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)

interface LogoAdProps {
  acento: string
  bgColor?: string
  textColor?: string
  iconSize?: number
  fontSize?: number
  gap?: number
  marginBottom?: number
}

function LogoAd({ acento, bgColor = acento, textColor = '#ffffff', iconSize = 20, fontSize = 24, gap = 10, marginBottom = 32 }: LogoAdProps) {
  const containerW = iconSize + 16
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap, marginBottom }}>
      <div style={{
        width: containerW, height: containerW,
        background: bgColor,
        borderRadius: Math.round(containerW * 0.28),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <ZapSVG color="#ffffff" size={iconSize} />
      </div>
      <span style={{ color: textColor, fontWeight: 900, fontSize, letterSpacing: -0.5, lineHeight: 1 }}>
        Serviço<span style={{ color: acento }}>Flix</span>
      </span>
    </div>
  )
}

// ══════════════════════════════════════════
// COMPONENTES DE CANVAS (templates visuais)
// ══════════════════════════════════════════

function CanvasDarkDestaque({ cfg, dim }: { cfg: AdConfig; dim: typeof DIMENSOES['outdoor'] }) {
  const isLandscape = dim.w > dim.h
  return (
    <div style={{ width: dim.w, height: dim.h, background: '#0a0f0a', fontFamily: 'Arial, sans-serif', display: 'flex', flexDirection: isLandscape ? 'row' : 'column', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 70% 50%, ${cfg.acento}18 0%, transparent 70%)` }} />
      <div style={{ flex: isLandscape ? '0 0 55%' : '1', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: isLandscape ? '60px 50px' : '60px 50px 30px', zIndex: 1 }}>
        {cfg.mostrarLogo && (
          <LogoAd acento={cfg.acento} iconSize={isLandscape ? 20 : 24} fontSize={isLandscape ? 28 : 32} marginBottom={32} />
        )}
        <h1 style={{ color: '#fff', fontSize: isLandscape ? 48 : 56, fontWeight: 900, lineHeight: 1.1, margin: '0 0 20px', letterSpacing: -1 }}>
          {cfg.headline}
        </h1>
        <p style={{ color: '#94a3b8', fontSize: isLandscape ? 20 : 24, margin: '0 0 36px', lineHeight: 1.5 }}>
          {cfg.subtexto}
        </p>
        <div style={{ display: 'inline-flex', alignItems: 'center', background: cfg.acento, borderRadius: 14, padding: '16px 32px', width: 'fit-content' }}>
          <span style={{ color: '#0a0f0a', fontWeight: 900, fontSize: 18 }}>▶  {cfg.cta}</span>
        </div>
        <p style={{ color: '#1e3a2a', fontSize: 13, marginTop: 28, fontWeight: 600 }}>servicoflix.com</p>
      </div>
      {isLandscape && (
        <div style={{ flex: '0 0 45%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 50px 40px 0', zIndex: 1 }}>
          <div style={{ background: '#141a14', border: `1px solid ${cfg.acento}40`, borderRadius: 24, padding: 32, width: '100%', maxWidth: 360 }}>
            <div style={{ fontSize: 11, color: cfg.acento, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1.5 }}>⭐ Profissional em destaque</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#1a2e1a', border: `2px solid ${cfg.acento}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {cfg.profissionalAvatar
                  ? <img src={cfg.profissionalAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ color: cfg.acento, fontWeight: 900, fontSize: 24 }}>{cfg.profissionalNome.charAt(0)}</span>}
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 900, fontSize: 20 }}>{cfg.profissionalNome}</div>
                <div style={{ color: '#94a3b8', fontSize: 14, marginTop: 2 }}>{cfg.profissionalEspecialidade}</div>
                <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 2 }}>📍 {cfg.profissionalCidade}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0a0f0a', borderRadius: 12, padding: '12px 16px' }}>
              <span style={{ color: '#f59e0b', fontSize: 18 }}>★★★★★</span>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{cfg.avaliacao}</span>
              <span style={{ color: '#94a3b8', fontSize: 13 }}>/ 5.0</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CanvasVerdeUrgencia({ cfg, dim }: { cfg: AdConfig; dim: typeof DIMENSOES['outdoor'] }) {
  return (
    <div style={{ width: dim.w, height: dim.h, background: `linear-gradient(135deg, #0a1f0a 0%, #0f2d1a 50%, #0a1f0a 100%)`, fontFamily: 'Arial, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: `${cfg.acento}15`, filter: 'blur(60px)' }} />
      <div style={{ position: 'absolute', bottom: -80, left: -80, width: 300, height: 300, borderRadius: '50%', background: `${cfg.acento}10`, filter: 'blur(40px)' }} />
      {cfg.mostrarLogo && (
        <div style={{ marginBottom: 40 }}>
          <LogoAd acento={cfg.acento} iconSize={18} fontSize={26} gap={10} marginBottom={0} />
        </div>
      )}
      <div style={{ background: `${cfg.acento}20`, border: `1px solid ${cfg.acento}50`, borderRadius: 100, padding: '8px 20px', marginBottom: 28 }}>
        <span style={{ color: cfg.acento, fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: 2 }}>🔥 Disponível agora</span>
      </div>
      <h1 style={{ color: '#fff', fontSize: dim.w > 800 ? 64 : 48, fontWeight: 900, lineHeight: 1.05, margin: '0 0 20px', letterSpacing: -2, zIndex: 1 }}>
        {cfg.headline}
      </h1>
      <p style={{ color: '#94a3b8', fontSize: dim.w > 800 ? 22 : 18, margin: '0 0 48px', maxWidth: 700, lineHeight: 1.5, zIndex: 1 }}>
        {cfg.subtexto}
      </p>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', zIndex: 1 }}>
        <div style={{ background: cfg.acento, borderRadius: 14, padding: '18px 40px' }}>
          <span style={{ color: '#0a0f0a', fontWeight: 900, fontSize: 20 }}>▶  {cfg.cta}</span>
        </div>
      </div>
      <p style={{ color: `${cfg.acento}80`, fontSize: 14, marginTop: 40, fontWeight: 600, zIndex: 1 }}>servicoflix.com</p>
    </div>
  )
}

function CanvasMinimalista({ cfg, dim }: { cfg: AdConfig; dim: typeof DIMENSOES['outdoor'] }) {
  return (
    <div style={{ width: dim.w, height: dim.h, background: '#fff', fontFamily: 'Arial, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, textAlign: 'center' }}>
      <div style={{ width: 6, height: 60, background: cfg.acento, borderRadius: 3, marginBottom: 40 }} />
      {cfg.mostrarLogo && (
        <div style={{ marginBottom: 32 }}>
          <LogoAd acento={cfg.acento} textColor='#0a0f0a' iconSize={22} fontSize={34} gap={12} marginBottom={0} />
        </div>
      )}
      <h1 style={{ color: '#0a0f0a', fontSize: dim.w > 800 ? 60 : 44, fontWeight: 900, lineHeight: 1.1, margin: '0 0 24px', letterSpacing: -2 }}>
        {cfg.headline}
      </h1>
      <p style={{ color: '#64748b', fontSize: dim.w > 800 ? 22 : 18, margin: '0 0 48px', maxWidth: 600, lineHeight: 1.6 }}>
        {cfg.subtexto}
      </p>
      <div style={{ border: `2px solid ${cfg.acento}`, borderRadius: 14, padding: '16px 40px' }}>
        <span style={{ color: cfg.acento, fontWeight: 900, fontSize: 18 }}>{cfg.cta}</span>
      </div>
      <p style={{ color: '#94a3b8', fontSize: 16, marginTop: 48, fontWeight: 600, letterSpacing: 1 }}>servicoflix.com</p>
      <div style={{ width: 6, height: 60, background: cfg.acento, borderRadius: 3, marginTop: 40 }} />
    </div>
  )
}

function CanvasProfissionalMes({ cfg, dim }: { cfg: AdConfig; dim: typeof DIMENSOES['outdoor'] }) {
  const isLandscape = dim.w > dim.h
  return (
    <div style={{ width: dim.w, height: dim.h, background: '#0a0f0a', fontFamily: 'Arial, sans-serif', display: 'flex', flexDirection: isLandscape ? 'row' : 'column', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 30% 50%, ${cfg.acento}12 0%, transparent 60%)` }} />
      <div style={{ flex: isLandscape ? '0 0 50%' : '0 0 55%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isLandscape ? '60px' : '60px 40px 30px', zIndex: 1 }}>
        <div style={{ fontSize: 13, color: cfg.acento, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 24 }}>🏆 Profissional do Mês</div>
        <div style={{ width: isLandscape ? 200 : 160, height: isLandscape ? 200 : 160, borderRadius: '50%', border: `4px solid ${cfg.acento}`, overflow: 'hidden', background: '#141a14', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          {cfg.profissionalAvatar
            ? <img src={cfg.profissionalAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ color: cfg.acento, fontWeight: 900, fontSize: isLandscape ? 72 : 56 }}>{cfg.profissionalNome.charAt(0)}</span>}
        </div>
        <div style={{ color: '#fff', fontWeight: 900, fontSize: isLandscape ? 32 : 26, textAlign: 'center' }}>{cfg.profissionalNome}</div>
        <div style={{ color: cfg.acento, fontSize: 18, marginTop: 6, fontWeight: 600 }}>{cfg.profissionalEspecialidade}</div>
        <div style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>📍 {cfg.profissionalCidade}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 20, background: '#141a14', borderRadius: 50, padding: '10px 20px' }}>
          <span style={{ color: '#f59e0b', fontSize: 20 }}>★★★★★</span>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 18 }}>{cfg.avaliacao}</span>
        </div>
      </div>
      <div style={{ flex: isLandscape ? '0 0 50%' : '1', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: isLandscape ? '60px 60px 60px 0' : '30px 40px 60px', zIndex: 1 }}>
        {cfg.mostrarLogo && (
          <div style={{ marginBottom: 28 }}>
            <LogoAd acento={cfg.acento} iconSize={16} fontSize={22} gap={10} marginBottom={0} />
          </div>
        )}
        <h1 style={{ color: '#fff', fontSize: isLandscape ? 40 : 32, fontWeight: 900, lineHeight: 1.15, margin: '0 0 16px', letterSpacing: -1 }}>{cfg.headline}</h1>
        <p style={{ color: '#94a3b8', fontSize: isLandscape ? 18 : 15, margin: '0 0 32px', lineHeight: 1.6 }}>{cfg.subtexto}</p>
        <div style={{ background: cfg.acento, borderRadius: 12, padding: '14px 28px', display: 'inline-flex', width: 'fit-content' }}>
          <span style={{ color: '#0a0f0a', fontWeight: 900, fontSize: 16 }}>▶  {cfg.cta}</span>
        </div>
        <p style={{ color: '#1e3a2a', fontSize: 12, marginTop: 24, fontWeight: 600 }}>servicoflix.com</p>
      </div>
    </div>
  )
}

function AdCanvas({ template, cfg, dim }: { template: TemplateId; cfg: AdConfig; dim: typeof DIMENSOES['outdoor'] }) {
  if (template === 'dark-destaque')    return <CanvasDarkDestaque    cfg={cfg} dim={dim} />
  if (template === 'verde-urgencia')   return <CanvasVerdeUrgencia   cfg={cfg} dim={dim} />
  if (template === 'minimalista')      return <CanvasMinimalista     cfg={cfg} dim={dim} />
  if (template === 'profissional-mes') return <CanvasProfissionalMes cfg={cfg} dim={dim} />
  return null
}

// ══════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════

export const PublicidadePage = () => {
  const { user, loading: authLoading } = useSimpleAuth()
  const navigate = useNavigate()

  const [formato, setFormato] = useState<Formato>('outdoor')
  const [template, setTemplate] = useState<TemplateId>('dark-destaque')
  const [cfg, setCfg] = useState<AdConfig>(CONFIG_INICIAL)
  const [providers, setProviders] = useState<Provider[]>([])
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const canvasRef = useRef<HTMLDivElement>(null)
  const isAdmin = user && ADMIN_UIDS.includes(user.id)
  const dim = DIMENSOES[formato]

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    if (!isAdmin) return
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'))
        const list: Provider[] = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as any))
          .filter((u: any) => u.roles?.includes('provider') && u.providerProfile?.status === 'approved')
          .map((u: any) => ({
            id: u.id,
            name: u.providerProfile?.professionalName || u.name || '',
            specialty: u.providerProfile?.specialty || '',
            city: u.providerProfile?.city || '',
            avatar: u.providerProfile?.avatar || u.avatar || '',
            rating: u.providerProfile?.rating || 4.9,
          }))
        setProviders(list)
      } catch { /* silencia */ }
    }
    load()
  }, [isAdmin])

  const handleSelectProvider = (id: string) => {
    const p = providers.find(p => p.id === id)
    if (!p) return
    setCfg(c => ({
      ...c,
      profissionalNome: p.name,
      profissionalEspecialidade: p.specialty,
      profissionalAvatar: p.avatar,
      profissionalCidade: p.city,
      avaliacao: String(p.rating),
    }))
  }

  const handleDownload = async () => {
    if (!canvasRef.current) return
    setDownloading(true)
    try {
      const png = await toPng(canvasRef.current, { pixelRatio: 1, cacheBust: true })
      const link = document.createElement('a')
      link.download = `servicoflix-${template}-${formato}.png`
      link.href = png
      link.click()
      showToast('✅ Download iniciado!')
    } catch {
      showToast('Erro ao gerar imagem. Tente novamente.', 'error')
    } finally {
      setDownloading(false)
    }
  }

  const handleCopy = async () => {
    if (!canvasRef.current) return
    try {
      const png = await toPng(canvasRef.current, { pixelRatio: 1, cacheBust: true })
      const res = await fetch(png)
      const blob = await res.blob()
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
      showToast('📋 Imagem copiada!')
    } catch {
      showToast('Navegador não suporta cópia. Use o download.', 'error')
    }
  }

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!user) return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="text-center">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-2xl font-black text-white mb-2">Login Necessário</h1>
        <p className="text-muted mb-6">Você precisa estar logado.</p>
        <button onClick={() => navigate('/entrar')} className="px-6 py-3 bg-primary text-background font-bold rounded-xl">Fazer Login</button>
      </div>
    </div>
  )
  if (!isAdmin) return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="text-center">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-2xl font-black text-white mb-2">Acesso Negado</h1>
        <p className="text-muted mb-6">Apenas administradores podem acessar esta página.</p>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-primary text-background font-bold rounded-xl">Voltar ao Início</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl font-semibold text-sm shadow-lg max-w-sm ${
              toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-surface border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
              <Image className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-black text-white">Publicidade</h1>
              <p className="text-xs text-muted">Gerador de artes • ServiçoFlix</p>
            </div>
          </div>
          <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-sm text-muted hover:text-white transition-colors">
            <LogOut className="w-4 h-4" /> Painel Admin
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        <div className="grid lg:grid-cols-[380px_1fr] gap-8">

          {/* ─── PAINEL ESQUERDO: Controles ─── */}
          <div className="space-y-6">

            {/* Formato */}
            <div className="bg-surface border border-border rounded-2xl p-5">
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Formato</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'outdoor',  label: 'Outdoor',  icon: Monitor },
                  { id: 'post',     label: 'Post',     icon: Instagram },
                  { id: 'stories',  label: 'Stories',  icon: Smartphone },
                ] as const).map(f => (
                  <button key={f.id} onClick={() => setFormato(f.id)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold transition-colors ${
                      formato === f.id ? 'bg-primary/10 border-primary text-primary' : 'border-border text-muted hover:text-white hover:border-muted'
                    }`}>
                    <f.icon className="w-4 h-4" />
                    {f.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted mt-2 text-center">{dim.label}</p>
            </div>

            {/* Template */}
            <div className="bg-surface border border-border rounded-2xl p-5">
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Template</p>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => setTemplate(t.id)}
                    className={`text-left p-3 rounded-xl border transition-colors ${
                      template === t.id ? 'bg-primary/10 border-primary' : 'border-border hover:border-muted'
                    }`}>
                    <div className="text-lg mb-1">{t.emoji}</div>
                    <div className={`text-xs font-bold ${template === t.id ? 'text-primary' : 'text-white'}`}>{t.label}</div>
                    <div className="text-[10px] text-muted leading-tight mt-0.5">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Conteúdo */}
            <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
              <p className="text-xs font-bold text-muted uppercase tracking-wider">Conteúdo</p>
              <div>
                <label className="text-xs text-muted mb-1.5 block">Headline principal</label>
                <input value={cfg.headline} onChange={e => setCfg(c => ({ ...c, headline: e.target.value }))}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-primary transition-colors" />
              </div>
              <div>
                <label className="text-xs text-muted mb-1.5 block">Subtexto</label>
                <textarea value={cfg.subtexto} onChange={e => setCfg(c => ({ ...c, subtexto: e.target.value }))}
                  rows={2} className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-primary transition-colors resize-none" />
              </div>
              <div>
                <label className="text-xs text-muted mb-1.5 block">Texto do CTA (botão)</label>
                <input value={cfg.cta} onChange={e => setCfg(c => ({ ...c, cta: e.target.value }))}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-primary transition-colors" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setCfg(c => ({ ...c, mostrarLogo: !c.mostrarLogo }))}
                  className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${cfg.mostrarLogo ? 'bg-primary' : 'bg-border'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${cfg.mostrarLogo ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <span className="text-sm text-white">Mostrar logo ServiçoFlix</span>
              </label>
            </div>

            {/* Cor de acento */}
            <div className="bg-surface border border-border rounded-2xl p-5">
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Cor de acento</p>
              <div className="flex gap-2 flex-wrap">
                {CORES_ACENTO.map(cor => (
                  <button key={cor} onClick={() => setCfg(c => ({ ...c, acento: cor }))}
                    style={{ background: cor }}
                    className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${cfg.acento === cor ? 'ring-2 ring-white ring-offset-2 ring-offset-surface scale-110' : ''}`} />
                ))}
              </div>
            </div>

            {/* Profissional */}
            <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
              <p className="text-xs font-bold text-muted uppercase tracking-wider">Profissional em destaque</p>
              {providers.length > 0 && (
                <div>
                  <label className="text-xs text-muted mb-1.5 block">Selecionar prestador cadastrado</label>
                  <select onChange={e => handleSelectProvider(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-primary transition-colors">
                    <option value="">-- Selecionar --</option>
                    {providers.map(p => (
                      <option key={p.id} value={p.id}>{p.name} — {p.specialty}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs text-muted mb-1.5 block">Nome</label>
                <input value={cfg.profissionalNome} onChange={e => setCfg(c => ({ ...c, profissionalNome: e.target.value }))}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-primary transition-colors" />
              </div>
              <div>
                <label className="text-xs text-muted mb-1.5 block">Especialidade</label>
                <input value={cfg.profissionalEspecialidade} onChange={e => setCfg(c => ({ ...c, profissionalEspecialidade: e.target.value }))}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-primary transition-colors" />
              </div>
              <div>
                <label className="text-xs text-muted mb-1.5 block">Cidade</label>
                <input value={cfg.profissionalCidade} onChange={e => setCfg(c => ({ ...c, profissionalCidade: e.target.value }))}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-primary transition-colors" />
              </div>
              <div>
                <label className="text-xs text-muted mb-1.5 block">Avaliação (ex: 4.9)</label>
                <input value={cfg.avaliacao} onChange={e => setCfg(c => ({ ...c, avaliacao: e.target.value }))}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-primary transition-colors" />
              </div>
              <div>
                <label className="text-xs text-muted mb-1.5 block">URL da foto (opcional)</label>
                <input value={cfg.profissionalAvatar} onChange={e => setCfg(c => ({ ...c, profissionalAvatar: e.target.value }))}
                  placeholder="https://..."
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-primary transition-colors" />
              </div>
              <button onClick={() => setCfg(CONFIG_INICIAL)}
                className="flex items-center gap-2 text-xs text-muted hover:text-white transition-colors">
                <RefreshCw className="w-3.5 h-3.5" /> Resetar para padrão
              </button>
            </div>
          </div>

          {/* ─── PAINEL DIREITO: Preview + ações ─── */}
          <div className="space-y-4">
            <div className="flex gap-3 justify-end">
              <button onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border text-sm font-semibold text-white rounded-xl hover:border-primary transition-colors">
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado!' : 'Copiar imagem'}
              </button>
              <button onClick={handleDownload} disabled={downloading}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-background text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60">
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {downloading ? 'Gerando...' : 'Baixar PNG'}
              </button>
            </div>
            <div className="bg-surface border border-border rounded-2xl p-6 flex items-center justify-center overflow-hidden">
  <div style={{
    width: dim.w * dim.scale,
    height: dim.h * dim.scale,
    flexShrink: 0,
    position: 'relative',
  }}>
    <div style={{
      transform: `scale(${dim.scale})`,
      transformOrigin: 'top left',
      position: 'absolute',
      top: 0,
      left: 0,
    }}>
      <div ref={canvasRef}>
        <AdCanvas template={template} cfg={cfg} dim={dim} />
      </div>
    </div>
  </div>
</div>
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-muted">
                Formato: <span className="text-white font-semibold">{dim.label}</span>
              </p>
              <p className="text-xs text-muted">
                Template: <span className="text-white font-semibold">{TEMPLATES.find(t => t.id === template)?.label}</span>
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
