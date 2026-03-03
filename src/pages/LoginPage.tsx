import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, User, Briefcase, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

type UserType = 'cliente' | 'prestador' | null

export const LoginPage = () => {
  const navigate = useNavigate()
  const { signUp, signIn } = useAuth()
  
  const [userType, setUserType] = useState<UserType>(null)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Campos do formulário
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'register') {
        // Validações
        if (!formData.name.trim()) {
          throw new Error('Digite seu nome completo')
        }
        if (!userType) {
          throw new Error('Selecione se você é cliente ou prestador')
        }
        if (formData.password.length < 6) {
          throw new Error('A senha deve ter no mínimo 6 caracteres')
        }

        // Cadastro
        await signUp(formData.email, formData.password, formData.name)
        
        // TODO: Salvar userType no Firestore
        // await setDoc(doc(db, 'users', user.uid), { userType, createdAt: new Date() })

        // Redirecionar
        if (userType === 'prestador') {
          navigate('/meu-perfil')
        } else {
          navigate('/')
        }
      } else {
        // Login
        await signIn(formData.email, formData.password)
        
        // TODO: Buscar userType do Firestore para saber onde redirecionar
        navigate('/')
      }
    } catch (err: any) {
      // Traduz erros do Firebase
      const errorMessages: Record<string, string> = {
        'auth/email-already-in-use': 'Este e-mail já está cadastrado',
        'auth/invalid-email': 'E-mail inválido',
        'auth/weak-password': 'Senha muito fraca',
        'auth/user-not-found': 'Usuário não encontrado',
        'auth/wrong-password': 'Senha incorreta',
        'auth/invalid-credential': 'E-mail ou senha incorretos',
        'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde',
      }
      
      const message = errorMessages[err.code] || err.message || 'Erro ao processar solicitação'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-16">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Zap className="w-6 h-6 text-background" fill="currentColor" />
            </div>
            <span className="text-2xl font-black">Serviço<span className="text-primary">Flix</span></span>
          </Link>
          <p className="text-muted text-sm mt-2">
            {mode === 'login' ? 'Bem-vindo de volta!' : 'Crie sua conta gratuitamente'}
          </p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6">
          {/* Toggle login/register */}
          <div className="flex bg-background rounded-xl p-1 mb-6">
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m)
                  setError('')
                }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  mode === m ? 'bg-primary text-background' : 'text-muted hover:text-white'
                }`}
              >
                {m === 'login' ? 'Entrar' : 'Cadastrar'}
              </button>
            ))}
          </div>

          {/* Tipo de usuário (só no registro) */}
          {mode === 'register' && (
            <div className="mb-6">
              <p className="text-sm text-muted mb-3">Você é:</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { type: 'cliente' as UserType, icon: User, label: 'Cliente', desc: 'Preciso de serviços' },
                  { type: 'prestador' as UserType, icon: Briefcase, label: 'Prestador', desc: 'Ofereço serviços' },
                ].map(opt => (
                  <motion.button
                    key={opt.label}
                    type="button"
                    onClick={() => setUserType(opt.type)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-4 rounded-xl border-2 text-left transition-colors ${
                      userType === opt.type
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-muted'
                    }`}
                  >
                    <opt.icon className={`w-5 h-5 mb-2 ${ userType === opt.type ? 'text-primary' : 'text-muted'}`} />
                    <p className="text-sm font-bold text-white">{opt.label}</p>
                    <p className="text-xs text-muted">{opt.desc}</p>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Mensagem de erro */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </motion.div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Seu nome completo"
                required
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white text-sm placeholder:text-muted outline-none focus:border-primary transition-colors"
              />
            )}
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              placeholder="Seu e-mail"
              required
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white text-sm placeholder:text-muted outline-none focus:border-primary transition-colors"
            />
            <input
              type="password"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              placeholder="Senha (mínimo 6 caracteres)"
              required
              minLength={6}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white text-sm placeholder:text-muted outline-none focus:border-primary transition-colors"
            />

            <motion.button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-background font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={!loading ? { scale: 1.02 } : {}}
              whileTap={!loading ? { scale: 0.98 } : {}}
            >
              <Zap className="w-4 h-4" fill="currentColor" />
              {loading 
                ? (mode === 'login' ? 'Entrando...' : 'Criando conta...') 
                : (mode === 'login' ? 'Entrar' : 'Criar Conta')
              }
            </motion.button>
          </form>

          {/* Link de recuperação de senha */}
          {mode === 'login' && (
            <div className="mt-4 text-center">
              <button
                type="button"
                className="text-sm text-muted hover:text-primary transition-colors"
              >
                Esqueceu a senha?
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
