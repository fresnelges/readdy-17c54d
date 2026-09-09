# ZIFEK - Plateforme SaaS Multi-Tenant

## 1. Description du Projet

ZIFEK est une plateforme SaaS multi-tenant permettant à quiconque de créer et gérer :
- Un site e-commerce (produits physiques et numériques)
- Un site vitrine
- Un site de services / prestations
- Une marketplace

Sans aucune connaissance technique. ZIFEK combine les fonctionnalités de Shopify, Wix, WordPress, et Fiverr dans une seule plateforme.

**Public cible :** Entrepreneurs, commerçants, prestataires de services, créateurs de contenu, agences.

**Valeur principale :** Créer un business en ligne complet (site + produits/services + paiements + réservations) en quelques minutes grâce à l'IA intégrée.

## 2. Structure des Pages

### Site Public ZIFEK (landing page)
- `/` - Page d'accueil ZIFEK (hero, fonctionnalités, tarifs, témoignages, FAQ)
- `/pricing` - Tarifs détaillés
- `/features` - Fonctionnalités
- `/contact` - Contact
- `/login` - Connexion
- `/register` - Inscription

### Dashboard Marchand (après connexion)
- `/dashboard` - Tableau de bord principal
- `/dashboard/products` - Gestion produits
- `/dashboard/services` - Gestion services
- `/dashboard/orders` - Commandes
- `/dashboard/customers` - Clients
- `/dashboard/payments` - Paiements
- `/dashboard/store/settings` - Paramètres boutique
- `/dashboard/store/theme` - Personnalisation thème
- `/dashboard/store/pages` - Pages CMS
- `/dashboard/blog` - Blog
- `/dashboard/media` - Médias
- `/dashboard/analytics` - Statistiques
- `/dashboard/apps` - App Store
- `/dashboard/settings` - Paramètres compte

### Boutique Publique (vue client)
- `/store/:subdomain` - Page d'accueil boutique
- `/store/:subdomain/products` - Produits
- `/store/:subdomain/product/:id` - Détail produit
- `/store/:subdomain/services` - Services
- `/store/:subdomain/service/:id` - Détail service
- `/store/:subdomain/booking` - Réservation
- `/store/:subdomain/cart` - Panier
- `/store/:subdomain/checkout` - Paiement
- `/store/:subdomain/page/:slug` - Pages CMS

## 3. Fonctionnalités Principales

- [x] Site vitrine ZIFEK (landing page) ✅
- [x] Authentification (login/register) compatible mots de passe MD5 ✅
- [x] Dashboard marchand avec tableau de bord ✅
- [x] Multi-tenant : Sous-domaines (username.zifek.fr) et domaines personnalisés ✅
- [ ] Gestion de produits (CRUD, variantes, stock, images)
- [ ] Gestion de services (CRUD, packs, tarifs, réservation)
- [ ] Gestion des commandes
- [ ] Gestion des clients
- [ ] Système de paiement multi-passerelles
- [ ] CMS intégré (pages, blog)
- [ ] Gestion des médias
- [ ] Personnalisation de thème (couleurs, polices, layout)
- [ ] Multi-langues (FR, EN, AR, ES)
- [ ] Sous-domaines pour chaque boutique
- [ ] IA intégrée (génération de contenu, logos, descriptions)
- [ ] Système d'abonnement SaaS
- [ ] Statistiques et analytics
- [ ] App Store / marketplace d'applications

## 4. Modèle de Données

### Table: users (existante - schéma imposé)
| Champ | Type | Description |
|-------|------|-------------|
| id | int(11) PK | Identifiant unique |
| user_name | varchar(255) | Nom d'utilisateur |
| password | varchar(255) | Mot de passe (MD5 ou bcrypt) |
| name | varchar(255) | Nom complet |
| email | varchar(255) | Email (utilisé pour connexion) |
| genre | varchar(255) | Genre |
| type | varchar(255) | Type d'utilisateur |
| typecompte | int(11) | Type de compte |
| nomcommerce | varchar(255) | Nom de la boutique |
| telephone | varchar(255) | Téléphone |
| pays/ville/quartier/adresse | varchar(255) | Adresse |
| description | longtext | Description |
| monaie | varchar(255) | Devise |
| langue | varchar(255) | Langue |
| theme | varchar(255) | Thème actif |
| package | int(11) | Plan d'abonnement |
| active | int(11) | Compte actif/inactif |
| datecreation | datetime | Date de création |

### Table: products
| Champ | Type | Description |
|-------|------|-------------|
| id | uuid PK | Identifiant |
| user_id | int FK | Propriétaire |
| name | varchar(255) | Nom |
| description | text | Description |
| price | decimal | Prix |
| category | varchar(255) | Catégorie |
| type | enum | physical/digital/service |
| stock | int | Stock |
| images | jsonb | Images |
| variants | jsonb | Variantes |
| active | boolean | Actif |
| created_at | timestamp | Date création |

### Table: orders
### Table: services
### Table: bookings
### Table: stores (paramètres boutique)
### Table: subscriptions

### Table: user_closet
| Champ | Type | Description |
|-------|------|-------------|
| id | bigint PK | Identifiant |
| user_id | integer FK | Propriétaire |
| name | text | Nom du vêtement |
| category | text | Catégorie (haut/milieu/bas/chapeaux/accessoires) |
| photos | jsonb | URLs des photos |
| description | text | Description |
| marque | text | Marque |
| couleur | text | Couleur |
| taille | text | Taille |
| created_at | timestamp | Date création |
| updated_at | timestamp | Date modification |

