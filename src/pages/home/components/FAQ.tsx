import { useState } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useHomepageContent } from '@/hooks/useHomepageContent';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const { content } = useHomepageContent();
  const faq = content.faq;
  const { ref: sectionRef, isVisible } = useScrollReveal(0.1);

  return (
    <section
      id="faq"
      ref={sectionRef as React.LegacyRef<HTMLElement>}
      className="relative py-20 md:py-28 bg-background-100"
    >
      <div className="w-full px-4 md:px-6 lg:px-10 max-w-3xl mx-auto">
        <div className="text-center mb-14 md:mb-20">
          {faq.badge && (
            <span className="inline-block px-3 py-1.5 rounded-full bg-secondary-100 text-secondary-700 text-xs font-semibold mb-5">
              {faq.badge}
            </span>
          )}
          <h2 className="text-3xl md:text-5xl font-bold font-heading text-foreground-950 mb-4">
            {faq.title}
          </h2>
          {faq.subtitle && (
            <p className="text-foreground-500 text-base md:text-lg max-w-xl mx-auto">
              {faq.subtitle}
            </p>
          )}
        </div>

        <div className="space-y-3">
          {faq.items.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className={`rounded-xl bg-background-50 border border-background-200/70 overflow-hidden transition-all duration-300 ${
                  isOpen ? 'shadow-sm' : ''
                } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ transitionDelay: `${index * 60}ms`, transitionDuration: '500ms' }}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between p-5 md:p-6 text-left cursor-pointer"
                >
                  <span className="text-sm md:text-base font-semibold text-foreground-950 pr-6">
                    {item.question}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                      isOpen ? 'bg-primary-100' : 'bg-background-100'
                    }`}
                  >
                    <i
                      className={`ri-add-line text-lg transition-transform duration-300 ${
                        isOpen ? 'text-primary-600 rotate-45' : 'text-foreground-400'
                      }`}
                    ></i>
                  </div>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-out ${
                    isOpen ? 'max-h-96' : 'max-h-0'
                  }`}
                >
                  <div className="px-5 md:px-6 pb-5 md:pb-6">
                    <p className="text-foreground-500 text-sm leading-relaxed">{item.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}