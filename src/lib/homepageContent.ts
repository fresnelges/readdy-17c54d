// Types et contenus par défaut de la page d'accueil ZIFEK.
// Le superadmin peut éditer tout ce contenu depuis /superadmin/homepage,
// stocké dans la table `homepage_content` du Backend.

export interface HeroContent {
  badge: string;
  titleLine1: string;
  titleLine2Prefix: string;
  titleHighlight: string;
  subtitle: string;
  primaryCta: string;
  secondaryCta: string;
  socialProofValue: string;
  socialProofLabel: string;
  backgroundImage: string;
  avatars: string[];
}

export interface StatItem {
  value: string;
  suffix: string;
  label: string;
}

export interface StatsContent {
  badge: string;
  title: string;
  subtitle: string;
  items: StatItem[];
}

export interface FeatureItem {
  icon: string;
  title: string;
  description: string;
  color: 'primary' | 'accent' | 'secondary';
}

export interface FeaturesContent {
  badge: string;
  title: string;
  subtitle: string;
  items: FeatureItem[];
}

export interface StepItem {
  number: string;
  icon: string;
  title: string;
  description: string;
  image: string;
  color: 'primary' | 'accent' | 'secondary';
}

export interface HowItWorksContent {
  badge: string;
  title: string;
  subtitle: string;
  footerHint: string;
  items: StepItem[];
}

export interface TestimonialItem {
  name: string;
  role: string;
  text: string;
  image: string;
}

export interface TestimonialsContent {
  badge: string;
  title: string;
  subtitle: string;
  items: TestimonialItem[];
}

export interface PlanItem {
  name: string;
  price: string;
  annualPrice: string;
  currency: string;
  period: string;
  description: string;
  features: string[];
  highlighted: boolean;
  cta: string;
}

