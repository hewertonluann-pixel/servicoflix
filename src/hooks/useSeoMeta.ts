import { useEffect } from 'react'

interface SeoMetaOptions {
  title?: string
  description?: string
  cidade?: string
  uf?: string
}

/**
 * Hook que atualiza dinamicamente o <title> e <meta description> da página.
 * Usado principalmente nas páginas de cidade para SEO local.
 *
 * Exemplo:
 *   useSeoMeta({ cidade: 'Diamantina', uf: 'MG' })
 *   → title: "Prestadores de Serviço em Diamantina MG • Servicoflix"
 */
export const useSeoMeta = (options: SeoMetaOptions) => {
  const { title, description, cidade, uf } = options

  useEffect(() => {
    const previousTitle = document.title
    const previousDesc = getMeta('description')

    // --- Title ---
    if (title) {
      document.title = title
    } else if (cidade) {
      const sufixo = uf ? ` ${uf}` : ''
      document.title = `Prestadores de Servi\u00e7o em ${cidade}${sufixo} \u2022 Servicoflix`
    } else {
      document.title = 'Servicoflix \u2022 Encontre profissionais na sua cidade'
    }

    // --- Meta description ---
    const descContent = description
      ? description
      : cidade
      ? `Encontre os melhores prestadores de servi\u00e7o em ${cidade}${
          uf ? ', ' + uf : ''
        }. Eletricistas, diaristas, pedreiros e muito mais, todos avaliados pela comunidade local. Acesse o Servicoflix!`
      : 'Marketplace de servi\u00e7os locais. Conecte-se com os melhores profissionais da sua cidade.'

    setMeta('description', descContent)

    // --- Open Graph (para compartilhamento no WhatsApp/Instagram) ---
    setMeta('og:title', document.title)
    setMeta('og:description', descContent)
    setMeta('og:type', 'website')

    // Restaura ao desmontar o componente
    return () => {
      document.title = previousTitle
      if (previousDesc) setMeta('description', previousDesc)
    }
  }, [title, description, cidade, uf])
}

// --- Helpers ---

function getMeta(name: string): string | null {
  const el =
    document.querySelector(`meta[name="${name}"]`) ||
    document.querySelector(`meta[property="${name}"]`)
  return el ? el.getAttribute('content') : null
}

function setMeta(nameOrProperty: string, content: string) {
  // Tenta name= primeiro, depois property=
  let el = document.querySelector(`meta[name="${nameOrProperty}"]`) as HTMLMetaElement | null

  if (!el) {
    el = document.querySelector(`meta[property="${nameOrProperty}"]`) as HTMLMetaElement | null
  }

  if (el) {
    el.setAttribute('content', content)
  } else {
    // Cria a tag se não existir
    const meta = document.createElement('meta')
    const isOg = nameOrProperty.startsWith('og:')
    meta.setAttribute(isOg ? 'property' : 'name', nameOrProperty)
    meta.setAttribute('content', content)
    document.head.appendChild(meta)
  }
}
