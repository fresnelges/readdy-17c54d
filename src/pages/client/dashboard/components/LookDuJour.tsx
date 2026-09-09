import { Link } from 'react-router-dom';
import type { TodayOutfit } from '@/hooks/useOutfitReminders';
import { useWeather } from '@/hooks/useWeather';

const OCCASION_LABELS: Record<string, string> = {
  casual: 'Casual',
  travail: 'Travail',
  soiree: 'Soirée',
  sport: 'Sport',
  plage: 'Plage',
  formel: 'Formel',
};

function getOccasionLabel(occasion: string): string {
  return OCCASION_LABELS[occasion] || occasion;
}

interface LookDuJourProps {
  outfit: TodayOutfit | null;
  loading: boolean;
}

function WeatherSkeleton() {
  return (
    <div className="flex items-center gap-2 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-background-200"></div>
      <div className="flex flex-col gap-1">
        <div className="w-16 h-3 bg-background-200 rounded"></div>
        <div className="w-20 h-2.5 bg-background-200 rounded"></div>
      </div>
    </div>
  );
}

export default function LookDuJour({ outfit, loading }: LookDuJourProps) {
  const { weather, loading: weatherLoading, error: weatherError } = useWeather();

  const today = new Date();
  const dayLabel = today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="bg-background-50 border border-background-200/30 rounded-xl overflow-hidden mb-6">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 md:px-5 py-3.5 bg-background-100/40 border-b border-background-200/30">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-foreground-100 flex items-center justify-center">
            <i className="ri-sun-line text-foreground-600 text-base"></i>
          </div>
          <div>
            <h3 className="text-sm font-bold font-heading text-foreground-950">
              Look du jour
            </h3>
            <p className="text-[11px] text-foreground-500 capitalize">{dayLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {weatherLoading ? (
            <WeatherSkeleton />
          ) : weatherError ? (
            <div className="flex items-center gap-1.5 text-[11px] text-foreground-400">
              <i className="ri-cloud-off-line"></i>
              <span>Météo indisponible</span>
            </div>
          ) : weather ? (
            <div className="flex items-center gap-2.5 bg-background-50 border border-background-200/30 rounded-lg px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
                <i className={`${weather.icon} text-amber-500 text-sm`}></i>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-foreground-900">{weather.temperature}°C</span>
                  <span className="text-[10px] text-foreground-400">
                    {weather.low}° / {weather.high}°
                  </span>
                </div>
                <p className="text-[11px] text-foreground-500 leading-tight">{weather.condition}</p>
              </div>
            </div>
          ) : null}

          <Link
            to="/mon-planning"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-foreground-500 hover:text-foreground-700 hover:bg-background-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-calendar-2-line"></i>
            Planning
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <i className="ri-loader-4-line animate-spin text-lg text-foreground-400"></i>
          </div>
        ) : outfit ? (
          <div>
            {weather && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-amber-50/50 border border-amber-100/30 rounded-lg">
                <i className={`${weather.icon} text-amber-500 text-sm`}></i>
                <p className="text-[11px] text-foreground-600">
                  <span className="font-medium">{weather.temperature}°C</span> ressenti{weather.feelsLike !== weather.temperature ? ` ${weather.feelsLike}°C` : ''} — {weather.condition.toLowerCase()}. {weather.suggestion}.
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-3">
                {outfit.top?.photos?.[0] ? (
                  <div className="relative w-16 h-20 md:w-20 md:h-24 rounded-lg overflow-hidden bg-background-100 border border-background-200/30 flex-shrink-0">
                    <img
                      src={outfit.top.photos[0]}
                      alt={outfit.top.name}
                      className="w-full h-full object-cover object-top"
                    />
                    <span className="absolute bottom-0 left-0 right-0 text-center py-0.5 bg-foreground-900/70 text-background-50 text-[9px] font-medium">
                      Haut
                    </span>
                  </div>
                ) : (
                  <div className="w-16 h-20 md:w-20 md:h-24 rounded-lg bg-background-100 border border-dashed border-background-300/40 flex items-center justify-center flex-shrink-0">
                    <i className="ri-t-shirt-line text-foreground-300 text-lg"></i>
                  </div>
                )}

                {outfit.bottom?.photos?.[0] ? (
                  <div className="relative w-16 h-20 md:w-20 md:h-24 rounded-lg overflow-hidden bg-background-100 border border-background-200/30 flex-shrink-0">
                    <img
                      src={outfit.bottom.photos[0]}
                      alt={outfit.bottom.name}
                      className="w-full h-full object-cover object-top"
                    />
                    <span className="absolute bottom-0 left-0 right-0 text-center py-0.5 bg-foreground-900/70 text-background-50 text-[9px] font-medium">
                      Bas
                    </span>
                  </div>
                ) : (
                  <div className="w-16 h-20 md:w-20 md:h-24 rounded-lg bg-background-100 border border-dashed border-background-300/40 flex items-center justify-center flex-shrink-0">
                    <i className="ri-pantone-line text-foreground-300 text-lg"></i>
                  </div>
                )}

                {outfit.shoes?.photos?.[0] ? (
                  <div className="relative w-16 h-20 md:w-20 md:h-24 rounded-lg overflow-hidden bg-background-100 border border-background-200/30 flex-shrink-0">
                    <img
                      src={outfit.shoes.photos[0]}
                      alt={outfit.shoes.name}
                      className="w-full h-full object-cover object-top"
                    />
                    <span className="absolute bottom-0 left-0 right-0 text-center py-0.5 bg-foreground-900/70 text-background-50 text-[9px] font-medium">
                      Chaussures
                    </span>
                  </div>
                ) : (
                  <div className="w-16 h-20 md:w-20 md:h-24 rounded-lg bg-background-100 border border-dashed border-background-300/40 flex items-center justify-center flex-shrink-0">
                    <i className="ri-footprint-line text-foreground-300 text-lg"></i>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-base md:text-lg font-bold text-foreground-900 mb-1 truncate">
                  {outfit.outfit_name}
                </h4>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-foreground-100/80 text-foreground-700 text-[10px] font-medium">
                    <i className="ri-price-tag-3-line text-[10px]"></i>
                    {getOccasionLabel(outfit.occasion)}
                  </span>
                  {(outfit.top || outfit.bottom || outfit.shoes) && (
                    <span className="text-[11px] text-foreground-500">
                      {[outfit.top?.name, outfit.bottom?.name, outfit.shoes?.name].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-foreground-100 flex items-center justify-center mb-3">
              <i className="ri-shirt-line text-lg text-foreground-400"></i>
            </div>
            <p className="text-sm font-medium text-foreground-600 mb-1">
              Aucune tenue programmée pour aujourd&apos;hui
            </p>
            <p className="text-xs text-foreground-400 mb-4">
              {weather
                ? `Il fait ${weather.temperature}°C (ressenti ${weather.feelsLike}°C) — ${weather.suggestion.toLowerCase()}.`
                : 'Programme un outfit depuis ton dressing et retrouve-le ici chaque matin.'
              }
            </p>
            <Link
              to="/mon-planning"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-foreground-900 text-background-50 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-foreground-800 transition-colors"
            >
              <i className="ri-calendar-event-line"></i>
              Programmer une tenue
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}