import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, MapPin, Clock, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { UserAvatar } from './UserAvatar'
import { useUserPresence } from '@/hooks/usePresence'

interface Provider {
  id: string
  name: string
  avatar: string
  coverImage?: string
  specialty: string
  rating: number
  reviewCount: number
  priceFrom: number
  city?: string
  neighborhood: string
  isOnline?: boolean
  isTopRated?: boolean
  completedJobs: number
  responseTime: string
  isMock?: boolean
}

interface Props {
  provider: Provider
  index?: number
}

export const ProviderCard = ({ provider, index = 0 }: Props) => {
  const [hovered, setHovered] = useState(false)
    const { isOnline } = useUserPresence(provider.isMock ? null : provider.id)

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
        <motion.div
          className="relative rounded-xl overflow-hidden bg-surface border border-border"
          animate={hovered ? { scale: 1.08, zIndex: 10, y: -8 } : { scale: 1, zIndex: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {/* Capa */}
          <div className="relative h-28 sm:h-32">
            <img
              src={provider.coverImage || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=80'}
              alt={provider.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-card" />

            {/* Faixa EXEMPLO */}
            {provider.isMock && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 20 }}>
                <div style={{
                  position: 'absolute', top: 12, right: -28, width: 110,
                  transform: 'rotate(35deg)', backgroundColor: '#DC2626', color: 'white',
                  fontSize: 9, fontWeight: 900, textAlign: 'center', padding: '3px 0',
                  letterSpacing: '0.1em', textTransform: 'uppercase', boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
                }}>Exemplo</div>
              </div>
            )}

            {isOnline && (
              <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-primary text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ zIndex: 10 }}>
                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                Online
              </div>
            )}

            {provider.isTopRated && !provider.isMock && (
              <div className="absolute top-2 right-2 bg-yellow-500/90 text-black text-[10px] font-black px-2 py-0.5 rounded-full" style={{ zIndex: 10 }}>TOP</div>
            )}

            {/* Avatar com UserAvatar */}
            <div className="absolute -bottom-4 left-3">
              <UserAvatar
                src={provider.avatar}
                name={provider.name}
                size={40}
                className={`border-2 ${
                  provider.isMock ? 'border-red-600/60 grayscale-[30%]' : 'border-surface'
                }`}
              />
            </div>
          </div>

          {/* Info */}
          <div className="pt-6 pb-3 px-3">
            <p className={`text-xs font-bold truncate ${ provider.isMock ? 'text-white/70' : 'text-white' }`}>{provider.name}</p>
            <p className="text-muted text-[11px] truncate">{provider.specialty}</p>
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-white text-[11px] font-semibold">{provider.rating}</span>
              <span className="text-muted text-[10px]">({provider.reviewCount})</span>
              {provider.isMock && <span className="ml-auto text-[9px] text-red-400 font-bold">exemplo</span>}
            </div>
          </div>

          {/* Hover */}
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
                  {provider.isMock && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-2 py-1.5 text-center">
                      <p className="text-red-400 text-[10px] font-bold">⚠️ Perfil de Exemplo</p>
                      <p className="text-red-300/70 text-[9px] mt-0.5">Será substituído por um real</p>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-[11px] text-muted">
                    <MapPin className="w-3 h-3" />
                    {provider.neighborhood}{provider.city ? `, ${provider.city}` : ''}
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
                    className={`w-full text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 ${
                      provider.isMock
                        ? 'bg-surface border border-border text-muted cursor-default'
                        : 'bg-primary text-background'
                    }`}
                    whileHover={provider.isMock ? {} : { scale: 1.02 }}
                    whileTap={provider.isMock ? {} : { scale: 0.98 }}
                  >
                    {provider.isMock ? '— Perfil de Exemplo —' : <><Zap className="w-3 h-3" fill="currentColor" /> Ver perfil</>}
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
