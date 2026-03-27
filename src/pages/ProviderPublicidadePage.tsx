// src/pages/ProviderPublicidadePage.tsx
import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toPng } from 'html-to-image'
import {
  Download, Copy, ArrowLeft, Instagram, Smartphone,
  AlertTriangle, Check, Loader2, Sparkles, RefreshCw
} from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'

// ─── tipos ────────────────────────────────────────────────────────────────────
type Formato = 'post' | 'stories'
type TemplateId = 'dark-destaque' | 'profissional-mes' | 'esta-na-servicoflix' | 'verde-urgencia'

interface AdConfig {
  acento: string
  profissionalNome: string
  profissionalEspecialidade: string
  profissionalAvatar: string
  profissionalCidade: string
  avaliacao: string
  headline: string
  subtexto: string
}

// ─── constantes ──────────────────────────────────────────────────────────────
const DIMENSOES: Record<Formato, { w: number; h: number; label: string; scale: number }> = {
  post:    { w: 1080, h: 1080, label: '1080 × 1080px', scale: 0.36 },
  stories: { w: 1080, h: 1920, label: '1080 × 1920px', scale: 0.24 },
}

const TEMPLATES: { id: TemplateId; label: string; emoji: string; desc: string }[] = [
  { id: 'esta-na-servicoflix', label: 'Estou na ServiçoFlix!', emoji: '🎉', desc: 'Anuncie que você chegou na plataforma' },
  { id: 'profissional-mes',    label: 'Meu Perfil',            emoji: '🏆', desc: 'Destaque seu nome, foto e avaliação' },
  { id: 'dark-destaque',       label: 'Destaque Profissional', emoji: '🎬', desc: 'Card elegante com seu serviço' },
  { id: 'verde-urgencia',      label: 'Disponível Agora',      emoji: '⚡', desc: 'Chamada de ação forte' },
]

const CORES_ACENTO = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899']

// ─── helpers de canvas (reutilizados do PublicidadePage) ──────────────────────
const ZapSVG = ({ color, size }: { color: string; size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill={color} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)

function LogoAd({ acento, textColor = '#fff', iconSize = 28, fontSize = 36, gap = 10, marginBottom = 32 }: {
  acento: string; textColor?: string; iconSize?: number; fontSize?: number; gap?: number; marginBottom?: number
}) {
  const w = iconSize + 16
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap, marginBottom }}>
      <div style={{ width: w, height: w, background: acento, borderRadius: Math.round(w * 0.28), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <ZapSVG color="#fff" size={iconSize} />
      </div>
      <span style={{ color: textColor, fontWeight: 900, fontSize, letterSpacing: -0.5, lineHeight: 1 }}>
        Serviço<span style={{ color: acento }}>Flix</span>
      </span>
    </div>
  )
}

function SiteTag({ acento, iconSize = 14, fontSize = 20, padding = '12px 28px', marginTop = 28 }: {
  acento: string; iconSize?: number; fontSize?: number; padding?: string; marginTop?: number
}) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: `${acento}18`, border: `2px solid ${acento}60`, borderRadius: 100, padding, marginTop }}>
      <div style={{ width: iconSize + 10, height: iconSize + 10, background: acento, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <ZapSVG color="#fff" size={iconSize} />
      </div>
      <span style={{ color: acento, fontWeight: 900, fontSize, letterSpacing: 0.5 }}>servicoflix.com</span>
    </div>
  )
}

