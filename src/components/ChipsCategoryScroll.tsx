import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'

interface Category {
  id: string
  name: string
  icon: string
}

interface Props {
  categories: Category[]
}

export const ChipsCategoryScroll = ({ categories }: Props) => {
  const [searchParams] = useSearchParams()
  const activeCategory = searchParams.get('categoria')

  return (
    <div className="md:hidden mb-4">
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="text-white font-bold text-sm">Categorias</h2>
        <Link
          to="/buscar"
          className="text-primary text-xs font-semibold"
        >
          Ver todas
        </Link>
      </div>
      <div
        className="flex gap-2 overflow-x-auto px-4 pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {categories.map((cat, i) => {
          const active = activeCategory === cat.id
          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              whileTap={{ scale: 0.95 }}
              className="flex-shrink-0"
            >
              <Link
                to={`/buscar?categoria=${cat.id}`}
                className={`flex flex-col items-center gap-1.5 w-[68px] py-2.5 px-1 rounded-2xl border transition-all ${
                  active
                    ? 'bg-primary/15 border-primary/50'
                    : 'bg-surface border-border'
                }`}
              >
                <span className="text-2xl leading-none">{cat.icon}</span>
                <span
                  className={`text-[10px] font-semibold text-center leading-tight ${
                    active ? 'text-primary' : 'text-muted'
                  }`}
                >
                  {cat.name}
                </span>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
