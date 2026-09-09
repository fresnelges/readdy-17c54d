import { useTenant } from '@/hooks/useTenant';
import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';

// ── Default page definitions ──────────────────────────────────
const DEFAULT_PAGES = [
  { key: 'accueil', path: '/', label: 'Accueil', icon: 'ri-home-line' },
  { key: 'produits', path: '/products', label: 'Produits', icon: 'ri-shopping-bag-line' },
  { key: 'services', path: '/services', label: 'Services', icon: 'ri-service-line' },
  { key: 'portfolio', path: '/portfolio', label: 'Portfolio', icon: 'ri-briefcase-line' },
  { key: 'partenaires', path: '/partners', label: 'Partenaires', icon: 'ri-team-line' },
  { key: 'equipe', path: '/team', label: 'Équipe', icon: 'ri-user-star-line' },
  { key: 'rendezvous', path: '/booking', label: 'Rendez-vous', icon: 'ri-calendar-check-line' },
];

// ── Google Fonts URL builder ──────────────────────────────────
function getGoogleFontUrl(fontFamily: string): string | null {
  const fontMap: Record<string, string> = {
    'Outfit': 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap',
    'DM Sans': 'https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap',
    'Inter': 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
    'Poppins': 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap',
    'Playfair Display': 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500&display=swap',
    'Lora': 'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap',
    'Source Serif 4': 'https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,300;8..60,400;8..60,500;8..60,600;8..60,700&display=swap',
    'Space Grotesk': 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap',
    'Cabinet Grotesk': 'https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap',
    'JetBrains Mono': 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap',
    'Bricolage Grotesque': 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&display=swap',
    'Satoshi': 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap',
    'EB Garamond': 'https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500&display=swap',
    'Crimson Pro': 'https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&display=swap',
    'Syne': 'https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap',
  };
  return fontMap[fontFamily] || null;
}

// ── Simple hex to OKLCH approximation ─────────────────────────
function hexToOklchChannels(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;

  const toLinear = (c: number) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);

  const x = 0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb;
  const y = 0.2126729 * lr + 0.7151522 * lg + 0.0721750 * lb;
  const z = 0.0193339 * lr + 0.1191920 * lg + 0.9503041 * lb;

  const x_ = 0.8189330101 * x + 0.3618667424 * y - 0.1288597137 * z;
  const y_ = 0.0329845436 * x + 0.9293118715 * y + 0.0361456387 * z;
  const z_ = 0.0482003018 * x + 0.2643662691 * y + 0.6338517070 * z;

  const xr = Math.cbrt(x_);
  const yr = Math.cbrt(y_);
  const zr = Math.cbrt(z_);

  const L = 0.2104542553 * xr + 0.7936177850 * yr - 0.0040720468 * zr;
  const a = 1.9779984951 * xr - 2.4285922050 * yr + 0.4505937099 * zr;
  const b2 = 0.0259040371 * xr + 0.7827717662 * yr - 0.8086757660 * zr;

  const C = Math.sqrt(a * a + b2 * b2);
  let H = Math.atan2(b2, a) * 180 / Math.PI;
  if (H < 0) H += 360;

  return `${L.toFixed(5)} ${C.toFixed(6)} ${H.toFixed(6)}`;
}

