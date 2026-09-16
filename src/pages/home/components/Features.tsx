import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useHomepageContent } from '@/hooks/useHomepageContent';

function TitleWithBreaks({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i, arr) => (
        <span key={i}>
          {line}
          {i < arr.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}

export default function Features() {
  const { content } = useHomepageContent();
  const features = content.features;
  const { ref: sectionRef, isVisible } = useScrollReveal(0.1);

  const colorClass = (color: string) => {
    switch (color) {
      case 'accent':
        return { bg: 'bg-accent-100 text-accent-700', border: 'group-hover:border-accent-300/50' };
      case 'secondary':
        return { bg: 'bg-secondary-100 text-secondary-700', border: 'group-hover:border-secondary-300/50' };
      default:
        return { bg: 'bg-primary-100 text-primary-700', border: 'group-hover:border-primary-300/50' };
    }
  };

  return (
    <section
      id="features"
      ref={sectionRef as React.LegacyRef<HTMLElement>}
      className="relative py-16 md:py-24 bg-background-50"
    >
      <div className="w-full px-4 md:px-6 lg:px-10 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6 mb-10 md:mb-14">
          <div className="max-w-lg">
            {features.badge && (
              <span className="inline-block px-3 py-1.5 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold mb-5">
                {features.badge}
              </span>
            )}
            <h2 className="text-3xl md:text-5xl font-bold font-heading text-foreground-950 leading-[1.1]">
              <TitleWithBreaks text={features.title} />
            </h2>
          </div>
          {features.subtitle && (
            <p className="text-foreground-500 text-base md:text-lg max-w-md leading-relaxed lg:pb-1">
              {features.subtitle}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {features.items.map((feature, index) => {
            const colors = colorClass(feature.color);
            return (
              <div
                key={index}
                className={`group p-6 md:p-7 rounded-lg bg-background-50 border border-background-200/70 ${colors.border} hover:-translate-y-1 transition-all duration-300 cursor-pointer ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}
                style={{ transitionDelay: `${index * 80}ms`, transitionDuration: '600ms' }}
              >
                <div
                  className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110`}
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
            );
          })}
        </div>
      </div>
    </section>
  );
}