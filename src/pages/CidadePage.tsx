import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useCityFilter } from '@/components/CitySelectorNav'
import { useSeoMeta } from '@/hooks/useSeoMeta'
import { HomePage } from '@/pages/HomePage'
import { City } from '@/hooks/useCities'
import { Loader2 } from 'lucide-react'

/**
 * CidadePage
 *
 * Renderizada quando a URL bate em /:slug e o slug corresponde
 * a uma cidade cadastrada no Firestore (collection 'cities').
 *
 * O que faz:
 * 1. Busca a cidade pelo campo `slug` no Firestore
 * 2. Força o filtro global de cidade via updateCityFilter()
 * 3. Aplica metatags de SEO dinâmicas (title + meta description + og)
 * 4. Renderiza a HomePage normalmente — já filtrada pela cidade
 * 5. Exibe um bloco de texto SEO discreto abaixo do conteúdo
 *
 * Se o slug NÃO for uma cidade válida, o App.tsx trata o redirecionamento
 * para UsernameProfilePage antes de chegar aqui.
 */
export const CidadePage = () => {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { updateCityFilter } = useCityFilter()

  const [cidade, setCidade] = useState<City | null>(null)
  const [loading, setLoading] = useState(true)

  // Aplica SEO assim que a cidade for resolvida
  useSeoMeta(
    cidade
      ? { cidade: cidade.nome, uf: cidade.uf }
      : {}
  )

  useEffect(() => {
    const resolve = async () => {
      if (!slug) { navigate('/'); return }

      try {
        const q = query(
          collection(db, 'cities'),
          where('slug', '==', slug.toLowerCase()),
          where('status', '==', 'ativa')
        )
        const snap = await getDocs(q)

        if (!snap.empty) {
          const data = { id: snap.docs[0].id, ...snap.docs[0].data() } as City
          setCidade(data)
          // Força o filtro global de cidade para toda a HomePage
          updateCityFilter(data.nome, false)
        } else {
          // Slug não é cidade — redireciona para resolver como username
          navigate(`/profissional-nao-encontrado`, { replace: true })
        }
      } catch {
        navigate('/', { replace: true })
      } finally {
        setLoading(false)
      }
    }

    resolve()
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          <p className="text-muted text-sm">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!cidade) return null

  return (
    <>
      {/* HomePage já filtrada pela cidade via updateCityFilter */}
      <HomePage />

      {/* Bloco de texto SEO — visível mas discreto, indexado pelo Google */}
      <section className="bg-black/60 border-t border-white/5 py-10 px-4 sm:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-white font-bold text-lg mb-3">
            Prestadores de Serviço em {cidade.nome}{cidade.uf ? `, ${cidade.uf}` : ''}
          </h2>
          <p className="text-muted text-sm leading-relaxed">
            O Servicoflix é o marketplace de serviços locais de{' '}
            <strong className="text-white">{cidade.nome}</strong>.
            Encontre eletricistas, diaristas, pedreiros, professores, médicos e muito mais
            — todos avaliados pela comunidade local.
            Contrate com segurança, veja portfólios e converse diretamente com o profissional.
          </p>
          <p className="text-muted/60 text-xs mt-4">
            Serviços disponíveis em {cidade.nome}{cidade.uf ? ` • ${cidade.uf}` : ''} • Servicoflix
          </p>
        </div>
      </section>
    </>
  )
}
