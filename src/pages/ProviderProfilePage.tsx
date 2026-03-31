import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Star, MapPin, Clock, CheckCircle, Calendar, MessageCircle,
  Video as VideoIcon, Image as ImageIcon, Music, Loader2, AlertCircle, Sparkles,
  X, Instagram, Facebook, Youtube, Globe, Linkedin, MessageSquare, Lock
} from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'
import { YouTubeEmbed, isValidYouTubeUrl } from '@/components/YouTubeEmbed'
import { VideoCarousel } from '@/components/VideoCarousel'
import { RequestServiceModal } from '@/components/RequestServiceModal'
import { ProgressiveImage } from '@/components/ProgressiveImage'
import { UserAvatar } from '@/components/UserAvatar'
import { mockProviders } from '@/data/mock'
import { SocialLinks } from '@/types'
import { resolveAvatarFromDoc } from '@/lib/avatarUtils'
import { useUserPresence, formatLastSeen } from '@/hooks/usePresence'
import { useReviews } from '@/hooks/useReviews'
import { ReviewModal } from '@/components/ReviewModal'
import { ReviewCard } from '@/components/ReviewCard'
import { RatingDistribution } from '@/components/RatingDistribution'
import { MediaViewerModal } from '@/components/MediaViewerModal'
import { AudioMiniPlayer } from '@/components/AudioMiniPlayer'
import { useMediaCommentCounts } from '@/hooks/useMediaCommentCounts'
import type { MediaItem } from '@/types'

interface ProviderData {
  id: string
  name: string
  professionalName?: string
  avatar: string
  providerAvatar: string
  email: string
  isMock?: boolean
  providerProfile: {
    professionalName?: string
    specialty: string
    bio: string
    city: string
    neighborhood: string
    priceFrom: number
    skills: string[]
    phone: string
    coverImage: string
    responseTime: string
    completedJobs: number
    rating: number
    reviewCount: number
    verified: boolean
    socialLinks?: SocialLinks
    media?: {
      photos: string[]
      videos: string[]
      audios: string[]
    }
    mediaTitles?: Record<string, string>
  }
}

const mockPhotos = [
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80',
  'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&q=80',
  'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=800&q=80',
  'https://images.unsplash.com/photo-1471478331149-c72f17e33c73?w=800&q=80',
  'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=800&q=80',
  'https://images.unsplash.com/photo-1510915228340-29c85a43dcfe?w=800&q=80',
]

const mockVideos = [
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
]

const getSocialUrl = (platform: string, value: string): string => {
  if (!value) return ''
  switch (platform) {
    case 'instagram':
      if (value.startsWith('@')) value = value.slice(1)
      return value.startsWith('http') ? value : `https://instagram.com/${value}`
    case 'facebook':
      return value.startsWith('http') ? value : `https://facebook.com/${value}`
    case 'youtube':
      return value.startsWith('http') ? value : `https://youtube.com/${value}`
    case 'whatsapp':
      const phone = value.replace(/\D/g, '')
      return `https://wa.me/${phone}`
    case 'tiktok':
      if (value.startsWith('@')) value = value.slice(1)
      return value.startsWith('http') ? value : `https://tiktok.com/@${value}`
    case 'linkedin':
      return value.startsWith('http') ? value : `https://linkedin.com/in/${value}`
    case 'website':
      return value.startsWith('http') ? value : `https://${value}`
    default:
      return value
  }
}

const SocialButton = ({ icon: Icon, label, url }: { icon: any, label: string, url: string }) => (
  <a href={url} target="_blank" rel="noopener noreferrer"
    className="flex items-center gap-2 px-4 py-3 bg-background border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all group">
    <Icon className="w-5 h-5 text-muted group-hover:text-primary transition-colors" />
    <span className="text-sm text-white font-medium">{label}</span>
  </a>
)

const toMediaItem = (url: string, type: 'photo' | 'video' | 'audio', index: number): MediaItem => ({
  id: `${type}-${index}`,
  type,
  url,
  title: `${type === 'photo' ? 'Foto' : type === 'video' ? 'Vídeo' : 'Áudio'} ${index + 1}`,
  uploadedAt: '',
  order: index,
})

