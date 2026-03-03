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
    <div className="min-h-screen pt-16 pb-20">
      {/* Hero com cover */}
      <div className="relative h-80 bg-gradient-to-br from-primary/20 to-background">
        {provider.coverImage && (
          <img src={provider.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>

      {/* Conteúdo */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 -mt-32 relative z-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Coluna principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card de perfil */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface border border-border rounded-2xl p-6"
            >
              <div className="flex gap-6 items-start">
                <img src={provider.avatar} alt={provider.name} className="w-32 h-32 rounded-2xl object-cover border-4 border-background" />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h1 className="text-3xl font-black text-white mb-1">{provider.name}</h1>
                      <p className="text-primary text-lg font-semibold">{provider.specialty}</p>
                    </div>
                    {provider.verified && (
                      <div className="flex items-center gap-1 bg-primary/20 border border-primary/30 text-primary px-3 py-1 rounded-full text-sm font-semibold">
                        <CheckCircle className="w-4 h-4" />
                        Verificado
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted mb-4">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400" fill="currentColor" />
                      <span className="text-white font-semibold">{provider.rating}</span>
                      <span>({provider.reviewCount} avaliações)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {provider.city}, {provider.neighborhood}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {provider.skills.map((skill, i) => (
                      <span key={i} className="px-3 py-1 bg-background border border-border rounded-full text-xs text-muted">
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
                className="bg-surface border border-border rounded-2xl p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <VideoIcon className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold text-white">Vídeo de Apresentação</h2>
                </div>
                <YouTubeEmbed videoUrl={videos.presentation} title="Apresentação" />
              </motion.div>
            )}

            {/* Sobre */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-surface border border-border rounded-2xl p-6"
            >
              <h2 className="text-xl font-bold text-white mb-4">Sobre</h2>
              <p className="text-muted leading-relaxed">{provider.bio}</p>
            </motion.div>

            {/* Portfólio de vídeos com carrossel */}
            {videos.portfolio.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-surface border border-border rounded-2xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold text-white">Portfólio de Trabalhos</h2>
                  </div>
                  <span className="text-xs text-muted">{videos.portfolio.length} vídeo{videos.portfolio.length > 1 ? 's' : ''}</span>
                </div>
                
                <VideoCarousel>
                  {videos.portfolio.map((url, i) => (
                    <div key={i} className="flex-none w-[280px] sm:w-[320px] snap-start">
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

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Card de ações */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-surface border border-border rounded-2xl p-6 sticky top-20"
            >
              <div className="text-center mb-6">
                <p className="text-muted text-sm mb-1">A partir de</p>
                <p className="text-3xl font-black text-white">
                  R$ {provider.priceFrom}
                  <span className="text-lg text-muted font-normal">/serviço</span>
                </p>
              </div>

              <div className="space-y-3 mb-6">
                <button className="w-full bg-primary text-background font-bold py-3 rounded-xl hover:bg-primary-dark transition-colors">
                  <MessageCircle className="w-5 h-5 inline mr-2" />
                  Enviar Mensagem
                </button>
                <button className="w-full bg-surface border-2 border-primary text-primary font-bold py-3 rounded-xl hover:bg-primary/10 transition-colors">
                  <Calendar className="w-5 h-5 inline mr-2" />
                  Agendar Serviço
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-muted">
                  <Clock className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-white font-semibold">Tempo de resposta</p>
                    <p>{provider.responseTime}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-muted">
                  <CheckCircle className="w-5 h-5 text-primary" />
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
    </div>
  )
}
