import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, isSuperAdmin } from '@/hooks/useAuth';
import { useOutfitReminders } from '@/hooks/useOutfitReminders';
import { useBrand } from '@/hooks/useBrand';
import { listFiles, uploadToSeaweedFS, deleteFile, type SeaweedFile } from '@/lib/seaweedfs';
import ClientDashboardNavbar from './components/ClientDashboardNavbar';
import ClosetTab from './components/ClosetTab';
import OutfitBuilderTab from './components/OutfitBuilderTab';
import ClientChatTab from './components/ClientChatTab';
import LookDuJour from './components/LookDuJour';

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function FileIcon({ type }: { type: SeaweedFile['type'] }) {
  if (type === 'image') return <i className="ri-image-line text-lg text-emerald-500"></i>;
  if (type === 'video') return <i className="ri-video-line text-lg text-amber-500"></i>;
  return <i className="ri-file-3-line text-lg text-foreground-400"></i>;
}

export default function ClientDashboardPage() {
  const { user, logout } = useAuth();
  const { brand } = useBrand();
  const navigate = useNavigate();
  const { upcomingCount, todayOutfit, todayLoading } = useOutfitReminders();

  const [activeTab, setActiveTab] = useState<'files' | 'closet' | 'outfits' | 'planning' | 'chat' | 'profile' | 'orders'>('files');
  const [files, setFiles] = useState<SeaweedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const prefix = `my-files/${user.id}/`;
      const result = await listFiles(prefix);
      setFiles(result.files);
    } catch {
      setError('Impossible de charger vos fichiers.');
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  if (!user) {
    navigate('/login-client', { replace: true });
    return null;
  }

  // Un super admin (typecompte 0 ou 1) qui tombe sur /mon-compte est redirigé
  // vers son espace superadmin au lieu de l'espace client.
  if (isSuperAdmin(user.typecompte)) {
    navigate('/superadmin', { replace: true });
    return null;
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    setError(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      const folder = `my-files/${user.id}`;
      await uploadToSeaweedFS(uint8, file.name, file.type, folder);
      await fetchFiles();
    } catch {
      setError('Erreur lors du téléchargement.');
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (file: SeaweedFile) => {
    setError(null);
    try {
      await deleteFile(file.key);
      setFiles((prev) => prev.filter((f) => f.key !== file.key));
    } catch {
      setError('Erreur lors de la suppression.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const filtered = files.filter((f) =>
    f.filename.toLowerCase().includes(search.toLowerCase())
  );

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const totalLabel = totalSize < 1024
    ? `${totalSize} o`
    : totalSize < 1024 * 1024
      ? `${(totalSize / 1024).toFixed(0)} Ko`
      : `${(totalSize / (1024 * 1024)).toFixed(1)} Mo`;

  return (
    <div className="min-h-screen bg-background-50 flex flex-col">
      <ClientDashboardNavbar
        onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        menuOpen={mobileMenuOpen}
      />

      <main className="flex-1 pt-16">
        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
          {/* Mobile menu — fashion edition */}
          {mobileMenuOpen && (
            <div className="lg:hidden bg-background-50 border-b border-background-200/30 animate-fade-in">
              {/* User card */}
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-center gap-3 p-3 bg-background-50 border border-background-200/40 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-foreground-100 flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-background-50">
                    {user.image ? (
                      <img src={user.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-foreground-600 font-bold text-sm">{user.name?.charAt(0)?.toUpperCase() || '?'}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground-900 truncate">{user.name}</p>
                    <p className="text-[11px] text-foreground-500 truncate">@{user.user_name}</p>
                  </div>
                </div>
              </div>

              {/* Section: Espace */}
              <div className="px-4 mb-1">
                <span className="text-[10px] font-semibold text-foreground-400 tracking-[0.12em] uppercase px-2">Espace</span>
              </div>
              <div className="px-2 flex flex-col gap-0.5">
                {[
                  { id: 'outfits' as const, icon: 'ri-shirt-line', label: 'Mon Dressing' },
                  { id: 'closet' as const, icon: 'ri-t-shirt-line', label: 'Mon Armoire' },
                  { id: 'files' as const, icon: 'ri-folder-3-line', label: 'Mes fichiers', count: files.length },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === item.id
                        ? 'bg-foreground-100/60 text-foreground-900'
                        : 'text-foreground-500 hover:text-foreground-700 hover:bg-background-100'
                    }`}
                  >
                    <i className={`${item.icon} text-base`}></i>
                    {item.label}
                    {'count' in item && item.count > 0 && (
                      <span className="ml-auto text-[11px] text-foreground-400 bg-background-200/70 px-1.5 py-0.5 rounded-full">{item.count}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Section: Agenda */}
              <div className="px-4 mt-2 mb-1">
                <span className="text-[10px] font-semibold text-foreground-400 tracking-[0.12em] uppercase px-2">Agenda</span>
              </div>
              <div className="px-2 flex flex-col gap-0.5">
                <Link
                  to="/mon-planning"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground-500 hover:text-foreground-700 hover:bg-background-100 transition-all cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-calendar-2-line text-base"></i>
                  Planning semaine
                  {upcomingCount > 0 && (
                    <span className="ml-auto px-2 py-0.5 rounded-full bg-accent-100 text-accent-700 text-[10px] font-bold">{upcomingCount}</span>
                  )}
                </Link>
              </div>

              {/* Section: Compte */}
              <div className="px-4 mt-2 mb-1">
                <span className="text-[10px] font-semibold text-foreground-400 tracking-[0.12em] uppercase px-2">Compte</span>
              </div>
              <div className="px-2 flex flex-col gap-0.5">
                {[
                  { id: 'profile' as const, icon: 'ri-user-settings-line', label: 'Mon profil' },
                  { id: 'chat' as const, icon: 'ri-robot-2-line', label: 'Chat IA' },
                  { id: 'orders' as const, icon: 'ri-shopping-bag-3-line', label: 'Mes achats' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === item.id
                        ? 'bg-foreground-100/60 text-foreground-900'
                        : 'text-foreground-500 hover:text-foreground-700 hover:bg-background-100'
                    }`}
                  >
                    <i className={`${item.icon} text-base`}></i>
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Bottom actions */}
              <div className="px-4 py-3 mt-2 border-t border-background-200/40">
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium text-foreground-500 hover:text-foreground-700 hover:bg-background-100 transition-colors cursor-pointer"
                >
                  <i className="ri-home-4-line text-sm"></i>
                  Accueil {brand.name}
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium text-foreground-400 hover:text-red-600 hover:bg-red-50/60 transition-colors cursor-pointer w-full mt-0.5"
                >
                  <i className="ri-logout-box-line text-sm"></i>
                  Déconnexion
                </button>
              </div>
            </div>
          )}

          {/* Sidebar — desktop fashion edition */}
          <aside className="hidden lg:flex flex-col w-64 border-r border-background-200/40 bg-background-50/60 backdrop-blur-sm">
            {/* User card */}
            <div className="px-4 pt-6 pb-4">
              <div className="flex items-center gap-3 p-3 bg-background-50 border border-background-200/40 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-foreground-100 flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-background-50">
                  {user.image ? (
                    <img src={user.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-foreground-600 font-bold text-sm">{user.name?.charAt(0)?.toUpperCase() || '?'}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground-900 truncate">{user.name}</p>
                  <p className="text-[11px] text-foreground-500 truncate">@{user.user_name}</p>
                </div>
              </div>
            </div>

            {/* Section: Espace */}
            <div className="px-5 mb-1">
              <span className="text-[10px] font-semibold text-foreground-400 tracking-[0.12em] uppercase">Espace</span>
            </div>
            <div className="px-3 flex flex-col gap-0.5 mb-3">
              <button
                onClick={() => setActiveTab('outfits')}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap border-l-[3px] ${
                  activeTab === 'outfits'
                    ? 'bg-foreground-100/60 text-foreground-900 border-l-foreground-900'
                    : 'text-foreground-500 border-l-transparent hover:text-foreground-700 hover:bg-background-100 hover:border-l-foreground-200'
                }`}
              >
                <i className={`ri-shirt-line text-base ${activeTab === 'outfits' ? 'text-foreground-800' : ''}`}></i>
                Mon Dressing
              </button>
              <button
                onClick={() => setActiveTab('closet')}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap border-l-[3px] ${
                  activeTab === 'closet'
                    ? 'bg-foreground-100/60 text-foreground-900 border-l-foreground-900'
                    : 'text-foreground-500 border-l-transparent hover:text-foreground-700 hover:bg-background-100 hover:border-l-foreground-200'
                }`}
              >
                <i className={`ri-t-shirt-line text-base ${activeTab === 'closet' ? 'text-foreground-800' : ''}`}></i>
                Mon Armoire
              </button>
              <button
                onClick={() => setActiveTab('files')}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap border-l-[3px] ${
                  activeTab === 'files'
                    ? 'bg-foreground-100/60 text-foreground-900 border-l-foreground-900'
                    : 'text-foreground-500 border-l-transparent hover:text-foreground-700 hover:bg-background-100 hover:border-l-foreground-200'
                }`}
              >
                <i className={`ri-folder-3-line text-base ${activeTab === 'files' ? 'text-foreground-800' : ''}`}></i>
                Mes fichiers
                {files.length > 0 && (
                  <span className="ml-auto text-[11px] text-foreground-400 bg-background-200/70 px-1.5 py-0.5 rounded-full">
                    {files.length}
                  </span>
                )}
              </button>
            </div>

            {/* Section: Agenda */}
            <div className="px-5 mb-1">
              <span className="text-[10px] font-semibold text-foreground-400 tracking-[0.12em] uppercase">Agenda</span>
            </div>
            <div className="px-3 flex flex-col gap-0.5 mb-3">
              <Link
                to="/mon-planning"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground-500 hover:text-foreground-700 hover:bg-background-100 transition-all cursor-pointer whitespace-nowrap border-l-[3px] border-l-transparent hover:border-l-foreground-200"
              >
                <i className="ri-calendar-2-line text-base"></i>
                Planning semaine
                {upcomingCount > 0 && (
                  <span className="ml-auto px-2 py-0.5 rounded-full bg-accent-100 text-accent-700 text-[10px] font-bold">
                    {upcomingCount}
                  </span>
                )}
              </Link>
            </div>

            {/* Section: Compte */}
            <div className="px-5 mb-1">
              <span className="text-[10px] font-semibold text-foreground-400 tracking-[0.12em] uppercase">Compte</span>
            </div>
            <div className="px-3 flex flex-col gap-0.5 mb-3">
              <button
                onClick={() => setActiveTab('profile')}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap border-l-[3px] ${
                  activeTab === 'profile'
                    ? 'bg-foreground-100/60 text-foreground-900 border-l-foreground-900'
                    : 'text-foreground-500 border-l-transparent hover:text-foreground-700 hover:bg-background-100 hover:border-l-foreground-200'
                }`}
              >
                <i className={`ri-user-settings-line text-base ${activeTab === 'profile' ? 'text-foreground-800' : ''}`}></i>
                Mon profil
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap border-l-[3px] ${
                  activeTab === 'chat'
                    ? 'bg-foreground-100/60 text-foreground-900 border-l-foreground-900'
                    : 'text-foreground-500 border-l-transparent hover:text-foreground-700 hover:bg-background-100 hover:border-l-foreground-200'
                }`}
              >
                <i className={`ri-robot-2-line text-base ${activeTab === 'chat' ? 'text-foreground-800' : ''}`}></i>
                Chat IA
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap border-l-[3px] ${
                  activeTab === 'orders'
                    ? 'bg-foreground-100/60 text-foreground-900 border-l-foreground-900'
                    : 'text-foreground-500 border-l-transparent hover:text-foreground-700 hover:bg-background-100 hover:border-l-foreground-200'
                }`}
              >
                <i className={`ri-shopping-bag-3-line text-base ${activeTab === 'orders' ? 'text-foreground-800' : ''}`}></i>
                Mes achats
              </button>
            </div>

            {/* Spacer */}
            <div className="flex-1"></div>

            {/* Bottom section */}
            <div className="px-4 py-4 border-t border-background-200/40">
              <Link
                to="/"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium text-foreground-500 hover:text-foreground-700 hover:bg-background-100 transition-colors cursor-pointer"
              >
                <i className="ri-home-4-line text-sm"></i>
                Accueil {brand.name}
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium text-foreground-400 hover:text-red-600 hover:bg-red-50/60 transition-colors cursor-pointer w-full mt-0.5"
              >
                <i className="ri-logout-box-line text-sm"></i>
                Déconnexion
              </button>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 p-4 md:p-6 lg:p-8 bg-background-50/40">
            {['files', 'closet', 'outfits'].includes(activeTab) && (
              <LookDuJour outfit={todayOutfit} loading={todayLoading} />
            )}

            {activeTab === 'files' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">
                      Mes fichiers
                    </h2>
                    <p className="text-xs text-foreground-500 mt-1">
                      {files.length} fichier{files.length !== 1 ? 's' : ''} &middot; {totalLabel}
                    </p>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-foreground-900 text-background-50 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer hover:bg-foreground-800 disabled:opacity-40 transition-all"
                  >
                    <i className={`ri-${uploading ? 'loader-4-line animate-spin' : 'upload-line'} text-sm`}></i>
                    {uploading ? 'Téléchargement...' : 'Ajouter un fichier'}
                  </button>
                  <input ref={fileInputRef} type="file" onChange={handleUpload} className="hidden" />
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 text-xs rounded-lg mb-4">
                    <i className="ri-error-warning-line"></i>
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto cursor-pointer hover:text-red-900">
                      <i className="ri-close-line"></i>
                    </button>
                  </div>
                )}

                {files.length > 0 && (
                  <div className="relative mb-5 max-w-md">
                    <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-400 text-sm"></i>
                    <input
                      type="text"
                      placeholder="Rechercher un fichier..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-background-50 border border-background-200/40 rounded-lg text-xs text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-foreground-300 transition-colors"
                    />
                  </div>
                )}

                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <i className="ri-loader-4-line animate-spin text-xl text-foreground-400"></i>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 bg-background-50 border border-background-200/30 rounded-xl">
                    <div className="w-14 h-14 rounded-2xl bg-foreground-100 flex items-center justify-center mb-4">
                      <i className="ri-upload-cloud-2-line text-xl text-foreground-500"></i>
                    </div>
                    <h3 className="text-foreground-800 font-semibold text-sm mb-1">
                      {search ? 'Aucun résultat' : 'Aucun fichier'}
                    </h3>
                    <p className="text-foreground-400 text-xs mb-5">
                      {search ? 'Aucun fichier ne correspond à votre recherche.' : 'Ajoutez vos fichiers — vêtements, documents, images...'}
                    </p>
                    {!search && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2.5 border border-foreground-200 text-foreground-700 rounded-full text-xs font-medium whitespace-nowrap hover:bg-foreground-50 transition-colors cursor-pointer"
                      >
                        Ajouter mon premier fichier
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {filtered.map((file) => (
                      <div key={file.key} className="bg-background-50 border border-background-200/30 rounded-lg overflow-hidden group hover:border-foreground-200/50 transition-all">
                        <div className="aspect-square bg-background-100 flex items-center justify-center relative cursor-pointer" onClick={() => window.open(file.url, '_blank')}>
                          {file.type === 'image' ? (
                            <img src={file.url} alt={file.filename} className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          ) : (
                            <div className="flex flex-col items-center gap-1.5">
                              <FileIcon type={file.type} />
                              <span className="text-[10px] text-foreground-400 uppercase font-medium">{file.extension}</span>
                            </div>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(file); }}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-foreground-900/80 text-background-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-foreground-900"
                          >
                            <i className="ri-delete-bin-line text-xs"></i>
                          </button>
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-medium text-foreground-800 truncate">{file.filename}</p>
                          <p className="text-[10px] text-foreground-400">{file.size < 1024 ? `${file.size} o` : file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(0)} Ko` : `${(file.size / (1024 * 1024)).toFixed(1)} Mo`} &middot; {formatDate(file.lastModified)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'closet' && <ClosetTab />}

            {activeTab === 'outfits' && <OutfitBuilderTab />}

            {activeTab === 'chat' && <ClientChatTab />}

            {activeTab === 'profile' && (
              <div className="max-w-3xl xl:max-w-4xl mx-auto">
                <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950 mb-6">
                  Mon profil
                </h2>

                <div className="bg-background-50 border border-background-200/30 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-4 p-6 bg-background-100/50 border-b border-background-200/30">
                    <div className="w-16 h-16 rounded-full bg-foreground-100 flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-background-50">
                      {user.image ? (
                        <img src={user.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-foreground-600 font-bold text-xl">{user.name?.charAt(0)?.toUpperCase() || '?'}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground-900">{user.name}</h3>
                      <p className="text-xs text-foreground-500">@{user.user_name}</p>
                      <p className="text-xs text-foreground-400">{user.email}</p>
                    </div>
                  </div>

                  <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-semibold text-foreground-400 tracking-[0.08em] uppercase mb-1">Nom complet</label>
                      <p className="text-sm text-foreground-800 font-medium">{user.name || '—'}</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-foreground-400 tracking-[0.08em] uppercase mb-1">Email</label>
                      <p className="text-sm text-foreground-800 font-medium">{user.email || '—'}</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-foreground-400 tracking-[0.08em] uppercase mb-1">Nom d'utilisateur</label>
                      <p className="text-sm text-foreground-800 font-medium">@{user.user_name}</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-foreground-400 tracking-[0.08em] uppercase mb-1">Téléphone</label>
                      <p className="text-sm text-foreground-800 font-medium">{user.telephone || '—'}</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-foreground-400 tracking-[0.08em] uppercase mb-1">Type de compte</label>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-foreground-100/70 text-foreground-700 rounded-full text-xs font-medium">
                        <i className="ri-user-smile-line text-xs"></i>
                        Client {brand.name}
                      </span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-foreground-400 tracking-[0.08em] uppercase mb-1">Membre depuis</label>
                      <p className="text-sm text-foreground-800 font-medium">{formatDate(user.datecreation) || '—'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="max-w-3xl xl:max-w-4xl mx-auto">
                <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950 mb-6">
                  Mes achats
                </h2>

                <div className="flex flex-col items-center justify-center py-16 bg-background-50 border border-background-200/30 rounded-xl">
                  <div className="w-14 h-14 rounded-2xl bg-foreground-100 flex items-center justify-center mb-4">
                    <i className="ri-shopping-bag-3-line text-xl text-foreground-500"></i>
                  </div>
                  <h3 className="text-foreground-800 font-semibold text-sm mb-1">Aucun achat pour le moment</h3>
                  <p className="text-foreground-400 text-xs text-center max-w-xs">
                    Vos achats effectués sur les sites propulsés par {brand.name} apparaîtront ici.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}