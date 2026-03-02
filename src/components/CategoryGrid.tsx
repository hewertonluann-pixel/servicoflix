import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Category } from '@/types'

interface Props {
  categories: Category[]
}

export const CategoryGrid = ({ categories }: Props) => (
  <div className="px-4 sm:px-8 mb-12">
    <h2 className="text-white font-bold text-lg mb-4">Explorar por Categoria</h2>
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {categories.map((cat, i) => (
        <motion.div
          key={cat.id}
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.05 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
        >
          <Link
            to={`/buscar?categoria=${cat.id}`}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface border border-border hover:border-opacity-60 transition-all text-center"
            style={{ '--hover-color': cat.color } as React.CSSProperties}
          >
            <span className="text-3xl">{cat.icon}</span>
            <span className="text-xs font-semibold text-white">{cat.name}</span>
            <span className="text-[10px] text-muted">{cat.count} profissionais</span>
          </Link>
        </motion.div>
      ))}
    </div>
  </div>
)
