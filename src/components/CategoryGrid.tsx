import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Category } from '@/types'

interface Props {
  categories: Category[]
}

export const CategoryGrid = ({ categories }: Props) => (
  <div className="px-4 sm:px-8 mb-12">
    <h2 className="text-white font-bold text-lg mb-4">Explorar por Categoria</h2>
    <div className="flex flex-wrap gap-2">
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-border hover:border-opacity-60 transition-all text-sm font-semibold text-white whitespace-nowrap"
            style={{ '--hover-color': cat.color } as React.CSSProperties}
          >
            <span className="text-base">{cat.icon}</span>
            <span>{cat.name}</span>
          </Link>
        </motion.div>
      ))}
    </div>
  </div>
)
