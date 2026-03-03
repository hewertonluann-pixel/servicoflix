import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Star, MapPin, Clock, CheckCircle, Briefcase, Calendar, MessageCircle, Video as VideoIcon } from 'lucide-react'
import { mockProviders } from '@/data/mock'
import { YouTubeEmbed } from '@/components/YouTubeEmbed'
import { VideoCarousel } from '@/components/VideoCarousel'

export const ProviderProfilePage = () => {
  const { id } = useParams()
  const provider = mockProviders.find(p => p.id === id) || mockProviders[0]

  // Mock de vídeos (depois virá do Firestore)
  const videos = {
    presentation: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    portfolio: [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    ]
  }

  return (
    <div className="min-h-screen pt-16 pb-32 lg:pb-20">
      {/* Hero com cover */}
      <div className="relative h-48 sm:h-64 lg:h-80 bg-gradient-to-br from-primary/20 to-background">
        {provider.coverImage && (
          <img src={provider.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>

      {/* Conteúdo */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 sm:-mt-28 lg:-mt-32 relative z-10">
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Coluna principal */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Card de perfil */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6"
            >
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
                <img 
                  src={provider.avatar} 
                  alt={provider.name} 
                  className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-xl sm:rounded-2xl object-cover border-4 border-background mx-auto sm:mx-0" 
                />
                <div className="flex-1 w-full">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-3">
                    <div className="text-center sm:text-left">
                      <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white mb-1">{provider.name}</h1>
                      <p className="text-primary text-base sm:text-lg font-semibold">{provider.specialty}</p>
                    </div>
                    {provider.verified && (
                      <div className="flex items-center justify-center gap-1 bg-primary/20 border border-primary/30 text-primary px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold mx-auto sm:mx-0">
                        <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Verificado
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted mb-4">
                    <div className="flex items-center justify-center sm:justify-start gap-1">
                      <Star className="w-4 h-4 text-yellow-400" fill="currentColor" />
                      <span className="text-white font-semibold">{provider.rating}</span>
                      <span>({provider.reviewCount} avaliações)</span>
                    </div>
                    <div className="flex items-center justify-center sm:justify-start gap-1">
                      <MapPin className="w-4 h-4" />
                      {provider.city}, {provider.neighborhood}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    {provider.skills.map((skill, i) => (
                      <span key={i} className="px-2.5 sm:px-3 py-1 bg-background border border-border rounded-full text-[10px] sm:text-xs text-muted">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Vídeo de apresentação */}
            {videos.presentation && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-surface border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6"
              >
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <VideoIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <h2 className="text-base sm:text-lg lg:text-xl font-bold text-white">Vídeo de Apresentação</h2>
                </div>
                <YouTubeEmbed videoUrl={videos.presentation} title="Apresentação" />
              </motion.div>
            )}

            {/* Sobre */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-surface border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6"
            >
              <h2 className="text-base sm:text-lg lg:text-xl font-bold text-white mb-3 sm:mb-4">Sobre</h2>
              <p className="text-muted text-sm sm:text-base leading-relaxed">{provider.bio}</p>
            </motion.div>

            {/* Portfólio de vídeos com carrossel */}
            {videos.portfolio.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-surface border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6"
              >
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    <h2 className="text-base sm:text-lg lg:text-xl font-bold text-white">Portfólio de Trabalhos</h2>
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted">{videos.portfolio.length} vídeo{videos.portfolio.length > 1 ? 's' : ''}</span>
                </div>
                
                <VideoCarousel>
                  {videos.portfolio.map((url, i) => (
                    <div key={i} className="flex-none w-[240px] sm:w-[280px] lg:w-[320px] snap-start">
                      <YouTubeEmbed 
                        videoUrl={url} 
                        title={`Trabalho ${i + 1}`} 
                        showThumbnail 
                      />
                    </div>
                  ))}
                </VideoCarousel>
              </motion.div>
            )}
          </div>

          {/* Sidebar - Desktop sticky, Mobile fixed bottom */}
          <div className="space-y-4 sm:space-y-6">
            {/* Card de ações */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-surface border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:sticky lg:top-20"
            >
              <div className="text-center mb-4 sm:mb-6">
                <p className="text-muted text-xs sm:text-sm mb-1">A partir de</p>
                <p className="text-2xl sm:text-3xl font-black text-white">
                  R$ {provider.priceFrom}
                  <span className="text-base sm:text-lg text-muted font-normal">/serviço</span>
                </p>
              </div>

              <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                <button className="w-full bg-primary text-background font-bold py-3 sm:py-3.5 rounded-lg sm:rounded-xl hover:bg-primary-dark transition-colors text-sm sm:text-base touch-target">
                  <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 inline mr-2" />
                  Enviar Mensagem
                </button>
                <button className="w-full bg-surface border-2 border-primary text-primary font-bold py-3 sm:py-3.5 rounded-lg sm:rounded-xl hover:bg-primary/10 transition-colors text-sm sm:text-base touch-target">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 inline mr-2" />
                  Agendar Serviço
                </button>
              </div>

              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex items-center gap-3 text-muted">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                  <div>
                    <p className="text-white font-semibold">Tempo de resposta</p>
                    <p>{provider.responseTime}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-muted">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                  <div>
                    <p className="text-white font-semibold">Trabalhos concluídos</p>
                    <p>{provider.completedJobs}+</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Botões fixos no bottom (mobile only) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-lg border-t border-border p-4 z-40">
        <div className="max-w-2xl mx-auto flex gap-3">
          <button className="flex-1 bg-primary text-background font-bold py-3.5 rounded-xl hover:bg-primary-dark transition-colors text-sm touch-target">
            <MessageCircle className="w-4 h-4 inline mr-2" />
            Mensagem
          </button>
          <button className="flex-1 bg-surface border-2 border-primary text-primary font-bold py-3.5 rounded-xl hover:bg-primary/10 transition-colors text-sm touch-target">
            <Calendar className="w-4 h-4 inline mr-2" />
            Agendar
          </button>
        </div>
      </div>
    </div>
  )
}
