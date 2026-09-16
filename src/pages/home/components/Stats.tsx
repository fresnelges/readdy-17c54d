import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useHomepageContent } from '@/hooks/useHomepageContent';

export default function Stats() {
  const { content } = useHomepageContent();
  const stats = content.stats;
  const { ref: sectionRef, isVisible } = useScrollReveal(0.1);

  return (
    <section
      ref={sectionRef as React.LegacyRef<HTMLElement>}
      className="relative py-12 md:py-16 bg-background-50 border-y border-background-200/50"
    >
      <div className="w-full px-4 md:px-6 lg:px-10 max-w-7xl mx-auto">
        {(stats.title || stats.subtitle) && (
          <div className="text-center mb-8 md:mb-10">
            {stats.badge && (
              <span className="inline-block px-3 py-1.5 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold mb-4">
                {stats.badge}
              </span>
            )}
            {stats.title && (
              <h2 className="text-2xl md:text-4xl font-bold font-heading text-foreground-950 mb-2">
                {stats.title}
              </h2>
            )}
            {stats.subtitle && (
              <p className="text-foreground-500 text-sm md:text-base max-w-xl mx-auto">
                {stats.subtitle}
              </p>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {stats.items.map((stat, i) => (
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