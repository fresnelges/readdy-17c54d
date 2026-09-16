import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useHomepageContent } from '@/hooks/useHomepageContent';

export default function HowItWorks() {
  const { content } = useHomepageContent();
  const steps = content.how_it_works;
  const { ref: sectionRef, isVisible } = useScrollReveal(0.15);

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'primary':
        return {
          iconBg: 'bg-primary-100',
          iconText: 'text-primary-600',
          number: 'text-primary-200',
          border: 'border-primary-200/60',
          hoverBorder: 'group-hover:border-primary-300/70',
          dot: 'bg-primary-500',
        };
      case 'accent':
        return {
          iconBg: 'bg-accent-100',
          iconText: 'text-accent-600',
          number: 'text-accent-200',
          border: 'border-accent-200/60',
          hoverBorder: 'group-hover:border-accent-300/70',
          dot: 'bg-accent-500',
        };
      case 'secondary':
        return {
          iconBg: 'bg-secondary-100',
          iconText: 'text-secondary-600',
          number: 'text-secondary-200',
          border: 'border-secondary-200/60',
          hoverBorder: 'group-hover:border-secondary-300/70',
          dot: 'bg-secondary-500',
        };
      default:
        return {
          iconBg: 'bg-primary-100',
          iconText: 'text-primary-600',
          number: 'text-primary-200',
          border: 'border-primary-200/60',
          hoverBorder: 'group-hover:border-primary-300/70',
          dot: 'bg-primary-500',
        };
    }
  };

  return (
    <section
      id="how-it-works"
      ref={sectionRef as React.LegacyRef<HTMLElement>}
      className="relative py-20 md:py-28 bg-background-50 overflow-hidden"
    >
      <div className="w-full px-4 md:px-6 lg:px-10 max-w-7xl mx-auto relative z-10">
        <div
          className={`text-center mb-14 md:mb-20 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          {steps.badge && (
            <span className="inline-block px-3 py-1.5 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold mb-5">
              {steps.badge}
            </span>
          )}
          <h2 className="text-3xl md:text-5xl font-bold font-heading text-foreground-950 mb-4">
            {steps.title}
          </h2>
          {steps.subtitle && (
            <p className="text-foreground-500 text-base md:text-lg max-w-xl mx-auto">
              {steps.subtitle}
            </p>
          )}
        </div>

        <div className="relative">
          {/* connecting line - desktop only */}
          {steps.items.length > 1 && (
            <div className="hidden lg:block absolute top-[72px] left-[calc(16.67%+40px)] right-[calc(16.67%+40px)] h-[2px]">
              <div className="w-full h-full bg-gradient-to-r from-primary-200 via-accent-200 to-secondary-200 rounded-full" />
            </div>
          )}

          {/* connecting dots */}
          {steps.items.length > 2 && (
            <>
              <div className="hidden lg:flex absolute top-[68px] left-[33.33%] -translate-x-1/2 w-3 h-3 rounded-full bg-primary-400 z-10" />
              <div className="hidden lg:flex absolute top-[68px] left-[66.66%] -translate-x-1/2 w-3 h-3 rounded-full bg-accent-400 z-10" />
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 lg:gap-10">
            {steps.items.map((step, index) => {
              const colors = getColorClasses(step.color);
              return (
                <div
                  key={step.number}
                  className={`group relative rounded-2xl bg-background-50 border ${colors.border} ${colors.hoverBorder} overflow-hidden hover:-translate-y-1.5 transition-all duration-400 cursor-default ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  }`}
                  style={{ transitionDelay: `${index * 150}ms`, transitionDuration: '600ms' }}
                >
                  {/* illustration image */}
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img
                      src={step.image}
                      alt={step.title}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background-50 via-background-50/20 to-transparent" />
                  </div>

                  <div className="p-6 md:p-8 relative">
                    {/* step number - large background */}
                    <div className="absolute top-3 right-4 md:top-4 md:right-6">
                      <span className={`text-5xl md:text-6xl font-bold font-heading ${colors.number} select-none`}>
                        {step.number}
                      </span>
                    </div>

                    {/* icon */}
                    <div
                      className={`relative z-10 w-12 h-12 md:w-14 md:h-14 rounded-xl ${colors.iconBg} flex items-center justify-center mb-5 transition-transform duration-400 group-hover:scale-105`}
                    >
                      <i className={`${step.icon} text-xl md:text-2xl ${colors.iconText}`}></i>
                    </div>

                    {/* progress dot - mobile only */}
                    <div className="md:hidden absolute top-4 left-4 flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                      {index < steps.items.length - 1 && (
                        <div className="w-8 h-[2px] bg-background-200 rounded-full" />
                      )}
                    </div>

                    {/* content */}
                    <div className="relative z-10">
                      <h3 className="text-lg md:text-xl font-bold font-heading text-foreground-950 mb-3 group-hover:text-foreground-900 transition-colors">
                        {step.title}
                      </h3>
                      <p className="text-sm md:text-base text-foreground-500 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* bottom accent line */}
                  <div className={`absolute bottom-0 left-6 right-6 h-[3px] rounded-full bg-gradient-to-r ${step.color === 'primary' ? 'from-primary-400/50 to-transparent' : step.color === 'accent' ? 'from-accent-400/50 to-transparent' : 'from-secondary-400/50 to-transparent'} opacity-0 group-hover:opacity-100 transition-opacity duration-400`} />
                </div>
              );
            })}
          </div>
        </div>

        {/* bottom CTA hint */}
        {steps.footerHint && (
          <div
            className={`text-center mt-12 md:mt-16 transition-all duration-700 delay-500 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <p className="text-foreground-400 text-sm flex items-center justify-center gap-2">
              <i className="ri-time-line"></i>
              {steps.footerHint}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}