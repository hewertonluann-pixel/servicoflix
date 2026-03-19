/**
 * Componente universal de avatar.
 * Hierarquia de fallback:
 *   1. Foto (src) — manual ou Google
 *   2. Iniciais do nome (se name fornecido)
 *   3. Logo do site (⚡ Zap em bg-primary) — último recurso
 */
import { Zap } from 'lucide-react'

interface UserAvatarProps {
  src?: string | null
  name?: string | null
  size?: number        // px, default 40
  className?: string
  showInitials?: boolean // default true
}

export const UserAvatar = ({
  src,
  name,
  size = 40,
  className = '',
  showInitials = true,
}: UserAvatarProps) => {
  const initial = name?.trim()?.charAt(0)?.toUpperCase() || ''
  const fontSize = Math.round(size * 0.35)
  const iconSize = Math.round(size * 0.45)

  const base = `shrink-0 rounded-full overflow-hidden bg-surface border border-border flex items-center justify-center`
  const style = { width: size, height: size }

  if (src) {
    return (
      <div className={`${base} ${className}`} style={style}>
        <img
          src={src}
          alt={name || 'avatar'}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Se a imagem falhar, remove src e mostra fallback
            e.currentTarget.style.display = 'none'
          }}
        />
      </div>
    )
  }

  if (showInitials && initial) {
    return (
      <div className={`${base} ${className}`} style={style}>
        <span className="font-black text-muted" style={{ fontSize }}>{initial}</span>
      </div>
    )
  }

  // Último recurso: logo do ServiçoFlix
  return (
    <div
      className={`shrink-0 rounded-full overflow-hidden bg-primary flex items-center justify-center ${className}`}
      style={style}
    >
      <Zap
        className="text-background"
        style={{ width: iconSize, height: iconSize }}
        fill="currentColor"
      />
    </div>
  )
}
