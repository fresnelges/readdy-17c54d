// ============ PAGE DEFAULT TEMPLATES — Part 2: Auth, Legal, Marketplace, Other ============

export function connexionTemplate(): string {
  return [
    '<section class="section"><div class="container"><div class="auth-wrapper"><div class="auth-card">',
    '<div class="auth-header"><a href="/" class="auth-logo">{{site_logo}}</a><h2>Connexion</h2><p>Content de vous revoir</p></div>',
    '<form class="auth-form" method="post" novalidate>',
    '<div class="form-group"><label class="form-label" for="login-email">Email</label><input type="email" id="login-email" name="email" class="form-input" required autocomplete="email" placeholder="vous@exemple.com"></div>',
    '<div class="form-group"><div class="form-label-row"><label class="form-label" for="login-password">Mot de passe</label><a href="/recuperation" class="form-link">Mot de passe oublié ?</a></div><input type="password" id="login-password" name="password" class="form-input" required minlength="8" autocomplete="current-password" placeholder="••••••••"></div>',
    '<button type="submit" class="btn btn-primary btn-full"><span>Se connecter</span><i class="ri-arrow-right-line"></i></button>',
    '</form>',
    '<div class="auth-divider"><span>ou</span></div>',
    '<div class="auth-alt"><p>Pas encore de compte ? <a href="/creationcompte" class="auth-link">Créer un compte</a></p></div>',
    '</div></div></div></section>',
  ].join('\n');
}

export function creationcompteTemplate(): string {
  return [
    '<section class="section"><div class="container"><div class="auth-wrapper"><div class="auth-card">',
    '<div class="auth-header"><a href="/" class="auth-logo">{{site_logo}}</a><h2>Créer un compte</h2><p>Rejoignez la communauté {{site_name}}</p></div>',
    '<form class="auth-form" method="post" novalidate>',
    '<div class="form-row"><div class="form-group"><label class="form-label" for="reg-firstname">Prénom</label><input type="text" id="reg-firstname" name="firstname" class="form-input" required autocomplete="given-name" placeholder="Jean"></div><div class="form-group"><label class="form-label" for="reg-lastname">Nom</label><input type="text" id="reg-lastname" name="lastname" class="form-input" required autocomplete="family-name" placeholder="Dupont"></div></div>',
    '<div class="form-group"><label class="form-label" for="reg-email">Email</label><input type="email" id="reg-email" name="email" class="form-input" required autocomplete="email" placeholder="vous@exemple.com"></div>',
    '<div class="form-group"><label class="form-label" for="reg-password">Mot de passe</label><input type="password" id="reg-password" name="password" class="form-input" required minlength="8" autocomplete="new-password" placeholder="8 caractères minimum"><span class="form-hint">Minimum 8 caractères</span></div>',
    '<button type="submit" class="btn btn-primary btn-full"><span>Créer mon compte</span><i class="ri-arrow-right-line"></i></button>',
    '</form>',
    '<div class="auth-alt"><p>Déjà un compte ? <a href="/connexion" class="auth-link">Se connecter</a></p></div>',
    '</div></div></div></section>',
  ].join('\n');
}

export function recuperationTemplate(): string {
  return [
    '<section class="section"><div class="container"><div class="auth-wrapper"><div class="auth-card">',
    '<div class="auth-header"><a href="/" class="auth-logo">{{site_logo}}</a><h2>Mot de passe oublié</h2><p>Pas de panique, on va vous aider</p></div>',
    '<form class="auth-form" method="post" novalidate>',
    '<div class="form-group"><label class="form-label" for="recup-email">Email</label><input type="email" id="recup-email" name="email" class="form-input" required autocomplete="email" placeholder="vous@exemple.com"><span class="form-hint">Nous vous enverrons un lien de réinitialisation</span></div>',
    '<button type="submit" class="btn btn-primary btn-full"><span>Envoyer le lien</span><i class="ri-mail-send-line"></i></button>',
    '</form>',
    '<div class="auth-alt"><p><a href="/connexion" class="auth-link"><i class="ri-arrow-left-line"></i> Retour à la connexion</a></p></div>',
    '</div></div></div></section>',
  ].join('\n');
}

