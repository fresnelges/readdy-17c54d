import { useScrollReveal } from '@/hooks/useScrollReveal';

export default function Features() {
  const { ref: sectionRef, isVisible } = useScrollReveal(0.1);

  const features = [
    {
      icon: 'ri-store-3-line',
      title: 'E-commerce complet',
      description:
        'Gérez vos produits physiques et numériques, variantes, stock et livraison. Tout ce dont vous avez besoin pour vendre en ligne.',
      color: 'bg-primary-100 text-primary-700',
      border: 'group-hover:border-primary-300/50',
    },
    {
      icon: 'ri-service-line',
      title: 'Prestations de services',
      description:
        'Proposez vos services avec réservation en ligne, calendrier, prise de rendez-vous et paiement intégré.',
      color: 'bg-accent-100 text-accent-700',
      border: 'group-hover:border-accent-300/50',
    },
    {
      icon: 'ri-brain-line',
      title: 'IA intégrée native',
      description:
        "L'IA génère automatiquement votre site, vos descriptions et votre logo. Décrivez votre business, ZIFEK crée tout.",
      color: 'bg-secondary-100 text-secondary-700',
      border: 'group-hover:border-secondary-300/50',
    },
    {
      icon: 'ri-palette-line',
      title: 'Design personnalisable',
      description:
        "Thèmes professionnels et éditeur visuel. Personnalisez chaque détail sans écrire une ligne de code.",
      color: 'bg-primary-100 text-primary-700',
      border: 'group-hover:border-primary-300/50',
    },
    {
      icon: 'ri-bank-card-line',
      title: 'Paiements multi-passerelles',
      description:
        'Stripe, PayPal, CMI, PayDunya, Flutterwave. Acceptez les paiements depuis le monde entier en toute sécurité.',
      color: 'bg-accent-100 text-accent-700',
      border: 'group-hover:border-accent-300/50',
    },
    {
      icon: 'ri-global-line',
      title: 'Multi-langues \u0026 multi-devises',
      description:
        'Français, Anglais, Arabe, Espagnol. Chaque boutique peut être multilingue avec sa propre devise.',
      color: 'bg-secondary-100 text-secondary-700',
      border: 'group-hover:border-secondary-300/50',
    },
  ];

  return (
    <section
      id="features"
      ref={sectionRef as React.LegacyRef<HTMLElement>}
      className="relative py-16 md:py-24 bg-background-50"
    >
      <div className="w-full px-4 md:px-6 lg:px-10 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6 mb-10 md:mb-14">
          <div className="max-w-lg">
            <span className="inline-block px-3 py-1.5 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold mb-5">
              Tout-en-un
            </span>
            <h2 className="text-3xl md:text-5xl font-bold font-heading text-foreground-950 leading-[1.1]">
              Une plateforme.
              <br />
              Toutes les possibilités.
            </h2>
          </div>
          <p className="text-foreground-500 text-base md:text-lg max-w-md leading-relaxed lg:pb-1">
            ZIFEK remplace 8 outils différents. Créez, gérez et développez
            votre business en ligne depuis un seul endroit.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`group p-6 md:p-7 rounded-lg bg-background-50 border border-background-200/70 ${feature.border} hover:-translate-y-1 transition-all duration-300 cursor-pointer ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
              style={{ transitionDelay: `${index * 80}ms`, transitionDuration: '600ms' }}
            >
              <div
                className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110`}
              >
                <i className={`${feature.icon} text-xl`}></i>
              </div>
              <h3 className="text-base md:text-lg font-semibold font-heading text-foreground-950 mb-2.5">
                {feature.title}
              </h3>
              <p className="text-foreground-500 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}