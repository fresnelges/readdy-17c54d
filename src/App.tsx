import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./router";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { AuthProvider } from "./hooks/useAuth";
import { TenantProvider, useTenant } from "./hooks/useTenant";
import { CartProvider } from "./hooks/useCart";
import { BrandProvider } from "./hooks/useBrand";
import { HomepageContentProvider } from "./hooks/useHomepageContent";
import TenantStore from "./pages/tenant/TenantStore";

function AppShell() {
  const { isTenant, loading } = useTenant();

  // Loading screen while resolving tenant
  if (loading) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <i className="ri-loader-4-line animate-spin text-3xl text-primary-500"></i>
          <p className="text-sm text-foreground-500">Chargement...</p>
        </div>
      </div>
    );
  }

  // Tenant store (subdomain or custom domain)
  if (isTenant) {
    return <TenantStore />;
  }

  // Main Zifek site (zifek.fr)
  return (
    <HomepageContentProvider>
      <BrandProvider>
        <BrowserRouter basename={__BASE_PATH__}>
          <AppRoutes />
        </BrowserRouter>
      </BrandProvider>
    </HomepageContentProvider>
  );
}

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <TenantProvider>
          <CartProvider>
            <AppShell />
          </CartProvider>
        </TenantProvider>
      </AuthProvider>
    </I18nextProvider>
  );
}

export default App;