import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useHomepageContent } from '@/hooks/useHomepageContent';

export default function Testimonials() {
  const { content } = useHomepageContent();
  const testimonials = content.testimonials;
  const { ref: sectionRef, isVisible } = useScrollReveal(0.1);

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
          {testimonials.badge && (
            <span className="inline-block px-3 py-1.5 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold mb-4">
              {testimonials.badge}
            </span>
          )}
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold font-heading text-foreground-950 mb-3">
            {testimonials.title}
          </h2>
          {testimonials.subtitle && (
            <p className="text-foreground-500 text-sm md:text-base max-w-xl mx-auto">
              {testimonials.subtitle}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {testimonials.items.map((t, i) => (
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