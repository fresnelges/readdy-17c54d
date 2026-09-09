import { useNavigate } from 'react-router-dom';
import { useScrollReveal } from '@/hooks/useScrollReveal';

export default function CTA() {
  const navigate = useNavigate();
  const { ref: sectionRef, isVisible } = useScrollReveal(0.1);

  return (
    <section
      ref={sectionRef as React.LegacyRef<HTMLElement>}
      className="relative py-16 md:py-24 bg-background-50"
    >
      <div className="w-full px-4 md:px-6 lg:px-10 max-w-5xl mx-auto">
        <div
          className={`relative rounded-2xl overflow-hidden bg-foreground-950 transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="absolute inset-0 opacity-30">
            <img
              src="https://readdy.ai/api/search-image?query=Dark%20warm%20abstract%20subtle%20gradient%20with%20soft%20terracotta%20and%20charcoal%20tones%20minimal%20texture%20modern%20elegant%20digital%20art%20low%20contrast%20no%20text%20no%20people&width=1400&height=500&seq=zifek-cta-clean-v1&orientation=landscape"
              alt=""
              className="w-full h-full object-cover object-top"
            />
          </div>

          <div className="relative z-10 px-6 py-12 md:px-16 md:py-20 text-center">
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold font-heading text-white leading-[1.15] mb-4 max-w-2xl mx-auto">
              Prêt à lancer{' '}
              <span className="text-accent-300">votre business</span> en ligne ?
            </h2>
            <p className="text-white/60 text-sm md:text-base max-w-lg mx-auto mb-8 md:mb-10">
              Rejoignez plus de 12 000 entrepreneurs qui ont déjà choisi
              ZIFEK. Créez votre site gratuitement, sans engagement.
            </p>
            <button
              onClick={() => navigate('/register')}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-foreground-950 rounded-full text-base font-semibold whitespace-nowrap hover:bg-white/90 transition-all cursor-pointer group"
            >
              Créer mon site gratuitement
              <i className="ri-arrow-right-line group-hover:translate-x-1 transition-transform"></i>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}