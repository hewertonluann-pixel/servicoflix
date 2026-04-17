import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Star, MapPin, Clock, ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Provider } from '@/types'

interface Props {
  providers: Provider[]
}

const TEXT_SHADOW = { textShadow: '0 2px 12px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.9)' }
const TEXT_SHADOW_SM = { textShadow: '0 1px 8px rgba(0,0,0,0.8), 0 1px 3px rgba(0,0,0,0.9)' }

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
    <>
      {/* ── MOBILE HERO (compacto) ── */}
      <div className="md:hidden relative w-full h-[220px] overflow-hidden rounded-b-3xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={provider.id + '-mobile'}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <img
              src={provider.coverImage}
              alt={provider.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
          </motion.div>
        </AnimatePresence>

        <div className="relative z-10 h-full flex flex-col justify-end px-4 pb-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={provider.id + '-mobile-content'}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              {provider.isOnline && (
                <motion.div
                  className="inline-flex items-center gap-1.5 bg-primary/20 border border-primary/40 text-primary text-[10px] font-bold px-2.5 py-1 rounded-full mb-2"
                  animate={{ opacity: [1, 0.6, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Disponível agora
                </motion.div>
              )}
              <h2 className="text-white text-xl font-black leading-tight mb-1" style={TEXT_SHADOW}>
                {provider.name}
              </h2>
              <p className="text-primary text-xs font-semibold mb-2" style={TEXT_SHADOW_SM}>
                {provider.specialty}
              </p>
              <div className="flex items-center gap-3 mb-3" style={TEXT_SHADOW_SM}>
                <span className="flex items-center gap-1 text-xs text-white">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <span className="font-bold">{provider.rating}</span>
                  <span className="text-muted">({provider.reviewCount})</span>
                </span>
                <span className="flex items-center gap-1 text-xs text-muted">
                  <MapPin className="w-3 h-3" />
                  {provider.city}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Link to={`/profissional/${provider.id}`}>
                  <motion.button
                    className="flex items-center gap-1.5 bg-primary text-background font-bold text-xs px-4 py-2 rounded-xl"
                    whileTap={{ scale: 0.95 }}
                  >
                    <Play className="w-3 h-3" fill="currentColor" />
                    Ver agora
                  </motion.button>
                </Link>
                <Link to={`/profissional/${provider.id}`}>
                  <motion.button
                    className="flex items-center gap-1.5 bg-white/10 text-white font-bold text-xs px-4 py-2 rounded-xl border border-white/20"
                    whileTap={{ scale: 0.95 }}
                  >
                    Perfil
                  </motion.button>
                </Link>
                <span className="ml-auto text-xs text-muted" style={TEXT_SHADOW_SM}>
                  A partir de <span className="text-white font-bold">R$ {provider.priceFrom}</span>
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Indicadores mobile */}
        <div className="absolute bottom-3 right-3 z-10 flex gap-1.5">
          {featured.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === current ? 'w-6 bg-primary' : 'w-3 bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>

      {/* ── DESKTOP HERO (original, sem alteração) ── */}
      <div className="hidden md:block relative w-full h-[85vh] min-h-[560px] overflow-hidden">
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
            <div className="absolute inset-0 bg-gradient-hero" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />
          </motion.div>
        </AnimatePresence>

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
                {provider.isOnline && (
                  <motion.div
                    className="inline-flex items-center gap-2 bg-primary/20 border border-primary/40 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-4"
                    animate={{ opacity: [1, 0.6, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={TEXT_SHADOW_SM}
                  >
                    <span className="w-2 h-2 bg-primary rounded-full" />
                    Disponível agora
                  </motion.div>
                )}
                <h1
                  className="text-4xl sm:text-5xl lg:text-6xl font-black mb-3 leading-tight"
                  style={TEXT_SHADOW}
                >
                  {provider.name}
                </h1>
                <p className="text-primary font-semibold text-lg mb-4" style={TEXT_SHADOW_SM}>
                  {provider.specialty}
                </p>
                <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-muted" style={TEXT_SHADOW_SM}>
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
                <p className="text-muted text-sm leading-relaxed mb-8 max-w-md" style={TEXT_SHADOW_SM}>
                  {provider.bio}
                </p>
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
                <p className="mt-4 text-sm text-muted" style={TEXT_SHADOW_SM}>
                  A partir de <span className="text-white font-bold">R$ {provider.priceFrom}</span>
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

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

        <motion.div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-muted flex flex-col items-center gap-1"
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-xs">Role para explorar</span>
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </div>
    </>
  )
}
