import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface ProgressiveImageProps {
  src: string
  alt: string
  className?: string
  onClick?: () => void
  lowQualityPlaceholder?: string
}

/**
 * Gera URL de thumbnail de baixa qualidade a partir da URL original
 * Suporta URLs do Unsplash e outras que aceitam parâmetros de redimensionamento
 */
const getThumbnailUrl = (originalUrl: string): string => {
  try {
    const url = new URL(originalUrl)
    
    // Unsplash: muda parâmetros de qualidade
    if (url.hostname.includes('unsplash.com') || url.hostname.includes('images.unsplash.com')) {
      url.searchParams.set('w', '50')  // Largura mínima
      url.searchParams.set('q', '10')   // Qualidade baixa
      url.searchParams.set('blur', '10') // Adiciona blur nativo
      return url.toString()
    }
    
    // Firebase Storage: adiciona sufixo de tamanho
    if (url.hostname.includes('firebasestorage.googleapis.com')) {
      // Firebase não suporta redimensionamento dinâmico por URL
      // Retorna a mesma URL (pode ser otimizado com Cloud Functions)
      return originalUrl
    }
    
    // Imgur: adiciona sufixo de thumbnail
    if (url.hostname.includes('imgur.com')) {
      const path = url.pathname
      const ext = path.substring(path.lastIndexOf('.'))
      const pathWithoutExt = path.substring(0, path.lastIndexOf('.'))
      url.pathname = pathWithoutExt + 't' + ext  // 't' = thumbnail (160x160)
      return url.toString()
    }
    
    // Outras URLs: retorna original (sem otimização)
    return originalUrl
  } catch {
    return originalUrl
  }
}

export const ProgressiveImage = ({
  src,
  alt,
  className = '',
  onClick,
  lowQualityPlaceholder
}: ProgressiveImageProps) => {
  const [currentSrc, setCurrentSrc] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInView, setIsInView] = useState(false)
  const imgRef = useRef<HTMLDivElement>(null)

  // Lazy loading: só carrega quando a imagem entra no viewport
  useEffect(() => {
    if (!imgRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: '50px', // Começa a carregar 50px antes de entrar na tela
      }
    )

    observer.observe(imgRef.current)

    return () => observer.disconnect()
  }, [])

  // Carrega thumbnail blur primeiro, depois a imagem HD
  useEffect(() => {
    if (!isInView) return

    const thumbnailUrl = lowQualityPlaceholder || getThumbnailUrl(src)
    
    // Fase 1: Carrega thumbnail de baixa qualidade
    const thumbnailImg = new Image()
    thumbnailImg.src = thumbnailUrl
    
    thumbnailImg.onload = () => {
      setCurrentSrc(thumbnailUrl)
      
      // Fase 2: Carrega imagem HD em background
      const hdImg = new Image()
      hdImg.src = src
      
      hdImg.onload = () => {
        // Pequeno delay para transição suave
        setTimeout(() => {
          setCurrentSrc(src)
          setIsLoading(false)
        }, 100)
      }
      
      hdImg.onerror = () => {
        // Se HD falhar, mantém thumbnail
        setIsLoading(false)
      }
    }
    
    thumbnailImg.onerror = () => {
      // Se thumbnail falhar, carrega HD direto
      const hdImg = new Image()
      hdImg.src = src
      hdImg.onload = () => {
        setCurrentSrc(src)
        setIsLoading(false)
      }
      hdImg.onerror = () => setIsLoading(false)
    }
  }, [isInView, src, lowQualityPlaceholder])

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`} onClick={onClick}>
      {/* Placeholder cinza enquanto carrega */}
      {!currentSrc && (
        <div className="absolute inset-0 bg-gradient-to-br from-surface to-background animate-pulse" />
      )}
      
      {/* Imagem com blur-up effect */}
      {currentSrc && (
        <motion.img
          src={currentSrc}
          alt={alt}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className={`w-full h-full object-cover ${
            isLoading && currentSrc !== src ? 'blur-md scale-105' : ''
          }`}
          style={{
            transition: isLoading ? 'none' : 'filter 0.3s ease-out, transform 0.3s ease-out'
          }}
        />
      )}
      
      {/* Loading spinner opcional */}
      {isLoading && currentSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}
