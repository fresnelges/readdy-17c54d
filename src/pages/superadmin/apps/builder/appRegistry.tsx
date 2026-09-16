import type { ComponentType } from 'react';
import { supabase } from '@/lib/supabase';
import CaissePage from '@/pages/dashboard/caisse/page';
import AnalyticsAdvancedPage from '@/pages/dashboard/apps/analytics-advanced/page';
import CustomersManagerPage from '@/pages/dashboard/apps/customers-manager/page';
import CustomerDetailPage from '@/pages/dashboard/apps/customers-manager/detail/page';
import WhatsAppButtonPage from '@/pages/dashboard/apps/whatsapp-button/page';
import AIShopperPage from '@/pages/dashboard/apps/ai-shopper/page';
import CustomerSupportPage from '@/pages/dashboard/apps/customer-support/page';
import FacebookPixelPage from '@/pages/dashboard/apps/facebook-pixel/page';
import IAReportingPage from '@/pages/dashboard/apps/ia-reporting/page';
import MaFidelitePage from '@/pages/dashboard/apps/ma-fidelite/page';
import FideliteRecompensesPage from '@/pages/dashboard/apps/fidelite-recompenses/page';
import MonAssistantPage from '@/pages/dashboard/apps/mon-assistant/page';
import PayPalPage from '@/pages/dashboard/apps/paypal/page';
import FileManagerPage from '@/pages/dashboard/apps/file-manager/page';
import FormsAppPage from '@/pages/dashboard/apps/forms/page';
import FormBuilderPage from '@/pages/dashboard/apps/forms/new/page';
import FormResponsesPage from '@/pages/dashboard/apps/forms/responses/page';
import ZCalendarPage from '@/pages/dashboard/apps/zcalendar/page';
import ZifekBIPage from '@/pages/dashboard/apps/zifekbi/page';
import GestionProPage from '@/pages/dashboard/apps/gestionpro/page';
import GestionProDetailPage from '@/pages/dashboard/apps/gestionpro/detail/page';
import ZCallPage from '@/pages/dashboard/apps/zcall/page';
import FormationAppPage from '@/pages/dashboard/apps/formation/page';

export interface AppPageDef {
  key: string;
  title: string;
  icon: string;
  /** Chemin relatif à /dashboard/{nompage}. Utilisez '/' pour la page principale. */
  path: string;
  Component: ComponentType<{ initialTab?: string }>;
  /** Onglet interne à ouvrir (pour les pages qui ont des onglets). */
  initialTab?: string;
  /** Résout le paramètre `:id`/`:customerId` vers un id réel du commerçant de démo. */
  resolveParam?: (userId: number) => Promise<string | number | null>;
  /** Regroupe visuellement les sous-onglets sous un parent (ex: « Détail projet »). */
  group?: string;
}

export interface AppDef {
  label: string;
  icon: string;
  pages: AppPageDef[];
}

// ── Résolveurs de paramètres (un vrai id de démo par app) ──

async function resolveGestionProProjectId(userId: number): Promise<number | null> {
  const { data } = await supabase
    .from('projet')
    .select('id')
    .eq('owner', userId)
    .order('id', { ascending: false })
    .limit(1);
  if (data && data.length > 0) return data[0].id as number;
  const { data: anyData } = await supabase
    .from('projet')
    .select('id')
    .order('id', { ascending: false })
    .limit(1);
  return anyData && anyData.length > 0 ? (anyData[0].id as number) : null;
}

async function resolveCustomerId(_userId: number): Promise<number | null> {
  const { data } = await supabase
    .from('order_headers')
    .select('customer_id')
    .not('customer_id', 'is', null)
    .neq('customer_id', 'guest')
    .order('created_at', { ascending: false })
    .limit(1);
  const cid = data?.[0]?.customer_id;
  if (!cid) return null;
  const n = parseInt(String(cid), 10);
  return Number.isNaN(n) ? null : n;
}

async function resolveFormId(userId: number): Promise<number | null> {
  const { data } = await supabase
    .from('forms')
    .select('id')
    .eq('commerceid', userId)
    .order('created_at', { ascending: false })
    .limit(1);
  if (data && data.length > 0) return data[0].id as number;
  const { data: anyData } = await supabase
    .from('forms')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1);
  return anyData && anyData.length > 0 ? (anyData[0].id as number) : null;
}

/**
 * Registre des applications "codées en dur" (composants React dédiés).
 * La clé correspond au champ `nompage` de la table `appstore`.
 *
 * Les apps absentes de ce registre (ex: seo-optimizer, chat-live…) sont des
 * apps pilotées par le builder (tables app_pages / app_blocks), et sont rendues
 * via DynamicAppPage — elles n'ont donc pas de composant dédié ici.
 */
