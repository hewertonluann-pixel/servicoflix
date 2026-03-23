import { Star } from 'lucide-react'
import { RatingDistribution as RatingDist } from '@/hooks/useReviews'

interface Props {
  average: number
  total: number
  distribution: RatingDist
}

export const RatingDistribution = ({ average, total, distribution }: Props) => (
  <div className="flex gap-6 items-center">
    {/* Nota média */}
    <div className="text-center shrink-0">
      <p className="text-5xl font-black text-white leading-none">{average.toFixed(1)}</p>
      <div className="flex items-center justify-center gap-0.5 mt-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className="w-3.5 h-3.5 text-yellow-400"
            fill={star <= Math.round(average) ? 'currentColor' : 'none'}
          />
        ))}
      </div>
      <p className="text-xs text-muted mt-1">{total} avaliações</p>
    </div>

    {/* Barras por estrela */}
    <div className="flex-1 space-y-1.5">
      {([5, 4, 3, 2, 1] as const).map((star) => (
        <div key={star} className="flex items-center gap-2">
          <span className="text-xs text-muted w-3 shrink-0">{star}</span>
          <Star className="w-3 h-3 text-yellow-400 shrink-0" fill="currentColor" />
          <div className="flex-1 h-1.5 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-400 rounded-full transition-all duration-500"
              style={{ width: `${distribution[star]}%` }}
            />
          </div>
          <span className="text-xs text-muted w-8 text-right shrink-0">
            {distribution[star]}%
          </span>
        </div>
      ))}
    </div>
  </div>
)
