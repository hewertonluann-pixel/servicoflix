import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Star, MapPin, Clock, CheckCircle, ArrowLeft, Zap, Phone } from 'lucide-react'
import { mockProviders } from '@/data/mock'

export const ProviderProfilePage = () => {
  const { id } = useParams()
  const provider = mockProviders.find(p => p.id === id)

  if (!provider) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-muted mb-4">Profissional não encontrado.</p>
        <Link to="/" className="text-primary hover:underline">Voltar ao início</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen">
      {/* Cover */}
      <div className="relative h-[50vh]">
        <img src={provider.coverImage} alt={provider.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <Link to="/" className="absolute top-20 left-4 sm:left-8 flex items-center gap-2 text-muted hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
      </div>

      {/* Conteúdo */}
      <div className="max-w-4xl mx-auto px-4 sm:px-8 -mt-32 relative z-10 pb-20">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          {/* Avatar + Nome */}
          <div className="flex items-end gap-4 mb-6">
            <img src={provider.avatar} alt={provider.name} className="w-24 h-24 rounded-2xl border-4 border-surface object-cover" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                {provider.isOnline && (
                  <span className="flex items-center gap-1 text-primary text-xs font-bold">
                    <span className="w-2 h-2 bg-primary rounded-full" /> Online
                  </span>
                )}
                {provider.isTopRated && (
                  <span className="bg-yellow-500 text-black text-xs font-black px-2 py-0.5 rounded-full">TOP RATED</span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black">{provider.name}</h1>
              <p className="text-primary font-semibold">{provider.specialty}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Info principal */}
            <div className="md:col-span-2 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Avaliação', value: provider.rating, icon: '⭐' },
                  { label: 'Serviços', value: provider.completedJobs, icon: '✅' },
                  { label: 'Avaliações', value: provider.reviewCount, icon: '💬' },
                ].map(stat => (
                  <div key={stat.label} className="bg-surface rounded-xl p-4 text-center border border-border">
                    <div className="text-2xl mb-1">{stat.icon}</div>
                    <div className="text-xl font-black text-white">{stat.value}</div>
                    <div className="text-xs text-muted">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Bio */}
              <div className="bg-surface rounded-xl p-5 border border-border">
                <h3 className="font-bold mb-2 text-white">Sobre</h3>
                <p className="text-muted text-sm leading-relaxed">{provider.bio}</p>
              </div>

              {/* Skills */}
              <div className="bg-surface rounded-xl p-5 border border-border">
                <h3 className="font-bold mb-3 text-white">Especialidades</h3>
                <div className="flex flex-wrap gap-2">
                  {provider.skills.map(skill => (
                    <span key={skill} className="flex items-center gap-1 bg-background border border-border text-sm text-muted px-3 py-1.5 rounded-full">
                      <CheckCircle className="w-3 h-3 text-primary" />
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar de ação */}
            <div className="space-y-4">
              <div className="bg-surface rounded-xl p-5 border border-border sticky top-20">
                <p className="text-muted text-sm mb-1">A partir de</p>
                <p className="text-3xl font-black text-primary mb-4">R$ {provider.priceFrom}</p>

                <div className="space-y-2 mb-5 text-sm text-muted">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {provider.neighborhood}, {provider.city}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Responde em {provider.responseTime}
                  </div>
                </div>

                <motion.button
                  className="w-full bg-primary text-background font-bold py-3 rounded-xl flex items-center justify-center gap-2 mb-3"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Zap className="w-4 h-4" fill="currentColor" />
                  Solicitar Serviço
                </motion.button>

                <motion.button
                  className="w-full border border-border text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:border-primary/50 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Phone className="w-4 h-4" />
                  Entrar em Contato
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