// ─── TEMPLATE: Está na ServiçoFlix ───────────────────────────────────────────
function CanvasEstaNaServicoflix({ cfg, dim }: { cfg: AdConfig; dim: typeof DIMENSOES['post'] }) {
  const isStories = dim.h > dim.w
  const nome = cfg.profissionalNome || 'Seu Nome'
  const fs = isStories
    ? { badge: 28, nome: 68, subtitulo: 48, tag: 32, tagIcon: 16, tagPad: '18px 44px', avatarSize: 196, badgePad: '14px 32px' }
    : { badge: 20, nome: 56, subtitulo: 38, tag: 26, tagIcon: 14, tagPad: '14px 36px', avatarSize: 160, badgePad: '10px 24px' }
  return (
    <div style={{ width: dim.w, height: dim.h, background: '#0a0f0a', fontFamily: 'Arial, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isStories ? '120px 80px' : '80px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -200, left: '50%', transform: 'translateX(-50%)', width: 900, height: 900, borderRadius: '50%', background: `${cfg.acento}12`, filter: 'blur(90px)' }} />
      <div style={{ position: 'absolute', top: 60, left: 80, fontSize: isStories ? 64 : 44, opacity: 0.5 }}>🎉</div>
      <div style={{ position: 'absolute', top: 80, right: 100, fontSize: isStories ? 52 : 36, opacity: 0.4 }}>✨</div>
      <div style={{ position: 'absolute', bottom: 80, left: 100, fontSize: isStories ? 52 : 36, opacity: 0.4 }}>✨</div>
      <div style={{ position: 'absolute', bottom: 60, right: 80, fontSize: isStories ? 64 : 44, opacity: 0.5 }}>🎉</div>

      {/* Logo no topo */}
      <div style={{ position: 'absolute', top: isStories ? 72 : 56, left: '50%', transform: 'translateX(-50%)' }}>
        <LogoAd acento={cfg.acento} iconSize={isStories ? 22 : 18} fontSize={isStories ? 30 : 24} gap={10} marginBottom={0} />
      </div>

      <div style={{ position: 'relative', marginBottom: isStories ? 44 : 36, zIndex: 1 }}>
        <div style={{ width: fs.avatarSize, height: fs.avatarSize, borderRadius: '50%', border: `5px solid ${cfg.acento}`, overflow: 'hidden', background: '#141a14', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 60px ${cfg.acento}40` }}>
          {cfg.profissionalAvatar
            ? <img src={cfg.profissionalAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ color: cfg.acento, fontWeight: 900, fontSize: fs.avatarSize * 0.4 }}>{nome.charAt(0)}</span>}
        </div>
        <div style={{ position: 'absolute', bottom: 6, right: 6, width: isStories ? 54 : 44, height: isStories ? 54 : 44, borderRadius: '50%', background: cfg.acento, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid #0a0f0a', fontSize: isStories ? 24 : 20, fontWeight: 900, color: '#fff' }}>✓</div>
      </div>

      <div style={{ zIndex: 1, maxWidth: 860 }}>
        <div style={{ background: `${cfg.acento}20`, border: `1.5px solid ${cfg.acento}50`, borderRadius: 100, padding: fs.badgePad, marginBottom: isStories ? 24 : 18, display: 'inline-block' }}>
          <span style={{ color: cfg.acento, fontWeight: 700, fontSize: fs.badge, textTransform: 'uppercase', letterSpacing: 2 }}>
            {cfg.profissionalEspecialidade || 'Profissional'} · {cfg.profissionalCidade || 'Diamantina, MG'}
          </span>
        </div>
        <h1 style={{ color: '#fff', fontSize: fs.nome, fontWeight: 900, lineHeight: 1.05, margin: '0 0 8px', letterSpacing: -2 }}>{nome}</h1>
        <h2 style={{ fontSize: fs.subtitulo, fontWeight: 900, margin: '0 0 32px', letterSpacing: -1, lineHeight: 1.1 }}>
          <span style={{ color: '#94a3b8' }}>está na </span>
          <span style={{ color: '#fff' }}>Serviço</span><span style={{ color: cfg.acento }}>Flix!</span>
        </h2>
        <div style={{ width: 80, height: 4, background: cfg.acento, borderRadius: 2, margin: '0 auto 32px' }} />
        <SiteTag acento={cfg.acento} iconSize={fs.tagIcon} fontSize={fs.tag} padding={fs.tagPad} marginTop={0} />
      </div>
    </div>
  )
}

// ─── TEMPLATE: Profissional do Mês ───────────────────────────────────────────
function CanvasProfissionalMes({ cfg, dim }: { cfg: AdConfig; dim: typeof DIMENSOES['post'] }) {
  const isStories = dim.h > dim.w
  const nome = cfg.profissionalNome || 'Seu Nome'
  const fs = isStories
    ? { titulo: 30, nome: 62, esp: 34, cidade: 26, rat: 28, ratStar: 36, headline: 40, sub: 26, avatarSize: 220, cta: 28 }
    : { titulo: 22, nome: 52, esp: 28, cidade: 22, rat: 24, ratStar: 28, headline: 34, sub: 22, avatarSize: 180, cta: 22 }
  return (
    <div style={{ width: dim.w, height: dim.h, background: '#0a0f0a', fontFamily: 'Arial, sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 30%, ${cfg.acento}14 0%, transparent 60%)` }} />

      {/* Topo: logo */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: isStories ? '56px 0 0' : '44px 0 0', zIndex: 1 }}>
        <LogoAd acento={cfg.acento} iconSize={isStories ? 20 : 16} fontSize={isStories ? 28 : 22} gap={10} marginBottom={0} />
      </div>

      {/* Centro: avatar + dados */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isStories ? '40px 80px' : '32px 60px', zIndex: 1 }}>
        <div style={{ fontSize: isStories ? 26 : 20, color: cfg.acento, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: isStories ? 28 : 20 }}>🏆 Profissional em destaque</div>
        <div style={{ width: fs.avatarSize, height: fs.avatarSize, borderRadius: '50%', border: `5px solid ${cfg.acento}`, overflow: 'hidden', background: '#141a14', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: isStories ? 32 : 24, boxShadow: `0 0 50px ${cfg.acento}30` }}>
          {cfg.profissionalAvatar
            ? <img src={cfg.profissionalAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ color: cfg.acento, fontWeight: 900, fontSize: fs.avatarSize * 0.4 }}>{nome.charAt(0)}</span>}
        </div>
        <div style={{ color: '#fff', fontWeight: 900, fontSize: fs.nome, textAlign: 'center', lineHeight: 1.1 }}>{nome}</div>
        <div style={{ color: cfg.acento, fontSize: fs.esp, marginTop: 8, fontWeight: 600 }}>{cfg.profissionalEspecialidade}</div>
        <div style={{ color: '#94a3b8', fontSize: fs.cidade, marginTop: 6 }}>📍 {cfg.profissionalCidade}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: isStories ? 28 : 20, background: '#141a14', borderRadius: 50, padding: isStories ? '14px 28px' : '10px 22px' }}>
          <span style={{ color: '#f59e0b', fontSize: fs.ratStar }}>★★★★★</span>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: fs.rat }}>{cfg.avaliacao}</span>
          <span style={{ color: '#94a3b8', fontSize: fs.cidade }}>/5.0</span>
        </div>
      </div>

      {/* Rodapé */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isStories ? '0 80px 80px' : '0 60px 52px', zIndex: 1 }}>
        <div style={{ width: '100%', height: 1, background: `${cfg.acento}30`, marginBottom: isStories ? 36 : 28 }} />
        <p style={{ color: '#94a3b8', fontSize: fs.sub, textAlign: 'center', marginBottom: isStories ? 28 : 20, lineHeight: 1.5 }}>Encontre esse e outros profissionais em</p>
        <SiteTag acento={cfg.acento} iconSize={isStories ? 18 : 14} fontSize={isStories ? 30 : 24} padding={isStories ? '18px 40px' : '14px 32px'} marginTop={0} />
      </div>
    </div>
  )
}