export const APP_REGISTRY: Record<string, AppDef> = {
  caisse: {
    label: 'Ma Caisse',
    icon: 'ri-shopping-cart-2-line',
    pages: [
      { key: 'main', title: 'Ma Caisse', icon: 'ri-shopping-cart-2-line', path: '/', Component: CaissePage },
    ],
  },
  'analytics-advanced': {
    label: 'Analytics Avancés',
    icon: 'ri-line-chart-line',
    pages: [
      { key: 'main', title: 'Analytics Avancés', icon: 'ri-line-chart-line', path: '/', Component: AnalyticsAdvancedPage },
    ],
  },
  'customers-manager': {
    label: 'Gestion Clients',
    icon: 'ri-user-settings-line',
    pages: [
      { key: 'list', title: 'Clients', icon: 'ri-user-settings-line', path: '/', Component: CustomersManagerPage },
      { key: 'c-orders', title: 'Commandes', icon: 'ri-file-list-3-line', path: '/:customerId', Component: CustomerDetailPage, initialTab: 'orders', resolveParam: resolveCustomerId, group: 'Détail client' },
      { key: 'c-visits', title: 'Visites', icon: 'ri-eye-line', path: '/:customerId', Component: CustomerDetailPage, initialTab: 'visits', resolveParam: resolveCustomerId, group: 'Détail client' },
      { key: 'c-cart', title: 'Panier', icon: 'ri-shopping-cart-line', path: '/:customerId', Component: CustomerDetailPage, initialTab: 'cart', resolveParam: resolveCustomerId, group: 'Détail client' },
      { key: 'c-contacts', title: 'Messages', icon: 'ri-message-3-line', path: '/:customerId', Component: CustomerDetailPage, initialTab: 'contacts', resolveParam: resolveCustomerId, group: 'Détail client' },
      { key: 'c-fidelite', title: 'Fidélité', icon: 'ri-star-line', path: '/:customerId', Component: CustomerDetailPage, initialTab: 'fidelite', resolveParam: resolveCustomerId, group: 'Détail client' },
      { key: 'c-finances', title: 'Finances', icon: 'ri-bank-line', path: '/:customerId', Component: CustomerDetailPage, initialTab: 'finances', resolveParam: resolveCustomerId, group: 'Détail client' },
      { key: 'c-notes', title: 'Notes', icon: 'ri-sticky-note-line', path: '/:customerId', Component: CustomerDetailPage, initialTab: 'notes', resolveParam: resolveCustomerId, group: 'Détail client' },
    ],
  },
  'whatsapp-button': {
    label: 'Bouton WhatsApp',
    icon: 'ri-whatsapp-line',
    pages: [
      { key: 'main', title: 'Bouton WhatsApp', icon: 'ri-whatsapp-line', path: '/', Component: WhatsAppButtonPage },
    ],
  },
  'ai-shopper': {
    label: 'AI Shopper',
    icon: 'ri-robot-2-line',
    pages: [
      { key: 'main', title: 'AI Shopper', icon: 'ri-robot-2-line', path: '/', Component: AIShopperPage },
    ],
  },
  'customer-support': {
    label: 'Service Client',
    icon: 'ri-customer-service-2-line',
    pages: [
      { key: 'main', title: 'Service Client', icon: 'ri-customer-service-2-line', path: '/', Component: CustomerSupportPage },
    ],
  },
  'facebook-pixel': {
    label: 'Facebook Pixel',
    icon: 'ri-facebook-circle-line',
    pages: [
      { key: 'main', title: 'Facebook Pixel', icon: 'ri-facebook-circle-line', path: '/', Component: FacebookPixelPage },
    ],
  },
  'ia-reporting': {
    label: 'Analyse & Reporting IA',
    icon: 'ri-brain-line',
    pages: [
      { key: 'main', title: 'Analyse & Reporting IA', icon: 'ri-brain-line', path: '/', Component: IAReportingPage },
    ],
  },
  'ma-fidelite': {
    label: 'Ma Fidélité',
    icon: 'ri-heart-line',
    pages: [
      { key: 'main', title: 'Ma Fidélité', icon: 'ri-heart-line', path: '/', Component: MaFidelitePage },
    ],
  },
  'fidelite-recompenses': {
    label: 'Fidélité & Récompenses',
    icon: 'ri-vip-crown-line',
    pages: [
      { key: 'main', title: 'Fidélité & Récompenses', icon: 'ri-vip-crown-line', path: '/', Component: FideliteRecompensesPage },
    ],
  },
  'mon-assistant': {
    label: 'Mon Assistant',
    icon: 'ri-robot-2-line',
    pages: [
      { key: 'main', title: 'Mon Assistant', icon: 'ri-robot-2-line', path: '/', Component: MonAssistantPage },
    ],
  },
  paypal: {
    label: 'PayPal',
    icon: 'ri-paypal-line',
    pages: [
      { key: 'main', title: 'PayPal', icon: 'ri-paypal-line', path: '/', Component: PayPalPage },
    ],
  },
  'file-manager': {
    label: 'File Manager',
    icon: 'ri-folder-line',
    pages: [
      { key: 'main', title: 'File Manager', icon: 'ri-folder-line', path: '/', Component: FileManagerPage },
    ],
  },
  forms: {
    label: 'Forms',
    icon: 'ri-survey-line',
    pages: [
      { key: 'list', title: 'Formulaires', icon: 'ri-survey-line', path: '/', Component: FormsAppPage },
      { key: 'new', title: 'Nouveau formulaire', icon: 'ri-add-circle-line', path: '/new', Component: FormBuilderPage },
      { key: 'edit', title: 'Modifier formulaire', icon: 'ri-edit-line', path: '/:id/edit', Component: FormBuilderPage, resolveParam: resolveFormId },
      { key: 'responses', title: 'Réponses', icon: 'ri-inbox-line', path: '/:id/responses', Component: FormResponsesPage, resolveParam: resolveFormId },
    ],
  },
  zcalendar: {
    label: 'ZCalendar',
    icon: 'ri-calendar-line',
    pages: [
      { key: 'main', title: 'ZCalendar', icon: 'ri-calendar-line', path: '/', Component: ZCalendarPage },
    ],
  },
  zifekbi: {
    label: 'ZifekBI',
    icon: 'ri-bar-chart-box-line',
    pages: [
      { key: 'main', title: 'ZifekBI', icon: 'ri-bar-chart-box-line', path: '/', Component: ZifekBIPage },
    ],
  },
  gestionpro: {
    label: 'GESTIONPRO',
    icon: 'ri-projector-line',
    pages: [
      { key: 'list', title: 'Projets', icon: 'ri-projector-line', path: '/', Component: GestionProPage },
      { key: 'd-liste', title: 'Liste', icon: 'ri-list-check', path: '/:id', Component: GestionProDetailPage, initialTab: 'liste', resolveParam: resolveGestionProProjectId, group: 'Détail projet' },
      { key: 'd-kanban', title: 'Kanban', icon: 'ri-layout-column-line', path: '/:id', Component: GestionProDetailPage, initialTab: 'kanban', resolveParam: resolveGestionProProjectId, group: 'Détail projet' },
      { key: 'd-gantt', title: 'Gantt', icon: 'ri-bar-chart-horizontal-line', path: '/:id', Component: GestionProDetailPage, initialTab: 'gantt', resolveParam: resolveGestionProProjectId, group: 'Détail projet' },
      { key: 'd-users', title: 'Utilisateurs', icon: 'ri-team-line', path: '/:id', Component: GestionProDetailPage, initialTab: 'utilisateurs', resolveParam: resolveGestionProProjectId, group: 'Détail projet' },
      { key: 'd-files', title: 'Fichiers', icon: 'ri-folder-line', path: '/:id', Component: GestionProDetailPage, initialTab: 'fichiers', resolveParam: resolveGestionProProjectId, group: 'Détail projet' },
    ],
  },
  zcall: {
    label: 'ZCall',
    icon: 'ri-vidicon-line',
    pages: [
      { key: 'main', title: 'ZCall', icon: 'ri-vidicon-line', path: '/', Component: ZCallPage },
    ],
  },
  formation: {
    label: 'Formation',
    icon: 'ri-graduation-cap-line',
    pages: [
      { key: 'main', title: 'Formation', icon: 'ri-graduation-cap-line', path: '/', Component: FormationAppPage },
    ],
  },
};

export function getAppDef(nompage: string): AppDef | undefined {
  return APP_REGISTRY[nompage];
}

const slugifyKey = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'page';

/**
 * Synchronise les pages "codées" (du registre) dans la table app_pages du
 * builder. Les pages natives sont marquées native=true pour être distinguées
 * des pages construites à la main. Idempotent : n'insère que les pages absentes.
 */
export async function syncNativePages(appId: number, nompage: string): Promise<void> {
  const def = APP_REGISTRY[nompage];
  if (!def) return;

  const { data: existing } = await supabase
    .from('app_pages')
    .select('id, slug')
    .eq('app_id', appId)
    .eq('native', true);

  const existingSlugs = new Set<string>((existing || []).map((p) => p.slug));

  for (const [i, page] of def.pages.entries()) {
    const slug = slugifyKey(page.key);
    if (existingSlugs.has(slug)) continue;
    const { error } = await supabase.from('app_pages').insert({
      app_id: appId,
      title: page.title,
      slug,
      icon: page.icon,
      position: i,
      visibility: 'visible',
      native: true,
    });
    if (error) {
      console.error('syncNativePages insert failed', error.message);
    }
  }
}