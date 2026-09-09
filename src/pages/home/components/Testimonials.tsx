import { useScrollReveal } from '@/hooks/useScrollReveal';

export default function Testimonials() {
  const { ref: sectionRef, isVisible } = useScrollReveal(0.1);

  const testimonials = [
    {
      name: 'Fatima B.',
      role: 'Fondatrice, BeautyByFatima',
      text: "ZIFEK a transformé ma boutique Instagram en un vrai site e-commerce en 1 jour. Mes ventes ont triplé le premier mois. L'IA a même généré toutes mes descriptions produits !",
      image: 'https://readdy.ai/api/search-image?query=Professional%20portrait%20of%20beautiful%20North%20African%20female%20entrepreneur%20smiling%20confidently%20warm%20natural%20lighting%20clean%20cream%20background%20modern%20casual%20business%20style%20approachable%20friendly%20expression%20high%20quality%20studio%20photography&width=200&height=200&seq=zifek-testimonial-01-v2&orientation=squarish',
    },
    {
      name: 'Youssef K.',
      role: 'Coach & Formateur',
      text: 'Je cherchais une solution pour vendre mes formations et gérer les réservations. ZIFEK fait les deux parfaitement. Le système de rendez-vous est bluffant.',
      image: 'https://readdy.ai/api/search-image?query=Professional%20portrait%20of%20Moroccan%20male%20business%20coach%20with%20warm%20smile%20clean%20neutral%20background%20soft%20studio%20lighting%20modern%20business%20casual%20look%20confident%20professional%20headshot&width=200&height=200&seq=zifek-testimonial-02-v2&orientation=squarish',
    },
    {
      name: 'Amadou D.',
      role: 'CEO, DigitalSell',
      text: "Après avoir testé Shopify, Wix et WordPress, ZIFEK est la seule plateforme qui combine vraiment tout. Mes clients adorent la simplicité.",
      image: 'https://readdy.ai/api/search-image?query=Professional%20headshot%20of%20West%20African%20male%20tech%20entrepreneur%20with%20genuine%20smile%20clean%20studio%20background%20warm%20lighting%20modern%20style%20approachable%20professional%20vibe&width=200&height=200&seq=zifek-testimonial-03-v2&orientation=squarish',
    },
    {
      name: 'Samira M.',
      role: 'Artisane, MainsDorées',
      text: "Je ne connais rien en informatique mais j'ai créé mon site toute seule grâce à ZIFEK. L'IA m'a guidée pas à pas. C'est magique !",
      image: 'https://readdy.ai/api/search-image?query=Professional%20portrait%20of%20female%20artisan%20smiling%20warmly%20clean%20neutral%20background%20soft%20natural%20lighting%20authentic%20friendly%20expression%20creative%20professional%20style%20studio%20photography&width=200&height=200&seq=zifek-testimonial-04-v2&orientation=squarish',
    },
  ];

  return (
    <section
      id="testimonials"
      ref={sectionRef as React.LegacyRef<HTMLElement>}
      className="relative py-20 md:py-28 bg-background-100"
    >
      <div className="w-full px-4 md:px-6 lg:px-10 max-w-6xl mx-auto">
        <div
          className={`text-center mb-12 md:mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <span className="inline-block px-3 py-1.5 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold mb-4">
            Témoignages
          </span>
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold font-heading text-foreground-950 mb-3">
            Ils ont choisi ZIFEK
          </h2>
          <p className="text-foreground-500 text-sm md:text-base max-w-xl mx-auto">
            Des milliers d'entrepreneurs ont déjà lancé leur business avec ZIFEK.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className={`rounded-xl bg-background-50 border border-background-200/70 p-6 md:p-8 hover:-translate-y-1 transition-all duration-300 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
              style={{ transitionDelay: `${i * 100}ms`, transitionDuration: '600ms' }}
            >
              <i className="ri-double-quotes-l text-2xl text-primary-200 block mb-4"></i>
              <p className="text-sm md:text-base text-foreground-600 leading-relaxed mb-6">
                {t.text}
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-background-200 flex-shrink-0">
                  <img src={t.image} alt={t.name} className="w-full h-full object-cover object-top" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground-950">
                    {t.name}
                  </div>
                  <div className="text-xs text-foreground-500">
                    {t.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}