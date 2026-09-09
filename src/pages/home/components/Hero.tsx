import { useNavigate } from 'react-router-dom';
import { useScrollReveal } from '@/hooks/useScrollReveal';

export default function Hero() {
  const navigate = useNavigate();
  const { ref: heroRef, isVisible } = useScrollReveal(0.05);

  return (
    <section
      ref={heroRef as React.LegacyRef<HTMLElement>}
      className="relative w-full min-h-[85vh] flex items-center overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src="https://readdy.ai/api/search-image?query=Dark%20warm%20abstract%20gradient%20with%20deep%20charcoal%20and%20subtle%20terracotta%20tones%20soft%20flowing%20organic%20shapes%20minimal%20modern%20elegant%20digital%20art%20low%20contrast%20atmospheric%20depth%20no%20text%20no%20people&width=1920&height=1080&seq=zifek-hero-clean-2026&orientation=landscape"
          alt=""
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-foreground-950/65"></div>
      </div>

      <div className="relative z-10 w-full px-4 md:px-6 lg:px-10 pt-24 md:pt-32 pb-16 md:pb-20">
        <div
          className={`max-w-4xl mx-auto text-center transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 mb-6 md:mb-8">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-400"></span>
            </span>
            <span className="text-white/80 text-xs md:text-sm font-medium">
              Lancement officiel — Offre early adopter
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-heading text-white leading-[1.1] mb-5 md:mb-6">
            Votre business en ligne,
            <br className="hidden sm:block" />
            en{' '}
            <span className="text-accent-300">quelques minutes</span>
          </h1>

          <p className="text-white/60 text-sm md:text-base lg:text-lg max-w-2xl mx-auto mb-8 md:mb-10 leading-relaxed">
            ZIFEK combine la puissance de Shopify, Wix et Fiverr dans une seule
            plateforme boostée à l'IA. Créez votre site e-commerce, vitrine, ou marketplace — sans code.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mb-10 md:mb-12">
            <button
              onClick={() => navigate('/register')}
              className="px-6 md:px-8 py-3.5 md:py-4 bg-white text-foreground-950 rounded-full text-sm md:text-base font-semibold whitespace-nowrap hover:bg-white/90 transition-all cursor-pointer flex items-center gap-2 group w-full sm:w-auto justify-center"
            >
              Commencer gratuitement
              <i className="ri-arrow-right-line group-hover:translate-x-1 transition-transform"></i>
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('features');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-6 md:px-8 py-3.5 md:py-4 border border-white/25 text-white rounded-full text-sm md:text-base font-medium whitespace-nowrap hover:bg-white/10 transition-all cursor-pointer flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              <i className="ri-play-circle-line text-lg"></i>
              Découvrir ZIFEK
            </button>
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-3 md:gap-4">
            <div className="flex -space-x-2">
              {[
                'https://readdy.ai/api/search-image?query=Professional%20headshot%20portrait%20of%20young%20African%20woman%20entrepreneur%20with%20warm%20friendly%20smile%20clean%20neutral%20background%20soft%20lighting%20modern%20business%20casual%20style%20minimal%20studio%20photography&width=80&height=80&seq=zifek-avatar-01-v2&orientation=squarish',
                'https://readdy.ai/api/search-image?query=Professional%20headshot%20portrait%20of%20female%20business%20owner%20with%20clean%20neutral%20background%20warm%20lighting%20confident%20expression%20modern%20style%20minimal%20studio%20photography&width=80&height=80&seq=zifek-avatar-02-v2&orientation=squarish',
                'https://readdy.ai/api/search-image?query=Professional%20headshot%20portrait%20of%20Middle%20Eastern%20businessman%20with%20clean%20neutral%20background%20warm%20lighting%20friendly%20smile%20modern%20business%20attire%20minimal%20studio%20photography&width=80&height=80&seq=zifek-avatar-03-v2&orientation=squarish',
                'https://readdy.ai/api/search-image?query=Professional%20headshot%20portrait%20of%20creative%20female%20designer%20with%20clean%20neutral%20background%20warm%20lighting%20approachable%20expression%20modern%20casual%20style%20minimal%20studio%20photography&width=80&height=80&seq=zifek-avatar-04-v2&orientation=squarish',
              ].map((src, i) => (
                <div
                  key={i}
                  className="w-8 h-8 md:w-9 md:h-9 rounded-full border-2 border-white/30 overflow-hidden bg-background-200"
                >
                  <img src={src} alt="" className="w-full h-full object-cover object-top" />
                </div>
              ))}
            </div>
            <p className="text-white/50 text-xs md:text-sm">
              <strong className="text-white font-semibold">+12 000</strong> entrepreneurs nous font confiance
            </p>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-background-50 to-transparent"></div>
    </section>
  );
}