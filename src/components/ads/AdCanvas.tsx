import { forwardRef } from 'react'

export type AdFormat = 'outdoor' | 'post' | 'stories'
export type AdTemplate = 'dark-destaque' | 'verde-urgencia' | 'minimalista' | 'profissional-mes'

export interface AdConfig {
  format: AdFormat
  template: AdTemplate
  headline: string
  subtext: string
  cta: string
  accent: string
  showLogo: boolean
  providerName?: string
  providerSpecialty?: string
  providerCity?: string
  providerAvatar?: string
  providerRating?: string
}

const FORMAT_DIMS: Record<AdFormat, { w: number; h: number; scale: number }> = {
  outdoor:  { w: 1200, h: 628,  scale: 0.45 },
  post:     { w: 1080, h: 1080, scale: 0.38 },
  stories:  { w: 1080, h: 1920, scale: 0.22 },
}

// ── Template: Dark Destaque ──────────────────────────────────────────────────
function TemplateDarkDestaque({ cfg, w, h }: { cfg: AdConfig; w: number; h: number }) {
  const isStory = cfg.format === 'stories'
  return (
    <div
      style={{
        width: w, height: h,
        background: 'linear-gradient(135deg, #0a0f0a 60%, #0d1f14 100%)',
        display: 'flex', flexDirection: isStory ? 'column' : 'row',
        alignItems: 'center', justifyContent: 'space-between',
        padding: isStory ? '80px 60px' : '0 80px',
        gap: 40, boxSizing: 'border-box', position: 'relative', overflow: 'hidden',
        fontFamily: 'Inter, Arial, sans-serif',
      }}
    >
      {/* Glow decorativo */}
      <div style={{
        position: 'absolute', top: -120, right: -120,
        width: 400, height: 400, borderRadius: '50%',
        background: `radial-gradient(circle, ${cfg.accent}22 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Coluna esquerda */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20, zIndex: 1 }}>
        {/* Logo */}
        {cfg.showLogo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 44, height: 44, background: cfg.accent,
              borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: 22, color: '#0a0f0a',
            }}>S</div>
            <span style={{ fontWeight: 900, fontSize: 22, color: '#fff' }}>
              Serviço<span style={{ color: cfg.accent }}>Flix</span>
            </span>
          </div>
        )}

        {/* Headline */}
        <h1 style={{
          margin: 0, color: '#fff', fontWeight: 900,
          fontSize: cfg.format === 'outdoor' ? 52 : cfg.format === 'stories' ? 64 : 56,
          lineHeight: 1.1,
        }}>{cfg.headline}</h1>

        {/* Subtext */}
        <p style={{
          margin: 0, color: '#94a3b8', fontSize: cfg.format === 'outdoor' ? 22 : 24,
          lineHeight: 1.5, maxWidth: 480,
        }}>{cfg.subtext}</p>

        {/* CTA */}
        <div style={{
          display: 'inline-flex', alignItems: 'center',
          background: cfg.accent, color: '#0a0f0a',
          fontWeight: 900, fontSize: 18, borderRadius: 14,
          padding: '16px 32px', alignSelf: 'flex-start', marginTop: 8,
        }}>{cfg.cta} →</div>
      </div>

      {/* Card do profissional */}
      {cfg.providerName && (
        <div style={{
          background: '#141a14', border: `1.5px solid ${cfg.accent}44`,
          borderRadius: 20, padding: '28px 24px',
          display: 'flex', flexDirection: 'column', gap: 14,
          minWidth: cfg.format === 'outdoor' ? 280 : 260,
          zIndex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: '#1e3a2a', border: `2px solid ${cfg.accent}`,
              overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, color: '#fff', fontWeight: 900, flexShrink: 0,
            }}>
              {cfg.providerAvatar
                ? <img src={cfg.providerAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : cfg.providerName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 16 }}>{cfg.providerName}</p>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>{cfg.providerSpecialty}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#facc15', fontSize: 16 }}>★★★★★</span>
            <span style={{ color: cfg.accent, fontWeight: 700, fontSize: 14 }}>{cfg.providerRating || '5.0'}</span>
          </div>
          {cfg.providerCity && (
            <p style={{ margin: 0, color: '#94a3b8', fontSize: 12 }}>📍 {cfg.providerCity}</p>
          )}
          <div style={{
            background: `${cfg.accent}22`, border: `1px solid ${cfg.accent}44`,
            borderRadius: 8, padding: '8px 12px', textAlign: 'center',
            color: cfg.accent, fontWeight: 700, fontSize: 13,
          }}>✅ Verificado</div>
        </div>
      )}
    </div>
  )
}

// ── Template: Verde Urgência ─────────────────────────────────────────────────
function TemplateVerdeUrgencia({ cfg, w, h }: { cfg: AdConfig; w: number; h: number }) {
  return (
    <div style={{
      width: w, height: h,
      background: `linear-gradient(160deg, #052e16 0%, #064e3b 50%, #0a0f0a 100%)`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 60, boxSizing: 'border-box',
      fontFamily: 'Inter, Arial, sans-serif', gap: 28, textAlign: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `radial-gradient(${cfg.accent}18 1px, transparent 1px)`,
        backgroundSize: '32px 32px',
      }} />
      {cfg.showLogo && (
        <span style={{ fontWeight: 900, fontSize: 28, color: '#fff', zIndex: 1 }}>
          Serviço<span style={{ color: cfg.accent }}>Flix</span>
        </span>
      )}
      <h1 style={{
        margin: 0, color: '#fff', fontWeight: 900, zIndex: 1,
        fontSize: cfg.format === 'outdoor' ? 62 : 70, lineHeight: 1.05,
      }}>{cfg.headline}</h1>
      <p style={{ margin: 0, color: '#a7f3d0', fontSize: 24, lineHeight: 1.5, zIndex: 1, maxWidth: 600 }}>
        {cfg.subtext}
      </p>
      <div style={{
        background: cfg.accent, color: '#052e16', fontWeight: 900,
        fontSize: 22, borderRadius: 16, padding: '18px 48px', zIndex: 1,
      }}>{cfg.cta} →</div>
    </div>
  )
}

// ── Template: Minimalista ────────────────────────────────────────────────────
function TemplateMinimalista({ cfg, w, h }: { cfg: AdConfig; w: number; h: number }) {
  return (
    <div style={{
      width: w, height: h, background: '#0a0f0a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 60, boxSizing: 'border-box',
      fontFamily: 'Inter, Arial, sans-serif', gap: 20, textAlign: 'center',
      border: `3px solid ${cfg.accent}`,
    }}>
      {cfg.showLogo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <div style={{
            width: 52, height: 52, background: cfg.accent, borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 26, color: '#0a0f0a',
          }}>S</div>
          <span style={{ fontWeight: 900, fontSize: 36, color: '#fff' }}>
            Serviço<span style={{ color: cfg.accent }}>Flix</span>
          </span>
        </div>
      )}
      <h1 style={{
        margin: 0, color: '#fff', fontWeight: 900,
        fontSize: cfg.format === 'outdoor' ? 56 : 64, lineHeight: 1.1,
      }}>{cfg.headline}</h1>
      <p style={{ margin: 0, color: '#94a3b8', fontSize: 22, lineHeight: 1.5 }}>{cfg.subtext}</p>
      <div style={{
        marginTop: 16, border: `2px solid ${cfg.accent}`,
        color: cfg.accent, fontWeight: 900, fontSize: 18,
        borderRadius: 12, padding: '14px 36px',
      }}>{cfg.cta}</div>
      <p style={{ margin: 0, color: '#94a3b8', fontSize: 15, marginTop: 12 }}>servicoflix.com</p>
    </div>
  )
}

