import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  MapPin,
  DollarSign,
  Briefcase,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Save,
  Loader2,
  ChevronLeft,
  CheckCircle,
  AlertCircle,
  Tag,
  Clock,
  Award,
  Star
} from 'lucide-react'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'
import { MediaUploader } from '@/components/MediaUploader'
import { getMediaLimits, PLAN_MEDIA_FEATURES, type PlanType } from '@/lib/mediaLimits'
import type { MediaItem } from '@/types'

export const EditProviderProfilePage = () => {
  const { user } = useSimpleAuth()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'media'>('info')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Assume plano 'professional' por padrão (depois virá do banco)
  const [userPlan] = useState<PlanType>('professional')
  const mediaLimits = getMediaLimits(userPlan)

  const [profile, setProfile] = useState({
    specialty: user?.providerProfile?.specialty || '',
    bio: user?.providerProfile?.bio || '',
    city: user?.providerProfile?.city || '',
    neighborhood: user?.providerProfile?.neighborhood || '',
    priceFrom: user?.providerProfile?.priceFrom || 50,
    skills: user?.providerProfile?.skills || [],
    categories: user?.providerProfile?.categories || [],
    availability: user?.providerProfile?.availability || [],
    responseTime: user?.providerProfile?.responseTime || '24h',
  })

  const [presentationMedia, setPresentationMedia] = useState<MediaItem[]>(
    user?.providerProfile?.media?.presentation ? [user.providerProfile.media.presentation] : []
  )
  const [portfolioMedia, setPortfolioMedia] = useState<MediaItem[]>(
    user?.providerProfile?.media?.portfolio || []
  )

  const [newSkill, setNewSkill] = useState('')

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (!user?.roles?.includes('provider')) {
      showToast('Você precisa ser um prestador', 'error')
      navigate('/tornar-se-prestador')
    }
  }, [user, navigate])

  const handleSave = async () => {
    if (!user?.id) return

    setSaving(true)
    try {
      // Aqui você salvaria no Firestore
      const updatedProfile = {
        ...profile,
        media: {
          presentation: presentationMedia[0] || undefined,
          portfolio: portfolioMedia,
        },
      }

      // await updateDoc(doc(db, 'users', user.id), {
      //   providerProfile: updatedProfile
      // })

      console.log('Perfil atualizado:', updatedProfile)
      showToast('✅ Perfil salvo com sucesso!')
      
      // Redireciona para o perfil público após salvar
      setTimeout(() => {
        navigate(`/prestador/${user.id}`)
      }, 1500)
    } catch (err) {
      console.error(err)
      showToast('❌ Erro ao salvar perfil', 'error')
    } finally {
      setSaving(false)
    }
  }

  const addSkill = () => {
    if (newSkill.trim() && !profile.skills.includes(newSkill.trim())) {
      setProfile({ ...profile, skills: [...profile.skills, newSkill.trim()] })
      setNewSkill('')
    }
  }

  const removeSkill = (skill: string) => {
    setProfile({ ...profile, skills: profile.skills.filter(s => s !== skill) })
  }

  const availabilityOptions = [
    'Segunda a Sexta',
    'Fins de Semana',
    'Feriados',
    'Noturno',
    'Manhã',
    'Tarde',
    '24h',
  ]

  const toggleAvailability = (option: string) => {
    setProfile({
      ...profile,
      availability: profile.availability.includes(option)
        ? profile.availability.filter(a => a !== option)
        : [...profile.availability, option],
    })
  }

  if (!user?.roles?.includes('provider')) {
    return null
  }

  return (
    <div className="min-h-screen bg-background pt-16 pb-20">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-20 right-4 z-50 px-5 py-3 rounded-xl font-semibold text-sm shadow-lg ${
              toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 bg-surface border border-border rounded-xl flex items-center justify-center hover:border-primary transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-white">Editar Perfil</h1>
              <p className="text-sm text-muted">Complete seu perfil profissional</p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-background font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Salvar
              </>
            )}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-surface border border-border rounded-xl p-1">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm transition-colors ${
              activeTab === 'info'
                ? 'bg-primary text-background'
                : 'text-muted hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            Informações
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm transition-colors ${
              activeTab === 'media'
                ? 'bg-primary text-background'
                : 'text-muted hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Portfólio ({portfolioMedia.length})
          </button>
        </div>

        {/* Tab: Informações Básicas */}
        {activeTab === 'info' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Especialidade */}
            <div className="bg-surface border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-white">Especialidade</h2>
              </div>
              <input
                type="text"
                value={profile.specialty}
                onChange={e => setProfile({ ...profile, specialty: e.target.value })}
                placeholder="Ex: Eletricista, Encanador, Designer..."
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Bio */}
            <div className="bg-surface border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-white">Sobre você</h2>
              </div>
              <textarea
                value={profile.bio}
                onChange={e => setProfile({ ...profile, bio: e.target.value })}
                placeholder="Descreva sua experiência, diferenciais e serviços oferecidos..."
                rows={5}
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white outline-none focus:border-primary transition-colors resize-none"
              />
              <p className="text-xs text-muted mt-2">{profile.bio.length}/500 caracteres</p>
            </div>

            {/* Localização */}
            <div className="bg-surface border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-white">Localização</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted mb-2">Cidade</label>
                  <input
                    type="text"
                    value={profile.city}
                    onChange={e => setProfile({ ...profile, city: e.target.value })}
                    placeholder="Diamantina"
                    className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-2">Bairro</label>
                  <input
                    type="text"
                    value={profile.neighborhood}
                    onChange={e => setProfile({ ...profile, neighborhood: e.target.value })}
                    placeholder="Centro"
                    className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Preço */}
            <div className="bg-surface border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-white">Preço inicial</h2>
              </div>
              <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-4 py-3">
                <span className="text-muted">R$</span>
                <input
                  type="number"
                  value={profile.priceFrom}
                  onChange={e => setProfile({ ...profile, priceFrom: Number(e.target.value) })}
                  placeholder="50"
                  className="flex-1 bg-transparent text-white outline-none"
                />
              </div>
              <p className="text-xs text-muted mt-2">Preço mínimo dos seus serviços</p>
            </div>

            {/* Habilidades */}
            <div className="bg-surface border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-white">Habilidades</h2>
              </div>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newSkill}
                  onChange={e => setNewSkill(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && addSkill()}
                  placeholder="Ex: Instalação elétrica"
                  className="flex-1 bg-background border border-border rounded-lg px-4 py-3 text-white outline-none focus:border-primary transition-colors"
                />
                <button
                  onClick={addSkill}
                  className="px-6 py-3 bg-primary text-background font-bold rounded-lg hover:bg-primary-dark transition-colors"
                >
                  Adicionar
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map(skill => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/20 border border-primary/30 text-primary rounded-lg text-sm"
                  >
                    {skill}
                    <button
                      onClick={() => removeSkill(skill)}
                      className="hover:text-red-400 transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Disponibilidade */}
            <div className="bg-surface border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-white">Disponibilidade</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {availabilityOptions.map(option => (
                  <button
                    key={option}
                    onClick={() => toggleAvailability(option)}
                    className={`px-4 py-2 rounded-lg border font-semibold text-sm transition-colors ${
                      profile.availability.includes(option)
                        ? 'bg-primary/20 border-primary text-primary'
                        : 'bg-background border-border text-muted hover:border-primary/50'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Tempo de resposta */}
            <div className="bg-surface border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-white">Tempo médio de resposta</h2>
              </div>
              <select
                value={profile.responseTime}
                onChange={e => setProfile({ ...profile, responseTime: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white outline-none focus:border-primary transition-colors"
              >
                <option value="1h">Até 1 hora</option>
                <option value="3h">Até 3 horas</option>
                <option value="6h">Até 6 horas</option>
                <option value="12h">Até 12 horas</option>
                <option value="24h">Até 24 horas</option>
                <option value="48h">Até 48 horas</option>
              </select>
            </div>
          </motion.div>
        )}

        {/* Tab: Portfólio de Mídia */}
        {activeTab === 'media' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Informação do Plano */}
            <div className="bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center shrink-0">
                  <Award className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-2">
                    Plano {PLAN_MEDIA_FEATURES[userPlan].name}
                  </h3>
                  <p className="text-sm text-muted mb-3">
                    {PLAN_MEDIA_FEATURES[userPlan].description}
                  </p>
                  <ul className="space-y-1">
                    {PLAN_MEDIA_FEATURES[userPlan].features.map(feature => (
                      <li key={feature} className="flex items-center gap-2 text-xs text-white">
                        <CheckCircle className="w-3 h-3 text-green-400" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Vídeo/Áudio de Apresentação */}
            <div className="bg-surface border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Video className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-white">Mídia de Apresentação</h2>
                  <p className="text-xs text-muted">Vídeo ou áudio se apresentando (opcional)</p>
                </div>
              </div>
              <MediaUploader
                value={presentationMedia}
                onChange={setPresentationMedia}
                maxItems={1}
                allowedTypes={['video', 'audio']}
                limits={mediaLimits}
                mode="single"
              />
            </div>

            {/* Portfólio (Fotos, Vídeos, Áudios) */}
            <div className="bg-surface border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <ImageIcon className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-white">Portfólio</h2>
                  <p className="text-xs text-muted">Fotos de trabalhos, vídeos e áudios de demonstração</p>
                </div>
              </div>
              <MediaUploader
                value={portfolioMedia}
                onChange={setPortfolioMedia}
                maxItems={mediaLimits.photos.maxCount === -1 ? 100 : mediaLimits.photos.maxCount}
                allowedTypes={['photo', 'video', 'audio']}
                limits={mediaLimits}
                mode="multiple"
              />
            </div>

            {/* Dicas */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-white mb-2">💡 Dicas para um portfólio de sucesso
                  </h3>
                  <ul className="space-y-1 text-xs text-muted">
                    <li>• <strong>Fotos:</strong> Mostre antes e depois dos trabalhos realizados</li>
                    <li>• <strong>Vídeos:</strong> Crie demos curtos (30s-2min) dos seus serviços</li>
                    <li>• <strong>Áudios:</strong> Grave samples da sua voz, música ou depoimentos</li>
                    <li>• Use boa iluminação e qualidade de áudio</li>
                    <li>• Mantenha seu portfólio atualizado</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Botão fixo de salvar (mobile) */}
        <div className="fixed bottom-4 left-4 right-4 sm:hidden">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-background font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 shadow-2xl"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Salvar Perfil
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
