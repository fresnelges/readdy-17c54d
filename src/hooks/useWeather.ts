import { useState, useEffect, useCallback, useRef } from 'react';

interface WeatherData {
  temperature: number;
  feelsLike: number;
  weatherCode: number;
  condition: string;
  icon: string;
  high: number;
  low: number;
  humidity: number;
  suggestion: string;
  location: string;
}

interface WeatherEntry {
  code: number;
  condition: string;
  icon: string;
}

const WEATHER_MAP: WeatherEntry[] = [
  { code: 0, condition: 'Ensoleillé', icon: 'ri-sun-line' },
  { code: 1, condition: 'Peu nuageux', icon: 'ri-sun-cloudy-line' },
  { code: 2, condition: 'Partiellement nuageux', icon: 'ri-cloudy-line' },
  { code: 3, condition: 'Nuageux', icon: 'ri-cloudy-line' },
  { code: 45, condition: 'Brume', icon: 'ri-mist-line' },
  { code: 48, condition: 'Brouillard givrant', icon: 'ri-mist-line' },
  { code: 51, condition: 'Bruine légère', icon: 'ri-drizzle-line' },
  { code: 53, condition: 'Bruine modérée', icon: 'ri-drizzle-line' },
  { code: 55, condition: 'Bruine dense', icon: 'ri-drizzle-line' },
  { code: 61, condition: 'Pluie légère', icon: 'ri-rainy-line' },
  { code: 63, condition: 'Pluie modérée', icon: 'ri-rainy-line' },
  { code: 65, condition: 'Pluie forte', icon: 'ri-heavy-showers-line' },
  { code: 71, condition: 'Neige légère', icon: 'ri-snowy-line' },
  { code: 73, condition: 'Neige modérée', icon: 'ri-snowy-line' },
  { code: 75, condition: 'Neige forte', icon: 'ri-snowy-line' },
  { code: 77, condition: 'Grains de neige', icon: 'ri-snowy-line' },
  { code: 80, condition: 'Averses légères', icon: 'ri-showers-line' },
  { code: 81, condition: 'Averses modérées', icon: 'ri-showers-line' },
  { code: 82, condition: 'Averses violentes', icon: 'ri-heavy-showers-line' },
  { code: 85, condition: 'Averses de neige légères', icon: 'ri-snowy-line' },
  { code: 86, condition: 'Averses de neige fortes', icon: 'ri-snowy-line' },
  { code: 95, condition: 'Orage', icon: 'ri-thunderstorms-line' },
  { code: 96, condition: 'Orage avec grêle légère', icon: 'ri-thunderstorms-line' },
  { code: 99, condition: 'Orage avec grêle forte', icon: 'ri-thunderstorms-line' },
];

const DEFAULT_LOCATION = { lat: 48.8566, lon: 2.3522, name: 'Paris' };

const LS_KEY = 'zifek_weather_location';

function getStoredLocation(): { lat: number; lon: number; name: string } | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function storeLocation(loc: { lat: number; lon: number; name: string }) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(loc));
  } catch { /* ignore */ }
}

function resolveWeatherEntry(code: number): WeatherEntry {
  return WEATHER_MAP.find((e) => e.code === code) || { code, condition: 'Variable', icon: 'ri-cloudy-line' };
}

function getSuggestion(temp: number): string {
  if (temp > 30) return 'Très chaud — privilégie des vêtements très légers et respirants';
  if (temp > 25) return 'Chaud — une tenue légère est parfaite aujourd\'hui';
  if (temp > 20) return 'Douceur estivale — parfait pour une tenue décontractée';
  if (temp > 15) return 'Agréable — une tenue casual sans se couvrir';
  if (temp > 10) return 'Frais — prévois une petite veste ou un gilet';
  if (temp > 5) return 'Froid — un bon pull ou un manteau léger s\'impose';
  if (temp > 0) return 'Très froid — manteau chaud recommandé';
  return 'Glacial — couvre-toi bien, écharpe et gants conseillés !';
}

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const fetchWeather = useCallback(async (lat: number, lon: number, locationName: string) => {
    setLoading(true);
    setError(null);

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Erreur réseau');

      const data = await res.json();

      const current = data.current;
      const daily = data.daily;

      const wcode = current.weather_code ?? 0;
      const entry = resolveWeatherEntry(wcode);

      const temp = Math.round(current.temperature_2m);
      const feelsLike = Math.round(current.apparent_temperature);
      const high = Math.round(daily.temperature_2m_max?.[0] ?? temp);
      const low = Math.round(daily.temperature_2m_min?.[0] ?? temp);
      const humidity = current.relative_humidity_2m ?? 0;

      setWeather({
        temperature: temp,
        feelsLike,
        weatherCode: wcode,
        condition: entry.condition,
        icon: entry.icon,
        high,
        low,
        humidity,
        suggestion: getSuggestion(feelsLike),
        location: locationName,
      });

      storeLocation({ lat, lon, name: locationName });
    } catch (err) {
      setError('Météo indisponible');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    // Try stored location first
    const stored = getStoredLocation();
    if (stored) {
      fetchWeather(stored.lat, stored.lon, stored.name);
      return;
    }

    // Try browser geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetchWeather(pos.coords.latitude, pos.coords.longitude, 'Ma position');
        },
        () => {
          // Fallback to Paris
          fetchWeather(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon, DEFAULT_LOCATION.name);
        },
      );
    } else {
      fetchWeather(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon, DEFAULT_LOCATION.name);
    }
  }, [fetchWeather]);

  return { weather, loading, error };
}