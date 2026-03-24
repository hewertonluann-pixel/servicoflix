import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ChevronLeft, ChevronRight,
  Image as ImageIcon, Play, Music,
  MessageSquare, Pencil, Check, Loader2,
} from 'lucide-react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { CommentSection } from '@/components/CommentSection'
import type { MediaItem } from '@/types'
import type { CommentUser } from '@/hooks/useComments'
import { YouTubeEmbed, isValidYouTubeUrl } from '@/components/YouTubeEmbed'

interface Props {
  isOpen: boolean
  onClose: () => void
  /** Lista completa de mídias (fotos + vídeos + áudios na ordem desejada) */
  items: MediaItem[]
  /** Índice inicial ao abrir */
  initialIndex: number
  providerId: string
  currentUser?: CommentUser | null
  /** Se true, exibe botão de editar título */
  isOwner?: boolean
  /** Mapa de títulos personalizados { [mediaId]: string } — Opção B */
  mediaTitles?: Record<string, string>
  /** Callback chamado após salvar título no Firestore */
  onTitleSaved?: (mediaId: string, newTitle: string) => void
}

const TypeIcon = ({ type, className }: { type: MediaItem['type'], className?: string }) => {
  if (type === 'photo') return <ImageIcon className={className} />
  if (type === 'video') return <Play className={className} />
  return <Music className={className} />
}