export default function TenantNavbar() {
  const { tenant, theme } = useTenant();
  const location = useLocation();
  const { user, logout } = useAuth(); // Get logged-in user (if any)
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // ── Close user menu on outside click ────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  // ── Dynamic Google Font loading ──────────────────────────────
  useEffect(() => {
    const fontFamily = theme?.fontFamily;
    if (!fontFamily) return;

    const fontUrl = getGoogleFontUrl(fontFamily);
    if (!fontUrl) return;

    const linkId = 'tenant-google-font';
    let linkEl = document.getElementById(linkId) as HTMLLinkElement | null;
    if (!linkEl) {
      linkEl = document.createElement('link');
      linkEl.id = linkId;
      linkEl.rel = 'stylesheet';
      document.head.appendChild(linkEl);
    }
    linkEl.href = fontUrl;

    const styleId = 'tenant-font-overrides';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      :root {
        --font-heading: '${fontFamily}', sans-serif;
        --font-body: '${fontFamily}', sans-serif;
        --font-label: '${fontFamily}', sans-serif;
      }
    `;

    return () => {
      if (linkEl) linkEl.remove();
      if (styleEl) styleEl.remove();
    };
  }, [theme?.fontFamily]);

  if (!tenant) return null;

  const storeName = theme?.navTitle || tenant.nomcommerce || tenant.name;
  const storeLogo = theme?.navImage || tenant.image;

  // ── Build the final nav links array ─────────────────────────
  const visiblePagesSet = theme?.visiblePages
    ? new Set(theme.visiblePages)
    : new Set(DEFAULT_PAGES.map((p) => p.key));

  const filteredDefaults = DEFAULT_PAGES.filter((p) => visiblePagesSet.has(p.key));

  let orderedDefaults = filteredDefaults;
  if (theme?.navOrder && theme.navOrder.length > 0) {
    const orderMap = new Map(theme.navOrder.map((key, idx) => [key, idx]));
    orderedDefaults = [...filteredDefaults].sort((a, b) => {
      const oa = orderMap.get(a.key) ?? 999;
      const ob = orderMap.get(b.key) ?? 999;
      return oa - ob;
    });
  }

  const defaultLinks = orderedDefaults.map((page) => ({
    key: page.key,
    path: page.path,
    label: page.label,
    icon: page.icon,
    isExternal: false,
  }));

  const customLinks = (theme?.customPages || []).map((cp) => ({
    key: cp.key,
    path: cp.url,
    label: cp.label,
    icon: cp.icon,
    isExternal: cp.isExternal,
  }));

  const allLinks = [...defaultLinks, ...customLinks];

  const isActive = (path: string, isExternal: boolean) => {
    if (isExternal) return false;
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* ── Color overrides (injected when merchant customized colors) ── */}
      {(theme?.primaryColor || theme?.accentColor) && (
        <style>{`
          :root {
            ${theme.primaryColor ? `--primary-500: ${hexToOklchChannels(theme.primaryColor)};` : ''}
            ${theme.accentColor ? `--accent-500: ${hexToOklchChannels(theme.accentColor)};` : ''}
          }
        `}</style>
      )}

      <nav className="sticky top-0 z-50 bg-background-50 border-b border-background-200/70">
        <div className="w-full px-4 md:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo / Store name */}
            <Link to="/" className="flex items-center gap-2.5 cursor-pointer no-underline">
              {storeLogo ? (
                <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-background-200/70">
                  <img
                    src={storeLogo}
                    alt={storeName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-background-50 text-sm font-bold font-heading">
                    {storeName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-sm font-bold font-heading text-foreground-950 hidden sm:block">
                {storeName}
              </span>
            </Link>

            {/* Navigation links + User menu */}
            <div className="flex items-center gap-0.5 flex-wrap">
              {allLinks.map((link) => (
                link.isExternal ? (
                  <a
                    key={link.key}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors whitespace-nowrap no-underline text-foreground-600 hover:text-foreground-900 hover:bg-background-100"
                  >
                    <i className={`${link.icon} text-sm`}></i>
                    <span className="hidden md:inline">{link.label}</span>
                    <i className="ri-external-link-line text-[10px] ml-0.5"></i>
                  </a>
                ) : (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors whitespace-nowrap no-underline ${
                      isActive(link.path, false)
                        ? 'bg-primary-500 text-background-50'
                        : 'text-foreground-600 hover:text-foreground-900 hover:bg-background-100'
                    }`}
                  >
                    <i className={`${link.icon} text-sm`}></i>
                    <span className="hidden md:inline">{link.label}</span>
                  </Link>
                )
              ))}

              {/* ── User account button (for Zifek client users) ── */}
              <div className="relative ml-2" ref={userMenuRef}>
                {user ? (
                  <>
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors whitespace-nowrap bg-accent-100/70 text-accent-700 hover:bg-accent-200/70"
                    >
                      <div className="w-5 h-5 rounded-full bg-accent-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {user.image ? (
                          <img src={user.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <i className="ri-user-line text-[10px] text-accent-600"></i>
                        )}
                      </div>
                      <span className="hidden md:inline max-w-[100px] truncate">{user.name}</span>
                      <i className={`ri-arrow-down-s-line text-xs transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}></i>
                    </button>

                    {userMenuOpen && (
                      <div className="absolute right-0 top-full mt-1.5 w-56 bg-background-50 border border-background-200/70 rounded-lg shadow-lg py-1 z-50">
                        <div className="px-3 py-2 border-b border-background-200/70">
                          <p className="text-xs font-semibold text-foreground-800 truncate">{user.name}</p>
                          <p className="text-[10px] text-foreground-500 truncate">{user.email}</p>
                        </div>
                        <a
                          href="https://zifek.fr/mon-compte"
                          className="flex items-center gap-2 px-3 py-2 text-xs text-foreground-700 hover:bg-background-100 cursor-pointer no-underline transition-colors"
                        >
                          <i className="ri-dashboard-line text-sm text-accent-500"></i>
                          Mon espace Zifek
                        </a>
                        <a
                          href="https://zifek.fr/mon-compte"
                          className="flex items-center gap-2 px-3 py-2 text-xs text-foreground-700 hover:bg-background-100 cursor-pointer no-underline transition-colors"
                        >
                          <i className="ri-t-shirt-line text-sm text-accent-500"></i>
                          Mon Armoire
                        </a>
                        <div className="border-t border-background-200/70 mt-1 pt-1">
                          <button
                            onClick={() => {
                              logout();
                              setUserMenuOpen(false);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-xs text-foreground-500 hover:bg-background-100 cursor-pointer w-full text-left transition-colors"
                          >
                            <i className="ri-logout-box-line text-sm"></i>
                            Déconnexion
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <a
                    href="https://zifek.fr/login-client"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors whitespace-nowrap no-underline bg-accent-500 text-background-50 hover:bg-accent-600"
                  >
                    <i className="ri-user-line text-sm"></i>
                    <span className="hidden md:inline">Mon compte Zifek</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}