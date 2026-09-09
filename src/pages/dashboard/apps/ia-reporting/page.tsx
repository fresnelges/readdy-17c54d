import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function IAReportingPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const generateReport = useCallback(async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const [ordersRes, productsRes] = await Promise.all([
        supabase.from('order_headers').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('product_items').select('*').eq('status', 'active'),
      ]);

      const orders = ordersRes.data || [];
      const products = productsRes.data || [];
      const totalRevenue = orders.reduce((s, o) => s + (o.subtotal_items || 0), 0);
      const avgOrder = orders.length > 0 ? totalRevenue / orders.length : 0;
      const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5).length;

      const reportText = `
📊 RAPPORT D'ANALYSE IA - ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}

📈 VUE D'ENSEMBLE
• Commandes analysées : ${orders.length}
• Produits actifs : ${products.length}
• Chiffre d'affaires total : ${totalRevenue.toLocaleString()} MAD
• Panier moyen : ${Math.round(avgOrder).toLocaleString()} MAD

📦 INVENTAIRE
• Produits en stock faible (≤5) : ${lowStock}
• Produits en rupture : ${products.filter((p) => p.stock === 0).length}

💡 RECOMMANDATIONS IA
• ${lowStock > 0 ? `Réapprovisionnez ${lowStock} produit(s) en stock faible` : 'Niveaux de stock satisfaisants'}
• ${products.length < 5 ? 'Ajoutez plus de produits pour diversifier votre offre' : 'Catalogue diversifié, continuez ainsi'}
• ${avgOrder < 100 ? 'Proposez des offres groupées pour augmenter le panier moyen' : 'Bon panier moyen, explorez la vente croisée'}

📅 PROCHAINE ÉTAPE
Lancez un rapport détaillé chaque semaine pour suivre vos tendances.
      `.trim();

      setReport(reportText);
    } catch {
      setReport('Erreur lors de la génération du rapport.');
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    generateReport();
  }, [generateReport]);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">
            <i className="ri-brain-line mr-2 text-primary-500"></i>
            Analyse & Reporting IA
          </h2>
          <p className="text-sm text-foreground-500 mt-1">Rapports intelligents basés sur vos données</p>
        </div>
        <button
          onClick={generateReport}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent-50 text-accent-700 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer hover:bg-accent-100 disabled:opacity-50 transition-colors"
        >
          <i className={`ri-refresh-line ${generating ? 'animate-spin' : ''}`}></i>
          {generating ? 'Génération...' : 'Régénérer'}
        </button>
      </div>

      {loading || generating ? (
        <div className="flex flex-col items-center justify-center py-20">
          <i className="ri-loader-4-line animate-spin text-2xl text-primary-500 mb-3"></i>
          <p className="text-sm text-foreground-500">L IA analyse vos données...</p>
        </div>
      ) : report ? (
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-6">
          <pre className="text-sm text-foreground-800 whitespace-pre-wrap font-sans leading-relaxed">{report}</pre>
        </div>
      ) : (
        <div className="flex flex-col items-center py-20">
          <p className="text-foreground-500">Aucun rapport disponible</p>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-4">
          <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center mb-2">
            <i className="ri-line-chart-line"></i>
          </div>
          <p className="text-xs text-foreground-500">Rapports automatiques</p>
          <p className="text-sm font-semibold text-foreground-800 mt-1">Hebdomadaires</p>
        </div>
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-4">
          <div className="w-8 h-8 rounded-lg bg-accent-50 text-accent-600 flex items-center justify-center mb-2">
            <i className="ri-lightbulb-line"></i>
          </div>
          <p className="text-xs text-foreground-500">Recommandations</p>
          <p className="text-sm font-semibold text-foreground-800 mt-1">Personnalisées IA</p>
        </div>
        <div className="bg-background-50 border border-background-200/70 rounded-lg p-4">
          <div className="w-8 h-8 rounded-lg bg-secondary-50 text-secondary-600 flex items-center justify-center mb-2">
            <i className="ri-download-line"></i>
          </div>
          <p className="text-xs text-foreground-500">Export</p>
          <p className="text-sm font-semibold text-foreground-800 mt-1">PDF & CSV</p>
        </div>
      </div>
    </div>
  );
}