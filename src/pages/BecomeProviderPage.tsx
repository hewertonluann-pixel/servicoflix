import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Briefcase, MapPin, DollarSign, Star, ArrowRight, Check, X } from 'lucide-react'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'
import { doc, updateDoc, arrayUnion } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ProviderProfile } from '@/types'

export const BecomeProviderPage = () => {
  const { user, isProvider } = useSimpleAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
  })

  const [newSkill, setNewSkill] = useState('')

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
      console.log('📝 [BecomeProvider] Criando perfil de prestador...')
      console.log('📝 [BecomeProvider] User ID:', user.id)
      
      // Atualiza documento do usuário no Firestore
      await updateDoc(doc(db, 'users', user.id), {
        roles: arrayUnion('provider'),
        providerProfile: formData,
      })
      
      console.log('✅ [BecomeProvider] Perfil criado com sucesso!')
      navigate('/meu-perfil')
    } catch (err) {
      console.error('❌ [BecomeProvider] Erro:', err)
      setError('Erro ao criar perfil de prestador. Tente novamente.')
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
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center px-4">
        <div className="text-center">
          <Check className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white mb-2">Você já é um prestador!</h1>
          <p className="text-muted mb-6">Seu perfil de prestador já está ativo.</p>
          <button
            onClick={() => navigate('/meu-perfil')}
            className="px-6 py-3 bg-primary text-background font-bold rounded-xl hover:bg-primary-dark transition-colors"
          >
            Ir para Meu Perfil
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-16 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">Torne-se um Prestador</h1>
          <p className="text-muted text-sm sm:text-base">Cadastre seu perfil profissional e comece a receber solicitações de serviços</p>
        </motion.div>

        {/* Benefícios */}
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

        {/* Formulário */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-surface border border-border rounded-xl p-4 sm:p-6 space-y-6"
        >
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3 text-red-400 text-sm">
              <X className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          {/* Informações básicas */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              Informações Profissionais
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted mb-1.5">Especialidade Principal *</label>
                <input
                  type="text"
                  value={formData.specialty}
                  onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                  placeholder="Ex: Eletricista, Encanador, Faxineira..."
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

          {/* Localização */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Localização
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted mb-1.5">Cidade *</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Ex: São Paulo"
                  className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white text-sm focus:border-primary outline-none transition-colors"
                  required
                />
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

          {/* Especialidades */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              Especialidades
            </h3>
            <div className="space-y-3">
              {formData.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((skill, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-background border border-border text-sm text-white px-3 py-2 rounded-full">
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="ml-1 text-muted hover:text-red-400 transition-colors text-lg leading-none"
                      >
                        ×
                      </button>
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
                  className="px-6 py-3 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Adicionar
                </button>
              </div>
              <p className="text-xs text-muted">Máximo de 8 especialidades ({formData.skills.length}/8)</p>
            </div>
          </div>

          {/* Preço */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Preço Base
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
              <p className="text-xs text-muted mt-1">Este é o valor inicial que aparecerá no seu perfil</p>
            </div>
          </div>

          {/* Botões */}
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
              disabled={loading}
              className="flex-1 px-6 py-3 bg-primary text-background font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Criando perfil...' : 'Criar Perfil de Prestador'}
              {!loading && <ArrowRight className="w-5 h-5" />}
            </button>
          </div>
        </motion.form>
      </div>
    </div>
  )
}