// ─── TEMPLATE: Dark Destaque ──────────────────────────────────────────────────
function CanvasDarkDestaque({ cfg, dim }: { cfg: AdConfig; dim: typeof DIMENSOES['post'] }) {
  const isStories = dim.h > dim.w
  const nome = cfg.profissionalNome || 'Seu Nome'
  const fs = isStories
    ? { avatarSize: 200, nome: 58, esp: 32, cidade: 24, headline: 52, sub: 28, cta: 28, tag: 30, tagIcon: 16, tagPad: '16px 40px' }
    : { avatarSize: 160, nome: 50, esp: 28, cidade: 20, headline: 44, sub: 24, cta: 24, tag: 24, tagIcon: 13, tagPad: '12px 32px' }
  return (
    <div style={{ width: dim.w, height: dim.h, background: '#0a0f0a', fontFamily: 'Arial, sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 20%, ${cfg.acento}18 0%, transparent 65%)` }} />

      {/* Topo: logo */}
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: isStories ? 64 : 48, zIndex: 1 }}>
        <LogoAd acento={cfg.acento} iconSize={isStories ? 22 : 18} fontSize={isStories ? 30 : 24} gap={10} marginBottom={0} />
      </div>

      {/* Card do profissional */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isStories ? '44px 80px 28px' : '32px 60px 20px', zIndex: 1 }}>
        <div style={{ background: '#141a14', border: `1px solid ${cfg.acento}40`, borderRadius: 28, padding: isStories ? '40px 48px' : '32px 40px', width: '100%', display: 'flex', alignItems: 'center', gap: isStories ? 36 : 28 }}>
          <div style={{ width: fs.avatarSize, height: fs.avatarSize, borderRadius: '50%', border: `4px solid ${cfg.acento}`, overflow: 'hidden', background: '#0a0f0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {cfg.profissionalAvatar
              ? <img src={cfg.profissionalAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: cfg.acento, fontWeight: 900, fontSize: fs.avatarSize * 0.4 }}>{nome.charAt(0)}</span>}
          </div>
          <div>
            <div style={{ fontSize: fs.esp * 0.8, color: cfg.acento, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1.5 }}>⭐ Profissional verificado</div>
            <div style={{ color: '#fff', fontWeight: 900, fontSize: fs.nome, lineHeight: 1.1 }}>{nome}</div>
            <div style={{ color: '#94a3b8', fontSize: fs.esp, marginTop: 6 }}>{cfg.profissionalEspecialidade}</div>
            <div style={{ color: '#94a3b8', fontSize: fs.cidade, marginTop: 4 }}>📍 {cfg.profissionalCidade}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, background: '#0a0f0a', borderRadius: 10, padding: '8px 14px', width: 'fit-content' }}>
              <span style={{ color: '#f59e0b', fontSize: fs.esp }}>★★★★★</span>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: fs.esp }}>{cfg.avaliacao}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Headline */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: isStories ? '0 80px' : '0 60px', zIndex: 1 }}>
        <h1 style={{ color: '#fff', fontSize: fs.headline, fontWeight: 900, lineHeight: 1.1, margin: '0 0 16px', letterSpacing: -1, textAlign: 'center' }}>{cfg.headline}</h1>
        <p style={{ color: '#94a3b8', fontSize: fs.sub, textAlign: 'center', lineHeight: 1.5 }}>{cfg.subtexto}</p>
      </div>

      {/* Rodapé */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isStories ? '0 80px 80px' : '0 60px 52px', zIndex: 1 }}>
        <div style={{ background: cfg.acento, borderRadius: 14, padding: isStories ? '20px 60px' : '16px 48px', marginBottom: isStories ? 28 : 20 }}>
          <span style={{ color: '#0a0f0a', fontWeight: 900, fontSize: fs.cta }}>▶  {cfg.subtexto && 'Me contrate no'}</span>
        </div>
        <SiteTag acento={cfg.acento} iconSize={fs.tagIcon} fontSize={fs.tag} padding={fs.tagPad} marginTop={0} />
      </div>
    </div>
  )
}

