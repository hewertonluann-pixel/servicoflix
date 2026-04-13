import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ChevronLeft, ChevronRight,
  Image as ImageIcon, Play, Music,
  MessageSquare, Pencil, Check, Loader2,
  Maximize2, Minimize2, Heart, Share2, ArrowLeft,
} from 'lucide-react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { CommentSection } from '@/components/CommentSection'
import type { MediaItem } from '@/types'
import type { CommentUser } from '@/hooks/useComments'
import { YouTubeEmbed, isValidYouTubeUrl } from '@/components/YouTubeEmbed'
import { WaveAudioPlayer } from '@/components/WaveAudioPlayer'

interface Props {
  isOpen: boolean
  onClose: () => void
  items: MediaItem[]
  initialIndex: number
  providerId: string
  currentUser?: CommentUser | null
  isOwner?: boolean
  mediaTitles?: Record<string, string>
  onTitleSaved?: (mediaId: string, newTitle: string) => void
}

type View = 'media' | 'comments'

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
  const [fullscreen, setFullscreen] = useState(false)
  const [headerVisible, setHeaderVisible] = useState(true)
  const [view, setView] = useState<View>('media')
  const titleInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const item = items[idx] ?? null

  useEffect(() => {
    if (isOpen) { setIdx(initialIndex); setView('media') }
  }, [isOpen, initialIndex])

  useEffect(() => { setEditingTitle(false) }, [idx])
  useEffect(() => { if (view === 'media') setEditingTitle(false) }, [view])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    const onFsChange = () => {
      const isFull = !!document.fullscreenElement
      setFullscreen(isFull)
      if (!isFull) setHeaderVisible(true)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  useEffect(() => {
    if (!isOpen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
  }, [isOpen])

  const prev = useCallback(() =>
    setIdx(i => (i > 0 ? i - 1 : items.length - 1)), [items.length])
  const next = useCallback(() =>
    setIdx(i => (i < items.length - 1 ? i + 1 : 0)), [items.length])

  const resetHideTimer = useCallback(() => {
    setHeaderVisible(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    if (fullscreen) {
      hideTimerRef.current = setTimeout(() => setHeaderVisible(false), 3000)
    }
  }, [fullscreen])

  useEffect(() => {
    if (fullscreen) resetHideTimer()
    else {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      setHeaderVisible(true)
    }
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current) }
  }, [fullscreen, resetHideTimer])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (editingTitle) return
      if (e.key === 'Escape') {
        if (view === 'comments') { setView('media'); return }
        if (fullscreen) toggleFullscreen()
        else onClose()
      }
      if (view === 'media') {
        if (e.key === 'ArrowLeft')  prev()
        if (e.key === 'ArrowRight') next()
        if (e.key === 'f' || e.key === 'F') toggleFullscreen()
      }
      if (fullscreen) resetHideTimer()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, idx, editingTitle, fullscreen, view])

  const toggleFullscreen = async () => {
    const el = containerRef.current
    if (!el) return
    try {
      if (!document.fullscreenElement) await el.requestFullscreen()
      else await document.exitFullscreen()
    } catch {
      setFullscreen(f => !f)
    }
  }

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

  const handleShare = async () => {
    if (navigator.share && item) {
      try {
        await navigator.share({ title: getTitle(item), url: item.url })
      } catch { /* ignorado */ }
    }
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
          className={
            fullscreen && !document.fullscreenElement
              ? 'fixed inset-0 z-[9999] bg-black flex flex-col'
              : 'fixed inset-0 z-[70] bg-black/95 flex flex-col'
          }
          onClick={onClose}
        >
          <motion.div
            ref={containerRef}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col w-full h-full bg-black overflow-hidden"
            onClick={e => e.stopPropagation()}
            onMouseMove={fullscreen ? resetHideTimer : undefined}
          >

            {/* ════════════════════════════════════════════════════
                MOBILE — dois painéis animados (media | comments)
                Desktop — layout original lado a lado
            ════════════════════════════════════════════════════ */}

            {/* ── Header ───────────────────────────────────────────────── */}
            <div
              className={`flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-black/80 backdrop-blur-sm shrink-0 transition-all duration-300 ${
                fullscreen
                  ? `absolute top-0 left-0 right-0 z-10 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}`
                  : 'relative'
              }`}
            >
              {/* Botão voltar (mobile comentários) */}
              {view === 'comments' && (
                <button
                  onClick={() => setView('media')}
                  className="md:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}

              {/* Navegação anterior (modo media) */}
              {items.length > 1 && view === 'media' && (
                <button onClick={prev} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              <TypeIcon type={item.type} className="w-4 h-4 text-primary shrink-0" />

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
                    {view === 'comments' ? 'Comentários' : getTitle(item)}
                  </span>
                )}

                {isOwner && !editingTitle && view === 'media' && (
                  <button onClick={startEdit} className="shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors text-muted hover:text-primary" title="Editar título">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                {isOwner && editingTitle && (
                  <button onClick={saveTitle} disabled={savingTitle} className="shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors text-primary">
                    {savingTitle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {items.length > 1 && view === 'media' && (
                <span className="text-xs text-muted shrink-0">{idx + 1}/{items.length}</span>
              )}

              {items.length > 1 && view === 'media' && (
                <button onClick={next} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white">
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}

              {view === 'media' && (
                <button
                  onClick={toggleFullscreen}
                  className="shrink-0 w-8 h-8 hidden md:flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white"
                  title={fullscreen ? 'Sair do fullscreen (F)' : 'Fullscreen (F)'}
                >
                  {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              )}

              <button onClick={onClose} className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ── MOBILE: painel animado ─────────────────────────────────── */}
            <div className="md:hidden flex-1 flex flex-col min-h-0 relative overflow-hidden">
              <AnimatePresence initial={false} mode="wait">

                {/* PAINEL MÍDIA */}
                {view === 'media' && (
                  <motion.div
                    key="mobile-media"
                    initial={{ x: 0, opacity: 1 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '-100%', opacity: 0 }}
                    transition={{ type: 'tween', duration: 0.28 }}
                    className="absolute inset-0 flex flex-col"
                  >
                    {/* Área da foto — tela quase cheia */}
                    <div className="flex-1 flex items-center justify-center bg-black relative">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.15 }}
                          className="w-full h-full flex items-center justify-center p-2"
                        >
                          {item.type === 'photo' && (
                            <img
                              src={item.url}
                              alt={getTitle(item)}
                              className="max-w-full max-h-full object-contain rounded-lg"
                            />
                          )}
                          {item.type === 'video' && (
                            isValidYouTubeUrl(item.url)
                              ? <div className="w-full max-w-lg"><YouTubeEmbed videoUrl={item.url} title={getTitle(item)} /></div>
                              : <video src={item.url} controls className="max-w-full max-h-full rounded-lg" poster={item.thumbnailUrl} />
                          )}
                          {item.type === 'audio' && (
                            <div className="w-full max-w-sm px-2">
                              <WaveAudioPlayer
                                key={item.id}
                                src={item.url}
                                title={getTitle(item)}
                                subtitle={item.id}
                                onNext={items.length > 1 ? next : undefined}
                                onPrev={items.length > 1 ? prev : undefined}
                                hasNext={items.length > 1}
                                hasPrev={items.length > 1}
                              />
                            </div>
                          )}
                        </motion.div>
                      </AnimatePresence>

                      {/* Setas laterais mobile */}
                      {items.length > 1 && (
                        <>
                          <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 rounded-full flex items-center justify-center text-white">
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 rounded-full flex items-center justify-center text-white">
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Thumbnails mobile */}
                    {items.length > 1 && (
                      <div className="shrink-0 flex gap-2 px-3 py-2 bg-black/60 overflow-x-auto">
                        {items.map((it, i) => (
                          <button
                            key={it.id}
                            onClick={() => setIdx(i)}
                            className={`shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                              i === idx ? 'border-primary scale-105' : 'border-transparent opacity-50'
                            }`}
                          >
                            {it.type === 'photo' ? (
                              <img src={it.url} alt="" className="w-full h-full object-cover" />
                            ) : it.type === 'video' && it.thumbnailUrl ? (
                              <img src={it.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-surface flex items-center justify-center">
                                <TypeIcon type={it.type} className="w-4 h-4 text-muted" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Barra de ações inferior — estilo Instagram */}
                    <div className="shrink-0 flex items-center justify-around px-6 py-3 bg-black/80 border-t border-white/10">
                      <button className="flex items-center gap-2 text-white/80 hover:text-red-400 transition-colors">
                        <Heart className="w-6 h-6" />
                      </button>
                      <button
                        onClick={() => setView('comments')}
                        className="flex items-center gap-2 text-white/80 hover:text-primary transition-colors"
                      >
                        <MessageSquare className="w-6 h-6" />
                        <span className="text-sm font-medium">Comentar</span>
                      </button>
                      <button
                        onClick={handleShare}
                        className="flex items-center gap-2 text-white/80 hover:text-primary transition-colors"
                      >
                        <Share2 className="w-6 h-6" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* PAINEL COMENTÁRIOS */}
                {view === 'comments' && (
                  <motion.div
                    key="mobile-comments"
                    initial={{ x: '100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '100%', opacity: 0 }}
                    transition={{ type: 'tween', duration: 0.28 }}
                    className="absolute inset-0 flex flex-col bg-background"
                  >
                    {/* Miniatura da foto no topo */}
                    {item.type === 'photo' && (
                      <div
                        className="shrink-0 w-full h-24 overflow-hidden cursor-pointer relative"
                        onClick={() => setView('media')}
                      >
                        <img src={item.url} alt={getTitle(item)} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-1">
                          <ArrowLeft className="w-4 h-4 text-white/70" />
                          <span className="text-xs text-white/70">Voltar para a foto</span>
                        </div>
                      </div>
                    )}

                    {/* Seção de comentários — scroll livre, input fixo */}
                    <div className="flex-1 min-h-0">
                      <CommentSection
                        key={item.id}
                        providerId={providerId}
                        mediaId={item.id}
                        currentUser={currentUser ?? null}
                        compact
                      />
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* ── DESKTOP: layout original lado a lado ──────────────────── */}
            <div className={`hidden md:flex min-h-0 ${ fullscreen ? 'flex-1' : 'flex-row flex-1' }`}>

              {/* Seta esquerda desktop */}
              {items.length > 1 && (
                <button
                  onClick={prev}
                  className={`hidden md:flex absolute left-2 z-10 w-11 h-11 bg-black/50 backdrop-blur-sm hover:bg-black/70 rounded-full items-center justify-center text-white transition-all top-1/2 -translate-y-1/2 ${
                    fullscreen && !headerVisible ? 'opacity-0 hover:opacity-100' : ''
                  }`}
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* Painel mídia desktop */}
              <div className={`flex items-center justify-center bg-black relative min-h-0 ${ fullscreen ? 'w-full h-full' : 'flex-1' }`}>
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
                        className={`object-contain rounded-lg ${
                          fullscreen
                            ? 'max-w-full max-h-screen cursor-zoom-out'
                            : 'max-w-full max-h-[calc(100vh-200px)]'
                        }`}
                        onDoubleClick={toggleFullscreen}
                      />
                    )}
                    {item.type === 'video' && (
                      isValidYouTubeUrl(item.url)
                        ? <div className={fullscreen ? 'w-full max-w-5xl' : 'w-full max-w-2xl'}>
                            <YouTubeEmbed videoUrl={item.url} title={getTitle(item)} />
                          </div>
                        : <video
                            src={item.url}
                            controls
                            className={`rounded-lg ${fullscreen ? 'max-w-full max-h-screen' : 'max-w-full max-h-[calc(100vh-200px)]'}`}
                            poster={item.thumbnailUrl}
                          />
                    )}
                    {item.type === 'audio' && (
                      <div className="w-full max-w-2xl px-2">
                        <WaveAudioPlayer
                          key={item.id}
                          src={item.url}
                          title={getTitle(item)}
                          subtitle={item.id}
                          onNext={items.length > 1 ? next : undefined}
                          onPrev={items.length > 1 ? prev : undefined}
                          hasNext={items.length > 1}
                          hasPrev={items.length > 1}
                        />
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {fullscreen && item.type === 'photo' && (
                  <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/40 select-none pointer-events-none">
                    Duplo clique para sair
                  </span>
                )}
              </div>

              {/* Seta direita desktop */}
              {items.length > 1 && (
                <button
                  onClick={next}
                  className={`hidden md:flex absolute z-10 w-11 h-11 bg-black/50 backdrop-blur-sm hover:bg-black/70 rounded-full items-center justify-center text-white transition-all top-1/2 -translate-y-1/2 ${
                    fullscreen
                      ? 'right-2'
                      : 'right-[calc(theme(spacing.80)+0.5rem)] lg:right-[calc(theme(spacing.96)+0.5rem)]'
                  } ${fullscreen && !headerVisible ? 'opacity-0 hover:opacity-100' : ''}`}
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}

              {/* Painel comentários desktop (oculto em fullscreen) */}
              {!fullscreen && (
                <div className="w-80 lg:w-96 flex flex-col border-l border-white/10 bg-background shrink-0">
                  <div className="px-4 py-3 border-b border-border flex items-center gap-2 shrink-0">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    <span className="text-white text-sm font-bold">Comentários</span>
                  </div>
                  <div className="flex-1 overflow-hidden p-3">
                    <CommentSection
                      key={item.id}
                      providerId={providerId}
                      mediaId={item.id}
                      currentUser={currentUser ?? null}
                      maxHeight="calc(100vh - 180px)"
                    />
                  </div>
                </div>
              )}

              {/* Thumbnails desktop */}
              {items.length > 1 && !fullscreen && (
                <div className="absolute bottom-0 left-0 right-80 lg:right-96 shrink-0 flex gap-2 px-4 py-2 bg-black/60 border-t border-white/10 overflow-x-auto">
                  {items.map((it, i) => (
                    <button
                      key={it.id}
                      onClick={() => setIdx(i)}
                      className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                        i === idx ? 'border-primary scale-105' : 'border-transparent opacity-50 hover:opacity-90'
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
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
