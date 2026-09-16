import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { md5 } from '@/lib/md5';
import { parseCharte, generatePalette, type ChartPalette } from '@/lib/palette';
import { buildSubdomain } from '@/lib/domain';

function cleanDisplayUrl(url: string): string {
  return url.replace(/^https?:\/\//, '');
}

function isValidDomain(raw: string): boolean {
  const cleaned = raw.replace(/\/+$/, '').replace(/^https?:\/\//, '');
  return /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(cleaned);
}

interface PaysItem { id: number; nom_pays: string; codepays: number; }
interface VilleItem { id: number; nom_ville: string; id_pays: number; }
interface MonaieItem { id: number; code: string; nom: string; symbole: string; }

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'domain' | 'apparence' | 'danger'>('profile');

  const [paysList, setPaysList] = useState<PaysItem[]>([]);
  const [villeList, setVilleList] = useState<VilleItem[]>([]);
  const [monnaieList, setMonnaieList] = useState<MonaieItem[]>([]);
  const [loadingPays, setLoadingPays] = useState(true);
  const [loadingVilles, setLoadingVilles] = useState(false);
  const [loadingMonnaie, setLoadingMonnaie] = useState(true);

  // ── Charte graphique state ──
  const currentCharte = user?.couleurcharte || '';
  const [charteInput, setCharteInput] = useState('');
  const [chartePreview, setChartePreview] = useState<ChartPalette | null>(null);
  const [charteSaved, setCharteSaved] = useState(false);

  const PRESET_COLORS = [
    { hex: '#C2654A', name: 'Terracotta' },
    { hex: '#2D5A27', name: 'Forêt' },
    { hex: '#1B3A5C', name: 'Marine' },
    { hex: '#8B1E3F', name: 'Bordeaux' },
    { hex: '#D4893B', name: 'Ambre' },
    { hex: '#3D6B6B', name: 'Teal' },
    { hex: '#5C3D8F', name: 'Violet' },
    { hex: '#C44569', name: 'Rose' },
    { hex: '#3A3A3A', name: 'Charcoal' },
  ];

  // Init charte input from user data
  useEffect(() => {
    if (!user) return;
    const parsed = parseCharte(user.couleurcharte);
    setCharteInput(parsed || '#C2654A');
  }, [user]);

  // Live preview whenever charteInput changes
  useEffect(() => {
    if (charteInput && /^#[0-9A-Fa-f]{6}$/.test(charteInput)) {
      setChartePreview(generatePalette(charteInput));
    } else {
      setChartePreview(null);
    }
  }, [charteInput]);

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    user_name: '',
    telephone: '',
    paysId: '',
    villeId: '',
    quartier: '',
    adresse: '',
    monaie: '',
  });

  const [password, setPassword] = useState({
    current: '',
    newPass: '',
    confirm: '',
  });
  const [passwordError, setPasswordError] = useState('');

  // Domain state
  const [domainInput, setDomainInput] = useState('');
  const [hasCustomDomain, setHasCustomDomain] = useState(false);
  const [existingDomainId, setExistingDomainId] = useState<number | null>(null);
  const [domainError, setDomainError] = useState('');
  const [domainCopied, setDomainCopied] = useState(false);
  const [loadingDomain, setLoadingDomain] = useState(true);
  const [domainSaved, setDomainSaved] = useState(false);
  const [dnsChecking, setDnsChecking] = useState(false);
  const [dnsStatus, setDnsStatus] = useState<'idle' | 'checking' | 'ok' | 'no_dns' | 'not_reachable' | 'error'>('idle');
  const [dnsRecords, setDnsRecords] = useState<string[]>([]);
  const [domainVerified, setDomainVerified] = useState(false);

  const subdomain = user ? buildSubdomain(user.user_name) : '';
  const currentDomain = hasCustomDomain ? domainInput : subdomain;
  const domainApex = domainInput.trim().toLowerCase().replace(/^www\./, '');
  const domainPrefersWww = domainInput.trim().toLowerCase().startsWith('www.');

  // Fetch pays and monnaie lists
  useEffect(() => {
    Promise.all([
      supabase.from('pays').select('*').order('nom_pays'),
      supabase.from('monaie').select('*').order('id'),
    ]).then(([paysRes, monnaieRes]) => {
      if (paysRes.data) setPaysList(paysRes.data);
      if (monnaieRes.data) setMonnaieList(monnaieRes.data);
    }).finally(() => {
      setLoadingPays(false);
      setLoadingMonnaie(false);
    });
  }, []);

  // Populate profile from user — resolve pays/ville IDs to names for display
  useEffect(() => {
    if (!user) return;

    const base = {
      name: user.name || '',
      email: user.email || '',
      user_name: user.user_name || '',
      telephone: user.telephone || '',
      paysId: '',
      villeId: '',
      quartier: user.Quartier || '',
      adresse: user.adresse || '',
      monaie: user.monaie || '',
    };

    const rawPays = (user.Pays || '').trim();
    const rawVille = (user.Ville || '').trim();

    // If pays looks like a name (not numeric), find its codepays
    if (rawPays && !/^\d+$/.test(rawPays)) {
      const found = paysList.find((p) => p.nom_pays.toLowerCase() === rawPays.toLowerCase());
      base.paysId = found ? String(found.codepays) : '';
    } else {
      base.paysId = rawPays;
    }

    // If ville looks like a name, find its id
    if (rawVille && !/^\d+$/.test(rawVille)) {
      const found = villeList.find((v) => v.nom_ville.toLowerCase() === rawVille.toLowerCase());
      base.villeId = found ? String(found.id) : '';
    } else {
      base.villeId = rawVille;
    }

    // If monnaie is empty, default to first from list
    if (!base.monaie && monnaieList.length > 0) {
      base.monaie = monnaieList[0].code;
    }

    setProfile(base);
  }, [user, paysList, villeList, monnaieList]);

  // Fetch villes when paysId (codepays) changes
  useEffect(() => {
    if (!profile.paysId) {
      setVilleList([]);
      return;
    }
    setLoadingVilles(true);
    supabase
      .from('ville')
      .select('*')
      .eq('id_pays', parseInt(profile.paysId, 10) || 0)
      .order('nom_ville')
      .then(({ data }) => {
        if (data) setVilleList(data);
      })
      .finally(() => setLoadingVilles(false));
  }, [profile.paysId]);

  const persistVerification = async (verified: boolean) => {
    if (!existingDomainId) return;
    try {
      await supabase
        .from('websitedomain')
        .update({ verified })
        .eq('id', existingDomainId);
      setDomainVerified(verified);
    } catch {
      // silent
    }
  };

  const checkDns = async () => {
    if (!hasCustomDomain || !domainInput.trim()) return;
    const rawDomain = domainInput.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase();
    const cnameTarget = cleanDisplayUrl(subdomain); // ex: lucer.zifek.fr
    setDnsChecking(true);
    setDnsStatus('checking');
    setDnsRecords([]);

    try {
      // 1) Vérifie d'abord l'enregistrement CNAME (méthode recommandée)
      const cnameRes = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(rawDomain)}&type=CNAME`,
        { headers: { Accept: 'application/dns-json' } }
      );
      const cnameData = await cnameRes.json();
      const cnameAnswers = (cnameData.Answer || []).filter(
        (r: { type: number }) => r.type === 5
      );

      if (cnameAnswers.length > 0) {
        const targets = cnameAnswers.map((r: { data: string }) =>
          r.data.toLowerCase().replace(/\.$/, '')
        );
        setDnsRecords(targets);
        const matches = targets.some((t) => t === cnameTarget);
        setDnsStatus(matches ? 'ok' : 'not_reachable');
        await persistVerification(matches);
        return;
      }

      // 2) Sinon, vérifie l'enregistrement A
      const dnsRes = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(rawDomain)}&type=A`,
        { headers: { Accept: 'application/dns-json' } }
      );
      const dnsData = await dnsRes.json();

      if (!dnsData.Answer || dnsData.Answer.length === 0) {
        setDnsStatus('no_dns');
        await persistVerification(false);
        return;
      }

      const ips = dnsData.Answer
        .filter((r: { type: number }) => r.type === 1)
        .map((r: { data: string }) => r.data);
      setDnsRecords(ips);
      setDnsStatus('ok');
      await persistVerification(true);
    } catch {
      setDnsStatus('error');
      await persistVerification(false);
    } finally {
      setDnsChecking(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    supabase
      .from('websitedomain')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.domaine) {
          const d = data.domaine.replace(/\/+$/, '');
          setDomainInput(d.startsWith('http') ? d.replace(/^https?:\/\//, '') : d);
          setHasCustomDomain(true);
          setExistingDomainId(data.id);
          setDomainVerified(!!data.verified);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingDomain(false));
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: profile.name,
          email: profile.email,
          telephone: profile.telephone,
          "Pays": profile.paysId,
          "Ville": profile.villeId,
          "Quartier": profile.quartier,
          adresse: profile.adresse,
          monaie: profile.monaie,
        })
        .eq('id', user.id);
      if (error) throw error;

      // Refresh user context
      updateUser({
        name: profile.name,
        email: profile.email,
        telephone: profile.telephone,
        "Pays": profile.paysId,
        "Ville": profile.villeId,
        "Quartier": profile.quartier,
        adresse: profile.adresse,
        monaie: profile.monaie,
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;
    setPasswordError('');
    if (password.newPass !== password.confirm) {
      setPasswordError('Les mots de passe ne correspondent pas');
      return;
    }
    if (password.newPass.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    setSaving(true);
    try {
      const { data: users } = await supabase
        .from('users')
        .select('password')
        .eq('id', user.id)
        .limit(1);

      if (!users || users.length === 0) {
        setPasswordError('Utilisateur introuvable');
        setSaving(false);
        return;
      }

      const storedHash = users[0].password;
      let currentOk = false;

      if (storedHash.startsWith('$2')) {
        const { default: bcrypt } = await import('bcryptjs');
        currentOk = bcrypt.compareSync(password.current, storedHash);
      } else {
        currentOk = md5(password.current) === storedHash;
      }

      if (!currentOk) {
        setPasswordError('Mot de passe actuel incorrect');
        setSaving(false);
        return;
      }

      const { default: bcrypt } = await import('bcryptjs');
      const salt = bcrypt.genSaltSync(10);
      const newHash = bcrypt.hashSync(password.newPass, salt);

      const { error } = await supabase
        .from('users')
        .update({ password: newHash })
        .eq('id', user.id);

      if (error) throw error;

      setPassword({ current: '', newPass: '', confirm: '' });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setPasswordError('Erreur lors du changement de mot de passe');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCharte = async () => {
    if (!user || !charteInput) return;
    setSaving(true);
    setCharteSaved(false);
    try {
      const { error } = await supabase
        .from('users')
        .update({ couleurcharte: charteInput })
        .eq('id', user.id);
      if (error) throw error;
      updateUser({ couleurcharte: charteInput });
      setCharteSaved(true);
      setTimeout(() => setCharteSaved(false), 3000);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleResetCharte = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ couleurcharte: null })
        .eq('id', user.id);
      if (error) throw error;
      updateUser({ couleurcharte: '' });
      setCharteInput('#C2654A');
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDomain = async () => {
    if (!user) return;
    setDomainError('');
    setDomainSaved(false);

    const trimmed = domainInput
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '')
      .toLowerCase();

    if (!trimmed && hasCustomDomain) {
      setSaving(true);
      try {
        const { error } = await supabase
          .from('websitedomain')
          .delete()
          .eq('id', existingDomainId as number);
        if (error) throw error;
        setHasCustomDomain(false);
        setExistingDomainId(null);
        setDomainSaved(true);
        setTimeout(() => setDomainSaved(false), 3000);
      } catch {
        setDomainError('Erreur lors de la suppression du domaine');
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!trimmed && !hasCustomDomain) return;

    if (!isValidDomain(trimmed)) {
      setDomainError('Format de domaine invalide. Exemple : www.maboutique.com');
      return;
    }

    // Empêche de lier un domaine déjà utilisé par une autre boutique
    const strippedDomain = trimmed.replace(/^www\./, '');
    const { data: existingDomains } = await supabase
      .from('websitedomain')
      .select('id, domaine')
      .or(`domaine.eq.${trimmed},domaine.eq.www.${strippedDomain},domaine.eq.${strippedDomain}`);

    if (existingDomains && existingDomains.some((d) => d.id !== existingDomainId)) {
      setDomainError('Ce domaine est déjà utilisé par une autre boutique');
      return;
    }

    setSaving(true);
    try {
      if (hasCustomDomain && existingDomainId) {
        const { error } = await supabase
          .from('websitedomain')
          .update({ domaine: trimmed, verified: false })
          .eq('id', existingDomainId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('websitedomain')
          .insert({ user_id: user.id, domaine: trimmed, verified: false });
        if (error) throw error;
        setHasCustomDomain(true);
      }
      setDomainVerified(false);
      setDomainSaved(true);
      setTimeout(() => setDomainSaved(false), 3000);
    } catch {
      setDomainError('Erreur lors de l&apos;enregistrement du domaine');
    } finally {
      setSaving(false);
      setDnsStatus('idle');
      setDnsRecords([]);
    }
  };

  const handleRemoveDomain = async () => {
    if (!user || !existingDomainId) return;
    setDomainError('');
    setSaving(true);
    try {
      const { error } = await supabase
        .from('websitedomain')
        .delete()
        .eq('id', existingDomainId);
      if (error) throw error;
      setHasCustomDomain(false);
      setExistingDomainId(null);
      setDomainInput('');
      setDomainVerified(false);
      setDomainSaved(true);
      setTimeout(() => setDomainSaved(false), 3000);
    } catch {
      setDomainError('Erreur lors de la suppression du domaine');
    } finally {
      setSaving(false);
      setDnsStatus('idle');
      setDnsRecords([]);
    }
  };

  const copyCurrentDomain = () => {
    navigator.clipboard.writeText(`https://${currentDomain}`).then(() => {
      setDomainCopied(true);
      setTimeout(() => setDomainCopied(false), 2000);
    });
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">Paramètres</h2>
        <p className="text-sm text-foreground-500 mt-1">Gérez votre compte et vos préférences</p>
      </div>

      <div className="max-w-2xl">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-background-100 rounded-full w-fit mb-6">
          {[
            { id: 'profile' as const, label: 'Profil', icon: 'ri-user-line' },
            { id: 'password' as const, label: 'Mot de passe', icon: 'ri-lock-line' },
            { id: 'domain' as const, label: 'Domaine', icon: 'ri-global-line' },
            { id: 'apparence' as const, label: 'Apparence', icon: 'ri-palette-line' },
            { id: 'danger' as const, label: 'Zone danger', icon: 'ri-error-warning-line' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === tab.id
                  ? 'bg-background-50 text-foreground-950 shadow-sm'
                  : 'text-foreground-500 hover:text-foreground-700'
              }`}
            >
              <i className={tab.icon}></i>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'profile' && (
          <div className="bg-background-50 border border-background-200/70 rounded-lg p-5 md:p-6">
            <h3 className="text-sm font-semibold text-foreground-700 mb-4">Informations personnelles</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground-600 mb-1.5">Nom complet</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-background-100 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-600 mb-1.5">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full px-3 py-2.5 bg-background-100 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-600 mb-1.5">Nom d&apos;utilisateur</label>
                <input
                  type="text"
                  value={profile.user_name}
                  disabled
                  className="w-full px-3 py-2.5 bg-background-200/50 border border-background-200/70 rounded-lg text-sm text-foreground-500 cursor-not-allowed"
                />
                <p className="text-xs text-foreground-400 mt-1">Le nom d&apos;utilisateur ne peut pas être modifié</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-600 mb-1.5">Téléphone</label>
                <input
                  type="text"
                  value={profile.telephone}
                  onChange={(e) => setProfile({ ...profile, telephone: e.target.value })}
                  className="w-full px-3 py-2.5 bg-background-100 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors"
                />
              </div>

              <div className="border-t border-background-200/70 pt-4">
                <h4 className="text-xs font-semibold text-foreground-500 uppercase tracking-wider mb-3">Localisation</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground-600 mb-1.5">Pays</label>
                    {loadingPays ? (
                      <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-foreground-400">
                        <i className="ri-loader-4-line animate-spin"></i>Chargement...
                      </div>
                    ) : (
                      <select
                        value={profile.paysId}
                        onChange={(e) => setProfile({ ...profile, paysId: e.target.value, villeId: '' })}
                        className="w-full px-3 py-2.5 bg-background-100 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors cursor-pointer appearance-none"
                        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '2.5rem' }}
                      >
                        <option value="">Sélectionner un pays</option>
                        {paysList.map((p) => (
                          <option key={p.id} value={p.codepays}>{p.nom_pays}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-600 mb-1.5">Ville</label>
                    {!profile.paysId ? (
                      <input
                        type="text"
                        disabled
                        placeholder="Sélectionnez d&apos;abord un pays"
                        className="w-full px-3 py-2.5 bg-background-200/50 border border-background-200/70 rounded-lg text-sm text-foreground-400 cursor-not-allowed"
                      />
                    ) : loadingVilles ? (
                      <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-foreground-400">
                        <i className="ri-loader-4-line animate-spin"></i>Chargement...
                      </div>
                    ) : villeList.length === 0 ? (
                      <input
                        type="text"
                        value={profile.villeId}
                        onChange={(e) => setProfile({ ...profile, villeId: e.target.value })}
                        placeholder="Saisissez votre ville"
                        className="w-full px-3 py-2.5 bg-background-100 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors"
                      />
                    ) : (
                      <select
                        value={profile.villeId}
                        onChange={(e) => setProfile({ ...profile, villeId: e.target.value })}
                        className="w-full px-3 py-2.5 bg-background-100 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors cursor-pointer appearance-none"
                        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '2.5rem' }}
                      >
                        <option value="">Sélectionner une ville</option>
                        {villeList.map((v) => (
                          <option key={v.id} value={v.id}>{v.nom_ville}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-xs font-medium text-foreground-600 mb-1.5">Quartier</label>
                  <input
                    type="text"
                    value={profile.quartier}
                    onChange={(e) => setProfile({ ...profile, quartier: e.target.value })}
                    placeholder="Ex: Hay Riad, Plateau..."
                    className="w-full px-3 py-2.5 bg-background-100 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors"
                  />
                </div>
                <div className="mt-4">
                  <label className="block text-xs font-medium text-foreground-600 mb-1.5">Adresse complète</label>
                  <input
                    type="text"
                    value={profile.adresse}
                    onChange={(e) => setProfile({ ...profile, adresse: e.target.value })}
                    placeholder="Ex: 123 Avenue Hassan II"
                    className="w-full px-3 py-2.5 bg-background-100 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors"
                  />
                </div>
              </div>

              <div className="border-t border-background-200/70 pt-4">
                <h4 className="text-xs font-semibold text-foreground-500 uppercase tracking-wider mb-3">Préférences</h4>
                <div>
                  <label className="block text-xs font-medium text-foreground-600 mb-1.5">Devise (Monnaie)</label>
                  {loadingMonnaie ? (
                    <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-foreground-400">
                      <i className="ri-loader-4-line animate-spin"></i>Chargement...
                    </div>
                  ) : (
                    <select
                      value={profile.monaie}
                      onChange={(e) => setProfile({ ...profile, monaie: e.target.value })}
                      className="w-full px-3 py-2.5 bg-background-100 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors cursor-pointer appearance-none"
                      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '2.5rem' }}
                    >
                      {monnaieList.map((m) => (
                        <option key={m.id} value={m.code}>{m.code} — {m.nom} ({m.symbole})</option>
                      ))}
                    </select>
                  )}
                  <p className="text-xs text-foreground-400 mt-1">La devise utilisée pour afficher les prix dans votre boutique</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap hover:bg-primary-600 transition-colors cursor-pointer disabled:opacity-50"
              >
                {saving ? <><i className="ri-loader-4-line animate-spin"></i>Sauvegarde...</> : <><i className="ri-check-line"></i>Enregistrer</>}
              </button>
              {saved && (
                <span className="text-sm text-accent-600 flex items-center gap-1">
                  <i className="ri-checkbox-circle-line"></i>Profil mis à jour
                </span>
              )}
            </div>
          </div>
        )}

        {activeTab === 'password' && (
          <div className="bg-background-50 border border-background-200/70 rounded-lg p-5 md:p-6">
            <h3 className="text-sm font-semibold text-foreground-700 mb-4">Changer le mot de passe</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground-600 mb-1.5">Mot de passe actuel</label>
                <input
                  type="password"
                  value={password.current}
                  onChange={(e) => setPassword({ ...password, current: e.target.value })}
                  className="w-full px-3 py-2.5 bg-background-100 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-600 mb-1.5">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={password.newPass}
                  onChange={(e) => setPassword({ ...password, newPass: e.target.value })}
                  className="w-full px-3 py-2.5 bg-background-100 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-600 mb-1.5">Confirmer le mot de passe</label>
                <input
                  type="password"
                  value={password.confirm}
                  onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                  className="w-full px-3 py-2.5 bg-background-100 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors"
                />
              </div>
              {passwordError && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <i className="ri-error-warning-line"></i>{passwordError}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleChangePassword}
                disabled={saving || !password.current || !password.newPass}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap hover:bg-primary-600 transition-colors cursor-pointer disabled:opacity-50"
              >
                {saving ? <><i className="ri-loader-4-line animate-spin"></i>Modification...</> : 'Changer le mot de passe'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'domain' && (
          <div className="bg-background-50 border border-background-200/70 rounded-lg p-5 md:p-6">
            <h3 className="text-sm font-semibold text-foreground-700 mb-1">Nom de domaine</h3>
            <p className="text-xs text-foreground-500 mb-5">Configurez l&apos;adresse de votre boutique en ligne</p>

            {loadingDomain ? (
              <div className="flex items-center gap-2 text-sm text-foreground-400 py-4">
                <i className="ri-loader-4-line animate-spin"></i>Chargement...
              </div>
            ) : (
              <div className="space-y-5">
                {/* Current subdomain (always shown) */}
                <div className="p-4 bg-background-100 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground-500 flex items-center gap-1.5">
                      <i className="ri-global-line"></i>Sous-domaine Zifek
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent-100 text-accent-700 font-medium">Gratuit</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground-900">{cleanDisplayUrl(subdomain)}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(subdomain).then(() => {
                          setDomainCopied(true);
                          setTimeout(() => setDomainCopied(false), 2000);
                        });
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-background-200/70 transition-colors cursor-pointer"
                      title="Copier l'URL"
                    >
                      <i className={`text-xs ${domainCopied ? 'ri-check-line text-accent-500' : 'ri-file-copy-line text-foreground-400'}`}></i>
                    </button>
                  </div>
                </div>

                {/* Custom domain */}
                <div className="p-4 bg-background-100 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-foreground-500 flex items-center gap-1.5">
                      <i className="ri-link-m"></i>
                      {hasCustomDomain ? 'Domaine personnalisé' : 'Ajouter un domaine personnalisé'}
                    </span>
                    {hasCustomDomain && (
                      domainVerified ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium flex items-center gap-1">
                          <i className="ri-shield-check-line"></i>Vérifié
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium flex items-center gap-1">
                          <i className="ri-time-line"></i>En attente
                        </span>
                      )
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-foreground-400">https://</span>
                      <input
                        type="text"
                        value={domainInput}
                        onChange={(e) => { setDomainInput(e.target.value); setDomainError(''); }}
                        placeholder="www.maboutique.com"
                        className="w-full pl-14 pr-3 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors"
                      />
                    </div>
                    <button
                      onClick={handleSaveDomain}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap hover:bg-primary-600 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {saving ? <><i className="ri-loader-4-line animate-spin"></i></> : <i className="ri-check-line"></i>}
                      <span>{hasCustomDomain ? 'Mettre à jour' : 'Ajouter'}</span>
                    </button>
                  </div>

                  {domainError && (
                    <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                      <i className="ri-error-warning-line"></i>{domainError}
                    </p>
                  )}

                  {domainSaved && (
                    <p className="text-xs text-accent-600 mt-2 flex items-center gap-1">
                      <i className="ri-checkbox-circle-line"></i>Domaine {hasCustomDomain ? 'mis à jour' : 'ajouté'} avec succès
                    </p>
                  )}

                  {hasCustomDomain && (
                    <button
                      onClick={handleRemoveDomain}
                      className="mt-3 text-xs text-foreground-400 hover:text-red-500 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <i className="ri-delete-bin-line text-xs"></i>Supprimer le domaine personnalisé
                    </button>
                  )}

                  {/* Instructions de liaison DNS */}
                  {hasCustomDomain && domainInput.trim() && (
                    <div className="mt-4 p-3 rounded-lg bg-accent-50 border border-accent-100">
                      <div className="flex items-center gap-2 mb-2">
                        <i className="ri-guide-line text-accent-600 text-sm"></i>
                        <span className="text-xs font-semibold text-accent-700">Comment lier votre domaine</span>
                      </div>
                      <p className="text-xs text-foreground-600 mb-3">
                        Chez votre registrar (OVH, GoDaddy, Namecheap…), créez l&apos;enregistrement suivant pour relier votre domaine à votre boutique :
                      </p>

                      <div className="flex items-center gap-3 bg-background-50 rounded-md px-3 py-2.5 border border-background-200/70">
                        <div className="flex-1">
                          <div className="text-[10px] text-foreground-400 uppercase tracking-wide mb-0.5">Type</div>
                          <div className="text-xs font-mono font-semibold text-foreground-900">{domainPrefersWww ? 'CNAME' : 'ALIAS / ANAME'}</div>
                        </div>
                        <div className="flex-1">
                          <div className="text-[10px] text-foreground-400 uppercase tracking-wide mb-0.5">Nom / Hôte</div>
                          <div className="text-xs font-mono text-foreground-900">{domainPrefersWww ? 'www' : '@ (racine)'}</div>
                        </div>
                        <div className="flex-1">
                          <div className="text-[10px] text-foreground-400 uppercase tracking-wide mb-0.5">Valeur / Cible</div>
                          <div className="text-xs font-mono text-foreground-900">{cleanDisplayUrl(subdomain)}</div>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(cleanDisplayUrl(subdomain)).then(() => {
                              setDomainCopied(true);
                              setTimeout(() => setDomainCopied(false), 2000);
                            });
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-background-200/70 transition-colors cursor-pointer shrink-0"
                          title="Copier la cible"
                        >
                          <i className={`text-sm ${domainCopied ? 'ri-check-line text-accent-500' : 'ri-file-copy-line text-foreground-400'}`}></i>
                        </button>
                      </div>

                      <p className="text-[11px] text-foreground-500 mt-3 leading-relaxed">
                        <i className="ri-information-line mr-1"></i>
                        {domainPrefersWww ? (
                          <>La version racine (ex. {domainApex} sans « www ») sera <span className="font-semibold">automatiquement redirigée</span> vers www.{domainApex}. Chez votre registrar, ajoutez une redirection 301 de la racine vers www.{domainApex}, ou utilisez un enregistrement ALIAS/ANAME si votre registrar le permet.</>
                        ) : (
                          <>La version « www » (ex. www.{domainApex}) sera <span className="font-semibold">automatiquement redirigée</span> vers {domainApex}. Chez votre registrar, ajoutez une redirection 301 de www.{domainApex} vers {domainApex}.</>
                        )}
                      </p>
                    </div>
                  )}

                  {/* DNS Verification */}
                  {hasCustomDomain && domainInput.trim() && (
                    <div className="mt-4 pt-4 border-t border-background-200/70">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-foreground-500 flex items-center gap-1.5">
                          <i className="ri-radar-line"></i>Vérification DNS
                        </span>
                        <button
                          onClick={checkDns}
                          disabled={dnsChecking}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap bg-background-50 border border-background-200/70 text-foreground-600 hover:text-foreground-800 hover:border-background-300/60 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {dnsChecking ? (
                            <><i className="ri-loader-4-line animate-spin"></i>Vérification...</>
                          ) : (
                            <><i className="ri-refresh-line"></i>Vérifier maintenant</>
                          )}
                        </button>
                      </div>

                      {/* DNS Status */}
                      {dnsStatus !== 'idle' && (
                        <div className={`mt-2 p-3 rounded-lg ${
                          dnsStatus === 'checking' ? 'bg-background-200/50' :
                          dnsStatus === 'ok' ? 'bg-green-50' :
                          dnsStatus === 'no_dns' ? 'bg-amber-50' :
                          dnsStatus === 'not_reachable' ? 'bg-amber-50' :
                          'bg-red-50'
                        }`}>
                          {/* Checking */}
                          {dnsStatus === 'checking' && (
                            <div className="flex items-center gap-2">
                              <i className="ri-loader-4-line animate-spin text-foreground-500 text-sm"></i>
                              <span className="text-xs text-foreground-500">Analyse du domaine en cours...</span>
                            </div>
                          )}

                          {/* OK */}
                          {dnsStatus === 'ok' && (
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <i className="ri-checkbox-circle-line text-green-600 text-sm"></i>
                                <span className="text-xs font-semibold text-green-700">Domaine configuré et actif</span>
                              </div>
                              <p className="text-xs text-green-600">Le DNS est correctement configuré et le site est accessible.</p>
                              {dnsRecords.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {dnsRecords.map((ip) => (
                                    <span key={ip} className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 font-mono">{ip}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* No DNS */}
                          {dnsStatus === 'no_dns' && (
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <i className="ri-error-warning-line text-amber-600 text-sm"></i>
                                <span className="text-xs font-semibold text-amber-700">Aucun enregistrement DNS trouvé</span>
                              </div>
                              <p className="text-xs text-amber-600">
                                Aucun enregistrement DNS trouvé pour ce domaine. Ajoutez l&apos;enregistrement CNAME indiqué ci-dessus dans la configuration DNS de votre registrar, puis patientez quelques minutes (propagation DNS).
                              </p>
                            </div>
                          )}

                          {/* Not reachable */}
                          {dnsStatus === 'not_reachable' && (
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <i className="ri-error-warning-line text-amber-600 text-sm"></i>
                                <span className="text-xs font-semibold text-amber-700">DNS configuré mais cible incorrecte</span>
                              </div>
                              <p className="text-xs text-amber-600">
                                L&apos;enregistrement pointe vers {dnsRecords.length > 0 ? dnsRecords.join(', ') : 'une autre destination'} au lieu de votre sous-domaine Zifek ({cleanDisplayUrl(subdomain)}). Vérifiez la cible dans la configuration DNS.
                              </p>
                              {dnsRecords.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {dnsRecords.map((ip) => (
                                    <span key={ip} className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-mono">{ip}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Error */}
                          {dnsStatus === 'error' && (
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <i className="ri-close-circle-line text-red-600 text-sm"></i>
                                <span className="text-xs font-semibold text-red-700">Erreur de vérification</span>
                              </div>
                              <p className="text-xs text-red-600">Impossible de vérifier le domaine. Réessayez dans quelques instants.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Preview */}
                <div className="p-4 bg-background-100 rounded-lg">
                  <span className="text-xs font-medium text-foreground-500 flex items-center gap-1.5 mb-2">
                    <i className="ri-eye-line"></i>Aperçu
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground-900">
                      {hasCustomDomain && domainInput.trim() ? (
                        <>https://{domainInput.trim()}</>
                      ) : (
                        cleanDisplayUrl(subdomain)
                      )}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${hasCustomDomain && domainInput.trim() ? 'bg-primary-50 text-primary-700' : 'bg-accent-100 text-accent-700'}`}>
                      {hasCustomDomain && domainInput.trim() ? 'Domaine perso' : 'Sous-domaine'}
                    </span>
                  </div>
                  <p className="text-xs text-foreground-400 mt-2">
                    {hasCustomDomain && domainInput.trim()
                      ? 'Votre boutique sera accessible via votre propre nom de domaine. Assurez-vous que le DNS pointe bien vers nos serveurs.'
                      : 'Votre boutique est accessible via votre sous-domaine Zifek gratuit. Ajoutez un domaine personnalisé ci-dessus pour utiliser votre propre adresse.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'apparence' && (
          <div className="bg-background-50 border border-background-200/70 rounded-lg p-5 md:p-6">
            <h3 className="text-sm font-semibold text-foreground-700 mb-1">Charte graphique</h3>
            <p className="text-xs text-foreground-500 mb-5">Définissez la couleur principale de votre boutique. Le reste de la palette est généré automatiquement.</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Color picker */}
              <div className="space-y-5">
                {/* Current color & hex input */}
                <div>
                  <label className="block text-xs font-medium text-foreground-600 mb-2">Couleur principale</label>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <input
                        type="color"
                        value={charteInput}
                        onChange={(e) => setCharteInput(e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div
                        className="w-10 h-10 rounded-lg border border-background-300/60 cursor-pointer transition-shadow hover:ring-2 hover:ring-offset-1 hover:ring-primary-300"
                        style={{ backgroundColor: charteInput }}
                      />
                    </div>
                    <input
                      type="text"
                      value={charteInput}
                      onChange={(e) => {
                        const v = e.target.value;
                        setCharteInput(v.startsWith('#') ? v : `#${v}`);
                      }}
                      placeholder="#C2654A"
                      maxLength={7}
                      className="flex-1 px-3 py-2.5 bg-background-100 border border-background-200/70 rounded-lg text-sm font-mono text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors"
                    />
                  </div>
                </div>

                {/* Presets */}
                <div>
                  <label className="block text-xs font-medium text-foreground-600 mb-2">Couleurs suggérées</label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((preset) => (
                      <button
                        key={preset.hex}
                        onClick={() => setCharteInput(preset.hex)}
                        className={`group relative w-9 h-9 rounded-lg border-2 cursor-pointer transition-all hover:scale-110 ${
                          charteInput === preset.hex
                            ? 'border-foreground-900 scale-110 ring-2 ring-offset-1 ring-foreground-300'
                            : 'border-transparent hover:border-background-300/60'
                        }`}
                        title={preset.name}
                        style={{ backgroundColor: preset.hex }}
                      >
                        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-foreground-400 opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                          {preset.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleSaveCharte}
                    disabled={saving || !charteInput}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-background-50 rounded-full text-sm font-medium whitespace-nowrap hover:bg-primary-600 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {saving ? <><i className="ri-loader-4-line animate-spin"></i>Sauvegarde...</> : <><i className="ri-check-line"></i>Appliquer</>}
                  </button>
                  {user?.couleurcharte && (
                    <button
                      onClick={handleResetCharte}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-4 py-2.5 text-xs text-foreground-500 hover:text-red-500 rounded-full border border-background-200/70 hover:border-red-200 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <i className="ri-arrow-go-back-line"></i>Réinitialiser
                    </button>
                  )}
                  {charteSaved && (
                    <span className="text-sm text-accent-600 flex items-center gap-1">
                      <i className="ri-checkbox-circle-line"></i>Appliquée
                    </span>
                  )}
                </div>
              </div>

              {/* Right: Live preview */}
              {chartePreview && (
                <div className="bg-background-100 rounded-lg p-4 space-y-3">
                  <span className="text-xs font-medium text-foreground-500 flex items-center gap-1.5">
                    <i className="ri-eye-line"></i>Aperçu de la palette
                  </span>

                  {/* Primary + Accent */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="h-12 rounded-md flex items-center justify-center text-[11px] font-medium" style={{ backgroundColor: chartePreview.primary, color: chartePreview.primaryFg }}>
                        Principal
                      </div>
                      <span className="block text-[10px] text-foreground-400 mt-1 text-center font-mono">{chartePreview.primary}</span>
                    </div>
                    <div>
                      <div className="h-12 rounded-md flex items-center justify-center text-[11px] font-medium text-white" style={{ backgroundColor: chartePreview.accent }}>
                        Accent
                      </div>
                      <span className="block text-[10px] text-foreground-400 mt-1 text-center font-mono">{chartePreview.accent}</span>
                    </div>
                  </div>

                  {/* Secondary */}
                  <div>
                    <div className="h-8 rounded-md flex items-center justify-center text-[11px] font-medium text-white" style={{ backgroundColor: chartePreview.secondary }}>
                      Secondaire
                    </div>
                    <span className="block text-[10px] text-foreground-400 mt-0.5 text-center font-mono">{chartePreview.secondary}</span>
                  </div>

                  {/* Light/Dark variants */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-6 rounded flex items-center justify-center text-[10px] font-medium" style={{ backgroundColor: chartePreview.primaryLight, color: chartePreview.foreground }}>
                      Clair
                    </div>
                    <div className="h-6 rounded flex items-center justify-center text-[10px] font-medium text-white" style={{ backgroundColor: chartePreview.primaryDark }}>
                      Foncé
                    </div>
                  </div>

                  {/* Live CTA button preview */}
                  <div className="pt-2 border-t border-background-200/70">
                    <span className="text-[10px] text-foreground-400 block mb-2">Aperçu bouton</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap"
                        style={{ backgroundColor: chartePreview.primary, color: chartePreview.primaryFg }}
                      >
                        Commander
                      </div>
                      <div
                        className="px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap border"
                        style={{ borderColor: chartePreview.primary, color: chartePreview.primary }}
                      >
                        En savoir plus
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'danger' && (
          <div className="bg-background-50 border border-red-200 rounded-lg p-5 md:p-6">
            <h3 className="text-sm font-semibold text-red-600 mb-4 flex items-center gap-2">
              <i className="ri-error-warning-line"></i>Zone de danger
            </h3>
            <p className="text-sm text-foreground-600 mb-4">
              Ces actions sont irréversibles. Veuillez être absolument certain avant de continuer.
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                <div>
                  <div className="text-sm font-semibold text-red-700">Supprimer tous les produits</div>
                  <p className="text-xs text-red-500 mt-0.5">Supprime définitivement tout votre catalogue</p>
                </div>
                <button className="px-4 py-2 border border-red-300 text-red-600 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer hover:bg-red-100 transition-colors">
                  Supprimer
                </button>
              </div>
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                <div>
                  <div className="text-sm font-semibold text-red-700">Désactiver le compte</div>
                  <p className="text-xs text-red-500 mt-0.5">Votre boutique sera masquée jusqu&apos;à réactivation</p>
                </div>
                <button className="px-4 py-2 border border-red-300 text-red-600 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer hover:bg-red-100 transition-colors">
                  Désactiver
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}