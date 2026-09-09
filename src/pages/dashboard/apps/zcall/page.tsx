import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ZCallMeeting {
  id: number;
  user_id: number;
  title: string;
  room_id: string;
  scheduled_at: string | null;
  duration_minutes: number;
  status: 'scheduled' | 'active' | 'ended' | 'cancelled';
  created_at: string;
}

type TabKey = 'instant' | 'schedule' | 'list';

const DURATION_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1h' },
  { value: 90, label: '1h30' },
  { value: 120, label: '2h' },
  { value: 180, label: '3h' },
  { value: 240, label: '4h' },
];

function generateRoomId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const segments = [
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''),
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''),
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''),
  ];
  return `zc-${segments.join('-')}`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getMeetingUrl(roomId: string): string {
  const basePath = (typeof __BASE_PATH__ !== 'undefined' ? __BASE_PATH__ : '').replace(/\/$/, '');
  return `${window.location.origin}${basePath}/call/${roomId}`;
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-amber-50 text-amber-700 border-amber-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ended: 'bg-background-100 text-foreground-400 border-background-200',
  cancelled: 'bg-red-50 text-red-500 border-red-200',
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Programmée',
  active: 'En cours',
  ended: 'Terminée',
  cancelled: 'Annulée',
};

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function ZCallPage() {
  const { user } = useAuth();
  const userId = user?.id;

  const [activeTab, setActiveTab] = useState<TabKey>('instant');
  const [meetings, setMeetings] = useState<ZCallMeeting[]>([]);
  const [loading, setLoading] = useState(true);

  // Instant form
  const [instantTitle, setInstantTitle] = useState('');
  const [instantDuration, setInstantDuration] = useState(60);
  const [instantLink, setInstantLink] = useState<string | null>(null);
  const [instantRoomId, setInstantRoomId] = useState<string | null>(null);

  // Schedule form
  const [schedTitle, setSchedTitle] = useState('');
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('10:00');
  const [schedDuration, setSchedDuration] = useState(60);

  // Copy feedback
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [copiedInstant, setCopiedInstant] = useState(false);

  // ──────────────────────────────────────────────────────────────────────────
  const fetchMeetings = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('zcall_meetings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setMeetings(data as ZCallMeeting[]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) fetchMeetings();
  }, [userId, fetchMeetings]);

  // ─── Instant Meeting ────────────────────────────────────────────────────
  const createInstantMeeting = async () => {
    if (!instantTitle.trim()) return;
    const roomId = generateRoomId();
    const { error } = await supabase.from('zcall_meetings').insert({
      user_id: userId,
      title: instantTitle.trim(),
      room_id: roomId,
      scheduled_at: null,
      duration_minutes: instantDuration,
      status: 'active',
    });
    if (error) {
      console.error('Erreur création réunion:', error);
      alert('Erreur lors de la création : ' + error.message);
      return;
    }
    setInstantRoomId(roomId);
    setInstantLink(getMeetingUrl(roomId));
    fetchMeetings();
  };

  const joinInstant = () => {
    if (instantRoomId) {
      window.open(getMeetingUrl(instantRoomId), '_blank');
    }
  };

  // ─── Schedule Meeting ───────────────────────────────────────────────────
  const scheduleMeeting = async () => {
    if (!schedTitle.trim() || !schedDate || !schedTime) return;
    const roomId = generateRoomId();
    const scheduledAt = `${schedDate}T${schedTime}:00`;
    const { error } = await supabase.from('zcall_meetings').insert({
      user_id: userId,
      title: schedTitle.trim(),
      room_id: roomId,
      scheduled_at: scheduledAt,
      duration_minutes: schedDuration,
      status: 'scheduled',
    });
    if (error) {
      console.error('Erreur programmation réunion:', error);
      alert('Erreur lors de la programmation : ' + error.message);
      return;
    }
    setSchedTitle('');
    setSchedDate('');
    setSchedTime('10:00');
    setSchedDuration(60);
    fetchMeetings();
  };

  // ─── Actions ────────────────────────────────────────────────────────────
  const copyLink = (roomId: string, meetingId: number) => {
    navigator.clipboard.writeText(getMeetingUrl(roomId));
    setCopiedId(meetingId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyInstantLink = () => {
    if (instantLink) {
      navigator.clipboard.writeText(instantLink);
      setCopiedInstant(true);
      setTimeout(() => setCopiedInstant(false), 2000);
    }
  };

  const cancelMeeting = async (meetingId: number) => {
    const { error } = await supabase
      .from('zcall_meetings')
      .update({ status: 'cancelled' })
      .eq('id', meetingId);
    if (error) {
      console.error('Erreur annulation:', error);
      alert('Erreur : ' + error.message);
      return;
    }
    fetchMeetings();
  };

  const deleteMeeting = async (meetingId: number) => {
    const { error } = await supabase.from('zcall_meetings').delete().eq('id', meetingId);
    if (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur : ' + error.message);
      return;
    }
    fetchMeetings();
  };

  // ──────────────────────────────────────────────────────────────────────────
  const upcomingMeetings = meetings.filter((m) => m.status === 'scheduled');
  const pastMeetings = meetings.filter((m) => m.status !== 'scheduled');

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center">
            <img
              src="https://storage.readdy-site.link/project_files/59392c9e-e303-496e-bac1-59ba5941cf65/ff89f43a-e5cd-4976-84f3-61ee677410a4_compressed_logozifek.webp"
              alt="Zifek"
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">
            ZCall
          </h2>
        </div>
        <p className="text-sm text-foreground-500 mt-1">Visioconférence instantanée ou programmée</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-background-100 rounded-full p-1 mb-6 w-fit">
        {([
          { key: 'instant' as TabKey, icon: 'ri-flashlight-line', label: 'Instantanée' },
          { key: 'schedule' as TabKey, icon: 'ri-calendar-event-line', label: 'Programmer' },
          { key: 'list' as TabKey, icon: 'ri-list-check-2', label: `Mes réunions${meetings.length > 0 ? ` (${meetings.length})` : ''}` },
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

      {/* ─── Tab: Instant ──────────────────────────────────────────────── */}
      {activeTab === 'instant' && (
        <div className="space-y-6">
          {!instantLink ? (
            <div className="bg-background-50 border border-background-200/70 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                  <i className="ri-flashlight-line text-xl text-primary-500"></i>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground-900">Réunion instantanée</h3>
                  <p className="text-xs text-foreground-500">Démarrez une visioconférence maintenant</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-foreground-600 mb-1.5">Titre de la réunion</label>
                  <input
                    type="text"
                    value={instantTitle}
                    onChange={(e) => setInstantTitle(e.target.value)}
                    placeholder="Ex: Brief équipe, Appel client..."
                    className="w-full px-4 py-2.5 text-sm border border-background-200/70 rounded-xl bg-background-50 text-foreground-800 focus:outline-none focus:border-primary-300 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-600 mb-1.5">Durée estimée</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {DURATION_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setInstantDuration(opt.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer whitespace-nowrap transition-colors ${
                          instantDuration === opt.value
                            ? 'bg-primary-500 text-background-50'
                            : 'bg-background-100 text-foreground-600 hover:bg-background-200/70'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={createInstantMeeting}
                  disabled={!instantTitle.trim()}
                  className="w-full py-3 bg-primary-500 text-background-50 rounded-full text-sm font-semibold cursor-pointer hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <i className="ri-vidicon-line"></i>
                  Démarrer la réunion maintenant
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-background-50 border border-accent-200/50 rounded-xl p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <i className="ri-check-line text-xl text-emerald-500"></i>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground-900">Réunion créée !</h3>
                  <p className="text-xs text-foreground-500">{instantTitle}</p>
                </div>
              </div>

              <div className="p-4 bg-background-100 rounded-xl">
                <p className="text-xs font-medium text-foreground-500 mb-2">Lien de la réunion :</p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={instantLink || ''}
                    className="flex-1 px-3 py-2 bg-background-50 border border-background-200/70 rounded-lg text-xs font-mono text-foreground-700"
                  />
                  <button
                    onClick={copyInstantLink}
                    className="px-4 py-2 bg-secondary-50 text-secondary-700 rounded-full text-xs font-medium cursor-pointer hover:bg-secondary-100 transition-colors whitespace-nowrap"
                  >
                    {copiedInstant ? (
                      <><i className="ri-check-line mr-1"></i>Copié !</>
                    ) : (
                      <><i className="ri-file-copy-line mr-1"></i>Copier</>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={joinInstant}
                  className="flex-1 py-3 bg-emerald-500 text-white rounded-full text-sm font-semibold cursor-pointer hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <i className="ri-external-link-line"></i>
                  Rejoindre la réunion
                </button>
                <button
                  onClick={() => { setInstantLink(null); setInstantRoomId(null); setInstantTitle(''); }}
                  className="px-6 py-3 bg-background-100 text-foreground-600 rounded-full text-sm font-medium cursor-pointer hover:bg-background-200/70 transition-colors whitespace-nowrap"
                >
                  Nouvelle réunion
                </button>
              </div>
            </div>
          )}

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: 'ri-group-line', title: 'Participants illimités', desc: 'Invitez autant de personnes que nécessaire' },
              { icon: 'ri-shield-check-line', title: 'Crypté de bout en bout', desc: 'Vos conversations sont sécurisées' },
              { icon: 'ri-smartphone-line', title: 'Tous les appareils', desc: 'Mobile, tablette ou ordinateur' },
            ].map((f, i) => (
              <div key={i} className="bg-background-50 border border-background-200/70 rounded-xl p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-background-100 flex items-center justify-center shrink-0">
                  <i className={`${f.icon} text-foreground-500`}></i>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground-800">{f.title}</p>
                  <p className="text-[11px] text-foreground-500 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Tab: Schedule ─────────────────────────────────────────────── */}
      {activeTab === 'schedule' && (
        <div className="bg-background-50 border border-background-200/70 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-secondary-50 flex items-center justify-center">
              <i className="ri-calendar-event-line text-xl text-secondary-600"></i>
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground-900">Programmer une réunion</h3>
              <p className="text-xs text-foreground-500">Planifiez une visioconférence pour plus tard</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1.5">Titre de la réunion *</label>
              <input
                type="text"
                value={schedTitle}
                onChange={(e) => setSchedTitle(e.target.value)}
                placeholder="Ex: Démo produit, Réunion projet..."
                className="w-full px-4 py-2.5 text-sm border border-background-200/70 rounded-xl bg-background-50 text-foreground-800 focus:outline-none focus:border-primary-300 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground-600 mb-1.5">Date *</label>
                <input
                  type="date"
                  value={schedDate}
                  onChange={(e) => setSchedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2.5 text-sm border border-background-200/70 rounded-xl bg-background-50 text-foreground-800 focus:outline-none focus:border-primary-300 transition-colors cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-600 mb-1.5">Heure *</label>
                <input
                  type="time"
                  value={schedTime}
                  onChange={(e) => setSchedTime(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-background-200/70 rounded-xl bg-background-50 text-foreground-800 focus:outline-none focus:border-primary-300 transition-colors cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground-600 mb-1.5">Durée estimée</label>
              <div className="flex items-center gap-2 flex-wrap">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSchedDuration(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer whitespace-nowrap transition-colors ${
                      schedDuration === opt.value
                        ? 'bg-primary-500 text-background-50'
                        : 'bg-background-100 text-foreground-600 hover:bg-background-200/70'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={scheduleMeeting}
              disabled={!schedTitle.trim() || !schedDate || !schedTime}
              className="w-full py-3 bg-primary-500 text-background-50 rounded-full text-sm font-semibold cursor-pointer hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <i className="ri-calendar-check-line"></i>
              Programmer la réunion
            </button>
          </div>
        </div>
      )}

      {/* ─── Tab: List ──────────────────────────────────────────────────── */}
      {activeTab === 'list' && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
            </div>
          ) : meetings.length === 0 ? (
            <div className="bg-background-50 border border-background-200/70 rounded-xl p-10 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-background-100 flex items-center justify-center">
                <i className="ri-vidicon-line text-3xl text-foreground-300"></i>
              </div>
              <h3 className="text-base font-semibold text-foreground-700 mb-2">Aucune réunion</h3>
              <p className="text-sm text-foreground-500 max-w-md mx-auto">
                Créez une réunion instantanée ou programmez-en une pour plus tard.
              </p>
            </div>
          ) : (
            <>
              {/* Upcoming / Scheduled */}
              {upcomingMeetings.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-foreground-500 uppercase tracking-wide mb-3">
                    <i className="ri-calendar-event-line mr-1.5"></i>
                    À venir ({upcomingMeetings.length})
                  </h3>
                  <div className="space-y-3">
                    {upcomingMeetings.map((m) => (
                      <MeetingCard
                        key={m.id}
                        meeting={m}
                        copyLink={copyLink}
                        cancelMeeting={cancelMeeting}
                        deleteMeeting={deleteMeeting}
                        copiedId={copiedId}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Past / Active / Cancelled */}
              {pastMeetings.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-foreground-500 uppercase tracking-wide mb-3">
                    <i className="ri-history-line mr-1.5"></i>
                    Historique ({pastMeetings.length})
                  </h3>
                  <div className="space-y-3">
                    {pastMeetings.map((m) => (
                      <MeetingCard
                        key={m.id}
                        meeting={m}
                        copyLink={copyLink}
                        cancelMeeting={cancelMeeting}
                        deleteMeeting={deleteMeeting}
                        copiedId={copiedId}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Meeting Card ─────────────────────────────────────────────────────────────
function MeetingCard({
  meeting,
  copyLink,
  cancelMeeting,
  deleteMeeting,
  copiedId,
}: {
  meeting: ZCallMeeting;
  copyLink: (roomId: string, meetingId: number) => void;
  cancelMeeting: (meetingId: number) => void;
  deleteMeeting: (meetingId: number) => void;
  copiedId: number | null;
}) {
  const isScheduled = meeting.status === 'scheduled';
  const isActive = meeting.status === 'active';

  return (
    <div className="bg-background-50 border border-background-200/70 rounded-xl p-4 hover:border-background-300/60 transition-colors group">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            isActive ? 'bg-emerald-50' : isScheduled ? 'bg-amber-50' : 'bg-background-100'
          }`}>
            <i className={`${
              isActive ? 'ri-vidicon-line text-emerald-600' :
              isScheduled ? 'ri-calendar-event-line text-amber-600' :
              'ri-checkbox-circle-line text-foreground-400'
            }`}></i>
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-foreground-900 truncate">{meeting.title}</h4>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {meeting.scheduled_at ? (
                <span className="text-xs text-foreground-500">
                  <i className="ri-time-line mr-1"></i>
                  {formatDateTime(meeting.scheduled_at)}
                </span>
              ) : (
                <span className="text-xs text-foreground-500">
                  <i className="ri-flashlight-line mr-1"></i>
                  Instantanée
                </span>
              )}
              <span className="text-xs text-foreground-400">·</span>
              <span className="text-xs text-foreground-500">{meeting.duration_minutes} min</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_STYLES[meeting.status] || ''}`}>
                {STATUS_LABELS[meeting.status] || meeting.status}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => copyLink(meeting.room_id, meeting.id)}
            className="px-3 py-1.5 bg-secondary-50 text-secondary-700 rounded-full text-xs font-medium cursor-pointer hover:bg-secondary-100 transition-colors whitespace-nowrap"
          >
            {copiedId === meeting.id ? (
              <><i className="ri-check-line mr-1"></i>Copié !</>
            ) : (
              <><i className="ri-link mr-1"></i>Copier le lien</>
            )}
          </button>
          {(isScheduled || isActive) && (
            <a
              href={getMeetingUrl(meeting.room_id)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-50 text-emerald-600 cursor-pointer hover:bg-emerald-100 transition-colors"
            >
              <i className="ri-external-link-line text-sm"></i>
            </a>
          )}
          {isScheduled && (
            <button
              onClick={() => cancelMeeting(meeting.id)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-400 cursor-pointer hover:bg-red-100 hover:text-red-600 transition-colors"
              title="Annuler"
            >
              <i className="ri-close-line text-sm"></i>
            </button>
          )}
          {(meeting.status === 'ended' || meeting.status === 'cancelled') && (
            <button
              onClick={() => deleteMeeting(meeting.id)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-400 cursor-pointer hover:bg-red-100 hover:text-red-600 transition-colors"
              title="Supprimer"
            >
              <i className="ri-delete-bin-line text-sm"></i>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}