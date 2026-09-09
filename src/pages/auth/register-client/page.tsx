import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, isSuperAdmin, type ClientRegisterData } from '@/hooks/useAuth';
import Navbar from '@/pages/home/components/Navbar';
import Footer from '@/pages/home/components/Footer';

const BENEFITS = [
  { icon: 'ri-folder-user-line', text: 'Stockez vos fichiers en ligne' },
  { icon: 'ri-link-m', text: 'Connectez-vous sur tous les sites Zifek' },
  { icon: 'ri-shopping-bag-3-line', text: 'Retrouvez vos achats au même endroit' },
  { icon: 'ri-shield-check-line', text: 'Données sécurisées et privées' },
];

export default function RegisterClientPage() {
  const { user, registerClient, loading } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    user_name: '',
    password: '',
    confirmPassword: '',
    telephone: '',
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) {
      navigate(isSuperAdmin(user.typecompte) ? '/superadmin' : '/mon-compte', { replace: true });
    }
  }, [user, navigate]);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email || !formData.user_name) {
      setError('Veuillez remplir tous les champs obligatoires.');
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

    const data: ClientRegisterData = {
      name: formData.name,
      email: formData.email,
      user_name: formData.user_name,
      password: formData.password,
      telephone: formData.telephone,
    };

    const result = await registerClient(data);
    if (result.success) {
      navigate('/mon-compte');
    } else {
      setError(result.error || 'Erreur lors de l&apos;inscription.');
    }
  };

  const inputClass = "w-full h-11 px-4 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:border-accent-300 focus:ring-1 focus:ring-accent-300 transition-colors";

  return (
    <div className="min-h-screen bg-background-50 flex flex-col">
      <Navbar forceScrolled={true} />

      <main className="flex-1 flex pt-20">
        {/* --- Left Brand Panel --- */}
        <div className="hidden lg:flex lg:w-[44%] xl:w-[42%] relative overflow-hidden bg-foreground-950">
          <div className="absolute inset-0">
            <img
              src="https://readdy.ai/api/search-image?query=Soft%20warm%20gradient%20with%20organic%20flowing%20shapes%20in%20coral%20peach%20and%20amber%20tones%20blending%20into%20deep%20dark%20background%2C%20modern%20minimalist%20aesthetic%2C%20gentle%20luminous%20glow%20at%20center%2C%20sophisticated%20atmospheric%20ambient%20composition%2C%20premium%20brand%20atmosphere%2C%20no%20text%2C%20elegant%20abstract%20art%20with%20subtle%20textured%20layers&width=900&height=1100&seq=zifek-client-reg-bg-01&orientation=portrait"
              alt=""
              className="w-full h-full object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-foreground-950/85 via-foreground-950/70 to-foreground-950/50"></div>
          </div>

          <div className="relative z-10 flex flex-col justify-center w-full px-12 xl:px-16 py-16">
            <div className="mb-10">
              <Link to="/" className="inline-flex items-center gap-2.5 group">
                <div className="w-10 h-10 rounded-lg bg-accent-500 flex items-center justify-center">
                  <i className="ri-user-smile-line text-white text-lg"></i>
                </div>
                <span className="text-white font-bold text-xl font-heading tracking-tight">ZIFEK</span>
              </Link>
            </div>

            <h2 className="text-3xl xl:text-4xl font-bold font-heading text-white leading-tight mb-5">
              Votre compte
              <br />
              <span className="text-accent-300">Zifek universel</span>
            </h2>
            <p className="text-white/55 text-base leading-relaxed mb-10 max-w-md">
              Un seul compte pour tous les sites propulsés par Zifek. Connectez-vous, achetez, et gérez vos fichiers en toute simplicité.
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
          </div>
        </div>

        {/* --- Right Form Panel --- */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-8 lg:px-12 xl:px-16 py-10 lg:py-0">
          <div className="w-full max-w-md">
            {/* Mobile-only brand header */}
            <div className="lg:hidden text-center mb-8">
              <Link to="/" className="inline-flex items-center gap-2 mb-5">
                <div className="w-9 h-9 rounded-lg bg-accent-500 flex items-center justify-center">
                  <i className="ri-user-smile-line text-white text-base"></i>
                </div>
                <span className="text-foreground-950 font-bold text-lg font-heading">ZIFEK</span>
              </Link>
              <h1 className="text-xl font-bold font-heading text-foreground-950 mb-1.5">
                Créez votre compte Zifek
              </h1>
              <p className="text-foreground-500 text-sm">
                Un compte, tous les sites Zifek
              </p>
            </div>

            {/* Desktop title */}
            <div className="hidden lg:block mb-8">
              <h1 className="text-2xl font-bold font-heading text-foreground-950 mb-1.5">
                Créez votre compte Zifek
              </h1>
              <p className="text-foreground-500 text-sm">
                Gratuit, rapide, et sans engagement
              </p>
            </div>

            <div className="bg-background-50 border border-background-200/70 rounded-xl p-6 sm:p-8">
              {error && (
                <div className="mb-5 p-3 rounded-lg bg-red-50/80 border border-red-100 text-red-700 text-sm flex items-start gap-2.5">
                  <i className="ri-error-warning-line flex-shrink-0 mt-0.5"></i>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
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
                    Nom d'utilisateur <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="user_name"
                    type="text"
                    name="user_name"
                    value={formData.user_name}
                    onChange={(e) => updateField('user_name', e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    placeholder="nomutilisateur"
                    required
                    className={inputClass}
                  />
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
                      placeholder="6 caractères minimum"
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

                <div>
                  <label htmlFor="telephone" className="block text-sm font-medium text-foreground-700 mb-1.5">
                    Téléphone
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-foreground-950 text-background-50 rounded-full text-sm font-semibold whitespace-nowrap hover:bg-foreground-800 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-3"
                >
                  {loading ? (
                    <>
                      <i className="ri-loader-4-line animate-spin"></i>
                      Création...
                    </>
                  ) : (
                    'Créer mon compte'
                  )}
                </button>
              </form>

              <div className="mt-6">
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-background-200/70"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-3 bg-background-50 text-foreground-400">Vous êtes un professionnel ?</span>
                  </div>
                </div>

                <Link
                  to="/register"
                  className="w-full h-11 border-2 border-background-200/70 text-foreground-600 rounded-full text-sm font-semibold whitespace-nowrap hover:bg-background-100 hover:border-background-300/70 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <i className="ri-store-2-line text-sm"></i>
                  Créer une boutique professionnelle
                </Link>
              </div>

              <div className="mt-6 pt-5 border-t border-background-200/70 text-center">
                <p className="text-sm text-foreground-500">
                  Déjà un compte ?{' '}
                  <Link to="/login-client" className="text-accent-600 font-semibold hover:text-accent-700 transition-colors">
                    Se connecter
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}