import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, X, Loader2 } from 'lucide-react'
import { useGeoLocation } from '@/hooks/useGeoLocation'

export const LocationPermissionBanner = () => {
  const [show, setShow] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const { location, detectLocation } = useGeoLocation()

  useEffect(() => {
    // Mostra banner apenas se:
    // 1. Usuário nunca foi perguntado
    // 2. Está usando cidade padrão
    const hasPrompted = localStorage.getItem('geoLocationPrompted')
    const hasDismissed = localStorage.getItem('geoLocationBannerDismissed')
    
    if (!hasPrompted && !hasDismissed && location?.method === 'default') {
      // Mostra após 2 segundos para não ser intrusivo
      const timer = setTimeout(() => {
        setShow(true)
      }, 2000)
      
      return () => clearTimeout(timer)
    }
  }, [location])

  const handleAllow = async () => {
    setDetecting(true)
    localStorage.setItem('geoLocationPrompted', 'true')
    await detectLocation()
    setDetecting(false)
    setShow(false)
  }

  const handleDismiss = () => {
    setShow(false)
    localStorage.setItem('geoLocationPrompted', 'true')
    localStorage.setItem('geoLocationBannerDismissed', 'true')
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md"
        >
          <div className="bg-surface border-2 border-primary/30 rounded-xl shadow-2xl shadow-black/50 p-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              {/* Ícone */}
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center shrink-0">
                {detecting ? (
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                ) : (
                  <MapPin className="w-6 h-6 text-primary" />
                )}
              </div>

              {/* Conteúdo */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-white mb-1">
                  {detecting ? 'Detectando sua localização...' : 'Encontre serviços perto de você'}
                </h3>
                {!detecting && (
                  <>
                    <p className="text-xs sm:text-sm text-muted mb-3">
                      Permita o acesso à sua localização para ver prestadores da sua cidade automaticamente
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAllow}
                        className="flex-1 px-4 py-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-dark transition-colors"
                      >
                        Permitir localização
                      </button>
                      <button
                        onClick={handleDismiss}
                        className="px-4 py-2 bg-background border border-border text-muted text-sm font-semibold rounded-lg hover:text-white transition-colors"
                      >
                        Agora não
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Botão fechar */}
              {!detecting && (
                <button
                  onClick={handleDismiss}
                  className="p-1 text-muted hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
