import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usePrestadorStatus } from '@/hooks/usePrestadorStatus'

export function CreditoBadge() {
  const { diasScore, estaAtivo, estaExpirando, estaCritico, estaExpirado, temAssinatura, loading } = usePrestadorStatus()

  if (loading) return null

  // Assinante ativo não precisa do badge de dias
  if (temAssinatura && estaAtivo) return null

  return (
    <Link to="/comprar" title="Dias de acesso restantes">
      <motion.div
        className={`
          flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border cursor-pointer transition-all
          ${estaCritico
            ? 'bg-red-500/20 border-red-500/50 text-red-400'
            : estaExpirando
            ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
            : estaExpirado
            ? 'bg-red-600/30 border-red-600/50 text-red-300'
            : 'bg-primary/10 border-primary/30 text-primary'
          }
        `}
        animate={estaCritico || estaExpirando ? { opacity: [1, 0.6, 1] } : {}}
        transition={estaCritico ? { duration: 1.5, repeat: Infinity } : { duration: 2.5, repeat: Infinity }}
        whileHover={{ scale: 1.05 }}
      >
        <Zap className="w-3 h-3" fill="currentColor" />
        <span>
          {estaExpirado
            ? 'Expirado'
            : `${diasScore}`
          }
        </span>
      </motion.div>
    </Link>
  )
}