## 5. Backend / Intégrations Tiers

- **Supabase** : Base de données, authentification, stockage fichiers, edge functions
- **Stripe** : Paiements en ligne
- **PayPal** : Paiements en ligne
- **SendGrid/Resend** : Emails transactionnels
- **OpenAI/Claude** : Fonctionnalités IA

## 6. Plan de Développement par Phases

### Phase 1 : Site Vitrine ZIFEK (Page d'accueil)
- **Objectif** : Créer une landing page professionnelle et impressionnante qui présente ZIFEK
- **Livrables** : Hero, fonctionnalités, types d'activités, tarifs, témoignages, FAQ, CTA, footer
- **Pages** : `/` uniquement pour l'instant

### Phase 2 : Connexion Supabase + Base de données ✅
- **Objectif** : Connecter Supabase et créer les tables
- **Livrables** : Tables users, products, services, stores, subscriptions, RLS policies

### Phase 3 : Authentification ✅
- **Objectif** : Login/Register compatible avec les mots de passe MD5 existants
- **Livrables** : Pages login, register, flux auth complet

### Phase 4 : Dashboard Marchand
- **Objectif** : Interface de gestion principale
- **Livrables** : Dashboard, navigation, sidebar

### Phase 5 : Gestion Produits & Services
- **Objectif** : CRUD complet produits et services
- **Livrables** : Pages de gestion, formulaires, listes

### Phase 6 : Storefront Public (Multi-Tenant) ✅
- **Objectif** : Vitrine publique des boutiques avec sous-domaines
- **Livrables** : 
  - [x] Détection de sous-domaine (username.zifek.fr)
  - [x] Résolution du tenant via user_name
  - [x] Support des domaines personnalisés (websitedomain)
  - [x] Pages boutique : Accueil, Produits, Services, Partenaires, Portfolio, Équipe
  - [x] Filtrage du contenu par propriétaire (owner)
  - [x] Navigation et footer personnalisés par tenant
  - [x] Chargement du thème actif du marchand
- **Architecture** :
  - `src/hooks/useTenant.tsx` : Hook de détection et résolution du tenant
  - `src/pages/tenant/TenantStore.tsx` : Routeur de la boutique tenant
  - `src/pages/tenant/TenantNavbar.tsx` : Navigation du tenant
  - `src/pages/tenant/TenantFooter.tsx` : Footer du tenant
  - `src/pages/tenant/TenantHome.tsx` : Page d'accueil du tenant
  - Pages publiques modifiées pour filtrer par `owner` quand en mode tenant

### Phase 6.5 : Comptes Clients (Utilisateurs Normaux) ✅
- **Objectif** : Permettre aux utilisateurs lambda de créer un compte simple (sans boutique ni sous-domaine) et de se connecter sur tous les sites Zifek
- **Livrables** :
  - [x] Inscription client (`/register-client`) — formulaire simplifié
  - [x] Connexion client (`/login-client`) — interface dédiée
  - [x] Espace client (`/mon-compte`) — gestion de fichiers, profil, achats
  - [x] **Mon Armoire** — CRUD de vêtements avec photos, catégories (Haut, Milieu, Bas, Chapeaux, Accessoires), marque, couleur, taille
  - [x] **Chat IA Zifek** — Assistant connecté à toute la base Zifek (services, réservations, boutiques, produits) via edge function `zifek-client-chat`. Utilise les APIs IA configurées dans le panel admin (table `zifek`) : xAI (Grok) → OpenRouter → OpenAI → Ollama, avec fallback keyword search si aucune API n'est configurée.
  - [x] Différenciation pro/client dans la Navbar principale
  - [x] Redirection automatique selon le type de compte (typecompte=6 → /mon-compte)
  - [x] **SSO Cross-Domain** — Cookie partagé sur `.zifek.fr` pour session active sur tous les sous-domaines. Connexion sur un site → automatiquement connecté sur zifek.fr et vice-versa.
- **Architecture** :
  - `src/hooks/useAuth.tsx` : Méthode `registerClient` sans création de sous-domaine/thème
  - `src/pages/auth/register-client/page.tsx` : Inscription client
  - `src/pages/auth/login-client/page.tsx` : Connexion client
  - `src/pages/client/dashboard/page.tsx` : Dashboard client (5 onglets : Fichiers, Armoire, Chat IA, Profil, Achats)
  - `src/pages/client/dashboard/components/ClosetTab.tsx` : Gestion de l'armoire (table `user_closet`)
  - `src/pages/client/dashboard/components/ClientChatTab.tsx` : Chat IA (edge function `zifek-client-chat`)
  - `src/pages/home/components/Navbar.tsx` : Liens séparés pro/client
  - `src/hooks/useSSO.ts` : Gestion du cookie SSO cross-domain (set/get/clear sur `.zifek.fr`)

### Phase 7 : Paiements
- **Objectif** : Intégration Stripe et autres passerelles
- **Livrables** : Checkout, gestion paiements

### Phase 8 : CMS & Blog
### Phase 9 : IA Intégrée
### Phase 10 : App Store & Marketplace