export function resetpasswordTemplate(): string {
  return [
    '<section class="section"><div class="container"><div class="auth-wrapper"><div class="auth-card">',
    '<div class="auth-header"><a href="/" class="auth-logo">{{site_logo}}</a><h2>Nouveau mot de passe</h2><p>Choisissez un mot de passe sécurisé</p></div>',
    '<form class="auth-form" method="post" novalidate>',
    '<div class="form-group"><label class="form-label" for="reset-password">Nouveau mot de passe</label><input type="password" id="reset-password" name="password" class="form-input" required minlength="8" autocomplete="new-password" placeholder="8 caractères minimum"></div>',
    '<div class="form-group"><label class="form-label" for="reset-confirm">Confirmer le mot de passe</label><input type="password" id="reset-confirm" name="confirm_password" class="form-input" required minlength="8" autocomplete="new-password" placeholder="••••••••"></div>',
    '<button type="submit" class="btn btn-primary btn-full"><span>Réinitialiser</span><i class="ri-lock-line"></i></button>',
    '</form>',
    '</div></div></div></section>',
  ].join('\n');
}

export function loginTemplate(): string {
  return [
    '<section class="section"><div class="container"><div class="auth-wrapper"><div class="auth-card">',
    '<div class="auth-header"><a href="/" class="auth-logo">{{site_logo}}</a><h2>Connexion rapide</h2></div>',
    '<form class="auth-form" method="post" novalidate>',
    '<div class="form-group"><label class="form-label" for="login2-email">Email</label><input type="email" id="login2-email" name="email" class="form-input" required autocomplete="email" placeholder="vous@exemple.com"></div>',
    '<div class="form-group"><label class="form-label" for="login2-password">Mot de passe</label><input type="password" id="login2-password" name="password" class="form-input" required minlength="8" autocomplete="current-password" placeholder="••••••••"></div>',
    '<button type="submit" class="btn btn-primary btn-full">Se connecter</button>',
    '</form>',
    '<div class="auth-alt"><p><a href="/recuperation">Mot de passe oublié ?</a> · <a href="/creationcompte">Créer un compte</a></p></div>',
    '</div></div></div></section>',
  ].join('\n');
}

export function conditionsdutilisationTemplate(): string {
  return [
    '<section class="page-header"><div class="container"><span class="page-tag">Légal</span><h1>Conditions Générales d\'Utilisation</h1><p>Dernière mise à jour : {{year}}</p></div></section>',
    '<section class="section"><div class="container"><div class="legal-content">',
    '<h2>1. Objet</h2><p>Les présentes conditions générales d\'utilisation (CGU) régissent l\'utilisation du site internet {{site_name}} accessible à l\'adresse {{site_url}}.</p>',
    '<h2>2. Accès au site</h2><p>Le site est accessible gratuitement à tout utilisateur disposant d\'un accès à Internet. Tous les coûts liés à l\'accès au site (matériel, logiciel, connexion Internet) sont à la charge de l\'utilisateur.</p>',
    '<h2>3. Propriété intellectuelle</h2><p>Tous les contenus présents sur le site (textes, images, logos, vidéos, graphismes) sont protégés par le droit d\'auteur et le droit de la propriété intellectuelle. Toute reproduction est interdite sans autorisation préalable.</p>',
    '<h2>4. Données personnelles</h2><p>Les données personnelles collectées sur le site sont traitées conformément à notre <a href="/politique">Politique de Confidentialité</a>. Conformément au RGPD, vous disposez d\'un droit d\'accès, de rectification et de suppression de vos données.</p>',
    '<h2>5. Responsabilité</h2><p>{{site_name}} s\'efforce de fournir des informations aussi précises que possible. Toutefois, nous ne pouvons garantir l\'exactitude de toutes les informations diffusées sur le site.</p>',
    '<h2>6. Liens hypertextes</h2><p>Le site peut contenir des liens vers d\'autres sites. {{site_name}} n\'exerce aucun contrôle sur ces sites et décline toute responsabilité quant à leur contenu.</p>',
    '<h2>7. Modification des CGU</h2><p>{{site_name}} se réserve le droit de modifier les présentes conditions à tout moment. Les utilisateurs sont invités à les consulter régulièrement.</p>',
    '<h2>8. Contact</h2><p>Pour toute question relative aux présentes CGU, vous pouvez nous contacter :</p><ul><li>Par email : <a href="mailto:{{site_email}}">{{site_email}}</a></li><li>Par téléphone : <a href="tel:{{site_phone}}">{{site_phone}}</a></li><li>Par courrier : {{site_address}}</li></ul>',
    '</div></div></section>',
  ].join('\n');
}

