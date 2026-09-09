// ============================================================
// Convertisseur PHP/HTML -> Zifek Theme
// Parse des fichiers .php/.html d'un thème (WordPress, custom, HTML pur)
// et les convertit en structure Zifek (HTML template tags + CSS)
// ============================================================

import JSZip from 'jszip';

// Source language options
export type SourceLanguage = 'php' | 'php+html' | 'html';

// Fichier PHP/HTML -> clé de page Zifek
const PHP_TO_PAGE_KEY: Record<string, string> = {
  'index.php': 'home',
  'home.php': 'home',
  'front-page.php': 'home',
  'landing.php': 'home',
  'header.php': 'header',
  'footer.php': 'footer',
  'navmenu.php': 'navmenu',
  'nav.php': 'navmenu',
  'page.php': 'apropos',
  'page-about.php': 'apropos',
  'page-apropos.php': 'apropos',
  'about.php': 'apropos',
  'page-contact.php': 'contact',
  'contact.php': 'contact',
  'page-services.php': 'service',
  'services.php': 'service',
  'pricing.php': 'service',
  'tarifs.php': 'service',
  'single.php': 'detailsblog',
  'single-post.php': 'detailsblog',
  'archive.php': 'blog',
  'blog.php': 'blog',
  'category.php': 'blog',
  'tag.php': 'blog',
  '404.php': 'home',
  'search.php': 'blog',
  'searchform.php': 'blog',
  'shop.php': 'produits',
  'products.php': 'produits',
  'boutique.php': 'produits',
  'archive-product.php': 'produits',
  'single-product.php': 'detailsproduit',
  'cart.php': 'panier',
  'panier.php': 'panier',
  'page-login.php': 'connexion',
  'login.php': 'connexion',
  'page-register.php': 'creationcompte',
  'register.php': 'creationcompte',
  'page-equipe.php': 'equipe',
  'equipe.php': 'equipe',
  'team.php': 'equipe',
  'page-booking.php': 'booking',
  'booking.php': 'booking',
  'reservation.php': 'booking',
  'page-politique.php': 'politique',
  'politique.php': 'politique',
  'privacy.php': 'politique',
  'terms.php': 'politique',
  'cgv.php': 'politique',
  'mentions-legales.php': 'politique',
  'gallery.php': 'portfolio',
  'galerie.php': 'portfolio',
  'portfolio.php': 'portfolio',
  'page-portfolio.php': 'portfolio',
  'partenaires.php': 'partenaires',
  'partners.php': 'partenaires',
  'faq.php': 'home',
  'faqs.php': 'home',
  'page-faq.php': 'home',
};

// HTML file -> Zifek page key
const HTML_TO_PAGE_KEY: Record<string, string> = {
  'index.html': 'home',
  'home.html': 'home',
  'header.html': 'header',
  'footer.html': 'footer',
  'nav.html': 'navmenu',
  'navmenu.html': 'navmenu',
  'about.html': 'apropos',
  'page-about.html': 'apropos',
  'apropos.html': 'apropos',
  'contact.html': 'contact',
  'page-contact.html': 'contact',
  'services.html': 'service',
  'service.html': 'service',
  'page-services.html': 'service',
  'pricing.html': 'service',
  'tarifs.html': 'service',
  'blog.html': 'blog',
  'blog-detail.html': 'detailsblog',
  'single.html': 'detailsblog',
  'post.html': 'detailsblog',
  'shop.html': 'produits',
  'products.html': 'produits',
  'boutique.html': 'produits',
  'product-detail.html': 'detailsproduit',
  'cart.html': 'panier',
  'panier.html': 'panier',
  'login.html': 'connexion',
  'connexion.html': 'connexion',
  'register.html': 'creationcompte',
  'creation-compte.html': 'creationcompte',
  'team.html': 'equipe',
  'equipe.html': 'equipe',
  'booking.html': 'booking',
  'reservation.html': 'booking',
  'gallery.html': 'portfolio',
  'galerie.html': 'portfolio',
  'portfolio.html': 'portfolio',
  'portfolio-detail.html': 'portfolio',
  'partenaires.html': 'partenaires',
  'partners.html': 'partenaires',
  'faq.html': 'home',
  'faqs.html': 'home',
  'privacy.html': 'politique',
  'politique.html': 'politique',
  'terms.html': 'politique',
  'conditions.html': 'politique',
  'cgv.html': 'politique',
  'mentions-legales.html': 'politique',
  '404.html': 'home',
  'coming-soon.html': 'home',
  'landing.html': 'home',
};

// Fichiers à ignorer complètement
const IGNORE_FILES = [
  'functions.php',
  'wp-config.php',
  'wp-settings.php',
  'wp-load.php',
  'wp-blog-header.php',
];