// ─── TEMPLATE: Verde Urgência ─────────────────────────────────────────────────
function CanvasVerdeUrgencia({ cfg, dim }: { cfg: AdConfig; dim: typeof DIMENSOES['post'] }) {
  const isStories = dim.h > dim.w
  const nome = cfg.profissionalNome || 'Seu Nome'
  const fs = isStories
    ? { avatarSize: 180, badge: 26, nome: 64, esp: 32, headline: 52, sub: 28, tag: 30, tagIcon: 16, tagPad: '16px 40px' }
    : { avatarSize: 148, badge: 20, nome: 52, esp: 26, headline: 44, sub: 24, tag: 24, tagIcon: 13, tagPad: '12px 32px' }
  return (
    <div style={{ width: dim.w, height: dim.h, background: 'linear-gradient(160deg, #0a1f0a 0%, #0f2d1a 60%, #0a1f0a 100%)', fontFamily: 'Arial, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isStories ? '64px 80px' : '48px 60px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -100, right: -100, width: 500, height: 500, borderRadius: '50%', background: `${cfg.acento}14`, filter: 'blur(60px)' }} />
      <div style={{ position: 'absolute', bottom: -80, left: -80, width: 400, height: 400, borderRadius: '50%', background: `${cfg.acento}10`, filter: 'blur(40px)' }} />

      <LogoAd acento={cfg.acento} iconSize={isStories ? 22 : 18} fontSize={isStories ? 30 : 24} gap={10} marginBottom={isStories ? 36 : 28} />

      <div style={{ background: `${cfg.acento}20`, border: `1px solid ${cfg.acento}50`, borderRadius: 100, padding: isStories ? '12px 28px' : '8px 20px', marginBottom: isStories ? 32 : 24 }}>
        <span style={{ color: cfg.acento, fontWeight: 700, fontSize: fs.badge, textTransform: 'uppercase', letterSpacing: 2 }}>🔥 Disponível agora</span>
      </div>

      <div style={{ width: fs.avatarSize, height: fs.avatarSize, borderRadius: '50%', border: `5px solid ${cfg.acento}`, overflow: 'hidden', background: '#0a1f0a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: isStories ? 32 : 24, boxShadow: `0 0 50px ${cfg.acento}40`, zIndex: 1 }}>
        {cfg.profissionalAvatar
          ? <img src={cfg.profissionalAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ color: cfg.acento, fontWeight: 900, fontSize: fs.avatarSize * 0.4 }}>{nome.charAt(0)}</span>}
      </div>

      <div style={{ color: '#fff', fontWeight: 900, fontSize: fs.nome, lineHeight: 1.1, marginBottom: 8 }}>{nome}</div>
      <div style={{ color: cfg.acento, fontSize: fs.esp, fontWeight: 700, marginBottom: 4 }}>{cfg.profissionalEspecialidade}</div>
      <div style={{ color: '#94a3b8', fontSize: fs.esp * 0.85, marginBottom: isStories ? 36 : 28 }}>📍 {cfg.profissionalCidade}</div>

      <h1 style={{ color: '#fff', fontSize: fs.headline, fontWeight: 900, lineHeight: 1.1, margin: '0 0 16px', letterSpacing: -1, zIndex: 1 }}>{cfg.headline}</h1>
      <p style={{ color: '#94a3b8', fontSize: fs.sub, margin: '0 0 36px', lineHeight: 1.5, zIndex: 1 }}>{cfg.subtexto}</p>

      <div style={{ background: cfg.acento, borderRadius: 14, padding: isStories ? '20px 60px' : '16px 48px', marginBottom: isStories ? 28 : 20, zIndex: 1 }}>
        <span style={{ color: '#0a0f0a', fontWeight: 900, fontSize: fs.headline * 0.55 }}>▶  Me encontre no ServiçoFlix</span>
      </div>
      <SiteTag acento={cfg.acento} iconSize={fs.tagIcon} fontSize={fs.tag} padding={fs.tagPad} marginTop={0} />
    </div>
  )
}

function AdCanvas({ template, cfg, dim }: { template: TemplateId; cfg: AdConfig; dim: typeof DIMENSOES['post'] }) {
  if (template === 'esta-na-servicoflix') return <CanvasEstaNaServicoflix cfg={cfg} dim={dim} />
  if (template === 'profissional-mes')   return <CanvasProfissionalMes   cfg={cfg} dim={dim} />
  if (template === 'dark-destaque')      return <CanvasDarkDestaque      cfg={cfg} dim={dim} />
  if (template === 'verde-urgencia')     return <CanvasVerdeUrgencia     cfg={cfg} dim={dim} />
  return null
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────────
export const ProviderPublicidadePage = () => {
  const { user, loading: authLoading } = useSimpleAuth()
  const navigate = useNavigate()

  const [formato, setFormato] = useState<Formato>('post')
  const [template, setTemplate] = useState<TemplateId>('esta-na-servicoflix')
  const [cfg, setCfg] = useState<AdConfig>({
    acento: '#10b981',
    profissionalNome: '',
    profissionalEspecialidade: '',
    profissionalAvatar: '',
    profissionalCidade: '',
    avaliacao: '5.0',
    headline: 'Precisa de um profissional de confiança?',
    subtexto: 'Me encontre no ServiçoFlix e solicite um orçamento!',
  })
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)

  const canvasRef = useRef<HTMLDivElement>(null)
  const dim = DIMENSOES[formato]

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Carrega os dados do perfil do prestador
  useEffect(() => {
    if (!user?.id) return
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.id))
        if (!snap.exists()) return
        const data = snap.data()
        const pp = data.providerProfile || {}
        setCfg(prev => ({
          ...prev,
          profissionalNome: pp.professionalName || data.name || '',
          profissionalEspecialidade: pp.specialty || '',
          profissionalAvatar: pp.avatar || data.avatar || '',
          profissionalCidade: pp.city || '',
          avaliacao: String(pp.rating || '5.0'),
        }))
        setProfileLoaded(true)
      } catch {
        setProfileLoaded(true)
      }
    }
    load()
  }, [user?.id])

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
    } catch { showToast('Erro ao gerar imagem. Tente novamente.', 'error') }
    finally { setDownloading(false) }
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
    } catch { showToast('Navegador não suporta cópia. Use o download.', 'error') }
  }

  if (authLoading || !profileLoaded) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  )

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="text-center">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-2xl font-black text-white mb-2">Login Necessário</h1>
        <p className="text-muted mb-6">Você precisa estar logado para criar artes.</p>
        <button onClick={() => navigate('/entrar')} className="px-6 py-3 bg-primary text-background font-bold rounded-xl">Fazer Login</button>
      </div>
    </div>
  )

  if (!user.roles?.includes('provider')) return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="text-center">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-2xl font-black text-white mb-2">Área exclusiva</h1>
        <p className="text-muted mb-6">Apenas prestadores cadastrados podem criar artes.</p>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-primary text-background font-bold rounded-xl">Voltar ao Início</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background pb-20">
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
      <div className="bg-surface border-b border-border sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/meu-perfil')} className="p-2 hover:bg-background rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-muted" />
            </button>
            <div>
              <h1 className="text-base font-black text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Criar Arte de Divulgação
              </h1>
              <p className="text-xs text-muted">Post e Stories personalizados com sua identidade</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <button onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-sm font-semibold text-white rounded-xl hover:border-primary transition-colors">
              {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
            <button onClick={handleDownload} disabled={downloading}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-background text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60">
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {downloading ? 'Gerando...' : 'Baixar PNG'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        <div className="grid lg:grid-cols-[360px_1fr] gap-8">

          {/* ── PAINEL ESQUERDO ── */}
          <div className="space-y-5">

            {/* Formato */}
            <div className="bg-surface border border-border rounded-2xl p-5">
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Formato</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: 'post',    label: 'Post',    icon: Instagram, sub: '1080×1080px' },
                  { id: 'stories', label: 'Stories', icon: Smartphone, sub: '1080×1920px' },
                ] as const).map(f => (
                  <button key={f.id} onClick={() => setFormato(f.id)}
                    className={`flex flex-col items-center gap-1.5 py-4 rounded-xl border text-sm font-semibold transition-colors ${
                      formato === f.id ? 'bg-primary/10 border-primary text-primary' : 'border-border text-muted hover:text-white hover:border-muted'
                    }`}>
                    <f.icon className="w-5 h-5" />
                    <span>{f.label}</span>
                    <span className="text-[10px] opacity-70">{f.sub}</span>
                  </button>
                ))}
              </div>
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
                    <div className="text-xl mb-1">{t.emoji}</div>
                    <div className={`text-xs font-bold leading-tight ${template === t.id ? 'text-primary' : 'text-white'}`}>{t.label}</div>
                    <div className="text-[10px] text-muted leading-tight mt-0.5">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Cor de acento */}
            <div className="bg-surface border border-border rounded-2xl p-5">
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Cor de destaque</p>
              <div className="flex gap-2.5 flex-wrap">
                {CORES_ACENTO.map(cor => (
                  <button key={cor} onClick={() => setCfg(c => ({ ...c, acento: cor }))}
                    style={{ background: cor }}
                    className={`w-9 h-9 rounded-full transition-transform hover:scale-110 ${
                      cfg.acento === cor ? 'ring-2 ring-white ring-offset-2 ring-offset-surface scale-110' : ''
                    }`} />
                ))}
              </div>
            </div>

            {/* Dados do perfil (somente leitura + editáveis) */}
            <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-muted uppercase tracking-wider">Seus Dados</p>
                <button onClick={() => navigate('/meu-perfil/editar')}
                  className="text-xs text-primary hover:underline transition-colors">Editar perfil →</button>
              </div>

              {/* Preview do avatar */}
              {cfg.profissionalAvatar && (
                <div className="flex items-center gap-3 bg-background rounded-xl p-3">
                  <img src={cfg.profissionalAvatar} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-primary" />
                  <div>
                    <p className="text-white text-sm font-bold">{cfg.profissionalNome}</p>
                    <p className="text-muted text-xs">{cfg.profissionalEspecialidade}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs text-muted mb-1.5 block">Nome exibido na arte</label>
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
                <label className="text-xs text-muted mb-1.5 block">Avaliação</label>
                <input value={cfg.avaliacao} onChange={e => setCfg(c => ({ ...c, avaliacao: e.target.value }))}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-primary transition-colors" />
              </div>

              {(template === 'dark-destaque' || template === 'verde-urgencia') && (
                <>
                  <div>
                    <label className="text-xs text-muted mb-1.5 block">Headline da arte</label>
                    <input value={cfg.headline} onChange={e => setCfg(c => ({ ...c, headline: e.target.value }))}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-primary transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs text-muted mb-1.5 block">Subtexto</label>
                    <textarea value={cfg.subtexto} onChange={e => setCfg(c => ({ ...c, subtexto: e.target.value }))}
                      rows={2} className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-primary transition-colors resize-none" />
                  </div>
                </>
              )}

              <button onClick={() => navigate('/meu-perfil/editar')}
                className="flex items-center gap-2 text-xs text-muted hover:text-primary transition-colors">
                <RefreshCw className="w-3.5 h-3.5" /> Recarregar dados do perfil
              </button>
            </div>
          </div>

          {/* ── PAINEL DIREITO: preview ── */}
          <div className="space-y-4">
            {/* Botões mobile */}
            <div className="flex gap-3 sm:hidden">
              <button onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-surface border border-border text-sm font-semibold text-white rounded-xl">
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
              <button onClick={handleDownload} disabled={downloading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-background text-sm font-bold rounded-xl disabled:opacity-60">
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {downloading ? 'Gerando...' : 'Baixar PNG'}
              </button>
            </div>

            {/* Canvas preview */}
            <div className="bg-surface border border-border rounded-2xl p-6 flex items-start justify-center overflow-hidden">
              <div style={{ width: dim.w * dim.scale, height: dim.h * dim.scale, flexShrink: 0, position: 'relative' }}>
                <div style={{ transform: `scale(${dim.scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
                  <div ref={canvasRef}>
                    <AdCanvas template={template} cfg={cfg} dim={dim} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-muted">Formato: <span className="text-white font-semibold">{dim.label}</span></p>
              <p className="text-xs text-muted">Template: <span className="text-white font-semibold">{TEMPLATES.find(t => t.id === template)?.label}</span></p>
            </div>

            {/* Dica de uso */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <p className="text-xs text-primary font-semibold mb-1">💡 Como usar</p>
              <ul className="text-xs text-muted space-y-1">
                <li>• Baixe o PNG e publique diretamente no Instagram, WhatsApp ou Facebook</li>
                <li>• Todos os templates já incluem o link <strong className="text-white">servicoflix.com</strong></li>
                <li>• Para atualizar sua foto, edite seu perfil e recarregue esta página</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
