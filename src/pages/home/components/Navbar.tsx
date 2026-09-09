import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBrand } from '@/hooks/useBrand';

interface NavbarProps {
  forceScrolled?: boolean;
}

export default function Navbar({ forceScrolled = false }: NavbarProps) {
  const [scrolled, setScrolled] = useState(forceScrolled);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loginDropdownOpen, setLoginDropdownOpen] = useState(false);
  const loginDropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { brandName, brandLogo } = useBrand();

  const isScrolled = forceScrolled || scrolled;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (loginDropdownRef.current && !loginDropdownRef.current.contains(e.target as Node)) {
        setLoginDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (forceScrolled) return;
    const handleScroll = () => setScrolled(window.scrollY > 30);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [forceScrolled]);

  const scrollToSection = (id: string) => {
    setMobileOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { label: 'Fonctionnalités', id: 'features' },
    { label: 'Comment ça marche', id: 'how-it-works' },
    { label: 'Tarifs', id: 'pricing' },
    { label: 'FAQ', id: 'faq' },
  ];

  const textColor = isScrolled ? 'text-foreground-700 hover:text-foreground-950' : 'text-white/60 hover:text-white/90';
  const iconColor = isScrolled ? 'text-foreground-600' : 'text-white/50';
  const bgClass = isScrolled
    ? 'bg-background-50/95 backdrop-blur-md border-b border-background-200/70'
    : 'bg-transparent';

  return (
    <>
      <header
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${bgClass}`}
      >
        <div className="w-full px-4 md:px-6 lg:px-10">
          <div className="flex items-center justify-between h-14 md:h-[72px]">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 no-underline shrink-0">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors overflow-hidden ${isScrolled ? 'bg-primary-500' : 'bg-white/12'}`}>
                {brandLogo ? (
                  <img src={brandLogo} alt={brandName || 'ZIFEK'} className="w-full h-full object-cover object-top" />
                ) : (
                  <span className={`text-lg font-bold font-heading transition-colors ${isScrolled ? 'text-background-50' : 'text-white/85'}`}>
                    {(brandName || 'Z').charAt(0)}
                  </span>
                )}
              </div>
              <span className={`text-xl font-bold font-heading transition-colors ${isScrolled ? 'text-foreground-950' : 'text-white/85'}`}>
                {brandName || 'ZIFEK'}
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1" aria-label="Navigation principale">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${textColor}`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2 md:gap-3">
              {user ? (
                <div className="hidden md:flex items-center gap-3">
                  <Link
                    to="/mon-compte"
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer bg-accent-500/15 text-accent-600 hover:bg-accent-500/25 no-underline"
                  >
                    <div className="w-6 h-6 rounded-full bg-accent-500 flex items-center justify-center overflow-hidden">
                      {user.image ? (
                        <img src={user.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <i className="ri-user-line text-[10px] text-white"></i>
                      )}
                    </div>
                    <span className="max-w-[100px] truncate">{user.name || user.user_name}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors cursor-pointer ${iconColor} hover:bg-white/10`}
                    aria-label="Déconnexion"
                  >
                    <i className="ri-logout-box-r-line text-lg"></i>
                  </button>
                </div>
              ) : (
                <>
                  {/* Login dropdown for desktop */}
                  <div className="hidden md:block relative" ref={loginDropdownRef}>
                    <button
                      onClick={() => setLoginDropdownOpen(!loginDropdownOpen)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                        loginDropdownOpen
                          ? (isScrolled ? 'bg-background-100 text-foreground-950' : 'bg-white/8 text-white/90')
                          : textColor
                      }`}
                    >
                      <i className="ri-user-line text-sm"></i>
                      Connexion
                      <i className={`ri-arrow-down-s-line text-sm transition-transform duration-200 ${loginDropdownOpen ? 'rotate-180' : ''}`}></i>
                    </button>

                    {loginDropdownOpen && (
                      <div className={`absolute top-full right-0 mt-2 w-56 rounded-xl border overflow-hidden animate-fade-in ${
                        isScrolled
                          ? 'bg-background-50 border-background-200/70 shadow-lg'
                          : 'bg-foreground-950/40 backdrop-blur-xl border-white/10'
                      }`}>
                        <div className="p-1.5">
                          <button
                            onClick={() => { navigate('/login-client'); setLoginDropdownOpen(false); }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left ${
                              isScrolled
                                ? 'text-foreground-700 hover:bg-accent-50 hover:text-accent-700'
                                : 'text-white/80 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isScrolled ? 'bg-accent-100' : 'bg-white/10'
                            }`}>
                              <i className={`ri-user-smile-line text-sm ${isScrolled ? 'text-accent-600' : 'text-accent-300'}`}></i>
                            </div>
                            <div>
                              <div className="text-sm font-semibold">Espace client</div>
                              <div className={`text-xs font-normal ${isScrolled ? 'text-foreground-400' : 'text-white/40'}`}>Mes achats, mes fichiers</div>
                            </div>
                          </button>
                          <button
                            onClick={() => { navigate('/login'); setLoginDropdownOpen(false); }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left ${
                              isScrolled
                                ? 'text-foreground-700 hover:bg-primary-50 hover:text-primary-700'
                                : 'text-white/80 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isScrolled ? 'bg-primary-100' : 'bg-white/10'
                            }`}>
                              <i className={`ri-store-2-line text-sm ${isScrolled ? 'text-primary-600' : 'text-primary-300'}`}></i>
                            </div>
                            <div>
                              <div className="text-sm font-semibold">Espace professionnel</div>
                              <div className={`text-xs font-normal ${isScrolled ? 'text-foreground-400' : 'text-white/40'}`}>Gérer ma boutique</div>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => navigate('/register')}
                    className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                      isScrolled
                        ? 'bg-foreground-950 text-background-50 hover:bg-foreground-800'
                        : 'bg-white/12 backdrop-blur-sm text-white border border-white/20 hover:bg-white/20 hover:border-white/30'
                    }`}
                  >
                    Créer mon site
                    <i className="ri-arrow-right-line text-sm"></i>
                  </button>
                </>
              )}

              {/* Mobile hamburger - FIXED ICON */}
              <button
                className="md:hidden w-10 h-10 flex items-center justify-center cursor-pointer"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Menu"
              >
                <i
                  className={`${mobileOpen ? 'ri-close-line' : 'ri-menu-line'} text-xl transition-colors ${isScrolled ? 'text-foreground-900' : 'text-white/60'}`}
                ></i>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile overlay + menu */}
      <div
        className={`fixed inset-0 z-40 bg-foreground-950/40 transition-opacity duration-300 md:hidden ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileOpen(false)}
      ></div>
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 w-[280px] bg-background-50 border-l border-background-200/70 transform transition-transform duration-300 ease-out md:hidden ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-background-200/70">
          <span className="text-lg font-bold font-heading text-foreground-950">Menu</span>
          <button onClick={() => setMobileOpen(false)} className="w-10 h-10 flex items-center justify-center cursor-pointer">
            <i className="ri-close-line text-xl text-foreground-600"></i>
          </button>
        </div>

        <div className="p-4 flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-foreground-700 hover:bg-background-100 hover:text-foreground-950 transition-colors cursor-pointer text-left"
            >
              <i className="ri-arrow-right-s-line text-foreground-400"></i>
              {item.label}
            </button>
          ))}

          <div className="border-t border-background-200/70 my-3"></div>

          {user ? (
            <>
              <Link
                to="/mon-compte"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-accent-600 hover:bg-accent-50 transition-colors cursor-pointer no-underline"
              >
                <i className="ri-user-line text-accent-500"></i>
                Mon espace Zifek
              </Link>
              <button
                onClick={() => { handleLogout(); setMobileOpen(false); }}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-foreground-500 hover:bg-background-100 transition-colors cursor-pointer w-full text-left"
              >
                <i className="ri-logout-box-r-line"></i>
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { navigate('/login-client'); setMobileOpen(false); }}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-foreground-700 hover:bg-accent-50 transition-colors cursor-pointer text-left"
              >
                <div className="w-6 h-6 rounded bg-accent-100 flex items-center justify-center">
                  <i className="ri-user-smile-line text-accent-600 text-xs"></i>
                </div>
                Connexion client
              </button>
              <button
                onClick={() => { navigate('/login'); setMobileOpen(false); }}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-foreground-700 hover:bg-primary-50 transition-colors cursor-pointer text-left"
              >
                <div className="w-6 h-6 rounded bg-primary-100 flex items-center justify-center">
                  <i className="ri-store-2-line text-primary-600 text-xs"></i>
                </div>
                Connexion professionnel
              </button>
              <div className="border-t border-background-200/70 my-2"></div>
              <button
                onClick={() => { navigate('/register'); setMobileOpen(false); }}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-background-50 bg-foreground-950 hover:bg-foreground-800 transition-colors cursor-pointer"
              >
                <i className="ri-rocket-line"></i>
                Créer mon site
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}