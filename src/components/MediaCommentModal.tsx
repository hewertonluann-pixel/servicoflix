import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Play, Music, Image as ImageIcon } from 'lucide-react'
import { CommentSection } from '@/components/CommentSection'
import type { MediaItem } from '@/types'
import type { CommentUser } from '@/hooks/useComments'

interface Props {
  isOpen: boolean
  onClose: () => void
  item: MediaItem | null
  providerId: string
  currentUser?: CommentUser | null
}

export const MediaCommentModal = ({
  isOpen,
  onClose,
  item,
  providerId,
  currentUser,
}: Props) => {
  // Fecha com ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Trava scroll do body
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && item && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-5xl bg-background border border-border rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-2xl"
            style={{ maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Lado esquerdo: mídia ── */}
            <div className="flex-1 bg-black flex items-center justify-center min-h-[260px] md:min-h-0 relative">
              {item.type === 'photo' && (
                <img
                  src={item.url}
                  alt={item.title || 'Mídia do portfólio'}
                  className="w-full h-full object-contain max-h-[60vh] md:max-h-[90vh]"
                />
              )}

              {item.type === 'video' && (
                <div className="relative w-full h-full flex items-center justify-center">
                  <video
                    src={item.url}
                    controls
                    className="w-full max-h-[60vh] md:max-h-[90vh] object-contain"
                    poster={item.thumbnailUrl}
                  />
                </div>
              )}

              {item.type === 'audio' && (
                <div className="flex flex-col items-center justify-center gap-6 p-12 w-full">
                  <div className="w-24 h-24 bg-gradient-to-br from-primary to-purple-500 rounded-full flex items-center justify-center">
                    <Music className="w-12 h-12 text-white" />
                  </div>
                  <p className="text-white font-semibold">{item.title || 'Áudio'}</p>
                  <audio src={item.url} controls className="w-full max-w-xs" />
                </div>
              )}

              {/* Badge tipo */}
              <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg flex items-center gap-1">
                {item.type === 'photo' && <ImageIcon className="w-3.5 h-3.5 text-white" />}
                {item.type === 'video' && <Play className="w-3.5 h-3.5 text-white" />}
                {item.type === 'audio' && <Music className="w-3.5 h-3.5 text-white" />}
                <span className="text-xs text-white capitalize">{item.type === 'photo' ? 'Foto' : item.type === 'video' ? 'Vídeo' : 'Áudio'}</span>
              </div>
            </div>

            {/* ── Lado direito: comentários ── */}
            <div className="w-full md:w-80 lg:w-96 flex flex-col border-t md:border-t-0 md:border-l border-border">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="min-w-0 flex-1">
                  {item.title && (
                    <p className="text-white text-sm font-semibold truncate">{item.title}</p>
                  )}
                  {item.description && (
                    <p className="text-muted text-xs truncate mt-0.5">{item.description}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="ml-3 w-8 h-8 bg-surface border border-border rounded-lg flex items-center justify-center hover:border-primary transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4 text-muted" />
                </button>
              </div>

              {/* Comentários */}
              <div className="flex-1 overflow-hidden p-4">
                <CommentSection
                  providerId={providerId}
                  mediaId={item.id}
                  currentUser={currentUser}
                  maxHeight="calc(90vh - 200px)"
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
