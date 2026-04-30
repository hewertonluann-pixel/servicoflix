import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Star, MapPin, Clock, CheckCircle, Calendar, MessageCircle,
  Video as VideoIcon, Image as ImageIcon, Music, Loader2, AlertCircle,
  Sparkles, Instagram, Facebook, Youtube, Globe, Linkedin, Lock,
  ChevronLeft, Zap, Info
} from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'
import { isValidYouTubeUrl } from '@/components/YouTubeEmbed'
import { RequestServiceModal } from '@/components/RequestServiceModal'
import { UserAvatar } from '@/components/UserAvatar'
import { mockProviders } from '@/data/mock'
import { SocialLinks } from '@/types'
import { resolveAvatarFromDoc } from '@/lib/avatarUtils'
import { useUserPresence, formatLastSeen } from '@/hooks/usePresence'
import { useReviews } from '@/hooks/useReviews'
import { ReviewModal } from '@/components/ReviewModal'
import { MediaViewerModal } from '@/components/MediaViewerModal'
import { useMediaCommentCounts } from '@/hooks/useMediaCommentCounts'
import type { MediaItem } from '@/types'

// ─── Types ────────────────────────────────────────────────
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
    media?: { photos: string[]; videos: string[]; audios: string[] }
    mediaTitles?: Record<string, string>
  }
}

// ─── Mock data (igual ao original) ───────────────────────
const mockPhotos = [
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80',
  'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&q=80',
  'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=800&q=80',
  'https://images.unsplash.com/photo-1471478331149-c72f17e33c73?w=800&q=80',
  'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=800&q=80',
  'https://images.unsplash.com/photo-1510915228340-29c85a43dcfe?w=800&q=80',
]
const mockVideos = ['https://www.youtube.com/watch?v=dQw4w9WgXcQ']

// ─── Helpers ──────────────────────────────────────────────
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
      return `https://wa.me/${value.replace(/\D/g, '')}`
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

const toMediaItem = (url: string, type: 'photo' | 'video' | 'audio', index: number): MediaItem => ({
  id: `${type}-${index}`,
  type,
  url,
  title: `${type === 'photo' ? 'Foto' : type === 'video' ? 'Vídeo' : 'Áudio'} ${index + 1}`,
  uploadedAt: '',
  order: index,
})

const renderStars = (rating: number) => {
  return Array.from({ length: 5 }, (_, i) => (
    <Star
      key={i}
      className={`w-3.5 h-3.5 ${
        i < Math.round(rating) ? 'text-primary fill-primary' : 'text-border'
      }`}
    />
  ))
}

