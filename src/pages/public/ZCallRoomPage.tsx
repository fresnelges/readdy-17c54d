import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

// ─── Configuration Jitsi Self-Hosté ─────────────────────────────────────
const JITSI_DOMAIN = 'jitsi-meet-0o2q.srv1134875.hstgr.cloud';

interface MeetingInfo {
  id: number;
  title: string;
  room_id: string;
  scheduled_at: string | null;
  duration_minutes: number;
  status: string;
}

export default function ZCallRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState<MeetingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Jitsi IFrame API
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);
  const [jitsiApiReady, setJitsiApiReady] = useState(false);

  useEffect(() => {
    if (!roomId) {
      setError('Aucun identifiant de réunion fourni.');
      setLoading(false);
      return;
    }

    const fetchMeeting = async () => {
      const { data, error: fetchErr } = await supabase
        .from('zcall_meetings')
        .select('id, title, room_id, scheduled_at, duration_minutes, status')
        .eq('room_id', roomId)
        .maybeSingle();

      if (fetchErr || !data) {
        setError('Cette réunion n\'existe pas ou le lien est invalide.');
      } else if (data.status === 'cancelled') {
        setError('Cette réunion a été annulée.');
      } else if (data.status === 'ended') {
        setError('Cette réunion est terminée.');
      } else {
        setMeeting(data as MeetingInfo);
      }
      setLoading(false);
    };

    fetchMeeting();
  }, [roomId]);

  // ─── Charger external_api.js depuis le Jitsi self-hosté ───────────────
  useEffect(() => {
    if (!joined || !meeting) return;

    if ((window as any).JitsiMeetExternalAPI) {
      setJitsiApiReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://${JITSI_DOMAIN}/external_api.js`;
    script.async = true;
    script.onload = () => setJitsiApiReady(true);
    script.onerror = () => setError('Impossible de charger le service de visioconférence. Veuillez réessayer.');
    document.body.appendChild(script);
  }, [joined, meeting]);

  // ─── Initialiser JitsiMeetExternalAPI avec branding Zifek ────────────
  useEffect(() => {
    if (!jitsiApiReady || !meeting || !jitsiContainerRef.current) return;

    const JitsiMeetExternalAPI = (window as any).JitsiMeetExternalAPI;
    if (!JitsiMeetExternalAPI) return;

    const api = new JitsiMeetExternalAPI(JITSI_DOMAIN, {
      roomName: meeting.room_id,
      width: '100%',
      height: '100%',
      parentNode: jitsiContainerRef.current,
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        disableDeepLinking: true,
        prejoinPageEnabled: false,
        disableInviteFunctions: false,
      },
      interfaceConfigOverwrite: {
        APP_NAME: 'Zifek',
        NATIVE_APP_NAME: 'Zifek',
        SHOW_JITSI_WATERMARK: false,
        SHOW_POWERED_BY: false,
        JITSI_WATERMARK_LINK: '',
        SHOW_BRAND_WATERMARK: false,
        BRAND_WATERMARK_LINK: '',
        SHOW_PROMOTIONAL_CLOSE_PAGE: false,
      },
    });

    jitsiApiRef.current = api;

    api.addListener('readyToClose', () => {
      navigate('/');
    });

    return () => {
      api.dispose();
      jitsiApiRef.current = null;
    };
  }, [jitsiApiReady, meeting, navigate]);

  // ─── Favicon Zifek pour la page de réunion ────────────────────────────
  useEffect(() => {
    const existingFavicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    const prevHref = existingFavicon?.getAttribute('href') ?? '';

    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#111827"/><text x="32" y="46" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="42" font-weight="800" fill="#10b981">Z</text></svg>`;
    const favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.type = 'image/svg+xml';
    favicon.href = `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
    document.head.appendChild(favicon);

    if (existingFavicon) {
      existingFavicon.remove();
    }

    return () => {
      favicon.remove();
      if (prevHref) {
        const restored = document.createElement('link');
        restored.rel = 'icon';
        restored.href = prevHref;
        document.head.appendChild(restored);
      }
    };
  }, []);

  const handleJoin = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setJoined(true);
    } catch {
      setPermissionDenied(true);
    }
  };

  // ─── Loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-background-100 flex items-center justify-center">
            <i className="ri-loader-4-line text-2xl text-foreground-400 animate-spin"></i>
          </div>
          <p className="text-sm text-foreground-500">Chargement...</p>
        </div>
      </div>
    );
  }

  // ─── Error ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-50 p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-background-100 flex items-center justify-center">
            <i className="ri-video-off-line text-2xl text-foreground-400"></i>
          </div>
          <h1 className="text-lg font-semibold text-foreground-900 mb-2">Réunion indisponible</h1>
          <p className="text-sm text-foreground-500 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 bg-background-100 text-foreground-700 rounded-full text-sm font-medium cursor-pointer hover:bg-background-200/70 transition-colors whitespace-nowrap"
          >
            <i className="ri-arrow-left-line mr-1.5"></i>
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  // ─── Permission Denied ─────────────────────────────────────────────────
  if (permissionDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-50 p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 flex items-center justify-center">
            <i className="ri-camera-off-line text-3xl text-amber-600"></i>
          </div>
          <h1 className="text-lg font-semibold text-foreground-900 mb-2">Accès caméra/micro requis</h1>
          <p className="text-sm text-foreground-500 mb-2">
            Pour participer à la visioconférence, vous devez autoriser l'accès à votre caméra et votre microphone.
          </p>
          <p className="text-xs text-foreground-400 mb-6">
            Vérifiez les paramètres de votre navigateur et réessayez.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setPermissionDenied(false)}
              className="px-6 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium cursor-pointer hover:bg-primary-600 transition-colors whitespace-nowrap"
            >
              <i className="ri-refresh-line mr-1.5"></i>
              Réessayer
            </button>
            <button
              onClick={() => { setJoined(true); setPermissionDenied(false); }}
              className="px-6 py-2.5 bg-background-100 text-foreground-600 rounded-full text-sm font-medium cursor-pointer hover:bg-background-200/70 transition-colors whitespace-nowrap"
            >
              Rejoindre sans caméra
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Join Screen ───────────────────────────────────────────────────────
  if (!joined && meeting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-50 p-4">
        <div className="max-w-md w-full">
          <div className="bg-background-50 border border-background-200/70 rounded-2xl p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-background-100 flex items-center justify-center">
              <i className="ri-vidicon-line text-3xl text-foreground-400"></i>
            </div>
            <p className="text-xs font-medium text-foreground-500 uppercase tracking-widest mb-3">Visioconférence</p>
            <h1 className="text-lg font-semibold text-foreground-900 mb-1">{meeting.title}</h1>
            {meeting.scheduled_at && (
              <p className="text-xs text-foreground-500 mb-4">
                <i className="ri-calendar-event-line mr-1"></i>
                {new Date(meeting.scheduled_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {' · '}{meeting.duration_minutes} min
              </p>
            )}
            {!meeting.scheduled_at && (
              <p className="text-xs text-foreground-500 mb-4">Réunion instantanée · {meeting.duration_minutes} min</p>
            )}

            <div className="bg-background-100 rounded-xl p-4 mb-6">
              <p className="text-xs text-foreground-500 mb-3">Aperçu de votre caméra :</p>
              <div className="aspect-video bg-foreground-950/5 rounded-lg flex items-center justify-center overflow-hidden">
                <video
                  autoPlay
                  muted
                  playsInline
                  ref={(el) => {
                    if (el) {
                      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
                        .then((stream) => { el.srcObject = stream; })
                        .catch(() => {});
                    }
                  }}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleJoin}
                className="flex-1 py-3 bg-primary-500 text-background-50 rounded-full text-sm font-semibold cursor-pointer hover:bg-primary-600 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <i className="ri-vidicon-line"></i>
                Rejoindre la réunion
              </button>
            </div>
            <p className="text-[10px] text-foreground-400 mt-3">
              En rejoignant, vous acceptez que votre caméra et microphone soient activés.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Jitsi Meet via IFrame API (self-hosté, branding Zifek) ──────────
  if (joined && meeting) {
    return (
      <div className="fixed inset-0 z-50 bg-foreground-950">
        {/* Conteneur Jitsi */}
        <div ref={jitsiContainerRef} className="w-full h-full" />

        {/* Overlay de chargement */}
        {!jitsiApiReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-foreground-950 z-20">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-white/10 flex items-center justify-center">
                <i className="ri-vidicon-line text-3xl text-white/40"></i>
              </div>

              <div className="w-48 mx-auto mb-4 h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full w-1/2 bg-white/20 rounded-full animate-[pulse_1.5s_ease-in-out_infinite]"></div>
              </div>

              <p className="text-white/70 text-sm font-medium">Connexion en cours</p>
              <p className="text-white/35 text-xs mt-1">Chargement du salon sécurisé...</p>
            </div>
          </div>
        )}

        {/* Barre supérieure Zifek */}
        <div className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2.5 bg-gradient-to-b from-foreground-950/90 via-foreground-950/60 to-transparent pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
            <button
              onClick={() => navigate('/')}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white cursor-pointer hover:bg-white/20 transition-colors"
              title="Quitter la réunion"
            >
              <i className="ri-arrow-left-line"></i>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-semibold font-heading">Visioconférence</span>
              <span className="w-1 h-1 rounded-full bg-white/30"></span>
              <span className="text-white/80 text-xs font-medium truncate max-w-[180px]">{meeting.title}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 pointer-events-auto">
            <span className="text-white/50 text-[11px] tabular-nums">
              <i className="ri-time-line mr-1"></i>
              {meeting.duration_minutes} min
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}