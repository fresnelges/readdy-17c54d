import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { parseCharte, generatePalette, type ChartPalette, paletteToCssVars } from '@/lib/palette';

// ── Tenant types ──────────────────────────────────────────────

export interface TenantUser {
  id: number;
  user_name: string;
  email: string;
  name: string;
  nomcommerce: string;
  type: string;
  typecompte: number;
  theme: string;
  monaie: string;
  langue: string;
  active: number;
  description: string;
  image: string;
  telephone: string;
  Pays: string;
  Ville: string;
  adresse: string;
  aboutus: string;
  package: number;
  payant: number;
  solde: number;
  couleurcharte: string;
  datecreation: string;
}

export interface TenantTheme {
  id: number;
  idtheme: number;
  nomtheme: string;
  stylesheet: string;
  dossier: string;
  typetheme: string;
  prix: string;
  status: string;
  stylesheetContent?: string;
  navTitle?: string;
  navDescription?: string;
  navImage?: string;
  visiblePages?: string[];
  navOrder?: string[];
  customPages?: Array<{ key: string; label: string; url: string; icon: string; isExternal: boolean }>;
  primaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  /** Charte graphique complète générée depuis couleurcharte du user */
  chartPalette?: ChartPalette;
  /** CSS custom properties injectables dans le <head> */
  chartPaletteCss?: string;
}

export interface TenantState {
  /** Whether we are on a subdomain (tenant store) or main domain */
  isTenant: boolean;
  /** The resolved tenant user */
  tenant: TenantUser | null;
  /** The tenant's active theme */
  theme: TenantTheme | null;
  /** Custom domain being used (if any) */
  customDomain: string | null;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: string | null;
}

// ── Tenant context ────────────────────────────────────────────

interface TenantContextType extends TenantState {
  refreshTenant: () => void;
}

const TenantContext = createContext<TenantContextType | null>(null);

// ── Helpers ───────────────────────────────────────────────────

/**
 * Extract the subdomain from the current hostname.
 * Returns null if we're on the main domain (no subdomain or "www").
 * Supports: username.zifek.fr, username.localhost, and www.* variants.
 */
function extractSubdomain(): string | null {
  if (typeof window === 'undefined') return null;
  const hostname = window.location.hostname.toLowerCase().replace(/^www\./, '');

  // Known main domains for Zifek
  const mainDomains = ['zifek.fr', 'localhost', '127.0.0.1', 'readdy.ai'];

  // Check if hostname exactly matches a main domain
  if (mainDomains.some(d => hostname === d)) return null;

  // Check if it's a subdomain of zifek.fr (e.g. monboutique.zifek.fr)
  if (hostname.endsWith('.zifek.fr')) {
    const sub = hostname.replace('.zifek.fr', '');
    if (sub === '' || sub === 'www') return null;
    return sub;
  }

  // For localhost subdomains in development (e.g. festore.localhost)
  if (hostname.endsWith('.localhost')) {
    const sub = hostname.replace('.localhost', '');
    if (sub === '' || sub === 'www') return null;
    return sub;
  }

  // If hostname is a direct IP or has no dots, it's main domain (localhost/127.0.0.1 variants)
  if (!hostname.includes('.') || hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) return null;

  // Otherwise it could be a custom domain — resolved separately via websitedomain
  return null;
}

/**
 * Check if the current hostname is a custom domain mapped to a user.
 * Tries exact match first, then tries with/without www prefix.
 */
async function resolveCustomDomain(hostname: string): Promise<{ userId: number; domain: string } | null> {
  const cleanHost = hostname.replace(/^www\./, '');

  // Try: clean hostname, www.clean hostname, and original hostname
  const candidates = [...new Set([cleanHost, `www.${cleanHost}`, hostname])];

  for (const candidate of candidates) {
    const { data } = await supabase
      .from('websitedomain')
      .select('user_id, domaine')
      .eq('domaine', candidate)
      .maybeSingle();
    if (data) return { userId: data.user_id, domain: data.domaine };
  }

  // Also try matching domain values that are stored without www prefix
  const { data: fuzzy } = await supabase
    .from('websitedomain')
    .select('user_id, domaine')
    .or(`domaine.eq.${cleanHost},domaine.eq.www.${cleanHost}`)
    .maybeSingle();
  if (fuzzy) return { userId: fuzzy.user_id, domain: fuzzy.domaine };

  return null;
}

