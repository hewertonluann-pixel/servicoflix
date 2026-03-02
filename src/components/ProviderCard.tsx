import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, MapPin, Clock, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Provider } from '@/types'

interface Props {
  provider: Provider
  index?: number
}

export const ProviderCard = ({ provider, index = 0 }: Props) => {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="relative shrink-0 w-44 sm:w-52 cursor-pointer group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link to={`/profissional/${provider.id}`}>
        {/* Card base */}
        <motion.div
          className="relative rounded-xl overflow-hidden bg-surface border border-border"
          animate={hovered ? { scale: 1.08, zIndex: 10, y: -8 } : { scale: 1, zIndex: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {/* Imagem de capa */}
          <div className="relative h-28 sm:h-32">
            <img
              src={provider.coverImage}
              alt={provider.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-card" />

            {/* Badge online */}
            {provider.isOnline && (
              <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                Online
              </div>
            )}

            {/* Top rated */}
            {provider.isTopRated && (
              <div className="absolute top-2 right-2 bg-yellow-500/90 text-black text-[10px] font-black px-2 py-0.5 rounded-full">
                TOP
              </div>
            )}

            {/* Avatar */}
            <div className="absolute -bottom-4 left-3">
              <img
                src={provider.avatar}
                alt={provider.name}
                className="w-10 h-10 rounded-full border-2 border-surface object-cover"
              />
            </div>
          </div>

          {/* Info base */}
          <div className="pt-6 pb-3 px-3">
            <p className="text-white text-xs font-bold truncate">{provider.name}</p>
            <p className="text-muted text-[11px] truncate">{provider.specialty}</p>
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-white text-[11px] font-semibold">{provider.rating}</span>
              <span className="text-muted text-[10px]">({provider.reviewCount})</span>
            </div>
          </div>

          {/* Expanded hover info */}
          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-t border-border"
              >
                <div className="px-3 py-3 space-y-2">
                  <div className="flex items-center gap-1 text-[11px] text-muted">
                    <MapPin className="w-3 h-3" />
                    {provider.neighborhood}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-muted">
                    <Clock className="w-3 h-3" />
                    {provider.responseTime}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted">{provider.completedJobs} serviços</span>
                    <span className="text-primary text-xs font-bold">R$ {provider.priceFrom}+</span>
                  </div>
                  <motion.button
                    className="w-full bg-primary text-background text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Zap className="w-3 h-3" fill="currentColor" />
                    Contratar
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </Link>
    </motion.div>
  )
}
