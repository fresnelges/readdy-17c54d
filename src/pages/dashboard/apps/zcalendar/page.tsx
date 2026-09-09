import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

// ─── Types ───────────────────────────────────────────────────────────────────
interface BookingService {
  id: number;
  owner: number;
  service_name: string;
  duration: number;
  location: string;
  description: string;
  statut: number;
}

interface Availability {
  id: number;
  service_id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
}

interface BreakSlot {
  id: number;
  service_id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
}

interface Holiday {
  id: number;
  service_id: number;
  date_from: string;
  date_to: string;
  title: string;
}

interface Appointment {
  id: number;
  service_id: number;
  fullname: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  status: string;
  message: string;
}

type TabKey = 'calendar' | 'availability' | 'unavailability' | 'services';

const DAYS_OF_WEEK = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const SHORT_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-accent-100 text-accent-800',
  pending: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-emerald-100 text-emerald-800',
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmé',
  pending: 'En attente',
  cancelled: 'Annulé',
  completed: 'Terminé',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatTime(t: string) {
  return t?.slice(0, 5) ?? '';
}
function formatDateFr(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}
function getMonday(d: Date) {
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  return monday;
}
function toDateStr(d: Date) {
  return d.toISOString().split('T')[0];
}
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// ─── Merge helpers ───────────────────────────────────────────────────────────
function mergeAvailabilities(global: Availability[], perService: Availability[]): Availability[] {
  const map = new Map<string, Availability>();
  global.forEach((a) => map.set(a.day_of_week, a));
  perService.forEach((a) => map.set(a.day_of_week, a));
  return Array.from(map.values());
}

function mergeBreaks(global: BreakSlot[], perService: BreakSlot[]): BreakSlot[] {
  const map = new Map<string, BreakSlot>();
  global.forEach((b) => map.set(`${b.day_of_week}-${b.start_time}-${b.end_time}`, b));
  perService.forEach((b) => map.set(`${b.day_of_week}-${b.start_time}-${b.end_time}`, b));
  return Array.from(map.values());
}

