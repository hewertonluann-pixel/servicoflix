import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Image as ImageIcon,
  Video as VideoIcon,
  Music,
} from 'lucide-react'
import type { MediaItem } from '@/types'
import { WaveAudioPlayer } from '@/components/WaveAudioPlayer'

interface PortfolioGalleryProps {
  items: MediaItem[]
  autoPlay?: boolean
  initialIndex?: number
  openAtRef?: React.MutableRefObject<((index: number) => void) | null>
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 320 : -320, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: (dir: number) => ({ x: dir > 0 ? -320 : 320, opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } }),
}

export const PortfolioGallery = ({ items, autoPlay = false, initialIndex, openAtRef }: PortfolioGalleryProps) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    initialIndex !== undefined ? initialIndex : null
  )
  const [direction, setDirection] = useState(1)
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [isMuted, setIsMuted] = useState(false)
  const [showSwipeHint, setShowSwipeHint] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const isDragging = useRef(false)

  const selectedItem = selectedIndex !== null ? items[selectedIndex] : null

  useEffect(() => {
    if (selectedIndex !== null && items.length > 1) {
      const shown = sessionStorage.getItem('swipeHintShown')
      if (!shown) {
        setShowSwipeHint(true)
        sessionStorage.setItem('swipeHintShown', '1')
        const t = setTimeout(() => setShowSwipeHint(false), 2500)
        return () => clearTimeout(t)
      }
    }
  }, [selectedIndex !== null])

  useEffect(() => {
    if (openAtRef) {
      openAtRef.current = (index: number) => setSelectedIndex(index)
    }
    return () => { if (openAtRef) openAtRef.current = null }
  }, [openAtRef])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return
      if (e.key === 'ArrowLeft') handlePrevious()
      else if (e.key === 'ArrowRight') handleNext()
      else if (e.key === 'Escape') handleClose()
      else if (e.key === ' ' && selectedItem?.type === 'video') { e.preventDefault(); togglePlay() }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIndex, selectedItem])

  const handlePrevious = () => {
    if (selectedIndex === null) return
    setDirection(-1)
    setSelectedIndex(selectedIndex > 0 ? selectedIndex - 1 : items.length - 1)
    setIsPlaying(false)
  }

  const handleNext = () => {
    if (selectedIndex === null) return
    setDirection(1)
    setSelectedIndex(selectedIndex < items.length - 1 ? selectedIndex + 1 : 0)
    setIsPlaying(false)
  }

  const handleClose = () => { setSelectedIndex(null); setIsPlaying(false) }

  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) videoRef.current.pause()
    else videoRef.current.play()
    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    if (videoRef.current) { videoRef.current.muted = !isMuted; setIsMuted(!isMuted) }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    isDragging.current = false
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = Math.abs(e.touches[0].clientX - touchStartX.current)
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current)
    if (dx > dy && dx > 8) isDragging.current = true
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging.current) return
    const delta = touchStartX.current - e.changedTouches[0].clientX
    if (delta > 50) handleNext()
    else if (delta < -50) handlePrevious()
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return ''
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'photo': return ImageIcon
      case 'video': return VideoIcon
      case 'audio': return Music
      default: return ImageIcon
    }
  }

  if (items.length === 0) {
    return (
      <div className="w-full aspect-video bg-background border border-border rounded-xl flex items-center justify-center">
        <div className="text-center">
          <ImageIcon className="w-12 h-12 text-muted mx-auto mb-2" />
          <p className="text-sm text-muted">Nenhuma mídia no portfólio</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {items.map((item, index) => {
          const Icon = getMediaIcon(item.type)
          return (
            <motion.button
              key={item.id}
              onClick={() => { setDirection(1); setSelectedIndex(index) }}
              className="relative aspect-square bg-background border border-border rounded-xl overflow-hidden hover:border-primary transition-colors group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {item.type === 'photo' && (
                <img src={item.url} alt={item.title || 'Portfolio item'} className="w-full h-full object-cover" />
              )}
              {item.type === 'video' && (
                <div className="relative w-full h-full">
                  {item.thumbnailUrl ? (
                    <img src={item.thumbnailUrl} alt={item.title || 'Video thumbnail'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-surface flex items-center justify-center">
                      <VideoIcon className="w-8 h-8 text-muted" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <Play className="w-6 h-6 text-white ml-1" />
                    </div>
                  </div>
                  {item.duration && (
                    <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-white">
                      {formatDuration(item.duration)}
                    </div>
                  )}
                </div>
              )}
              {item.type === 'audio' && (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex flex-col items-center justify-center gap-2">
                  <Music className="w-8 h-8 text-primary" />
                  <div className="px-3 py-1 bg-black/30 rounded-full">
                    <span className="text-xs text-white font-semibold">
                      {item.duration ? formatDuration(item.duration) : 'Áudio'}
                    </span>
                  </div>
                </div>
              )}
              <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 backdrop-blur-sm rounded flex items-center gap-1">
                <Icon className="w-3 h-3 text-white" />
              </div>
            </motion.button>
          )
        })}
      </div>

      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={handleClose}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {selectedItem.type !== 'audio' && (
              <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
                <button
                  onClick={(e) => { e.stopPropagation(); handlePrevious() }}
                  className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-colors pointer-events-auto"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleNext() }}
                  className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-colors pointer-events-auto"
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
              </div>
            )}

            <button
              onClick={handleClose}
              className="absolute top-4 right-4 w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-colors z-10"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            <div className="absolute top-4 left-4 px-3 py-2 bg-white/10 backdrop-blur-sm rounded-lg z-10">
              <span className="text-sm text-white font-semibold">{selectedIndex! + 1} / {items.length}</span>
            </div>

            {/* Dica swipe — só mobile */}
            <AnimatePresence>
              {showSwipeHint && items.length > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 md:hidden pointer-events-none"
                >
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                    <ChevronLeft className="w-4 h-4 text-white/70" />
                    <span className="text-xs text-white/80 font-medium">Deslize para navegar</span>
                    <ChevronRight className="w-4 h-4 text-white/70" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bolinhas indicadoras */}
            {items.length > 1 && selectedItem.type !== 'audio' && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
                {items.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation()
                      setDirection(i > selectedIndex! ? 1 : -1)
                      setSelectedIndex(i)
                    }}
                    className={`rounded-full transition-all duration-300 ${
                      i === selectedIndex ? 'w-5 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Conteúdo com slide direcional */}
            <div
              className="max-w-6xl max-h-[90vh] w-full flex items-center justify-center px-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={selectedIndex}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="w-full flex items-center justify-center"
                >
                  {selectedItem.type === 'photo' && (
                    <img
                      src={selectedItem.url}
                      alt={selectedItem.title || 'Portfolio item'}
                      className="max-w-full max-h-[80vh] object-contain rounded-lg select-none"
                      draggable={false}
                    />
                  )}

                  {selectedItem.type === 'video' && (
                    <div className="relative w-full max-w-4xl">
                      <video
                        ref={videoRef}
                        src={selectedItem.url}
                        className="w-full rounded-lg"
                        controls={false}
                        autoPlay={autoPlay}
                        loop
                        muted={isMuted}
                        onClick={togglePlay}
                      />
                      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                        <button
                          onClick={togglePlay}
                          className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                        >
                          {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
                        </button>
                        <button
                          onClick={toggleMute}
                          className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                        >
                          {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedItem.type === 'audio' && (() => {
                    const audioItems = items.filter(i => i.type === 'audio')
                    const audioIndex = audioItems.findIndex(i => i.id === selectedItem.id)
                    const hasPrev = audioIndex > 0
                    const hasNext = audioIndex < audioItems.length - 1
                    const goToPrev = () => {
                      const globalIdx = items.findIndex(i => i.id === audioItems[audioIndex - 1].id)
                      if (globalIdx !== -1) { setDirection(-1); setSelectedIndex(globalIdx) }
                    }
                    const goToNext = () => {
                      const globalIdx = items.findIndex(i => i.id === audioItems[audioIndex + 1].id)
                      if (globalIdx !== -1) { setDirection(1); setSelectedIndex(globalIdx) }
                    }
                    return (
                      <div className="w-full max-w-3xl flex flex-col gap-4">
                        <WaveAudioPlayer
                          key={selectedItem.id}
                          src={selectedItem.url}
                          title={selectedItem.title}
                          autoPlay
                          hasPrev={hasPrev}
                          hasNext={hasNext}
                          onPrev={goToPrev}
                          onNext={goToNext}
                          onEnded={hasNext ? goToNext : undefined}
                        />
                        {audioItems.length > 1 && (
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {audioItems.map((a, i) => (
                              <button
                                key={a.id}
                                onClick={() => {
                                  const globalIdx = items.findIndex(x => x.id === a.id)
                                  if (globalIdx !== -1) { setDirection(globalIdx > selectedIndex! ? 1 : -1); setSelectedIndex(globalIdx) }
                                }}
                                className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors ${
                                  a.id === selectedItem.id
                                    ? 'border-primary bg-primary/20 text-white'
                                    : 'border-white/10 bg-white/5 text-white/50 hover:border-white/30 hover:text-white'
                                }`}
                              >
                                <Music className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="text-xs font-medium truncate max-w-[120px]">
                                  {a.title || `Áudio ${i + 1}`}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </motion.div>
              </AnimatePresence>
            </div>

            {selectedItem.type !== 'audio' && (selectedItem.title || selectedItem.description) && (
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 max-w-2xl px-4 text-center z-10">
                {selectedItem.title && <h3 className="text-lg font-bold text-white mb-1">{selectedItem.title}</h3>}
                {selectedItem.description && <p className="text-sm text-white/70">{selectedItem.description}</p>}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