export function politiqueTemplate(): string {
  return [
    '<section class="page-header"><div class="container"><span class="page-tag">Confidentialité</span><h1>Politique de Confidentialité</h1><p>Dernière mise à jour : {{year}}</p></div></section>',
    '<section class="section"><div class="container"><div class="legal-content">',
    '<h2>1. Introduction</h2><p>La présente politique de confidentialité décrit comment {{site_name}} collecte, utilise et protège vos données personnelles lorsque vous utilisez notre site {{site_url}}.</p>',
    '<h2>2. Données collectées</h2><p>Nous collectons les données que vous nous fournissez directement : nom, prénom, adresse email, numéro de téléphone, adresse postale. Nous collectons également automatiquement certaines données de navigation (cookies, pages visitées).</p>',
    '<h2>3. Finalités du traitement</h2><p>Vos données sont utilisées pour :</p><ul><li>La gestion de votre compte client</li><li>Le traitement de vos commandes</li><li>L\'envoi de communications commerciales (avec votre consentement)</li><li>L\'amélioration de nos services</li></ul>',
    '<h2>4. Base légale</h2><p>Le traitement de vos données repose sur votre consentement, l\'exécution d\'un contrat, ou notre intérêt légitime à améliorer nos services.</p>',
    '<h2>5. Conservation des données</h2><p>Vos données sont conservées pendant la durée strictement nécessaire aux finalités poursuivies, conformément à la réglementation en vigueur.</p>',
    '<h2>6. Sécurité</h2><p>Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données contre tout accès non autorisé.</p>',
    '<h2>7. Vos droits (RGPD)</h2><p>Conformément au Règlement Général sur la Protection des Données, vous disposez des droits suivants :</p><ul><li>Droit d\'accès à vos données</li><li>Droit de rectification</li><li>Droit à l\'effacement (droit à l\'oubli)</li><li>Droit à la portabilité</li><li>Droit d\'opposition au traitement</li></ul>',
    '<h2>8. Cookies</h2><p>Notre site utilise des cookies pour améliorer votre expérience de navigation. Vous pouvez gérer vos préférences dans les paramètres de votre navigateur.</p>',
    '<h2>9. Contact DPO</h2><p>Pour exercer vos droits ou pour toute question :</p><ul><li>Email : <a href="mailto:{{site_email}}">{{site_email}}</a></li><li>Téléphone : <a href="tel:{{site_phone}}">{{site_phone}}</a></li><li>Adresse : {{site_address}}</li></ul>',
    '</div></div></section>',
  ].join('\n');
}

export function retoursTemplate(): string {
  return [
    '<section class="page-header"><div class="container"><span class="page-tag">Service client</span><h1>Politique de retours</h1><p>Comment retourner un produit</p></div></section>',
    '<section class="section"><div class="container"><div class="legal-content">',
    '<h2>Droit de rétractation</h2><p>Conformément à la législation en vigueur, vous disposez d\'un délai de 14 jours à compter de la réception de votre commande pour exercer votre droit de rétractation.</p>',
    '<h2>Conditions de retour</h2><p>Les produits doivent être retournés dans leur état d\'origine, complets et dans leur emballage d\'origine. Les frais de retour sont à la charge du client.</p>',
    '<h2>Procédure</h2><p>Pour effectuer un retour, contactez notre service client à l\'adresse <a href="mailto:{{site_email}}">{{site_email}}</a> en indiquant votre numéro de commande.</p>',
    '<h2>Remboursement</h2><p>Le remboursement sera effectué dans un délai de 14 jours suivant la réception et la vérification des produits retournés.</p>',
    '<h2>Contact</h2><ul><li>Email : <a href="mailto:{{site_email}}">{{site_email}}</a></li><li>Téléphone : <a href="tel:{{site_phone}}">{{site_phone}}</a></li></ul>',
    '</div></div></section>',
  ].join('\n');
}