// ── Template: Profissional do Mês ────────────────────────────────────────────
function TemplateProfissionalMes({ cfg, w, h }: { cfg: AdConfig; w: number; h: number }) {
  return (
    <div style={{
      width: w, height: h,
      background: 'linear-gradient(180deg, #0a0f0a 0%, #0d1a0d 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 60, boxSizing: 'border-box',
      fontFamily: 'Inter, Arial, sans-serif', gap: 24, textAlign: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Badge topo */}
      <div style={{
        background: `${cfg.accent}22`, border: `1px solid ${cfg.accent}55`,
        borderRadius: 100, padding: '8px 24px',
        color: cfg.accent, fontWeight: 700, fontSize: 14, letterSpacing: 1,
      }}>⭐ PROFISSIONAL DO MÊS</div>

      {/* Avatar */}
      <div style={{
        width: 120, height: 120, borderRadius: '50%',
        border: `4px solid ${cfg.accent}`,
        background: '#1e3a2a', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 48, color: '#fff', fontWeight: 900,
      }}>
        {cfg.providerAvatar
          ? <img src={cfg.providerAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : (cfg.providerName?.charAt(0).toUpperCase() || '?')}
      </div>

      <div>
        <h1 style={{ margin: 0, color: '#fff', fontWeight: 900, fontSize: 42 }}>
          {cfg.providerName || cfg.headline}
        </h1>
        <p style={{ margin: '8px 0 0', color: cfg.accent, fontWeight: 600, fontSize: 20 }}>
          {cfg.providerSpecialty}
        </p>
        {cfg.providerCity && (
          <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: 16 }}>📍 {cfg.providerCity}</p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#facc15', fontSize: 28 }}>★★★★★</span>
        <span style={{ color: '#fff', fontWeight: 900, fontSize: 24 }}>{cfg.providerRating || '5.0'}</span>
      </div>

      <p style={{ margin: 0, color: '#94a3b8', fontSize: 18, maxWidth: 500 }}>{cfg.subtext}</p>

      {cfg.showLogo && (
        <span style={{ color: '#94a3b8', fontSize: 15, marginTop: 8 }}>
          Serviço<span style={{ color: cfg.accent }}>Flix</span> · servicoflix.com
        </span>
      )}
    </div>
  )
}

// ── AdCanvas principal ───────────────────────────────────────────────────────
const AdCanvas = forwardRef<HTMLDivElement, { config: AdConfig }>(({ config }, ref) => {
  const { w, h, scale } = FORMAT_DIMS[config.format]

  const inner = (() => {
    switch (config.template) {
      case 'verde-urgencia':   return <TemplateVerdeUrgencia  cfg={config} w={w} h={h} />
      case 'minimalista':      return <TemplateMinimalista     cfg={config} w={w} h={h} />
      case 'profissional-mes': return <TemplateProfissionalMes cfg={config} w={w} h={h} />
      default:                 return <TemplateDarkDestaque    cfg={config} w={w} h={h} />
    }
  })()

  return (
    <div style={{ transformOrigin: 'top left', transform: `scale(${scale})`, width: w, height: h }}>
      <div ref={ref} style={{ width: w, height: h }}>
        {inner}
      </div>
    </div>
  )
})

AdCanvas.displayName = 'AdCanvas'
export default AdCanvas
