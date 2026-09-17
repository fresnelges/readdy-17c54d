import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth, isSuperAdmin } from '@/hooks/useAuth';
import { useBrand } from '@/hooks/useBrand';

const NAV_ITEMS = [
  { icon: 'ri-dashboard-line', label: 'Tableau de bord', path: '/superadmin' },
  { icon: 'ri-user-line', label: 'Utilisateurs', path: '/superadmin/users' },
  { icon: 'ri-palette-line', label: 'Theme Builder', path: '/superadmin/themes' },
  { icon: 'ri-apps-2-line', label: 'App Builder', path: '/superadmin/apps' },
  { icon: 'ri-home-8-line', label: "Page d'accueil", path: '/superadmin/homepage' },
  { icon: 'ri-terminal-line', label: 'Logs Système', path: '/superadmin/logs' },
  { icon: 'ri-database-2-line', label: 'Stockage', path: '/superadmin/storage' },
  { icon: 'ri-shield-keyhole-line', label: 'Paramètres IA', path: '/superadmin/settings' },
];

export default function SuperAdminLayout() {
  const { user, logout } = useAuth();
  const { brand } = useBrand();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (!isSuperAdmin(user.typecompte)) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return null;
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background-100 flex">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside className={`fixed top-0 left-0 z-50 h-[100dvh] w-72 max-w-[85vw] bg-background-50 border-r border-background-200/70 transition-transform duration-200 lg:w-64 lg:max-w-none lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo - fixed at top */}
          <div className="flex-shrink-0 p-5 pb-3">
            <div className="flex items-center justify-between gap-2 mb-6">
              <Link to="/superadmin" className="flex items-center gap-2 min-w-0">
                {brand.logo ? (
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-background-50 border border-background-200/50 flex items-center justify-center flex-shrink-0">
                    <img
                      src={brand.logo}
                      alt={brand.name}
                      className="w-full h-full object-contain p-1"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-foreground-950 flex items-center justify-center flex-shrink-0">
                    <span className="text-background-50 font-bold text-sm font-heading">
                      {brand.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-lg font-bold font-heading text-foreground-950">
                    {brand.name}
                  </span>
                  <span className="block text-[10px] text-foreground-400 -mt-0.5">SuperAdmin</span>
                </div>
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="lg:hidden w-8 h-8 flex items-center justify-center rounded-md text-foreground-500 hover:bg-background-100 hover:text-foreground-800 transition-colors cursor-pointer shrink-0"
                title="Fermer le menu"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
          </div>

          {/* Navigation - scrollable */}
          <nav className="sidebar-scroll flex-1 overflow-y-auto px-3 pb-4 overscroll-contain" style={{ scrollbarWidth: 'thin', scrollbarColor: 'oklch(var(--foreground-200) / 0.5) transparent' }}>
            <div className="space-y-0.5">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    isActive(item.path)
                      ? 'bg-foreground-100 text-foreground-900 font-semibold'
                      : 'text-foreground-700 hover:bg-background-100 hover:text-foreground-950'
                  }`}
                >
                  <i className={`${item.icon} text-lg w-5 h-5 flex items-center justify-center flex-shrink-0`}></i>
                  <span className="leading-snug">{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>

          {/* User section - fixed at bottom */}
          <div className="flex-shrink-0 p-5 pt-3 border-t border-background-200/70">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-foreground-100 flex items-center justify-center flex-shrink-0">
                <span className="text-foreground-700 font-bold text-xs">{user.name.charAt(0)}</span>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground-950 truncate">{user.name}</div>
                <div className="text-xs text-foreground-500 truncate">Super Admin</div>
              </div>
            </div>
            <Link
              to="/dashboard"
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-foreground-500 hover:text-foreground-800 hover:bg-background-100 transition-colors cursor-pointer mb-2"
            >
              <i className="ri-store-2-line w-5 h-5 flex items-center justify-center flex-shrink-0"></i>
              Mon dashboard
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-foreground-500 hover:text-foreground-800 hover:bg-background-100 transition-colors cursor-pointer"
            >
              <i className="ri-logout-box-r-line w-5 h-5 flex items-center justify-center flex-shrink-0"></i>
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-30 bg-background-50/95 backdrop-blur-md border-b border-background-200/70">
          <div className="flex items-center justify-between h-14 md:h-16 px-4 md:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden w-9 h-9 flex items-center justify-center rounded-md border border-background-200/70 cursor-pointer"
              >
                <i className="ri-menu-line text-lg text-foreground-700"></i>
              </button>
              <h1 className="text-lg font-bold font-heading text-foreground-950">
                SuperAdmin
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-foreground-500 hover:text-foreground-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-store-2-line"></i>
                <span>Dashboard</span>
              </Link>
            </div>
          </div>
        </header>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}