const CommentBadge = ({ count }: { count: number }) => {
  if (count === 0) return null
  return (
    <span className="absolute top-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 bg-black/70 backdrop-blur-sm rounded-full text-white text-[10px] font-bold pointer-events-none">
      <MessageSquare className="w-2.5 h-2.5" />
      {count > 99 ? '99+' : count}
    </span>
  )
}

export const ProviderProfilePage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useSimpleAuth()
  const [provider, setProvider] = useState<ProviderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)

  // ── Media Viewer ──────────────────────────────────────────────────────────
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)
  const [mediaTitles, setMediaTitles] = useState<Record<string, string>>({})

  // ── AudioMiniPlayer: índice do áudio sendo pré-visualizado ────────────────
  const [activeMiniIdx, setActiveMiniIdx] = useState(0)

  const openViewer = (index: number) => {
    setViewerIndex(index)
    setViewerOpen(true)
  }
  const closeViewer = () => setViewerOpen(false)

  const commentUser = user
    ? { uid: user.id, displayName: user.name ?? null, photoURL: user.avatar ?? null }
    : null

  const { isOnline, lastSeen } = useUserPresence(
    loading || !provider || provider.isMock ? null : provider.id
  )

  const { reviews, loading: loadingReviews, averageRating, reviewCount, distribution } = useReviews(
    provider?.isMock ? undefined : id
  )

  // ── Lista unificada de mídias (fotos + vídeos + áudios) ───────────────────
  const allItems = useMemo<MediaItem[]>(() => {
    if (!provider) return []
    const p = provider.providerProfile.media
    if (!p) return []
    const photos = (p.photos || []).map((url, i) => toMediaItem(url, 'photo', i))
    const videos = (p.videos || []).map((url, i) => toMediaItem(url, 'video', i))
    const audios = (p.audios || []).map((url, i) => toMediaItem(url, 'audio', i))
    return [...photos, ...videos, ...audios]
  }, [provider])

  // ── Contagens de comentários ──────────────────────────────────────────────
  const allMediaIds = useMemo(() => allItems.map(it => it.id), [allItems])
  const commentCounts = useMediaCommentCounts(
    provider?.isMock ? undefined : provider?.id,
    allMediaIds
  )

  useEffect(() => {
    const loadProvider = async () => {
      if (!id) { setError('ID não fornecido'); setLoading(false); return }
      setLoading(true); setError('')

      if (id.startsWith('mock-')) {
        const mockProvider = mockProviders.find(p => p.id === id)
        if (mockProvider) {
          setProvider({
            id: mockProvider.id, name: mockProvider.name,
            professionalName: mockProvider.name,
            avatar: mockProvider.avatar, providerAvatar: mockProvider.avatar,
            email: '', isMock: true,
            providerProfile: {
              professionalName: mockProvider.name,
              specialty: mockProvider.specialty, bio: mockProvider.bio,
              city: mockProvider.city, neighborhood: mockProvider.neighborhood,
              priceFrom: mockProvider.priceFrom, skills: mockProvider.skills,
              phone: mockProvider.whatsapp || '', coverImage: mockProvider.coverImage,
              responseTime: mockProvider.responseTime,
              completedJobs: mockProvider.completedJobs,
              rating: mockProvider.rating, reviewCount: mockProvider.reviewCount,
              verified: mockProvider.isTopRated,
              socialLinks: { instagram: '@exemplo', facebook: 'https://facebook.com/exemplo', youtube: 'https://youtube.com/@exemplo', whatsapp: '38999999999', tiktok: '@exemplo', linkedin: 'exemplo', website: 'https://exemplo.com.br' },
              media: { photos: mockPhotos, videos: mockVideos, audios: [] },
              mediaTitles: {},
            }
          })
        } else {
          setError('Perfil de exemplo não encontrado')
        }
        setLoading(false); return
      }

      try {
        const docRef = doc(db, 'users', id)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          const data = docSnap.data()
          if (!data.providerProfile) {
            setError('Este usuário não é um prestador de serviços')
            setLoading(false); return
          }
          const professionalName = data.providerProfile.professionalName || data.name || 'Sem nome'
          const resolvedAvatar = resolveAvatarFromDoc(data)
          const titles = data.providerProfile.mediaTitles || {}
          setMediaTitles(titles)
          setProvider({
            id: docSnap.id, name: data.name || 'Sem nome', professionalName,
            avatar: data.avatar || '', providerAvatar: resolvedAvatar,
            email: data.email || '', isMock: false,
            providerProfile: {
              professionalName, specialty: data.providerProfile.specialty || 'Profissional',
              bio: data.providerProfile.bio || 'Sem descrição',
              city: data.providerProfile.city || 'Diamantina',
              neighborhood: data.providerProfile.neighborhood || 'Centro',
              priceFrom: data.providerProfile.priceFrom || 100,
              skills: data.providerProfile.skills || [],
              phone: data.providerProfile.phone || '',
              coverImage: data.providerProfile.coverImage || '',
              responseTime: data.providerProfile.responseTime || 'Menos de 1 hora',
              completedJobs: data.providerProfile.completedJobs || 0,
              rating: data.providerProfile.rating || 5.0,
              reviewCount: data.providerProfile.reviewCount || 0,
              verified: data.providerProfile.verified !== false,
              socialLinks: data.providerProfile.socialLinks || undefined,
              media: data.providerProfile.media || { photos: [], videos: [], audios: [] },
              mediaTitles: titles,
            }
          })
        } else {
          setError('Perfil não encontrado')
        }
      } catch { setError('Erro ao carregar perfil') }
      finally { setLoading(false) }
    }
    loadProvider()
  }, [id])

  const handleOpenChat = () => {
    if (!provider || provider.isMock) return
    if (!user) { navigate(`/entrar?redirect=/prestador/${provider.id}`); return }
    if (user.id === provider.id) return
    navigate(`/chat?with=${provider.id}`)
  }

  if (loading) return (
    <div className="min-h-screen pt-16 pb-20 flex items-center justify-center">
      <div className="text-center"><Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" /><p className="text-muted text-sm">Carregando perfil...</p></div>
    </div>
  )

  if (error || !provider) return (
    <div className="min-h-screen pt-16 pb-20 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-10 h-10 text-muted" /></div>
        <h2 className="text-2xl font-black text-white mb-2">Perfil não encontrado</h2>
        <p className="text-muted mb-2 text-sm">{error || 'Este perfil não existe ou foi removido'}</p>
        {id && <p className="text-xs text-muted/60 mb-6 font-mono bg-surface px-3 py-2 rounded border border-border inline-block">ID: {id}</p>}
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate('/')} className="px-6 py-3 bg-primary text-background font-bold rounded-xl hover:bg-primary-dark transition-colors">Voltar para Home</button>
          {user?.id === id && <button onClick={() => navigate('/tornar-se-prestador')} className="px-6 py-3 bg-surface border border-primary text-primary font-bold rounded-xl hover:bg-primary/10 transition-colors">Criar Perfil</button>}
        </div>
      </div>
    </div>
  )

  const photos = provider.providerProfile.media?.photos || []
  const videos = provider.providerProfile.media?.videos || []
  const audios = provider.providerProfile.media?.audios || []
  const socialLinks = provider.providerProfile.socialLinks
  const displayName = provider.professionalName || provider.name
  const hasSocialLinks = socialLinks && Object.values(socialLinks).some(v => v && v.trim() !== '')
  const isOwnProfile = user?.id === provider.id
  const showMessageBtn = !provider.isMock && !isOwnProfile
  const canComment = !provider.isMock

  // Índices globais na fila allItems
  const photoStartIdx = 0
  const videoStartIdx = photos.length
  const audioStartIdx = photos.length + videos.length

  // Item de áudio atualmente exibido no MiniPlayer
  const activeMiniItem = audios[activeMiniIdx]
    ? toMediaItem(audios[activeMiniIdx], 'audio', activeMiniIdx)
    : null

  return (
    <div className="min-h-screen pt-16 pb-32 lg:pb-20">
      {provider.isMock && (
        <div className="fixed top-16 left-0 right-0 z-50 bg-gradient-to-r from-red-500/90 to-orange-500/90 backdrop-blur-sm py-2 px-4 text-center">
          <div className="flex items-center justify-center gap-2 text-white text-sm font-bold"><Sparkles className="w-4 h-4" />PERFIL DE EXEMPLO - Dados fictícios para demonstração<Sparkles className="w-4 h-4" /></div>
        </div>
      )}

      <div className={`relative h-48 sm:h-64 lg:h-80 bg-gradient-to-br from-primary/20 to-background ${provider.isMock ? 'mt-10' : ''}`}>
        {provider.providerProfile.coverImage
          ? <img src={provider.providerProfile.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
          : <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-background" />}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 sm:-mt-24 lg:-mt-32 relative z-10">
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          <div className="w-full lg:col-span-2 space-y-4 sm:space-y-6">

            {/* Card principal */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-surface border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start">
                <UserAvatar src={provider.providerAvatar} name={displayName} size={112} className="border-4 border-background rounded-xl sm:rounded-2xl shrink-0" />
                <div className="flex-1 w-full">
                  <div className="flex flex-col gap-3 mb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 text-center sm:text-left">
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white mb-1">{displayName}</h1>
                        <p className="text-primary text-base sm:text-lg font-semibold">{provider.providerProfile.specialty}</p>
                      </div>
                      {isOnline && <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/20 border border-green-500/40 rounded-full"><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /><span className="text-xs font-semibold text-green-400">Online agora</span></div>}
                      {!isOnline && lastSeen && <p className="text-xs text-muted">{formatLastSeen(lastSeen)}</p>}
                      {provider.providerProfile.verified && <div className="hidden sm:flex items-center gap-1 bg-primary/20 border border-primary/30 text-primary px-3 py-1.5 rounded-full text-xs font-semibold shrink-0"><CheckCircle className="w-3.5 h-3.5" />Verificado</div>}
                    </div>
                    {provider.providerProfile.verified && <div className="sm:hidden flex items-center justify-center gap-1 bg-primary/20 border border-primary/30 text-primary px-3 py-1.5 rounded-full text-xs font-semibold"><CheckCircle className="w-3.5 h-3.5" />Verificado</div>}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted mb-4">
                    <div className="flex items-center justify-center sm:justify-start gap-1"><Star className="w-4 h-4 text-yellow-400" fill="currentColor" /><span className="text-white font-semibold">{reviewCount > 0 ? averageRating.toFixed(1) : provider.providerProfile.rating}</span><span>({reviewCount > 0 ? reviewCount : provider.providerProfile.reviewCount} avaliações)</span></div>
                    <div className="flex items-center justify-center sm:justify-start gap-1"><MapPin className="w-4 h-4" />{provider.providerProfile.city}, {provider.providerProfile.neighborhood}</div>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    {provider.providerProfile.skills.map((skill, i) => <span key={i} className="px-2.5 sm:px-3 py-1 bg-background border border-border rounded-full text-[10px] sm:text-xs text-muted">{skill}</span>)}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Sobre */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-surface border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6">
              <h2 className="text-base sm:text-lg lg:text-xl font-bold text-white mb-3 sm:mb-4">Sobre</h2>
              <p className="text-muted text-sm sm:text-base leading-relaxed whitespace-pre-wrap">{provider.providerProfile.bio}</p>
            </motion.div>

            {/* Redes Sociais */}
            {hasSocialLinks && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-surface border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <h2 className="text-base sm:text-lg lg:text-xl font-bold text-white">Redes Sociais</h2>
                </div>

                {user ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {socialLinks?.instagram && <SocialButton icon={Instagram} label="Instagram" url={getSocialUrl('instagram', socialLinks.instagram)} />}
                    {socialLinks?.facebook && <SocialButton icon={Facebook} label="Facebook" url={getSocialUrl('facebook', socialLinks.facebook)} />}
                    {socialLinks?.youtube && <SocialButton icon={Youtube} label="YouTube" url={getSocialUrl('youtube', socialLinks.youtube)} />}
                    {socialLinks?.whatsapp && <SocialButton icon={MessageCircle} label="WhatsApp" url={getSocialUrl('whatsapp', socialLinks.whatsapp)} />}
                    {socialLinks?.tiktok && <SocialButton icon={VideoIcon} label="TikTok" url={getSocialUrl('tiktok', socialLinks.tiktok)} />}
                    {socialLinks?.linkedin && <SocialButton icon={Linkedin} label="LinkedIn" url={getSocialUrl('linkedin', socialLinks.linkedin)} />}
                    {socialLinks?.website && <SocialButton icon={Globe} label="Website" url={getSocialUrl('website', socialLinks.website)} />}
                  </div>
                ) : (
                  <button
                    onClick={() => navigate(`/entrar?redirect=/prestador/${provider.id}`)}
                    className="w-full flex items-center justify-center gap-3 py-4 border border-dashed border-border rounded-xl text-muted hover:border-primary hover:text-primary transition-all group"
                  >
                    <Lock className="w-4 h-4 group-hover:text-primary transition-colors" />
                    <span className="text-sm font-medium">Faça login para ver os contatos</span>
                  </button>
                )}
              </motion.div>
            )}

            {/* ── Galeria de Fotos ── */}
            {photos.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-surface border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-2"><ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /><h2 className="text-base sm:text-lg lg:text-xl font-bold text-white">Galeria de Fotos</h2></div>
                  <span className="text-[10px] sm:text-xs text-muted">{photos.length} foto{photos.length > 1 ? 's' : ''}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  {photos.map((url, i) => {
                    const count = commentCounts[`photo-${i}`] ?? 0
                    return (
                      <div key={i} className="relative group cursor-pointer" onClick={() => openViewer(photoStartIdx + i)}>
                        <ProgressiveImage src={url} alt={`Foto ${i + 1}`} className="aspect-square rounded-lg" />
                        <CommentBadge count={count} />
                        <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/20 transition-colors flex items-end justify-end p-2">
                          {count > 0 && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-black/70 backdrop-blur-sm rounded-full text-white text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                              <MessageSquare className="w-3 h-3" />{count > 99 ? '99+' : count}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* ── Vídeos ── */}
            {videos.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-surface border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-2"><VideoIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /><h2 className="text-base sm:text-lg lg:text-xl font-bold text-white">Vídeos</h2></div>
                  <span className="text-[10px] sm:text-xs text-muted">{videos.length} vídeo{videos.length > 1 ? 's' : ''}</span>
                </div>
                <VideoCarousel>
                  {videos.map((url, i) => {
                    const count = commentCounts[`video-${i}`] ?? 0
                    return (
                      <div key={i} className="flex-none w-[240px] sm:w-[280px] lg:w-[320px] snap-start relative group cursor-pointer" onClick={() => openViewer(videoStartIdx + i)}>
                        {isValidYouTubeUrl(url)
                          ? <YouTubeEmbed videoUrl={url} title={`Vídeo ${i + 1}`} showThumbnail />
                          : <div className="aspect-video rounded-lg overflow-hidden bg-background"><video src={url} className="w-full h-full object-cover" /></div>
                        }
                        <CommentBadge count={count} />
                        {count > 0 && (
                          <span className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 bg-black/70 backdrop-blur-sm rounded-full text-white text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                            <MessageSquare className="w-3 h-3" />{count > 99 ? '99+' : count}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </VideoCarousel>
              </motion.div>
            )}

            {/* ── Áudios: MiniPlayer + lista de tracks ── */}
            {audios.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-surface border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6"
              >
                {/* Cabeçalho da seção */}
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    <h2 className="text-base sm:text-lg lg:text-xl font-bold text-white">Áudios</h2>
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted">
                    {audios.length} áudio{audios.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* MiniPlayer do áudio ativo */}
                {activeMiniItem && (
                  <div className="mb-4">
                    <AudioMiniPlayer
                      key={activeMiniItem.id}
                      src={activeMiniItem.url}
                      title={activeMiniItem.title}
                      meta={activeMiniItem.duration
                        ? `${Math.floor(activeMiniItem.duration / 60)}:${String(activeMiniItem.duration % 60).padStart(2, '0')} · áudio`
                        : 'Áudio'
                      }
                      onOpenGallery={() => openViewer(audioStartIdx + activeMiniIdx)}
                    />
                  </div>
                )}

                {/* Lista de tracks — clique troca o MiniPlayer; ícone de comentários abre o viewer */}
                {audios.length > 1 && (
                  <div className="space-y-2">
                    {audios.map((url, i) => {
                      const count   = commentCounts[`audio-${i}`] ?? 0
                      const isActive = i === activeMiniIdx
                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors cursor-pointer
                            ${
                              isActive
                                ? 'border-primary bg-primary/10'
                                : 'border-border bg-background hover:border-primary/40'
                            }`}
                          onClick={() => setActiveMiniIdx(i)}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                            ${ isActive ? 'bg-primary' : 'bg-primary/20' }`}>
                            <Music className={`w-4 h-4 ${ isActive ? 'text-white' : 'text-primary' }`} />
                          </div>
                          <span className={`flex-1 text-sm font-medium truncate
                            ${ isActive ? 'text-white' : 'text-muted' }`}>
                            Áudio {i + 1}
                          </span>
                          {/* Botão de comentários */}
                          {canComment && (
                            <button
                              onClick={e => { e.stopPropagation(); openViewer(audioStartIdx + i) }}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-surface border border-border rounded-full text-muted text-[10px] font-semibold hover:border-primary hover:text-primary transition-colors flex-shrink-0"
                            >
                              <MessageSquare className="w-3 h-3" />
                              {count > 0 ? (count > 99 ? '99+' : count) : 'Ver'}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Avaliações ── */}
            {!provider.isMock && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-surface border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <div className="flex items-center gap-2"><Star className="w-4 h-4 sm:w-5 sm:h-5 text-primary" fill="currentColor" /><h2 className="text-base sm:text-lg lg:text-xl font-bold text-white">Avaliações</h2></div>
                  {user && !isOwnProfile && <button onClick={() => setReviewModalOpen(true)} className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 border border-primary/30 text-primary text-xs font-bold rounded-lg hover:bg-primary/20 transition-colors"><Star className="w-3.5 h-3.5" fill="currentColor" />{reviews.some(r => r.clientId === user.id) ? 'Editar avaliação' : 'Avaliar'}</button>}
                </div>
                {reviewCount > 0 && <div className="mb-6 pb-6 border-b border-border"><RatingDistribution average={averageRating} total={reviewCount} distribution={distribution} /></div>}
                {loadingReviews
                  ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
                  : reviews.length === 0
                    ? (<div className="text-center py-8"><Star className="w-10 h-10 text-muted mx-auto mb-3" /><p className="text-white font-semibold text-sm">Nenhuma avaliação ainda</p><p className="text-muted text-xs mt-1">Seja o primeiro a avaliar este prestador</p>{user && !isOwnProfile && <button onClick={() => setReviewModalOpen(true)} className="mt-4 px-5 py-2.5 bg-primary text-background text-sm font-bold rounded-xl hover:bg-primary-dark transition-colors">Avaliar agora</button>}</div>)
                    : <div className="space-y-3">{reviews.map(review => <ReviewCard key={review.id} review={review} isProviderOwner={false} />)}</div>
                }
              </motion.div>
            )}

          </div>

          {/* Sidebar desktop */}
          <div className="hidden lg:block w-full space-y-6">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-surface border border-border rounded-2xl p-6 sticky top-20">
              <div className="text-center mb-6"><p className="text-muted text-sm mb-1">A partir de</p><p className="text-3xl font-black text-white">R$ {provider.providerProfile.priceFrom}<span className="text-lg text-muted font-normal">/serviço</span></p></div>
              <div className="space-y-3 mb-6">
                <button onClick={() => !provider.isMock && setModalOpen(true)} disabled={provider.isMock || isOwnProfile} className="w-full bg-primary text-background font-bold py-3.5 rounded-xl hover:bg-primary-dark transition-colors touch-target disabled:opacity-50 disabled:cursor-not-allowed">
                  <Calendar className="w-5 h-5 inline mr-2" />{provider.isMock ? 'Perfil de Exemplo' : isOwnProfile ? 'Seu perfil' : 'Solicitar Serviço'}
                </button>
                {showMessageBtn && <button onClick={handleOpenChat} className="w-full bg-surface border-2 border-primary text-primary font-bold py-3.5 rounded-xl hover:bg-primary/10 transition-colors touch-target"><MessageCircle className="w-5 h-5 inline mr-2" />{user ? 'Enviar Mensagem' : 'Entrar para Mensagem'}</button>}
                {user && !isOwnProfile && !provider.isMock && <button onClick={() => setReviewModalOpen(true)} className="w-full bg-surface border border-border text-muted font-bold py-3.5 rounded-xl hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"><Star className="w-4 h-4" fill="none" />{reviews.some(r => r.clientId === user.id) ? 'Editar avaliação' : 'Avaliar prestador'}</button>}
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-muted"><Clock className="w-5 h-5 text-primary shrink-0" /><div><p className="text-white font-semibold">Tempo de resposta</p><p>{provider.providerProfile.responseTime}</p></div></div>
                <div className="flex items-center gap-3 text-muted"><CheckCircle className="w-5 h-5 text-primary shrink-0" /><div><p className="text-white font-semibold">Trabalhos concluídos</p><p>{provider.providerProfile.completedJobs}+</p></div></div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Barra inferior mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-lg border-t border-border p-3 sm:p-4 z-40">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-3"><p className="text-muted text-xs mb-0.5">A partir de</p><p className="text-xl font-black text-white">R$ {provider.providerProfile.priceFrom}<span className="text-sm text-muted font-normal">/serviço</span></p></div>
          <div className={`flex gap-2 sm:gap-3 ${!showMessageBtn ? 'justify-center' : ''}`}>
            <button onClick={() => !provider.isMock && !isOwnProfile && setModalOpen(true)} disabled={provider.isMock || isOwnProfile} className={`${showMessageBtn ? 'flex-1' : 'w-48'} bg-primary text-background font-bold py-3.5 rounded-xl hover:bg-primary-dark transition-colors text-sm touch-target disabled:opacity-50`}>
              <Calendar className="w-4 h-4 inline mr-1.5" />{provider.isMock ? 'Exemplo' : isOwnProfile ? 'Seu perfil' : 'Solicitar'}
            </button>
            {showMessageBtn && <button onClick={handleOpenChat} className="flex-1 bg-surface border-2 border-primary text-primary font-bold py-3.5 rounded-xl hover:bg-primary/10 transition-colors text-sm touch-target"><MessageCircle className="w-4 h-4 inline mr-1.5" />{user ? 'Mensagem' : 'Entrar'}</button>}
          </div>
        </div>
      </div>

      {/* Modais */}
      {!provider.isMock && <RequestServiceModal isOpen={modalOpen} onClose={() => setModalOpen(false)} provider={{ id: provider.id, name: displayName, avatar: provider.providerAvatar, specialty: provider.providerProfile.specialty, priceFrom: provider.providerProfile.priceFrom }} />}
      {!provider.isMock && user && !isOwnProfile && <ReviewModal open={reviewModalOpen} onClose={() => setReviewModalOpen(false)} providerId={provider.id} providerName={displayName} />}

      {/* ── Media Viewer unificado ── */}
      {canComment && (
        <MediaViewerModal
          isOpen={viewerOpen}
          onClose={closeViewer}
          items={allItems}
          initialIndex={viewerIndex}
          providerId={provider.id}
          currentUser={commentUser}
          isOwner={isOwnProfile}
          mediaTitles={mediaTitles}
          onTitleSaved={(mediaId, newTitle) =>
            setMediaTitles(prev => ({ ...prev, [mediaId]: newTitle }))
          }
        />
      )}
    </div>
  )
}
