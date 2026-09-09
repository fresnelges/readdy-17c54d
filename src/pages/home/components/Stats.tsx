import { useScrollReveal } from '@/hooks/useScrollReveal';

export default function Stats() {
  const { ref: sectionRef, isVisible } = useScrollReveal(0.1);

  const stats = [
    { value: '12 000', suffix: '+', label: 'Entrepreneurs actifs' },
    { value: '45 000', suffix: '+', label: 'Boutiques créées' },
    { value: '98', suffix: '%', label: 'Satisfaction client' },
    { value: '3', suffix: ' min', label: 'Temps moyen de création' },
  ];

  return (
    <section
      ref={sectionRef as React.LegacyRef<HTMLElement>}
      className="relative py-12 md:py-16 bg-background-50 border-y border-background-200/50"
    >
      <div className="w-full px-4 md:px-6 lg:px-10 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {stats.map((stat, i) => (
            <div
              key={i}
              className={`text-center transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="text-2xl md:text-4xl font-bold font-heading text-primary-500 mb-1">
                {stat.value}
                <span className="text-xl md:text-2xl">{stat.suffix}</span>
              </div>
              <p className="text-foreground-500 text-xs md:text-sm">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}