/**
 * Get the full hostname for custom domain detection.
 */
function getFullHostname(): string {
  if (typeof window === 'undefined') return '';
  return window.location.hostname.toLowerCase();
}

// ── Provider ──────────────────────────────────────────────────

export function TenantProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TenantState>({
    isTenant: false,
    tenant: null,
    theme: null,
    customDomain: null,
    loading: true,
    error: null,
  });

  const resolveTenant = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const hostname = getFullHostname();
      const subdomain = extractSubdomain();
      let tenantUser: TenantUser | null = null;
      let customDomain: string | null = null;

      // ── Path 1: Subdomain of zifek.fr ──
      if (subdomain) {
        const { data: users } = await supabase
          .from('users')
          .select('*')
          .eq('user_name', subdomain)
          .eq('active', 1)
          .limit(1);

        if (users && users.length > 0) {
          const u = users[0];
          tenantUser = {
            id: u.id,
            user_name: u.user_name,
            email: u.email,
            name: u.name,
            nomcommerce: u.nomcommerce,
            type: u.type,
            typecompte: u.typecompte,
            theme: u.theme,
            monaie: u.monaie,
            langue: u.langue,
            active: u.active,
            description: u.description,
            image: u.image,
            telephone: u.telephone,
            Pays: u.Pays,
            Ville: u.Ville,
            adresse: u.adresse,
            aboutus: u.aboutus,
            package: u.package,
            payant: u.payant,
            solde: u.solde,
            couleurcharte: u.couleurcharte,
            datecreation: u.datecreation,
          };
        }
      }

      // ── Path 2: Custom domain ──
      if (!tenantUser && !subdomain) {
        const custom = await resolveCustomDomain(hostname);
        if (custom) {
          customDomain = custom.domain;
          const { data: users } = await supabase
            .from('users')
            .select('*')
            .eq('id', custom.userId)
            .eq('active', 1)
            .limit(1);

          if (users && users.length > 0) {
            const u = users[0];
            tenantUser = {
              id: u.id,
              user_name: u.user_name,
              email: u.email,
              name: u.name,
              nomcommerce: u.nomcommerce,
              type: u.type,
              typecompte: u.typecompte,
              theme: u.theme,
              monaie: u.monaie,
              langue: u.langue,
              active: u.active,
              description: u.description,
              image: u.image,
              telephone: u.telephone,
              Pays: u.Pays,
              Ville: u.Ville,
              adresse: u.adresse,
              aboutus: u.aboutus,
              package: u.package,
              payant: u.payant,
              solde: u.solde,
              couleurcharte: u.couleurcharte,
              datecreation: u.datecreation,
            };
          }
        }
      }

      // ── If no tenant found, we're on main domain ──
      if (!tenantUser) {
        setState({
          isTenant: false,
          tenant: null,
          theme: null,
          customDomain: null,
          loading: false,
          error: null,
        });
        return;
      }

      // ── Load the tenant's theme ──
      let tenantTheme: TenantTheme | null = null;
      const themeId = tenantUser.theme;

      if (themeId) {
        // Get active theme assignment
        const { data: activeTheme } = await supabase
          .from('sitewebthemeactuelle')
          .select('*')
          .eq('idcommerce', tenantUser.id)
          .eq('status', 'active')
          .order('datedactivation', { ascending: false })
          .limit(1)
          .maybeSingle();

        const resolvedThemeId = activeTheme ? activeTheme.idtheme : parseInt(themeId, 10);

        if (resolvedThemeId && !isNaN(resolvedThemeId)) {
          // Get theme details
          const { data: themeData } = await supabase
            .from('sitewebtheme')
            .select('*')
            .eq('id', resolvedThemeId)
            .limit(1)
            .maybeSingle();

          if (themeData) {
            // Get theme content (nav title, description, banner)
            let navTitle = tenantUser.nomcommerce || tenantUser.name;
            let navDescription: string | undefined;
            let navImage: string | undefined;

            const { data: themeContent } = await supabase
              .from('sitewebthemecontenu')
              .select('*')
              .eq('idtheme', resolvedThemeId)
              .eq('idshop', tenantUser.id)
              .limit(1)
              .maybeSingle();

            if (themeContent) {
              if (themeContent.titrenavmenudefaut) navTitle = themeContent.titrenavmenudefaut;
              if (themeContent.descriptionnavmenudefault) navDescription = themeContent.descriptionnavmenudefault;
              if (themeContent.imagebannierenavmenudefault) navImage = themeContent.imagebannierenavmenudefault;
            }

            // Parse visible pages from JSON string
            let visiblePages: string[] | undefined;
            let navOrder: string[] | undefined;
            let customPages: TenantTheme['customPages'] | undefined;
            let primaryColor: string | undefined;
            let accentColor: string | undefined;
            let fontFamily: string | undefined;

            if (themeContent) {
              // Visible pages
              if (themeContent.pages_visibles) {
                try {
                  const parsed = JSON.parse(themeContent.pages_visibles);
                  if (Array.isArray(parsed) && parsed.length > 0) visiblePages = parsed;
                } catch { /* fall through */ }
              }

              // Nav order
              if (themeContent.nav_order) {
                try {
                  const parsed = JSON.parse(themeContent.nav_order);
                  if (Array.isArray(parsed) && parsed.length > 0) navOrder = parsed;
                } catch { /* fall through */ }
              }

              // Custom pages
              if (themeContent.custom_pages) {
                try {
                  const parsed = JSON.parse(themeContent.custom_pages);
                  if (Array.isArray(parsed)) customPages = parsed;
                } catch { /* fall through */ }
              }

              // Colors
              if (themeContent.primary_color) primaryColor = themeContent.primary_color;
              if (themeContent.accent_color) accentColor = themeContent.accent_color;

              // Font family
              if (themeContent.font_family) fontFamily = themeContent.font_family;
            }

            // ── Charte graphique depuis users.couleurcharte ──
            let chartPalette: ChartPalette | undefined;
            let chartPaletteCss: string | undefined;
            const userCharte = parseCharte(tenantUser.couleurcharte);
            if (userCharte) {
              chartPalette = generatePalette(userCharte);
              chartPaletteCss = paletteToCssVars(chartPalette);
            }

            tenantTheme = {
              id: themeData.id,
              idtheme: resolvedThemeId,
              nomtheme: themeData.titre || activeTheme?.nomtheme || 'Default',
              stylesheet: themeData.stylesheet || '',
              dossier: themeData.dossier || '',
              typetheme: themeData.typetheme || '',
              prix: activeTheme?.prix || '0',
              status: activeTheme?.status || 'active',
              navTitle,
              navDescription,
              navImage,
              visiblePages,
              navOrder,
              customPages,
              primaryColor,
              accentColor,
              fontFamily,
              chartPalette,
              chartPaletteCss,
            };
          }
        }
      }

      setState({
        isTenant: true,
        tenant: tenantUser,
        theme: tenantTheme,
        customDomain,
        loading: false,
        error: null,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur de résolution du tenant';
      setState(prev => ({ ...prev, loading: false, error: message }));
    }
  }, []);

  useEffect(() => {
    resolveTenant();
  }, [resolveTenant]);

  const value: TenantContextType = {
    ...state,
    refreshTenant: resolveTenant,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────

export function useTenant(): TenantContextType {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

// ── Simple check: are we on a tenant store? ──────────────────

export function useIsTenant(): boolean {
  const { isTenant } = useTenant();
  return isTenant;
}