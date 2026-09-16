import { useNavigate } from 'react-router-dom';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useHomepageContent } from '@/hooks/useHomepageContent';

export default function Hero() {
  const navigate = useNavigate();
  const { content } = useHomepageContent();
  const hero = content.hero;
  const { ref: heroRef, isVisible } = useScrollReveal(0.05);

  return (
    <section
      ref={heroRef as React.LegacyRef<HTMLElement>}
      className="relative w-full min-h-[85vh] flex items-center overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src={hero.backgroundImage}
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
          {hero.badge && (
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 mb-6 md:mb-8">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-400"></span>
              </span>
              <span className="text-white/80 text-xs md:text-sm font-medium">
                {hero.badge}
              </span>
            </div>
          )}

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-heading text-white leading-[1.1] mb-5 md:mb-6">
            {hero.titleLine1}
            <br className="hidden sm:block" />
            {hero.titleLine2Prefix && `${hero.titleLine2Prefix} `}
            <span className="text-accent-300">{hero.titleHighlight}</span>
          </h1>

          <p className="text-white/60 text-sm md:text-base lg:text-lg max-w-2xl mx-auto mb-8 md:mb-10 leading-relaxed">
            {hero.subtitle}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mb-10 md:mb-12">
            <button
              onClick={() => navigate('/register')}
              className="px-6 md:px-8 py-3.5 md:py-4 bg-white text-foreground-950 rounded-full text-sm md:text-base font-semibold whitespace-nowrap hover:bg-white/90 transition-all cursor-pointer flex items-center gap-2 group w-full sm:w-auto justify-center"
            >
              {hero.primaryCta}
              <i className="ri-arrow-right-line group-hover:translate-x-1 transition-transform"></i>
            </button>
            {hero.secondaryCta && (
              <button
                onClick={() => {
                  const el = document.getElementById('features');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-6 md:px-8 py-3.5 md:py-4 border border-white/25 text-white rounded-full text-sm md:text-base font-medium whitespace-nowrap hover:bg-white/10 transition-all cursor-pointer flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <i className="ri-play-circle-line text-lg"></i>
                {hero.secondaryCta}
              </button>
            )}
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-3 md:gap-4">
            {hero.avatars.length > 0 && (
              <div className="flex -space-x-2">
                {hero.avatars.map((src, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 md:w-9 md:h-9 rounded-full border-2 border-white/30 overflow-hidden bg-background-200"
                  >
                    <img src={src} alt="" className="w-full h-full object-cover object-top" />
                  </div>
                ))}
              </div>
            )}
            {hero.socialProofLabel && (
              <p className="text-white/50 text-xs md:text-sm">
                <strong className="text-white font-semibold">{hero.socialProofValue}</strong>{' '}
                {hero.socialProofLabel}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-background-50 to-transparent"></div>
    </section>
  );
}