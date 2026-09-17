import { useState, useEffect, useCallback, useRef } from 'react';
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

interface Notification {
  id: number;
  user_id: number;
  sender_id: number;
  publication_id: number;
  type: string;
  message: string;
  is_read: number;
  created_at: string;
}

const BASE_NAV_ITEMS = [
  { icon: 'ri-dashboard-line', label: 'Tableau de bord', path: '/dashboard' },
  { icon: 'ri-shopping-bag-3-line', label: 'Produits', path: '/dashboard/products' },
  { icon: 'ri-shopping-cart-2-line', label: 'Ma caisse', path: '/dashboard/caisse', appPage: 'caisse' },
  { icon: 'ri-service-line', label: 'Services', path: '/dashboard/services' },
  { icon: 'ri-file-list-3-line', label: 'Commandes', path: '/dashboard/orders' },
  { icon: 'ri-user-line', label: 'Clients', path: '/dashboard/customers' },
  { icon: 'ri-bank-card-line', label: 'Paiements', path: '/dashboard/payments' },
  { icon: 'ri-wallet-3-line', label: 'Portefeuille', path: '/dashboard/wallet' },
  { icon: 'ri-store-2-line', label: 'Ma boutique', path: '/dashboard/store' },
  { icon: 'ri-edit-line', label: 'Contenu du site', path: '/dashboard/site-content' },
  { icon: 'ri-image-line', label: 'Médias', path: '/dashboard/media' },
  { icon: 'ri-file-text-line', label: 'Documents', path: '/dashboard/documents' },
  { icon: 'ri-database-2-line', label: 'Stockage', path: '/dashboard/storage' },
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

const NOTIF_TYPE_META: Record<string, { icon: string; className: string }> = {
  order: { icon: 'ri-shopping-cart-2-line', className: 'text-primary-600 bg-primary-50' },
  payment: { icon: 'ri-bank-card-line', className: 'text-primary-600 bg-primary-50' },
  like: { icon: 'ri-heart-3-line', className: 'text-accent-600 bg-accent-50' },
  comment: { icon: 'ri-chat-3-line', className: 'text-secondary-600 bg-secondary-50' },
  follow: { icon: 'ri-user-add-line', className: 'text-accent-600 bg-accent-50' },
  message: { icon: 'ri-message-3-line', className: 'text-primary-600 bg-primary-50' },
  mention: { icon: 'ri-at-line', className: 'text-secondary-600 bg-secondary-50' },
  system: { icon: 'ri-information-line', className: 'text-foreground-600 bg-background-100' },
};

function notifMeta(type: string) {
  return NOTIF_TYPE_META[type] || { icon: 'ri-notification-3-line', className: 'text-foreground-600 bg-background-100' };
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "à l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `il y a ${weeks} sem`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { brand } = useBrand();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [siteUrl, setSiteUrl] = useState<string>('');
  const [isCustomDomain, setIsCustomDomain] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
  const [installedAppPages, setInstalledAppPages] = useState<Set<string>>(new Set());
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const [badgeBlink, setBadgeBlink] = useState(false);
  const prevUnreadRef = useRef(0);

  const refreshInstalledApps = useCallback(() => {
    if (!user) return;
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
  }, [user]);

  const fetchNotifications = useCallback(() => {
    if (!user) return;
    setNotificationsLoading(true);
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data, error }) => {
        if (!error) setNotifications((data || []) as Notification[]);
      })
      .catch(() => {})
      .finally(() => setNotificationsLoading(false));
  }, [user]);

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

    refreshInstalledApps();
  }, [user, navigate, location.pathname, refreshInstalledApps]);

  // Re-synchronise le menu latéral quand le statut d'une app change (toggle dans /dashboard/apps)
  useEffect(() => {
    const handler = () => refreshInstalledApps();
    window.addEventListener('app-status-changed', handler);
    return () => window.removeEventListener('app-status-changed', handler);
  }, [refreshInstalledApps]);

  // Ferme les menus au clic en dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (accountMenuRef.current && !accountMenuRef.current.contains(target)) {
        setAccountMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ferme les menus à chaque changement de page
  useEffect(() => {
    setAccountMenuOpen(false);
    setNotificationsOpen(false);
  }, [location.pathname]);

  // Charge les notifications quand l'utilisateur est disponible
  useEffect(() => {
    if (user) fetchNotifications();
  }, [user, fetchNotifications]);



  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const unreadCount = notifications.filter((n) => n.is_read === 0).length;

  // Fait clignoter doucement le badge quand le nombre de non-lus augmente
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      setBadgeBlink(true);
      const timer = setTimeout(() => setBadgeBlink(false), 2000);
      prevUnreadRef.current = unreadCount;
      return () => clearTimeout(timer);
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  const markNotificationAsRead = (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
    supabase
      .from('notifications')
      .update({ is_read: 1 })
      .eq('id', id)
      .then(() => {});
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    supabase
      .from('notifications')
      .update({ is_read: 1 })
      .eq('user_id', user?.id)
      .eq('is_read', 0)
      .then(() => {});
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

  // Filtre les éléments de navigation selon la recherche
  const filteredNavItems = searchQuery.trim()
    ? navItems.filter((item) =>
        item.label.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : navItems;

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
          <div className="flex-shrink-0 px-5 pt-4 pb-2">
            <div className="flex items-center justify-between gap-2 mb-2">
              <Link to="/" className="flex items-center gap-2 min-w-0">
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
                <span className="text-lg font-bold font-heading text-foreground-950 truncate">
                  {brand.name}
                </span>
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

          {/* Recherche de page */}
          <div className="flex-shrink-0 px-3 pb-2">
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm pointer-events-none"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une page..."
                className="w-full pl-9 pr-8 py-2 rounded-md text-sm bg-background-100 border border-background-200/70 text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-300 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-700 transition-colors cursor-pointer"
                  title="Effacer"
                >
                  <i className="ri-close-circle-fill text-sm"></i>
                </button>
              )}
            </div>
          </div>

          {/* Navigation - scrollable */}
          <nav className="sidebar-scroll flex-1 overflow-y-auto px-3 pb-4 overscroll-contain" style={{ scrollbarWidth: 'thin', scrollbarColor: 'oklch(var(--foreground-200) / 0.5) transparent' }}>
            <div className="space-y-0.5">
              {filteredNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    isActive(item.path)
                      ? 'bg-primary-50 text-primary-700 font-semibold'
                      : 'text-foreground-700 hover:bg-background-100 hover:text-foreground-950'
                  }`}
                >
                  {isActive(item.path) && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-primary-500"></span>
                  )}
                  <i className={`${item.icon} text-lg w-5 h-5 flex items-center justify-center flex-shrink-0`}></i>
                  <span className="leading-snug">{item.label}</span>
                </Link>
              ))}
              {filteredNavItems.length === 0 && (
                <div className="px-3 py-8 text-center">
                  <i className="ri-search-eye-line text-2xl text-foreground-300"></i>
                  <p className="mt-2 text-sm text-foreground-500">Aucune page trouvée</p>
                </div>
              )}
            </div>
          </nav>

          {/* User section - fixed at bottom */}
          <div className="flex-shrink-0 p-3 pt-2 border-t border-background-200/70 flex justify-center">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-foreground-500 hover:text-foreground-800 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
              title="Déconnexion"
            >
              <i className="ri-logout-box-r-line text-lg"></i>
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 lg:ml-64">
        <header className="sticky top-0 z-30 bg-background-50/95 backdrop-blur-md border-b border-background-200/70">
          <div className="flex items-center justify-between h-14 md:h-16 px-4 md:px-6">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden w-9 h-9 flex items-center justify-center rounded-md border border-background-200/70 cursor-pointer shrink-0"
              >
                <i className="ri-menu-line text-lg text-foreground-700"></i>
              </button>
              <h1 className="text-base sm:text-lg font-bold font-heading text-foreground-950 truncate">
                {user.nomcommerce}
              </h1>
            </div>

            <div className="flex items-center gap-1 sm:gap-3 shrink-0">
              <div className="relative pr-3 border-r border-background-200/70" ref={accountMenuRef}>
                <button
                  onClick={() => setAccountMenuOpen((v) => !v)}
                  className="group relative flex items-center gap-2.5 rounded-md px-1 py-1 -my-1 hover:bg-background-100 transition-colors cursor-pointer"
                  title="Mon compte"
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-accent-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-accent-700 font-bold text-xs">{user.name.charAt(0)}</span>
                    </div>
                    {unreadCount > 0 && (
                      <span className={`absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-primary-500 text-white text-[10px] font-semibold leading-none ring-2 ring-background-50 ${badgeBlink ? 'animate-badge-blink' : ''}`}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 hidden md:block">
                    <div className="text-sm font-semibold text-foreground-950 truncate leading-tight text-left">{user.name}</div>
                    <div className="flex items-center gap-1 text-xs text-foreground-500 truncate max-w-[160px]">
                      <i className={isCustomDomain ? 'ri-link-m' : 'ri-global-line'}></i>
                      <span className="truncate">{cleanDisplayUrl(siteUrl)}</span>
                    </div>
                  </div>
                  <i className={`ri-arrow-down-s-line text-sm text-foreground-400 transition-transform hidden md:block ${accountMenuOpen ? 'rotate-180' : ''}`}></i>

                  {/* Infobulle affichant le nom au survol quand l'espace est réduit */}
                  <span className="pointer-events-none absolute left-1/2 top-[calc(100%+6px)] z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground-900 px-2.5 py-1.5 text-xs font-medium text-background-50 opacity-0 scale-95 transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 hidden sm:block md:hidden">
                    {user.name}
                    <span className="absolute left-1/2 -top-1 h-2 w-2 -translate-x-1/2 rotate-45 bg-foreground-900"></span>
                  </span>
                </button>

                {accountMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-background-50 border border-background-200/70 rounded-lg overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-background-200/70 bg-background-100/50">
                      <div className="text-sm font-semibold text-foreground-950 truncate">{user.name}</div>
                      <div className="text-xs text-foreground-500 truncate mt-0.5">{user.email}</div>
                    </div>
                    <div className="p-1">
                      <Link
                        to="/dashboard/store"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-foreground-700 hover:bg-background-100 hover:text-foreground-950 transition-colors cursor-pointer"
                      >
                        <i className="ri-user-3-line text-base w-5 h-5 flex items-center justify-center"></i>
                        <span>Mon profil</span>
                      </Link>
                      <Link
                        to="/dashboard/settings"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-foreground-700 hover:bg-background-100 hover:text-foreground-950 transition-colors cursor-pointer"
                      >
                        <i className="ri-settings-3-line text-base w-5 h-5 flex items-center justify-center"></i>
                        <span>Paramètres</span>
                      </Link>
                    </div>
                    <div className="border-t border-background-200/70 p-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-foreground-700 hover:bg-background-100 hover:text-foreground-950 transition-colors cursor-pointer"
                      >
                        <i className="ri-logout-box-r-line text-base w-5 h-5 flex items-center justify-center"></i>
                        <span>Déconnexion</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={() => {
                    setNotificationsOpen((v) => !v);
                    setAccountMenuOpen(false);
                  }}
                  className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-background-100 transition-colors cursor-pointer"
                  title="Notifications"
                >
                  <i className="ri-notification-3-line text-lg text-foreground-600"></i>
                  {unreadCount > 0 && (
                    <span className={`absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-primary-500 text-white text-[10px] font-semibold leading-none ${badgeBlink ? 'animate-badge-blink' : ''}`}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-background-50 border border-background-200/70 rounded-lg overflow-hidden z-50">
                    <div className="flex items-center justify-between px-4 h-12 border-b border-background-200/70">
                      <span className="text-sm font-semibold text-foreground-950">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllNotificationsAsRead}
                          className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <i className="ri-check-double-line"></i>
                          <span>Tout marquer comme lu</span>
                        </button>
                      )}
                    </div>

                    <div className="max-h-[420px] overflow-y-auto">
                      {notificationsLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <i className="ri-loader-4-line animate-spin text-xl text-foreground-400"></i>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                          <div className="w-12 h-12 rounded-full bg-background-100 flex items-center justify-center">
                            <i className="ri-notification-off-line text-xl text-foreground-400"></i>
                          </div>
                          <p className="mt-3 text-sm font-medium text-foreground-700">Aucune notification</p>
                          <p className="mt-1 text-xs text-foreground-500">Vous serez informé ici des nouveautés et alertes.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-background-200/70">
                          {notifications.map((n) => {
                            const meta = notifMeta(n.type);
                            return (
                              <button
                                key={n.id}
                                onClick={() => markNotificationAsRead(n.id)}
                                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${
                                  n.is_read === 0 ? 'bg-primary-50/50 hover:bg-primary-50' : 'hover:bg-background-100'
                                }`}
                              >
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${meta.className}`}>
                                  <i className={`${meta.icon} text-base`}></i>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm text-foreground-800 leading-snug break-words">{n.message}</p>
                                  <p className="mt-1 text-xs text-foreground-400">{timeAgo(n.created_at)}</p>
                                </div>
                                {n.is_read === 0 && (
                                  <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1.5"></span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-background-200/70 px-4 py-2 flex justify-center">
                      <button
                        onClick={fetchNotifications}
                        className="flex items-center gap-1.5 text-xs text-foreground-500 hover:text-foreground-700 transition-colors cursor-pointer"
                      >
                        <i className="ri-refresh-line"></i>
                        <span>Actualiser</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setPreviewOpen(!previewOpen)}
                className={`flex items-center gap-1.5 px-2 py-1.5 md:px-3 rounded-full text-sm whitespace-nowrap transition-colors cursor-pointer ${
                  previewOpen
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-foreground-500 hover:text-foreground-700'
                }`}
                title="Prévisualiser le site"
              >
                <i className={previewOpen ? 'ri-eye-off-line' : 'ri-eye-line'}></i>
                <span className="hidden md:inline">Prévisualiser</span>
              </button>
              <a
                href={siteUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2 py-1.5 md:px-3 rounded-full text-sm text-foreground-500 hover:text-foreground-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-global-line"></i>
                <span className="hidden md:inline">Voir le site</span>
              </a>
            </div>
          </div>
        </header>

        <main className="min-w-0">
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