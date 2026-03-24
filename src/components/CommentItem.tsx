import { useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, Trash2, Loader2 } from 'lucide-react'
import { UserAvatar } from '@/components/UserAvatar'
import type { MediaComment } from '@/types'

interface Props {
  comment: MediaComment
  currentUserId?: string       // uid do usuário logado
  providerId?: string          // uid do dono do portfólio
  onDelete: (commentId: string) => Promise<void>
  onToggleLike: (commentId: string, userId: string) => Promise<void>
}

const formatDate = (createdAt: any): string => {
  if (!createdAt) return ''
  const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt)
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export const CommentItem = ({
  comment,
  currentUserId,
  providerId,
  onDelete,
  onToggleLike,
}: Props) => {
  const [loadingLike, setLoadingLike] = useState(false)
  const [loadingDelete, setLoadingDelete] = useState(false)

  const isOwner = currentUserId === comment.userId
  const isProviderOwner = currentUserId === providerId
  const canDelete = isOwner || isProviderOwner
  const hasLiked = currentUserId ? (comment.likedBy ?? []).includes(currentUserId) : false

  const handleLike = async () => {
    if (!currentUserId || loadingLike) return
    setLoadingLike(true)
    try {
      await onToggleLike(comment.id, currentUserId)
    } finally {
      setLoadingLike(false)
    }
  }

  const handleDelete = async () => {
    if (loadingDelete) return
    setLoadingDelete(true)
    try {
      await onDelete(comment.id)
    } finally {
      setLoadingDelete(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="flex items-start gap-3 group"
    >
      <UserAvatar src={comment.userAvatar} name={comment.userName} size={32} />

      <div className="flex-1 min-w-0">
        <div className="bg-surface border border-border rounded-xl px-3 py-2">
          <p className="text-white text-xs font-semibold mb-0.5">{comment.userName}</p>
          <p className="text-muted text-sm leading-relaxed break-words">{comment.text}</p>
        </div>

        <div className="flex items-center gap-3 mt-1 ml-1">
          <span className="text-[11px] text-muted/60">{formatDate(comment.createdAt)}</span>

          {/* Curtir */}
          <button
            onClick={handleLike}
            disabled={!currentUserId || loadingLike}
            className="flex items-center gap-1 text-[11px] text-muted/60 hover:text-red-400 transition-colors disabled:opacity-40"
          >
            {loadingLike ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Heart
                className="w-3 h-3"
                fill={hasLiked ? 'currentColor' : 'none'}
                style={{ color: hasLiked ? '#f87171' : undefined }}
              />
            )}
            {comment.likes > 0 && <span>{comment.likes}</span>}
          </button>

          {/* Deletar */}
          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={loadingDelete}
              className="flex items-center gap-1 text-[11px] text-muted/60 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-40"
            >
              {loadingDelete ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Trash2 className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
