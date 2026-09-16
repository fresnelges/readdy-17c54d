import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useHomepageContent } from '@/hooks/useHomepageContent';

export default function Pricing() {
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(false);
  const { content } = useHomepageContent();
  const pricing = content.pricing;
  const { ref: sectionRef, isVisible } = useScrollReveal(0.1);

  return (
    <section
      id="pricing"
      ref={sectionRef as React.LegacyRef<HTMLElement>}
      className="relative py-20 md:py-28 bg-background-50"
    >
      <div className="w-full px-4 md:px-6 lg:px-10 max-w-7xl mx-auto">
        <div className="text-center mb-14 md:mb-20">
          {pricing.badge && (
            <span className="inline-block px-3 py-1.5 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold mb-5">
              {pricing.badge}
            </span>
          )}
          <h2 className="text-3xl md:text-5xl font-bold font-heading text-foreground-950 mb-4">
            {pricing.title}
          </h2>
          {pricing.subtitle && (
            <p className="text-foreground-500 text-base md:text-lg max-w-xl mx-auto mb-8">
              {pricing.subtitle}
            </p>
          )}

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 p-1 rounded-full bg-background-100 border border-background-200/70">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                !isAnnual
                  ? 'bg-foreground-950 text-background-50'
                  : 'text-foreground-600 hover:text-foreground-950'
              }`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                isAnnual
                  ? 'bg-foreground-950 text-background-50'
                  : 'text-foreground-600 hover:text-foreground-950'
              }`}
            >
              Annuel
              <span className="text-xs font-semibold bg-accent-500 text-background-50 px-2 py-0.5 rounded-full">
                -17%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 max-w-4xl mx-auto">
          {pricing.items.map((plan, index) => (
            <div
              key={index}
              className={`rounded-xl p-6 md:p-7 border flex flex-col transition-all duration-500 ${
                plan.highlighted
                  ? 'bg-primary-500 border-primary-500 scale-[1.02] md:scale-105 relative z-10 shadow-xl shadow-primary-500/15'
                  : 'bg-background-50 border-background-200/70 hover:border-background-300/70'
              } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${index * 120}ms` }}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-foreground-950 text-background-50 text-xs font-semibold rounded-full whitespace-nowrap shadow-lg">
                  Le plus populaire
                </span>
              )}

              <h3
                className={`text-lg font-bold font-heading mb-1 ${
                  plan.highlighted ? 'text-background-50' : 'text-foreground-950'
                }`}
              >
                {plan.name}
              </h3>
              <p
                className={`text-xs mb-5 ${
                  plan.highlighted ? 'text-background-50/70' : 'text-foreground-500'
                }`}
              >
                {plan.description}
              </p>

              <div className="mb-6">
                <span
                  className={`text-4xl md:text-5xl font-bold font-heading ${
                    plan.highlighted ? 'text-background-50' : 'text-foreground-950'
                  }`}
                >
                  {isAnnual && plan.annualPrice !== '0' ? plan.annualPrice : plan.price}
                </span>
                <span
                  className={`text-lg font-medium ${
                    plan.highlighted ? 'text-background-50/80' : 'text-foreground-600'
                  }`}
                >
                  {plan.currency}
                </span>
                <span
                  className={`text-sm ${
                    plan.highlighted ? 'text-background-50/60' : 'text-foreground-500'
                  }`}
                >
                  {plan.period}
                </span>
                {isAnnual && plan.annualPrice !== '0' && (
                  <span className={`block text-xs mt-1 ${plan.highlighted ? 'text-background-50/50' : 'text-foreground-400'}`}>
                    facturé annuellement
                  </span>
                )}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature, fi) => (
                  <li key={fi} className="flex items-start gap-2.5">
                    <i
                      className={`ri-check-line mt-0.5 flex-shrink-0 ${
                        plan.highlighted ? 'text-background-50' : 'text-accent-500'
                      }`}
                    ></i>
                    <span
                      className={`text-sm ${
                        plan.highlighted ? 'text-background-50/90' : 'text-foreground-600'
                      }`}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => navigate('/register')}
                className={`w-full py-3 rounded-full text-sm font-semibold whitespace-nowrap cursor-pointer transition-all ${
                  plan.highlighted
                    ? 'bg-background-50 text-primary-600 hover:bg-background-100'
                    : 'bg-foreground-950 text-background-50 hover:bg-foreground-800'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}