export function marketplaceTemplate(): string {
  return [
    '<section class="page-header"><div class="container"><span class="page-tag">Marketplace</span><h1>Place de marché</h1><p>Trouvez les meilleurs produits de tous nos vendeurs</p></div></section>',
    '<section class="section"><div class="container">{{marketplace_search placeholder="Rechercher un produit, une marque..."}}</div></section>',
    '<section class="section section-alt"><div class="container"><div class="section-header"><h2>Catégories</h2></div>{{marketplace_categories}}</div></section>',
    '<section class="section"><div class="container"><div class="section-header"><span class="section-tag">En vedette</span><h2>Produits populaires</h2></div>{{featured_products limit="8"}}</div></section>',
    '<section class="section section-alt"><div class="container"><div class="section-header"><h2>Tous les produits</h2></div>{{marketplace_products}}</div></section>',
  ].join('\n');
}

export function marketplaceSellerTemplate(): string {
  return [
    '<section class="page-header"><div class="container"><span class="page-tag">Vendeur</span><h1>Profil vendeur</h1></div></section>',
    '<section class="section"><div class="container">{{marketplace_sellers limit="1"}}</div></section>',
    '<section class="section section-alt"><div class="container"><div class="section-header"><h2>Ses produits</h2></div>{{marketplace_products}}</div></section>',
  ].join('\n');
}

export function marketplaceCustomerTemplate(): string {
  return [
    '<section class="page-header"><div class="container"><h1>Mon compte</h1></div></section>',
    '<section class="section"><div class="container"><div class="customer-dashboard"><div class="dashboard-card"><h3><i class="ri-shopping-bag-line"></i> Mes commandes</h3><p>Suivez vos commandes en temps réel</p></div><div class="dashboard-card"><h3><i class="ri-heart-line"></i> Mes favoris</h3><p>Retrouvez vos produits sauvegardés</p></div><div class="dashboard-card"><h3><i class="ri-message-2-line"></i> Messages</h3><p>Discutez avec les vendeurs</p></div></div></div></section>',
  ].join('\n');
}

export function panierTemplate(): string {
  return [
    '<section class="page-header"><div class="container"><span class="page-tag">Panier</span><h1>Votre panier</h1></div></section>',
    '<section class="section"><div class="container"><div class="cart-container"><div class="cart-empty"><i class="ri-shopping-cart-line cart-empty-icon"></i><h3>Votre panier est vide</h3><p>Découvrez nos produits et ajoutez-les à votre panier</p><a href="/produits" class="btn btn-primary"><span>Parcourir la boutique</span><i class="ri-arrow-right-line"></i></a></div></div></div></section>',
  ].join('\n');
}

export function detailsformTemplate(): string {
  return '<section class="section"><div class="container"><div class="form-detail"><!-- Détails du formulaire --></div></div></section>';
}

export function fichieraiTemplate(): string {
  return '<section class="page-header"><div class="container"><h1>Fichiers IA</h1></div></section><section class="section"><div class="container"><div class="ai-files-container"><!-- Fichiers générés par IA --></div></div></section>';
}

export function workspacepublicTemplate(): string {
  return '<section class="page-header"><div class="container"><span class="page-tag">Communauté</span><h1>Workspace Public</h1><p>Espace de travail collaboratif</p></div></section><section class="section"><div class="container"><div class="workspace-content"><p>Bienvenue dans l\'espace de travail public de {{site_name}}.</p></div></div></section>';
}

export function defaultTemplate(): string {
  return [
    '<section class="page-header"><div class="container"><span class="page-tag">{{site_name}}</span><h1>{{site_name}}</h1></div></section>',
    '<section class="section"><div class="container"><div class="content-block">{{site_about}}</div></div></section>',
    '<section class="section section-alt"><div class="container"><div class="section-header"><h2>Nos services</h2></div>{{services}}</div></section>',
    '<section class="section"><div class="container"><div class="section-header"><h2>Contactez-nous</h2></div>{{contact_form}}</div></section>',
  ].join('\n');
}