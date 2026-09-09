import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────
interface BookingService {
  id: number;
  owner: number;
  service_name: string;
  duration: number;
  location: string;
  description: string;
}

interface Availability {
  id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
}

interface BreakSlot {
  id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
}

interface Holiday {
  id: number;
  date_from: string;
  date_to: string;
  title: string;
}

interface Appointment {
  id: number;
  date: string;
  time: string;
}

interface OwnerInfo {
  name: string;
  email: string;
  nomcommerce: string;
  image: string;
}

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const SHORT_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function toDateStr(d: Date) { return d.toISOString().split('T')[0]; }
function toTimeStr(d: Date) { return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
function parseTime(t: string) { const [h, m] = t.slice(0, 5).split(':').map(Number); return { h, m, total: h * 60 + m }; }
function formatDateFr(d: string) { return new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
function addMinutes(timeStr: string, mins: number) {
  const total = parseTime(timeStr).total + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
function timeOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return parseTime(aStart).total < parseTime(bEnd).total && parseTime(aEnd).total > parseTime(bStart).total;
}

// ══════════════════════════════════════════════════════════════════════════════
export default function BookingPage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();

  const [service, setService] = useState<BookingService | null>(null);
  const [owner, setOwner] = useState<OwnerInfo | null>(null);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [breaks, setBreaks] = useState<BreakSlot[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Calendar state
  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'pick' | 'form'>('pick');

  // ── Form state
  const [formData, setFormData] = useState({ fullname: '', email: '', phone: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  // ── Fetch all data
  useEffect(() => {
    if (!serviceId) { setError('Service non spécifié'); setLoading(false); return; }
    const fetchData = async () => {
      try {
        // Fetch service
        const { data: svc, error: svcErr } = await supabase.from('booking_services').select('*').eq('id', Number(serviceId)).eq('statut', 1).maybeSingle();
        if (svcErr || !svc) { setError('Service introuvable ou désactivé'); setLoading(false); return; }
        setService(svc as BookingService);

        // Fetch owner
        const { data: ownerData } = await supabase.from('users').select('name, email, nomcommerce, image').eq('id', svc.owner).maybeSingle();
        if (ownerData) setOwner(ownerData as OwnerInfo);

        // Fetch availabilities, breaks, holidays, appointments (service-specific + global)
        const [avRes, brRes, hoRes, apRes, avGlobalRes, brGlobalRes, hoGlobalRes] = await Promise.all([
          supabase.from('booking_availabilities').select('*').eq('service_id', svc.id),
          supabase.from('booking_breaks').select('*').eq('service_id', svc.id),
          supabase.from('booking_holidays').select('*').eq('service_id', svc.id),
          supabase.from('booking_appointments').select('id, date, time').eq('service_id', svc.id).neq('status', 'cancelled'),
          supabase.from('booking_availabilities').select('*').eq('service_id', 0),
          supabase.from('booking_breaks').select('*').eq('service_id', 0),
          supabase.from('booking_holidays').select('*').eq('service_id', 0),
        ]);

        // Merge: per-service overrides global (by day_of_week for avail, by key for breaks/holidays)
        const mergedAvail = new Map<string, Availability>();
        (avGlobalRes.data || []).forEach((a: any) => mergedAvail.set(a.day_of_week, a));
        (avRes.data || []).forEach((a: any) => mergedAvail.set(a.day_of_week, a));

        const mergedBr = new Map<string, BreakSlot>();
        (brGlobalRes.data || []).forEach((b: any) => mergedBr.set(`${b.day_of_week}-${b.start_time}-${b.end_time}`, b));
        (brRes.data || []).forEach((b: any) => mergedBr.set(`${b.day_of_week}-${b.start_time}-${b.end_time}`, b));

        const mergedHol = new Map<string, Holiday>();
        (hoGlobalRes.data || []).forEach((h: any) => mergedHol.set(`${h.date_from}-${h.date_to}`, h));
        (hoRes.data || []).forEach((h: any) => mergedHol.set(`${h.date_from}-${h.date_to}`, h));

        setAvailabilities(Array.from(mergedAvail.values()) as Availability[]);
        setBreaks(Array.from(mergedBr.values()) as BreakSlot[]);
        setHolidays(Array.from(mergedHol.values()) as Holiday[]);
        setAppointments((apRes.data || []) as Appointment[]);
      } catch { setError('Erreur de chargement'); }
      setLoading(false);
    };
    fetchData();
  }, [serviceId]);

  // ── Calendar helpers
  const firstOfMonth = new Date(calYear, calMonth, 1);
  const lastOfMonth = new Date(calYear, calMonth + 1, 0);
  const startPad = firstOfMonth.getDay() === 0 ? 6 : firstOfMonth.getDay() - 1;
  const monthDays: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) monthDays.push(null);
  for (let i = 1; i <= lastOfMonth.getDate(); i++) monthDays.push(i);

  const isHoliday = (dateStr: string) => holidays.some((h) => dateStr >= h.date_from && dateStr <= h.date_to);
  const isWorkingDay = (dateStr: string) => {
    const d = new Date(dateStr);
    const dayKey = DAY_KEYS[(d.getDay() + 6) % 7];
    return availabilities.some((a) => a.day_of_week === dayKey);
  };
  const isDateAvailable = (dateStr: string) => {
    if (!service) return false;
    if (dateStr < toDateStr(today)) return false;
    if (isHoliday(dateStr)) return false;
    if (!isWorkingDay(dateStr)) return false;
    // Check if at least one slot is available
    return getAvailableSlots(dateStr).length > 0;
  };

  // ── Time slot generation
  const getAvailableSlots = useCallback((dateStr: string): string[] => {
    if (!service) return [];
    const d = new Date(dateStr);
    const dayKey = DAY_KEYS[(d.getDay() + 6) % 7];
    const avail = availabilities.find((a) => a.day_of_week === dayKey);
    if (!avail) return [];

    const dayBreaks = breaks.filter((b) => b.day_of_week === dayKey);
    const dayAppts = appointments.filter((a) => a.date === dateStr);
    const now = new Date();
    const isToday = dateStr === toDateStr(now);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const slots: string[] = [];
    const startTotal = parseTime(avail.start_time).total;
    const endTotal = parseTime(avail.end_time).total;

    for (let t = startTotal; t + service.duration <= endTotal; t += service.duration) {
      const slotStart = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
      const slotEnd = addMinutes(slotStart, service.duration);

      // Skip past slots
      if (isToday && t <= currentMinutes) continue;

      // Skip if overlaps with any break
      const overlapsBreak = dayBreaks.some((b) => timeOverlap(slotStart, slotEnd, b.start_time, b.end_time));
      if (overlapsBreak) continue;

      // Skip if overlaps with existing appointment
      const overlapsAppt = dayAppts.some((a) => timeOverlap(slotStart, slotEnd, a.time, addMinutes(a.time, service.duration)));
      if (overlapsAppt) continue;

      slots.push(slotStart);
    }
    return slots;
  }, [service, availabilities, breaks, appointments]);

  // ── Available slots for selected date
  const availableSlots = selectedDate ? getAvailableSlots(selectedDate) : [];

  // ── Submit booking
  const handleSubmit = async () => {
    if (!service || !selectedDate || !selectedTime) return;
    if (!formData.fullname.trim()) { setFormError('Le nom est requis'); return; }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { setFormError('Email valide requis'); return; }

    setSubmitting(true);
    setFormError('');

    try {
      const { data: appt, error: insertErr } = await supabase.from('booking_appointments').insert({
        service_id: service.id,
        fullname: formData.fullname.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        message: formData.message.trim(),
        date: selectedDate,
        time: selectedTime,
        status: 'confirmed',
      }).select('id').single();

      if (insertErr) { setFormError('Erreur lors de la réservation. Veuillez réessayer.'); setSubmitting(false); return; }

      // Send notification email to owner via Edge Function
      if (owner?.email) {
        supabase.functions.invoke('send-booking-notification', {
          body: {
            to: owner.email,
            type: 'new_booking',
            service_name: service.service_name,
            customer_name: formData.fullname.trim(),
            customer_email: formData.email.trim(),
            customer_phone: formData.phone.trim(),
            customer_message: formData.message.trim(),
            date: selectedDate,
            time: selectedTime,
            duration: service.duration,
          },
        }).catch(() => { /* silent - email failure shouldn't block booking */ });
      }

      setSuccess(true);
    } catch {
      setFormError('Une erreur est survenue. Veuillez réessayer.');
    }
    setSubmitting(false);
  };

  // ── Loading / Error states
  if (loading) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center">
        <i className="ri-loader-4-line animate-spin text-3xl text-primary-500"></i>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background-50 flex flex-col items-center justify-center px-4">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <i className="ri-error-warning-line text-2xl text-red-500"></i>
        </div>
        <h2 className="text-lg font-semibold text-foreground-900 mb-2">Service indisponible</h2>
        <p className="text-sm text-foreground-500 mb-6">{error}</p>
        <button onClick={() => navigate('/')} className="px-6 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer whitespace-nowrap">
          Retour à l'accueil
        </button>
      </div>
    );
  }

  // ── Success
  if (success) {
    return (
      <div className="min-h-screen bg-background-50 flex flex-col items-center justify-center px-4">
        <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-5">
          <i className="ri-check-line text-3xl text-emerald-500"></i>
        </div>
        <h2 className="text-xl font-bold font-heading text-foreground-950 mb-2">Rendez-vous confirmé !</h2>
        <p className="text-sm text-foreground-500 text-center max-w-md mb-2">
          {formatDateFr(selectedDate!)} à {selectedTime}
        </p>
        <p className="text-xs text-foreground-400 text-center max-w-md mb-8">
          {service?.service_name} ({service?.duration} min) — Un email de confirmation sera envoyé à {formData.email}
        </p>
        <button onClick={() => navigate('/')} className="px-6 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer whitespace-nowrap">
          Retour à l'accueil
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-50">
      {/* Header */}
      <header className="border-b border-background-200/70 bg-background-50">
        <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="w-11 h-11 rounded-xl bg-background-100 border border-background-200/70 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {owner?.image ? (
                <img
                  src={`https://seaweedfs-oriq.srv1134875.hstgr.cloud/product-media/${owner.image}`}
                  alt={owner?.nomcommerce || 'Logo'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement!.classList.add('bg-primary-50');
                    const fallback = document.createElement('span');
                    fallback.className = 'text-primary-600 font-bold text-base font-heading';
                    fallback.textContent = (owner?.nomcommerce || 'R')[0].toUpperCase();
                    (e.target as HTMLImageElement).parentElement!.appendChild(fallback);
                  }}
                />
              ) : (
                <span className="text-primary-600 font-bold text-base font-heading">
                  {(owner?.nomcommerce || 'R')[0].toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-base font-bold font-heading text-foreground-950 leading-tight">
                {owner?.nomcommerce || owner?.name || 'Réservation'}
              </h1>
              <p className="text-xs text-foreground-500">{service?.service_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-accent-50 text-accent-700 rounded-full text-xs font-medium">{service?.duration} min</span>
            {service?.location && (
              <span className="text-xs text-foreground-500 hidden sm:flex items-center gap-1">
                <i className="ri-map-pin-line"></i>{service.location}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8">
          {/* Left: Calendar + Time slots */}
          <div className="lg:col-span-3">
            {currentStep === 'pick' && (
              <>
                {/* Calendar */}
                <div className="bg-background-50 border border-background-200/70 rounded-xl overflow-hidden mb-6">
                  <div className="flex items-center justify-between p-4 border-b border-background-200/70">
                    <button
                      onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-background-100 hover:bg-background-200/70 cursor-pointer transition-colors"
                    >
                      <i className="ri-arrow-left-s-line text-foreground-600"></i>
                    </button>
                    <h3 className="text-sm font-semibold text-foreground-800">{MONTHS[calMonth]} {calYear}</h3>
                    <button
                      onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-background-100 hover:bg-background-200/70 cursor-pointer transition-colors"
                    >
                      <i className="ri-arrow-right-s-line text-foreground-600"></i>
                    </button>
                  </div>

                  {/* Day headers */}
                  <div className="grid grid-cols-7 border-b border-background-200/70">
                    {SHORT_DAYS.map((d) => (
                      <div key={d} className="py-2 text-center text-[11px] font-medium text-foreground-400">{d}</div>
                    ))}
                  </div>

                  {/* Days */}
                  <div className="grid grid-cols-7 p-2 gap-1">
                    {monthDays.map((day, i) => {
                      if (day === null) return <div key={`e-${i}`} className="aspect-square"></div>;
                      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const isToday = dateStr === toDateStr(today);
                      const available = isDateAvailable(dateStr);
                      const isSelected = dateStr === selectedDate;
                      const hol = holidays.find((h) => dateStr >= h.date_from && dateStr <= h.date_to);

                      return (
                        <button
                          key={dateStr}
                          disabled={!available}
                          onClick={() => { setSelectedDate(dateStr); setSelectedTime(null); }}
                          className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs cursor-pointer transition-all ${
                            isSelected ? 'bg-primary-500 text-background-50 font-bold' :
                            isToday ? 'bg-primary-50 text-primary-700 font-semibold ring-1 ring-primary-200' :
                            available ? 'bg-background-50 text-foreground-700 hover:bg-accent-50 hover:text-accent-700' :
                            'bg-background-100/50 text-foreground-300 cursor-not-allowed'
                          }`}
                        >
                          <span>{day}</span>
                          {hol && <span className="text-[8px] opacity-60">{hol.title.slice(0, 10)}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time slots */}
                {selectedDate && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground-800 mb-3">
                      <i className="ri-time-line mr-1.5 text-primary-500"></i>
                      {formatDateFr(selectedDate)}
                    </h3>
                    {availableSlots.length === 0 ? (
                      <div className="bg-background-50 border border-background-200/70 rounded-xl p-8 text-center">
                        <i className="ri-calendar-close-line text-3xl text-foreground-300 mb-2 block"></i>
                        <p className="text-sm text-foreground-500">Aucun créneau disponible à cette date</p>
                        <p className="text-xs text-foreground-400 mt-1">Choisissez une autre date</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {availableSlots.map((slot) => (
                          <button
                            key={slot}
                            onClick={() => setSelectedTime(slot)}
                            className={`py-2.5 px-3 rounded-lg text-sm font-medium cursor-pointer transition-all whitespace-nowrap ${
                              selectedTime === slot
                                ? 'bg-primary-500 text-background-50'
                                : 'bg-background-50 border border-background-200/70 text-foreground-700 hover:border-accent-300 hover:text-accent-700'
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    )}

                    {selectedTime && (
                      <button
                        onClick={() => setCurrentStep('form')}
                        className="mt-5 w-full sm:w-auto px-8 py-3 bg-primary-500 text-background-50 rounded-full text-sm font-semibold cursor-pointer hover:bg-primary-600 transition-colors whitespace-nowrap"
                      >
                        Continuer <i className="ri-arrow-right-line ml-1"></i>
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Step 2: Form */}
            {currentStep === 'form' && (
              <div className="bg-background-50 border border-background-200/70 rounded-xl p-5 md:p-6">
                <button
                  onClick={() => setCurrentStep('pick')}
                  className="flex items-center gap-1 text-sm text-foreground-500 hover:text-foreground-700 cursor-pointer mb-4 transition-colors"
                >
                  <i className="ri-arrow-left-line"></i> Retour
                </button>
                <h3 className="text-base font-semibold text-foreground-900 mb-1">Vos informations</h3>
                <p className="text-xs text-foreground-500 mb-5">
                  {formatDateFr(selectedDate!)} à {selectedTime} · {service?.service_name} ({service?.duration} min)
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground-600 mb-1">Nom complet *</label>
                    <input
                      type="text"
                      value={formData.fullname}
                      onChange={(e) => setFormData({ ...formData, fullname: e.target.value })}
                      placeholder="Votre nom"
                      className="w-full px-3 py-2.5 text-sm border border-background-200/70 rounded-lg bg-background-50 text-foreground-800 focus:outline-none focus:border-primary-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-600 mb-1">Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="votre@email.com"
                      className="w-full px-3 py-2.5 text-sm border border-background-200/70 rounded-lg bg-background-50 text-foreground-800 focus:outline-none focus:border-primary-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-600 mb-1">Téléphone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+33 6 12 34 56 78"
                      className="w-full px-3 py-2.5 text-sm border border-background-200/70 rounded-lg bg-background-50 text-foreground-800 focus:outline-none focus:border-primary-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-600 mb-1">Message (optionnel)</label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Précisez l'objet du rendez-vous..."
                      rows={3}
                      maxLength={500}
                      className="w-full px-3 py-2.5 text-sm border border-background-200/70 rounded-lg bg-background-50 text-foreground-800 resize-none focus:outline-none focus:border-primary-300"
                    />
                    <p className="text-[10px] text-foreground-400 text-right mt-0.5">{formData.message.length}/500</p>
                  </div>

                  {formError && (
                    <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
                      <i className="ri-error-warning-line"></i>
                      {formError}
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full py-3 bg-primary-500 text-background-50 rounded-full text-sm font-semibold cursor-pointer hover:bg-primary-600 transition-colors whitespace-nowrap disabled:opacity-60"
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <i className="ri-loader-4-line animate-spin"></i>Réservation en cours...
                      </span>
                    ) : (
                      'Confirmer la réservation'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Service details */}
          <div className="lg:col-span-2">
            <div className="bg-background-50 border border-background-200/70 rounded-xl p-5 sticky top-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-accent-50 flex items-center justify-center flex-shrink-0">
                  <i className="ri-calendar-check-line text-lg text-accent-600"></i>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground-900">{service?.service_name}</h4>
                  <p className="text-xs text-foreground-500">{service?.duration} minutes</p>
                </div>
              </div>

              {service?.description && (
                <p className="text-xs text-foreground-600 mb-4 leading-relaxed">{service.description}</p>
              )}

              <div className="space-y-2.5 text-xs text-foreground-600">
                {service?.location && (
                  <div className="flex items-start gap-2">
                    <i className="ri-map-pin-line mt-0.5 text-foreground-400"></i>
                    <span>{service.location}</span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <i className="ri-time-line mt-0.5 text-foreground-400"></i>
                  <span>{service?.duration} minutes</span>
                </div>
                {owner?.nomcommerce && (
                  <div className="flex items-start gap-2">
                    <i className="ri-store-2-line mt-0.5 text-foreground-400"></i>
                    <span>{owner.nomcommerce}</span>
                  </div>
                )}
              </div>

              {/* Selected slot preview */}
              {selectedDate && selectedTime && (
                <div className="mt-4 pt-4 border-t border-background-200/70">
                  <p className="text-[10px] font-medium text-foreground-400 uppercase tracking-wide mb-2">Créneau sélectionné</p>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                      <i className="ri-calendar-event-line text-primary-600"></i>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground-900">{selectedTime}</p>
                      <p className="text-[10px] text-foreground-500">{formatDateFr(selectedDate)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}