import { useState } from 'react'
import { motion } from 'framer-motion'
import { Camera, Save, User, MapPin, DollarSign, Briefcase, Star, Edit2, Video, Trash2, Plus, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { YouTubeEmbed, isValidYouTubeUrl } from '@/components/YouTubeEmbed'

export const ProviderDashboardPage = () => {
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Estado do perfil (depois vai vir do Firestore)
  const [profile, setProfile] = useState({
    name: user?.displayName || 'Seu Nome',
    specialty: 'Sua Especialidade',
    bio: 'Conte um pouco sobre você e sua experiência profissional...',
    city: 'Sua Cidade',
    neighborhood: 'Seu Bairro',
    priceFrom: 100,
    skills: ['Habilidade 1', 'Habilidade 2', 'Habilidade 3'],
    avatar: user?.photoURL || 'https://i.pravatar.cc/150?img=12',
    coverImage: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80',
    phone: '',
    email: user?.email || '',
    videos: {
      presentation: '',
      portfolio: [] as string[],
    },
  })

  const [newSkill, setNewSkill] = useState('')
  const [newVideoUrl, setNewVideoUrl] = useState('')
  const [videoError, setVideoError] = useState('')

  const handleSave = async () => {
    setSaving(true)
    // TODO: Salvar no Firestore
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSaving(false)
    setEditing(false)
  }

  const addSkill = () => {
    if (newSkill.trim() && profile.skills.length < 8) {
      setProfile({ ...profile, skills: [...profile.skills, newSkill.trim()] })
      setNewSkill('')
    }
  }

  const removeSkill = (index: number) => {
    setProfile({ ...profile, skills: profile.skills.filter((_, i) => i !== index) })
  }

  const addPortfolioVideo = () => {
    setVideoError('')
    
    if (!newVideoUrl.trim()) {
      setVideoError('Digite a URL do vídeo')
      return
    }

    if (!isValidYouTubeUrl(newVideoUrl)) {
      setVideoError('URL inválida. Use um link do YouTube')
      return
    }

    if (profile.videos.portfolio.length >= 5) {
      setVideoError('Máximo de 5 vídeos no portfólio')
      return
    }

    setProfile({
      ...profile,
      videos: {
        ...profile.videos,
        portfolio: [...profile.videos.portfolio, newVideoUrl.trim()]
      }
    })
    setNewVideoUrl('')
  }

  const removePortfolioVideo = (index: number) => {
    setProfile({
      ...profile,
      videos: {
        ...profile.videos,
        portfolio: profile.videos.portfolio.filter((_, i) => i !== index)
      }
    })
  }

  return (
    <div className="min-h-screen pt-16 pb-20">
      {/* Header com cover */}
      <div className="relative h-64 bg-gradient-to-r from-surface to-surface-hover">
        <img 
          src={profile.coverImage} 
          alt="Cover" 
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        
        {editing && (
          <button className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm hover:bg-black/80 transition-colors">
            <Camera className="w-4 h-4" />
            Trocar Capa
          </button>
        )}

        <div className="absolute -bottom-16 left-8">
          <div className="relative">
            <img 
              src={profile.avatar} 
              alt={profile.name}
              className="w-32 h-32 rounded-2xl border-4 border-background object-cover"
            />
            {editing && (
              <button className="absolute bottom-0 right-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center hover:bg-primary-dark transition-colors">
                <Camera className="w-5 h-5 text-background" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-5xl mx-auto px-4 sm:px-8 mt-20">
        {/* Header da página */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-white mb-1">Meu Perfil</h1>
            <p className="text-muted text-sm">Gerencie suas informações e preferências</p>
          </div>
          <div className="flex gap-3">
            <Link to={`/profissional/${user?.uid || '1'}`}>
              <button className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-white text-sm font-semibold hover:border-primary transition-colors">
                Ver Perfil Público
              </button>
            </Link>
            {!editing ? (
              <button 
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-background rounded-lg text-sm font-bold hover:bg-primary-dark transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Editar Perfil
              </button>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 bg-surface border border-border rounded-lg text-muted text-sm font-semibold hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-background rounded-lg text-sm font-bold hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Cards de informações */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Informações Básicas */}
          <motion.div 
            className="bg-surface border border-border rounded-xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-white">Informações Básicas</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-muted mb-1">Nome Completo</label>
                <input 
                  type="text"
                  value={profile.name}
                  onChange={e => setProfile({ ...profile, name: e.target.value })}
                  disabled={!editing}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed focus:border-primary outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Especialidade Principal</label>
                <input 
                  type="text"
                  value={profile.specialty}
                  onChange={e => setProfile({ ...profile, specialty: e.target.value })}
                  disabled={!editing}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed focus:border-primary outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Telefone</label>
                <input 
                  type="tel"
                  value={profile.phone}
                  onChange={e => setProfile({ ...profile, phone: e.target.value })}
                  disabled={!editing}
                  placeholder="(00) 00000-0000"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed focus:border-primary outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">E-mail</label>
                <input 
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-muted text-sm opacity-60 cursor-not-allowed"
                />
                <p className="text-[10px] text-muted mt-1">O e-mail não pode ser alterado</p>
              </div>
            </div>
          </motion.div>

          {/* Localização */}
          <motion.div 
            className="bg-surface border border-border rounded-xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-white">Localização</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-muted mb-1">Cidade</label>
                <input 
                  type="text"
                  value={profile.city}
                  onChange={e => setProfile({ ...profile, city: e.target.value })}
                  disabled={!editing}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed focus:border-primary outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Bairro de Atuação</label>
                <input 
                  type="text"
                  value={profile.neighborhood}
                  onChange={e => setProfile({ ...profile, neighborhood: e.target.value })}
                  disabled={!editing}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed focus:border-primary outline-none transition-colors"
                />
              </div>
            </div>
          </motion.div>

          {/* Preço */}
          <motion.div 
            className="bg-surface border border-border rounded-xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-white">Preço Base</h2>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Valor mínimo por serviço</label>
              <div className="flex items-center gap-2">
                <span className="text-muted text-sm">R$</span>
                <input 
                  type="number"
                  value={profile.priceFrom}
                  onChange={e => setProfile({ ...profile, priceFrom: parseInt(e.target.value) || 0 })}
                  disabled={!editing}
                  min="0"
                  step="10"
                  className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed focus:border-primary outline-none transition-colors"
                />
              </div>
              <p className="text-[10px] text-muted mt-1">Este é o valor inicial que aparecerá no seu perfil</p>
            </div>
          </motion.div>

          {/* Especialidades */}
          <motion.div 
            className="bg-surface border border-border rounded-xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-white">Especialidades</h2>
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill, i) => (
                  <div key={i} className="flex items-center gap-1 bg-background border border-border text-sm text-white px-3 py-1.5 rounded-full">
                    <Star className="w-3 h-3 text-primary" />
                    {skill}
                    {editing && (
                      <button 
                        onClick={() => removeSkill(i)}
                        className="ml-1 text-muted hover:text-red-400 transition-colors"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {editing && (
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newSkill}
                    onChange={e => setNewSkill(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && addSkill()}
                    placeholder="Nova especialidade"
                    className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-white text-sm focus:border-primary outline-none transition-colors"
                  />
                  <button 
                    onClick={addSkill}
                    disabled={!newSkill.trim() || profile.skills.length >= 8}
                    className="px-4 py-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Adicionar
                  </button>
                </div>
              )}
              <p className="text-[10px] text-muted">Máximo de 8 especialidades ({profile.skills.length}/8)</p>
            </div>
          </motion.div>

          {/* Bio - ocupa coluna completa */}
          <motion.div 
            className="md:col-span-2 bg-surface border border-border rounded-xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Edit2 className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-white">Sobre Você</h2>
            </div>
            <textarea 
              value={profile.bio}
              onChange={e => setProfile({ ...profile, bio: e.target.value })}
              disabled={!editing}
              rows={5}
              maxLength={500}
              placeholder="Conte sobre sua experiência, formação e diferenciais..."
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed focus:border-primary outline-none transition-colors resize-none"
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-[10px] text-muted">Esta descrição aparece no seu perfil público</p>
              <p className="text-[10px] text-muted">{profile.bio.length}/500</p>
            </div>
          </motion.div>

          {/* Vídeos - ocupa coluna completa */}
          <motion.div 
            className="md:col-span-2 bg-surface border border-border rounded-xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Video className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-white">Vídeos</h2>
            </div>

            <div className="space-y-6">
              {/* Vídeo de apresentação */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Vídeo de Apresentação</label>
                <p className="text-xs text-muted mb-3">Grave um vídeo se apresentando, falando da sua experiência e diferenciais</p>
                
                {editing ? (
                  <input 
                    type="url"
                    value={profile.videos.presentation}
                    onChange={e => setProfile({ 
                      ...profile, 
                      videos: { ...profile.videos, presentation: e.target.value }
                    })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white text-sm focus:border-primary outline-none transition-colors"
                  />
                ) : profile.videos.presentation ? (
                  <YouTubeEmbed videoUrl={profile.videos.presentation} title="Vídeo de Apresentação" />
                ) : (
                  <div className="aspect-video w-full bg-background border border-dashed border-border rounded-xl flex items-center justify-center">
                    <p className="text-muted text-sm">Nenhum vídeo adicionado</p>
                  </div>
                )}
              </div>

              {/* Vídeos do portfólio */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Portfólio de Serviços</label>
                <p className="text-xs text-muted mb-3">Adicione até 5 vídeos mostrando seus trabalhos anteriores (máx: 5)</p>
                
                {profile.videos.portfolio.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    {profile.videos.portfolio.map((url, i) => (
                      <div key={i} className="relative group">
                        <YouTubeEmbed videoUrl={url} title={`Trabalho ${i + 1}`} showThumbnail />
                        {editing && (
                          <button
                            onClick={() => removePortfolioVideo(i)}
                            className="absolute top-2 right-2 w-8 h-8 bg-red-500/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          >
                            <Trash2 className="w-4 h-4 text-white" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {editing && profile.videos.portfolio.length < 5 && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input 
                        type="url"
                        value={newVideoUrl}
                        onChange={e => {
                          setNewVideoUrl(e.target.value)
                          setVideoError('')
                        }}
                        onKeyPress={e => e.key === 'Enter' && addPortfolioVideo()}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-white text-sm focus:border-primary outline-none transition-colors"
                      />
                      <button 
                        onClick={addPortfolioVideo}
                        className="px-4 py-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar
                      </button>
                    </div>
                    
                    {videoError && (
                      <div className="flex items-center gap-2 text-red-400 text-xs">
                        <AlertCircle className="w-3 h-3" />
                        {videoError}
                      </div>
                    )}
                    
                    <p className="text-[10px] text-muted">
                      Cole o link de um vídeo do YouTube ({profile.videos.portfolio.length}/5 adicionados)
                    </p>
                  </div>
                )}

                {!editing && profile.videos.portfolio.length === 0 && (
                  <div className="aspect-video w-full bg-background border border-dashed border-border rounded-xl flex items-center justify-center">
                    <p className="text-muted text-sm">Nenhum vídeo no portfólio</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
