import { useScrollReveal } from '@/hooks/useScrollReveal';

export default function ActivityTypes() {
  const { ref: sectionRef, isVisible } = useScrollReveal(0.1);

  const activities = [
    {
      icon: 'ri-smartphone-line',
      title: 'Produits physiques',
      description:
        'Vêtements, électronique, alimentation, accessoires. Gérez stock, variantes et livraison.',
      image:
        'https://readdy.ai/api/search-image?query=Elegant%20minimalist%20product%20photography%20of%20modern%20consumer%20electronics%20and%20fashion%20accessories%20arranged%20on%20warm%20neutral%20cream%20surface%20soft%20natural%20side%20lighting%20clean%20background%20editorial%20style%20shallow%20depth%20of%20field%20professional%20ecommerce%20aesthetic&width=600&height=400&seq=zifek-activity-physical&orientation=landscape',
      tag: 'Le plus populaire',
      color: 'bg-primary-500',
    },
    {
      icon: 'ri-download-cloud-2-line',
      title: 'Produits numériques',
      description:
        'Ebooks, logiciels, templates, musique, formations. Téléchargement sécurisé et liens temporaires.',
      image:
        'https://readdy.ai/api/search-image?query=Modern%20digital%20product%20display%20with%20floating%20ebook%20covers%20and%20software%20interface%20screenshots%20on%20minimal%20white%20background%20soft%20warm%20ambient%20lighting%20clean%20contemporary%20layout%20professional%20digital%20assets%20presentation%20creative%20composition&width=600&height=400&seq=zifek-activity-digital&orientation=landscape',
      tag: '',
      color: '',
    },
    {
      icon: 'ri-calendar-check-line',
      title: 'Prestations de services',
      description:
        'Coaching, consulting, design, développement. Réservation, agenda et paiement intégré.',
      image:
        'https://readdy.ai/api/search-image?query=Professional%20consultant%20working%20at%20modern%20coworking%20space%20with%20laptop%20and%20calendar%20planner%20warm%20natural%20light%20from%20window%20clean%20minimal%20workspace%20friendly%20collaborative%20atmosphere%20soft%20focus%20background%20professional%20service%20business%20vibe&width=600&height=400&seq=zifek-activity-services&orientation=landscape',
      tag: '',
      color: '',
    },
    {
      icon: 'ri-store-2-line',
      title: 'Marketplace',
      description:
        'Créez votre propre marketplace multi-vendeurs. Produits, services, formations dans un seul espace.',
      image:
        'https://readdy.ai/api/search-image?query=Modern%20online%20marketplace%20concept%20with%20diverse%20product%20cards%20floating%20in%20organized%20grid%20warm%20neutral%20background%20clean%20UI%20design%20elements%20soft%20ambient%20lighting%20contemporary%20digital%20commerce%20aesthetic%20professional%20presentation&width=600&height=400&seq=zifek-activity-marketplace&orientation=landscape',
      tag: '',
      color: '',
    },
  ];

  return (
    <section
      id="activities"
      ref={sectionRef as React.LegacyRef<HTMLElement>}
      className="relative py-20 md:py-28 bg-background-100"
    >
      <div className="w-full px-4 md:px-6 lg:px-10 max-w-7xl mx-auto">
        <div className="text-center mb-14 md:mb-20">
          <span className="inline-block px-3 py-1.5 rounded-full bg-accent-100 text-accent-700 text-xs font-semibold mb-5">
            Solutions
          </span>
          <h2 className="text-3xl md:text-5xl font-bold font-heading text-foreground-950 mb-4">
            Un site pour chaque activité
          </h2>
          <p className="text-foreground-500 text-base md:text-lg max-w-2xl mx-auto">
            Quel que soit votre business, ZIFEK s'adapte. Choisissez votre type
            d'activité et laissez la plateforme configurer tout automatiquement.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {activities.map((activity, index) => (
            <div
              key={index}
              className={`group rounded-lg bg-background-50 border border-background-200/70 overflow-hidden hover:border-primary-200/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
              style={{ transitionDelay: `${index * 100}ms`, transitionDuration: '600ms' }}
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <img
                  src={activity.image}
                  alt={activity.title}
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                />
                {activity.tag && (
                  <span
                    className={`absolute top-3 left-3 px-2.5 py-1 rounded-full ${activity.color} text-white text-xs font-medium`}
                  >
                    {activity.tag}
                  </span>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-foreground-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <div className="p-5 md:p-6">
                <div className="flex items-center gap-2 mb-2">
                  <i className={`${activity.icon} text-primary-500`}></i>
                  <h3 className="text-sm md:text-base font-semibold font-heading text-foreground-950">
                    {activity.title}
                  </h3>
                </div>
                <p className="text-foreground-500 text-xs leading-relaxed">
                  {activity.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}