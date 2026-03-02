import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, User, Briefcase } from 'lucide-react'

type UserType = 'cliente' | 'prestador' | null

export const LoginPage = () => {
  const [userType, setUserType] = useState<UserType>(null)
  const [mode, setMode] = useState<'login' | 'register'>('login')

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
                onClick={() => setMode(m)}
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

          {/* Formulário */}
          <form className="space-y-4">
            {mode === 'register' && (
              <input
                type="text"
                placeholder="Seu nome completo"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white text-sm placeholder:text-muted outline-none focus:border-primary transition-colors"
              />
            )}
            <input
              type="email"
              placeholder="Seu e-mail"
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white text-sm placeholder:text-muted outline-none focus:border-primary transition-colors"
            />
            <input
              type="password"
              placeholder="Senha"
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white text-sm placeholder:text-muted outline-none focus:border-primary transition-colors"
            />

            <motion.button
              type="submit"
              className="w-full bg-primary text-background font-bold py-3 rounded-xl flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Zap className="w-4 h-4" fill="currentColor" />
              {mode === 'login' ? 'Entrar' : 'Criar Conta'}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
