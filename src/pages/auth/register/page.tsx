import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, isSuperAdmin, type RegisterData } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { APP_DOMAIN, buildSubdomainHost } from '@/lib/domain';
import { validateUsername } from '@/lib/username';
import { useUsernameAvailability } from '@/hooks/useUsernameAvailability';
import Navbar from '@/pages/home/components/Navbar';
import Footer from '@/pages/home/components/Footer';

interface TypeCompte {
  id: number;
  nom: string;
  statustypecompte: number;
  page: string;
}

interface PaysOption {
  id: number;
  nom_pays: string;
}

interface VilleOption {
  id: number;
  id_pays: number;
  nom_ville: string;
}

const BENEFITS = [
  { icon: 'ri-rocket-line', text: 'Site professionnel en 5 minutes' },
  { icon: 'ri-brain-line', text: 'Boosté à l&apos;IA générative' },
  { icon: 'ri-smartphone-line', text: '100% responsive, mobile-first' },
  { icon: 'ri-shield-check-line', text: 'Hébergement sécurisé inclus' },
];

export default function RegisterPage() {
  const { user, register, loading } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    user_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    nomcommerce: '',
    telephone: '',
    typecompte: 3,
    type: 'Boutique',
    "Pays": '',
    "Ville": '',
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);

  // DB data
  const [typesCompte, setTypesCompte] = useState<TypeCompte[]>([]);
  const [paysList, setPaysList] = useState<PaysOption[]>([]);
  const [villeList, setVilleList] = useState<VilleOption[]>([]);
  const [fetching, setFetching] = useState(true);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate(isSuperAdmin(user.typecompte) ? '/superadmin' : '/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Fetch DB data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tcRes, paysRes] = await Promise.all([
          supabase.from('typecompte').select('*').order('ordre'),
          supabase.from('pays').select('id, nom_pays').order('nom_pays'),
        ]);

        const tcData = (tcRes.data || []).filter((t: TypeCompte) => t.nom && t.statustypecompte === 0);
        setTypesCompte(tcData);

        const paysData = (paysRes.data || []) as PaysOption[];
        setPaysList(paysData);

        // Default to Maroc (id=1) if available
        const maroc = paysData.find((p) => p.id === 1);
        if (maroc && !formData["Pays"]) {
          setFormData((prev) => ({ ...prev, "Pays": maroc.nom_pays }));
          const { data: villes } = await supabase
            .from('ville')
            .select('id, id_pays, nom_ville')
            .eq('id_pays', 1)
            .order('nom_ville');
          setVilleList((villes || []) as VilleOption[]);
        }
      } catch { /* fail silently */ }
      finally { setFetching(false); }
    };
    fetchData();
  }, []);

  // When pays changes, fetch villes
  const handlePaysChange = async (paysNom: string) => {
    setFormData((prev) => ({ ...prev, "Pays": paysNom, "Ville": '' }));
    const pays = paysList.find((p) => p.nom_pays === paysNom);
    if (pays) {
      try {
        const { data: villes } = await supabase
          .from('ville')
          .select('id, id_pays, nom_ville')
          .eq('id_pays', pays.id)
          .order('nom_ville');
        setVilleList((villes || []) as VilleOption[]);
      } catch { setVilleList([]); }
    } else {
      setVilleList([]);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const usernameValidation = validateUsername(formData.user_name);
  const { status: usernameStatus, message: usernameStatusMessage } = useUsernameAvailability(formData.user_name);

  const handleNext = () => {
    setError('');
    if (step === 1) {
      if (!formData.name || !formData.email || !formData.user_name) {
        setError('Veuillez remplir tous les champs obligatoires.');
        return;
      }
      if (!usernameValidation.valid) {
        setError(usernameValidation.error || 'Nom d\u2019utilisateur invalide.');
        return;
      }
      if (formData.password.length < 6) {
        setError('Le mot de passe doit contenir au moins 6 caract&egrave;res.');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Les mots de passe ne correspondent pas.');
        return;
      }
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (step === 1) {
      handleNext();
      return;
    }

    if (!formData.nomcommerce) {
      setError('Le nom de votre boutique est obligatoire.');
      return;
    }
    if (!formData.typecompte) {
      setError('Veuillez selectionner un type de compte.');
      return;
    }
    if (!formData["Pays"]) {
      setError('Veuillez selectionner votre pays.');
      return;
    }
    if (!formData["Ville"]) {
      setError('Veuillez selectionner votre ville.');
      return;
    }

    const data: RegisterData = {
      user_name: formData.user_name,
      email: formData.email,
      password: formData.password,
      name: formData.name,
      nomcommerce: formData.nomcommerce,
      telephone: formData.telephone,
      type: formData.type,
      typecompte: formData.typecompte,
      "Pays": formData["Pays"],
      "Ville": formData["Ville"],
    };

    const result = await register(data);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Erreur lors de l&apos;inscription.');
    }
  };

  const inputClass = "w-full h-11 px-4 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300 transition-colors";
  const selectClass = "w-full h-11 px-3 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300 transition-colors cursor-pointer";

  const StepIndicator = () => (
    <div className="flex items-center gap-0 mb-8">
      <div className="flex items-center gap-3">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300 ${step >= 1 ? 'bg-primary-500 text-white shadow-sm' : 'bg-background-200 text-foreground-400'}`}>
          {step > 1 ? <i className="ri-check-line text-sm"></i> : '1'}
        </div>
        <span className={`text-sm font-medium transition-colors duration-300 ${step >= 1 ? 'text-foreground-900' : 'text-foreground-400'}`}>Compte</span>
      </div>
      <div className={`flex-1 h-px mx-4 transition-colors duration-300 ${step >= 2 ? 'bg-primary-400' : 'bg-background-200'}`}></div>
      <div className="flex items-center gap-3">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300 ${step >= 2 ? 'bg-primary-500 text-white shadow-sm' : 'bg-background-200 text-foreground-400'}`}>
          2
        </div>
        <span className={`text-sm font-medium transition-colors duration-300 ${step >= 2 ? 'text-foreground-900' : 'text-foreground-400'}`}>Boutique</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background-50 flex flex-col">
      <Navbar forceScrolled={true} />

      <main className="flex-1 flex pt-20">
        {/* --- Left Brand Panel --- */}
        <div className="hidden lg:flex lg:w-[44%] xl:w-[42%] relative overflow-hidden bg-foreground-950">
          {/* Background image */}
          <div className="absolute inset-0">
            <img
              src="https://readdy.ai/api/search-image?query=Warm%20abstract%20organic%20flowing%20shapes%20with%20coral%20terracotta%20and%20amber%20tones%20on%20deep%20dark%20background%2C%20modern%20SaaS%20aesthetic%2C%20soft%20flowing%20gradients%20with%20subtle%20geometric%20accents%2C%20sophisticated%20minimal%20composition%2C%20premium%20brand%20atmosphere%2C%20no%20text%2C%20elegant%20abstract%20art&width=900&height=1100&seq=zifek-register-bg-01&orientation=portrait"
              alt=""
              className="w-full h-full object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-foreground-950/85 via-foreground-950/70 to-foreground-950/50"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-center w-full px-12 xl:px-16 py-16">
            <div className="mb-10">
              <Link to="/" className="inline-flex items-center gap-2.5 group">
                <div className="w-10 h-10 rounded-lg bg-primary-500 flex items-center justify-center">
                  <i className="ri-store-2-line text-white text-lg"></i>
                </div>
                <span className="text-white font-bold text-xl font-heading tracking-tight">ZIFEK</span>
              </Link>
            </div>

            <h2 className="text-3xl xl:text-4xl font-bold font-heading text-white leading-tight mb-5">
              Lancez votre business
              <br />
              <span className="text-accent-300">en ligne aujourd&apos;hui</span>
            </h2>
            <p className="text-white/55 text-base leading-relaxed mb-10 max-w-md">
              Rejoignez plus de 12 000 entrepreneurs qui utilisent ZIFEK pour créer, gérer et d&eacute;velopper leur activit&eacute; — sans &eacute;crire une seule ligne de code.
            </p>

            <div className="space-y-4 mb-12">
              {BENEFITS.map((b, i) => (
                <div key={i} className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-white/8 flex items-center justify-center flex-shrink-0">
                    <i className={`${b.icon} text-accent-300 text-base`}></i>
                  </div>
                  <span className="text-white/70 text-sm font-medium">{b.text}</span>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-1.5">
                  <div className="w-7 h-7 rounded-full border-2 border-foreground-950 bg-background-200 overflow-hidden">
                    <img src="https://readdy.ai/api/search-image?query=Professional%20headshot%20portrait%20of%20young%20African%20male%20entrepreneur%20with%20clean%20neutral%20background%2C%20warm%20lighting%2C%20friendly%20confident%20expression%2C%20modern%20business%20attire%2C%20minimal%20studio%20photography&width=64&height=64&seq=zifek-av-reg-01&orientation=squarish" alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="w-7 h-7 rounded-full border-2 border-foreground-950 bg-background-200 overflow-hidden">
                    <img src="https://readdy.ai/api/search-image?query=Professional%20headshot%20portrait%20of%20female%20business%20owner%20Middle%20Eastern%20with%20clean%20neutral%20background%2C%20warm%20lighting%2C%20confident%20smile%2C%20modern%20elegant%20style%2C%20minimal%20studio%20photography&width=64&height=64&seq=zifek-av-reg-02&orientation=squarish" alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="w-7 h-7 rounded-full border-2 border-foreground-950 bg-background-200 overflow-hidden">
                    <img src="https://readdy.ai/api/search-image?query=Professional%20headshot%20portrait%20of%20male%20artisan%20craftsman%20with%20clean%20neutral%20background%2C%20warm%20lighting%2C%20genuine%20friendly%20smile%2C%20modern%20casual%20style%2C%20minimal%20studio%20photography&width=64&height=64&seq=zifek-av-reg-03&orientation=squarish" alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="w-7 h-7 rounded-full border-2 border-foreground-950 bg-background-200 overflow-hidden">
                    <img src="https://readdy.ai/api/search-image?query=Professional%20headshot%20portrait%20of%20creative%20female%20designer%20entrepreneur%20with%20clean%20neutral%20background%2C%20warm%20lighting%2C%20approachable%20expression%2C%20modern%20casual%20chic%20style%2C%20minimal%20studio%20photography&width=64&height=64&seq=zifek-av-reg-04&orientation=squarish" alt="" className="w-full h-full object-cover" />
                  </div>
                </div>
                <p className="text-white/40 text-xs">
                  <strong className="text-white/80 font-semibold">4.8/5</strong> sur +800 avis
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* --- Right Form Panel --- */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-8 lg:px-12 xl:px-16 py-10 lg:py-0">
          <div className="w-full max-w-md">
            {/* Mobile-only brand header */}
            <div className="lg:hidden text-center mb-8">
              <Link to="/" className="inline-flex items-center gap-2 mb-5">
                <div className="w-9 h-9 rounded-lg bg-primary-500 flex items-center justify-center">
                  <i className="ri-store-2-line text-white text-base"></i>
                </div>
                <span className="text-foreground-950 font-bold text-lg font-heading">ZIFEK</span>
              </Link>
              <h1 className="text-xl font-bold font-heading text-foreground-950 mb-1.5">
                Cr&eacute;ez votre boutique
              </h1>
              <p className="text-foreground-500 text-sm">
                Lancez votre business en ligne en quelques minutes
              </p>
            </div>

            {/* Desktop title */}
            <div className="hidden lg:block mb-8">
              <h1 className="text-2xl font-bold font-heading text-foreground-950 mb-1.5">
                Cr&eacute;ez votre compte ZIFEK
              </h1>
              <p className="text-foreground-500 text-sm">
                Commencez gratuitement, sans carte bancaire
              </p>
            </div>

            {fetching ? (
              <div className="bg-background-50 border border-background-200/70 rounded-xl p-12 flex items-center justify-center">
                <i className="ri-loader-4-line animate-spin text-2xl text-foreground-300"></i>
              </div>
            ) : (
              <div className="bg-background-50 border border-background-200/70 rounded-xl p-6 sm:p-8">
                <StepIndicator />

                {error && (
                  <div className="mb-5 p-3 rounded-lg bg-red-50/80 border border-red-100 text-red-700 text-sm flex items-start gap-2.5">
                    <i className="ri-error-warning-line flex-shrink-0 mt-0.5"></i>
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {step === 1 && (
                    <div className="space-y-4 animate-fade-in">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-foreground-700 mb-1.5">
                          Nom complet <span className="text-red-400">*</span>
                        </label>
                        <input
                          id="name"
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={(e) => updateField('name', e.target.value)}
                          placeholder="Votre nom complet"
                          required
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-foreground-700 mb-1.5">
                          Email <span className="text-red-400">*</span>
                        </label>
                        <input
                          id="email"
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={(e) => updateField('email', e.target.value)}
                          placeholder="vous@exemple.com"
                          required
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label htmlFor="user_name" className="block text-sm font-medium text-foreground-700 mb-1.5">
                          Nom d&apos;utilisateur <span className="text-red-400">*</span>
                        </label>
                        <div className="flex items-center rounded-md border border-background-200/70 bg-background-50 focus-within:border-primary-300 focus-within:ring-1 focus-within:ring-primary-300 transition-colors overflow-hidden">
                          <input
                            id="user_name"
                            type="text"
                            name="user_name"
                            value={formData.user_name}
                            onChange={(e) => updateField('user_name', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                            placeholder="nomutilisateur"
                            required
                            className="flex-1 h-11 px-4 bg-transparent text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none"
                          />
                          <span className="h-11 flex items-center px-4 bg-background-100 border-l border-background-200/70 text-sm text-foreground-400 font-medium whitespace-nowrap select-none">
                            .{APP_DOMAIN}
                          </span>
                        </div>
                        {formData.user_name && !usernameValidation.valid && (
                          <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                            <i className="ri-error-warning-line"></i>{usernameValidation.error}
                          </p>
                        )}
                        {formData.user_name && usernameValidation.valid && usernameStatus === 'checking' && (
                          <p className="text-xs text-foreground-400 mt-1.5 flex items-center gap-1">
                            <i className="ri-loader-4-line animate-spin"></i>V&eacute;rification de la disponibilit&eacute;...
                          </p>
                        )}
                        {formData.user_name && usernameValidation.valid && usernameStatus === 'taken' && (
                          <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                            <i className="ri-close-circle-line"></i>{usernameStatusMessage || 'Ce nom est d\u00e9j\u00e0 pris.'}
                          </p>
                        )}
                        {formData.user_name && usernameValidation.valid && usernameStatus === 'available' && (
                          <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
                            <i className="ri-checkbox-circle-line"></i>Disponible ! Votre site : <strong>{buildSubdomainHost(usernameValidation.normalized)}</strong>
                          </p>
                        )}
                        {formData.user_name && usernameValidation.valid && usernameStatus === 'idle' && (
                          <p className="text-xs text-foreground-400 mt-1.5">
                            Votre site sera accessible sur : <strong className="text-foreground-600">{buildSubdomainHost(usernameValidation.normalized)}</strong>
                          </p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="password" className="block text-sm font-medium text-foreground-700 mb-1.5">
                          Mot de passe <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                          <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={formData.password}
                            onChange={(e) => updateField('password', e.target.value)}
                            placeholder="6 caract&egrave;res minimum"
                            required
                            className={`${inputClass} pr-10`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-400 hover:text-foreground-600 cursor-pointer"
                            aria-label={showPassword ? 'Cacher' : 'Afficher'}
                          >
                            <i className={`text-lg ${showPassword ? 'ri-eye-off-line' : 'ri-eye-line'}`}></i>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground-700 mb-1.5">
                          Confirmer le mot de passe <span className="text-red-400">*</span>
                        </label>
                        <input
                          id="confirmPassword"
                          type="password"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={(e) => updateField('confirmPassword', e.target.value)}
                          placeholder="Confirmez votre mot de passe"
                          required
                          className={inputClass}
                        />
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-4 animate-fade-in">
                      <div>
                        <label htmlFor="nomcommerce" className="block text-sm font-medium text-foreground-700 mb-1.5">
                          Nom de votre boutique <span className="text-red-400">*</span>
                        </label>
                        <input
                          id="nomcommerce"
                          type="text"
                          name="nomcommerce"
                          value={formData.nomcommerce}
                          onChange={(e) => updateField('nomcommerce', e.target.value)}
                          placeholder="MaBoutique"
                          required
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label htmlFor="typecompte" className="block text-sm font-medium text-foreground-700 mb-1.5">
                          Type de compte <span className="text-red-400">*</span>
                        </label>
                        <select
                          id="typecompte"
                          name="typecompte"
                          value={formData.typecompte}
                          onChange={(e) => {
                            const selectedId = parseInt(e.target.value, 10);
                            const found = typesCompte.find((t) => t.id === selectedId);
                            updateField('typecompte', String(selectedId));
                            if (found) updateField('type', found.nom);
                          }}
                          required
                          className={selectClass}
                        >
                          <option value="">S&eacute;lectionnez un type de compte</option>
                          {typesCompte.map((tc) => (
                            <option key={tc.id} value={tc.id}>{tc.nom}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="telephone" className="block text-sm font-medium text-foreground-700 mb-1.5">
                          T&eacute;l&eacute;phone
                        </label>
                        <input
                          id="telephone"
                          type="tel"
                          name="telephone"
                          value={formData.telephone}
                          onChange={(e) => updateField('telephone', e.target.value)}
                          placeholder="+212 6XX XXX XXX"
                          className={inputClass}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="Pays" className="block text-sm font-medium text-foreground-700 mb-1.5">
                            Pays <span className="text-red-400">*</span>
                          </label>
                          <select
                            id="Pays"
                            name="Pays"
                            value={formData["Pays"]}
                            onChange={(e) => handlePaysChange(e.target.value)}
                            required
                            className={selectClass}
                          >
                            <option value="">S&eacute;lectionnez un pays</option>
                            {paysList.map((p) => (
                              <option key={p.id} value={p.nom_pays}>{p.nom_pays}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="Ville" className="block text-sm font-medium text-foreground-700 mb-1.5">
                            Ville <span className="text-red-400">*</span>
                          </label>
                          <select
                            id="Ville"
                            name="Ville"
                            value={formData["Ville"]}
                            onChange={(e) => updateField('Ville', e.target.value)}
                            required
                            disabled={villeList.length === 0}
                            className={`${selectClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            <option value="">
                              {villeList.length === 0 ? 'Choisissez un pays d\'abord' : 'S&eacute;lectionnez une ville'}
                            </option>
                            {villeList.map((v) => (
                              <option key={v.id} value={v.nom_ville}>{v.nom_ville}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-3">
                    {step === 2 && (
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="flex-1 h-11 border border-background-200/70 text-foreground-600 rounded-full text-sm font-semibold whitespace-nowrap hover:bg-background-100 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <i className="ri-arrow-left-line text-sm"></i>
                        Retour
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 h-11 bg-foreground-950 text-background-50 rounded-full text-sm font-semibold whitespace-nowrap hover:bg-foreground-800 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <i className="ri-loader-4-line animate-spin"></i>
                          Cr&eacute;ation...
                        </>
                      ) : step === 1 ? (
                        <>
                          Continuer
                          <i className="ri-arrow-right-line text-sm"></i>
                        </>
                      ) : (
                        'Cr&eacute;er ma boutique'
                      )}
                    </button>
                  </div>
                </form>

                <div className="mt-6 pt-5 border-t border-background-200/70 text-center">
                  <p className="text-sm text-foreground-500">
                    D&eacute;j&agrave; un compte ?{' '}
                    <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700 transition-colors">
                      Se connecter
                    </Link>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}