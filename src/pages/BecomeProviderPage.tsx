import { Zap } from 'lucide-react' // já existe na Navbar, adicionar aqui também
import { usePrestadorStatus } from '@/hooks/usePrestadorStatus'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Briefcase, MapPin, DollarSign, Star, ArrowRight, Check, X, Clock, User, Loader2 } from 'lucide-react'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'
import { useCities } from '@/hooks/useCities'
import { doc, updateDoc, arrayUnion } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ProviderProfile } from '@/types'

export const BecomeProviderPage = () => {
  const { user, isProvider } = useSimpleAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const { cities, loading: loadingCities } = useCities()

  const [formData, setFormData] = useState<ProviderProfile>({
    specialty: '',
    bio: '',
    city: '',
    neighborhood: '',
    priceFrom: 100,
    skills: [],
    categories: [],
    completedJobs: 0,
    verified: false,
    professionalName: '',
  })

  const [newSkill, setNewSkill] = useState('')

  useEffect(() => {
    if (!formData.city && cities.length > 0) {
      setFormData(prev => ({ ...prev, city: cities[0].nome }))
    }
  }, [cities, formData.city])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!user) {
      setError('Você precisa estar logado para criar um perfil de prestador')
      return
    }
    if (!formData.specialty || !formData.city || !formData.bio) {
      setError('Preencha todos os campos obrigatórios')
      return
    }
    if (formData.skills.length === 0) {
      setError('Adicione pelo menos uma especialidade')
      return
    }

    setLoading(true)
    try {
      // ✅ updateDoc + arrayUnion: adiciona 'provider' sem remover 'client'
      // ✅ Não sobrescreve name, email, avatar nem createdAt
      await updateDoc(doc(db, 'users', user.id), {
        roles: arrayUnion('provider'),
        providerProfile: {
          ...formData,
          verified: false,
          status: 'pending',
          submittedAt: new Date().toISOString(),
          professionalName: formData.professionalName?.trim() || user.name,
        },
      })
      setSubmitted(true)
    } catch (err: any) {
      console.error('Erro ao enviar solicitação:', err)
      setError(err?.message || 'Erro ao enviar solicitação. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const addSkill = () => {
    if (newSkill.trim() && formData.skills.length < 8 && !formData.skills.includes(newSkill.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, newSkill.trim()] })
      setNewSkill('')
    }
  }

  const removeSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter(s => s !== skill) })
  }

  if (isProvider) {
  // Importar usePrestadorStatus no topo do arquivo:
  // import { usePrestadorStatus } from '@/hooks/usePrestadorStatus'
  const { estaAtivo, diasScore, temAssinatura } = usePrestadorStatus()
  const semAcesso = !temAssinatura && diasScore === 0

  return (
    <div className="min-h-screen pt-16 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        {semAcesso ? (
          <>
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Zap className="w-10 h-10 text-primary" fill="currentColor" />
            </div>
            <h1 className="text-2xl font-black text-white mb-2">Perfil aprovado! 🎉</h1>
            <p className="text-muted mb-6">
              Agora escolha um plano para ativar seu perfil e aparecer na plataforma.
            </p>
            <button
              onClick={() => navigate('/comprar')}
              className="w-full px-6 py-3 bg-primary text-background font-bold rounded-xl flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5" fill="currentColor" />
              Ativar meu perfil
            </button>
          </>
        ) : (
          <>
            <Check className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-black text-white mb-2">Você já é um prestador!</h1>
            <p className="text-muted mb-6">Seu perfil está ativo com ⚡ {diasScore} dias.</p>
            <button
              onClick={() => navigate('/meu-perfil')}
              className="px-6 py-3 bg-primary text-background font-bold rounded-xl"
            >
              Ir para Meu Perfil
            </button>
          </>
        )}
      </div>
    </div>
  )
}


  if (submitted || (user?.providerProfile as any)?.status === 'pending') {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-yellow-400" />
          </div>
          <h1 className="text-2xl font-black text-white mb-3">Solicitação Enviada!</h1>
          <p className="text-muted mb-2">Seu perfil foi enviado para análise.</p>
          <p className="text-muted text-sm mb-8">
            Nossa equipe irá revisar suas informações e você será notificado em breve.
          </p>
          <div className="bg-surface border border-yellow-500/30 rounded-xl p-4 mb-6 text-left">
            <p className="text-xs text-yellow-400 font-semibold mb-2">⏳ Status: Aguardando aprovação</p>
            <p className="text-xs text-muted">
              Especialidade:{' '}
              <span className="text-white">
                {formData.specialty || (user?.providerProfile as any)?.specialty}
              </span>
            </p>
            <p className="text-xs text-muted">
              Cidade:{' '}
              <span className="text-white">
                {formData.city || (user?.providerProfile as any)?.city}
              </span>
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-surface border border-border text-muted font-semibold rounded-xl hover:text-white transition-colors"
          >
            Voltar ao início
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-16 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">Torne-se um Prestador</h1>
          <p className="text-muted text-sm sm:text-base">
            Cadastre seu perfil profissional e comece a receber solicitações
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid sm:grid-cols-3 gap-4 mb-8"
        >
          {[
            { icon: DollarSign, title: 'Defina seu preço', desc: 'Você escolhe quanto cobrar' },
            { icon: Briefcase, title: 'Flexibilidade', desc: 'Trabalhe quando e onde quiser' },
            { icon: Star, title: 'Avaliações', desc: 'Construa sua reputação' },
          ].map((benefit, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-4 text-center">
              <benefit.icon className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="text-white font-bold text-sm mb-1">{benefit.title}</h3>
              <p className="text-muted text-xs">{benefit.desc}</p>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 flex items-start gap-3"
        >
          <Clock className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-400">Aprovação necessária</p>
            <p className="text-xs text-muted mt-0.5">
              Após o envio, seu perfil será analisado pela nossa equipe antes de ser publicado.
            </p>
          </div>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-surface border border-border rounded-xl p-4 sm:p-6 space-y-6"
        >
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3 text-red-400 text-sm">
              <X className="w-5 h-5 shrink-0" />{error}
            </div>
          )}

          {/* IDENTIFICAÇÃO */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> Identificação
            </h3>
            <div className="space-y-4">
              <div className="bg-background/50 border border-border/50 rounded-lg p-4">
                <label className="block text-sm text-muted mb-1">Nome Pessoal (Cliente)</label>
                <p className="text-white font-semibold">{user?.name || 'Seu nome'}</p>
                <p className="text-xs text-muted mt-1">
                  👤 Este é o nome usado quando você contrata serviços
                </p>
              </div>

              <div>
                <label className="block text-sm text-muted mb-1.5">
                  Nome Profissional <span className="text-xs opacity-70">(Opcional)</span>
                </label>
                <input
                  type="text"
                  value={formData.professionalName}
                  onChange={e => setFormData({ ...formData, professionalName: e.target.value })}
                  placeholder={`Deixe vazio para usar "${user?.name || 'seu nome'}"`}
                  className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white text-sm focus:border-primary outline-none transition-colors"
                />
                <p className="text-xs text-muted mt-1.5">
                  🎭 Aparece no seu perfil de prestador. Ex: "Banda XYZ", "Conjunto Musical ABC", etc.
                </p>
              </div>
            </div>
          </div>

          {/* INFORMAÇÕES PROFISSIONAIS */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" /> Informações Profissionais
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted mb-1.5">Especialidade Principal *</label>
                <input
                  type="text"
                  value={formData.specialty}
                  onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                  placeholder="Ex: Eletricista, Encanador, Professor de Música..."
                  className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white text-sm focus:border-primary outline-none transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1.5">Sobre você *</label>
                <textarea
                  value={formData.bio}
                  onChange={e => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Conte sobre sua experiência, formação e diferenciais..."
                  rows={4}
                  maxLength={500}
                  className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white text-sm focus:border-primary outline-none transition-colors resize-none"
                  required
                />
                <p className="text-xs text-muted mt-1">{formData.bio.length}/500 caracteres</p>
              </div>
            </div>
          </div>

          {/* LOCALIZAÇÃO */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" /> Localização
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted mb-1.5">Cidade *</label>
                {loadingCities ? (
                  <div className="w-full bg-background border border-border rounded-lg px-4 py-3 flex items-center gap-2 text-muted">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Carregando cidades...
                  </div>
                ) : cities.length === 0 ? (
                  <div className="w-full bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                    Nenhuma cidade disponível. Contate o administrador.
                  </div>
                ) : (
                  <select
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    required
                    className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white text-sm focus:border-primary outline-none transition-colors"
                  >
                    {cities.map(city => (
                      <option key={city.id} value={city.nome}>
                        {city.nome} - {city.uf}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm text-muted mb-1.5">Bairro de Atuação</label>
                <input
                  type="text"
                  value={formData.neighborhood}
                  onChange={e => setFormData({ ...formData, neighborhood: e.target.value })}
                  placeholder="Ex: Centro"
                  className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white text-sm focus:border-primary outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* ESPECIALIDADES */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" /> Especialidades
            </h3>
            <div className="space-y-3">
              {formData.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((skill, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 bg-background border border-border text-sm text-white px-3 py-2 rounded-full"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="ml-1 text-muted hover:text-red-400 transition-colors text-lg leading-none"
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSkill}
                  onChange={e => setNewSkill(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  placeholder="Adicione uma especialidade"
                  className="flex-1 bg-background border border-border rounded-lg px-4 py-3 text-white text-sm focus:border-primary outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={addSkill}
                  disabled={!newSkill.trim() || formData.skills.length >= 8}
                  className="px-6 py-3 bg-primary text-background text-sm font-bold rounded-lg disabled:opacity-50"
                >
                  Adicionar
                </button>
              </div>
              <p className="text-xs text-muted">Máximo de 8 especialidades ({formData.skills.length}/8)</p>
            </div>
          </div>

          {/* PREÇO */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" /> Preço Base
            </h3>
            <div>
              <label className="block text-sm text-muted mb-1.5">Valor mínimo por serviço</label>
              <div className="flex items-center gap-2">
                <span className="text-muted text-sm">R$</span>
                <input
                  type="number"
                  value={formData.priceFrom}
                  onChange={e => setFormData({ ...formData, priceFrom: parseInt(e.target.value) || 0 })}
                  min="0"
                  step="10"
                  className="flex-1 bg-background border border-border rounded-lg px-4 py-3 text-white text-sm focus:border-primary outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* BOTÕES */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 px-6 py-3 bg-surface border border-border text-muted font-semibold rounded-xl hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || loadingCities}
              className="flex-1 px-6 py-3 bg-primary text-background font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
              ) : (
                <>Enviar para Aprovação <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
          </div>
        </motion.form>
      </div>
    </div>
  )
}
