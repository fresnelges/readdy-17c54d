import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, isSuperAdmin } from '@/hooks/useAuth';
import Navbar from '@/pages/home/components/Navbar';
import Footer from '@/pages/home/components/Footer';

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (isSuperAdmin(user.typecompte)) {
        navigate('/superadmin', { replace: true });
      } else if (user.typecompte === 6) {
        navigate('/mon-compte', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    const result = await login(identifier, password);
    if (result.success && result.user) {
      if (isSuperAdmin(result.user.typecompte)) {
        navigate('/superadmin');
      } else if (result.user.typecompte === 6) {
        navigate('/mon-compte');
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(result.error || 'Erreur de connexion.');
    }
  };

  return (
    <div className="min-h-screen bg-background-50 flex flex-col">
      <Navbar forceScrolled={true} />

      <main className="flex-1 flex items-center justify-center px-4 pt-20 pb-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold font-heading text-foreground-950 mb-2">
              Bienvenue
            </h1>
            <p className="text-foreground-500 text-sm">
              Connectez-vous &agrave; votre espace ZIFEK
            </p>
          </div>

          <div className="bg-background-50 border border-background-200/70 rounded-lg p-6 md:p-8">
            {error && (
              <div className="mb-5 p-3 rounded-md bg-primary-50 border border-primary-200 text-primary-700 text-sm flex items-start gap-2">
                <i className="ri-error-warning-line flex-shrink-0 mt-0.5"></i>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="identifier" className="block text-sm font-medium text-foreground-700 mb-1.5">
                  Email ou nom d&apos;utilisateur
                </label>
                <input
                  id="identifier"
                  type="text"
                  name="identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="vous@exemple.com ou nomutilisateur"
                  required
                  className="w-full h-11 px-4 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300 transition-colors"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground-700 mb-1.5">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Votre mot de passe"
                    required
                    className="w-full h-11 px-4 pr-10 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-400 hover:text-foreground-600 cursor-pointer"
                    aria-label={showPassword ? 'Cacher le mot de passe' : 'Afficher le mot de passe'}
                  >
                    <i className={`text-lg ${showPassword ? 'ri-eye-off-line' : 'ri-eye-line'}`}></i>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-foreground-950 text-background-50 rounded-full text-sm font-semibold whitespace-nowrap hover:bg-foreground-800 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <i className="ri-loader-4-line animate-spin"></i>
                    Connexion...
                  </>
                ) : (
                  'Se connecter'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-foreground-500">
                Pas encore de compte ?{' '}
                <Link to="/register" className="text-primary-600 font-medium hover:text-primary-700 transition-colors">
                  Cr&eacute;er un compte
                </Link>
              </p>
            </div>

            <div className="mt-6 pt-5 border-t border-background-200/70">
              <p className="text-xs text-foreground-400 text-center mb-3">Comptes de d&eacute;monstration</p>
              <div className="space-y-2">
                {[
                  { email: 'admin@zifek.fr', pass: 'admin123', label: 'Admin (bcrypt)' },
                  { email: 'fatima@zifek.fr', pass: 'test123', label: 'Marchand (MD5)' },
                  { email: 'youssef@zifek.fr', pass: 'demo123', label: 'Prestataire (MD5)' },
                ].map((demo) => (
                  <button
                    key={demo.email}
                    type="button"
                    onClick={() => {
                      setIdentifier(demo.email);
                      setPassword(demo.pass);
                    }}
                    className="w-full text-left px-3 py-2 rounded-md border border-background-200/70 hover:border-primary-200/50 hover:bg-background-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground-700">{demo.label}</span>
                      <span className="text-xs text-foreground-400">{demo.pass}</span>
                    </div>
                    <div className="text-xs text-foreground-500 mt-0.5">{demo.email}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}