import { useRef, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface VideoCarouselProps {
  children: React.ReactNode
  className?: string
}

export const VideoCarousel = ({ children, className = '' }: VideoCarouselProps) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)
  const [isScrolling, setIsScrolling] = useState(false)

  const checkScroll = () => {
    if (!scrollRef.current) return
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setShowLeftArrow(scrollLeft > 0)
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10)
  }

  useEffect(() => {
    checkScroll()
    window.addEventListener('resize', checkScroll)
    return () => window.removeEventListener('resize', checkScroll)
  }, [children])

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current || isScrolling) return
    
    setIsScrolling(true)
    const scrollAmount = scrollRef.current.clientWidth * 0.8
    const targetScroll = direction === 'left' 
      ? scrollRef.current.scrollLeft - scrollAmount
      : scrollRef.current.scrollLeft + scrollAmount

    scrollRef.current.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    })

    setTimeout(() => {
      setIsScrolling(false)
      checkScroll()
    }, 500)
  }

  return (
    <div className={`relative group ${className}`}>
      {/* Seta esquerda */}
      <AnimatePresence>
        {showLeftArrow && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-full bg-gradient-to-r from-background/90 to-transparent flex items-center justify-start pl-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div className="w-10 h-10 rounded-full bg-surface/90 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-primary hover:border-primary transition-colors">
              <ChevronLeft className="w-6 h-6 text-white" />
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Container com scroll */}
      <div 
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>

      {/* Seta direita */}
      <AnimatePresence>
        {showRightArrow && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-full bg-gradient-to-l from-background/90 to-transparent flex items-center justify-end pr-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div className="w-10 h-10 rounded-full bg-surface/90 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-primary hover:border-primary transition-colors">
              <ChevronRight className="w-6 h-6 text-white" />
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
