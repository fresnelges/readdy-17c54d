import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useTenant } from '@/hooks/useTenant';
import { getMainSiteUrl } from '@/lib/domain';
import TenantNavbar from './TenantNavbar';
import TenantFooter from './TenantFooter';
import TenantHome from './TenantHome';
import ProduitsPublic from '@/pages/public/ProduitsPage';
import ServicesPublic from '@/pages/public/ServicesPage';
import PartenairesPublic from '@/pages/public/PartenairesPage';
import PortfolioPublic from '@/pages/public/PortfolioPage';
import EquipePublic from '@/pages/public/EquipePage';
import BookingPage from '@/pages/public/BookingPage';
import PublicFormPage from '@/pages/public/FormPage';
import ZCallRoomPage from '@/pages/public/ZCallRoomPage';
import NotFound from '@/pages/NotFound';
import TenantThemePage from './TenantThemePage';

export default function TenantStore() {
  const { tenant, theme, loading } = useTenant();

  if (loading) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <i className="ri-loader-4-line animate-spin text-3xl text-primary-500"></i>
          <p className="text-sm text-foreground-500">Chargement de la boutique...</p>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-background-50 flex flex-col items-center justify-center px-4">
        <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mb-4">
          <i className="ri-store-2-line text-2xl text-foreground-400"></i>
        </div>
        <h2 className="text-xl font-bold font-heading text-foreground-950 mb-2">Boutique introuvable</h2>
        <p className="text-sm text-foreground-500 text-center max-w-md mb-6">
          Cette boutique n&apos;existe pas ou a &eacute;t&eacute; d&eacute;sactiv&eacute;e.
        </p>
        <a href={getMainSiteUrl()} className="px-6 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer no-underline whitespace-nowrap">
          Retour &agrave; Zifek
        </a>
      </div>
    );
  }

  const storeName = theme?.navTitle || tenant.nomcommerce || tenant.name;

  return (
    <BrowserRouter basename={__BASE_PATH__}>
      <div className="min-h-screen bg-background-50 flex flex-col">
        {/* Charte graphique du tenant (vient de users.couleurcharte) — injectée AVANT le stylesheet du thème */}
        {theme?.chartPaletteCss && (
          <style>{theme.chartPaletteCss}</style>
        )}

        {/* Dynamic tenant styles based on theme */}
        {theme?.stylesheet && (
          <style>{theme.stylesheet}</style>
        )}

        {/* SEO meta for tenant store */}
        <TenantMeta storeName={storeName} description={tenant.description || storeName} />

        <TenantNavbar />

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<TenantHome />} />
            <Route path="/products" element={<ProduitsPublic />} />
            <Route path="/services" element={<ServicesPublic />} />
            <Route path="/partners" element={<PartenairesPublic />} />
            <Route path="/portfolio" element={<PortfolioPublic />} />
            <Route path="/team" element={<EquipePublic />} />
            <Route path="/booking" element={<BookingPage />} />
            <Route path="/booking/:serviceId" element={<BookingPage />} />
            <Route path="/forms/:id" element={<PublicFormPage />} />
            <Route path="/call/:roomId" element={<ZCallRoomPage />} />
            <Route path="/page/:pageKey" element={<TenantThemePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

        <TenantFooter />
      </div>
    </BrowserRouter>
  );
}

function TenantMeta({ storeName, description }: { storeName: string; description: string }) {
  // Update document title for the tenant store
  if (typeof document !== 'undefined') {
    document.title = storeName;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', description.slice(0, 160));
    }
  }
  return null;
}