import { useRef } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Provider } from '@/types'
import { ProviderCard } from './ProviderCard'

interface Props {
  title: string
  providers: Provider[]
  badge?: string
}

export const CategoryRow = ({ title, providers, badge }: Props) => {
  const ref = useRef<HTMLDivElement>(null)

  const scroll = (dir: 'left' | 'right') => {
    if (!ref.current) return
    ref.current.scrollBy({ left: dir === 'right' ? 300 : -300, behavior: 'smooth' })
  }

  if (!providers.length) return null

  return (
    <motion.div
      className="mb-10"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      {/* Título da linha */}
      <div className="flex items-center gap-3 px-4 sm:px-8 mb-4">
        <h2 className="text-white font-bold text-lg">{title}</h2>
        {badge && (
          <span className="bg-primary text-background text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
            {badge}
          </span>
        )}
      </div>

      {/* Carrossel */}
      <div className="relative group/row">
        {/* Botão esquerdo */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-full bg-gradient-to-r from-background to-transparent flex items-center justify-start pl-1 opacity-0 group-hover/row:opacity-100 transition-opacity"
        >
          <div className="w-8 h-8 bg-surface/80 backdrop-blur rounded-full flex items-center justify-center hover:bg-surface border border-border">
            <ChevronLeft className="w-4 h-4 text-white" />
          </div>
        </button>

        {/* Scroll container */}
        <div
          ref={ref}
          className="flex gap-3 px-4 sm:px-8 overflow-x-auto scroll-smooth-x py-4"
        >
          {providers.map((provider, i) => (
            <ProviderCard key={provider.id} provider={provider} index={i} />
          ))}
        </div>

        {/* Botão direito */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-full bg-gradient-to-l from-background to-transparent flex items-center justify-end pr-1 opacity-0 group-hover/row:opacity-100 transition-opacity"
        >
          <div className="w-8 h-8 bg-surface/80 backdrop-blur rounded-full flex items-center justify-center hover:bg-surface border border-border">
            <ChevronRight className="w-4 h-4 text-white" />
          </div>
        </button>
      </div>
    </motion.div>
  )
}
