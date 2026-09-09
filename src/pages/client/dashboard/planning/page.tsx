import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useOutfitReminders } from '@/hooks/useOutfitReminders';
import ClientDashboardNavbar from '../components/ClientDashboardNavbar';

interface ClosetItem {
  id: number;
  user_id: number;
  name: string;
  category: string;
  photos: string[];
  occasion: string;
  created_at: string;
}

interface Outfit {
  id: number;
  user_id: number;
  name: string;
  top_id: number | null;
  bottom_id: number | null;
  shoes_id: number | null;
  occasion: string;
  is_public: boolean;
  created_at: string;
}

interface OutfitSchedule {
  id: number;
  user_id: number;
  outfit_id: number;
  day_of_week: number;
  scheduled_date: string | null;
  created_at: string;
}

interface WeatherDaily {
  date: string;
  dayLabel: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
}

interface WeatherData {
  current: {
    temp: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    weatherCode: number;
  };
  daily: WeatherDaily[];
  city: string;
}

interface WeekDay {
  date: Date;
  dateStr: string;
  dayLabel: string;
  dayFull: string;
  dayOfWeek: number;
  isToday: boolean;
  isPast: boolean;
}

const DAYS = [
  { value: 0, label: 'Dim', full: 'Dimanche' },
  { value: 1, label: 'Lun', full: 'Lundi' },
  { value: 2, label: 'Mar', full: 'Mardi' },
  { value: 3, label: 'Mer', full: 'Mercredi' },
  { value: 4, label: 'Jeu', full: 'Jeudi' },
  { value: 5, label: 'Ven', full: 'Vendredi' },
  { value: 6, label: 'Sam', full: 'Samedi' },
];

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const OCCASIONS = [
  { value: 'casual', label: 'Casual', icon: 'ri-t-shirt-line' },
  { value: 'travail', label: 'Travail', icon: 'ri-briefcase-line' },
  { value: 'soiree', label: 'Soirée', icon: 'ri-moon-line' },
  { value: 'sport', label: 'Sport', icon: 'ri-run-line' },
  { value: 'plage', label: 'Plage', icon: 'ri-sun-line' },
  { value: 'formel', label: 'Formel', icon: 'ri-vip-crown-line' },
];

function getOccasionLabel(val: string): string {
  return OCCASIONS.find((o) => o.value === val)?.label || val;
}

const OCCASION_COLORS: Record<string, string> = {
  casual: 'bg-secondary-100 text-secondary-700',
  travail: 'bg-primary-100 text-primary-700',
  soiree: 'bg-foreground-100 text-foreground-700',
  sport: 'bg-accent-100 text-accent-700',
  plage: 'bg-primary-50 text-primary-600',
  formel: 'bg-foreground-900 text-background-50',
};

const OCCASION_DOT_COLORS: Record<string, string> = {
  casual: 'bg-secondary-500',
  travail: 'bg-primary-500',
  soiree: 'bg-foreground-400',
  sport: 'bg-accent-500',
  plage: 'bg-primary-400',
  formel: 'bg-foreground-950',
};

const OCCASION_BAR_COLORS: Record<string, string> = {
  casual: 'bg-secondary-400',
  travail: 'bg-primary-500',
  soiree: 'bg-foreground-400',
  sport: 'bg-accent-500',
  plage: 'bg-primary-400',
  formel: 'bg-foreground-900',
};

function getWeatherIcon(code: number): string {
  if (code === 0) return 'ri-sun-line';
  if (code <= 3) return 'ri-cloudy-line';
  if (code <= 48) return 'ri-mist-line';
  if (code <= 55) return 'ri-drizzle-line';
  if (code <= 65) return 'ri-rainy-line';
  if (code <= 75) return 'ri-snowy-line';
  if (code <= 82) return 'ri-showers-line';
  if (code <= 99) return 'ri-thunderstorms-line';
  return 'ri-cloudy-line';
}

function getWeatherDescription(code: number): string {
  if (code === 0) return 'Ensoleillé';
  if (code <= 3) return 'Partiellement nuageux';
  if (code <= 48) return 'Brouillard';
  if (code <= 55) return 'Bruine';
  if (code <= 65) return 'Pluie';
  if (code <= 75) return 'Neige';
  if (code <= 82) return 'Averses';
  if (code <= 99) return 'Orage';
  return 'Variable';
}

