/**
 * Componente universal de avatar.
 * Hierarquia de fallback:
 *   1. Foto real (src) — manual ou Google
 *   2. ⚡ Logo ServiçoFlix (Zap em bg-primary) — direto, sem iniciais
 *
 * Usa useState para controlar falha de carregamento de imagem,
 * evitando manipulação direta do DOM (onError frágil).
 */
import { useState, useEffect } from 'react'
import { Zap } from 'lucide-react'

interface UserAvatarProps {
  src?: string | null
  name?: string | null
  size?: number
  className?: string
}

export const UserAvatar = ({
  src,
  name,
  size = 40,
  className = '',
}: UserAvatarProps) => {
  const [imgError, setImgError] = useState(false)

  // Se o src mudar (ex: Firestore atualizou), tenta de novo
  useEffect(() => {
    setImgError(false)
  }, [src])

  const iconSize = Math.round(size * 0.45)
  const style = { width: size, height: size }

  const hasValidSrc = src && src.trim() !== ''

  if (hasValidSrc && !imgError) {
    return (
      <div
        className={`shrink-0 rounded-full overflow-hidden bg-surface border border-border flex items-center justify-center ${className}`}
        style={style}
      >
        <img
          src={src!}
          alt={name || 'avatar'}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  // Fallback: logo ⚡
  return (
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
}
