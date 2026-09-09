import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface OutfitSchedule {
  id: number;
  user_id: number;
  outfit_id: number;
  day_of_week: number;
  scheduled_date: string | null;
}

interface UpcomingOutfit {
  scheduled_date: string;
  outfit_id: number;
  outfit_name: string;
}

interface ClosetItem {
  id: number;
  name: string;
  category: string;
  photos: string[];
}

export interface TodayOutfit {
  outfit_id: number;
  outfit_name: string;
  occasion: string;
  top: ClosetItem | null;
  bottom: ClosetItem | null;
  shoes: ClosetItem | null;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const DAYS = [
  { label: 'Dim', full: 'Dimanche' },
  { label: 'Lun', full: 'Lundi' },
  { label: 'Mar', full: 'Mardi' },
  { label: 'Mer', full: 'Mercredi' },
  { label: 'Jeu', full: 'Jeudi' },
  { label: 'Ven', full: 'Vendredi' },
  { label: 'Sam', full: 'Samedi' },
];

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export function useOutfitReminders() {
  const { user } = useAuth();
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [upcomingOutfits, setUpcomingOutfits] = useState<UpcomingOutfit[]>([]);
  const [todayOutfit, setTodayOutfit] = useState<TodayOutfit | null>(null);
  const [todayLoading, setTodayLoading] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<string>('default');
  const notifiedToday = useRef(false);
  const lastCheckedDate = useRef<string | null>(null);

  const parsePhotos = (item: Record<string, unknown>): string[] => {
    if (!item.photos) return [];
    if (Array.isArray(item.photos)) return item.photos as string[];
    try {
      const parsed = JSON.parse(item.photos as string);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const fetchTodayOutfit = useCallback(async () => {
    if (!user) return;

    const todayStr = toISODate(new Date());
    setTodayLoading(true);

    try {
      const { data: schedules, error } = await supabase
        .from('outfit_schedule')
        .select('*')
        .eq('user_id', user.id)
        .eq('scheduled_date', todayStr)
        .maybeSingle();

      if (error || !schedules) {
        setTodayOutfit(null);
        setTodayLoading(false);
        return;
      }

      const sched = schedules as OutfitSchedule;

      const { data: outfit } = await supabase
        .from('user_outfits')
        .select('*')
        .eq('id', sched.outfit_id)
        .maybeSingle();

      if (!outfit) {
        setTodayOutfit(null);
        setTodayLoading(false);
        return;
      }

      const itemIds: number[] = [];
      if (outfit.top_id) itemIds.push(outfit.top_id);
      if (outfit.bottom_id) itemIds.push(outfit.bottom_id);
      if (outfit.shoes_id) itemIds.push(outfit.shoes_id);

      let closetMap = new Map<number, ClosetItem>();

      if (itemIds.length > 0) {
        const { data: closetItems } = await supabase
          .from('user_closet')
          .select('*')
          .in('id', itemIds);

        (closetItems || []).forEach((item: Record<string, unknown>) => {
          closetMap.set(item.id as number, {
            id: item.id as number,
            name: item.name as string,
            category: item.category as string,
            photos: parsePhotos(item),
          });
        });
      }

      const today: TodayOutfit = {
        outfit_id: outfit.id as number,
        outfit_name: outfit.name as string,
        occasion: outfit.occasion as string,
        top: outfit.top_id ? (closetMap.get(outfit.top_id) ?? null) : null,
        bottom: outfit.bottom_id ? (closetMap.get(outfit.bottom_id) ?? null) : null,
        shoes: outfit.shoes_id ? (closetMap.get(outfit.shoes_id) ?? null) : null,
      };

      setTodayOutfit(today);
    } catch {
      setTodayOutfit(null);
    }
    setTodayLoading(false);
  }, [user]);

  const fetchUpcoming = useCallback(async () => {
    if (!user) return;

    const today = new Date();
    const todayStr = toISODate(today);

    if (lastCheckedDate.current === todayStr) return;
    lastCheckedDate.current = todayStr;

    try {
      const { data: schedules, error } = await supabase
        .from('outfit_schedule')
        .select('*')
        .eq('user_id', user.id)
        .gte('scheduled_date', todayStr)
        .order('scheduled_date', { ascending: true });

      if (error || !schedules) {
        setUpcomingCount(0);
        setUpcomingOutfits([]);
        return;
      }

      const outfitIds = [...new Set((schedules as OutfitSchedule[]).map((s) => s.outfit_id))];

      const { data: outfits } = await supabase
        .from('user_outfits')
        .select('id, name')
        .in('id', outfitIds);

      const outfitMap = new Map<number, string>();
      (outfits || []).forEach((o: { id: number; name: string }) => {
        outfitMap.set(o.id, o.name);
      });

      const upcoming: UpcomingOutfit[] = (schedules as OutfitSchedule[])
        .filter((s) => s.scheduled_date)
        .map((s) => ({
          scheduled_date: s.scheduled_date!,
          outfit_id: s.outfit_id,
          outfit_name: outfitMap.get(s.outfit_id) || 'Tenue sans nom',
        }));

      setUpcomingOutfits(upcoming);
      setUpcomingCount(upcoming.length);

      const todayOutfitName = upcoming.find((u) => u.scheduled_date === todayStr);

      if (todayOutfitName && !notifiedToday.current) {
        notifiedToday.current = true;

        if (Notification.permission === 'granted') {
          const dayIdx = today.getDay();
          const dayLabel = `${DAYS[dayIdx].full} ${today.getDate()} ${MONTHS[today.getMonth()]}`;

          try {
            new Notification('👔 Tenue du jour', {
              body: `Aujourd'hui (${dayLabel}) : ${todayOutfitName.outfit_name} — jette un œil à ton planning !`,
              icon: '/favicon.ico',
              tag: `outfit-${todayStr}`,
              requireInteraction: false,
            });
          } catch {
            // Notification API might not be available
          }
        }
      }
    } catch {
      setUpcomingCount(0);
      setUpcomingOutfits([]);
    }
  }, [user]);

  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      notifiedToday.current = false;
      await fetchUpcoming();
    }
  }, [fetchUpcoming]);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    fetchUpcoming();
    fetchTodayOutfit();
  }, [fetchUpcoming, fetchTodayOutfit]);

  return {
    upcomingCount,
    upcomingOutfits,
    todayOutfit,
    todayLoading,
    notificationPermission,
    requestNotificationPermission,
  };
}