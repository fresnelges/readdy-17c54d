import { useTenant } from '@/hooks/useTenant';

export default function TenantFooter() {
  const { tenant, theme } = useTenant();

  if (!tenant) return null;

  const storeName = theme?.navTitle || tenant.nomcommerce || tenant.name;
  const year = new Date().getFullYear();

  return (
    <footer className="bg-background-100 border-t border-background-200/70 mt-auto">
      <div className="w-full px-4 md:px-6 max-w-7xl mx-auto py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground-800">{storeName}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-foreground-500">
            {tenant.Pays && <span>{tenant.Ville ? `${tenant.Ville}, ${tenant.Pays}` : tenant.Pays}</span>}
            {tenant.telephone && (
              <a href={`tel:${tenant.telephone}`} className="text-foreground-500 hover:text-foreground-700 transition-colors no-underline">
                <i className="ri-phone-line mr-1"></i>{tenant.telephone}
              </a>
            )}
            {tenant.email && (
              <a href={`mailto:${tenant.email}`} className="text-foreground-500 hover:text-foreground-700 transition-colors no-underline">
                <i className="ri-mail-line mr-1"></i>{tenant.email}
              </a>
            )}
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-background-200/70 text-center text-xs text-foreground-400">
          &copy; {year} {storeName}. Propulsé par{' '}
          <a href="https://zifek.fr" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 font-medium no-underline">
            Zifek
          </a>
        </div>
      </div>
    </footer>
  );
}