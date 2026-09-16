import { useMemo, type ReactNode } from 'react';
import { AuthContext, type AuthContextType, type ZifekUser } from '@/hooks/useAuth';

interface DemoAuthProviderProps {
  user: ZifekUser;
  children: ReactNode;
}

/**
 * Surcharge le contexte d'authentification pour un sous-arbre afin de simuler
 * la connexion d'un commerçant de démo. Les apps (gestionpro, zcall…) lisent
 * leur utilisateur via useAuth() ; ce provider leur fournit le commerçant choisi
 * par le super admin sans toucher à la vraie session.
 */
export default function DemoAuthProvider({ user, children }: DemoAuthProviderProps) {
  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading: false,
      login: async () => ({ success: false }),
      register: async () => ({ success: false }),
      registerClient: async () => ({ success: false }),
      logout: () => {},
      updateUser: () => {},
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}