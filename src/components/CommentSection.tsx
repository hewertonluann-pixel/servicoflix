import { useState, useRef, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Send, Loader2, MessageCircle } from 'lucide-react'
import { CommentItem } from '@/components/CommentItem'
import { useComments } from '@/hooks/useComments'
import type { CommentUser } from '@/hooks/useComments'

interface Props {
  providerId: string
  mediaId: string
  currentUser?: CommentUser | null
  maxHeight?: string
}

export const CommentSection = ({
  providerId,
  mediaId,
  currentUser,
  maxHeight = '320px',
}: Props) => {
  const { comments, loading, error, addComment, deleteComment, toggleLike } =
    useComments(providerId, mediaId)

  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const listEndRef = useRef<HTMLDivElement>(null)

  // Scroll suave ao chegar novo comentário
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments.length])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || !currentUser || sending) return

    setSending(true)
    try {
      await addComment(text.trim(), currentUser)
      setText('')
    } catch (err) {
      console.error('[CommentSection] Erro ao enviar comentário:', err)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-white">
          {loading ? '...' : `${comments.length} comentário${comments.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Lista de comentários */}
      <div
        className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
        style={{ maxHeight }}
      >
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        )}

        {error && (
          <p className="text-red-400 text-sm text-center py-4">{error}</p>
        )}

        {!loading && !error && comments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageCircle className="w-8 h-8 text-muted/40 mb-2" />
            <p className="text-sm text-muted">Seja o primeiro a comentar!</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUser?.uid}
              providerId={providerId}
              onDelete={deleteComment}
              onToggleLike={toggleLike}
            />
          ))}
        </AnimatePresence>

        <div ref={listEndRef} />
      </div>

      {/* Formulário */}
      <div className="mt-3 pt-3 border-t border-border">
        {currentUser ? (
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Adicione um comentário... (Enter para enviar)"
              rows={1}
              maxLength={500}
              disabled={sending}
              className="flex-1 bg-surface border border-border rounded-xl px-3 py-2 text-white text-sm placeholder:text-muted/50 focus:border-primary outline-none transition-colors resize-none disabled:opacity-60"
              style={{ minHeight: '38px', maxHeight: '96px' }}
            />
            <button
              type="submit"
              disabled={!text.trim() || sending}
              className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center hover:bg-primary/80 transition-colors disabled:opacity-40 flex-shrink-0"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 text-background animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-background" />
              )}
            </button>
          </form>
        ) : (
          <p className="text-xs text-muted text-center">
            <span className="text-primary font-semibold cursor-pointer hover:underline">Entre</span>
            {' '}para deixar um comentário
          </p>
        )}
      </div>
    </div>
  )
}
