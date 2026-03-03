import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { Zap } from 'lucide-react'

export const SimpleLoginPage = () => {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const createUserProfile = async (userId: string, email: string, displayName: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId))
      
      if (!userDoc.exists()) {
        console.log('📝 [Login] Criando perfil para:', email)
        await setDoc(doc(db, 'users', userId), {
          email,
          name: displayName,
          roles: ['client'],
          clientProfile: {},
          createdAt: serverTimestamp(),
        })
        console.log('✅ [Login] Perfil criado com sucesso')
      } else {
        console.log('✅ [Login] Perfil já existe')
      }
    } catch (err) {
      console.error('❌ [Login] Erro ao criar perfil:', err)
      throw err
    }
  }

  // Verifica se já está logado
  useEffect(() => {
    console.log('🔍 [Login] Montando componente...')
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('🔥 [Login] onAuthStateChanged:', user ? user.email : 'sem user')
      
      if (user) {
        console.log('✅ [Login] Usuário já logado, redirecionando...')
        navigate('/', { replace: true })
      } else {
        console.log('⏹️ [Login] Não há usuário, mostrando tela de login')
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [navigate])

  // Verifica resultado do redirect do Google
  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        console.log('🔍 [Login] Verificando redirect result...')
        const result = await getRedirectResult(auth)
        console.log('📦 [Login] Redirect result:', result)
        
        if (result?.user) {
          console.log('✅ [Login] Usuário do redirect:', result.user.email)
          console.log('📸 [Login] photoURL:', result.user.photoURL)
          console.log('👤 [Login] displayName:', result.user.displayName)
          
          await createUserProfile(
            result.user.uid,
            result.user.email!,
            result.user.displayName || result.user.email!.split('@')[0]
          )
          
          console.log('🎉 [Login] Login com Google concluído!')
          // onAuthStateChanged vai redirecionar
        } else {
          console.log('⏹️ [Login] Nenhum redirect pendente')
        }
      } catch (err: any) {
        console.error('❌ [Login] Erro no redirect:', err)
        console.error('❌ [Login] Código do erro:', err.code)
        console.error('❌ [Login] Mensagem:', err.message)
        
        if (err.code !== 'auth/popup-closed-by-user') {
          setError('Erro ao processar login. Tente novamente.')
        }
        setLoading(false)
      }
    }
    
    checkRedirectResult()
  }, [])

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      console.log('📧 [Login] Autenticando com email...')
      
      // Garante persistência
      await setPersistence(auth, browserLocalPersistence)
      
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password)
        console.log('✅ [Login] Login com email bem-sucedido')
      } else {
        const result = await createUserWithEmailAndPassword(auth, email, password)
        console.log('✅ [Login] Conta criada com email')
        await createUserProfile(result.user.uid, email, name || email.split('@')[0])
      }
      // onAuthStateChanged vai redirecionar
    } catch (err: any) {
      console.error('❌ [Login] Erro email auth:', err)
      const errorMessages: Record<string, string> = {
        'auth/user-not-found': 'Usuário não encontrado',
        'auth/wrong-password': 'Senha incorreta',
        'auth/invalid-credential': 'Email ou senha inválidos',
        'auth/email-already-in-use': 'Email já cadastrado',
        'auth/weak-password': 'Senha muito fraca (mínimo 6 caracteres)',
      }
      setError(errorMessages[err.code] || 'Erro ao autenticar')
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    setError('')
    setLoading(true)

    try {
      console.log('🔵 [Login] Iniciando redirect para Google...')
      
      // Garante persistência ANTES do redirect
      await setPersistence(auth, browserLocalPersistence)
      console.log('✅ [Login] Persistência configurada')
      
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({
        prompt: 'select_account'
      })
      
      console.log('🚀 [Login] Chamando signInWithRedirect...')
      await signInWithRedirect(auth, provider)
      console.log('✅ [Login] signInWithRedirect executado (página vai recarregar)')
      // Página vai recarregar e voltar aqui
    } catch (err: any) {
      console.error('❌ [Login] Erro Google auth:', err)
      console.error('❌ [Login] Código:', err.code)
      console.error('❌ [Login] Mensagem:', err.message)
      setError('Erro ao iniciar login com Google')
      setLoading(false)
    }
  }

  // Mostra loading enquanto verifica redirect ou auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Zap className="w-7 h-7 text-background" fill="currentColor" />
            </div>
            <span className="text-3xl font-black text-white">
              Serviço<span className="text-primary">Flix</span>
            </span>
          </div>
          <p className="text-gray-400">
            {isLogin ? 'Entre na sua conta' : 'Crie sua conta'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          {/* Toggle */}
          <div className="flex bg-gray-800 rounded-xl p-1 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                isLogin ? 'bg-primary text-background' : 'text-gray-400'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                !isLogin ? 'bg-primary text-background' : 'text-gray-400'
              }`}
            >
              Cadastrar
            </button>
          </div>

          {/* Google Button */}
          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full bg-white text-gray-900 font-semibold py-3 rounded-xl flex items-center justify-center gap-3 mb-6 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar com Google
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-gray-900 px-2 text-gray-500">ou</span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {!isLogin && (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:border-primary outline-none"
              />
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:border-primary outline-none"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
              required
              minLength={6}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:border-primary outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-background font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Carregando...' : isLogin ? 'Entrar' : 'Criar Conta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
