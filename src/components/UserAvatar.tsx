/**
 * Componente universal de avatar.
 * Hierarquia de fallback:
 *   1. Foto (src) — manual ou Google
 *   2. Logo do site (⚡ Zap em bg-primary)
 */
import { Zap } from 'lucide-react'

interface UserAvatarProps {
  src?: string | null
  name?: string | null
  size?: number        // px, default 40
  className?: string
}

export const UserAvatar = ({
  src,
  name,
  size = 40,
  className = '',
}: UserAvatarProps) => {
  const iconSize = Math.round(size * 0.45)
  const style = { width: size, height: size }

  const logo = (
    <div
      className={`shrink-0 rounded-full bg-primary flex items-center justify-center ${className}`}
      style={style}
    >
      <Zap
        className="text-background"
        style={{ width: iconSize, height: iconSize }}
        fill="currentColor"
      />
    </div>
  )

  if (!src) return logo

  return (
    <div
      className={`shrink-0 rounded-full overflow-hidden bg-surface border border-border flex items-center justify-center ${className}`}
      style={style}
    >
      <img
        src={src}
        alt={name || 'avatar'}
        className="w-full h-full object-cover"
        onError={(e) => {
          // Imagem quebrou: substitui pelo logo
          const parent = e.currentTarget.parentElement
          if (!parent) return
          parent.innerHTML = ''
          parent.className = `shrink-0 rounded-full bg-primary flex items-center justify-center ${className}`
          const zap = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
          zap.setAttribute('viewBox', '0 0 24 24')
          zap.setAttribute('fill', 'currentColor')
          zap.setAttribute('width', String(iconSize))
          zap.setAttribute('height', String(iconSize))
          zap.style.color = 'var(--color-background, #0a0a0a)'
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
          path.setAttribute('d', 'M13 2L3 14h9l-1 8 10-12h-9l1-8z')
          zap.appendChild(path)
          parent.appendChild(zap)
        }}
      />
    </div>
  )
}
