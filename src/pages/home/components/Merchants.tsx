import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useScrollReveal } from '@/hooks/useScrollReveal';

interface Merchant {
  id: number;
  user_name: string;
  name: string;
  nomcommerce: string;
  image: string;
  description: string;
  domaine: string | null;
}

export default function Merchants() {
  const { ref: sectionRef, isVisible } = useScrollReveal(0.1);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartRef = useRef(0);
  const touchEndRef = useRef(0);

  useEffect(() => {
    const fetchMerchants = async () => {
      try {
        const { data: merchantData, error: merchantError } = await supabase
          .from('users')
          .select('id, user_name, name, nomcommerce, image, description')
          .eq('typecompte', 2)
          .eq('active', 1)
          .order('id', { ascending: false });

        if (merchantError) throw merchantError;

        const merchantsWithDomains = await Promise.all(
          (merchantData || []).map(async (m) => {
            let domaine: string | null = null;
            try {
              const { data: domainData } = await supabase
                .from('websitedomain')
                .select('domaine')
                .eq('user_id', m.id)
                .maybeSingle();
              domaine = domainData?.domaine || null;
            } catch {
              domaine = null;
            }
            return { ...m, domaine };
          })
        );

        setMerchants(merchantsWithDomains);
        setLoading(false);
      } catch {
        setError(true);
        setLoading(false);
      }
    };

    fetchMerchants();
  }, []);

  const totalSlides = Math.ceil(merchants.length / 4);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  useEffect(() => {
    if (totalSlides <= 1 || isPaused) return;
    autoPlayRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }, 4000);
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [totalSlides, isPaused]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndRef.current = e.touches[0].clientX;
  };
  const handleTouchEnd = () => {
    const diff = touchStartRef.current - touchEndRef.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
  };

  if (loading) {
    return (
      <section className="relative py-20 md:py-28 bg-background-100">
        <div className="w-full px-4 md:px-6 lg:px-10 max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block px-3 py-1.5 rounded-full bg-accent-100 text-accent-700 text-xs font-semibold mb-5">
              Nos marchands
            </div>
            <h2 className="text-3xl md:text-5xl font-bold font-heading text-foreground-950 mb-4">
              Ils font confiance à ZIFEK
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="rounded-lg bg-background-50 border border-background-200/70 p-6 animate-pulse">
                <div className="w-16 h-16 rounded-full bg-background-200 mx-auto mb-4" />
                <div className="h-4 w-2/3 bg-background-200 rounded mx-auto mb-2" />
                <div className="h-3 w-1/2 bg-background-200 rounded mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || merchants.length === 0) {
    return null;
  }

  const visibleMerchants = merchants.slice(currentIndex * 4, currentIndex * 4 + 4);

  return (
    <section
      id="merchants"
      ref={sectionRef as React.LegacyRef<HTMLElement>}
      className="relative py-20 md:py-28 bg-background-100"
    >
      <div className="w-full px-4 md:px-6 lg:px-10 max-w-7xl mx-auto">
        <div
          className={`text-center mb-14 md:mb-20 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <span className="inline-block px-3 py-1.5 rounded-full bg-accent-100 text-accent-700 text-xs font-semibold mb-5">
            Nos marchands
          </span>
          <h2 className="text-3xl md:text-5xl font-bold font-heading text-foreground-950 mb-4">
            Ils font confiance à ZIFEK
          </h2>
          <p className="text-foreground-500 text-base md:text-lg max-w-xl mx-auto">
            Découvrez les boutiques actives qui ont choisi ZIFEK pour développer leur activité.
          </p>
        </div>

        <div
          className="relative"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 transition-all duration-600 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
            style={{ transitionDuration: '600ms' }}
          >
            {visibleMerchants.map((merchant) => {
              const shopUrl = merchant.domaine
                ? `https://${merchant.domaine}`
                : null;

              return (
                <div
                  key={merchant.id}
                  className="group rounded-lg bg-background-50 border border-background-200/70 p-6 md:p-7 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col items-center text-center"
                >
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-gradient-to-br from-accent-100 to-accent-200/50 flex items-center justify-center mb-4 flex-shrink-0">
                    {merchant.image ? (
                      <img
                        src={merchant.image}
                        alt={merchant.nomcommerce}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl md:text-3xl font-bold font-heading text-accent-600">
                        {(merchant.nomcommerce || merchant.name || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm md:text-base font-semibold font-heading text-foreground-950 mb-1 group-hover:text-accent-600 transition-colors">
                    {merchant.nomcommerce}
                  </h3>

                  <p className="text-xs text-foreground-500 mb-4">
                    {merchant.name}
                  </p>

                  {shopUrl ? (
                    <a
                      href={shopUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer no-underline bg-accent-500/10 text-accent-700 hover:bg-accent-500/20"
                    >
                      Visiter la boutique
                      <i className="ri-arrow-right-up-line text-xs"></i>
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap bg-background-100 text-foreground-400">
                      <i className="ri-store-line text-xs"></i>
                      Boutique Zifek
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {totalSlides > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute -left-4 md:-left-6 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full cursor-pointer bg-background-50 border border-background-200/70 text-foreground-600 hover:bg-background-100 hover:text-foreground-950 hover:border-background-300/60 transition-all shadow-sm z-10"
                aria-label="Précédent"
              >
                <i className="ri-arrow-left-s-line text-lg md:text-xl"></i>
              </button>
              <button
                onClick={handleNext}
                className="absolute -right-4 md:-right-6 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full cursor-pointer bg-background-50 border border-background-200/70 text-foreground-600 hover:bg-background-100 hover:text-foreground-950 hover:border-background-300/60 transition-all shadow-sm z-10"
                aria-label="Suivant"
              >
                <i className="ri-arrow-right-s-line text-lg md:text-xl"></i>
              </button>
            </>
          )}
        </div>

        {totalSlides > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-2 h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  i === currentIndex
                    ? 'bg-accent-500 w-6'
                    : 'bg-background-200 hover:bg-background-300'
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}