// ─── Sub-components ───────────────────────────────────────
const SocialBtn = ({ icon: Icon, label, url }: { icon: any; label: string; url: string }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-2.5 px-3.5 py-3 bg-[#1a231a] border border-border
               rounded-xl text-muted text-xs font-semibold
               hover:border-primary hover:text-primary hover:bg-primary/5
               transition-all duration-200"
  >
    <Icon className="w-4 h-4 flex-shrink-0" />
    {label}
  </a>
)

const SectionHeader = ({ icon: Icon, title, badge }: { icon: any; title: string; badge?: string }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-primary" />
      <h2 className="text-[15px] font-extrabold text-white">{title}</h2>
    </div>
    {badge && (
      <span className="text-[11px] text-muted bg-[#1a231a] border border-border px-3 py-1 rounded-full">
        {badge}
      </span>
    )}
  </div>
)

// ─── Main Component ───────────────────────────────────────
export const ProviderProfilePage2 = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useSimpleAuth()

  const [provider, setProvider] = useState<ProviderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)
  const [mediaTitles, setMediaTitles] = useState<Record<string, string>>({})

  const openViewer = (index: number) => { setViewerIndex(index); setViewerOpen(true) }

  const commentUser = user
    ? { uid: user.id, displayName: user.name ?? null, photoURL: user.avatar ?? null }
    : null

  const { isOnline, lastSeen } = useUserPresence(
    loading || !provider || provider.isMock ? null : provider.id
  )

  const { reviews, loading: loadingReviews, averageRating, reviewCount, distribution } = useReviews(
    provider?.isMock ? undefined : id
  )

  const allItems = useMemo<MediaItem[]>(() => {
    if (!provider) return []
    const p = provider.providerProfile.media
    if (!p) return []
    const photos = (p.photos || []).map((url, i) => toMediaItem(url, 'photo', i))
    const videos = (p.videos || []).map((url, i) => toMediaItem(url, 'video', i))
    const audios = (p.audios || []).map((url, i) => toMediaItem(url, 'audio', i))
    return [...photos, ...videos, ...audios]
  }, [provider])

  const allMediaIds = useMemo(() => allItems.map(it => it.id), [allItems])
  const commentCounts = useMediaCommentCounts(
    provider?.isMock ? undefined : provider?.id,
    allMediaIds
  )

  // ── Carrega dados do Firebase (igual ao original) ──
  useEffect(() => {
    const load = async () => {
      if (!id) { setError('ID não fornecido'); setLoading(false); return }
      setLoading(true); setError('')

      if (id.startsWith('mock-')) {
        const mock = mockProviders.find(p => p.id === id)
        if (mock) {
          setProvider({
            id: mock.id, name: mock.name, professionalName: mock.name,
            avatar: mock.avatar, providerAvatar: mock.avatar,
            email: '', isMock: true,
            providerProfile: {
              professionalName: mock.name, specialty: mock.specialty, bio: mock.bio,
              city: mock.city, neighborhood: mock.neighborhood,
              priceFrom: mock.priceFrom, skills: mock.skills,
              phone: mock.whatsapp || '', coverImage: mock.coverImage,
              responseTime: mock.responseTime, completedJobs: mock.completedJobs,
              rating: mock.rating, reviewCount: mock.reviewCount,
              verified: mock.isTopRated,
              socialLinks: { instagram: '@exemplo', whatsapp: '38999999999' },
              media: { photos: mockPhotos, videos: mockVideos, audios: [] },
              mediaTitles: {},
            },
          })
        } else {
          setError('Perfil de exemplo não encontrado')
        }
        setLoading(false); return
      }

      try {
        const snap = await getDoc(doc(db, 'users', id))
        if (snap.exists()) {
          const data = snap.data()
          if (!data.providerProfile) {
            setError('Este usuário não é um prestador de serviços')
            setLoading(false); return
          }
          const professionalName = data.providerProfile.professionalName || data.name || 'Sem nome'
          const resolvedAvatar = resolveAvatarFromDoc(data)
          const titles = data.providerProfile.mediaTitles || {}
          setMediaTitles(titles)
          setProvider({
            id: snap.id, name: data.name || 'Sem nome', professionalName,
            avatar: data.avatar || '', providerAvatar: resolvedAvatar,
            email: data.email || '', isMock: false,
            providerProfile: {
              professionalName,
              specialty: data.providerProfile.specialty || 'Profissional',
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
            },
          })
        } else {
          setError('Perfil não encontrado')
        }
      } catch { setError('Erro ao carregar perfil') }
      finally { setLoading(false) }
    }
    load()
  }, [id])

  const handleChat = () => {
    if (!provider || provider.isMock) return
    if (!user) { navigate(`/entrar?redirect=/prestador2/${provider.id}`); return }
    if (user.id === provider.id) return
    navigate(`/chat?with=${provider.id}`)
  }

  // ── Loading ──
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
        <p className="text-muted text-sm">Carregando perfil...</p>
      </div>
    </div>
  )

  // ── Error ──
  if (error || !provider) return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-surface border border-border rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-muted" />
        </div>
        <h2 className="text-xl font-black text-white mb-2">Perfil não encontrado</h2>
        <p className="text-muted text-sm mb-6">{error || 'Este perfil não existe ou foi removido'}</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-primary text-background font-bold rounded-xl text-sm"
        >
          Voltar para Home
        </button>
      </div>
    </div>
  )

  // ── Computed ──
  const photos  = provider.providerProfile.media?.photos || []
  const videos  = provider.providerProfile.media?.videos || []
  const audios  = provider.providerProfile.media?.audios || []
  const socialLinks = provider.providerProfile.socialLinks
  const displayName = provider.professionalName || provider.name
  const hasSocial   = socialLinks && Object.values(socialLinks).some(v => v && v.trim() !== '')
  const isOwnProfile   = user?.id === provider.id
  const showMsgBtn     = !provider.isMock && !isOwnProfile
  const showReviewBtn  = user && !isOwnProfile && !provider.isMock
  const canComment     = !provider.isMock
  const displayRating  = reviewCount > 0 ? averageRating : provider.providerProfile.rating
  const displayReviewCount = reviewCount > 0 ? reviewCount : provider.providerProfile.reviewCount

  const photoStartIdx = 0
  const videoStartIdx = photos.length
  const audioStartIdx = photos.length + videos.length

  const PHOTOS_PREVIEW = 5
  const extraPhotos = Math.max(0, photos.length - PHOTOS_PREVIEW)

  return (
    <div className="min-h-screen bg-background">

      {/* ── Banner de exemplo ── */}
      {provider.isMock && (
        <div className="fixed top-14 left-0 right-0 z-[45] bg-gradient-to-r from-red-500/90 to-orange-500/90
                        backdrop-blur-sm py-2 px-4 text-center">
          <div className="flex items-center justify-center gap-2 text-white text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            PERFIL DE EXEMPLO — Dados fictícios para demonstração
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>
      )}

      {/* ── COVER ── */}
      <div className={`relative h-[240px] overflow-hidden ${provider.isMock ? 'mt-[80px]' : 'mt-14'}`}>
        {provider.providerProfile.coverImage ? (
          <img
            src={provider.providerProfile.coverImage}
            alt=""
            className="w-full h-full object-cover"
            style={{ filter: 'brightness(0.28) saturate(1.1)' }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-background" />
        )}
        {/* Gradiente de fade para o fundo */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, transparent 0%, rgba(10,15,10,0.6) 55%, #0a0f0a 100%)'
          }}
        />
        {/* Tag de categoria */}
        <div
          className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5
                     bg-primary/10 border border-primary/30 text-primary
                     text-[11px] font-bold rounded-full backdrop-blur-md
                     uppercase tracking-wide"
        >
          <Zap className="w-3 h-3" />
          {provider.providerProfile.specialty}
        </div>
      </div>

      {/* ── CONTEÚDO PRINCIPAL ── */}
      <div
        className="relative z-10 max-w-[860px] mx-auto px-4 pb-32"
        style={{ marginTop: '-70px' }}
      >

        {/* ═══ CARD DE PERFIL ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface border border-border rounded-[20px] p-[22px] flex flex-col gap-[18px]"
        >
          {/* Avatar + info */}
          <div className="flex gap-4 items-start">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <UserAvatar
                src={provider.providerAvatar}
                name={displayName}
                size={86}
                className="rounded-2xl border-[2.5px] border-primary"
              />
              {/* Badge online/offline */}
              {isOnline ? (
                <div
                  className="absolute -bottom-1.5 -right-1.5 flex items-center gap-1
                             bg-[#4ade80] border-[2px] border-surface
                             rounded-full px-2 py-0.5 text-[10px] font-bold text-[#052e16]
                             whitespace-nowrap"
                >
                  <span className="w-1.5 h-1.5 bg-[#052e16] rounded-full animate-pulse" />
                  Online
                </div>
              ) : lastSeen ? (
                <div
                  className="absolute -bottom-1.5 -right-1.5
                             bg-[#1a231a] border border-border
                             rounded-full px-2 py-0.5 text-[10px] font-medium text-muted
                             whitespace-nowrap"
                >
                  {formatLastSeen(lastSeen)}
                </div>
              ) : null}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-[21px] font-black leading-tight text-white truncate">{displayName}</h1>
              <p className="text-primary text-[13px] font-semibold mt-0.5">
                {provider.providerProfile.specialty}
              </p>

              {/* Meta chips */}
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2.5">
                <div className="flex items-center gap-1 text-[12px] text-muted">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{provider.providerProfile.city}, {provider.providerProfile.neighborhood}</span>
                </div>
                <div className="flex items-center gap-1 text-[12px] text-muted">
                  <Star className="w-3.5 h-3.5 flex-shrink-0 text-primary fill-primary" />
                  <span className="text-white font-bold">{displayRating.toFixed(1)}</span>
                  <span>({displayReviewCount})</span>
                </div>
                <div className="flex items-center gap-1 text-[12px] text-muted">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{provider.providerProfile.responseTime}</span>
                </div>
              </div>

              {/* Verificado */}
              {provider.providerProfile.verified && (
                <div className="inline-flex items-center gap-1 mt-2
                               bg-primary/10 border border-primary/30 text-primary
                               text-[11px] font-bold px-2.5 py-1 rounded-full">
                  <CheckCircle className="w-3 h-3" />
                  Perfil Verificado
                </div>
              )}
            </div>
          </div>

          {/* Stats 3 colunas */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { num: `${provider.providerProfile.completedJobs}+`, lbl: 'Serviços feitos' },
              { num: displayRating.toFixed(1), lbl: 'Avaliação' },
              { num: `${provider.providerProfile.reviewCount}`, lbl: 'Avaliações' },
            ].map(({ num, lbl }) => (
              <div
                key={lbl}
                className="bg-[#1a231a] border border-border rounded-[14px] py-3.5 text-center"
              >
                <div className="text-[22px] font-black text-primary leading-none">{num}</div>
                <div className="text-[10px] text-muted mt-1 font-medium">{lbl}</div>
              </div>
            ))}
          </div>

          {/* Skills */}
          {provider.providerProfile.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {provider.providerProfile.skills.map((s, i) => (
                <span
                  key={i}
                  className="bg-[#1a231a] border border-border text-muted text-[11px]
                             font-medium px-3 py-1 rounded-full
                             hover:border-primary hover:text-primary transition-all duration-200"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </motion.div>

        {/* ═══ SOBRE ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-surface border border-border rounded-[20px] p-5 mt-3"
        >
          <SectionHeader icon={Info} title="Sobre" />
          <p className="text-[14px] text-muted leading-[1.75] whitespace-pre-wrap">
            {provider.providerProfile.bio}
          </p>
        </motion.div>

        {/* ═══ GALERIA DE FOTOS ═══ */}
        {photos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-surface border border-border rounded-[20px] p-5 mt-3"
          >
            <SectionHeader
              icon={ImageIcon}
              title="Galeria de Fotos"
              badge={`${photos.length} foto${photos.length > 1 ? 's' : ''}`}
            />
            <div className="grid grid-cols-3 gap-2">
              {photos.slice(0, PHOTOS_PREVIEW).map((url, i) => (
                <div
                  key={i}
                  onClick={() => openViewer(photoStartIdx + i)}
                  className="relative aspect-square rounded-xl overflow-hidden cursor-pointer
                             border border-border group"
                >
                  <img
                    src={url}
                    alt={`Foto ${i + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.07]"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300
                                  flex items-center justify-center">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center
                                    opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="#052e16">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
              {extraPhotos > 0 && (
                <div
                  onClick={() => openViewer(PHOTOS_PREVIEW)}
                  className="aspect-square bg-[#1a231a] border border-dashed border-border
                             rounded-xl flex flex-col items-center justify-center cursor-pointer
                             hover:border-primary transition-colors duration-200"
                >
                  <span className="text-[20px] font-black text-primary">+{extraPhotos}</span>
                  <span className="text-[10px] text-muted">ver tudo</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ═══ VÍDEOS ═══ */}
        {videos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-surface border border-border rounded-[20px] p-5 mt-3"
          >
            <SectionHeader
              icon={VideoIcon}
              title="Vídeos"
              badge={`${videos.length} vídeo${videos.length > 1 ? 's' : ''}`}
            />
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {videos.map((url, i) => (
                <div
                  key={i}
                  onClick={() => openViewer(videoStartIdx + i)}
                  className="flex-none w-[200px] aspect-video rounded-xl overflow-hidden
                             border border-border cursor-pointer relative group"
                >
                  {isValidYouTubeUrl(url) ? (
                    <img
                      src={`https://img.youtube.com/vi/${url.match(/(?:v=|youtu\.be\/)([^&?/]+)/)?.[1]}/hqdefault.jpg`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video src={url} className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-all
                                  flex items-center justify-center">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#052e16">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ ÁUDIOS ═══ */}
        {audios.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
            className="bg-surface border border-border rounded-[20px] p-5 mt-3"
          >
            <SectionHeader
              icon={Music}
              title="Áudios"
              badge={`${audios.length} áudio${audios.length > 1 ? 's' : ''}`}
            />
            <div className="flex flex-col gap-2">
              {audios.map((_, i) => {
                const mediaId = `audio-${i}`
                const count = commentCounts[mediaId] ?? 0
                const title = mediaTitles[mediaId]?.trim() || `Áudio ${i + 1}`
                return (
                  <div
                    key={i}
                    onClick={() => openViewer(audioStartIdx + i)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border
                               bg-[#1a231a] hover:border-primary/50 transition-colors cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Music className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="flex-1 text-[13px] text-muted group-hover:text-white transition-colors truncate">
                      {title}
                    </span>
                    {count > 0 && (
                      <span className="text-[10px] text-muted bg-surface border border-border
                                       px-2 py-1 rounded-full flex-shrink-0">
                        {count > 99 ? '99+' : count} comentários
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* ═══ AVALIAÇÕES ═══ */}
        {!provider.isMock && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-surface border border-border rounded-[20px] p-5 mt-3"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-primary fill-primary" />
                <h2 className="text-[15px] font-extrabold text-white">Avaliações</h2>
              </div>
              <div className="flex items-center gap-2">
                {displayReviewCount > 0 && (
                  <span className="text-[11px] text-muted bg-[#1a231a] border border-border px-3 py-1 rounded-full">
                    {displayReviewCount} reviews
                  </span>
                )}
                {showReviewBtn && (
                  <button
                    onClick={() => setReviewModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/30
                               text-primary text-[11px] font-bold rounded-lg hover:bg-primary/20 transition-colors"
                  >
                    <Star className="w-3 h-3" />
                    {reviews.some(r => r.clientId === user?.id) ? 'Editar' : 'Avaliar'}
                  </button>
                )}
              </div>
            </div>

            {/* Resumo de notas */}
            {displayReviewCount > 0 && (
              <div className="flex gap-4 items-center mb-4">
                <div className="text-center flex-shrink-0">
                  <div className="text-[52px] font-black text-primary leading-none">
                    {displayRating.toFixed(1)}
                  </div>
                  <div className="flex gap-0.5 justify-center mt-1">
                    {renderStars(displayRating)}
                  </div>
                  <div className="text-[11px] text-muted mt-1">{displayReviewCount} avaliações</div>
                </div>
                <div className="flex-1">
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = distribution?.[star] ?? 0
                    const pct = displayReviewCount > 0 ? Math.round((count / displayReviewCount) * 100) : 0
                    return (
                      <div key={star} className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] text-muted w-2.5 text-right">{star}</span>
                        <div className="flex-1 h-[5px] bg-[#1a231a] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-muted w-5 text-right">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Divisor */}
            <div className="border-t border-border mb-4" />

            {/* Lista de reviews */}
            {loadingReviews ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-8">
                <Star className="w-8 h-8 text-muted mx-auto mb-2" />
                <p className="text-white font-semibold text-sm">Nenhuma avaliação ainda</p>
                <p className="text-muted text-xs mt-1">Seja o primeiro a avaliar</p>
                {showReviewBtn && (
                  <button
                    onClick={() => setReviewModalOpen(true)}
                    className="mt-4 px-5 py-2.5 bg-primary text-background text-sm font-bold rounded-xl"
                  >
                    Avaliar agora
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {reviews.slice(0, 5).map(review => (
                  <div
                    key={review.id}
                    className="bg-[#1a231a] border border-border rounded-[14px] p-4"
                  >
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <div
                        className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center
                                   font-extrabold text-[13px] text-white"
                        style={{ background: 'linear-gradient(135deg, #059669, #064e3b)' }}
                      >
                        {(review.clientName || '?').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-bold text-white truncate">{review.clientName}</div>
                        <div className="flex gap-0.5 mt-0.5">{renderStars(review.rating)}</div>
                      </div>
                    </div>
                    <p className="text-[13px] text-muted leading-[1.65]">{review.comment}</p>
                  </div>
                ))}
                {reviews.length > 5 && (
                  <button
                    onClick={() => setReviewModalOpen(true)}
                    className="w-full mt-1 py-2.5 border border-border text-muted text-[13px] font-semibold
                               rounded-xl hover:border-primary hover:text-primary transition-all duration-200"
                  >
                    Ver todas as {reviews.length} avaliações
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ═══ REDES SOCIAIS ═══ */}
        {hasSocial && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="bg-surface border border-border rounded-[20px] p-5 mt-3"
          >
            <SectionHeader icon={Globe} title="Redes Sociais" />

            {user ? (
              <div className="grid grid-cols-2 gap-2.5">
                {socialLinks?.instagram && (
                  <SocialBtn icon={Instagram} label="Instagram" url={getSocialUrl('instagram', socialLinks.instagram)} />
                )}
                {socialLinks?.whatsapp && (
                  <SocialBtn icon={MessageCircle} label="WhatsApp" url={getSocialUrl('whatsapp', socialLinks.whatsapp)} />
                )}
                {socialLinks?.youtube && (
                  <SocialBtn icon={Youtube} label="YouTube" url={getSocialUrl('youtube', socialLinks.youtube)} />
                )}
                {socialLinks?.facebook && (
                  <SocialBtn icon={Facebook} label="Facebook" url={getSocialUrl('facebook', socialLinks.facebook)} />
                )}
                {socialLinks?.tiktok && (
                  <SocialBtn icon={VideoIcon} label="TikTok" url={getSocialUrl('tiktok', socialLinks.tiktok)} />
                )}
                {socialLinks?.linkedin && (
                  <SocialBtn icon={Linkedin} label="LinkedIn" url={getSocialUrl('linkedin', socialLinks.linkedin)} />
                )}
                {socialLinks?.website && (
                  <SocialBtn icon={Globe} label="Website" url={getSocialUrl('website', socialLinks.website)} />
                )}
              </div>
            ) : (
              <button
                onClick={() => navigate(`/entrar?redirect=/prestador2/${provider.id}`)}
                className="w-full flex items-center justify-center gap-2.5 py-4
                           border border-dashed border-border rounded-xl text-muted
                           hover:border-primary hover:text-primary transition-all group"
              >
                <Lock className="w-4 h-4" />
                <span className="text-sm font-medium">Faça login para ver os contatos</span>
              </button>
            )}
          </motion.div>
        )}

      </div>{/* /profile-wrapper */}

      {/* ═══ STICKY BOTTOM CTA ═══ */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-5 pt-3"
        style={{ background: 'linear-gradient(to top, rgba(10,15,10,1) 65%, transparent)' }}
      >
        <div className="max-w-[860px] mx-auto bg-surface border border-border rounded-[16px] p-3.5
                        flex items-center gap-3">
          {/* Preço */}
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-muted">A partir de</div>
            <div>
              <span className="text-[20px] font-black text-white">
                R$ {provider.providerProfile.priceFrom}
              </span>
              <span className="text-[11px] text-muted ml-0.5">/serviço</span>
            </div>
          </div>

          {/* Botões */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {showMsgBtn && (
              <button
                onClick={handleChat}
                className="flex items-center gap-1.5 px-4 py-2.5 border-[1.5px] border-primary
                           text-primary font-bold text-[13px] rounded-xl
                           hover:bg-primary/10 transition-all duration-200"
              >
                <MessageCircle className="w-4 h-4" />
                {user ? 'Chat' : 'Entrar'}
              </button>
            )}
            {!provider.isMock && !isOwnProfile && (
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-primary text-[#052e16]
                           font-extrabold text-[13px] rounded-xl
                           hover:bg-primary-dark transition-all duration-200 active:scale-95"
              >
                <Calendar className="w-4 h-4" />
                Contratar
              </button>
            )}
            {isOwnProfile && (
              <span className="px-4 py-2.5 bg-[#1a231a] border border-border
                               text-muted rounded-xl text-[13px] font-semibold">
                Seu perfil
              </span>
            )}
            {provider.isMock && (
              <span className="px-4 py-2.5 bg-[#1a231a] border border-border
                               text-muted rounded-xl text-[13px] font-semibold">
                Perfil de Exemplo
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ═══ MODAIS ═══ */}
      {!provider.isMock && (
        <RequestServiceModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          provider={{
            id: provider.id,
            name: displayName,
            avatar: provider.providerAvatar,
            specialty: provider.providerProfile.specialty,
            priceFrom: provider.providerProfile.priceFrom,
          }}
        />
      )}

      {!provider.isMock && user && !isOwnProfile && (
        <ReviewModal
          open={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          providerId={provider.id}
          providerName={displayName}
        />
      )}

      {canComment && (
        <MediaViewerModal
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
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
