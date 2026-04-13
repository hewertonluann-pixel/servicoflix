import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Star, MapPin, Clock, ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Provider } from '@/types'

interface Props {
  providers: Provider[]
}

export const HeroBillboard = ({ providers }: Props) => {
  const featured = providers.filter(p => p.isFeatured)
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent(prev => (prev + 1) % featured.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [featured.length])

  const provider = featured[current]
  if (!provider) return null

  return (
    <div className="relative w-full h-[85vh] min-h-[560px] overflow-hidden">
      {/* Background imagem com transição */}
      <AnimatePresence mode="wait">
        <motion.div
          key={provider.id}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
        >
          <img
            src={provider.coverImage}
            alt={provider.name}
            className="w-full h-full object-cover"
          />
          {/* Gradientes */}
          <div className="absolute inset-0 bg-gradient-hero" />
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Conteúdo */}
      <div className="relative z-10 h-full flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 w-full pt-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={provider.id}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.6 }}
              className="max-w-xl"
            >
              {/* Badge online */}
              {provider.isOnline && (
                <motion.div
                  className="inline-flex items-center gap-2 bg-primary/20 border border-primary/40 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-4"
                  animate={{ opacity: [1, 0.6, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <span className="w-2 h-2 bg-primary rounded-full" />
                  Disponível agora
                </motion.div>
              )}

              {/* Nome */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-3 leading-tight">
                {provider.name}
              </h1>

              {/* Especialidade */}
              <p className="text-primary font-semibold text-lg mb-4">{provider.specialty}</p>

              {/* Infos */}
              <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-muted">
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-white font-bold">{provider.rating}</span>
                  <span>({provider.reviewCount} avaliações)</span>
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {provider.neighborhood}, {provider.city}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Responde em {provider.responseTime}
                </span>
              </div>

              {/* Bio */}
              <p className="text-muted text-sm leading-relaxed mb-8 max-w-md">
                {provider.bio}
              </p>

              {/* Botões */}
              <div className="flex flex-wrap gap-3">
                <Link to={`/profissional/${provider.id}`}>
                  <motion.button
                    className="flex items-center gap-2 bg-primary text-background font-bold px-6 py-3 rounded-xl hover:bg-primary-dark transition-colors"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Play className="w-5 h-5" fill="currentColor" />
                    Ver agora
                  </motion.button>
                </Link>
                <Link to={`/profissional/${provider.id}`}>
                  <motion.button
                    className="flex items-center gap-2 bg-white/10 backdrop-blur text-white font-bold px-6 py-3 rounded-xl hover:bg-white/20 transition-colors border border-white/20"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Ver Perfil
                  </motion.button>
                </Link>
              </div>

              {/* Preço base */}
              <p className="mt-4 text-sm text-muted">
                A partir de <span className="text-white font-bold">R$ {provider.priceFrom}</span>
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Indicadores */}
      <div className="absolute bottom-16 right-8 z-10 flex gap-2">
        {featured.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === current ? 'w-8 bg-primary' : 'w-4 bg-white/30'
            }`}
          />
        ))}
      </div>

      {/* Scroll hint */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-muted flex flex-col items-center gap-1"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <span className="text-xs">Role para explorar</span>
        <ChevronDown className="w-4 h-4" />
      </motion.div>
    </div>
  )
}