function mergeHolidays(global: Holiday[], perService: Holiday[]): Holiday[] {
  const map = new Map<string, Holiday>();
  global.forEach((h) => map.set(`${h.date_from}-${h.date_to}`, h));
  perService.forEach((h) => map.set(`${h.date_from}-${h.date_to}`, h));
  return Array.from(map.values());
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function ZCalendarPage() {
  const { user } = useAuth();
  const userId = user?.id;

  const [activeTab, setActiveTab] = useState<TabKey>('calendar');
  const [services, setServices] = useState<BookingService[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);

  // Global settings (service_id = 0)
  const [globalAvailabilities, setGlobalAvailabilities] = useState<Availability[]>([]);
  const [globalBreaks, setGlobalBreaks] = useState<BreakSlot[]>([]);
  const [globalHolidays, setGlobalHolidays] = useState<Holiday[]>([]);

  // Per-service settings
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [breaks, setBreaks] = useState<BreakSlot[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Merged (used for calendar)
  const [mergedAvailabilities, setMergedAvailabilities] = useState<Availability[]>([]);
  const [mergedBreaks, setMergedBreaks] = useState<BreakSlot[]>([]);
  const [mergedHolidays, setMergedHolidays] = useState<Holiday[]>([]);

  const [loading, setLoading] = useState(true);

  // Calendar nav
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthView, setMonthView] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  // Service form
  const [svcForm, setSvcForm] = useState({ service_name: '', duration: 30, location: '', description: '' });
  const [editingService, setEditingService] = useState<number | null>(null);
  const [showSvcForm, setShowSvcForm] = useState(false);

  // Domain & share link
  const [userDomain, setUserDomain] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Availability form
  const [availDraft, setAvailDraft] = useState<Record<string, { enabled: boolean; start: string; end: string }>>({});

  // Break form
  const [breakForm, setBreakForm] = useState({ day_of_week: 'monday', start_time: '12:00', end_time: '13:00' });
  const [showBreakForm, setShowBreakForm] = useState(false);

  // Holiday form
  const [holidayForm, setHolidayForm] = useState({ date_from: '', date_to: '', title: '' });
  const [showHolidayForm, setShowHolidayForm] = useState(false);

  // Appointment detail
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);

  // ──────────────────────────────────────────────────────────────────────────
  // Data fetching
  // ──────────────────────────────────────────────────────────────────────────
  const fetchServices = useCallback(async () => {
    if (!userId) return [] as BookingService[];
    const { data } = await supabase.from('booking_services').select('*').eq('owner', userId).eq('statut', 1).order('id');
    const svcs = (data || []) as BookingService[];
    setServices(svcs);
    return svcs;
  }, [userId]);

  const fetchGlobalSettings = useCallback(async () => {
    const [avRes, brRes, hoRes] = await Promise.all([
      supabase.from('booking_availabilities').select('*').eq('service_id', 0),
      supabase.from('booking_breaks').select('*').eq('service_id', 0),
      supabase.from('booking_holidays').select('*').eq('service_id', 0),
    ]);
    setGlobalAvailabilities((avRes.data || []) as Availability[]);
    setGlobalBreaks((brRes.data || []) as BreakSlot[]);
    setGlobalHolidays((hoRes.data || []) as Holiday[]);
  }, []);

  const fetchServiceData = useCallback(async (sid: number) => {
    const [avRes, brRes, hoRes, appRes] = await Promise.all([
      supabase.from('booking_availabilities').select('*').eq('service_id', sid),
      supabase.from('booking_breaks').select('*').eq('service_id', sid),
      supabase.from('booking_holidays').select('*').eq('service_id', sid),
      supabase.from('booking_appointments').select('*').eq('service_id', sid).order('date', { ascending: true }),
    ]);
    setAvailabilities((avRes.data || []) as Availability[]);
    setBreaks((brRes.data || []) as BreakSlot[]);
    setHolidays((hoRes.data || []) as Holiday[]);
    setAppointments((appRes.data || []) as Appointment[]);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await fetchGlobalSettings();
    const svcs = await fetchServices();
    if (svcs.length > 0) {
      const sid = selectedServiceId && svcs.find(s => s.id === selectedServiceId) ? selectedServiceId : svcs[0].id;
      if (!selectedServiceId) setSelectedServiceId(sid);
      await fetchServiceData(sid);
    }
    setLoading(false);
  }, [fetchGlobalSettings, fetchServices, fetchServiceData, selectedServiceId]);

  useEffect(() => { if (userId) fetchAll(); }, [userId]);

  // Fetch custom domain
  useEffect(() => {
    if (!user) return;
    supabase
      .from('websitedomain')
      .select('domaine')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.domaine) setUserDomain(data.domaine);
      })
      .catch(() => {});
  }, [user]);

  // Recalculate merged when data changes
  useEffect(() => {
    setMergedAvailabilities(mergeAvailabilities(globalAvailabilities, availabilities));
    setMergedBreaks(mergeBreaks(globalBreaks, breaks));
    setMergedHolidays(mergeHolidays(globalHolidays, holidays));
  }, [globalAvailabilities, globalBreaks, globalHolidays, availabilities, breaks, holidays]);

  // When selected service changes, refetch per-service data
  useEffect(() => {
    if (!selectedServiceId) return;
    fetchServiceData(selectedServiceId);
  }, [selectedServiceId, fetchServiceData]);

  // Build availability draft from merged data (for the availability tab)
  useEffect(() => {
    const draft: Record<string, { enabled: boolean; start: string; end: string }> = {};
    DAY_KEYS.forEach((dk) => {
      draft[dk] = { enabled: false, start: '09:00', end: '17:00' };
    });
    // Use merged availabilities for display
    const source = selectedServiceId ? availabilities : globalAvailabilities;
    source.forEach((a) => {
      draft[a.day_of_week] = { enabled: true, start: a.start_time?.slice(0, 5) ?? '09:00', end: a.end_time?.slice(0, 5) ?? '17:00' };
    });
    setAvailDraft(draft);
  }, [availabilities, globalAvailabilities, selectedServiceId]);

  // ──────────────────────────────────────────────────────────────────────────
  // Service CRUD
  // ──────────────────────────────────────────────────────────────────────────
  const handleCreateService = async () => {
    if (!svcForm.service_name) return;
    const { data: newSvc, error: createErr } = await supabase.from('booking_services').insert({
      owner: userId,
      service_name: svcForm.service_name,
      duration: svcForm.duration,
      location: svcForm.location,
      description: svcForm.description,
      statut: 1,
    }).select('id').single();
    if (createErr) { console.error('Erreur création service:', createErr); alert('Erreur : ' + createErr.message); return; }

    // Auto-copy global settings to the new service
    if (newSvc && globalAvailabilities.length > 0) {
      const availRows = globalAvailabilities.map((a) => ({
        service_id: newSvc.id,
        day_of_week: a.day_of_week,
        start_time: a.start_time,
        end_time: a.end_time,
      }));
      await supabase.from('booking_availabilities').insert(availRows);
    }
    if (newSvc && globalBreaks.length > 0) {
      const breakRows = globalBreaks.map((b) => ({
        service_id: newSvc.id,
        day_of_week: b.day_of_week,
        start_time: b.start_time,
        end_time: b.end_time,
      }));
      await supabase.from('booking_breaks').insert(breakRows);
    }
    if (newSvc && globalHolidays.length > 0) {
      const holRows = globalHolidays.map((h) => ({
        service_id: newSvc.id,
        date_from: h.date_from,
        date_to: h.date_to,
        title: h.title,
      }));
      await supabase.from('booking_holidays').insert(holRows);
    }

    setShowSvcForm(false);
    setSvcForm({ service_name: '', duration: 30, location: '', description: '' });
    fetchAll();
  };

  const handleUpdateService = async (id: number) => {
    await supabase.from('booking_services').update({
      service_name: svcForm.service_name,
      duration: svcForm.duration,
      location: svcForm.location,
      description: svcForm.description,
    }).eq('id', id);
    setEditingService(null);
    setShowSvcForm(false);
    setSvcForm({ service_name: '', duration: 30, location: '', description: '' });
    fetchAll();
  };

  const handleDeleteService = async (id: number) => {
    await supabase.from('booking_services').update({ statut: 0 }).eq('id', id);
    if (selectedServiceId === id) setSelectedServiceId(null);
    fetchAll();
  };

  const startEditService = (svc: BookingService) => {
    setEditingService(svc.id);
    setSvcForm({ service_name: svc.service_name, duration: svc.duration || 30, location: svc.location || '', description: svc.description || '' });
    setShowSvcForm(true);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Availability CRUD (global or per-service)
  // ──────────────────────────────────────────────────────────────────────────
  const saveAvailabilities = async () => {
    const targetServiceId = selectedServiceId || 0;
    const { error: delErr } = await supabase.from('booking_availabilities').delete().eq('service_id', targetServiceId);
    if (delErr) { console.error('Erreur suppression disponibilités:', delErr); alert('Erreur lors de la sauvegarde : ' + delErr.message); return; }
    const rows = DAY_KEYS
      .filter((dk) => availDraft[dk]?.enabled)
      .map((dk) => ({
        service_id: targetServiceId,
        day_of_week: dk,
        start_time: availDraft[dk].start,
        end_time: availDraft[dk].end,
      }));
    if (rows.length > 0) {
      const { error: insErr } = await supabase.from('booking_availabilities').insert(rows);
      if (insErr) { console.error('Erreur insertion disponibilités:', insErr); alert('Erreur lors de la sauvegarde : ' + insErr.message); return; }
    }
    // Refetch
    if (targetServiceId === 0) {
      await fetchGlobalSettings();
    } else {
      await fetchServiceData(targetServiceId);
    }
  };

  const markWeekendOff = () => {
    setAvailDraft((prev: any) => {
      const next = { ...prev };
      ['saturday', 'sunday'].forEach((dk) => {
        next[dk] = { ...next[dk], enabled: false };
      });
      return next;
    });
  };

  const copyToAllDays = () => {
    const monday = availDraft['monday'];
    setAvailDraft((prev: any) => {
      const next = { ...prev };
      DAY_KEYS.forEach((dk) => {
        next[dk] = { ...monday };
      });
      return next;
    });
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Breaks CRUD (global or per-service)
  // ──────────────────────────────────────────────────────────────────────────
  const addBreak = async () => {
    const targetServiceId = selectedServiceId || 0;
    const { error } = await supabase.from('booking_breaks').insert({
      service_id: targetServiceId,
      day_of_week: breakForm.day_of_week,
      start_time: breakForm.start_time,
      end_time: breakForm.end_time,
    });
    if (error) { console.error('Erreur ajout pause:', error); alert('Erreur lors de l\'ajout : ' + error.message); return; }
    setShowBreakForm(false);
    setBreakForm({ day_of_week: 'monday', start_time: '12:00', end_time: '13:00' });
    if (targetServiceId === 0) {
      await fetchGlobalSettings();
    } else {
      await fetchServiceData(targetServiceId);
    }
  };

  const removeBreak = async (id: number) => {
    const targetServiceId = selectedServiceId || 0;
    const { error } = await supabase.from('booking_breaks').delete().eq('id', id);
    if (error) { console.error('Erreur suppression pause:', error); alert('Erreur : ' + error.message); return; }
    if (targetServiceId === 0) {
      await fetchGlobalSettings();
    } else {
      await fetchServiceData(targetServiceId);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Holidays CRUD (global or per-service)
  // ──────────────────────────────────────────────────────────────────────────
  const addHoliday = async () => {
    const targetServiceId = selectedServiceId || 0;
    if (!holidayForm.date_from || !holidayForm.date_to) return;
    const { error } = await supabase.from('booking_holidays').insert({
      service_id: targetServiceId,
      date_from: holidayForm.date_from,
      date_to: holidayForm.date_to,
      title: holidayForm.title || 'Indisponible',
    });
    if (error) { console.error('Erreur ajout congé:', error); alert('Erreur lors de l\'ajout : ' + error.message); return; }
    setShowHolidayForm(false);
    setHolidayForm({ date_from: '', date_to: '', title: '' });
    if (targetServiceId === 0) {
      await fetchGlobalSettings();
    } else {
      await fetchServiceData(targetServiceId);
    }
  };

  const removeHoliday = async (id: number) => {
    const targetServiceId = selectedServiceId || 0;
    const { error } = await supabase.from('booking_holidays').delete().eq('id', id);
    if (error) { console.error('Erreur suppression congé:', error); alert('Erreur : ' + error.message); return; }
    if (targetServiceId === 0) {
      await fetchGlobalSettings();
    } else {
      await fetchServiceData(targetServiceId);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Appointment status
  // ──────────────────────────────────────────────────────────────────────────
  const updateApptStatus = async (id: number, status: string) => {
    await supabase.from('booking_appointments').update({ status }).eq('id', id);
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    if (selectedAppt?.id === id) setSelectedAppt((prev: any) => prev ? { ...prev, status } : null);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Calendar helpers
  // ──────────────────────────────────────────────────────────────────────────
  const monday = getMonday(addDays(new Date(), weekOffset * 7));
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const weekDateStrs = weekDates.map(toDateStr);

  const apptsByDate: Record<string, Appointment[]> = {};
  appointments.forEach((a) => {
    if (!apptsByDate[a.date]) apptsByDate[a.date] = [];
    apptsByDate[a.date].push(a);
  });

  // Month view
  const firstOfMonth = new Date(calYear, calMonth, 1);
  const lastOfMonth = new Date(calYear, calMonth + 1, 0);
  const startPad = firstOfMonth.getDay() === 0 ? 6 : firstOfMonth.getDay() - 1;
  const monthDays: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) monthDays.push(null);
  for (let i = 1; i <= lastOfMonth.getDate(); i++) monthDays.push(i);

  const isHolidayDate = (dateStr: string) => {
    return mergedHolidays.some((h) => dateStr >= h.date_from && dateStr <= h.date_to);
  };

  const isWorkingDay = (dateStr: string) => {
    const d = new Date(dateStr);
    const dayKey = DAY_KEYS[(d.getDay() + 6) % 7];
    return mergedAvailabilities.some((a) => a.day_of_week === dayKey);
  };

  // ──────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <i className="ri-loader-4-line animate-spin text-3xl text-primary-500"></i>
      </div>
    );
  }

  const currentService = services.find((s) => s.id === selectedServiceId);
  const hasServices = services.length > 0;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">
            <i className="ri-calendar-schedule-line mr-2 text-primary-500"></i>
            ZCalendar
          </h2>
          <p className="text-sm text-foreground-500 mt-1">Système de réservation en ligne</p>
        </div>

        {/* Service selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-foreground-600 whitespace-nowrap">Service :</label>
          {hasServices ? (
            <select
              value={selectedServiceId ?? ''}
              onChange={(e) => setSelectedServiceId(Number(e.target.value))}
              className="px-3 py-2 text-sm border border-background-200/70 rounded-lg bg-background-50 text-foreground-800 cursor-pointer"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.service_name} ({s.duration} min)</option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-foreground-400 italic px-3 py-2">Aucun service</span>
          )}
        </div>
      </div>

      {/* ─── Global settings notice ─────────────────────────────────── */}
      {!selectedServiceId && (globalAvailabilities.length > 0 || globalBreaks.length > 0 || globalHolidays.length > 0) && (
        <div className="bg-accent-50 border border-accent-200/50 rounded-xl p-3 mb-5 flex items-start gap-3">
          <i className="ri-information-line text-accent-600 mt-0.5"></i>
          <div>
            <p className="text-sm font-medium text-accent-800">Paramètres globaux actifs</p>
            <p className="text-xs text-accent-600 mt-0.5">
              Les disponibilités et indisponibilités globales s'appliquent à tous vos services.
              Sélectionnez un service pour le personnaliser individuellement.
            </p>
          </div>
        </div>
      )}

      {/* ─── No services yet prompt ─────────────────────────────────── */}
      {!hasServices && (
        <div className="bg-background-50 border border-background-200/70 rounded-xl p-8 text-center mb-5">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent-50 flex items-center justify-center">
            <i className="ri-calendar-event-line text-3xl text-accent-600"></i>
          </div>
          <h3 className="text-lg font-semibold text-foreground-900 mb-2">Créez votre premier service</h3>
          <p className="text-sm text-foreground-500 mb-6 max-w-md mx-auto">
            Configurez d'abord vos disponibilités globales ci-dessous, puis créez votre premier service — il héritera automatiquement de vos réglages.
          </p>
          <button
            onClick={() => setShowSvcForm(true)}
            className="px-6 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 transition-colors whitespace-nowrap"
          >
            <i className="ri-add-line mr-1.5"></i>
            Créer un service
          </button>
        </div>
      )}

      {/* Tabs — always visible */}
      <div className="flex items-center gap-1 bg-background-100 rounded-full p-1 mb-6 w-fit">
        {([
          { key: 'calendar' as TabKey, icon: 'ri-calendar-line', label: 'Calendrier' },
          { key: 'availability' as TabKey, icon: 'ri-time-line', label: 'Disponibilités' },
          { key: 'unavailability' as TabKey, icon: 'ri-close-circle-line', label: 'Indisponibilités' },
          { key: 'services' as TabKey, icon: 'ri-list-settings-line', label: 'Services' },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium cursor-pointer whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-background-50 text-foreground-950 shadow-sm'
                : 'text-foreground-500 hover:text-foreground-700'
            }`}
          >
            <i className={`${tab.icon} text-base`}></i>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ─── Tab: Calendar ─────────────────────────────────────────── */}
      {activeTab === 'calendar' && (
        hasServices ? (
          <CalendarTab
            monthView={monthView}
            setMonthView={setMonthView}
            weekOffset={weekOffset}
            setWeekOffset={setWeekOffset}
            weekDates={weekDates}
            weekDateStrs={weekDateStrs}
            apptsByDate={apptsByDate}
            availabilities={mergedAvailabilities}
            holidays={mergedHolidays}
            breaks={mergedBreaks}
            calMonth={calMonth}
            calYear={calYear}
            setCalMonth={setCalMonth}
            setCalYear={setCalYear}
            monthDays={monthDays}
            isHolidayDate={isHolidayDate}
            isWorkingDay={isWorkingDay}
            selectedAppt={selectedAppt}
            setSelectedAppt={setSelectedAppt}
            updateApptStatus={updateApptStatus}
          />
        ) : (
          <div className="bg-background-50 border border-background-200/70 rounded-xl p-10 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-background-100 flex items-center justify-center">
              <i className="ri-calendar-line text-3xl text-foreground-300"></i>
            </div>
            <h3 className="text-base font-semibold text-foreground-700 mb-2">Aucun service à afficher</h3>
            <p className="text-sm text-foreground-500 max-w-md mx-auto mb-5">
              Créez un service dans l'onglet Services pour visualiser le calendrier des rendez-vous.
            </p>
            <button
              onClick={() => setActiveTab('services')}
              className="px-5 py-2 bg-secondary-50 text-secondary-700 rounded-full text-sm font-medium cursor-pointer hover:bg-secondary-100 transition-colors whitespace-nowrap"
            >
              <i className="ri-list-settings-line mr-1.5"></i>Aller aux services
            </button>
          </div>
        )
      )}

      {/* ─── Tab: Availability ─────────────────────────────────────── */}
      {activeTab === 'availability' && (
        <AvailabilityTab
          availDraft={availDraft}
          setAvailDraft={setAvailDraft}
          saveAvailabilities={saveAvailabilities}
          markWeekendOff={markWeekendOff}
          copyToAllDays={copyToAllDays}
          isGlobal={!selectedServiceId}
          serviceName={currentService?.service_name}
        />
      )}

      {/* ─── Tab: Unavailability ───────────────────────────────────── */}
      {activeTab === 'unavailability' && (
        <UnavailabilityTab
          breaks={selectedServiceId ? breaks : globalBreaks}
          holidays={selectedServiceId ? holidays : globalHolidays}
          breakForm={breakForm}
          setBreakForm={setBreakForm}
          showBreakForm={showBreakForm}
          setShowBreakForm={setShowBreakForm}
          addBreak={addBreak}
          removeBreak={removeBreak}
          holidayForm={holidayForm}
          setHolidayForm={setHolidayForm}
          showHolidayForm={showHolidayForm}
          setShowHolidayForm={setShowHolidayForm}
          addHoliday={addHoliday}
          removeHoliday={removeHoliday}
          isGlobal={!selectedServiceId}
          serviceName={currentService?.service_name}
        />
      )}

      {/* ─── Tab: Services ─────────────────────────────────────────── */}
      {activeTab === 'services' && (
        <ServicesTab
          services={services}
          svcForm={svcForm}
          setSvcForm={setSvcForm}
          showSvcForm={showSvcForm}
          setShowSvcForm={setShowSvcForm}
          editingService={editingService}
          setEditingService={setEditingService}
          handleCreateService={handleCreateService}
          handleUpdateService={handleUpdateService}
          handleDeleteService={handleDeleteService}
          startEditService={startEditService}
          selectedServiceId={selectedServiceId}
          setSelectedServiceId={setSelectedServiceId}
          userDomain={userDomain}
          copiedId={copiedId}
          setCopiedId={setCopiedId}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Calendar Tab
// ══════════════════════════════════════════════════════════════════════════════
function CalendarTab({
  monthView, setMonthView, weekOffset, setWeekOffset, weekDates, weekDateStrs,
  apptsByDate, availabilities, holidays, breaks, calMonth, calYear, setCalMonth, setCalYear,
  monthDays, isHolidayDate, isWorkingDay, selectedAppt, setSelectedAppt, updateApptStatus,
}: any) {
  const todayStr = toDateStr(new Date());
  const timeSlots = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

  return (
    <div>
      {/* Week navigator */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setWeekOffset((w: number) => w - 1)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-background-100 hover:bg-background-200/70 cursor-pointer transition-colors"
          >
            <i className="ri-arrow-left-s-line text-foreground-600"></i>
          </button>
          {!monthView && (
            <h3 className="text-sm font-semibold text-foreground-800">
              {formatDateFr(weekDateStrs[0])} – {formatDateFr(weekDateStrs[6])}
            </h3>
          )}
          {monthView && (
            <h3 className="text-sm font-semibold text-foreground-800">
              {new Date(calYear, calMonth).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </h3>
          )}
          <button
            onClick={() => setWeekOffset((w: number) => w + 1)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-background-100 hover:bg-background-200/70 cursor-pointer transition-colors"
          >
            <i className="ri-arrow-right-s-line text-foreground-600"></i>
          </button>
          <button
            onClick={() => { setWeekOffset(0); setCalMonth(new Date().getMonth()); setCalYear(new Date().getFullYear()); }}
            className="px-3 py-1 text-xs bg-background-100 text-foreground-600 rounded-full cursor-pointer hover:bg-background-200/70 whitespace-nowrap"
          >
            Aujourd'hui
          </button>
        </div>
        <div className="flex items-center gap-1 bg-background-100 rounded-full p-0.5">
          <button
            onClick={() => setMonthView(false)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${!monthView ? 'bg-background-50 text-foreground-900 shadow-sm' : 'text-foreground-500'}`}
          >
            <i className="ri-calendar-line mr-1"></i>Semaine
          </button>
          <button
            onClick={() => setMonthView(true)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${monthView ? 'bg-background-50 text-foreground-900 shadow-sm' : 'text-foreground-500'}`}
          >
            <i className="ri-calendar-2-line mr-1"></i>Mois
          </button>
        </div>
      </div>

      {/* Week View */}
      {!monthView && (
        <div className="bg-background-50 border border-background-200/70 rounded-xl overflow-hidden">
          <div className="grid grid-cols-8 border-b border-background-200/70">
            <div className="p-2 text-center text-xs text-foreground-400 font-medium border-r border-background-200/70"></div>
            {weekDates.map((d: Date, i: number) => {
              const dateStr = weekDateStrs[i];
              const isToday = dateStr === todayStr;
              const holiday = holidays.find((h: any) => dateStr >= h.date_from && dateStr <= h.date_to);
              const isWD = availabilities.some((a: any) => a.day_of_week === DAY_KEYS[(d.getDay() + 6) % 7]);
              const count = (apptsByDate[dateStr] || []).length;
              return (
                <div
                  key={dateStr}
                  className={`p-2 text-center border-r border-background-200/70 last:border-r-0 ${isToday ? 'bg-primary-50' : ''} ${!isWD ? 'bg-background-100/70' : ''}`}
                >
                  <div className="text-[10px] font-medium text-foreground-400">{SHORT_DAYS[i]}</div>
                  <div className={`text-sm font-bold mt-0.5 ${isToday ? 'text-primary-700' : 'text-foreground-800'}`}>{d.getDate()}</div>
                  {holiday && <div className="text-[9px] text-amber-600 mt-0.5 truncate max-w-[80px]">{holiday.title}</div>}
                  {count > 0 && <div className="text-[10px] text-accent-600 mt-0.5">{count} RDV</div>}
                </div>
              );
            })}
          </div>
          <div className="overflow-y-auto max-h-[600px]">
            {timeSlots.map((slot) => (
              <div key={slot} className="grid grid-cols-8 border-b border-background-100">
                <div className="p-1.5 text-center text-[10px] text-foreground-400 border-r border-background-100 flex items-center justify-center">
                  {slot}
                </div>
                {weekDateStrs.map((dateStr: string) => {
                  const dayAppts = (apptsByDate[dateStr] || []).filter((a: Appointment) => {
                    const apptHour = a.time?.slice(0, 2);
                    const slotHour = slot.slice(0, 2);
                    return apptHour === slotHour;
                  });
                  return (
                    <div key={dateStr + slot} className="p-0.5 border-r border-background-100 last:border-r-0 min-h-[36px]">
                      {dayAppts.map((appt: Appointment) => (
                        <button
                          key={appt.id}
                          onClick={() => setSelectedAppt(appt)}
                          className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] leading-tight cursor-pointer transition-colors hover:opacity-80 ${
                            appt.status === 'confirmed' ? 'bg-accent-100 text-accent-800' :
                            appt.status === 'cancelled' ? 'bg-red-100 text-red-800 line-through' :
                            appt.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-amber-100 text-amber-800'
                          }`}
                        >
                          <span className="font-medium">{appt.time?.slice(0, 5)}</span>{' '}
                          <span className="truncate">{appt.fullname}</span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Month View */}
      {monthView && (
        <div className="bg-background-50 border border-background-200/70 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-background-200/70">
            <button
              onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-background-100 hover:bg-background-200/70 cursor-pointer"
            >
              <i className="ri-arrow-left-s-line"></i>
            </button>
            <span className="text-sm font-semibold text-foreground-800">
              {new Date(calYear, calMonth).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-background-100 hover:bg-background-200/70 cursor-pointer"
            >
              <i className="ri-arrow-right-s-line"></i>
            </button>
          </div>
          <div className="grid grid-cols-7 border-b border-background-200/70">
            {SHORT_DAYS.map((d) => (
              <div key={d} className="p-2 text-center text-[11px] font-medium text-foreground-400 border-r border-background-100 last:border-r-0">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map((day: number | null, i: number) => {
              if (day === null) return <div key={`empty-${i}`} className="aspect-square border-b border-r border-background-100 p-1"></div>;
              const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isToday = dateStr === todayStr;
              const isHol = isHolidayDate(dateStr);
              const isWD = isWorkingDay(dateStr);
              const dayAppts = apptsByDate[dateStr] || [];
              return (
                <div
                  key={dateStr}
                  className={`aspect-square border-b border-r border-background-100 p-1 overflow-hidden ${isToday ? 'bg-primary-50' : ''} ${!isWD ? 'bg-background-100/50' : ''}`}
                >
                  <div className={`text-xs font-semibold mb-0.5 ${isToday ? 'text-primary-700' : 'text-foreground-600'}`}>{day}</div>
                  {isHol && <div className="text-[9px] text-amber-600 truncate">Fermé</div>}
                  {dayAppts.slice(0, 2).map((appt: Appointment) => (
                    <button
                      key={appt.id}
                      onClick={() => setSelectedAppt(appt)}
                      className={`block w-full text-left px-1 py-0.5 rounded text-[9px] leading-tight truncate cursor-pointer hover:opacity-80 mb-0.5 ${
                        appt.status === 'confirmed' ? 'bg-accent-100 text-accent-800' : 'bg-background-100 text-foreground-500'
                      }`}
                    >
                      {appt.time?.slice(0, 5)} {appt.fullname}
                    </button>
                  ))}
                  {dayAppts.length > 2 && <div className="text-[9px] text-foreground-400">+{dayAppts.length - 2}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Appointment detail modal */}
      {selectedAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedAppt(null)}>
          <div
            className="bg-background-50 rounded-xl p-6 w-full max-w-md mx-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="text-base font-semibold text-foreground-900">{selectedAppt.fullname}</h4>
                <p className="text-xs text-foreground-500">{selectedAppt.email}</p>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selectedAppt.status] || 'bg-background-100 text-foreground-500'}`}>
                {STATUS_LABELS[selectedAppt.status] || selectedAppt.status}
              </span>
            </div>
            <div className="space-y-2 mb-4 text-sm">
              <div className="flex items-center gap-2 text-foreground-600">
                <i className="ri-calendar-line w-4 text-center"></i>
                <span>{formatDateFr(selectedAppt.date)} à {formatTime(selectedAppt.time)}</span>
              </div>
              {selectedAppt.phone && (
                <div className="flex items-center gap-2 text-foreground-600">
                  <i className="ri-phone-line w-4 text-center"></i>
                  <span>{selectedAppt.phone}</span>
                </div>
              )}
              {selectedAppt.message && (
                <div className="flex items-start gap-2 text-foreground-600">
                  <i className="ri-message-2-line w-4 text-center mt-0.5"></i>
                  <span className="text-xs">{selectedAppt.message}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => updateApptStatus(selectedAppt.id, 'confirmed')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer whitespace-nowrap transition-colors ${selectedAppt.status === 'confirmed' ? 'bg-accent-500 text-white' : 'bg-accent-50 text-accent-700 hover:bg-accent-100'}`}
              >
                <i className="ri-check-line mr-1"></i>Confirmé
              </button>
              <button
                onClick={() => updateApptStatus(selectedAppt.id, 'completed')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer whitespace-nowrap transition-colors ${selectedAppt.status === 'completed' ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
              >
                <i className="ri-check-double-line mr-1"></i>Terminé
              </button>
              <button
                onClick={() => updateApptStatus(selectedAppt.id, 'cancelled')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer whitespace-nowrap transition-colors ${selectedAppt.status === 'cancelled' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
              >
                <i className="ri-close-line mr-1"></i>Annulé
              </button>
            </div>
            <button
              onClick={() => setSelectedAppt(null)}
              className="mt-4 w-full py-2 bg-background-100 text-foreground-600 rounded-full text-sm cursor-pointer hover:bg-background-200/70 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Availability Tab
// ══════════════════════════════════════════════════════════════════════════════
function AvailabilityTab({ availDraft, setAvailDraft, saveAvailabilities, markWeekendOff, copyToAllDays, isGlobal, serviceName }: any) {
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await saveAvailabilities();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Scope indicator */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${isGlobal ? 'bg-accent-50 text-accent-700' : 'bg-secondary-50 text-secondary-700'}`}>
        <i className={`${isGlobal ? 'ri-global-line' : 'ri-building-2-line'} text-sm`}></i>
        {isGlobal ? 'Disponibilités globales — appliquées à tous les services' : `Disponibilités pour : ${serviceName || 'Ce service'}`}
      </div>

      <div className="bg-background-50 border border-background-200/70 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground-900">
            <i className="ri-time-line mr-1.5 text-primary-500"></i>
            Horaires de disponibilité
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={copyToAllDays}
              className="px-3 py-1.5 text-xs bg-secondary-50 text-secondary-700 rounded-full cursor-pointer hover:bg-secondary-100 transition-colors whitespace-nowrap"
            >
              <i className="ri-file-copy-line mr-1"></i>Appliquer lundi à tous
            </button>
            <button
              onClick={markWeekendOff}
              className="px-3 py-1.5 text-xs bg-amber-50 text-amber-700 rounded-full cursor-pointer hover:bg-amber-100 transition-colors whitespace-nowrap"
            >
              <i className="ri-moon-line mr-1"></i>Week-end off
            </button>
          </div>
        </div>
        <p className="text-xs text-foreground-500 mb-5">
          Activez les jours où vous acceptez les réservations et définissez vos plages horaires.
          {isGlobal && ' Ces horaires seront appliqués par défaut à tous vos nouveaux services.'}
        </p>
        <div className="space-y-3">
          {DAY_KEYS.map((dk, i) => {
            const d = availDraft[dk] || { enabled: false, start: '09:00', end: '17:00' };
            const isWeekend = dk === 'saturday' || dk === 'sunday';
            return (
              <div key={dk} className={`flex items-center gap-4 p-3 rounded-lg ${isWeekend && !d.enabled ? 'bg-background-100/50' : 'bg-background-50'} border border-transparent hover:border-background-200/70 transition-colors`}>
                <label className="flex items-center gap-3 cursor-pointer min-w-[120px]">
                  <input
                    type="checkbox"
                    checked={d.enabled}
                    onChange={(e) => setAvailDraft((prev: any) => {
                      const next = { ...prev };
                      next[dk] = { ...next[dk], enabled: e.target.checked };
                      return next;
                    })}
                    className="w-4 h-4 rounded border-background-300 accent-primary-500 cursor-pointer"
                  />
                  <span className={`text-sm font-medium ${d.enabled ? 'text-foreground-800' : 'text-foreground-400'}`}>
                    {DAYS_OF_WEEK[i]}
                    {isWeekend && <span className="text-[10px] text-foreground-400 ml-1">(week-end)</span>}
                  </span>
                </label>
                {d.enabled && (
                  <div className="flex items-center gap-2 ml-auto">
                    <input
                      type="time"
                      value={d.start}
                      onChange={(e) => setAvailDraft((prev: any) => {
                        const next = { ...prev };
                        next[dk] = { ...next[dk], start: e.target.value };
                        return next;
                      })}
                      className="px-2 py-1.5 text-sm border border-background-200/70 rounded-lg bg-background-50 text-foreground-800 w-[120px]"
                    />
                    <span className="text-xs text-foreground-400">à</span>
                    <input
                      type="time"
                      value={d.end}
                      onChange={(e) => setAvailDraft((prev: any) => {
                        const next = { ...prev };
                        next[dk] = { ...next[dk], end: e.target.value };
                        return next;
                      })}
                      className="px-2 py-1.5 text-sm border border-background-200/70 rounded-lg bg-background-50 text-foreground-800 w-[120px]"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button
          onClick={handleSave}
          className="mt-5 px-6 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 transition-colors whitespace-nowrap"
        >
          {saved ? (
            <><i className="ri-check-line mr-1"></i>Enregistré !</>
          ) : (
            <><i className="ri-save-line mr-1"></i>Enregistrer les disponibilités</>
          )}
        </button>
      </div>

      {/* Preview */}
      <div className="bg-background-50 border border-background-200/70 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-foreground-900 mb-3">
          <i className="ri-eye-line mr-1.5 text-accent-500"></i>
          Aperçu de la semaine
        </h4>
        <div className="grid grid-cols-7 gap-2">
          {DAY_KEYS.map((dk, i) => {
            const d = availDraft[dk];
            return (
              <div key={dk} className="text-center p-2 rounded-lg bg-background-100">
                <div className="text-[10px] font-medium text-foreground-500 mb-1">{SHORT_DAYS[i]}</div>
                {d?.enabled ? (
                  <div className="text-[11px] font-semibold text-accent-700">{d.start}–{d.end}</div>
                ) : (
                  <div className="text-[10px] text-foreground-400 italic">Indisponible</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Unavailability Tab
// ══════════════════════════════════════════════════════════════════════════════
function UnavailabilityTab({
  breaks, holidays, breakForm, setBreakForm, showBreakForm, setShowBreakForm,
  addBreak, removeBreak, holidayForm, setHolidayForm, showHolidayForm, setShowHolidayForm,
  addHoliday, removeHoliday, isGlobal, serviceName,
}: any) {
  return (
    <div className="space-y-8">
      {/* Scope indicator */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${isGlobal ? 'bg-accent-50 text-accent-700' : 'bg-secondary-50 text-secondary-700'}`}>
        <i className={`${isGlobal ? 'ri-global-line' : 'ri-building-2-line'} text-sm`}></i>
        {isGlobal ? 'Indisponibilités globales — appliquées à tous les services' : `Indisponibilités pour : ${serviceName || 'Ce service'}`}
      </div>

      {/* Section: Breaks */}
      <div className="bg-background-50 border border-background-200/70 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground-900">
            <i className="ri-cup-line mr-1.5 text-amber-500"></i>
            Pauses & créneaux indisponibles
          </h3>
          <button
            onClick={() => setShowBreakForm(!showBreakForm)}
            className="px-4 py-1.5 bg-secondary-50 text-secondary-700 rounded-full text-xs font-medium cursor-pointer hover:bg-secondary-100 transition-colors whitespace-nowrap"
          >
            <i className="ri-add-line mr-1"></i>Ajouter une pause
          </button>
        </div>
        <p className="text-xs text-foreground-500 mb-4">
          Définissez des plages horaires pendant lesquelles vous n'êtes pas disponible (pause déjeuner, réunion, etc.)
          {isGlobal && ' — Ces pauses s\'appliqueront à tous vos services.'}
        </p>

        {showBreakForm && (
          <div className="flex items-end gap-3 p-4 bg-background-100 rounded-lg mb-4 flex-wrap">
            <div>
              <label className="block text-[10px] font-medium text-foreground-500 mb-1">Jour</label>
              <select
                value={breakForm.day_of_week}
                onChange={(e) => setBreakForm({ ...breakForm, day_of_week: e.target.value })}
                className="px-2 py-1.5 text-sm border border-background-200/70 rounded-lg bg-background-50 text-foreground-800 cursor-pointer"
              >
                {DAY_KEYS.map((dk, i) => <option key={dk} value={dk}>{DAYS_OF_WEEK[i]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-foreground-500 mb-1">Début</label>
              <input type="time" value={breakForm.start_time} onChange={(e) => setBreakForm({ ...breakForm, start_time: e.target.value })} className="px-2 py-1.5 text-sm border border-background-200/70 rounded-lg bg-background-50 w-[120px]" />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-foreground-500 mb-1">Fin</label>
              <input type="time" value={breakForm.end_time} onChange={(e) => setBreakForm({ ...breakForm, end_time: e.target.value })} className="px-2 py-1.5 text-sm border border-background-200/70 rounded-lg bg-background-50 w-[120px]" />
            </div>
            <button onClick={addBreak} className="px-4 py-1.5 bg-primary-500 text-background-50 rounded-full text-xs font-medium cursor-pointer hover:bg-primary-600 whitespace-nowrap">Ajouter</button>
            <button onClick={() => setShowBreakForm(false)} className="px-4 py-1.5 bg-background-100 text-foreground-500 rounded-full text-xs cursor-pointer">Annuler</button>
          </div>
        )}

        {breaks.length === 0 ? (
          <div className="text-center py-6 text-xs text-foreground-400">
            <i className="ri-cup-line text-2xl block mb-1"></i>
            Aucune pause définie
          </div>
        ) : (
          <div className="space-y-2">
            {breaks.map((b: BreakSlot) => (
              <div key={b.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg group">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-foreground-700 w-20">{DAYS_OF_WEEK[DAY_KEYS.indexOf(b.day_of_week)] || b.day_of_week}</span>
                  <span className="text-sm font-semibold text-amber-800">{formatTime(b.start_time)} – {formatTime(b.end_time)}</span>
                </div>
                <button
                  onClick={() => removeBreak(b.id)}
                  className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-full bg-red-50 text-red-500 cursor-pointer hover:bg-red-100 transition-all"
                >
                  <i className="ri-delete-bin-line text-xs"></i>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section: Holidays */}
      <div className="bg-background-50 border border-background-200/70 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground-900">
            <i className="ri-calendar-close-line mr-1.5 text-red-500"></i>
            Jours fériés & congés
          </h3>
          <button
            onClick={() => setShowHolidayForm(!showHolidayForm)}
            className="px-4 py-1.5 bg-secondary-50 text-secondary-700 rounded-full text-xs font-medium cursor-pointer hover:bg-secondary-100 transition-colors whitespace-nowrap"
          >
            <i className="ri-add-line mr-1"></i>Ajouter une période
          </button>
        </div>
        <p className="text-xs text-foreground-500 mb-4">
          Bloquez des plages de dates entières (vacances, jours fériés, congés).
          {isGlobal && ' Ces périodes s\'appliqueront à tous vos services.'}
        </p>

        {showHolidayForm && (
          <div className="flex items-end gap-3 p-4 bg-background-100 rounded-lg mb-4 flex-wrap">
            <div>
              <label className="block text-[10px] font-medium text-foreground-500 mb-1">Du</label>
              <input type="date" value={holidayForm.date_from} onChange={(e) => setHolidayForm({ ...holidayForm, date_from: e.target.value })} className="px-2 py-1.5 text-sm border border-background-200/70 rounded-lg bg-background-50" />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-foreground-500 mb-1">Au</label>
              <input type="date" value={holidayForm.date_to} onChange={(e) => setHolidayForm({ ...holidayForm, date_to: e.target.value })} className="px-2 py-1.5 text-sm border border-background-200/70 rounded-lg bg-background-50" />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-foreground-500 mb-1">Motif</label>
              <input type="text" value={holidayForm.title} onChange={(e) => setHolidayForm({ ...holidayForm, title: e.target.value })} placeholder="Ex: Vacances d'été" className="px-2 py-1.5 text-sm border border-background-200/70 rounded-lg bg-background-50 w-[180px]" />
            </div>
            <button onClick={addHoliday} className="px-4 py-1.5 bg-primary-500 text-background-50 rounded-full text-xs font-medium cursor-pointer hover:bg-primary-600 whitespace-nowrap">Ajouter</button>
            <button onClick={() => setShowHolidayForm(false)} className="px-4 py-1.5 bg-background-100 text-foreground-500 rounded-full text-xs cursor-pointer">Annuler</button>
          </div>
        )}

        {holidays.length === 0 ? (
          <div className="text-center py-6 text-xs text-foreground-400">
            <i className="ri-calendar-close-line text-2xl block mb-1"></i>
            Aucune période d'indisponibilité
          </div>
        ) : (
          <div className="space-y-2">
            {holidays.map((h: Holiday) => (
              <div key={h.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg group">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-red-800">{h.title}</span>
                  <span className="text-xs text-red-600">{formatDateFr(h.date_from)} → {formatDateFr(h.date_to)}</span>
                </div>
                <button
                  onClick={() => removeHoliday(h.id)}
                  className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-full bg-red-100 text-red-500 cursor-pointer hover:bg-red-200 transition-all"
                >
                  <i className="ri-delete-bin-line text-xs"></i>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Services Tab
// ══════════════════════════════════════════════════════════════════════════════
function ServicesTab({
  services, svcForm, setSvcForm, showSvcForm, setShowSvcForm,
  editingService, setEditingService, handleCreateService, handleUpdateService,
  handleDeleteService, startEditService, selectedServiceId, setSelectedServiceId,
  userDomain, copiedId, setCopiedId,
}: any) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground-900">
          <i className="ri-list-settings-line mr-1.5 text-primary-500"></i>
          Vos services de réservation
        </h3>
        <button
          onClick={() => { setEditingService(null); setShowSvcForm(true); setSvcForm({ service_name: '', duration: 30, location: '', description: '' }); }}
          className="px-4 py-1.5 bg-primary-500 text-background-50 rounded-full text-xs font-medium cursor-pointer hover:bg-primary-600 transition-colors whitespace-nowrap"
        >
          <i className="ri-add-line mr-1"></i>Nouveau service
        </button>
      </div>

      {showSvcForm && (
        <div className="bg-background-50 border border-background-200/70 rounded-xl p-5">
          <ServiceForm
            svcForm={svcForm}
            setSvcForm={setSvcForm}
            onSave={editingService ? () => handleUpdateService(editingService) : handleCreateService}
            onCancel={() => { setShowSvcForm(false); setEditingService(null); setSvcForm({ service_name: '', duration: 30, location: '', description: '' }); }}
            saveLabel={editingService ? 'Mettre à jour' : 'Créer le service'}
          />
        </div>
      )}

      {services.length === 0 && !showSvcForm ? (
        <div className="text-center py-10 text-foreground-400 text-sm">
          <i className="ri-service-line text-3xl block mb-2"></i>
          Aucun service créé
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((svc: BookingService) => (
            <div
              key={svc.id}
              className={`bg-background-50 border rounded-xl p-4 transition-colors group ${
                selectedServiceId === svc.id ? 'border-primary-300 ring-1 ring-primary-200' : 'border-background-200/70 hover:border-background-300/70'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-foreground-900 truncate">{svc.service_name}</h4>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-xs text-accent-700 bg-accent-50 px-2 py-0.5 rounded-full font-medium">{svc.duration} min</span>
                    {svc.location && <span className="text-xs text-foreground-500 truncate"><i className="ri-map-pin-line mr-0.5"></i>{svc.location}</span>}
                  </div>
                </div>
              </div>
              {svc.description && <p className="text-xs text-foreground-500 mb-3 line-clamp-2">{svc.description}</p>}

              {/* Action buttons row */}
              <div className="flex items-center gap-1.5 pt-3 border-t border-background-200/70 flex-wrap">
                <button
                  onClick={() => startEditService(svc)}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-secondary-50 text-secondary-600 cursor-pointer hover:bg-secondary-100 transition-colors"
                  title="Modifier"
                >
                  <i className="ri-pencil-line text-xs"></i>
                </button>
                <button
                  onClick={() => { if (confirm('Supprimer ce service ? Les disponibilités et rendez-vous associés seront conservés.')) handleDeleteService(svc.id); }}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-red-50 text-red-500 cursor-pointer hover:bg-red-100 transition-colors"
                  title="Supprimer"
                >
                  <i className="ri-delete-bin-line text-xs"></i>
                </button>
                {selectedServiceId !== svc.id && (
                  <button
                    onClick={() => setSelectedServiceId(svc.id)}
                    className="px-2 py-1 text-[10px] bg-primary-50 text-primary-600 rounded-full cursor-pointer hover:bg-primary-100 transition-colors whitespace-nowrap"
                  >
                    Sélectionner
                  </button>
                )}
                <button
                  onClick={async () => {
                    const origin = userDomain
                      ? `https://${userDomain}`
                      : window.location.origin;
                    const publicUrl = `${origin}/booking/${svc.id}`;
                    try {
                      await navigator.clipboard.writeText(publicUrl);
                      setCopiedId(svc.id);
                      setTimeout(() => setCopiedId(null), 2000);
                    } catch {
                      window.open(publicUrl, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ml-auto ${
                    copiedId === svc.id
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'text-foreground-500 hover:text-foreground-700 hover:bg-background-100'
                  }`}
                  title="Copier le lien de réservation"
                >
                  <i className={`text-xs ${copiedId === svc.id ? 'ri-check-line' : 'ri-link'}`}></i>
                  {copiedId === svc.id ? 'Lien copié !' : 'Partager'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Service Form (shared)
// ══════════════════════════════════════════════════════════════════════════════
function ServiceForm({ svcForm, setSvcForm, onSave, onCancel, saveLabel }: any) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-foreground-900">
        <i className="ri-settings-3-line mr-1.5 text-primary-500"></i>
        {saveLabel}
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">Nom du service *</label>
          <input
            type="text"
            value={svcForm.service_name}
            onChange={(e) => setSvcForm({ ...svcForm, service_name: e.target.value })}
            placeholder="Ex: Consultation 30 min"
            className="w-full px-3 py-2 text-sm border border-background-200/70 rounded-lg bg-background-50 text-foreground-800 focus:outline-none focus:border-primary-300"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">Durée (minutes)</label>
          <select
            value={svcForm.duration}
            onChange={(e) => setSvcForm({ ...svcForm, duration: Number(e.target.value) })}
            className="w-full px-3 py-2 text-sm border border-background-200/70 rounded-lg bg-background-50 text-foreground-800 cursor-pointer"
          >
            {[10, 15, 20, 30, 45, 60, 90, 120].map((d) => <option key={d} value={d}>{d} minutes</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-foreground-600 mb-1">Lieu</label>
          <input
            type="text"
            value={svcForm.location}
            onChange={(e) => setSvcForm({ ...svcForm, location: e.target.value })}
            placeholder="Ex: En ligne (Zoom), 123 rue de Paris, Téléphone..."
            className="w-full px-3 py-2 text-sm border border-background-200/70 rounded-lg bg-background-50 text-foreground-800 focus:outline-none focus:border-primary-300"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-foreground-600 mb-1">Description</label>
          <textarea
            value={svcForm.description}
            onChange={(e) => setSvcForm({ ...svcForm, description: e.target.value })}
            placeholder="Décrivez votre service..."
            rows={2}
            className="w-full px-3 py-2 text-sm border border-background-200/70 rounded-lg bg-background-50 text-foreground-800 resize-none focus:outline-none focus:border-primary-300"
          />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={onSave} className="px-6 py-2 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 transition-colors whitespace-nowrap">
          {saveLabel}
        </button>
        <button onClick={onCancel} className="px-4 py-2 bg-background-100 text-foreground-600 rounded-full text-sm cursor-pointer hover:bg-background-200/70 transition-colors whitespace-nowrap">
          Annuler
        </button>
      </div>
    </div>
  );
}