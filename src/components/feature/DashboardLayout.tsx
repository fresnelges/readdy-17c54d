import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBrand } from '@/hooks/useBrand';
import { supabase } from '@/lib/supabase';
import { buildSubdomain } from '@/lib/domain';

interface AppLink {
  nompage: string;
  label: string;
  icon: string;
}

const BASE_NAV_ITEMS = [
  { icon: 'ri-dashboard-line', label: 'Tableau de bord', path: '/dashboard' },
  { icon: 'ri-shopping-bag-3-line', label: 'Produits', path: '/dashboard/products' },
  { icon: 'ri-shopping-cart-2-line', label: 'Ma caisse', path: '/dashboard/caisse', appPage: 'caisse' },
  { icon: 'ri-service-line', label: 'Services', path: '/dashboard/services' },
  { icon: 'ri-file-list-3-line', label: 'Commandes', path: '/dashboard/orders' },
  { icon: 'ri-user-line', label: 'Clients', path: '/dashboard/customers' },
  { icon: 'ri-bank-card-line', label: 'Paiements', path: '/dashboard/payments' },
  { icon: 'ri-store-2-line', label: 'Ma boutique', path: '/dashboard/store' },
  { icon: 'ri-image-line', label: 'Médias', path: '/dashboard/media' },
  { icon: 'ri-line-chart-line', label: 'Statistiques', path: '/dashboard/analytics' },
  { icon: 'ri-apps-2-line', label: 'AppStore', path: '/dashboard/appstore' },
  { icon: 'ri-toggle-line', label: 'Mes Apps', path: '/dashboard/apps' },
  { icon: 'ri-palette-line', label: 'ThemeStore', path: '/dashboard/themestore' },
  { icon: 'ri-settings-3-line', label: 'Paramètres', path: '/dashboard/settings' },
];

const INSTALLABLE_APPS: AppLink[] = [
  { nompage: 'analytics-advanced', label: 'Analytics Avancés', icon: 'ri-line-chart-line' },
  { nompage: 'customers-manager', label: 'Gestion Clients', icon: 'ri-user-settings-line' },
  { nompage: 'whatsapp-button', label: 'Bouton WhatsApp', icon: 'ri-whatsapp-line' },
  { nompage: 'ai-shopper', label: 'AI Shopper', icon: 'ri-robot-2-line' },
  { nompage: 'customer-support', label: 'Service Client', icon: 'ri-customer-service-2-line' },
  { nompage: 'facebook-pixel', label: 'Facebook Pixel', icon: 'ri-facebook-circle-line' },
  { nompage: 'ia-reporting', label: 'Analyse & Reporting IA', icon: 'ri-brain-line' },
  { nompage: 'ma-fidelite', label: 'Ma Fidélité', icon: 'ri-heart-line' },
  { nompage: 'fidelite-recompenses', label: 'Fidélité & Récompenses', icon: 'ri-vip-crown-line' },
  { nompage: 'mon-assistant', label: 'Mon Assistant', icon: 'ri-robot-2-line' },
  { nompage: 'paypal', label: 'PayPal', icon: 'ri-paypal-line' },
  { nompage: 'file-manager', label: 'File Manager', icon: 'ri-folder-line' },
  { nompage: 'forms', label: 'Forms', icon: 'ri-survey-line' },
  { nompage: 'zcalendar', label: 'ZCalendar', icon: 'ri-calendar-line' },
  { nompage: 'zifekbi', label: 'ZifekBI', icon: 'ri-bar-chart-box-line' },
  { nompage: 'gestionpro', label: 'GESTIONPRO', icon: 'ri-projector-line' },
  { nompage: 'zcall', label: 'ZCall', icon: 'ri-vidicon-line' },
  { nompage: 'formation', label: 'Formation', icon: 'ri-graduation-cap-line' },
];

type PreviewDevice = 'mobile' | 'tablet' | 'desktop';

const DEVICE_SIZES: Record<PreviewDevice, { width: string; height: string; label: string; icon: string }> = {
  mobile: { width: '375px', height: '667px', label: 'Mobile', icon: 'ri-smartphone-line' },
  tablet: { width: '768px', height: '900px', label: 'Tablette', icon: 'ri-tablet-line' },
  desktop: { width: '100%', height: '100%', label: 'Desktop', icon: 'ri-computer-line' },
};

