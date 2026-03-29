import { Link } from 'react-router-dom'

export const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-black/80 border-t border-white/10 mt-16 py-12 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Grid principal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Marca */}
          <div>
            <h2 className="text-2xl font-black text-white mb-2">
              Serviço<span className="text-primary">flix</span>
            </h2>
            <p className="text-muted text-sm leading-relaxed">
              O marketplace de serviços que conecta você aos melhores profissionais da sua cidade.
            </p>
          </div>

          {/* Navegação */}
          <div>
            <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wider">Plataforma</h3>
            <ul className="space-y-2">
              <li><Link to="/" className="text-muted text-sm hover:text-white transition-colors">Início</Link></li>
              <li><Link to="/search" className="text-muted text-sm hover:text-white transition-colors">Buscar serviços</Link></li>
              <li><Link to="/become-provider" className="text-muted text-sm hover:text-white transition-colors">Seja um prestador</Link></li>
            </ul>
          </div>

          {/* Conta */}
          <div>
            <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wider">Conta</h3>
            <ul className="space-y-2">
              <li><Link to="/login" className="text-muted text-sm hover:text-white transition-colors">Entrar</Link></li>
              <li><Link to="/my-account" className="text-muted text-sm hover:text-white transition-colors">Minha conta</Link></li>
              <li><Link to="/settings" className="text-muted text-sm hover:text-white transition-colors">Configurações</Link></li>
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wider">Contato</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="mailto:contato@servicoflix.com.br"
                  className="text-muted text-sm hover:text-white transition-colors"
                >
                  contato@servicoflix.com.br
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/5538999999999"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted text-sm hover:text-white transition-colors"
                >
                  WhatsApp
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divisor */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-muted text-xs">
            © {currentYear} Servicoflix. Todos os direitos reservados.
          </p>
          <div className="flex gap-4">
            <Link to="/" className="text-muted text-xs hover:text-white transition-colors">Termos de uso</Link>
            <Link to="/" className="text-muted text-xs hover:text-white transition-colors">Política de privacidade</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