function getWeatherOutfitTip(code: number, temp: number): string {
  if (temp >= 28) return 'Privilégie les matières légères, lin et coton — un look estival s\'impose !';
  if (temp >= 22) return 'Parfait pour un t-shirt ou une chemise légère, sans superposition.';
  if (temp >= 16) return 'Une petite veste ou un gilet léger peut être utile en fin de journée.';
  if (temp >= 10) return 'Opte pour une superposition : pull léger + veste, ou un bon sweat.';
  if (temp >= 5) return 'Manteau chaud recommandé, avec écharpe et gants si besoin.';
  if (temp < 5) return 'Grand froid ! Manteau épais, bonnet, gants et écharpe indispensables.';
  if (code >= 61 && code <= 65) return 'Pluie annoncée — n\'oublie pas un imperméable ou un parapluie !';
  if (code >= 71 && code <= 75) return 'Neige prévue — privilégie des chaussures imperméables et chaudes.';
  return 'Adapte ta tenue à la météo du jour.';
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMondayOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDateRange(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const sameMonth = monday.getMonth() === sunday.getMonth();
  if (sameMonth) {
    return `${monday.getDate()} - ${sunday.getDate()} ${MONTHS[sunday.getMonth()]} ${sunday.getFullYear()}`;
  }
  return `${monday.getDate()} ${MONTHS[monday.getMonth()]} - ${sunday.getDate()} ${MONTHS[sunday.getMonth()]} ${sunday.getFullYear()}`;
}

const MIN_WEEK_OFFSET = -4;
const MAX_WEEK_OFFSET = 3;

export default function PlanningPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { upcomingOutfits, upcomingCount, notificationPermission, requestNotificationPermission } = useOutfitReminders();

  const [closetItems, setClosetItems] = useState<ClosetItem[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [schedules, setSchedules] = useState<OutfitSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignDate, setAssignDate] = useState<string | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [city, setCity] = useState<string>('Votre position');

  const [weekOffset, setWeekOffset] = useState(0);

  const today = useMemo(() => new Date(), []);
  const todayStr = toISODate(today);

  const weekMonday = useMemo(() => {
    const base = getMondayOfWeek(today);
    base.setDate(base.getDate() + weekOffset * 7);
    return base;
  }, [today, weekOffset]);

  const weekDays: WeekDay[] = useMemo(() => {
    const days: WeekDay[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekMonday);
      d.setDate(weekMonday.getDate() + i);
      const dateStr = toISODate(d);
      days.push({
        date: d,
        dateStr,
        dayLabel: DAYS[d.getDay()].label,
        dayFull: DAYS[d.getDay()].full,
        dayOfWeek: d.getDay(),
        isToday: dateStr === todayStr,
        isPast: dateStr < todayStr,
      });
    }
    return days;
  }, [weekMonday, todayStr]);

  const weekLabel = useMemo(() => {
    if (weekOffset === 0) return 'Cette semaine';
    if (weekOffset === 1) return 'Semaine prochaine';
    if (weekOffset === -1) return 'Semaine dernière';
    if (weekOffset > 1) return `Dans ${weekOffset} semaines`;
    return `Il y a ${Math.abs(weekOffset)} semaines`;
  }, [weekOffset]);

  const isCurrentWeek = weekOffset === 0;

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [closetRes, outfitsRes, schedRes] = await Promise.all([
        supabase.from('user_closet').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('user_outfits').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('outfit_schedule').select('*').eq('user_id', user.id),
      ]);

      if (closetRes.error) throw closetRes.error;
      if (outfitsRes.error) throw outfitsRes.error;
      if (schedRes.error) throw schedRes.error;

      setClosetItems(
        (closetRes.data || []).map((item) => ({
          ...item,
          photos: typeof item.photos === 'string' ? JSON.parse(item.photos) : item.photos || [],
        }))
      );
      setOutfits(outfitsRes.data || []);
      setSchedules(schedRes.data || []);
    } catch {
      setError('Impossible de charger les données.');
    }
    setLoading(false);
  }, [user]);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setWeatherError('Géolocalisation non supportée.');
      setWeatherLoading(false);
      return;
    }

    setWeatherLoading(true);
    setWeatherError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setCoords({ lat, lon });

        fetch(`https://api.open-meteo.com/v1/geocoding?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&localityLanguage=fr&count=1`)
          .then((r) => r.json())
          .then((geoData) => {
            if (geoData?.results?.length > 0) {
              setCity(geoData.results[0].name || geoData.results[0].admin1 || city);
            }
          })
          .catch(() => {});
      },
      () => {
        setLocationDenied(true);
        setWeatherError('Activez la géolocalisation pour voir la météo.');
        setWeatherLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }, []);

  const fetchWeather = useCallback(async () => {
    if (!coords) return;
    setWeatherLoading(true);
    setWeatherError(null);

    try {
      const { lat, lon } = coords;
      const daysFromToday = Math.floor((weekMonday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const forecastDays = Math.max(7, Math.min(16, daysFromToday + 14));

      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=${forecastDays}`
      );

      if (!weatherRes.ok) throw new Error('API météo indisponible');

      const data = await weatherRes.json();

      const allDaily: WeatherDaily[] = data.daily.time.map((date: string, i: number) => ({
        date,
        dayLabel: DAYS[new Date(date + 'T00:00:00').getDay()].label,
        tempMax: Math.round(data.daily.temperature_2m_max[i]),
        tempMin: Math.round(data.daily.temperature_2m_min[i]),
        weatherCode: data.daily.weather_code[i],
      }));

      const weekDateStrs = new Set(weekDays.map((wd) => wd.dateStr));
      const filteredDaily = allDaily.filter((d) => weekDateStrs.has(d.date));

      setWeather({
        current: data.current ? {
          temp: Math.round(data.current.temperature_2m),
          feelsLike: Math.round(data.current.apparent_temperature),
          humidity: data.current.relative_humidity_2m,
          windSpeed: Math.round(data.current.wind_speed_10m),
          weatherCode: data.current.weather_code,
        } : { temp: 0, feelsLike: 0, humidity: 0, windSpeed: 0, weatherCode: 0 },
        daily: filteredDaily.length > 0 ? filteredDaily : allDaily.slice(0, 7),
        city,
      });
    } catch {
      setWeatherError('Impossible de récupérer la météo.');
    }
    setWeatherLoading(false);
  }, [coords, weekMonday, today, weekDays, city]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { requestLocation(); }, [requestLocation]);
  useEffect(() => { if (coords) fetchWeather(); }, [fetchWeather, coords]);

  if (!user) {
    navigate('/login-client', { replace: true });
    return null;
  }

  const findClosetItem = (id: number | null): ClosetItem | undefined => {
    if (!id) return undefined;
    return closetItems.find((i) => i.id === id);
  };

  const findOutfit = (id: number): Outfit | undefined => {
    return outfits.find((o) => o.id === id);
  };

  const getScheduleForDate = (dateStr: string): Outfit | undefined => {
    const sched = schedules.find((s) => s.scheduled_date === dateStr);
    if (!sched) return undefined;
    return findOutfit(sched.outfit_id);
  };

  const getWeekSchedules = (): OutfitSchedule[] => {
    const dateSet = new Set(weekDays.map((wd) => wd.dateStr));
    return schedules.filter((s) => s.scheduled_date && dateSet.has(s.scheduled_date));
  };

  const weekSchedules = getWeekSchedules();
  const weekScheduledCount = weekSchedules.length;
  const weekFreeCount = 7 - weekScheduledCount;

  const handleUnscheduleDate = async (dateStr: string) => {
    if (!user) return;
    setError(null);
    try {
      const { error: dbError } = await supabase
        .from('outfit_schedule')
        .delete()
        .eq('user_id', user.id)
        .eq('scheduled_date', dateStr);

      if (dbError) {
        setError(`Erreur : ${dbError.message || dbError.details || 'inconnue'}`);
        return;
      }
      await fetchAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Erreur inattendue : ${msg}`);
    }
  };

  const handleAssignOutfit = async (outfitId: number) => {
    if (!user || !assignDate) return;
    setAssignLoading(true);
    setError(null);
    try {
      await supabase
        .from('outfit_schedule')
        .delete()
        .eq('user_id', user.id)
        .eq('scheduled_date', assignDate);

      const assignDayOfWeek = new Date(assignDate + 'T00:00:00').getDay();

      const { error: dbError } = await supabase
        .from('outfit_schedule')
        .insert({
          user_id: user.id,
          outfit_id: outfitId,
          day_of_week: assignDayOfWeek,
          scheduled_date: assignDate,
        });

      if (dbError) {
        setError(`Erreur : ${dbError.message || dbError.details || 'inconnue'}`);
        setAssignLoading(false);
        return;
      }
      await fetchAll();
      setAssignModalOpen(false);
      setAssignDate(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Erreur inattendue : ${msg}`);
    }
    setAssignLoading(false);
  };

  const openAssignModal = (dateStr: string) => {
    setAssignDate(dateStr);
    setAssignModalOpen(true);
  };

  const todayOutfit = getScheduleForDate(todayStr);

  const totalScheduled = schedules.filter((s) => s.scheduled_date).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background-50 flex flex-col">
        <ClientDashboardNavbar />
        <main className="flex-1 pt-16 flex items-center justify-center">
          <i className="ri-loader-4-line animate-spin text-2xl text-foreground-400"></i>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-50 flex flex-col">
      <ClientDashboardNavbar />

      <main className="flex-1 pt-16">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10">
          {/* Back + Title */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <Link
                to="/mon-compte"
                className="inline-flex items-center gap-1.5 text-sm text-foreground-500 hover:text-foreground-700 transition-colors cursor-pointer mb-2"
              >
                <i className="ri-arrow-left-line text-sm"></i>
                Retour au Dressing
              </Link>
              <h1 className="text-2xl md:text-3xl font-bold font-heading text-foreground-950">
                <i className="ri-calendar-2-line mr-3 text-foreground-800"></i>
                Planning de la semaine
              </h1>
              <p className="text-sm text-foreground-500 mt-1.5">
                Programme tes outfits pour chaque jour de la semaine
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-foreground-100/70 border border-foreground-200/40 rounded-full">
                <span className="w-2 h-2 rounded-full bg-foreground-700"></span>
                <span className="text-xs font-medium text-foreground-700">
                  {weekScheduledCount}/7 cette semaine
                </span>
              </div>
              {totalScheduled > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary-50 border border-secondary-200/60 rounded-full">
                  <span className="text-xs font-medium text-secondary-700">
                    {totalScheduled} au total
                  </span>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 text-sm rounded-lg mb-4">
              <i className="ri-error-warning-line"></i>
              {error}
              <button onClick={() => setError(null)} className="ml-auto cursor-pointer hover:text-red-900">
                <i className="ri-close-line"></i>
              </button>
            </div>
          )}

          {/* Rappels des tenues à venir */}
          {upcomingOutfits.length > 0 && (() => {
            const todayOutfit = upcomingOutfits.find((u) => u.scheduled_date === todayStr);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = toISODate(tomorrow);
            const tomorrowOutfit = upcomingOutfits.find((u) => u.scheduled_date === tomorrowStr);

            return (
              <div className="bg-foreground-100/60 border border-foreground-200/30 rounded-xl p-4 mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-10 h-10 rounded-full bg-foreground-100 flex items-center justify-center">
                    <i className="ri-notification-3-line text-lg text-foreground-600"></i>
                  </div>
                  <div className="sm:hidden">
                    <p className="text-sm font-bold text-foreground-800">
                      {upcomingCount} tenue{upcomingCount > 1 ? 's' : ''} à venir
                    </p>
                    <p className="text-xs text-foreground-500">
                      {todayOutfit ? `Aujourd'hui : ${todayOutfit.outfit_name}` : `Prochaine : ${upcomingOutfits[0].outfit_name}`}
                    </p>
                  </div>
                </div>
                <div className="hidden sm:block flex-1">
                  <p className="text-sm font-bold text-foreground-800">
                    {todayOutfit
                      ? `👋 Ta tenue du jour est prête : « ${todayOutfit.outfit_name} »`
                      : tomorrowOutfit
                        ? `📅 Demain : « ${tomorrowOutfit.outfit_name} » — pense à préparer ta tenue !`
                        : `📋 ${upcomingCount} tenue${upcomingCount > 1 ? 's' : ''} programmée${upcomingCount > 1 ? 's' : ''} cette semaine`}
                  </p>
                  <p className="text-xs text-foreground-500 mt-0.5">
                    {todayOutfit && tomorrowOutfit
                      ? `Et demain : « ${tomorrowOutfit.outfit_name} »`
                      : todayOutfit
                        ? 'Passe une excellente journée !'
                        : 'Jette un œil à ton planning ci-dessous.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {notificationPermission !== 'granted' && (
                    <button
                      onClick={requestNotificationPermission}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-foreground-900 text-background-50 text-xs font-medium whitespace-nowrap cursor-pointer hover:bg-foreground-800 transition-colors"
                    >
                      <i className="ri-notification-3-line"></i>
                      Activer les rappels
                    </button>
                  )}
                  {notificationPermission === 'granted' && (
                    <span className="flex items-center gap-1 text-xs text-foreground-500 font-medium">
                      <i className="ri-check-line"></i>
                      Rappels activés
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          {upcomingOutfits.length === 0 && !loading && (
            <div className="bg-background-50 border border-background-200/30 rounded-xl p-4 mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-10 h-10 rounded-full bg-foreground-100 flex items-center justify-center">
                  <i className="ri-notification-off-line text-lg text-foreground-500"></i>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground-600">Aucune tenue programmée à venir</p>
                <p className="text-xs text-foreground-400">
                  Programme tes outfits ci-dessous pour recevoir des rappels automatiques.
                </p>
              </div>
              {notificationPermission !== 'granted' && (
                <button
                  onClick={requestNotificationPermission}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-foreground-200/40 text-foreground-500 text-xs font-medium whitespace-nowrap cursor-pointer hover:bg-foreground-100 transition-colors"
                >
                  <i className="ri-notification-3-line"></i>
                  Activer les rappels
                </button>
              )}
            </div>
          )}

          {/* Weather + Today's outfit row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* Weather Card */}
            <div className="lg:col-span-1 bg-background-50 border border-background-200/30 rounded-xl p-5 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <i className="ri-sun-cloudy-line text-foreground-600 text-lg"></i>
                <h3 className="text-sm font-bold font-heading text-foreground-800">
                  {isCurrentWeek ? 'Météo du jour' : `Météo — ${weekLabel}`}
                </h3>
                {weather && (
                  <span className="ml-auto text-[10px] text-foreground-400">{weather.city}</span>
                )}
              </div>

              {weatherLoading ? (
                <div className="flex-1 flex items-center justify-center py-6">
                  <i className="ri-loader-4-line animate-spin text-lg text-foreground-400"></i>
                </div>
              ) : weather && weather.current && isCurrentWeek ? (
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-16 h-16 rounded-2xl bg-foreground-100 flex items-center justify-center">
                      <i className={`${getWeatherIcon(weather.current.weatherCode)} text-3xl text-foreground-700`}></i>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-foreground-900">{weather.current.temp}°C</p>
                      <p className="text-xs text-foreground-500">{getWeatherDescription(weather.current.weatherCode)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 mb-3">
                    <div className="flex items-center gap-1.5 text-xs text-foreground-500">
                      <i className="ri-temp-hot-line text-foreground-400"></i>
                      <span>Ressenti {weather.current.feelsLike}°</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-foreground-500">
                      <i className="ri-drop-line text-foreground-400"></i>
                      <span>{weather.current.humidity}%</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-foreground-500">
                      <i className="ri-windy-line text-foreground-400"></i>
                      <span>{weather.current.windSpeed} km/h</span>
                    </div>
                  </div>

                  <div className="mt-auto p-3 bg-foreground-100/60 rounded-lg border border-foreground-200/30">
                    <div className="flex items-start gap-2">
                      <i className="ri-lightbulb-line text-foreground-500 mt-0.5 shrink-0"></i>
                      <p className="text-xs text-foreground-700 leading-relaxed">
                        {getWeatherOutfitTip(weather.current.weatherCode, weather.current.temp)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : weather && weather.daily.length > 0 && !isCurrentWeek ? (
                <div className="flex-1 flex flex-col gap-2">
                  {weather.daily.slice(0, 4).map((d) => (
                    <div key={d.date} className="flex items-center gap-3">
                      <i className={`${getWeatherIcon(d.weatherCode)} text-sm text-foreground-400 w-5 text-center`}></i>
                      <span className="text-xs text-foreground-600 font-medium w-8">{d.dayLabel}</span>
                      <span className="text-xs text-foreground-800 font-semibold">{d.tempMax}°</span>
                      <span className="text-[10px] text-foreground-400">{d.tempMin}°</span>
                    </div>
                  ))}
                  {weather.daily.length > 4 && (
                    <p className="text-[10px] text-foreground-400 text-center mt-1">
                      + {weather.daily.length - 4} autres jours
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
                  <i className="ri-cloud-off-line text-2xl text-foreground-300 mb-2"></i>
                  <p className="text-xs text-foreground-500">{weatherError || 'Météo non disponible'}</p>
                  {locationDenied && (
                    <button
                      onClick={requestLocation}
                      className="mt-3 text-xs text-foreground-600 hover:text-foreground-800 font-medium cursor-pointer transition-colors"
                    >
                      Réessayer
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Today's outfit highlight */}
            <div className="lg:col-span-2">
              {todayOutfit ? (
                <div className="bg-foreground-100/60 border border-foreground-200/30 rounded-xl p-5 h-full flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-foreground-100 flex items-center justify-center shrink-0">
                    <i className="ri-calendar-check-line text-xl text-foreground-700"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground-600 mb-1">
                      Tenue du jour &mdash; {DAYS[today.getDay()].full} {today.getDate()} {MONTHS[today.getMonth()]}
                    </p>
                    <p className="text-lg font-bold text-foreground-900 truncate">{todayOutfit.name}</p>
                    <p className="text-sm text-foreground-500 mt-0.5">
                      {[
                        findClosetItem(todayOutfit.top_id)?.name,
                        findClosetItem(todayOutfit.bottom_id)?.name,
                        findClosetItem(todayOutfit.shoes_id)?.name,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {findClosetItem(todayOutfit.top_id)?.photos?.[0] && (
                      <img
                        src={findClosetItem(todayOutfit.top_id)!.photos[0]}
                        alt=""
                        className="w-14 h-16 rounded-lg object-cover object-top bg-background-100 border border-background-200/70"
                      />
                    )}
                    {findClosetItem(todayOutfit.bottom_id)?.photos?.[0] && (
                      <img
                        src={findClosetItem(todayOutfit.bottom_id)!.photos[0]}
                        alt=""
                        className="w-14 h-16 rounded-lg object-cover object-top bg-background-100 border border-background-200/70"
                      />
                    )}
                    {findClosetItem(todayOutfit.shoes_id)?.photos?.[0] && (
                      <img
                        src={findClosetItem(todayOutfit.shoes_id)!.photos[0]}
                        alt=""
                        className="w-14 h-16 rounded-lg object-cover object-top bg-background-100 border border-background-200/70"
                      />
                    )}
                  </div>
                  <button
                    onClick={() => openAssignModal(todayStr)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background-50 border border-foreground-200/40 text-foreground-600 text-xs font-medium whitespace-nowrap cursor-pointer hover:bg-foreground-100 hover:border-foreground-300 transition-colors"
                  >
                    <i className="ri-loop-right-line"></i>
                    Changer
                  </button>
                </div>
              ) : (
                <div className="bg-background-50 border border-background-200/30 rounded-xl p-5 h-full flex flex-col items-center justify-center text-center">
                  <div className="w-14 h-14 rounded-full bg-foreground-100 flex items-center justify-center mb-3">
                    <i className="ri-calendar-event-line text-xl text-foreground-500"></i>
                  </div>
                  <p className="text-sm font-medium text-foreground-600 mb-1">
                    Aucune tenue pour aujourd&apos;hui
                  </p>
                  <p className="text-xs text-foreground-400 mb-3">
                    Programme un outfit pour le {today.getDate()} {MONTHS[today.getMonth()]} !
                  </p>
                  <button
                    onClick={() => openAssignModal(todayStr)}
                    className="px-4 py-2 bg-foreground-900 text-background-50 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-foreground-800 transition-colors"
                  >
                    <i className="ri-add-line mr-1.5"></i>
                    Choisir une tenue
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Week Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setWeekOffset((o) => Math.max(MIN_WEEK_OFFSET, o - 1))}
              disabled={weekOffset <= MIN_WEEK_OFFSET}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium text-foreground-600 hover:bg-background-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <i className="ri-arrow-left-s-line"></i>
              Précédent
            </button>

            <div className="text-center">
              <p className="text-sm font-bold font-heading text-foreground-800">
                {weekLabel}
              </p>
              <p className="text-xs text-foreground-400">
                {formatDateRange(weekMonday)}
              </p>
            </div>

            <button
              onClick={() => setWeekOffset((o) => Math.min(MAX_WEEK_OFFSET, o + 1))}
              disabled={weekOffset >= MAX_WEEK_OFFSET}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium text-foreground-600 hover:bg-background-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              Suivant
              <i className="ri-arrow-right-s-line"></i>
            </button>
          </div>

          {/* Quick jump to current week */}
          {weekOffset !== 0 && (
            <div className="flex justify-center mb-4">
              <button
                onClick={() => setWeekOffset(0)}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-foreground-100/70 text-foreground-600 rounded-full text-xs font-medium cursor-pointer hover:bg-foreground-200/60 transition-colors"
              >
                <i className="ri-calendar-check-line"></i>
                Revenir à cette semaine
              </button>
            </div>
          )}

          {/* Empty state */}
          {weekScheduledCount === 0 && (
            <div className="bg-background-50 border border-background-200/30 rounded-xl p-8 mb-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-foreground-100 flex items-center justify-center mb-4">
                <i className="ri-calendar-event-line text-2xl text-foreground-500"></i>
              </div>
              <h3 className="text-foreground-800 font-semibold text-base mb-1">Aucune tenue cette semaine</h3>
              <p className="text-foreground-500 text-sm max-w-md">
                {weekOffset === 0
                  ? 'Clique sur un jour ci-dessous pour lui assigner un outfit.'
                  : 'Programme tes tenues à l\'avance en cliquant sur un jour ci-dessous.'}
              </p>
            </div>
          )}

          {/* Week Grid */}
          <div className="bg-background-50 border border-background-200/30 rounded-xl p-5 md:p-6 mb-6">
            <h2 className="text-sm font-bold font-heading text-foreground-800 mb-4 flex items-center gap-2">
              <i className="ri-calendar-line text-foreground-700"></i>
              {formatDateRange(weekMonday)}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-3">
              {weekDays.map((wd) => {
                const schedOutfit = getScheduleForDate(wd.dateStr);
                const top = findClosetItem(schedOutfit?.top_id ?? null);
                const bottom = findClosetItem(schedOutfit?.bottom_id ?? null);
                const shoes = findClosetItem(schedOutfit?.shoes_id ?? null);
                const dayWeather = weather?.daily?.find((dw) => dw.date === wd.dateStr);
                const occasionColor = schedOutfit ? OCCASION_COLORS[schedOutfit.occasion] || 'bg-secondary-100 text-secondary-700' : '';
                const dotColor = schedOutfit ? OCCASION_DOT_COLORS[schedOutfit.occasion] || 'bg-secondary-500' : '';
                const barColor = schedOutfit ? OCCASION_BAR_COLORS[schedOutfit.occasion] || 'bg-secondary-400' : '';

                return (
                  <div
                    key={wd.dateStr}
                    className={`relative rounded-xl p-3 flex flex-col transition-colors overflow-hidden ${
                      wd.isToday
                        ? 'bg-foreground-100/60 border border-foreground-200/40'
                        : wd.isPast && !isCurrentWeek
                          ? 'bg-background-100/40 border border-background-200/20'
                          : 'bg-background-100/50 border border-background-200/20'
                    }`}
                  >
                    {schedOutfit && (
                      <div className={`absolute top-0 left-0 w-1 h-full ${barColor}`}></div>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex flex-col">
                        <span className={`text-[10px] ${wd.isToday ? 'text-foreground-600' : 'text-foreground-400'}`}>
                          {wd.dayFull}
                        </span>
                        <span className={`text-xs font-bold ${wd.isToday ? 'text-foreground-800' : 'text-foreground-600'}`}>
                          {wd.date.getDate()} {MONTHS[wd.date.getMonth()].substring(0, 3)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {dayWeather && (
                          <div className="flex items-center gap-1" title={`${dayWeather.tempMax}° / ${dayWeather.tempMin}° - ${getWeatherDescription(dayWeather.weatherCode)}`}>
                            <i className={`${getWeatherIcon(dayWeather.weatherCode)} text-[10px] text-foreground-400`}></i>
                            <span className="text-[9px] text-foreground-500 font-medium">{dayWeather.tempMax}°</span>
                          </div>
                        )}
                        {wd.isToday && (
                          <span className="px-1.5 py-0.5 bg-foreground-900 text-background-50 rounded-full text-[9px] font-bold">
                            AUJ.
                          </span>
                        )}
                      </div>
                    </div>

                    {schedOutfit ? (
                      <div className="flex-1 flex flex-col gap-2">
                        <div className="flex justify-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${occasionColor}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`}></span>
                            {getOccasionLabel(schedOutfit.occasion)}
                          </span>
                        </div>
                        <div className="flex gap-1 justify-center flex-wrap">
                          {top?.photos?.[0] && (
                            <img
                              src={top.photos[0]}
                              alt={top.name}
                              className="w-12 h-14 rounded-lg object-cover object-top bg-background-50 border border-background-200/70"
                            />
                          )}
                          {bottom?.photos?.[0] && (
                            <img
                              src={bottom.photos[0]}
                              alt={bottom.name}
                              className="w-12 h-14 rounded-lg object-cover object-top bg-background-50 border border-background-200/70"
                            />
                          )}
                          {shoes?.photos?.[0] && (
                            <img
                              src={shoes.photos[0]}
                              alt={shoes.name}
                              className="w-12 h-14 rounded-lg object-cover object-top bg-background-50 border border-background-200/70"
                            />
                          )}
                        </div>
                        <p className="text-[11px] font-semibold text-foreground-800 text-center truncate">
                          {schedOutfit.name}
                        </p>
                        <p className="text-[10px] text-foreground-400 text-center truncate">
                          {[
                            top?.name,
                            bottom?.name,
                            shoes?.name,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                        <div className="flex justify-center gap-1.5 mt-auto pt-1">
                          <button
                            onClick={() => openAssignModal(wd.dateStr)}
                            className="px-2 py-1 text-[10px] font-medium text-foreground-500 hover:text-foreground-700 hover:bg-foreground-100 rounded-md cursor-pointer transition-colors"
                          >
                            Changer
                          </button>
                          <button
                            onClick={() => handleUnscheduleDate(wd.dateStr)}
                            className="px-2 py-1 text-[10px] font-medium text-foreground-400 hover:text-red-500 hover:bg-red-50 rounded-md cursor-pointer transition-colors"
                          >
                            Retirer
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => openAssignModal(wd.dateStr)}
                        className="flex-1 flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-background-200/40 hover:border-foreground-200/50 hover:bg-foreground-100/40 cursor-pointer transition-colors py-6"
                      >
                        <div className="w-9 h-9 rounded-full bg-foreground-100/50 flex items-center justify-center">
                          <i className="ri-add-line text-foreground-400 text-sm"></i>
                        </div>
                        <span className="text-[10px] text-foreground-400">Libre</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-background-50 border border-background-200/30 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground-800">{weekScheduledCount}</p>
              <p className="text-xs text-foreground-500 mt-1">Cette semaine</p>
            </div>
            <div className="bg-background-50 border border-background-200/30 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground-800">{weekFreeCount}</p>
              <p className="text-xs text-foreground-500 mt-1">Jours libres</p>
            </div>
            <div className="bg-background-50 border border-background-200/30 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground-800">{totalScheduled}</p>
              <p className="text-xs text-foreground-500 mt-1">Total programmé</p>
            </div>
            <div className="bg-background-50 border border-background-200/30 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground-800">{outfits.length}</p>
              <p className="text-xs text-foreground-500 mt-1">Outfits dispos</p>
            </div>
          </div>

          {/* Quick links */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {weekOffset < MAX_WEEK_OFFSET && (
              <button
                onClick={() => setWeekOffset((o) => o + 1)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-foreground-900 text-background-50 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-foreground-800 transition-colors"
              >
                <i className="ri-arrow-right-line"></i>
                Semaine prochaine
              </button>
            )}
            <Link
              to="/mon-compte"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-secondary-500 text-background-50 dark:text-foreground-950 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-secondary-600 transition-colors"
            >
              <i className="ri-shirt-line"></i>
              Retour au Dressing
            </Link>
          </div>
        </div>
      </main>

      {/* Assign Modal */}
      {assignModalOpen && assignDate !== null && (() => {
        const assignDateObj = new Date(assignDate + 'T00:00:00');
        const assignDayFull = DAYS[assignDateObj.getDay()].full;
        const assignDateLabel = `${assignDayFull} ${assignDateObj.getDate()} ${MONTHS[assignDateObj.getMonth()]}`;
        const dayWeather = weather?.daily?.find((dw) => dw.date === assignDate);

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => { setAssignModalOpen(false); setAssignDate(null); }}
          >
            <div
              className="bg-background-50 rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-background-200/30 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <i className="ri-calendar-event-line text-foreground-700 shrink-0"></i>
                  <h3 className="text-base font-bold font-heading text-foreground-950 truncate">
                    Tenue pour {assignDateLabel}
                  </h3>
                  {dayWeather && (
                    <span className="flex items-center gap-1 text-xs text-foreground-500 shrink-0">
                      <i className={`${getWeatherIcon(dayWeather.weatherCode)}`}></i>
                      {dayWeather.tempMax}° / {dayWeather.tempMin}°
                    </span>
                  )}
                  {assignDate < todayStr && (
                    <span className="shrink-0 px-1.5 py-0.5 bg-foreground-100 text-foreground-500 rounded-full text-[9px] font-medium">
                      Passé
                    </span>
                  )}
                </div>
                <button
                  onClick={() => { setAssignModalOpen(false); setAssignDate(null); }}
                  className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-background-100 shrink-0 ml-2"
                >
                  <i className="ri-close-line text-foreground-500"></i>
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1">
                {outfits.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-center">
                    <div className="w-12 h-12 rounded-full bg-foreground-100 flex items-center justify-center mb-3">
                      <i className="ri-shirt-line text-lg text-foreground-500"></i>
                    </div>
                    <p className="text-sm text-foreground-600 font-medium">Aucun outfit sauvegardé</p>
                    <p className="text-xs text-foreground-400 mt-1">
                      Va dans ton Dressing pour créer et sauvegarder des outfits
                    </p>
                    <Link
                      to="/mon-compte"
                      className="mt-4 px-4 py-2 bg-foreground-900 text-background-50 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer hover:bg-foreground-800 transition-colors"
                    >
                      Aller au Dressing
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {outfits.map((outfit) => {
                      const top = findClosetItem(outfit.top_id);
                      const bottom = findClosetItem(outfit.bottom_id);
                      const shoes = findClosetItem(outfit.shoes_id);
                      const isCurrentlyAssigned = schedules.find(
                        (s) => s.scheduled_date === assignDate && s.outfit_id === outfit.id
                      );
                      const allAssignedDates = schedules
                        .filter((s) => s.outfit_id === outfit.id && s.scheduled_date)
                        .map((s) => {
                          const d = new Date(s.scheduled_date! + 'T00:00:00');
                          return `${DAYS[d.getDay()].label} ${d.getDate()}/${d.getMonth() + 1}`;
                        });

                      return (
                        <button
                          key={outfit.id}
                          onClick={() => handleAssignOutfit(outfit.id)}
                          disabled={assignLoading}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-colors text-left cursor-pointer disabled:opacity-50 ${
                            isCurrentlyAssigned
                              ? 'bg-foreground-100/70 border-foreground-300/60'
                              : 'bg-background-50 border-background-200/30 hover:border-foreground-200/50'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 shrink-0">
                            {top?.photos?.[0] && (
                              <img
                                src={top.photos[0]}
                                alt=""
                                className="w-10 h-12 rounded-md object-cover object-top bg-background-100 border border-background-200/70"
                              />
                            )}
                            {bottom?.photos?.[0] && (
                              <img
                                src={bottom.photos[0]}
                                alt=""
                                className="w-10 h-12 rounded-md object-cover object-top bg-background-100 border border-background-200/70"
                              />
                            )}
                            {shoes?.photos?.[0] && (
                              <img
                                src={shoes.photos[0]}
                                alt=""
                                className="w-10 h-12 rounded-md object-cover object-top bg-background-100 border border-background-200/70"
                              />
                            )}
                            {!top?.photos?.[0] && !bottom?.photos?.[0] && !shoes?.photos?.[0] && (
                              <div className="w-10 h-12 rounded-md bg-background-100 flex items-center justify-center border border-background-200/70">
                                <i className="ri-shirt-line text-foreground-300"></i>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground-800 truncate">{outfit.name}</p>
                            <p className="text-[10px] text-foreground-400">
                              {getOccasionLabel(outfit.occasion)}
                              {allAssignedDates.length > 0 && (
                                <span className="ml-2 text-secondary-600">
                                  · {allAssignedDates.join(', ')}
                                </span>
                              )}
                            </p>
                          </div>
                          {isCurrentlyAssigned ? (
                            <span className="shrink-0 px-2 py-0.5 bg-foreground-900 text-background-50 rounded-full text-[10px] font-bold">
                              Sélectionné
                            </span>
                          ) : (
                            <i className="ri-add-circle-line text-foreground-400 shrink-0"></i>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="px-5 py-4 border-t border-background-200/30 shrink-0">
                <button
                  onClick={() => { setAssignModalOpen(false); setAssignDate(null); }}
                  className="w-full px-5 py-2.5 bg-foreground-100 text-foreground-700 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-foreground-200 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}