function cleanDisplayUrl(url: string): string {
  return url.replace(/^https?:\/\//, '');
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { brand } = useBrand();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [siteUrl, setSiteUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isCustomDomain, setIsCustomDomain] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
  const [installedAppPages, setInstalledAppPages] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    const fallback = buildSubdomain(user.user_name);
    setSiteUrl(fallback);
    setIsCustomDomain(false);

    supabase
      .from('websitedomain')
      .select('domaine')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.domaine) {
          const domain = data.domaine.replace(/\/+$/, '');
          setSiteUrl(domain.startsWith('http') ? domain : `https://${domain}`);
          setIsCustomDomain(true);
        }
      })
      .catch(() => {});

    // Check which installable apps are active
    supabase
      .from('appvendeur')
      .select('nompage')
      .eq('idcommerce', user.id)
      .eq('status', 1)
      .then(({ data }) => {
        const pages = new Set((data || []).map((r: { nompage: string }) => r.nompage));
        setInstalledAppPages(pages);
      })
      .catch(() => {});
  }, [user, navigate, location.pathname]);



  const copySiteUrl = useCallback(() => {
    if (!siteUrl) return;
    navigator.clipboard.writeText(siteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [siteUrl]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) {
    return null;
  }

  const isActive = (path: string) => location.pathname === path;

  // Build nav items: base items, plus installed app links inserted after "Produits"
  const navItems = (() => {
    // First, filter base items - remove items with appPage if not installed
    const filteredBase = BASE_NAV_ITEMS.filter((item) => {
      if ('appPage' in item && item.appPage) {
        return installedAppPages.has(item.appPage);
      }
      return true;
    });

    // Add installable app links that are installed, inserted after Produits (index 1)
    const installedLinks = INSTALLABLE_APPS.filter((app) =>
      installedAppPages.has(app.nompage)
    ).map((app) => ({
      icon: app.icon,
      label: app.label,
      path: `/dashboard/${app.nompage}`,
    }));

    // Insert installed apps after position 1 (Produits) but before Services
    const insertIdx = filteredBase.findIndex((item) => item.path === '/dashboard/services');
    const result = [...filteredBase];
    if (insertIdx >= 0 && installedLinks.length > 0) {
      result.splice(insertIdx, 0, ...installedLinks);
    }

    return result;
  })();

  return (
    <div className="min-h-screen bg-background-100 flex">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-background-50 border-r border-background-200/70 transition-transform duration-200 lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:fixed`}>
        <div className="flex flex-col h-full">
          {/* Logo - fixed at top */}
          <div className="flex-shrink-0 p-5 pb-3">
            <Link to="/" className="flex items-center gap-2 mb-6">
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
                <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm font-heading">
                    {brand.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-lg font-bold font-heading text-foreground-950">
                {brand.name}
              </span>
            </Link>
          </div>

          {/* Navigation - scrollable */}
          <nav className="sidebar-scroll flex-1 overflow-y-auto px-3 pb-4 overscroll-contain" style={{ scrollbarWidth: 'thin', scrollbarColor: 'oklch(var(--foreground-200) / 0.5) transparent' }}>
            <div className="space-y-0.5">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    isActive(item.path)
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-foreground-600 hover:bg-background-100 hover:text-foreground-900'
                  }`}
                >
                  <i className={`${item.icon} text-lg w-5 h-5 flex items-center justify-center flex-shrink-0`}></i>
                  <span className="truncate">{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>

          {/* User section - fixed at bottom */}
          <div className="flex-shrink-0 p-5 pt-3 border-t border-background-200/70">
            {/* Site URL */}
            {siteUrl && (
              <div className="mb-4 p-3 bg-background-100 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-foreground-400 flex items-center gap-1">
                    <i className={isCustomDomain ? 'ri-link-m' : 'ri-global-line'}></i>
                    {isCustomDomain ? 'Domaine perso' : 'Sous-domaine'}
                  </span>
                  <button
                    onClick={copySiteUrl}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-background-200/70 transition-colors cursor-pointer"
                    title="Copier l'URL"
                  >
                    <i className={`text-xs ${copied ? 'ri-check-line text-accent-500' : 'ri-file-copy-line text-foreground-400'}`}></i>
                  </button>
                </div>
                <a
                  href={siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-foreground-600 truncate block hover:text-primary-500 transition-colors cursor-pointer"
                  title={siteUrl}
                >
                  {cleanDisplayUrl(siteUrl)}
                </a>
              </div>
            )}

            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-accent-100 flex items-center justify-center flex-shrink-0">
                <span className="text-accent-700 font-bold text-xs">{user.name.charAt(0)}</span>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground-950 truncate">{user.name}</div>
                <div className="text-xs text-foreground-500 truncate">{user.nomcommerce}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-foreground-500 hover:text-foreground-800 hover:bg-background-100 transition-colors cursor-pointer"
            >
              <i className="ri-logout-box-r-line"></i>
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
                {user.nomcommerce}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-background-100 transition-colors cursor-pointer">
                <i className="ri-notification-3-line text-lg text-foreground-600"></i>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary-500"></span>
              </button>
              <button
                onClick={() => setPreviewOpen(!previewOpen)}
                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors cursor-pointer ${
                  previewOpen
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-foreground-500 hover:text-foreground-700'
                }`}
                title="Prévisualiser le site"
              >
                <i className={previewOpen ? 'ri-eye-off-line' : 'ri-eye-line'}></i>
                <span>Prévisualiser</span>
              </button>
              <a
                href={siteUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-foreground-500 hover:text-foreground-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-global-line"></i>
                <span>Voir le site</span>
              </a>
            </div>
          </div>
        </header>

        <main>
          <Outlet />
        </main>

        {/* Preview Panel */}
        {previewOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/20 hidden lg:block"
              onClick={() => setPreviewOpen(false)}
            />

            {/* Panel */}
            <div className="fixed top-0 right-0 bottom-0 z-50 w-full lg:w-[480px] xl:w-[540px] bg-background-50 border-l border-background-200/70 shadow-lg transform transition-transform duration-300 ease-in-out translate-x-0">
              {/* Panel Header */}
              <div className="flex items-center justify-between px-4 h-14 border-b border-background-200/70 bg-background-50">
                <div className="flex items-center gap-2 min-w-0">
                  <i className="ri-eye-line text-sm text-foreground-500 flex-shrink-0"></i>
                  <span className="text-sm font-medium text-foreground-700 truncate">
                    Aperçu du site
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {/* Device size buttons */}
                  <div className="flex items-center gap-0.5 bg-background-100 rounded-full p-0.5">
                    {(Object.keys(DEVICE_SIZES) as PreviewDevice[]).map((device) => (
                      <button
                        key={device}
                        onClick={() => setPreviewDevice(device)}
                        className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
                          previewDevice === device
                            ? 'bg-background-50 text-foreground-900 shadow-sm'
                            : 'text-foreground-400 hover:text-foreground-600'
                        }`}
                        title={DEVICE_SIZES[device].label}
                      >
                        <i className={`${DEVICE_SIZES[device].icon} text-sm`}></i>
                      </button>
                    ))}
                  </div>
                  <a
                    href={siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-background-100 transition-colors cursor-pointer"
                    title="Ouvrir dans un nouvel onglet"
                  >
                    <i className="ri-external-link-line text-sm text-foreground-500"></i>
                  </a>
                  <button
                    onClick={() => setPreviewOpen(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-background-100 transition-colors cursor-pointer"
                    title="Fermer l'aperçu"
                  >
                    <i className="ri-close-line text-sm text-foreground-500"></i>
                  </button>
                </div>
              </div>

              {/* URL Bar */}
              <div className="px-3 py-2 bg-background-100 border-b border-background-200/70">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-background-50 rounded-md border border-background-200/70">
                  <i className="ri-lock-line text-xs text-accent-500 flex-shrink-0"></i>
                  <span className="text-xs text-foreground-600 truncate">{cleanDisplayUrl(siteUrl)}</span>
                </div>
              </div>

              {/* Iframe */}
              <div className="h-[calc(100vh-116px)] bg-background-200/30 flex items-start justify-center overflow-auto p-4">
                {siteUrl ? (
                  <div
                    className="bg-white transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0"
                    style={{
                      width: DEVICE_SIZES[previewDevice].width,
                      height: previewDevice === 'desktop' ? '100%' : DEVICE_SIZES[previewDevice].height,
                      borderRadius: previewDevice !== 'desktop' ? '12px' : '0',
                      boxShadow: previewDevice !== 'desktop' ? '0 4px 24px rgba(0,0,0,0.12)' : 'none',
                    }}
                  >
                    <iframe
                      src={siteUrl}
                      className="w-full h-full border-0"
                      title="Aperçu du site"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full w-full">
                    <p className="text-sm text-foreground-400">Aucune URL disponible</p>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile close button (outside panel) */}
            <button
              onClick={() => setPreviewOpen(false)}
              className="fixed top-4 right-4 z-50 w-9 h-9 flex items-center justify-center rounded-full bg-background-50 border border-background-200/70 shadow lg:hidden"
            >
              <i className="ri-close-line text-foreground-600"></i>
            </button>
          </>
        )}
      </div>
    </div>
  );
}