export interface PricingContent {
  badge: string;
  title: string;
  subtitle: string;
  items: PlanItem[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqContent {
  badge: string;
  title: string;
  subtitle: string;
  items: FaqItem[];
}

export interface CtaContent {
  titleBefore: string;
  highlight: string;
  titleAfter: string;
  subtitle: string;
  buttonText: string;
  backgroundImage: string;
}

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export interface SocialLink {
  icon: string;
  label: string;
  url: string;
}

export interface FooterContent {
  aboutText: string;
  copyrightText: string;
  socials: SocialLink[];
  columns: FooterColumn[];
}

export interface HomepageContent {
  hero: HeroContent;
  stats: StatsContent;
  features: FeaturesContent;
  how_it_works: HowItWorksContent;
  testimonials: TestimonialsContent;
  pricing: PricingContent;
  faq: FaqContent;
  cta: CtaContent;
  footer: FooterContent;
}

export type SectionKey = keyof HomepageContent;

export const SECTION_KEYS: SectionKey[] = [
  'hero',
  'stats',
  'features',
  'how_it_works',
  'testimonials',
  'pricing',
  'faq',
  'cta',
  'footer',
];

export const SECTION_LABELS: Record<SectionKey, string> = {
  hero: 'Hero (en-tête)',
  stats: 'Statistiques',
  features: 'Fonctionnalités',
  how_it_works: 'Comment ça marche',
  testimonials: 'Témoignages',
  pricing: 'Tarifs',
  faq: 'FAQ',
  cta: 'Appel à l\u2019action',
  footer: 'Pied de page',
};

export const DEFAULT_HOMEPAGE_CONTENT: HomepageContent = {
  hero: {
    badge: 'Lancement officiel — Offre early adopter',
    titleLine1: 'Votre business en ligne,',
    titleLine2Prefix: 'en',
    titleHighlight: 'quelques minutes',
    subtitle:
      'ZIFEK combine la puissance de Shopify, Wix et Fiverr dans une seule plateforme boostée à l\u2019IA. Créez votre site e-commerce, vitrine, ou marketplace — sans code.',
    primaryCta: 'Commencer gratuitement',
    secondaryCta: 'Découvrir ZIFEK',
    socialProofValue: '+12 000',
    socialProofLabel: 'entrepreneurs nous font confiance',
    backgroundImage:
      'https://readdy.ai/api/search-image?query=Dark%20warm%20abstract%20gradient%20with%20deep%20charcoal%20and%20subtle%20terracotta%20tones%20soft%20flowing%20organic%20shapes%20minimal%20modern%20elegant%20digital%20art%20low%20contrast%20atmospheric%20depth%20no%20text%20no%20people&width=1920&height=1080&seq=zifek-hero-clean-2026&orientation=landscape',
    avatars: [
      'https://readdy.ai/api/search-image?query=Professional%20headshot%20portrait%20of%20young%20African%20woman%20entrepreneur%20with%20warm%20friendly%20smile%20clean%20neutral%20background%20soft%20lighting%20modern%20business%20casual%20style%20minimal%20studio%20photography&width=80&height=80&seq=zifek-avatar-01-v2&orientation=squarish',
      'https://readdy.ai/api/search-image?query=Professional%20headshot%20portrait%20of%20female%20business%20owner%20with%20clean%20neutral%20background%20warm%20lighting%20confident%20expression%20modern%20style%20minimal%20studio%20photography&width=80&height=80&seq=zifek-avatar-02-v2&orientation=squarish',
      'https://readdy.ai/api/search-image?query=Professional%20headshot%20portrait%20of%20Middle%20Eastern%20businessman%20with%20clean%20neutral%20background%20warm%20lighting%20friendly%20smile%20modern%20business%20attire%20minimal%20studio%20photography&width=80&height=80&seq=zifek-avatar-03-v2&orientation=squarish',
      'https://readdy.ai/api/search-image?query=Professional%20headshot%20portrait%20of%20creative%20female%20designer%20with%20clean%20neutral%20background%20warm%20lighting%20approachable%20expression%20modern%20casual%20style%20minimal%20studio%20photography&width=80&height=80&seq=zifek-avatar-04-v2&orientation=squarish',
    ],
  },
  stats: {
    badge: 'Chiffres clés',
    title: '',
    subtitle: '',
    items: [
      { value: '12 000', suffix: '+', label: 'Entrepreneurs actifs' },
      { value: '45 000', suffix: '+', label: 'Boutiques créées' },
      { value: '98', suffix: '%', label: 'Satisfaction client' },
      { value: '3', suffix: ' min', label: 'Temps moyen de création' },
    ],
  },
  features: {
    badge: 'Tout-en-un',
    title: 'Une plateforme.\nToutes les possibilités.',
    subtitle:
      'ZIFEK remplace 8 outils différents. Créez, gérez et développez votre business en ligne depuis un seul endroit.',
    items: [
      {
        icon: 'ri-store-3-line',
        title: 'E-commerce complet',
        description:
          'Gérez vos produits physiques et numériques, variantes, stock et livraison. Tout ce dont vous avez besoin pour vendre en ligne.',
        color: 'primary',
      },
      {
        icon: 'ri-service-line',
        title: 'Prestations de services',
        description:
          'Proposez vos services avec réservation en ligne, calendrier, prise de rendez-vous et paiement intégré.',
        color: 'accent',
      },
      {
        icon: 'ri-brain-line',
        title: 'IA intégrée native',
        description:
          'L\u2019IA génère automatiquement votre site, vos descriptions et votre logo. Décrivez votre business, ZIFEK crée tout.',
        color: 'secondary',
      },
      {
        icon: 'ri-palette-line',
        title: 'Design personnalisable',
        description:
          'Thèmes professionnels et éditeur visuel. Personnalisez chaque détail sans écrire une ligne de code.',
        color: 'primary',
      },
      {
        icon: 'ri-bank-card-line',
        title: 'Paiements multi-passerelles',
        description:
          'Stripe, PayPal, CMI, PayDunya, Flutterwave. Acceptez les paiements depuis le monde entier en toute sécurité.',
        color: 'accent',
      },
      {
        icon: 'ri-global-line',
        title: 'Multi-langues & multi-devises',
        description:
          'Français, Anglais, Arabe, Espagnol. Chaque boutique peut être multilingue avec sa propre devise.',
        color: 'secondary',
      },
    ],
  },
  how_it_works: {
    badge: 'Simple et rapide',
    title: 'Comment ça marche ?',
    subtitle:
      'Lancez votre business en ligne en 3 étapes. Sans compétence technique, sans code.',
    footerHint: 'La plupart des boutiques sont opérationnelles en moins de 10 minutes',
    items: [
      {
        number: '01',
        icon: 'ri-rocket-2-line',
        title: 'Créez votre boutique',
        description:
          'Décrivez votre activité en quelques mots. L\u2019IA de ZIFEK génère automatiquement votre site e-commerce complet avec vos produits, votre design et votre identité visuelle.',
        image:
          'https://readdy.ai/api/search-image?query=Modern%20AI-powered%20website%20builder%20interface%20with%20floating%20UI%20cards%20and%20colorful%20dashboard%20elements%20warm%20coral%20and%20cream%20tones%20minimal%20clean%20design%20soft%20ambient%20lighting%20professional%20SaaS%20product%20illustration%20no%20text%20no%20people%20digital%20art&width=500&height=350&seq=zifek-step-01&orientation=landscape',
        color: 'primary',
      },
      {
        number: '02',
        icon: 'ri-paint-brush-line',
        title: 'Personnalisez votre univers',
        description:
          'Choisissez parmi des dizaines de thèmes professionnels, ajoutez vos produits physiques ou numériques, configurez vos moyens de paiement et votre domaine personnalisé.',
        image:
          'https://readdy.ai/api/search-image?query=Elegant%20ecommerce%20theme%20customization%20dashboard%20with%20color%20palette%20and%20product%20cards%20warm%20terracotta%20and%20cream%20tones%20minimal%20modern%20UI%20design%20soft%20lighting%20professional%20digital%20art%20creative%20workspace%20aesthetic%20no%20text&width=500&height=350&seq=zifek-step-02&orientation=landscape',
        color: 'accent',
      },
      {
        number: '03',
        icon: 'ri-line-chart-line',
        title: 'Vendez et développez',
        description:
          'Lancez votre boutique, acceptez les paiements, gérez vos commandes et suivez vos performances. ZIFEK s\u2019occupe de la technique, vous vous concentrez sur votre business.',
        image:
          'https://readdy.ai/api/search-image?query=Growing%20business%20analytics%20dashboard%20with%20rising%20charts%20and%20sales%20metrics%20warm%20golden%20and%20cream%20tones%20minimal%20modern%20design%20soft%20ambient%20lighting%20professional%20digital%20art%20success%20and%20growth%20visualization%20no%20text%20no%20people&width=500&height=350&seq=zifek-step-03&orientation=landscape',
        color: 'secondary',
      },
    ],
  },
  testimonials: {
    badge: 'Témoignages',
    title: 'Ils ont choisi ZIFEK',
    subtitle:
      'Des milliers d\u2019entrepreneurs ont déjà lancé leur business avec ZIFEK.',
    items: [
      {
        name: 'Fatima B.',
        role: 'Fondatrice, BeautyByFatima',
        text: 'ZIFEK a transformé ma boutique Instagram en un vrai site e-commerce en 1 jour. Mes ventes ont triplé le premier mois. L\u2019IA a même généré toutes mes descriptions produits !',
        image:
          'https://readdy.ai/api/search-image?query=Professional%20portrait%20of%20beautiful%20North%20African%20female%20entrepreneur%20smiling%20confidently%20warm%20natural%20lighting%20clean%20cream%20background%20modern%20casual%20business%20style%20approachable%20friendly%20expression%20high%20quality%20studio%20photography&width=200&height=200&seq=zifek-testimonial-01-v2&orientation=squarish',
      },
      {
        name: 'Youssef K.',
        role: 'Coach & Formateur',
        text: 'Je cherchais une solution pour vendre mes formations et gérer les réservations. ZIFEK fait les deux parfaitement. Le système de rendez-vous est bluffant.',
        image:
          'https://readdy.ai/api/search-image?query=Professional%20portrait%20of%20Moroccan%20male%20business%20coach%20with%20warm%20smile%20clean%20neutral%20background%20soft%20studio%20lighting%20modern%20business%20casual%20look%20confident%20professional%20headshot&width=200&height=200&seq=zifek-testimonial-02-v2&orientation=squarish',
      },
      {
        name: 'Amadou D.',
        role: 'CEO, DigitalSell',
        text: 'Après avoir testé Shopify, Wix et WordPress, ZIFEK est la seule plateforme qui combine vraiment tout. Mes clients adorent la simplicité.',
        image:
          'https://readdy.ai/api/search-image?query=Professional%20headshot%20of%20West%20African%20male%20tech%20entrepreneur%20with%20genuine%20smile%20clean%20studio%20background%20warm%20lighting%20modern%20style%20approachable%20professional%20vibe&width=200&height=200&seq=zifek-testimonial-03-v2&orientation=squarish',
      },
      {
        name: 'Samira M.',
        role: 'Artisane, MainsDorées',
        text: 'Je ne connais rien en informatique mais j\u2019ai créé mon site toute seule grâce à ZIFEK. L\u2019IA m\u2019a guidée pas à pas. C\u2019est magique !',
        image:
          'https://readdy.ai/api/search-image?query=Professional%20portrait%20of%20female%20artisan%20smiling%20warmly%20clean%20neutral%20background%20soft%20natural%20lighting%20authentic%20friendly%20expression%20creative%20professional%20style%20studio%20photography&width=200&height=200&seq=zifek-testimonial-04-v2&orientation=squarish',
      },
    ],
  },
  pricing: {
    badge: 'Tarifs',
    title: 'Des plans adaptés à votre croissance',
    subtitle:
      'Commencez gratuitement, évoluez quand vous êtes prêt. Sans engagement, sans frais cachés.',
    items: [
      {
        name: 'Gratuit',
        price: '0',
        annualPrice: '0',
        currency: 'MAD',
        period: '/mois',
        description: 'Pour démarrer et tester la plateforme',
        features: [
          'Jusqu\u2019à 10 produits',
          'Thèmes de base',
          'Sous-domaine ZIFEK',
          'Paiement en ligne',
          'Tableau de bord',
          'Support par email',
        ],
        highlighted: false,
        cta: 'Commencer gratuitement',
      },
      {
        name: 'Partenaire',
        price: '35',
        annualPrice: '29',
        currency: 'MAD',
        period: '/mois',
        description: 'Pour les petits commerces et indépendants',
        features: [
          'Jusqu\u2019à 100 produits',
          'Thèmes premium',
          'Domaine personnalisé',
          'Toutes les passerelles de paiement',
          'Réservation & calendrier',
          'Blog intégré',
          'Support prioritaire',
        ],
        highlighted: true,
        cta: 'Choisir Partenaire',
      },
      {
        name: 'Business',
        price: '100',
        annualPrice: '84',
        currency: 'MAD',
        period: '/mois',
        description: 'Pour les entreprises en croissance',
        features: [
          'Produits illimités',
          'Tous les thèmes + éditeur avancé',
          'Domaine personnalisé + emails',
          'IA avancée (logo, SEO, contenu)',
          'Marketplace multi-vendeurs',
          'API & webhooks',
          'Analytics avancés',
          'Support dédié 24/7',
        ],
        highlighted: false,
        cta: 'Choisir Business',
      },
    ],
  },
  faq: {
    badge: 'FAQ',
    title: 'Questions fréquentes',
    subtitle: 'Tout ce que vous devez savoir sur ZIFEK.',
    items: [
      {
        question: 'Est-ce que je peux vraiment créer un site sans savoir coder ?',
        answer:
          'Absolument ! ZIFEK est conçu pour que n\u2019importe qui, même sans connaissance technique, puisse créer un site professionnel. Notre éditeur visuel et notre IA vous guident pas à pas.',
      },
      {
        question: 'Quels types de paiement puis-je accepter ?',
        answer:
          'ZIFEK supporte Stripe, PayPal, CMI (Maroc), PayDunya, Flutterwave et le paiement à la livraison. Activez une ou plusieurs passerelles selon vos besoins.',
      },
      {
        question: 'Puis-je avoir mon propre nom de domaine ?',
        answer:
          'Oui ! Chaque boutique reçoit un sous-domaine gratuit (maboutique.zifek.fr) et vous pouvez également connecter votre propre domaine personnalisé.',
      },
      {
        question: 'Comment fonctionne l\u2019IA de ZIFEK ?',
        answer:
          'Décrivez simplement votre activité et l\u2019IA génère automatiquement votre site complet : pages, couleurs, logo, services, descriptions et structure SEO.',
      },
      {
        question: 'Est-ce que mes données sont en sécurité ?',
        answer:
          'La sécurité est notre priorité. Toutes les données sont chiffrées, les paiements via des passerelles PCI-DSS, et sauvegardes automatiques quotidiennes.',
      },
      {
        question: 'Y a-t-il des frais de transaction sur mes ventes ?',
        answer:
          'ZIFEK ne prélève aucun frais de transaction sur vos ventes. Vous ne payez que les frais standards de votre passerelle de paiement.',
      },
      {
        question: 'Puis-je migrer mon site existant vers ZIFEK ?',
        answer:
          'Oui, nous proposons un service de migration assistée pour Shopify, WooCommerce, Wix et autres plateformes. Notre équipe vous accompagne.',
      },
    ],
  },
  cta: {
    titleBefore: 'Prêt à lancer',
    highlight: 'votre business',
    titleAfter: 'en ligne ?',
    subtitle:
      'Rejoignez plus de 12 000 entrepreneurs qui ont déjà choisi ZIFEK. Créez votre site gratuitement, sans engagement.',
    buttonText: 'Créer mon site gratuitement',
    backgroundImage:
      'https://readdy.ai/api/search-image?query=Dark%20warm%20abstract%20subtle%20gradient%20with%20soft%20terracotta%20and%20charcoal%20tones%20minimal%20texture%20modern%20elegant%20digital%20art%20low%20contrast%20no%20text%20no%20people&width=1400&height=500&seq=zifek-cta-clean-v1&orientation=landscape',
  },
  footer: {
    aboutText:
      'La plateforme SaaS tout-en-un pour créer votre business en ligne. E-commerce, services, marketplace, réservations. Sans code, boosté à l\u2019IA.',
    copyrightText: 'ZIFEK. Tous droits réservés.',
    socials: [
      { icon: 'ri-facebook-line', label: 'Facebook', url: '#' },
      { icon: 'ri-instagram-line', label: 'Instagram', url: '#' },
      { icon: 'ri-tiktok-line', label: 'TikTok', url: '#' },
      { icon: 'ri-linkedin-line', label: 'LinkedIn', url: '#' },
    ],
    columns: [
      {
        title: 'Plateforme',
        links: [
          { label: 'Fonctionnalités', href: '#features' },
          { label: 'Tarifs', href: '#pricing' },
          { label: 'Solutions', href: '#activities' },
          { label: 'Thèmes', href: '#' },
          { label: 'Applications', href: '#' },
        ],
      },
      {
        title: 'Ressources',
        links: [
          { label: 'Blog', href: '#' },
          { label: 'Documentation', href: '#' },
          { label: 'API', href: '#' },
          { label: 'Communauté', href: '#' },
          { label: 'Status', href: '#' },
        ],
      },
      {
        title: 'Entreprise',
        links: [
          { label: 'À propos', href: '#' },
          { label: 'Contact', href: '#' },
          { label: 'Carrières', href: '#' },
          { label: 'Presse', href: '#' },
        ],
      },
    ],
  },
};

/**
 * Fusionne les données de la base avec les valeurs par défaut.
 * Pour chaque section : on prend la valeur en base si elle existe, sinon la valeur par défaut.
 */
export function mergeHomepageContent(
  db: Partial<HomepageContent> | null | undefined
): HomepageContent {
  const merged: HomepageContent = { ...DEFAULT_HOMEPAGE_CONTENT };
  if (!db) return merged;
  SECTION_KEYS.forEach((key) => {
    const value = db[key];
    if (value && typeof value === 'object') {
      (merged as Record<string, unknown>)[key] = value;
    }
  });
  return merged;
}