import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, User, Briefcase, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

type UserType = 'cliente' | 'prestador' | null

export const LoginPage = () => {
  const navigate = useNavigate()
  const { signUp, signIn, signInWithGoogle } = useAuth()
  
  const [userType, setUserType] = useState<UserType>(null)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Campos do formulário
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  })

  const translateError = (err: any) => {
    const errorMessages: Record<string, string> = {
      'auth/email-already-in-use': 'Este e-mail já está cadastrado',
      'auth/invalid-email': 'E-mail inválido',
      'auth/weak-password': 'Senha muito fraca',
      'auth/user-not-found': 'Usuário não encontrado',
      'auth/wrong-password': 'Senha incorreta',
      'auth/invalid-credential': 'E-mail ou senha incorretos',
      'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde',
      'auth/popup-closed-by-user': 'Login cancelado',
      'auth/cancelled-popup-request': 'Login cancelado',
      'auth/account-exists-with-different-credential': 'Já existe uma conta com este e-mail',
    }
    
    return errorMessages[err.code] || err.message || 'Erro ao processar solicitação'
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setGoogleLoading(true)

    try {
      if (mode === 'register' && !userType) {
        throw new Error('Selecione se você é cliente ou prestador antes de continuar')
      }

      await signInWithGoogle()
      
      // TODO: Se for cadastro, salvar userType no Firestore
      // if (mode === 'register') {
      //   await setDoc(doc(db, 'users', user.uid), { userType, createdAt: new Date() })
      // }

      // Redirecionar
      if (mode === 'register' && userType === 'prestador') {
        navigate('/meu-perfil')
      } else {
        navigate('/')
      }
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setError(translateError(err))
      }
    } finally {
      setGoogleLoading(false)
    }
  }

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
      setError(translateError(err))
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

          {/* Botão Google */}
          <motion.button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full bg-white text-gray-900 font-semibold py-3 rounded-xl flex items-center justify-center gap-3 mb-6 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={!googleLoading && !loading ? { scale: 1.02 } : {}}
            whileTap={!googleLoading && !loading ? { scale: 0.98 } : {}}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {googleLoading 
              ? 'Conectando...' 
              : `${mode === 'login' ? 'Entrar' : 'Continuar'} com Google`
            }
          </motion.button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-surface px-2 text-muted">ou</span>
            </div>
          </div>

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
              disabled={loading || googleLoading}
              className="w-full bg-primary text-background font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={!loading && !googleLoading ? { scale: 1.02 } : {}}
              whileTap={!loading && !googleLoading ? { scale: 0.98 } : {}}
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
