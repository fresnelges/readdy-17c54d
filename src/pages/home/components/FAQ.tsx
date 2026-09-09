import { useState } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const { ref: sectionRef, isVisible } = useScrollReveal(0.1);

  const faqs = [
    {
      question: 'Est-ce que je peux vraiment créer un site sans savoir coder ?',
      answer:
        'Absolument ! ZIFEK est conçu pour que n\u2019importe qui, même sans connaissance technique, puisse créer un site professionnel. Notre éditeur visuel et notre IA vous guident pas à pas.',
    },
    {
      question: 'Quels types de paiement puis-je accepter ?',
      answer:
        'ZIFEK supporte Stripe, PayPal, CMI (Maroc), PayDunya, Flutterwave et le paiement à la livraison. Activez une ou plusieurs passerelles selon vos besoins.',
    },
    {
      question: 'Puis-je avoir mon propre nom de domaine ?',
      answer:
        'Oui ! Chaque boutique reçoit un sous-domaine gratuit (maboutique.zifek.fr) et vous pouvez également connecter votre propre domaine personnalisé.',
    },
    {
      question: "Comment fonctionne l\u2019IA de ZIFEK ?",
      answer:
        "Décrivez simplement votre activité et l\u2019IA génère automatiquement votre site complet : pages, couleurs, logo, services, descriptions et structure SEO.",
    },
    {
      question: 'Est-ce que mes données sont en sécurité ?',
      answer:
        'La sécurité est notre priorité. Toutes les données sont chiffrées, les paiements via des passerelles PCI-DSS, et sauvegardes automatiques quotidiennes.',
    },
    {
      question: 'Y a-t-il des frais de transaction sur mes ventes ?',
      answer:
        'ZIFEK ne prélève aucun frais de transaction sur vos ventes. Vous ne payez que les frais standards de votre passerelle de paiement.',
    },
    {
      question: 'Puis-je migrer mon site existant vers ZIFEK ?',
      answer:
        'Oui, nous proposons un service de migration assistée pour Shopify, WooCommerce, Wix et autres plateformes. Notre équipe vous accompagne.',
    },
  ];

  return (
    <section
      id="faq"
      ref={sectionRef as React.LegacyRef<HTMLElement>}
      className="relative py-20 md:py-28 bg-background-100"
    >
      <div className="w-full px-4 md:px-6 lg:px-10 max-w-3xl mx-auto">
        <div className="text-center mb-14 md:mb-20">
          <span className="inline-block px-3 py-1.5 rounded-full bg-secondary-100 text-secondary-700 text-xs font-semibold mb-5">
            FAQ
          </span>
          <h2 className="text-3xl md:text-5xl font-bold font-heading text-foreground-950 mb-4">
            Questions fréquentes
          </h2>
          <p className="text-foreground-500 text-base md:text-lg max-w-xl mx-auto">
            Tout ce que vous devez savoir sur ZIFEK.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
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
                    {faq.question}
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
                    <p className="text-foreground-500 text-sm leading-relaxed">{faq.answer}</p>
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