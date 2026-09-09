import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBrand } from '@/hooks/useBrand';
import { useOutfitReminders } from '@/hooks/useOutfitReminders';

interface ClientDashboardNavbarProps {
  onMenuToggle?: () => void;
  menuOpen?: boolean;
}

export default function ClientDashboardNavbar({ onMenuToggle, menuOpen }: ClientDashboardNavbarProps) {
  const { user, logout } = useAuth();
  const { brand } = useBrand();
  const navigate = useNavigate();
  const { upcomingCount } = useOutfitReminders();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 14);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [userMenuOpen]);

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
    navigate('/');
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-background-50/90 backdrop-blur-xl border-b border-background-200/40 shadow-[0_1px_3px_rgba(0,0,0,0.03)]'
          : 'bg-background-50/70 backdrop-blur-lg border-b border-transparent'
      }`}
    >
      <div className="flex items-center justify-between h-14 md:h-16 px-4 md:px-6 lg:px-8">
        {/* Left — Brand */}
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 group cursor-pointer">
          {brand.logo ? (
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg overflow-hidden bg-background-50 border border-background-200/50 flex-shrink-0">
              <img
                src={brand.logo}
                alt={brand.name}
                className="w-full h-full object-contain p-1"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.querySelector('.logo-fallback')?.classList.remove('hidden');
                }}
              />
              <div className="logo-fallback hidden w-full h-full bg-foreground-900 flex items-center justify-center">
                <span className="text-background-50 font-bold text-sm md:text-base font-heading tracking-tight">
                  {brand.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-foreground-900 flex items-center justify-center group-hover:bg-foreground-800 transition-colors">
              <span className="text-background-50 font-bold text-sm md:text-base font-heading tracking-tight">
                {brand.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex flex-col leading-none">
            <span className="text-sm md:text-base font-bold font-heading text-foreground-900 tracking-tight">
              {brand.name}
            </span>
            <span className="text-[9px] md:text-[10px] font-medium text-foreground-400 tracking-[0.15em] uppercase">
              Dressing
            </span>
          </div>
        </Link>

        {/* Center — Quick nav (desktop) */}
        <nav className="hidden md:flex items-center gap-0.5">
          <Link
            to="/"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-foreground-500 hover:text-foreground-800 hover:bg-background-100 transition-all cursor-pointer whitespace-nowrap"
          >
            <i className="ri-home-4-line text-sm"></i>
            <span>Accueil</span>
          </Link>
          <Link
            to="/mon-planning"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-foreground-500 hover:text-foreground-800 hover:bg-background-100 transition-all cursor-pointer whitespace-nowrap relative"
          >
            <i className="ri-calendar-2-line text-sm"></i>
            <span>Planning</span>
            {upcomingCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-accent-500 text-background-50 text-[9px] font-bold flex items-center justify-center leading-none">
                {upcomingCount > 9 ? '9+' : upcomingCount}
              </span>
            )}
          </Link>
        </nav>

        {/* Right — Actions */}
        <div className="flex items-center gap-2">
          {/* Mobile menu toggle */}
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-700 hover:bg-background-100 transition-colors cursor-pointer"
            >
              <i className={`text-lg ${menuOpen ? 'ri-close-line' : 'ri-menu-3-line'}`}></i>
            </button>
          )}

          {/* Planning quick link (mobile) */}
          <Link
            to="/mon-planning"
            className="md:hidden relative w-9 h-9 rounded-lg flex items-center justify-center text-foreground-500 hover:text-foreground-700 hover:bg-background-100 transition-colors cursor-pointer"
          >
            <i className="ri-calendar-2-line text-lg"></i>
            {upcomingCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-accent-500 text-background-50 text-[9px] font-bold flex items-center justify-center leading-none">
                {upcomingCount > 9 ? '9+' : upcomingCount}
              </span>
            )}
          </Link>

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-background-100 transition-all cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-foreground-100 flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-background-50">
                {user?.image ? (
                  <img src={user.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-foreground-700 font-semibold text-xs">
                    {user?.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium text-foreground-600 hidden md:block max-w-[100px] truncate">
                {user?.name || 'Compte'}
              </span>
              <i className={`ri-arrow-down-s-line text-xs text-foreground-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`}></i>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-60 bg-background-50 border border-background-200/70 rounded-xl shadow-lg z-50 py-2 animate-scale-in origin-top-right">
                <div className="px-4 py-3 border-b border-background-200/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-foreground-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {user?.image ? (
                        <img src={user.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-foreground-600 font-bold text-sm">{user?.name?.charAt(0)?.toUpperCase() || '?'}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground-900 truncate">{user?.name}</p>
                      <p className="text-[11px] text-foreground-500 truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>
                <div className="py-1">
                  <Link
                    to="/mon-compte"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-xs text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer"
                  >
                    <i className="ri-user-settings-line text-sm"></i>
                    Mon profil
                  </Link>
                  <Link
                    to="/mon-planning"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-xs text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer"
                  >
                    <i className="ri-calendar-2-line text-sm"></i>
                    Planning semaine
                    {upcomingCount > 0 && (
                      <span className="ml-auto px-1.5 py-0.5 rounded-full bg-accent-100 text-accent-700 text-[10px] font-bold">{upcomingCount}</span>
                    )}
                  </Link>
                </div>
                <div className="border-t border-background-200/50 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-foreground-500 hover:text-red-600 hover:bg-red-50/60 transition-colors cursor-pointer"
                  >
                    <i className="ri-logout-box-line text-sm"></i>
                    Déconnexion
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}