// Patterns WordPress -> template tags Zifek
const WP_TEMPLATE_REPLACEMENTS: [RegExp, string][] = [
  [/\bbloginfo\s*\(\s*['"]name['"]\s*\)/gi, '{{site_name}}'],
  [/\bbloginfo\s*\(\s*['"]description['"]\s*\)/gi, '{{site_description}}'],
  [/\bget_bloginfo\s*\(\s*['"]name['"]\s*\)/gi, '{{site_name}}'],
  [/\bget_bloginfo\s*\(\s*['"]description['"]\s*\)/gi, '{{site_description}}'],
  [/\bbloginfo\s*\(\s*['"]url['"]\s*\)/gi, '/'],
  [/\bhome_url\s*\(\s*\)/gi, '/'],
  [/\bsite_url\s*\(\s*\)/gi, '/'],
  [/\bget_template_directory_uri\s*\(\s*\)/gi, ''],
  [/\bget_stylesheet_directory_uri\s*\(\s*\)/gi, ''],
  [/\bwp_head\s*\(\s*\)/g, ''],
  [/\bwp_footer\s*\(\s*\)/g, ''],
  [/\bwp_nav_menu\s*\([^)]*\)/g, ''],
  [/\bthe_title\s*\(\s*\)/g, ''],
  [/\bthe_permalink\s*\(\s*\)/g, '#'],
  [/\bthe_content\s*\(\s*\)/g, ''],
  [/\bthe_excerpt\s*\(\s*\)/g, ''],
  [/\bhave_posts\s*\(\s*\)/g, 'true'],
  [/\bthe_post\s*\(\s*\)/g, ''],
  [/\bwp_reset_postdata\s*\(\s*\)/g, ''],
  [/\bwp_reset_query\s*\(\s*\)/g, ''],
  [/\bget_search_form\s*\(\s*\)/g, ''],
  [/\bcomments_template\s*\(\s*\)/g, ''],
  [/\bget_sidebar\s*\(\s*\)/g, ''],
  [/\bdynamic_sidebar\s*\([^)]*\)/g, ''],
  [/\b__\s*\(\s*'([^']*)'\s*[^)]*\)/g, '$1'],
  [/\b_e\s*\(\s*'([^']*)'\s*[^)]*\)/g, '$1'],
  [/\besc_html__\s*\(\s*'([^']*)'\s*[^)]*\)/g, '$1'],
  [/\besc_html_e\s*\(\s*'([^']*)'\s*[^)]*\)/g, '$1'],
];

// Patterns pour détecter les boucles WordPress (posts list, products, etc.)
const LOOP_PATTERNS: [RegExp, string][] = [
  // Boucle posts/blog -> {{blog_posts}}
  [/<\?php\s+if\s*\(\s*have_posts\s*\(\s*\)\s*\)\s*:\s*\?>[\s\S]*?<\?php\s*while\s*\(\s*have_posts\s*\(\s*\)\s*\)\s*:\s*\?>/gi, '<!-- BLOG_LOOP_START -->{{blog_posts}}<!-- BLOG_LOOP_END -->'],
  // Boucle produits Woocommerce -> {{products}}
  [/<\?php\s+if\s*\(\s*woocommerce_product_loop\s*\(\s*\)\s*\)\s*\?>[\s\S]*?<\?php\s+while\s*\(\s*have_posts\s*\(\s*\)\s*\)\s*:\s*the_post\s*\(\s*\)\s*;\s*\?>/gi, '<!-- PRODUCTS_LOOP_START -->{{products}}<!-- PRODUCTS_LOOP_END -->'],
];

// Mapping nom de variable foreach → template tag Zifek
const FOREACH_VARIABLE_TO_TAG: Record<string, string> = {
  // Produits
  listproduits: 'products', listproduit: 'products', produits: 'products', produit: 'products',
  products: 'products', productlist: 'products', listproduct: 'products',
  featuredproducts: 'featured_products', featured_products: 'featured_products',
  deals: 'products', deal: 'products', offres: 'products',
  // Services
  listservices: 'services', listservice: 'services', services: 'services', service: 'services',
  // Témoignages
  listtemoignages: 'testimonials', temoignages: 'testimonials',
  testimonials: 'testimonials', reviews: 'testimonials', avis: 'testimonials',
  // Équipe
  listequipe: 'team', equipe: 'team', team: 'team', members: 'team', staff: 'team',
  // Partenaires
  listpartenaires: 'partners', partenaires: 'partners',
  partners: 'partners', sponsors: 'partners', logos: 'partners',
  // Portfolio
  listportfolio: 'portfolio', portfolio: 'portfolio',
  gallery: 'portfolio', galerie: 'portfolio', projets: 'portfolio', projects: 'portfolio',
  // Blog
  listblog: 'blog_posts', blog: 'blog_posts', articles: 'blog_posts', posts: 'blog_posts',
  actualites: 'blog_posts', news: 'blog_posts',
  // Catégories
  listcategories: 'product_categories', categories: 'product_categories',
  scategories: 'product_categories', souscategories: 'product_categories',
};

export interface ConvertThemeData {
  stylesheet: string;
  pages: Record<string, string>;
  htmlFiles: Record<string, string>;
  phpFilesOrdered: string[];
  info: {
    name: string;
    description: string;
    version: string;
    category: string;
    price: string;
  };
  warnings: string[];
  detectedFiles: string[];
  pageMappings: { phpFile: string; pageKey: string }[];
}

// ============================================================
// UTILITAIRES
// ============================================================

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/');
}

function dirname(p: string): string {
  const last = p.lastIndexOf('/');
  return last === -1 ? '' : p.slice(0, last);
}

function resolveRelativePath(base: string, relative: string): string {
  const baseDir = dirname(base);
  if (!baseDir) return normalizePath(relative);
  const segments = baseDir.split('/');
  for (const part of relative.split('/')) {
    if (part === '..') {
      segments.pop();
    } else if (part !== '.') {
      segments.push(part);
    }
  }
  return segments.join('/');
}

function stripPhpComments(code: string): string {
  // Enlever commentaires multi-lignes /* */
  code = code.replace(/\/\*[\s\S]*?\*\//g, '');
  // Enlever commentaires mono-ligne //
  code = code.replace(/\/\/.*$/gm, '');
  // Enlever commentaires #
  code = code.replace(/#.*$/gm, '');
  return code;
}

// ============================================================
// RÉSOLUTION DES INCLUDES
// ============================================================

function resolveIncludes(
  content: string,
  fileMap: Map<string, string>,
  currentFile: string,
  depth: number,
  warnings: string[],
): string {
  if (depth > 10) {
    warnings.push(`Profondeur d'includes max atteinte dans ${currentFile}`);
    return content;
  }

  // include/require patterns
  const includeRegex = /<\?php\s*(include|require)(_once)?\s*(['"])([^'"]+)\3\s*;?\s*\?>/gi;

  return content.replace(includeRegex, (match, _type, _once, _q, filePath: string) => {
    const resolved = resolveRelativePath(currentFile, filePath);

    // Try exact match
    let fileContent = fileMap.get(resolved);

    // Try common variations
    if (!fileContent) {
      const baseName = resolved.split('/').pop() || resolved;
      for (const [key, val] of fileMap) {
        if (key.endsWith('/' + baseName) || key === baseName) {
          fileContent = val;
          break;
        }
      }
    }

    if (fileContent) {
      return resolveIncludes(fileContent, fileMap, resolved, depth + 1, warnings);
    }

    warnings.push(`Include non résolu: ${filePath} (depuis ${currentFile})`);
    return `<!-- include non trouvé: ${filePath} -->`;
  });
}

// ============================================================
// CONVERSION PHP -> HTML
// ============================================================

// Patterns Zifek natif — PDO queries, $users, $lang, liens PHP, etc.
// Appliqués AVANT les patterns WordPress pour priorité maximale

const ZIFEK_PDO_QUERY_BLOCK = /<\?php\s*([\s\S]*?\$pdo->query\s*\(\s*["'][\s\S]*?["'][\s\S]*?fetchAll[\s\S]*?)\?>\s*([\s\S]*?)(<\?php\s+foreach\s*\(\s*\$[a-zA-Z_]+\s+as\s+\$[a-zA-Z_]+\s*\)\s*:\s*\?>)([\s\S]*?)(<\?php\s+endforeach\s*;?\s*\?>)/gi;

const ZIFEK_VARIABLE_REPLACEMENTS: [RegExp, string][] = [
  // $users → template tags
  [/\$users\s*\[\s*['"]user_name['"]\s*\]/gi, '{{site_name}}'],
  [/\$users\s*\[\s*['"]description['"]\s*\]/gi, '{{site_description}}'],
  [/\$users\s*\[\s*['"]monaie['"]\s*\]/gi, '{{currency}}'],
  [/\$users\s*\[\s*['"]couleurchart['"]?\s*\]/gi, 'var(--primary-500)'],
  [/\$users\s*\[\s*['"]couleurcharte['"]?\s*\]/gi, 'var(--primary-500)'],
  // $users['couleurchart'] ?? '#fallback' → var(--primary-500)
  [/\$users\s*\[\s*['"]couleurchart['"]?\s*\]\s*\?\?\s*['"][^'"]*['"]/gi, 'var(--primary-500)'],
  [/\$users\s*\[\s*['"]couleurcharte['"]?\s*\]\s*\?\?\s*['"][^'"]*['"]/gi, 'var(--primary-500)'],
  // $mainColor = $users['...'] → ligne déjà convertie, mais au cas où
  [/\$mainColor\s*=\s*[^;]+;/gi, ''],
  // $lang → texte statique
  [/\$lang\s*\[\s*['"]abonnezvous['"]\s*\]/gi, 'Abonnez-vous'],
  [/\$lang\s*\[\s*['"]abonnezvousanotrenewsletterafinderecevoir['"]\s*\]/gi, 'Abonnez-vous à notre newsletter afin de recevoir nos offres'],
  [/\$lang\s*\[\s*['"]nosproduits['"]\s*\]/gi, 'Nos produits'],
  [/\$lang\s*\[\s*['"]acceuil['"]\s*\]/gi, 'Accueil'],
  [/\$lang\s*\[\s*['"]offredujour['"]\s*\]/gi, 'Offre du jour'],
  [/\$lang\s*\[\s*['"]voirdetils['"]\s*\]/gi, 'Voir détails'],
];

// Détection et conversion des blocs PDO + foreach Zifek
function convertZifekPdoBlocks(html: string, warnings: string[]): string {
  return html.replace(ZIFEK_PDO_QUERY_BLOCK, (fullMatch, queryBlock: string, betweenHtml: string, foreachTag: string, loopContent: string, endforeachTag: string) => {
    const queryLower = queryBlock.toLowerCase();

    // Déterminer le type de requête
    if (queryLower.includes('misenvedettejournalier')) {
      warnings.push('Requête PDO "deal du jour" détectée → {{products limit="1"}}');
      // Garder la structure HTML du deal comme wrapper
      return `<!-- ZIFEK_DEAL -->\n<section class="section deal-section">\n  <div class="container">{{products limit="1"}}</div>\n</section>`;
    }

    if (queryLower.includes('misenavant')) {
      warnings.push('Requête PDO "produit mis en avant" détectée → {{featured_products}}');
      return `<!-- ZIFEK_FEATURED -->\n<section class="section featured-section">\n  <div class="container">{{featured_products}}</div>\n</section>`;
    }

    if (queryLower.includes('distinct') && queryLower.includes('scategorie')) {
      warnings.push('Requête PDO "catégories" détectée → {{product_categories}}');
      return `<!-- ZIFEK_CATEGORIES -->\n<section class="section categories-section">\n  <div class="container">{{product_categories}}</div>\n</section>`;
    }

    if (queryLower.includes('select * from search')) {
      warnings.push('Requête PDO "liste produits" détectée → {{products}}');
      // Extraire le LIMIT si présent
      const limitMatch = queryBlock.match(/limit\s+(\d+)/i);
      const limitClause = limitMatch ? ` limit="${limitMatch[1]}"` : '';
      return `<!-- ZIFEK_PRODUCTS -->\n<section class="section products-section">\n  <div class="container">{{products${limitClause}}}</div>\n</section>`;
    }

    // Requête générique — on garde un commentaire
    warnings.push('Requête PDO générique détectée — remplacée par placeholder');
    return `<!-- PDO_QUERY_CONVERTED: ${queryBlock.slice(0, 80)}... -->`;
  });
}

// Convertir les variables Zifek dans tout le code
function convertZifekVariables(html: string): string {
  let result = html;

  // Remplacer les patterns connus
  for (const [pattern, replacement] of ZIFEK_VARIABLE_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }

  // htmlspecialchars($users['monaie']) → {{currency}}
  result = result.replace(/htmlspecialchars\s*\(\s*\$users\s*\[\s*['"]monaie['"]\s*\]\s*\)/gi, '{{currency}}');

  // number_format((float)$produit['prix'], 2) → {{price}}
  result = result.replace(/number_format\s*\(\s*\(float\)\s*\$[a-zA-Z_]+\[['"]prix['"]\]\s*,\s*\d+\s*\)/gi, '{{price}}');

  // $lang["clé_générique"] → extraire le texte entre guillemets
  result = result.replace(/\$lang\s*\[\s*['"]([^'"]*)['"]\s*\]/gi, (_m, key: string) => {
    // Convertir snake_case en libellé lisible
    const readable = key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
    return readable;
  });

  // $langue → langue par défaut "fr"
  result = result.replace(/<\?=\s*\$langue\s*\?>/gi, 'fr');

  // Nettoyer les résidus: <?= htmlspecialchars(...) ?> après conversion ratée
  result = result.replace(/<\?=\s*htmlspecialchars\s*\([^)]*\)\s*\?>/gi, '');
  result = result.replace(/<\?=\s*number_format\s*\([^)]*\)\s*\?>/gi, '{{price}}');

  return result;
}

// Convertir le <style> contenant des variables PHP
function convertZifekStyleBlocks(html: string, warnings: string[]): string {
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;

  return html.replace(styleRegex, (_match, cssContent: string) => {
    let cleaned = cssContent;

    // Remplacer les variables PHP dans le CSS
    cleaned = cleaned.replace(/<\?=\s*\$users\s*\[\s*['"]couleurchart['"]?\s*\]\s*\?>/gi, 'var(--primary-500)');
    cleaned = cleaned.replace(/<\?=\s*\$users\s*\[\s*['"]couleurcharte['"]?\s*\]\s*\?>/gi, 'var(--primary-500)');
    cleaned = cleaned.replace(/<\?=\s*\$mainColor\s*\?>/gi, 'var(--primary-500)');
    // var(--main-color-dark): couleur + CC → var(--primary-600)
    cleaned = cleaned.replace(/<\?=\s*\$mainColor\s*\?>\s*CC/gi, 'var(--primary-600)');
    cleaned = cleaned.replace(/<\?=\s*\$users\s*\[\s*['"]couleurchart['"]?\s*\]\s*\?>\s*CC/gi, 'var(--primary-600)');
    cleaned = cleaned.replace(/<\?=\s*\$users\s*\[\s*['"]couleurcharte['"]?\s*\]\s*\?>\s*CC/gi, 'var(--primary-600)');
    // Cas où la couleur est utilisée avec concat PHP: couleur . "CC"
    cleaned = cleaned.replace(/<\?=\s*\$users\s*\[\s*['"]couleurchart['"]?\s*\]\s*\.\s*['"]CC['"]\s*\?>/gi, 'var(--primary-600)');
    cleaned = cleaned.replace(/<\?=\s*\$users\s*\[\s*['"]couleurcharte['"]?\s*\]\s*\.\s*['"]CC['"]\s*\?>/gi, 'var(--primary-600)');
    cleaned = cleaned.replace(/<\?=\s*\$mainColor\s*\.\s*['"]CC['"]\s*\?>/gi, 'var(--primary-600)');
    // gradient avec deux couleurs: linear-gradient(..., couleur, couleur)
    cleaned = cleaned.replace(/linear-gradient\s*\(\s*135deg\s*,\s*<\?=\s*\$users\s*\[\s*['"]couleurcharte?['"]?\s*\]\s*\?>\s*,\s*([^)]+)\)/gi, 'linear-gradient(135deg, var(--primary-500), var(--primary-600))');
    cleaned = cleaned.replace(/linear-gradient\s*\(\s*135deg\s*,\s*<\?=\s*\$users\s*\[\s*['"]couleurcharte?['"]?\s*\]\s*\?>\s*,\s*#111\s*\)/gi, 'linear-gradient(135deg, var(--primary-500), var(--foreground-900))');
    cleaned = cleaned.replace(/background\s*:\s*<\?=\s*\$users\s*\[\s*['"]couleurcharte?['"]?\s*\]\s*\?>\s*;/gi, 'background: var(--primary-500);');

    // Nettoyer les éventuels tags PHP restants
    cleaned = cleaned.replace(/<\?php[\s\S]*?\?>/g, '');
    cleaned = cleaned.replace(/<\?=\s*[^?]*\?>/g, '');

    if (cleaned !== cssContent) {
      warnings.push('Variables PHP détectées dans <style> → converties en var(--primary-*)');
    }

    return `<style>\n${cleaned}\n</style>`;
  });
}

// Convertir les attributs style="..." inline contenant des variables PHP
// ex: <div style="background: <?=$users['couleurcharte']?>"> → <div style="background: var(--primary-500)">
function convertZifekInlineStyles(html: string, warnings: string[]): string {
  const inlineStyleRegex = /style\s*=\s*["']([^"']*<\?[^?]*\?>[^"']*)["']/gi;
  let found = false;

  const result = html.replace(inlineStyleRegex, (_match, styleValue: string) => {
    let cleaned = styleValue;
    // Remplacer les variables PHP dans le CSS inline
    cleaned = cleaned.replace(/<\?=\s*\$users\s*\[\s*['"]couleurchart['"]?\s*\]\s*\?>/gi, 'var(--primary-500)');
    cleaned = cleaned.replace(/<\?=\s*\$users\s*\[\s*['"]couleurcharte['"]?\s*\]\s*\?>/gi, 'var(--primary-500)');
    cleaned = cleaned.replace(/<\?=\s*\$mainColor\s*\?>/gi, 'var(--primary-500)');
    cleaned = cleaned.replace(/<\?=\s*\$mainColor\s*\?>/gi, 'var(--primary-500)');
    cleaned = cleaned.replace(/<\?=\s*\$users\s*\[\s*['"]couleurchart['"]?\s*\]\s*\.\s*['"]CC['"]\s*\?>/gi, 'var(--primary-600)');
    cleaned = cleaned.replace(/<\?=\s*\$users\s*\[\s*['"]couleurcharte['"]?\s*\]\s*\.\s*['"]CC['"]\s*\?>/gi, 'var(--primary-600)');
    cleaned = cleaned.replace(/<\?=\s*\$mainColor\s*\.\s*['"]CC['"]\s*\?>/gi, 'var(--primary-600)');
    // Nettoyer les tags PHP résiduels dans le style inline
    cleaned = cleaned.replace(/<\?=\s*[^?]*\?>/g, '');
    cleaned = cleaned.replace(/<\?php[\s\S]*?\?>/g, '');

    if (cleaned !== styleValue) found = true;
    return `style="${cleaned}"`;
  });

  if (found) {
    warnings.push('Variables PHP détectées dans les styles inline → converties en var(--primary-*)');
  }

  return result;
}

// Détecter et convertir les foreach PHP par nom de variable
// ex: foreach($listproduits as $produit) → {{products}}
// ex: foreach($temoignages as $t) → {{testimonials}}
function convertForeachByVariableName(html: string, warnings: string[]): string {
  // Regex qui capture: foreach($VARNAME as $ITEMVAR): ... CONTENU_HTML ... endforeach
  const foreachRegex = /<\?php\s+foreach\s*\(\s*\$([a-zA-Z_][a-zA-Z0-9_]*)\s+as\s+\$([a-zA-Z_][a-zA-Z0-9_]*)\s*\)\s*:\s*\?>([\s\S]*?)<\?php\s+endforeach\s*;?\s*\?>/gi;

  return html.replace(foreachRegex, (fullMatch, varName: string, itemVar: string, loopBody: string) => {
    const varLower = varName.toLowerCase();
    const tag = FOREACH_VARIABLE_TO_TAG[varLower];

    if (tag) {
      const label = varLower.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      warnings.push(`foreach($${varName} as $${itemVar}) → détecté comme {{${tag}}} (${label})`);

      // Extraire le HTML entre les balises PHP pour le préserver comme wrapper
      // On nettoie les <?= $itemVar['field'] ?> dans le corps
      let cleanedBody = loopBody;
      // Remplacer les <?= $itemVar['nom'] ?> par {{name}} etc.
      cleanedBody = cleanedBody.replace(
        new RegExp(`<\\?=\\s*\\$${itemVar}\\s*\\[\\s*['\"]([^'\"]*)['\"]\\s*\\]\\s*\\?>`, 'gi'),
        (_m, field: string) => {
          const f = field.toLowerCase();
          if (f === 'nom' || f === 'name' || f === 'title' || f === 'titre' || f === 'product_name') return '{{name}}';
          if (f === 'prix' || f === 'price' || f === 'prixpromo') return '{{price}}';
          if (f === 'description' || f === 'desc') return '{{description}}';
          if (f === 'image' || f === 'photo' || f === 'img' || f === 'media') return '{{image}}';
          if (f === 'lien' || f === 'url' || f === 'link') return '{{url}}';
          if (f === 'categorie' || f === 'category' || f === 'scategorie') return '{{category}}';
          if (f === 'note' || f === 'rating' || f === 'stars') return '{{rating}}';
          if (f === 'role' || f === 'poste' || f === 'position' || f === 'job') return '{{role}}';
          if (f === 'avis' || f === 'quote' || f === 'message' || f === 'text') return '{{quote}}';
          if (f === 'date' || f === 'created_at') return '{{date}}';
          if (f === 'stock' || f === 'quantite' || f === 'qty') return '{{stock}}';
          return `{{${f}}}`;
        },
      );
      // Remplacer <?= $itemVar ?> (sans clé) par un placeholder
      cleanedBody = cleanedBody.replace(
        new RegExp(`<\\?=\\s*\\$${itemVar}\\s*\\?>`, 'gi'),
        `<!-- php_item: $${itemVar} -->`,
      );

      return `\n<!-- FOREACH $${varName} → {{${tag}}} -->\n<section class="section" data-loop="${varLower}">\n  <div class="container">{{${tag}}}</div>\n</section>\n`;
    }

    // Pas de mapping connu, on garde la structure HTML en commentant
    warnings.push(`foreach($${varName} as $${itemVar}) → pas de mapping connu, conservé en placeholder`);
    return `<!-- FOREACH_UNKNOWN: $${varName} → contenu à mapper manuellement -->`;
  });
}

// Convertir les liens PHP Zifek
function convertZifekLinks(html: string, warnings: string[]): string {
  let result = html;

  // detailp.php?pid=X → lien produit
  result = result.replace(/href\s*=\s*["']detailp\.php\?pid=<\?=\s*\$[a-zA-Z_]+\[['"]id['"]\]\s*\?>["']/gi, (_m) => {
    warnings.push('Lien detailp.php → {{product_url}}');
    return 'href="{{product_url}}"';
  });

  // insertabonner.php → formulaire (déjà géré, mais on nettoie l'action)
  result = result.replace(/action\s*=\s*["']insertabonner\.php["']/gi, 'action="#"');

  // Autres .php → #
  result = result.replace(/action\s*=\s*["'][^"']*\.php["']/gi, 'action="#"');

  return result;
}

// Convertir les formulaires newsletter Zifek
function convertZifekForms(html: string, warnings: string[]): string {
  // Détecter les formulaires newsletter (action=insertabonner, newsletter, abonner)
  const newsletterRegex = /<form[^>]*action\s*=\s*["'][^"']*(?:insertabonner|newsletter|abonner)[^"']*["'][^>]*>/gi;

  let found = false;
  const result = html.replace(newsletterRegex, (match) => {
    found = true;
    // Garder la structure HTML, remplacer l'action
    return match
      .replace(/action\s*=\s*["'][^"']*["']/gi, 'action="#"')
      .replace(/method\s*=\s*["']post["']/gi, 'method="post"');
  });

  if (found) {
    warnings.push('Formulaire newsletter détecté → action nettoyée (conserver la structure HTML)');
  }

  return result;
}

// Nettoyer les inputs hidden PHP
function cleanZifekHiddenInputs(html: string): string {
  // Supprimer les inputs hidden avec des valeurs PHP (idboutique, nomboutique, etc.)
  return html.replace(/<input[^>]*hidden[^>]*value\s*=\s*["']<\?=[^?]*\?>["'][^>]*>/gi, '');
}

// Appliquer toutes les conversions Zifek sur le code PHP brut
function applyZifekConversions(html: string, warnings: string[]): string {
  let result = html;

  // Étape Z0: Convertir les blocs <style> avec PHP (DOIT être avant les variables
  // car les patterns cherchent $users[...] qui serait remplacé par Z2)
  result = convertZifekStyleBlocks(result, warnings);

  // Étape Z0.1: Convertir les attributs style="..." inline contenant des variables PHP
  result = convertZifekInlineStyles(result, warnings);

  // Étape Z0.5: Détecter les requêtes INSERT/UPDATE/DELETE
  result = convertZifekWriteQueries(result, warnings);

  // Étape Z1: Convertir les blocs PDO SELECT + foreach → template tags
  result = convertZifekPdoBlocks(result, warnings);

  // Étape Z1.1: Détecter les foreach par nom de variable (ex: $listproduits → {{products}})
  result = convertForeachByVariableName(result, warnings);

  // Étape Z1.5: Détecter les superglobales ($_POST, $_GET, header Location, etc.)
  result = convertZifekSuperglobals(result, warnings);

  // Étape Z2: Convertir les variables $users et $lang
  result = convertZifekVariables(result);

  // Étape Z3: Convertir les liens PHP
  result = convertZifekLinks(result, warnings);

  // Étape Z4: Convertir les formulaires newsletter
  result = convertZifekForms(result, warnings);

  // Étape Z5: Nettoyer les inputs hidden PHP
  result = cleanZifekHiddenInputs(result);

  return result;
}

function convertPhpToHtml(phpContent: string, warnings: string[]): string {
  let html = phpContent;

  // Étape -1: Appliquer les conversions Zifek natives (PDO, $users, $lang, etc.)
  html = applyZifekConversions(html, warnings);

  // Étape 0: Appliquer les remplacements de boucles WordPress
  for (const [pattern, replacement] of LOOP_PATTERNS) {
    html = html.replace(pattern, replacement);
  }

  // Étape 1: Remplacer les patterns WordPress connus DANS le code PHP
  for (const [pattern, replacement] of WP_TEMPLATE_REPLACEMENTS) {
    html = html.replace(pattern, replacement);
  }

  // Étape 2: Gérer <?= $var ?> (short echo tags) — résoudre intelligemment
  html = html.replace(/<\?=\s*([^?]*?)\s*\?>/g, (_match, expr: string) => {
    const trimmed = expr.trim();
    // Si c'est une variable CSS (déjà convertie), la garder telle quelle
    if (trimmed.startsWith('var(--')) {
      return trimmed;
    }
    // $lang['clé'] → texte lisible
    const langMatch = trimmed.match(/^\$lang\s*\[\s*['"]([^'"]*)['"]\s*\]$/);
    if (langMatch) {
      return langMatch[1]
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
    }
    // $users['champ'] → template tag
    const usersMatch = trimmed.match(/^\$users\s*\[\s*['"]([^'"]*)['"]\s*\]$/);
    if (usersMatch) {
      const field = usersMatch[1].toLowerCase();
      if (field === 'user_name' || field === 'nom') return '{{site_name}}';
      if (field === 'description') return '{{site_description}}';
      if (field === 'monaie' || field === 'currency') return '{{currency}}';
      if (field.includes('couleurchart')) return 'var(--primary-500)';
      return `{{${field}}}`;
    }
    // $var_simple connu
    const simple = trimmed.replace(/^\$/, '').toLowerCase();
    if (simple === 'langue') return 'fr';
    if (simple === 'sitename' || simple === 'site_name') return '{{site_name}}';
    if (simple === 'sitedescription' || simple === 'site_description') return '{{site_description}}';
    if (simple === 'currency' || simple === 'monaie') return '{{currency}}';
    if (simple === 'maincolor' || simple === 'couleurcharte') return 'var(--primary-500)';
    // Variables de boucle (comme $produit, $service, $temoignage) — on les garde en placeholder lisible
    if (/^\$[a-zA-Z_]\w*(\[\s*['"][^'"]*['"]\s*\])?$/.test(trimmed)) {
      return `<!-- php_var: ${trimmed} -->`;
    }
    // Fonctions → commentaire informatif
    return `<!-- php_expr: ${trimmed} -->`;
  });

  // Étape 3: Nettoyer les blocs de contrôle PHP (if/foreach/while) — on garde le HTML entre
  html = html.replace(/<\?php\s+(if|elseif|else|endif|endwhile|endforeach|endfor|endswitch)\s*[^?]*\?>/gi, '');
  html = html.replace(/<\?php\s+(while|for|foreach|switch)\s*\([^)]*\)\s*:\s*\?>/gi, '');
  html = html.replace(/<\?php\s+(while|for|foreach|switch)\s*\([^)]*\)\s*\{\s*\?>/gi, '');
  html = html.replace(/<\?php\s*\}(\s*else\s*\{)?\s*\?>/gi, '');
  html = html.replace(/<\?php\s*\}(\s*elseif\s*\([^)]*\)\s*\{)?\s*\?>/gi, '');
  html = html.replace(/<\?php\s+end(if|while|foreach|for|switch)\s*;?\s*\?>/gi, '');

  // Étape 4: Supprimer les blocs PHP restants MAIS préserver le contenu utile
  html = html.replace(/<\?php[\s\S]*?\?>/g, (match) => {
    const inner = match.slice(5, -2).trim();
    // echo "texte" → texte
    const echoMatch = inner.match(/^\s*echo\s+['"]([^'"]*)['"]\s*;?\s*$/);
    if (echoMatch) return echoMatch[1];
    // $pdo->query(...) → commentaire informatif
    if (inner.includes('$pdo->') || inner.includes('PDO') || inner.includes('fetchAll')) {
      return '<!-- PDO_QUERY_REMOVED -->';
    }
    // Assignation de variable → on garde pas (la variable est déjà traitée par le foreach)
    if (/^\s*\$[a-zA-Z_]+\s*=/.test(inner)) return '';
    // Vide
    if (!inner || /^\s*$/.test(inner)) return '';
    return '';
  });

  // Étape 5: Nettoyer uniquement les commentaires vides, PAS les php_var/php_expr utiles
  html = html.replace(/<!--\s*-->/g, '');

  // Étape 6: Nettoyer les attributs WordPress dans les balises HTML
  html = html.replace(/\s+class="[^"]*<\?php[^"]*\?>"[^"]*"/g, (m) => {
    const parts = m.match(/class="([^"]*)"/);
    if (parts) {
      const cleaned = parts[1].replace(/<\?php[\s\S]*?\?>/g, '').trim();
      return cleaned ? ` class="${cleaned}"` : '';
    }
    return '';
  });

  // Étape 7: Nettoyer les espaces et sauts de ligne excessifs
  html = html.replace(/\n{3,}/g, '\n\n');
  html = html.replace(/^\s+|\s+$/g, '');

  // Étape 8: Détection auto des formulaires HTML restants
  html = detectAndReplaceForms(html, warnings);

  // Étape 9: Détection auto des listes répétitives
  html = detectAndReplaceRepetitiveLists(html, warnings);

  return html;
}

// ============================================================
// EXTRACTION CSS
// ============================================================

function extractAllCss(fileMap: Map<string, string>, warnings: string[]): string {
  const cssParts: string[] = [];

  // Chercher style.css à la racine
  for (const [path, content] of fileMap) {
    const lower = path.toLowerCase();
    const baseName = path.split('/').pop()?.toLowerCase() || '';

    if (
      baseName === 'style.css' ||
      baseName.endsWith('.css')
    ) {
      if (baseName === 'style.css') {
        // Le style.css WordPress a un en-tête de commentaire — on le garde mais on nettoie
        const cleaned = content
          .replace(/\/\*[\s\S]*?Theme Name:[\s\S]*?\*\//, '/* Thème converti depuis PHP */')
          .trim();
        cssParts.push(cleaned);
      } else {
        cssParts.push(content.trim());
      }
    }
  }

  // Chercher dans les dossiers assets/css, css, etc.
  for (const [path, content] of fileMap) {
    const lower = path.toLowerCase();
    if (
      (lower.includes('/css/') || lower.includes('/assets/')) &&
      lower.endsWith('.css') &&
      !cssParts.includes(content.trim())
    ) {
      cssParts.push(content.trim());
    }
  }

  if (cssParts.length === 0) {
    warnings.push('Aucun fichier CSS trouvé dans le thème PHP. Un stylesheet minimal sera généré.');
    return getDefaultStylesheet();
  }

  warnings.push(`${cssParts.length} fichier(s) CSS trouvé(s) et fusionné(s).`);

  return cssParts.join('\n\n/* ===== FICHIER CSS SUIVANT ===== */\n\n');
}

function getDefaultStylesheet(): string {
  return `/* Thème converti — CSS de base */
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; }
body { font-family: 'Inter', system-ui, sans-serif; font-size: 15px; line-height: 1.65; color: #2d2a26; background: #faf8f5; }
img { max-width: 100%; height: auto; display: block; }
a { text-decoration: none; color: inherit; }
.container { width: 100%; max-width: 1240px; margin: 0 auto; padding: 0 24px; }
.section { padding: 80px 0; }
.btn { display: inline-flex; align-items: center; padding: 12px 28px; border-radius: 9999px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 200ms ease; border: none; white-space: nowrap; }`;
}

// ============================================================
// EXTRACTION DES INFOS DU THÈME
// ============================================================

function extractThemeInfo(fileMap: Map<string, string>): ConvertThemeData['info'] {
  // Essayer de parser le commentaire d'en-tête WordPress dans style.css
  const styleContent = fileMap.get('style.css') || '';
  let name = 'Thème PHP converti';
  let description = 'Thème converti automatiquement depuis un thème PHP';
  const version = '1.0';
  const category = '';
  const price = '0';

  const themeNameMatch = styleContent.match(/Theme Name:\s*(.+)/i);
  if (themeNameMatch) name = themeNameMatch[1].trim();

  const themeDescMatch = styleContent.match(/Description:\s*(.+)/i);
  if (themeDescMatch) description = themeDescMatch[1].trim();

  return { name, description, version, category, price };
}

// ============================================================
// MAPPING DES FICHIERS PHP VERS PAGES ZIFEK
// ============================================================

export function applyPageMappings(
  phpFiles: string[],
  htmlFiles: Record<string, string>,
  customMappings?: Record<string, string>,
  existingWarnings?: string[],
): { pages: Record<string, string>; pageMappings: { phpFile: string; pageKey: string }[] } {
  const warnings: string[] = existingWarnings ? [...existingWarnings] : [];
  const pages: Record<string, string> = {};
  const pageMappings: { phpFile: string; pageKey: string }[] = [];
  const usedKeys = new Set<string>();

  for (const phpFile of phpFiles) {
    const baseName = phpFile.split('/').pop() || '';
    const pathLower = phpFile.toLowerCase();
    let pageKey = '';

    // 1. Mapping custom prioritaire
    if (customMappings && customMappings[phpFile] !== undefined) {
      pageKey = customMappings[phpFile];
    }

    // 2. Sinon mapping automatique
    if (!pageKey) {
      if (PHP_TO_PAGE_KEY[baseName]) {
        pageKey = PHP_TO_PAGE_KEY[baseName];
      } else {
        for (const [pattern, key] of Object.entries(PHP_TO_PAGE_KEY)) {
          if (pathLower.includes(pattern.toLowerCase())) {
            pageKey = key;
            break;
          }
        }
      }
    }

    if (pageKey) {
      const html = htmlFiles[phpFile] || '';

      if (pages[pageKey] && pages[pageKey].trim()) {
        if (html.trim().length > pages[pageKey].trim().length) {
          pages[pageKey] = html;
          warnings.push(`${phpFile} → ${pageKey} (écrase la version précédente, plus de contenu)`);
        } else {
          warnings.push(`${phpFile} → ${pageKey} (ignoré, version existante plus complète)`);
        }
      } else {
        pages[pageKey] = html;
        usedKeys.add(pageKey);
        pageMappings.push({ phpFile, pageKey });
      }
    } else {
      warnings.push(`${phpFile} n'a pas pu être associé à une page Zifek.`);
    }
  }

  return { pages, pageMappings };
}

// ============================================================
// FONCTION PRINCIPALE
// ============================================================

export async function convertPhpZipToTheme(
  zipFile: File,
  onProgress?: (msg: string) => void,
  customMappings?: Record<string, string>,
  sourceLanguage: SourceLanguage = 'php',
): Promise<ConvertThemeData> {
  const warnings: string[] = [];
  const detectedFiles: string[] = [];
  const isHtmlOnly = sourceLanguage === 'html';

  onProgress?.('Lecture du fichier ZIP...');
  const zip = await JSZip.loadAsync(zipFile);

  // Construire le fileMap
  const fileMap = new Map<string, string>();
  const sourceFiles: string[] = [];

  const phpExtensions = ['.php', '.phtml', '.php3', '.php4', '.php5'];
  const htmlExtensions = ['.html', '.htm'];
  const allExtensions = isHtmlOnly ? htmlExtensions : [...phpExtensions, ...htmlExtensions];

  for (const [path, file] of Object.entries(zip.files)) {
    if (file.dir) continue;
    const normalized = normalizePath(path);

    // Ignorer les fichiers non pertinents
    const baseName = normalized.split('/').pop() || '';
    if (IGNORE_FILES.includes(baseName)) continue;

    detectedFiles.push(normalized);

    const lower = normalized.toLowerCase();
    const isSource = allExtensions.some(ext => lower.endsWith(ext));
    if (isSource) {
      sourceFiles.push(normalized);
    }

    try {
      const content = await file.async('string');
      fileMap.set(normalized, content);
    } catch {
      warnings.push(`Fichier binaire ignoré: ${normalized}`);
    }
  }

  // ============================
  // BRANCHE: HTML PUR
  // ============================
  if (isHtmlOnly) {
    if (sourceFiles.length === 0) {
      throw new Error('Aucun fichier .html trouvé dans le ZIP. Vérifie que le thème HTML est bien compressé à la racine.');
    }

    onProgress?.(`${sourceFiles.length} fichiers HTML détectés. Conversion...`);

    // Appliquer les smart tags à chaque fichier HTML
    const processedFiles = new Map<string, string>();
    for (const file of sourceFiles) {
      const content = fileMap.get(file) || '';
      const smartTagged = injectHtmlSmartTags(content, warnings);
      processedFiles.set(file, cleanFinalHtml(smartTagged));
    }

    // Mapper vers les pages Zifek
    onProgress?.('Mapping des fichiers vers les pages Zifek...');
    const mappingResult = mapHtmlFilesToPages(sourceFiles, processedFiles, customMappings);
    const allWarnings = [...warnings, ...mappingResult.warnings];
    const pages = mappingResult.pages;
    const pageMappings = mappingResult.pageMappings;

    // S'assurer que les pages essentielles existent
    fillEssentialPages(pages, allWarnings);

    // Forcer les template tags sur les pages critiques
    enrichPagesWithTemplateTags(pages, allWarnings);

    // Extraire le CSS (fichiers .css + balises <style> dans le HTML)
    onProgress?.('Extraction du CSS...');
    let cssParts: string[] = [];
    for (const [path, content] of fileMap) {
      if (path.toLowerCase().endsWith('.css')) {
        cssParts.push(content.trim());
      }
    }
    cssParts = extractCssFromHtmlFiles(fileMap, cssParts);

    let stylesheet: string;
    if (cssParts.length === 0) {
      allWarnings.push('Aucun CSS trouvé. Un stylesheet minimal sera généré.');
      stylesheet = getDefaultStylesheet();
    } else {
      allWarnings.push(`${cssParts.length} source(s) CSS trouvée(s) et fusionnée(s).`);
      stylesheet = cssParts.join('\n\n/* ===== CSS SUIVANT ===== */\n\n');
    }

    const info = extractHtmlThemeInfo(fileMap);

    // htmlFiles record (raw)
    const htmlFilesRecord: Record<string, string> = {};
    for (const [file, html] of processedFiles) {
      htmlFilesRecord[file] = html;
    }

    onProgress?.('Conversion terminée !');

    return {
      stylesheet,
      pages,
      htmlFiles: htmlFilesRecord,
      phpFilesOrdered: sourceFiles,
      info,
      warnings: allWarnings,
      detectedFiles,
      pageMappings,
    };
  }

  // ============================
  // BRANCHE: PHP / PHP+HTML
  // ============================
  const phpFiles = sourceFiles.filter(f => {
    const lower = f.toLowerCase();
    return phpExtensions.some(ext => lower.endsWith(ext));
  });

  if (phpFiles.length === 0) {
    throw new Error('Aucun fichier .php trouvé dans le ZIP. Vérifie que le thème PHP est bien compressé à la racine.');
  }

  onProgress?.(`${phpFiles.length} fichiers PHP détectés. Résolution des includes...`);

  // Résoudre les includes/requires dans chaque fichier PHP
  const resolvedFiles = new Map<string, string>();
  for (const phpFile of phpFiles) {
    const content = fileMap.get(phpFile) || '';
    const resolved = resolveIncludes(content, fileMap, phpFile, 0, warnings);
    resolvedFiles.set(phpFile, resolved);
  }

  onProgress?.('Conversion PHP -> HTML...');

  // Convertir chaque fichier PHP en HTML
  const htmlFiles = new Map<string, string>();
  for (const [phpFile, content] of resolvedFiles) {
    const html = convertPhpToHtml(content, warnings);
    htmlFiles.set(phpFile, html);
  }

  // Mapper les fichiers aux pages Zifek
  onProgress?.('Mapping des fichiers vers les pages Zifek...');

  const htmlFilesRecord: Record<string, string> = {};
  for (const [phpFile, html] of htmlFiles) {
    htmlFilesRecord[phpFile] = html;
  }

  const mappingResult = applyPageMappings(phpFiles, htmlFilesRecord, customMappings, warnings);
  const pages = mappingResult.pages;
  const pageMappings = mappingResult.pageMappings;

  // S'assurer que les pages essentielles existent
  fillEssentialPages(pages, warnings);

  // Forcer des pages critiques à utiliser des template tags
  enrichPagesWithTemplateTags(pages, warnings);

  // Nettoyer le HTML final
  for (const key of Object.keys(pages)) {
    pages[key] = cleanFinalHtml(pages[key]);
  }

  // Extraire le CSS
  onProgress?.('Extraction du CSS...');
  const stylesheet = extractAllCss(fileMap, warnings);

  // Extraire les infos
  const info = extractThemeInfo(fileMap);

  onProgress?.('Conversion terminée !');

  return {
    stylesheet,
    pages,
    htmlFiles: htmlFilesRecord,
    phpFilesOrdered: phpFiles,
    info,
    warnings,
    detectedFiles,
    pageMappings,
  };
}

// Pages essentielles à générer si absentes
function fillEssentialPages(pages: Record<string, string>, warnings: string[]): void {
  const essentialPages: [string, string][] = [
    ['home', '<section class="hero"><div class="container"><h1>{{site_name}}</h1><p>{{site_description}}</p></div></section>\n<section class="section"><div class="container">{{services}}</div></section>\n<section class="section section-alt"><div class="container">{{products limit="6"}}</div></section>'],
    ['header', '<header class="header">\n  <div class="container">\n    <nav class="navbar">\n      <a href="/" class="navbar-brand">{{site_name}}</a>\n      <ul class="navbar-links">\n        <li><a href="/">Accueil</a></li>\n        <li><a href="/service">Services</a></li>\n        <li><a href="/apropos">À propos</a></li>\n        <li><a href="/contact">Contact</a></li>\n      </ul>\n    </nav>\n  </div>\n</header>'],
    ['footer', '<footer class="footer">\n  <div class="container">\n    <p>&copy; {{year}} {{site_name}}. Tous droits réservés.</p>\n  </div>\n</footer>'],
  ];

  for (const [key, fallback] of essentialPages) {
    if (!pages[key] || !pages[key].trim()) {
      pages[key] = fallback;
      warnings.push(`Page "${key}" générée automatiquement (pas de fichier source correspondant).`);
    }
  }
}

// Enrichit les pages avec des template tags si nécessaire
function enrichPagesWithTemplateTags(pages: Record<string, string>, warnings: string[]): void {
  if (!pages['home']?.includes('{{')) {
    pages['home'] = (pages['home'] || '') + '\n<section class="section"><div class="container">{{services}}</div></section>\n<section class="section section-alt"><div class="container">{{testimonials}}</div></section>';
    warnings.push('Tags template ajoutés à la page home pour le rendu dynamique.');
  }

  if (!pages['produits']?.includes('{{products')) {
    pages['produits'] = (pages['produits'] || pages['home'] || '') + '\n<section class="section"><div class="container">{{products}}</div></section>';
  }

  if (!pages['service']?.includes('{{services')) {
    pages['service'] = (pages['service'] || '<section class="page-header"><h1>Services</h1></section>') + '\n<section class="section"><div class="container">{{services}}</div></section>';
  }
}

function cleanFinalHtml(html: string): string {
  return html
    // Enlever les commentaires vides
    .replace(/<!--\s*-->/g, '')
    // Enlever les lignes vides multiples
    .replace(/\n{3,}/g, '\n\n')
    // Enlever les espaces en début/fin de ligne
    .split('\n').map(l => l.trimEnd()).join('\n')
    .trim();
}

// ============================================================
// DÉTECTION ET REMPLACEMENT DES FORMULAIRES HTML
// ============================================================

// Extrait un bloc <form> complet de manière robuste
function extractFormBlock(html: string, startIndex: number): { formHtml: string; endIndex: number } | null {
  let depth = 0;
  let i = startIndex;
  let foundOpen = false;

  // Chercher la fin de la balise d'ouverture <form ... >
  for (; i < html.length; i++) {
    if (html[i] === '>') {
      foundOpen = true;
      i++;
      break;
    }
  }
  if (!foundOpen) return null;

  const contentStart = i;
  depth = 1;

  // Chercher </form> en équilibrant les balises imbriquées
  while (depth > 0 && i < html.length) {
    // Détecter <form (imbriqué)
    if (html.slice(i, i + 5).toLowerCase() === '<form') {
      depth++;
      i += 5;
      continue;
    }
    // Détecter </form>
    if (html.slice(i, i + 7).toLowerCase() === '</form>') {
      depth--;
      if (depth === 0) {
        i += 7;
        break;
      }
      i += 7;
      continue;
    }
    i++;
  }

  if (depth !== 0) return null;

  const formHtml = html.slice(startIndex, i);
  return { formHtml, endIndex: i };
}

// Analyse le contenu d'un formulaire pour le classifier
function classifyForm(formHtml: string): 'newsletter' | 'contact' | 'booking' | 'generic' {
  const lower = formHtml.toLowerCase();
  const hasEmailInput = /<input[^>]*type\s*=\s*["']email["'][^>]*>/i.test(lower) ||
    /<input[^>]*name\s*=\s*["'][^"']*email[^"']*["'][^>]*>/i.test(lower) ||
    /<input[^>]*placeholder\s*=\s*["'][^"']*email[^"']*["'][^>]*>/i.test(lower) ||
    /<input[^>]*placeholder\s*=\s*["'][^"']*courriel[^"']*["'][^>]*>/i.test(lower);

  const hasNameInput = /<input[^>]*name\s*=\s*["'][^"']*(?:name|nom|prenom|first|last)[^"']*["'][^>]*>/i.test(lower) ||
    /<input[^>]*placeholder\s*=\s*["'][^"']*(?:name|nom|prénom|prenom|votre nom)[^"']*["'][^>]*>/i.test(lower);

  const hasMessage = /<textarea[^>]*>/i.test(lower) ||
    /<input[^>]*name\s*=\s*["'][^"']*(?:message|comment)[^"']*["'][^>]*>/i.test(lower);

  const hasDateOrTime = /<input[^>]*type\s*=\s*["'](?:date|time|datetime-local)["'][^>]*>/i.test(lower);
  const hasServiceSelection = /<select[^>]*>/i.test(lower) && hasDateOrTime;
  
  // Compte le nombre d'inputs non-hidden
  const inputCount = (formHtml.match(/<input\b(?!.*type\s*=\s*["']hidden["'])/gi) || []).length;

  // Newsletter: seulement email + submit, 1-2 champs
  if (hasEmailInput && !hasNameInput && !hasMessage && inputCount <= 2) {
    return 'newsletter';
  }

  // Booking: date/heure + éventuellement service
  if (hasDateOrTime || hasServiceSelection) {
    return 'booking';
  }

  // Contact: nom + email + message
  if (hasEmailInput && (hasNameInput || hasMessage) && inputCount >= 2) {
    return 'contact';
  }

  // Newsletter avec juste email
  if (hasEmailInput && inputCount <= 2) {
    return 'newsletter';
  }

  return 'generic';
}

// Remplace les formulaires HTML par des template tags
function detectAndReplaceForms(html: string, warnings: string[]): string {
  let result = html;
  const replacements: { start: number; end: number; tag: string; formHtml: string }[] = [];

  // Trouver tous les <form>
  const formOpenRegex = /<form\b/gi;
  let match: RegExpExecArray | null;

  while ((match = formOpenRegex.exec(result)) !== null) {
    const extracted = extractFormBlock(result, match.index);
    if (!extracted) continue;

    const formType = classifyForm(extracted.formHtml);

    let templateTag: string;
    let warningMsg: string;

    switch (formType) {
      case 'newsletter':
        templateTag = `\n<!-- FORMULAIRE NEWSLETTER CONVERTI: l'original est sauvegardé dans l'onglet Formulaires -->\n{{contact_form}}\n`;
        warningMsg = `Formulaire newsletter HTML détecté et remplacé par {{contact_form}} — À configurer dans l'onglet Formulaires Zifek`;
        break;
      case 'contact':
        templateTag = `\n<!-- FORMULAIRE CONTACT CONVERTI: l'original est sauvegardé dans l'onglet Formulaires -->\n{{contact_form}}\n`;
        warningMsg = `Formulaire contact HTML détecté et remplacé par {{contact_form}} — À configurer dans l'onglet Formulaires Zifek`;
        break;
      case 'booking':
        templateTag = `\n<!-- FORMULAIRE RÉSERVATION CONVERTI -->\n{{booking_form}}\n`;
        warningMsg = `Formulaire réservation HTML détecté et remplacé par {{booking_form}} — À configurer dans l'onglet Réservations Zifek`;
        break;
      default:
        templateTag = `\n<!-- FORMULAIRE GÉNÉRIQUE CONVERTI: l'original est sauvegardé dans l'onglet Formulaires -->\n{{contact_form}}\n`;
        warningMsg = `Formulaire HTML générique détecté et remplacé par {{contact_form}} — À configurer dans l'onglet Formulaires Zifek`;
        break;
    }

    replacements.push({
      start: match.index,
      end: extracted.endIndex,
      tag: templateTag,
      formHtml: extracted.formHtml,
    });

    warnings.push(warningMsg);
  }

  // Appliquer les remplacements (de la fin vers le début pour préserver les indices)
  replacements.sort((a, b) => b.start - a.start);
  for (const rep of replacements) {
    result = result.slice(0, rep.start) + rep.tag + result.slice(rep.end);
  }

  return result;
}

// ============================================================
// DÉTECTION ET REMPLACEMENT DES LISTES RÉPÉTITIVES
// (témoignages, équipe, partenaires, portfolio)
// ============================================================

// Structure détectée dans une section
interface DetectedRepeatSection {
  start: number;
  end: number;
  type: 'testimonials' | 'team' | 'partners' | 'portfolio' | 'services' | 'products';
  count: number;
  headingText: string;
}

// Détecte le type de contenu basé sur des indices sémantiques dans le HTML
function classifyRepeatContent(blockHtml: string): 'testimonials' | 'team' | 'partners' | 'portfolio' | 'services' | 'products' | null {
  const lower = blockHtml.toLowerCase();

  // Témoignages: présence de guillemets décoratifs, rating stars, noms avec rôle/titre
  const hasQuote = /[«""\u201C\u201E]/.test(lower) || /testimonial|témoignage|temoignage|review|avis|client.*(?:dit|say|says)/i.test(lower);
  const hasStars = /fa-star|ri-star|\u2605|&#9733|rating/i.test(lower);
  const testimonialClass = /class="[^"]*(?:testimonial|review|quote|temoignage)[^"]*"/i.test(lower);

  if (hasQuote || hasStars || testimonialClass) {
    return 'testimonials';
  }

  // Équipe: images d'avatar + noms + rôles (CEO, manager, etc.)
  const hasAvatar = /class="[^"]*(?:avatar|team-member|member|profile)[^"]*"/i.test(lower) ||
    /<img[^>]*class="[^"]*(?:avatar|rounded-full|team)[^"]*"[^>]*>/i.test(lower);
  const hasRole = /ceo|manager|founder|director|designer|developer|chef|responsable|fondateur|directeur/i.test(lower);
  const teamClass = /class="[^"]*(?:team|equipe|member|staff)[^"]*"/i.test(lower);

  if (hasAvatar || hasRole || teamClass) {
    return 'team';
  }

  // Partenaires: généralement des logos dans une grille
  const hasLogos = /class="[^"]*(?:partner|logo|sponsor|client-logo|brand)[^"]*"/i.test(lower);
  const logoImages = (blockHtml.match(/<img[^>]*logo[^>]*>/gi) || []).length;

  if (hasLogos || logoImages >= 3) {
    return 'partners';
  }

  // Portfolio/Galerie: images avec overlay ou titre de projet
  const portfolioClass = /class="[^"]*(?:portfolio|gallery|project|galerie|realisation)[^"]*"/i.test(lower);
  if (portfolioClass) return 'portfolio';

  // Services: icônes + titre + description
  const serviceIcons = /ri-|fa-|bx-|material-symbols/i.test(lower);
  const serviceClass = /class="[^"]*(?:service|feature)[^"]*"/i.test(lower);
  if (serviceIcons && serviceClass) return 'services';

  // Produits: prix, devise, panier, acheter
  const hasPrice = /\$\d+|\d+\s*(?:€|EUR|USD|FCFA|DH|MAD)/i.test(lower) ||
    /prix|price/i.test(lower);
  const shopClass = /class="[^"]*(?:product|shop|store|boutique)[^"]*"/i.test(lower);
  if (hasPrice || shopClass) return 'products';

  return null;
}

// Trouve les sections avec des blocs répétitifs
function findRepeatSections(html: string): DetectedRepeatSection[] {
  const results: DetectedRepeatSection[] = [];

  // Pattern 1: Sections avec heading explicite
  // Cherche des patterns comme <h2>Témoignages</h2> suivi de divs répétitives
  const headingPattern = /<(h[2-4])[^>]*class="[^"]*"[^>]*>\s*([^<]{3,60})\s*<\/\1>/gi;
  let headingMatch: RegExpExecArray | null;

  while ((headingMatch = headingPattern.exec(html)) !== null) {
    const headingText = headingMatch[2].trim();
    const headingEnd = headingMatch.index + headingMatch[0].length;

    // Chercher une section contenante après le heading
    const afterHeading = html.slice(headingEnd, headingEnd + 5000);

    // Chercher des divs répétitives avec la même classe
    const cardCount = countSimilarCards(afterHeading);

    if (cardCount >= 2) {
      // Classifier le type
      const searchWindow = html.slice(headingMatch.index, headingEnd + 5000);
      const contentType = classifyRepeatContent(searchWindow);

      if (contentType) {
        results.push({
          start: headingMatch.index,
          end: headingEnd,
          type: contentType,
          count: cardCount,
          headingText,
        });
      }
    }
  }

  // Pattern 2: Grids sans heading explicite (détection par classe)
  // Cherche des grid/flex containers avec 3+ enfants de même classe
  const gridPattern = /<(?:div|section|ul)[^>]*class="[^"]*(?:grid|flex|row|cards|items|list)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|section|ul)>/gi;
  let gridMatch: RegExpExecArray | null;

  while ((gridMatch = gridPattern.exec(html)) !== null) {
    const innerContent = gridMatch[1];
    const similarCards = countSimilarCards(innerContent);

    if (similarCards >= 3) {
      const contentType = classifyRepeatContent(innerContent);
      if (contentType && !results.some(r => r.start === gridMatch!.index)) {
        results.push({
          start: gridMatch.index,
          end: gridMatch.index + gridMatch[0].length,
          type: contentType,
          count: similarCards,
          headingText: '',
        });
      }
    }
  }

  return results;
}

// Compte le nombre de cartes/blocs similaires dans un fragment HTML
function countSimilarCards(html: string): number {
  // Extraire toutes les classes CSS des divs enfants directs
  const classRegex = /<div[^>]*class="([^"]*)"[^>]*>/gi;
  const classCounts = new Map<string, number>();
  let match: RegExpExecArray | null;

  while ((match = classRegex.exec(html)) !== null) {
    // Normaliser la classe: enlever les variantes mineures
    const cls = match[1].replace(/\s+/g, ' ').trim();
    // Extraire les tokens clés (les 2-3 premiers tokens significatifs)
    const tokens = cls.split(/\s+/).filter(t =>
      !['mb-', 'mt-', 'ml-', 'mr-', 'px-', 'py-', 'pt-', 'pb-', 'pl-', 'pr-'].some(p => t.startsWith(p)) &&
      !t.match(/^(w-|h-|text-|bg-|col-|row-)/)
    );
    const key = tokens.slice(0, 3).join(' ');
    if (key.length > 3) {
      classCounts.set(key, (classCounts.get(key) || 0) + 1);
    }
  }

  // Retourne le nombre max de répétitions
  let maxCount = 0;
  for (const count of classCounts.values()) {
    if (count > maxCount) maxCount = count;
  }
  return maxCount;
}

// Tag mapping pour les remplacements
const REPEAT_TYPE_TO_TAG: Record<string, string> = {
  testimonials: 'testimonials',
  team: 'team',
  partners: 'partners',
  portfolio: 'portfolio',
  services: 'services',
  products: 'products',
};

const REPEAT_TYPE_LABEL: Record<string, string> = {
  testimonials: 'témoignages',
  team: 'équipe',
  partners: 'partenaires',
  portfolio: 'portfolio',
  services: 'services',
  products: 'produits',
};

// Remplace les blocs répétitifs par des template tags
function detectAndReplaceRepetitiveLists(html: string, warnings: string[]): string {
  const sections = findRepeatSections(html);
  if (sections.length === 0) return html;

  // Dédupliquer: garder seulement le premier de chaque type
  const seenTypes = new Set<string>();
  const uniqueSections: DetectedRepeatSection[] = [];
  for (const s of sections) {
    if (!seenTypes.has(s.type)) {
      seenTypes.add(s.type);
      uniqueSections.push(s);
    }
  }

  // Appliquer les remplacements (fin → début)
  uniqueSections.sort((a, b) => b.start - a.start);

  let result = html;
  for (const section of uniqueSections) {
    const tag = REPEAT_TYPE_TO_TAG[section.type];
    const label = REPEAT_TYPE_LABEL[section.type];
    const sectionHtml = html.slice(section.start, section.end);

    // On garde le heading s'il existe, et on remplace le contenu de la grille
    if (section.headingText) {
      // Remplacer seulement la zone après le heading
      const headingTag = sectionHtml.match(/<h[2-4][^>]*>/)?.[0] || '';
      const headingEnd = sectionHtml.indexOf(`</${headingTag.match(/h([2-4])/)?.[0] || 'h2'}>`) + 5;
      const afterHeading = sectionHtml.slice(headingEnd);
      const replacement = afterHeading.replace(afterHeading.trim(), `\n<!-- ${section.count} ${label} détectés → {{${tag}}} -->\n{{${tag}}}\n`);
      result = result.slice(0, section.start) +
        sectionHtml.slice(0, headingEnd) + replacement +
        result.slice(section.end);
    } else {
      // Pas de heading, remplacer toute la grille
      const replacement = `\n<!-- ${section.count} ${label} détectés → {{${tag}}} -->\n<section class="section"><div class="container">{{${tag}}}</div></section>\n`;
      result = result.slice(0, section.start) + replacement + result.slice(section.end);
    }

    warnings.push(`${section.count} ${label} similaires détectés → remplacés par {{${tag}}}`);
  }

  return result;
}

// ============================================================
// DÉTECTION DES REQUÊTES D'ÉCRITURE (INSERT/UPDATE/DELETE)
// ============================================================

// Bloc PHP complet contenant une requête d'écriture PDO
const ZIFEK_WRITE_QUERY_BLOCK = /<\?php\s*([\s\S]*?(?:INSERT\s+INTO|UPDATE\s+\w[\w]*\s+SET|DELETE\s+FROM)\s+[\s\S]*?)\?>/gi;

function extractTableName(code: string, operation: string): string {
  const regex = new RegExp(`${operation}\\s+\`?([\\w]+)\`?`, 'i');
  const match = code.match(regex);
  return match ? match[1] : 'unknown';
}

function convertZifekWriteQueries(html: string, warnings: string[]): string {
  return html.replace(ZIFEK_WRITE_QUERY_BLOCK, (match, innerCode: string) => {
    const codeLower = innerCode.toLowerCase();

    if (codeLower.includes('insert into')) {
      // Newsletter / abonnement
      if (codeLower.includes('newsletter') || codeLower.includes('abonner') || codeLower.includes('emailsubscribe') || codeLower.includes('email_subscribe')) {
        warnings.push(`Requête INSERT newsletter (${extractTableName(codeLower, 'insert into')}) → À configurer via l'onglet Formulaires Zifek`);
        return `<!-- ZIFEK_WRITE: Newsletter subscription — configure via Zifek Forms -->`;
      }
      // Contact
      if (codeLower.includes('contact') || codeLower.includes('message')) {
        warnings.push(`Requête INSERT contact (${extractTableName(codeLower, 'insert into')}) → À configurer via l'onglet Formulaires Zifek`);
        return `<!-- ZIFEK_WRITE: Contact form submission — configure via Zifek Forms -->`;
      }
      // Commande / panier
      if (codeLower.includes('commande') || codeLower.includes('order') || codeLower.includes('panier') || codeLower.includes('cart')) {
        warnings.push(`Requête INSERT commande/panier (${extractTableName(codeLower, 'insert into')}) → Utiliser order_headers / order_items Supabase`);
        return `<!-- ZIFEK_WRITE: Order creation — migrate to Supabase order_headers + order_items -->`;
      }
      // INSERT générique
      warnings.push(`Requête INSERT (table: ${extractTableName(codeLower, 'insert into')}) → Migration manuelle vers Supabase nécessaire`);
      return `<!-- ZIFEK_WRITE: INSERT into ${extractTableName(codeLower, 'insert into')} — manual migration needed -->`;
    }

    if (codeLower.includes('update') && codeLower.match(/update\s+\w/i)) {
      warnings.push(`Requête UPDATE (table: ${extractTableName(codeLower, 'update')}) → Migration manuelle vers Supabase nécessaire`);
      return `<!-- ZIFEK_WRITE: UPDATE ${extractTableName(codeLower, 'update')} — manual migration needed -->`;
    }

    if (codeLower.includes('delete from')) {
      warnings.push(`Requête DELETE (table: ${extractTableName(codeLower, 'delete from')}) → Migration manuelle vers Supabase nécessaire`);
      return `<!-- ZIFEK_WRITE: DELETE from ${extractTableName(codeLower, 'delete from')} — manual migration needed -->`;
    }

    warnings.push('Requête d\'écriture PDO → Migration manuelle nécessaire');
    return `<!-- ZIFEK_WRITE: Database write operation — manual migration required -->`;
  });
}

// ============================================================
// DÉTECTION DES SUPERGLOBALES ($_POST, $_GET, $_SESSION, etc.)
// ============================================================

function convertZifekSuperglobals(html: string, warnings: string[]): string {
  let result = html;

  // $_POST['...'] ou $_GET['...']
  const superglobalMap: [RegExp, string][] = [
    [/\$_POST\s*\[\s*['"]([^'"]*)['"]\s*\]/gi, '$_POST'],
    [/\$_GET\s*\[\s*['"]([^'"]*)['"]\s*\]/gi, '$_GET'],
    [/\$_REQUEST\s*\[\s*['"]([^'"]*)['"]\s*\]/gi, '$_REQUEST'],
    [/\$_SESSION\s*\[\s*['"]([^'"]*)['"]\s*\]/gi, '$_SESSION'],
    [/\$_COOKIE\s*\[\s*['"]([^'"]*)['"]\s*\]/gi, '$_COOKIE'],
    [/\$_FILES\s*\[\s*['"]([^'"]*)['"]\s*\]/gi, '$_FILES'],
    [/\$_SERVER\s*\[\s*['"]([^'"]*)['"]\s*\]/gi, '$_SERVER'],
  ];

  const detectedSuperglobals = new Set<string>();

  for (const [pattern, sgName] of superglobalMap) {
    let found = false;
    result = result.replace(pattern, (fullMatch, fieldName: string) => {
      found = true;
      // Si c'est dans un formulaire newsletter → on nettoie (le form est déjà géré)
      if (sgName === '$_POST' && (fieldName === 'email' || fieldName === 'idboutique' || fieldName === 'nomboutique')) {
        return `<!-- form_field: ${fieldName} -->`;
      }
      return `<!-- SUPERGLOBAL ${sgName}[${fieldName}] → manual migration -->`;
    });
    if (found) {
      detectedSuperglobals.add(sgName);
    }
  }

  if (detectedSuperglobals.size > 0) {
    const list = Array.from(detectedSuperglobals).join(', ');
    warnings.push(`${list} détecté(s) → À remplacer par l'API Supabase ou les formulaires Zifek`);
  }

  // header('Location: ...') → redirect
  const headerRedirectRegex = /header\s*\(\s*['"]\s*Location:\s*([^'"]*)['"]\s*\)\s*;?\s*/gi;
  let foundRedirect = false;
  result = result.replace(headerRedirectRegex, (_fullMatch, url: string) => {
    foundRedirect = true;
    return `<!-- REDIRECT to ${url.trim()} — replace with useNavigate() or window.location -->`;
  });
  if (foundRedirect) {
    warnings.push('header("Location: ...") détecté → À remplacer par useNavigate()');
  }

  // die() / exit() après redirect
  result = result.replace(/\b(die|exit)\s*\(\s*\)\s*;/gi, '<!-- die/exit removed -->');

  return result;
}

// ============================================================
// CONVERSION HTML PUR -> ZIFEK
// ============================================================

// Injecte des template tags Zifek dans le HTML pur pour le rendre dynamique
function injectHtmlSmartTags(html: string, warnings: string[]): string {
  let result = html;

  // Remplacer le <title> statique par {{site_name}}
  result = result.replace(
    /<title>([^<]*)<\/title>/gi,
    '<title>{{site_name}}</title>',
  );

  // Remplacer le nom du site dans le header/nav (premier <a> ou <span> avec brand/logo class)
  if (!/<title>\{\{site_name\}\}<\/title>/i.test(result)) {
    warnings.push('Balise <title> automatiquement convertie en {{site_name}}');
  }

  // Remplacer le footer copyright (détection année et nom)
  const copyrightPatterns = [
    /(&copy;|©)\s*\d{4}\s+([^<]{3,60})<\/p>/gi,
    /(&copy;|©)\s*\d{4}\s+([^<]{3,60})<\/div>/gi,
    /(&copy;|©)\s*\d{4}\s+([^<]{3,60})<\/span>/gi,
  ];

  let replacedCopyright = false;
  for (const pattern of copyrightPatterns) {
    result = result.replace(pattern, (match, copySymbol, companyName: string) => {
      replacedCopyright = true;
      return `${copySymbol} {{year}} ${companyName.trim()}</p>`;
    });
    if (replacedCopyright) break;
  }

  if (replacedCopyright) {
    warnings.push('Copyright footer → converti avec {{year}}');
  } else {
    // Tenter de détecter un footer générique
    result = result.replace(
      /<footer[^>]*>([\s\S]*?)<\/footer>/gi,
      (match, footerContent: string) => {
        if (footerContent.includes('{{year}}')) return match;
        const updated = footerContent.replace(
          /(&copy;|©)\s*(\d{4})/g,
          '$1 {{year}}',
        );
        if (updated !== footerContent) {
          warnings.push('Année footer → {{year}}');
        }
        return `<footer>${updated}</footer>`;
      },
    );
  }

  // Détecter les grilles de cartes produits/services répétitives et suggérer {{products}}
  const cardPattern = /<div[^>]*class="[^"]*(?:product|card|item|col|grid-item)[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi;
  const cardMatches = result.match(cardPattern);
  if (cardMatches && cardMatches.length >= 3) {
    warnings.push(`${cardMatches.length} cartes similaires détectées → {{products}} ou {{services}} peut être ajouté manuellement`);
  }

  // Détecter les listes de navigation et les préserver telles quelles
  
  // === AUTO-DÉTECTION FORMULAIRES HTML ===
  // Remplace les formulaires newsletter/contact/réservation par des template tags
  result = detectAndReplaceForms(result, warnings);

  // === AUTO-DÉTECTION LISTES RÉPÉTITIVES ===
  // Détecte témoignages, équipes, partenaires, portfolio, services, produits
  result = detectAndReplaceRepetitiveLists(result, warnings);

  return result;
}

// Extrait le CSS depuis les balises <style> dans les fichiers HTML
function extractCssFromHtmlFiles(fileMap: Map<string, string>, existingCss: string[]): string[] {
  const styleTagRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  const allCss = [...existingCss];

  for (const [, content] of fileMap) {
    let match;
    while ((match = styleTagRegex.exec(content)) !== null) {
      allCss.push(match[1].trim());
    }
  }

  return allCss;
}

// Extrait le nom du thème depuis le <title> ou le <meta name="description">
function extractHtmlThemeInfo(fileMap: Map<string, string>): ConvertThemeData['info'] {
  let name = 'Thème HTML converti';
  let description = 'Thème converti automatiquement depuis un thème HTML pur';

  // Chercher dans index.html ou home.html d'abord
  const indexContent = fileMap.get('index.html') || fileMap.get('home.html') || '';

  const titleMatch = indexContent.match(/<title>([^<]*)<\/title>/i);
  if (titleMatch) {
    name = titleMatch[1].trim();
  }

  const descMatch = indexContent.match(/<meta\s+name\s*=\s*["']description["']\s+content\s*=\s*["']([^"']*)["']/i);
  if (descMatch) {
    description = descMatch[1].trim();
  }

  return { name, description, version: '1.0', category: '', price: '0' };
}

// Mappe les fichiers HTML vers les pages Zifek
function mapHtmlFilesToPages(
  htmlFiles: string[],
  fileMap: Map<string, string>,
  customMappings?: Record<string, string>,
): { pages: Record<string, string>; pageMappings: { phpFile: string; pageKey: string }[]; warnings: string[] } {
  const warnings: string[] = [];
  const pages: Record<string, string> = {};
  const pageMappings: { phpFile: string; pageKey: string }[] = [];

  for (const htmlFile of htmlFiles) {
    const baseName = htmlFile.split('/').pop() || '';
    const pathLower = htmlFile.toLowerCase();
    let pageKey = '';

    // Custom mapping prioritaire
    if (customMappings && customMappings[htmlFile] !== undefined) {
      pageKey = customMappings[htmlFile];
    }

    // Mapping auto HTML
    if (!pageKey) {
      if (HTML_TO_PAGE_KEY[baseName]) {
        pageKey = HTML_TO_PAGE_KEY[baseName];
      } else {
        for (const [pattern, key] of Object.entries(HTML_TO_PAGE_KEY)) {
          if (pathLower.includes(pattern.toLowerCase())) {
            pageKey = key;
            break;
          }
        }
      }
    }

    // Fallback: aussi chercher dans les clés PHP
    if (!pageKey) {
      if (PHP_TO_PAGE_KEY[baseName]) {
        pageKey = PHP_TO_PAGE_KEY[baseName];
      } else {
        for (const [pattern, key] of Object.entries(PHP_TO_PAGE_KEY)) {
          if (pathLower.includes(pattern.toLowerCase())) {
            pageKey = key;
            break;
          }
        }
      }
    }

    if (pageKey) {
      const content = fileMap.get(htmlFile) || '';
      if (pages[pageKey] && pages[pageKey].trim()) {
        if (content.trim().length > pages[pageKey].trim().length) {
          pages[pageKey] = content;
          warnings.push(`${htmlFile} → ${pageKey} (écrase la version précédente, plus de contenu)`);
        }
      } else {
        pages[pageKey] = content;
        pageMappings.push({ phpFile: htmlFile, pageKey });
      }
    } else {
      warnings.push(`${htmlFile} n'a pas pu être associé à une page Zifek.`);
    }
  }

  return { pages, pageMappings, warnings };
}