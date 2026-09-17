// Titres et sous-titres des sections publiques d'une boutique.
// Chaque boutique peut les personnaliser depuis le dashboard
// (page "Titres des sections"), stockés dans la table `siteweb_section_content`.

export interface SectionDef {
  key: string;
  label: string;
  title: string;
  subtitle: string;
  icon: string;
  /** Si false, la section n'a pas de sous-titre éditable. */
  hasSubtitle?: boolean;
  /** Texte d'aide affiché sous le champ Titre dans le dashboard. */
  note?: string;
}

export const SECTION_DEFS: SectionDef[] = [
  {
    key: 'produits',
    label: 'Produits',
    title: 'Nos Produits',
    subtitle: 'Découvrez notre catalogue de produits',
    icon: 'ri-shopping-bag-3-line',
  },
  {
    key: 'services',
    label: 'Services',
    title: 'Nos Services',
    subtitle: 'Des solutions sur mesure pour répondre à vos besoins',
    icon: 'ri-service-line',
  },
  {
    key: 'equipe',
    label: 'Équipe',
    title: 'Notre Équipe',
    subtitle: 'Des professionnels passionnés à votre service',
    icon: 'ri-team-line',
  },
  {
    key: 'partenaires',
    label: 'Partenaires',
    title: 'Nos Partenaires',
    subtitle: 'Découvrez les entreprises et collaborateurs qui nous font confiance',
    icon: 'ri-group-line',
  },
  {
    key: 'portfolio',
    label: 'Portfolio',
    title: 'Notre Portfolio',
    subtitle: 'Découvrez nos projets réalisés et notre savoir-faire',
    icon: 'ri-briefcase-line',
  },
  {
    key: 'home-produits',
    label: 'Accueil · Produits',
    title: 'Produits',
    subtitle: '',
    icon: 'ri-shopping-bag-line',
    hasSubtitle: false,
    note: "Ce titre s'affiche dans la section Produits de votre page d'accueil.",
  },
  {
    key: 'home-services',
    label: 'Accueil · Services',
    title: 'Services',
    subtitle: '',
    icon: 'ri-service-line',
    hasSubtitle: false,
    note: "Ce titre s'affiche dans la section Services de votre page d'accueil.",
  },
  {
    key: 'home-apropos',
    label: 'Accueil · À propos',
    title: 'À propos de {storeName}',
    subtitle: '',
    icon: 'ri-store-2-line',
    hasSubtitle: false,
    note: 'Le texte {storeName} sera remplacé par le nom de votre boutique.',
  },
  {
    key: 'home-question',
    label: 'Accueil · Contact',
    title: 'Une question ?',
    subtitle: "N'hésitez pas à nous contacter pour toute demande d'information.",
    icon: 'ri-question-line',
    note: "Ce titre et sous-titre s'affichent dans le bloc de contact de votre page d'accueil.",
  },
];

export interface SectionContentRow {
  idcommerce: number;
  section_key: string;
  title: string;
  subtitle: string;
}

/**
 * Découpe un titre en deux parties : le préfixe et le dernier mot,
 * qui est mis en évidence (couleur primaire) sur les pages publiques.
 */
export function splitTitle(title: string): { before: string; highlight: string | null } {
  const trimmed = (title || '').trim();
  if (!trimmed) return { before: '', highlight: null };
  const idx = trimmed.lastIndexOf(' ');
  if (idx === -1) return { before: '', highlight: trimmed };
  return {
    before: trimmed.slice(0, idx).trim(),
    highlight: trimmed.slice(idx + 1).trim(),
  };
}