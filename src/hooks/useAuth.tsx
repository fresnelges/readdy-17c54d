import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { md5 } from '@/lib/md5';
import { setSSOCookie, clearSSOCookie } from '@/hooks/useSSO';

export interface ZifekUser {
  id: number;
  user_name: string;
  email: string;
  name: string;
  nomcommerce: string;
  type: string;
  typecompte: number;
  package: number;
  monaie: string;
  langue: string;
  active: number;
  payant: number;
  theme: string;
  couleurcharte: string;
  image: string;
  telephone: string;
  "Pays": string;
  "Ville": string;
  "Quartier": string;
  adresse: string;
  description: string;
  aboutus: string;
  solde: number;
  datecreation: string;
}

interface AuthContextType {
  user: ZifekUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string; user?: ZifekUser }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  registerClient: (data: ClientRegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (data: Partial<ZifekUser>) => void;
}

export interface RegisterData {
  user_name: string;
  email: string;
  password: string;
  name: string;
  nomcommerce: string;
  telephone: string;
  type: string;
  typecompte: number;
  "Pays": string;
  "Ville": string;
}

export interface ClientRegisterData {
  user_name: string;
  email: string;
  password: string;
  name: string;
  telephone: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = 'zifek_user';

function setStoredUser(user: ZifekUser | null) {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function getStoredUser(): ZifekUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function mapZifekUser(row: Record<string, unknown>): ZifekUser {
  return {
    id: row.id as number,
    user_name: row.user_name as string,
    email: row.email as string,
    name: row.name as string,
    nomcommerce: (row.nomcommerce as string) || '',
    type: row.type as string,
    typecompte: row.typecompte as number,
    package: row.package as number,
    monaie: row.monaie as string,
    langue: row.langue as string,
    active: row.active as number,
    payant: (row.payant as number) || 0,
    theme: (row.theme as string) || '',
    couleurcharte: (row.couleurcharte as string) || '',
    image: (row.image as string) || '',
    telephone: (row.telephone as string) || '',
    "Pays": (row["Pays"] as string) || '',
    "Ville": (row["Ville"] as string) || '',
    "Quartier": (row["Quartier"] as string) || '',
    adresse: (row.adresse as string) || '',
    description: (row.description as string) || '',
    aboutus: (row.aboutus as string) || '',
    solde: (row.solde as number) || 0,
    datecreation: (row.datecreation as string) || '',
  };
}

/**
 * Un compte est considéré comme super admin quand son typecompte vaut 0 ou 1.
 * Ainsi, quel que soit le lien de connexion (client ou pro), ces comptes ont
 * accès au superadmin.
 */
export function isSuperAdmin(typecompte: number): boolean {
  return typecompte === 0 || typecompte === 1;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ZifekUser | null>(getStoredUser);
  const [loading, setLoading] = useState(false);
  const [ssoChecked, setSSOChecked] = useState(false);

  // ── SSO restore: check shared cookie on mount if no localStorage session ──
  useEffect(() => {
    if (ssoChecked) return;
    const stored = getStoredUser();
    if (stored) {
      setSSOChecked(true);
      return;
    }

    // Dynamic import to avoid bundling SSO code if not needed
    import('@/hooks/useSSO').then(({ getSSOCookie }) => {
      const sso = getSSOCookie();
      if (sso && sso.i) {
        supabase
          .from('users')
          .select('*')
          .eq('id', sso.i)
          .eq('active', 1)
          .maybeSingle()
          .then(({ data: foundUser }) => {
            if (foundUser) {
              const zifekUser = mapZifekUser(foundUser);
              setUser(zifekUser);
              setStoredUser(zifekUser);
            } else {
              clearSSOCookie();
            }
          });
      }
      setSSOChecked(true);
    }).catch(() => {
      setSSOChecked(true);
    });
  }, [ssoChecked]);

  const login = useCallback(async (identifier: string, password: string) => {
    setLoading(true);
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .or(`email.eq.${identifier},user_name.eq.${identifier}`)
        .eq('active', 1)
        .limit(1);

      if (error || !users || users.length === 0) {
        return { success: false, error: 'Identifiant ou mot de passe incorrect.' };
      }

      const foundUser = users[0];
      const storedHash = foundUser.password;
      let passwordOk = false;

      // Check if it's a bcrypt hash (starts with $2)
      if (storedHash.startsWith('$2')) {
        const { default: bcrypt } = await import('bcryptjs');
        passwordOk = bcrypt.compareSync(password, storedHash);
      } else {
        // Legacy MD5 comparison
        const hashedInput = md5(password);
        passwordOk = hashedInput === storedHash;

        // If MD5 matches, upgrade to bcrypt for future logins
        if (passwordOk) {
          const { default: bcrypt } = await import('bcryptjs');
          const salt = bcrypt.genSaltSync(10);
          const newHash = bcrypt.hashSync(password, salt);
          await supabase
            .from('users')
            .update({ password: newHash })
            .eq('id', foundUser.id);
        }
      }

      if (!passwordOk) {
        return { success: false, error: 'Identifiant ou mot de passe incorrect.' };
      }

      const zifekUser = mapZifekUser(foundUser);

      setUser(zifekUser);
      setStoredUser(zifekUser);
      // SSO: set shared cookie so all subdomains know about this session
      setSSOCookie(zifekUser.id, zifekUser.email);
      return { success: true, user: zifekUser };
    } catch (err: unknown) {
      return { success: false, error: 'Erreur de connexion. Veuillez r&eacute;essayer.' };
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    setLoading(true);
    try {
      // Check if email already exists
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', data.email);

      if (existing && existing.length > 0) {
        return { success: false, error: 'Cet email est d&eacute;j&agrave; utilis&eacute;.' };
      }

      // Check if username already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('user_name', data.user_name);

      if (existingUser && existingUser.length > 0) {
        return { success: false, error: 'Ce nom d&apos;utilisateur est d&eacute;j&agrave; pris.' };
      }

      // Get default theme from zifek settings
      let defaultThemeId = 1;
      let defaultThemeName = 'Business Moderne';
      try {
        const { data: zifekSettings } = await supabase
          .from('zifek')
          .select('default_theme_id')
          .limit(1)
          .maybeSingle();
        
        if (zifekSettings?.default_theme_id) {
          const themeId = parseInt(String(zifekSettings.default_theme_id), 10);
          if (!isNaN(themeId) && themeId > 0) {
            defaultThemeId = themeId;
            // Fetch theme name
            const { data: themeData } = await supabase
              .from('sitewebtheme')
              .select('titre')
              .eq('id', themeId)
              .maybeSingle();
            if (themeData?.titre) {
              defaultThemeName = themeData.titre;
            }
          }
        }
      } catch { /* fallback to theme 1 */ }

      // Hash password with bcrypt
      const { default: bcrypt } = await import('bcryptjs');
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(data.password, salt);

      const { data: newUsers, error } = await supabase
        .from('users')
        .insert({
          user_name: data.user_name,
          email: data.email,
          password: hashedPassword,
          name: data.name,
          nomcommerce: data.nomcommerce,
          telephone: data.telephone,
          type: data.type,
          typecompte: data.typecompte,
          "Pays": data["Pays"],
          "Ville": data["Ville"],
          monaie: 'MAD',
          langue: 'fr',
          active: 1,
          package: 0,
          payant: 1,
          theme: String(defaultThemeId),
        })
        .select('*');

      if (error) {
        return { success: false, error: 'Erreur lors de l&apos;inscription. Veuillez r&eacute;essayer.' };
      }

      const newUser = newUsers?.[0];
      if (newUser) {
        // Assign default theme
        await supabase
          .from('sitewebthemeactuelle')
          .insert({
            idtheme: defaultThemeId,
            nomtheme: defaultThemeName,
            idcommerce: newUser.id,
            prix: '0',
            status: 'active',
          });

        // Create subdomain entry
        const subdomainUrl = `${data.user_name}.zifek.fr`;
        await supabase
          .from('websitedomain')
          .insert({
            user_id: newUser.id,
            domaine: subdomainUrl,
          });
      }

      // Auto-login: set user in context
      if (newUser) {
        const zifekUser = mapZifekUser(newUser);
        setUser(zifekUser);
        setStoredUser(zifekUser);
        setSSOCookie(zifekUser.id, zifekUser.email);
      }

      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: 'Erreur lors de l&apos;inscription. Veuillez r&eacute;essayer.' };
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback((data: Partial<ZifekUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...data };
      setStoredUser(updated);
      return updated;
    });
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setStoredUser(null);
    clearSSOCookie();
  }, []);

  const registerClient = useCallback(async (data: ClientRegisterData) => {
    setLoading(true);
    try {
      // Check if email already exists
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', data.email);

      if (existing && existing.length > 0) {
        return { success: false, error: 'Cet email est d&eacute;j&agrave; utilis&eacute;.' };
      }

      // Check if username already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('user_name', data.user_name);

      if (existingUser && existingUser.length > 0) {
        return { success: false, error: 'Ce nom d&apos;utilisateur est d&eacute;j&agrave; pris.' };
      }

      // Hash password with bcrypt
      const { default: bcrypt } = await import('bcryptjs');
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(data.password, salt);

      const { data: newUsers, error } = await supabase
        .from('users')
        .insert({
          user_name: data.user_name,
          email: data.email,
          password: hashedPassword,
          name: data.name,
          telephone: data.telephone || '',
          type: 'Client',
          typecompte: 6,
          active: 1,
          package: 0,
          payant: 0,
          monaie: 'MAD',
          langue: 'fr',
          etatsousdomaine: 0,
        })
        .select('*');

      if (error) {
        return { success: false, error: 'Erreur lors de l&apos;inscription. Veuillez r&eacute;essayer.' };
      }

      const newUser = newUsers?.[0];
      if (newUser) {
        const zifekUser = mapZifekUser(newUser);
        setUser(zifekUser);
        setStoredUser(zifekUser);
        setSSOCookie(zifekUser.id, zifekUser.email);
      }

      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: 'Erreur lors de l&apos;inscription. Veuillez r&eacute;essayer.' };
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, registerClient, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}