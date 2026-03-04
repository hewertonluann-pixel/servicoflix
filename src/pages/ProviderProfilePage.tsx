import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Star, MapPin, Clock, CheckCircle, Briefcase, Calendar, MessageCircle, 
  Video as VideoIcon, Image as ImageIcon, Music, Loader2, AlertCircle, Sparkles
} from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'
import { YouTubeEmbed, isValidYouTubeUrl } from '@/components/YouTubeEmbed'
import { VideoCarousel } from '@/components/VideoCarousel'
import { RequestServiceModal } from '@/components/RequestServiceModal'
import { mockProviders } from '@/data/mock'

interface ProviderData {
  id: string
  name: string
  avatar: string
  email: string
  isMock?: boolean
  providerProfile: {
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
    media?: {
      photos: string[]
      videos: string[]
      audios: string[]
    }
  }
}

// Fotos de exemplo para perfis mockados
const mockPhotos = [
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80',
  'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&q=80',
  'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400&q=80',
  'https://images.unsplash.com/photo-1471478331149-c72f17e33c73?w=400&q=80',
  'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400&q=80',
  'https://images.unsplash.com/photo-1510915228340-29c85a43dcfe?w=400&q=80',
]

// Vídeos de exemplo (YouTube)
const mockVideos = [
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
]