export const MediaViewerModal = ({
  isOpen,
  onClose,
  items,
  initialIndex,
  providerId,
  currentUser,
  isOwner = false,
  mediaTitles = {},
  onTitleSaved,
}: Props) => {
  const [idx, setIdx] = useState(initialIndex)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [savingTitle, setSavingTitle] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)

  const item = items[idx] ?? null

  // Sincroniza índice quando o modal abre
  useEffect(() => {
    if (isOpen) setIdx(initialIndex)
  }, [isOpen, initialIndex])

  // Cancela edição ao trocar de item
  useEffect(() => {
    setEditingTitle(false)
  }, [idx])

  // Trava scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Teclado: ESC fecha, setas navegam
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (editingTitle) return          // não navega enquanto edita
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, idx, editingTitle])

  const prev = useCallback(() =>
    setIdx(i => (i > 0 ? i - 1 : items.length - 1)), [items.length])
  const next = useCallback(() =>
    setIdx(i => (i < items.length - 1 ? i + 1 : 0)), [items.length])

  // ── Edição de título ─────────────────────────────────────────────────────
  const startEdit = () => {
    setTitleDraft(getTitle(item))
    setEditingTitle(true)
    setTimeout(() => titleInputRef.current?.select(), 50)
  }

  const cancelEdit = () => setEditingTitle(false)

  const saveTitle = async () => {
    if (!item || savingTitle) return
    const trimmed = titleDraft.trim()
    if (!trimmed) return
    setSavingTitle(true)
    try {
      // Opção B: salva em users/{providerId}.providerProfile.mediaTitles
      const userRef = doc(db, 'users', providerId)
      await updateDoc(userRef, {
        [`providerProfile.mediaTitles.${item.id}`]: trimmed,
      })
      onTitleSaved?.(item.id, trimmed)
    } catch (e) {
      console.error('[MediaViewerModal] saveTitle:', e)
    } finally {
      setSavingTitle(false)
      setEditingTitle(false)
    }
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter')  { e.preventDefault(); saveTitle() }
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
  }

  const getTitle = (it: MediaItem | null) => {
    if (!it) return ''
    return mediaTitles[it.id] ?? it.title ?? `${it.type === 'photo' ? 'Foto' : it.type === 'video' ? 'Vídeo' : 'Áudio'}`
  }

  if (!isOpen || !item) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="viewer-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-black/95 flex flex-col"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col w-full h-full"
            onClick={e => e.stopPropagation()}
          >
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-black/60 backdrop-blur-sm shrink-0">
              {/* Seta anterior (mobile) */}
              {items.length > 1 && (
                <button
                  onClick={prev}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              {/* Ícone tipo */}
              <TypeIcon type={item.type} className="w-4 h-4 text-primary shrink-0" />

              {/* Título editável */}
              <div className="flex-1 min-w-0 flex items-center gap-2">
                {editingTitle ? (
                  <input
                    ref={titleInputRef}
                    value={titleDraft}
                    onChange={e => setTitleDraft(e.target.value)}
                    onKeyDown={handleTitleKeyDown}
                    onBlur={saveTitle}
                    className="flex-1 bg-white/10 border border-primary/60 rounded-lg px-3 py-1 text-sm text-white outline-none min-w-0"
                    maxLength={60}
                  />
                ) : (
                  <span className="text-white text-sm font-semibold truncate">
                    {getTitle(item)}
                  </span>
                )}

                {isOwner && !editingTitle && (
                  <button
                    onClick={startEdit}
                    className="shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors text-muted hover:text-primary"
                    title="Editar título"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}

                {isOwner && editingTitle && (
                  <button
                    onClick={saveTitle}
                    disabled={savingTitle}
                    className="shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors text-primary"
                  >
                    {savingTitle
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Check className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {/* Contador */}
              {items.length > 1 && (
                <span className="text-xs text-muted shrink-0">
                  {idx + 1}/{items.length}
                </span>
              )}

              {/* Seta próxima (mobile) */}
              {items.length > 1 && (
                <button
                  onClick={next}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}

              {/* Fechar */}
              <button
                onClick={onClose}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ── Corpo: mídia + comentários ─────────────────────────────── */}
            <div className="flex flex-col md:flex-row flex-1 min-h-0">

              {/* Seta esquerda desktop */}
              {items.length > 1 && (
                <button
                  onClick={prev}
                  className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-11 h-11 bg-black/50 backdrop-blur-sm hover:bg-black/70 rounded-full items-center justify-center text-white transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* ── Painel mídia ─────────────────────────────────────────── */}
              <div className="flex-1 flex items-center justify-center bg-black relative min-h-[40vh] md:min-h-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.15 }}
                    className="w-full h-full flex items-center justify-center p-4"
                  >
                    {item.type === 'photo' && (
                      <img
                        src={item.url}
                        alt={getTitle(item)}
                        className="max-w-full max-h-[calc(100vh-200px)] object-contain rounded-lg"
                      />
                    )}

                    {item.type === 'video' && (
                      isValidYouTubeUrl(item.url)
                        ? <div className="w-full max-w-2xl"><YouTubeEmbed videoUrl={item.url} title={getTitle(item)} /></div>
                        : <video src={item.url} controls className="max-w-full max-h-[calc(100vh-200px)] rounded-lg" poster={item.thumbnailUrl} />
                    )}

                    {item.type === 'audio' && (
                      <div className="flex flex-col items-center gap-6 p-8">
                        <div className="w-24 h-24 bg-gradient-to-br from-primary to-purple-500 rounded-full flex items-center justify-center">
                          <Music className="w-12 h-12 text-white" />
                        </div>
                        <p className="text-white font-semibold text-lg">{getTitle(item)}</p>
                        <audio src={item.url} controls className="w-72 max-w-full" />
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Seta direita desktop */}
              {items.length > 1 && (
                <button
                  onClick={next}
                  className="hidden md:flex absolute right-[calc(theme(spacing.80)+0.5rem)] lg:right-[calc(theme(spacing.96)+0.5rem)] top-1/2 -translate-y-1/2 z-10 w-11 h-11 bg-black/50 backdrop-blur-sm hover:bg-black/70 rounded-full items-center justify-center text-white transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}

              {/* ── Painel comentários ───────────────────────────────────── */}
              <div className="w-full md:w-80 lg:w-96 flex flex-col border-t md:border-t-0 md:border-l border-white/10 bg-background shrink-0">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2 shrink-0">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span className="text-white text-sm font-bold">Comentários</span>
                </div>
                <div className="flex-1 overflow-hidden p-3">
                  {/* key={item.id} força remontagem ao trocar de mídia */}
                  <CommentSection
                    key={item.id}
                    providerId={providerId}
                    mediaId={item.id}
                    currentUser={currentUser ?? null}
                    maxHeight="calc(100vh - 180px)"
                  />
                </div>
              </div>
            </div>

            {/* ── Tira de thumbnails ──────────────────────────────────────── */}
            {items.length > 1 && (
              <div className="shrink-0 flex gap-2 px-4 py-2 bg-black/60 border-t border-white/10 overflow-x-auto">
                {items.map((it, i) => (
                  <button
                    key={it.id}
                    onClick={() => setIdx(i)}
                    className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                      i === idx
                        ? 'border-primary scale-105'
                        : 'border-transparent opacity-50 hover:opacity-90'
                    }`}
                  >
                    {it.type === 'photo' ? (
                      <img src={it.url} alt="" className="w-full h-full object-cover" />
                    ) : it.type === 'video' && it.thumbnailUrl ? (
                      <img src={it.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-surface flex items-center justify-center">
                        <TypeIcon type={it.type} className="w-5 h-5 text-muted" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
