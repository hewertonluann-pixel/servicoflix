import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useSimpleAuth } from '@/hooks/useSimpleAuth'
import { Save, AlertTriangle } from 'lucide-react'

interface ProviderProfile {
  name: string
  professionalName: string
  specialty: string
  bio: string
  city: string
  priceFrom: string
  whatsapp: string
  skills: string
}

const EMPTY_PROFILE: ProviderProfile = {
  name: '',
  professionalName: '',
  specialty: '',
  bio: '',
  city: '',
  priceFrom: '',
  whatsapp: '',
  skills: '',
}

export const EditProviderProfilePage = () => {
  const { user, loading } = useSimpleAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<ProviderProfile>(EMPTY_PROFILE)
  const [saving, setSaving] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return
      try {
        const snap = await getDoc(doc(db, 'users', user.id))
        if (!snap.exists()) {
          setProfile({
            ...EMPTY_PROFILE,
            name: user.name || '',
          })
          return
        }

        const data: any = snap.data()
        const providerProfile = data.providerProfile || {}

        setProfile({
          name: data.name || user.name || '',
          professionalName:
            providerProfile.professionalName ||
            data.providerProfile?.professionalName ||
            data.name ||
            user.name ||
            '',
          specialty: providerProfile.specialty || '',
          bio: providerProfile.bio || '',
          city: providerProfile.city || '',
          priceFrom: providerProfile.priceFrom || '',
          whatsapp: providerProfile.whatsapp || '',
          skills: (providerProfile.skills || []).join(', '),
        })
      } catch (err: any) {
        console.error(err)
        setError(err?.message || 'Erro ao carregar perfil')
      } finally {
        setLoadingProfile(false)
      }
    }

    if (!loading && user) {
      loadProfile()
    }
  }, [loading, user])

  const handleChange =
    (field: keyof ProviderProfile) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setProfile(prev => ({ ...prev, [field]: e.target.value }))
    }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setError(null)
    try {
      await updateDoc(doc(db, 'users', user.id), {
        name: profile.name,
        providerProfile: {
          professionalName: profile.professionalName,
          specialty: profile.specialty,
          bio: profile.bio,
          city: profile.city,
          priceFrom: profile.priceFrom,
          whatsapp: profile.whatsapp,
          skills: profile.skills
            .split(',')
            .map(s => s.trim())
            .filter(Boolean),
        },
      })
      navigate('/perfil')
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'Erro ao salvar perfil')
    } finally {
      setSaving(false)
    }
  }

  if (loading || loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white mb-2">
            Login Necessário
          </h1>
          <p className="text-muted mb-6">Você precisa estar logado.</p>
          <button
            onClick={() => navigate('/entrar')}
            className="px-6 py-3 bg-primary text-background font-bold rounded-xl"
          >
            Fazer Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 px-4 sm:px-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-black text-white mb-6">
        Editar Perfil de Prestador
      </h1>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-muted mb-1.5">Nome</label>
          <input
            value={profile.name}
            onChange={handleChange('name')}
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary"
            placeholder="Seu nome"
          />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1.5">
            Nome profissional
          </label>
          <input
            value={profile.professionalName}
            onChange={handleChange('professionalName')}
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary"
            placeholder="Nome como aparecerá para os clientes"
          />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1.5">
            Especialidade
          </label>
          <input
            value={profile.specialty}
            onChange={handleChange('specialty')}
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary"
            placeholder="Ex: Fotógrafo, Eletricista..."
          />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1.5">Bio</label>
          <textarea
            value={profile.bio}
            onChange={handleChange('bio')}
            rows={4}
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary resize-none"
            placeholder="Fale um pouco sobre você e seu trabalho"
          />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1.5">Cidade</label>
          <input
            value={profile.city}
            onChange={handleChange('city')}
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary"
            placeholder="Ex: Diamantina"
          />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1.5">
            Preço a partir de (R$)
          </label>
          <input
            value={profile.priceFrom}
            onChange={handleChange('priceFrom')}
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary"
            placeholder="Ex: 80"
          />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1.5">WhatsApp</label>
          <input
            value={profile.whatsapp}
            onChange={handleChange('whatsapp')}
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary"
            placeholder="5538999999999"
          />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1.5">
            Skills (separadas por vírgula)
          </label>
          <input
            value={profile.skills}
            onChange={handleChange('skills')}
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary"
            placeholder="Fotografia, Edição, Casamento..."
          />
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <button
          onClick={() => navigate(-1)}
          className="flex-1 py-3 bg-background border border-border text-muted font-semibold rounded-xl hover:text-white transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-3 bg-primary text-background font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Salvar
        </button>
      </div>
    </div>
  )
}
