import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !email.includes('@')) {
      setError('Veuillez entrer une adresse email valide');
      return;
    }
    try {
      const response = await fetch('https://readdy.ai/api/form/d8q5674jgj4v45gj728g', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ email }),
      });
      if (response.ok) {
        setSubmitted(true);
        setEmail('');
      } else {
        setError('Une erreur est survenue. Veuillez réessayer.');
      }
    } catch (_) {
      setError('Une erreur est survenue. Veuillez réessayer.');
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="relative bg-foreground-950 text-background-50">
      <div className="w-full px-4 md:px-6 lg:px-10 max-w-7xl mx-auto py-14 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          <div className="lg:col-span-4">
            <Link to="/" className="flex items-center gap-2.5 mb-5 no-underline">
              <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center">
                <span className="text-background-50 text-xl font-bold font-heading">Z</span>
              </div>
              <span className="text-3xl font-bold font-heading text-background-50">
                ZIFEK
              </span>
            </Link>
            <p className="text-background-50/50 text-sm leading-relaxed max-w-sm mb-6">
              La plateforme SaaS tout-en-un pour créer votre business en ligne.
              E-commerce, services, marketplace, réservations. Sans code,
              boosté à l'IA.
            </p>
            <div className="flex items-center gap-3">
              {[
                { icon: 'ri-facebook-line', label: 'Facebook' },
                { icon: 'ri-instagram-line', label: 'Instagram' },
                { icon: 'ri-tiktok-line', label: 'TikTok' },
                { icon: 'ri-linkedin-line', label: 'LinkedIn' },
              ].map((social, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-full border border-background-50/15 flex items-center justify-center text-background-50/50 hover:text-background-50 hover:border-background-50/30 transition-colors cursor-pointer"
                  aria-label={social.label}
                  rel="nofollow"
                >
                  <i className={`${social.icon} text-sm`}></i>
                </a>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 lg:col-start-6">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-background-50/30 mb-4">
              Plateforme
            </h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Fonctionnalités', id: 'features' },
                { label: 'Tarifs', id: 'pricing' },
                { label: 'Solutions', id: 'activities' },
                { label: 'Thèmes', href: '#' },
                { label: 'Applications', href: '#' },
              ].map((item, i) => (
                <li key={i}>
                  {item.id ? (
                    <button
                      onClick={() => scrollToSection(item.id!)}
                      className="text-sm text-background-50/50 hover:text-background-50 transition-colors cursor-pointer"
                    >
                      {item.label}
                    </button>
                  ) : (
                    <a
                      href={item.href}
                      className="text-sm text-background-50/50 hover:text-background-50 transition-colors cursor-pointer"
                      rel="nofollow"
                    >
                      {item.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-background-50/30 mb-4">
              Ressources
            </h4>
            <ul className="space-y-2.5">
              {['Blog', 'Documentation', 'API', 'Communauté', 'Status'].map(
                (item, i) => (
                  <li key={i}>
                    <a
                      href="#"
                      className="text-sm text-background-50/50 hover:text-background-50 transition-colors cursor-pointer"
                      rel="nofollow"
                    >
                      {item}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-background-50/30 mb-4">
              Entreprise
            </h4>
            <ul className="space-y-2.5">
              {[
                { label: 'À propos', href: '#' },
                { label: 'Contact', href: '#' },
                { label: 'Carrières', href: '#' },
                { label: 'Presse', href: '#' },
              ].map((item, i) => (
                <li key={i}>
                  <a
                    href={item.href}
                    className="text-sm text-background-50/50 hover:text-background-50 transition-colors cursor-pointer"
                    rel="nofollow"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-background-50/30 mb-4">
              Compte
            </h4>
            <ul className="space-y-2.5">
              {!user && (
                <>
                  <li>
                    <Link
                      to="/login-client"
                      className="text-sm text-background-50/50 hover:text-background-50 transition-colors cursor-pointer no-underline"
                    >
                      Connexion client
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/register-client"
                      className="text-sm text-background-50/50 hover:text-background-50 transition-colors cursor-pointer no-underline"
                    >
                      Créer un compte
                    </Link>
                  </li>
                </>
              )}
              <li>
                <Link
                  to="/login"
                  className="text-sm text-background-50/50 hover:text-background-50 transition-colors cursor-pointer no-underline"
                >
                  Espace professionnel
                </Link>
              </li>
              <li>
                <Link
                  to="/register"
                  className="text-sm text-background-50/50 hover:text-background-50 transition-colors cursor-pointer no-underline"
                >
                  Devenir marchand
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter + copyright */}
        <div className="mt-12 pt-8 border-t border-background-50/10">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <p className="text-xs text-background-50/30">
                © {new Date().getFullYear()} ZIFEK. Tous droits réservés.
              </p>
              <div className="flex items-center gap-4">
                <a
                  href="#"
                  className="text-xs text-background-50/30 hover:text-background-50/60 transition-colors cursor-pointer"
                  rel="nofollow"
                >
                  Confidentialité
                </a>
                <a
                  href="#"
                  className="text-xs text-background-50/30 hover:text-background-50/60 transition-colors cursor-pointer"
                  rel="nofollow"
                >
                  Conditions
                </a>
                <a
                  href="#"
                  className="text-xs text-background-50/30 hover:text-background-50/60 transition-colors cursor-pointer"
                  rel="nofollow"
                >
                  Cookies
                </a>
              </div>
            </div>

            <form
              onSubmit={handleNewsletter}
              data-readdy-form
              className="flex items-center gap-2"
            >
              <input
                type="text"
                name="website_alt"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                readOnly
                className="absolute w-0 h-0 opacity-0"
              />
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Votre email"
                required
                className="w-52 h-10 pl-4 pr-4 rounded-full bg-background-50/5 border border-background-50/10 text-sm text-background-50 placeholder:text-background-50/25 focus:outline-none focus:border-background-50/25 transition-colors"
              />
              <button
                type="submit"
                className="px-5 h-10 bg-background-50 text-foreground-950 rounded-full text-xs font-semibold whitespace-nowrap hover:bg-background-100 transition-colors cursor-pointer"
              >
                {submitted ? 'Inscrit !' : "S'abonner"}
              </button>
            </form>
          </div>
          {error && (
            <p className="text-xs text-red-400 mt-2">{error}</p>
          )}
        </div>
      </div>
    </footer>
  );
}