export const ProviderProfilePage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useSimpleAuth()
  const [provider, setProvider] = useState<ProviderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    const loadProvider = async () => {
      if (!id) {
        setError('ID não fornecido')
        setLoading(false)
        return
      }
      
      setLoading(true)
      setError('')
      
      // Verifica se é um perfil mockado
      if (id.startsWith('mock-')) {
        console.log('🎭 Carregando perfil de exemplo:', id)
        const mockProvider = mockProviders.find(p => p.id === id)
        
        if (mockProvider) {
          // Converte mock para formato ProviderData
          setProvider({
            id: mockProvider.id,
            name: mockProvider.name,
            avatar: mockProvider.avatar,
            email: '',
            isMock: true,
            providerProfile: {
              specialty: mockProvider.specialty,
              bio: mockProvider.bio,
              city: mockProvider.city,
              neighborhood: mockProvider.neighborhood,
              priceFrom: mockProvider.priceFrom,
              skills: mockProvider.skills,
              phone: mockProvider.whatsapp || '',
              coverImage: mockProvider.coverImage,
              responseTime: mockProvider.responseTime,
              completedJobs: mockProvider.completedJobs,
              rating: mockProvider.rating,
              reviewCount: mockProvider.reviewCount,
              verified: mockProvider.isTopRated,
              media: {
                photos: mockPhotos,
                videos: mockVideos,
                audios: []
              }
            }
          })
          setLoading(false)
          return
        } else {
          setError('Perfil de exemplo não encontrado')
          setLoading(false)
          return
        }
      }
      
      // Perfil real - busca no Firestore
      try {
        console.log('🔍 Buscando perfil:', id)
        const docRef = doc(db, 'users', id)
        const docSnap = await getDoc(docRef)
        
        if (docSnap.exists()) {
          const data = docSnap.data()
          console.log('✅ Perfil encontrado:', data)
          
          if (!data.providerProfile) {
            console.warn('⚠️ Usuário não é prestador de serviços')
            setError('Este usuário não é um prestador de serviços')
            setLoading(false)
            return
          }
          
          setProvider({
            id: docSnap.id,
            name: data.name || 'Sem nome',
            avatar: data.avatar || `https://i.pravatar.cc/150?u=${id}`,
            email: data.email || '',
            isMock: false,
            providerProfile: {
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
              media: data.providerProfile.media || {
                photos: [],
                videos: [],
                audios: []
              }
            }
          })
        } else {
          console.error('❌ Perfil não encontrado no Firestore')
          setError('Perfil não encontrado')
        }
      } catch (err) {
        console.error('🔥 Erro ao carregar perfil:', err)
        setError('Erro ao carregar perfil')
      } finally {
        setLoading(false)
      }
    }

    loadProvider()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen pt-16 pb-20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted text-sm">Carregando perfil...</p>
        </div>
      </div>
    )
  }

  if (error || !provider) {
    return (
      <div className="min-h-screen pt-16 pb-20 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-10 h-10 text-muted" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Perfil não encontrado</h2>
          <p className="text-muted mb-2 text-sm">{error || 'Este perfil não existe ou foi removido'}</p>
          {id && (
            <p className="text-xs text-muted/60 mb-6 font-mono bg-surface px-3 py-2 rounded border border-border inline-block">
              ID: {id}
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-primary text-background font-bold rounded-xl hover:bg-primary-dark transition-colors"
            >
              Voltar para Home
            </button>
            {user?.id === id && (
              <button
                onClick={() => navigate('/tornar-se-prestador')}
                className="px-6 py-3 bg-surface border border-primary text-primary font-bold rounded-xl hover:bg-primary/10 transition-colors"
              >
                Criar Perfil
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const photos = provider.providerProfile.media?.photos || []
  const videos = provider.providerProfile.media?.videos || []
  const audios = provider.providerProfile.media?.audios || []

  return (
    <div className="min-h-screen pt-16 pb-32 lg:pb-20">
      {/* Banner de perfil de exemplo */}
      {provider.isMock && (
        <div className="fixed top-16 left-0 right-0 z-50 bg-gradient-to-r from-red-500/90 to-orange-500/90 backdrop-blur-sm py-2 px-4 text-center">
          <div className="flex items-center justify-center gap-2 text-white text-sm font-bold">
            <Sparkles className="w-4 h-4" />
            PERFIL DE EXEMPLO - Dados fictícios para demonstração
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* Hero com cover */}
      <div className={`relative h-48 sm:h-64 lg:h-80 bg-gradient-to-br from-primary/20 to-background ${provider.isMock ? 'mt-10' : ''}`}>
        {provider.providerProfile.coverImage ? (
          <img 
            src={provider.providerProfile.coverImage} 
            alt="" 
            className="absolute inset-0 w-full h-full object-cover opacity-20" 
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-background" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>

      {/* Conteúdo */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 sm:-mt-24 lg:-mt-32 relative z-10">
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Coluna principal */}
          <div className="w-full lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Card de perfil */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6"
            >
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start">
                <img 
                  src={provider.avatar} 
                  alt={provider.name} 
                  className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-xl sm:rounded-2xl object-cover border-4 border-background shrink-0" 
                />
                <div className="flex-1 w-full">
                  <div className="flex flex-col gap-3 mb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 text-center sm:text-left">
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white mb-1">{provider.name}</h1>
                        <p className="text-primary text-base sm:text-lg font-semibold">{provider.providerProfile.specialty}</p>
                      </div>
                      {provider.providerProfile.verified && (
                        <div className="hidden sm:flex items-center gap-1 bg-primary/20 border border-primary/30 text-primary px-3 py-1.5 rounded-full text-xs font-semibold shrink-0">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Verificado
                        </div>
                      )}
                    </div>
                    {provider.providerProfile.verified && (
                      <div className="sm:hidden flex items-center justify-center gap-1 bg-primary/20 border border-primary/30 text-primary px-3 py-1.5 rounded-full text-xs font-semibold">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Verificado
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted mb-4">
                    <div className="flex items-center justify-center sm:justify-start gap-1">
                      <Star className="w-4 h-4 text-yellow-400" fill="currentColor" />
                      <span className="text-white font-semibold">{provider.providerProfile.rating}</span>
                      <span>({provider.providerProfile.reviewCount} avaliações)</span>
                    </div>
                    <div className="flex items-center justify-center sm:justify-start gap-1">
                      <MapPin className="w-4 h-4" />
                      {provider.providerProfile.city}, {provider.providerProfile.neighborhood}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    {provider.providerProfile.skills.map((skill, i) => (
                      <span key={i} className="px-2.5 sm:px-3 py-1 bg-background border border-border rounded-full text-[10px] sm:text-xs text-muted">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Sobre */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-surface border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6"
            >
              <h2 className="text-base sm:text-lg lg:text-xl font-bold text-white mb-3 sm:mb-4">Sobre</h2>
              <p className="text-muted text-sm sm:text-base leading-relaxed whitespace-pre-wrap">{provider.providerProfile.bio}</p>
            </motion.div>

            {/* Galeria de Fotos */}
            {photos.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-surface border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6"
              >
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    <h2 className="text-base sm:text-lg lg:text-xl font-bold text-white">Galeria de Fotos</h2>
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted">{photos.length} foto{photos.length > 1 ? 's' : ''}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  {photos.map((url, i) => (
                    <div key={i} className="aspect-square rounded-lg overflow-hidden group cursor-pointer">
                      <img
                        src={url}
                        alt={`Foto ${i + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Vídeos */}
            {videos.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-surface border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6"
              >
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-2">
                    <VideoIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    <h2 className="text-base sm:text-lg lg:text-xl font-bold text-white">Vídeos</h2>
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted">{videos.length} vídeo{videos.length > 1 ? 's' : ''}</span>
                </div>
                
                <VideoCarousel>
                  {videos.map((url, i) => (
                    <div key={i} className="flex-none w-[240px] sm:w-[280px] lg:w-[320px] snap-start">
                      {isValidYouTubeUrl(url) ? (
                        <YouTubeEmbed 
                          videoUrl={url} 
                          title={`Vídeo ${i + 1}`} 
                          showThumbnail 
                        />
                      ) : (
                        <div className="aspect-video rounded-lg overflow-hidden bg-background">
                          <video 
                            src={url} 
                            controls 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </VideoCarousel>
              </motion.div>
            )}

            {/* Áudios */}
            {audios.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-surface border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6"
              >
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    <h2 className="text-base sm:text-lg lg:text-xl font-bold text-white">Áudios</h2>
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted">{audios.length} áudio{audios.length > 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-3">
                  {audios.map((url, i) => (
                    <div key={i} className="bg-background border border-border rounded-lg p-4 flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center shrink-0">
                        <Music className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <audio src={url} controls className="w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block w-full space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-surface border border-border rounded-2xl p-6 sticky top-20">
              <div className="text-center mb-6">
                <p className="text-muted text-sm mb-1">A partir de</p>
                <p className="text-3xl font-black text-white">
                  R$ {provider.providerProfile.priceFrom}
                  <span className="text-lg text-muted font-normal">/serviço</span>
                </p>
              </div>

              <div className="space-y-3 mb-6">
                <button 
                  onClick={() => !provider.isMock && setModalOpen(true)}
                  disabled={provider.isMock}
                  className="w-full bg-primary text-background font-bold py-3.5 rounded-xl hover:bg-primary-dark transition-colors touch-target disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Calendar className="w-5 h-5 inline mr-2" />
                  {provider.isMock ? 'Perfil de Exemplo' : 'Solicitar Serviço'}
                </button>
                <button 
                  disabled={provider.isMock}
                  className="w-full bg-surface border-2 border-primary text-primary font-bold py-3.5 rounded-xl hover:bg-primary/10 transition-colors touch-target disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MessageCircle className="w-5 h-5 inline mr-2" />
                  {provider.isMock ? 'Perfil de Exemplo' : 'Enviar Mensagem'}
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-muted">
                  <Clock className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="text-white font-semibold">Tempo de resposta</p>
                    <p>{provider.providerProfile.responseTime}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-muted">
                  <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="text-white font-semibold">Trabalhos concluídos</p>
                    <p>{provider.providerProfile.completedJobs}+</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Botões fixos (mobile) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-lg border-t border-border p-3 sm:p-4 z-40">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-3">
            <p className="text-muted text-xs mb-0.5">A partir de</p>
            <p className="text-xl font-black text-white">
              R$ {provider.providerProfile.priceFrom}
              <span className="text-sm text-muted font-normal">/serviço</span>
            </p>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <button 
              onClick={() => !provider.isMock && setModalOpen(true)}
              disabled={provider.isMock}
              className="flex-1 bg-primary text-background font-bold py-3.5 rounded-xl hover:bg-primary-dark transition-colors text-sm touch-target disabled:opacity-50"
            >
              <Calendar className="w-4 h-4 inline mr-1.5" />
              {provider.isMock ? 'Exemplo' : 'Solicitar'}
            </button>
            <button 
              disabled={provider.isMock}
              className="flex-1 bg-surface border-2 border-primary text-primary font-bold py-3.5 rounded-xl hover:bg-primary/10 transition-colors text-sm touch-target disabled:opacity-50"
            >
              <MessageCircle className="w-4 h-4 inline mr-1.5" />
              {provider.isMock ? 'Exemplo' : 'Mensagem'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {!provider.isMock && (
        <RequestServiceModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          provider={{
            id: provider.id,
            name: provider.name,
            avatar: provider.avatar,
            specialty: provider.providerProfile.specialty,
            priceFrom: provider.providerProfile.priceFrom,
          }}
        />
      )}
    </div>
  )
}
