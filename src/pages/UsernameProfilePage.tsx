import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Loader2 } from 'lucide-react'

export const UsernameProfilePage = () => {
  const { username } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    const resolve = async () => {
      if (!username) { navigate('/'); return }

      try {
        const q = query(
          collection(db, 'users'),
          where('username', '==', username.toLowerCase())
        )
        const snap = await getDocs(q)

        if (!snap.empty) {
          navigate(`/profissional/${snap.docs[0].id}`, { replace: true })
        } else {
          navigate('/', { replace: true })
        }
      } catch {
        navigate('/', { replace: true })
      }
    }
    resolve()
  }, [username])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
        <p className="text-muted text-sm">Carregando perfil...</p>
      </div>
    </div>
  )
}
