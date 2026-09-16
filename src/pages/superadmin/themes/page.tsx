import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { getMainSiteUrl } from '@/lib/domain';
import { uploadMediaFile } from '@/hooks/useUpload';
import JSZip from 'jszip';
import ImportThemeModal from './components/ImportThemeModal';
import ConvertThemeModal from './components/ConvertThemeModal';
import LivePreviewPanel from './components/LivePreviewPanel';
import VersionHistory from './components/VersionHistory';
import ThemeImageField from './components/ThemeImageField';
import { getDefaultPageContent } from './defaultPageContent';

// ============ TYPES ============
interface ThemeCategory {
  id: number;
  titre: string;
}

interface Theme {
  id: number;
  idauteur?: number;
  idcommerce?: string;
  titre?: string;
  description?: string;
  version?: string;
  prix?: string;
  stylesheet?: string;
  dossier?: string;
  imagecouverture?: string;
  typetheme?: string;
  active?: number;
  modedev?: number;
}

interface ThemePage {
  id: number;
  idtheme: number;
  page_key: string;
  title: string;
  content: string;
}

interface GeneratedPageResult {
  title: string;
  content: string;
}

interface GeneratedTheme {
  stylesheet: string;
  pages: Record<string, GeneratedPageResult>;
  contenu?: { titrenavmenudefaut: string; descriptionnavmenudefault: string; imagebannierenavmenudefault: string; };
  paramettre?: { titre: string; descriptionbanniere: string; imageaboutus: string; titreblocdecouvert: string; descriptionblocdecouvert: string; fichierblocdecouvert: string; };
}

interface ThemeContenu {
  id: number;
  idtheme: number;
  idshop: number;
  titrenavmenudefaut: string;
  descriptionnavmenudefault: string;
  imagebannierenavmenudefault: string;
}

interface ThemeParamettre {
  id: number;
  idtheme: number;
  idcommerce: number;
  titre: string;
  descriptionbanniere: string;
  imageaboutus: string;
  titreblocdecouvert: string;
  descriptionblocdecouvert: string;
  fichierblocdecouvert: string;
}

interface ApiKeys {
  xai: string;
  openrouter: string;
  ollama: string;
  openai: string;
  ollama_endpoint: string;
}

interface AiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// ============ PAGE DEFINITIONS ============
interface PageDef {
  key: string;
  label: string;
  icon: string;
  description: string;
}

const PAGE_DEFS: PageDef[] = [
  { key: 'home', label: 'Page Home', icon: 'ri-home-line', description: "Page d'accueil principale avec hero, sections features, CTA" },
  { key: 'head', label: 'Head', icon: 'ri-html5-line', description: 'Balises head HTML : meta, title, SEO, liens CSS/JS' },
  { key: 'header', label: 'Header', icon: 'ri-layout-top-line', description: 'En-tête du site avec logo et navigation principale' },
  { key: 'navmenu', label: 'Nav Menu', icon: 'ri-menu-line', description: 'Menu de navigation (liens, dropdowns)' },
  { key: 'footer', label: 'Footer', icon: 'ri-layout-bottom-line', description: 'Pied de page avec liens, copyright, réseaux sociaux' },
  { key: 'apropos', label: 'Page À propos', icon: 'ri-information-line', description: "Page présentant l'entreprise, son histoire, sa mission" },
  { key: 'blog', label: 'Page Blog', icon: 'ri-article-line', description: 'Liste des articles de blog avec grille et pagination' },
  { key: 'detailsblog', label: 'Détail Blog', icon: 'ri-file-text-line', description: 'Page article unique avec contenu, auteur, date' },
  { key: 'booking', label: 'Page Booking', icon: 'ri-calendar-check-line', description: 'Page de réservation avec calendrier et formulaire' },
  { key: 'bookingsuccess', label: 'Booking Success', icon: 'ri-check-double-line', description: 'Page de confirmation après réservation réussie' },
  { key: 'conditionsdutilisation', label: 'Conditions', icon: 'ri-file-list-3-line', description: "Conditions générales d'utilisation et mentions légales" },
  { key: 'connexion', label: 'Page Connexion', icon: 'ri-login-circle-line', description: "Page de connexion utilisateur (email + mot de passe)" },
  { key: 'login', label: 'Page Login', icon: 'ri-login-box-line', description: 'Page login alternative / formulaire simplifié' },
  { key: 'creationcompte', label: 'Création Compte', icon: 'ri-user-add-line', description: "Page d'inscription nouveau client" },
  { key: 'contact', label: 'Page Contact', icon: 'ri-mail-line', description: 'Page contact avec formulaire, adresse, carte' },
  { key: 'detailsform', label: 'Détail Formulaire', icon: 'ri-survey-line', description: 'Affichage détaillé des réponses à un formulaire' },
  { key: 'detailsproduit', label: 'Détail Produit', icon: 'ri-shopping-bag-3-line', description: "Page détail d'un produit (images, description, prix)" },
  { key: 'detailsproduits', label: 'Détail Produits', icon: 'ri-store-2-line', description: 'Vue détaillée multiple produits / comparaison' },
  { key: 'detailsservice', label: 'Détail Service', icon: 'ri-service-line', description: "Page détail d'un service avec description et tarifs" },
  { key: 'equipe', label: "Page Équipe", icon: 'ri-team-line', description: "Présentation de l'équipe avec photos et bios" },
  { key: 'fichierai', label: 'Fichier AI', icon: 'ri-robot-line', description: 'Page de gestion des fichiers générés par IA' },
  { key: 'panier', label: 'Page Panier', icon: 'ri-shopping-cart-line', description: 'Panier avec liste produits, quantités, total' },
  { key: 'politique', label: 'Politique', icon: 'ri-shield-check-line', description: 'Politique de confidentialité et protection des données' },
  { key: 'service', label: 'Page Services', icon: 'ri-briefcase-line', description: 'Liste des services proposés avec descriptions' },
  { key: 'produits', label: 'Boutique / Produits', icon: 'ri-store-line', description: 'Catalogue produits avec grille, filtres et recherche' },
  { key: 'project', label: 'Page Projet', icon: 'ri-folder-line', description: 'Portfolio / projets réalisés avec galerie' },
  { key: 'recuperation', label: 'Récupération', icon: 'ri-key-line', description: 'Page de récupération de mot de passe / compte' },
  { key: 'resetpassword', label: 'Reset Password', icon: 'ri-lock-password-line', description: 'Formulaire de réinitialisation du mot de passe' },
  { key: 'retours', label: 'Page Retours', icon: 'ri-arrow-go-back-line', description: 'Politique de retour et formulaire de demande de retour' },
  { key: 'workspacepublic', label: 'Workspace Public', icon: 'ri-global-line', description: 'Espace de travail public / page communauté' },
  { key: 'marketplace', label: 'Marketplace', icon: 'ri-store-2-line', description: 'Place de marché : tous les produits de tous les vendeurs' },
  { key: 'marketplace-seller', label: 'Page Vendeur', icon: 'ri-user-star-line', description: 'Vitrine vendeur : ses produits, son profil, ses stats' },
  { key: 'marketplace-customer', label: 'Page Client', icon: 'ri-user-heart-line', description: 'Tableau de bord client : commandes, favoris, messages' },
  { key: 'faq', label: 'Page FAQ', icon: 'ri-question-answer-line', description: 'Foire Aux Questions avec accordéon dépliable' },
  { key: 'gallery', label: 'Page Galerie', icon: 'ri-gallery-line', description: 'Galerie d\'images avec lightbox et filtres' },
];

// ============ AI PROVIDERS ============
interface AiProvider {
  id: string;
  name: string;
  icon: string;
  color: string;
  models: string[];
  defaultModel: string;
  endpoint: string;
}

const AI_PROVIDERS: AiProvider[] = [
  {
    id: 'openai', name: 'OpenAI', icon: 'ri-openai-line', color: 'bg-accent-100 text-accent-700',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    defaultModel: 'gpt-4o',
    endpoint: 'https://api.openai.com/v1/chat/completions',
  },
  {
    id: 'openrouter', name: 'OpenRouter', icon: 'ri-router-line', color: 'bg-primary-100 text-primary-700',
    models: ['anthropic/claude-3.5-sonnet', 'google/gemini-2.0-flash', 'openai/gpt-4o', 'meta-llama/llama-3.3-70b-instruct'],
    defaultModel: 'anthropic/claude-3.5-sonnet',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
  },
  {
    id: 'xai', name: 'xAI Grok', icon: 'ri-brain-line', color: 'bg-foreground-100 text-foreground-700',
    models: ['grok-4.6', 'grok-4.5', 'grok-4.3'],
    defaultModel: 'grok-4.6',
    endpoint: 'https://api.x.ai/v1/chat/completions',
  },
];

// ============ CONSTANTS ============
const DEFAULT_STYLESHEET = `/* === RESET & BASE === */
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
body { font-family: 'Inter', 'Inter Display', system-ui, -apple-system, sans-serif; font-size: 15px; line-height: 1.65; color: var(--chart-fg, #2d2a26); background: var(--chart-bg, #faf8f5); min-height: 100vh; display: flex; flex-direction: column; }
img { max-width: 100%; height: auto; display: block; }
a { text-decoration: none; color: inherit; transition: color 200ms ease, opacity 200ms ease; }
ul { list-style: none; }

/* === TYPOGRAPHY === */
h1, h2, h3, h4, h5, h6 { font-family: 'Playfair Display', Georgia, serif; font-weight: 600; line-height: 1.15; letter-spacing: -0.02em; color: var(--chart-fg, #1a1817); }
h1 { font-size: clamp(2.5rem, 5vw, 4rem); }
h2 { font-size: clamp(1.8rem, 3.5vw, 2.5rem); }
h3 { font-size: clamp(1.2rem, 2vw, 1.5rem); }
h4 { font-size: 1.1rem; }
h5 { font-family: 'Inter', sans-serif; font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }

/* === CONTAINER === */
.container { width: 100%; max-width: 1240px; margin: 0 auto; padding: 0 24px; }
.section { padding: 96px 0; }
.section-alt { background: var(--chart-bg-alt, #f5f1ec); }
.section-footer { text-align: center; margin-top: 48px; }
.section-tag, .page-tag, .hero-badge { display: inline-block; padding: 5px 14px; border-radius: 9999px; font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 16px; background: rgba(var(--chart-primary-r, 194), var(--chart-primary-g, 101), var(--chart-primary-b, 74), 0.1); color: var(--chart-primary, #c2654a); }
.section-header { text-align: center; margin-bottom: 56px; }
.section-header h2 { margin-bottom: 14px; }
.section-header p { font-size: 16px; color: var(--chart-fg-muted, #6b5e53); max-width: 560px; margin: 0 auto; line-height: 1.6; }

/* === BUTTONS === */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 13px 30px; border-radius: 9999px; font-size: 14px; font-weight: 600; line-height: 1.2; cursor: pointer; transition: all 200ms ease-out; white-space: nowrap; border: none; text-decoration: none; }
.btn-primary { background: var(--chart-primary, #c2654a); color: var(--chart-primary-fg, #fff); }
.btn-primary:hover { background: var(--chart-primary-dark, #a8543b); transform: translateY(-1px); }
.btn-outline { background: transparent; color: var(--chart-primary, #c2654a); border: 1.5px solid var(--chart-primary, #c2654a); }
.btn-outline:hover { background: var(--chart-primary, #c2654a); color: var(--chart-primary-fg, #fff); }
.btn-sm { padding: 8px 18px; font-size: 13px; }
.btn-full { width: 100%; justify-content: center; }

/* === SITE HEADER === */
.site-header { position: sticky; top: 0; z-index: 100; background: rgba(var(--chart-bg-r, 250), var(--chart-bg-g, 248), var(--chart-bg-b, 245), 0.92); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid rgba(0,0,0,0.06); transition: background 200ms ease; }
.site-header .container { display: flex; align-items: center; justify-content: space-between; height: 64px; }
.logo { display: flex; align-items: center; gap: 8px; font-family: 'Playfair Display', Georgia, serif; font-size: 1.25rem; font-weight: 700; color: var(--chart-fg, #1a1817); flex-shrink: 0; }
.logo img { height: 32px; width: auto; border-radius: 6px; }
.main-nav { display: none; }
@media (min-width: 1024px) { .main-nav { display: flex; align-items: center; } }
.nav-list { display: flex; align-items: center; gap: 4px; }
.nav-link { display: block; padding: 8px 14px; border-radius: 8px; font-size: 14px; font-weight: 500; color: var(--chart-fg-muted, #5c534a); transition: all 200ms ease; }
.nav-link:hover { color: var(--chart-fg, #1a1817); background: rgba(0,0,0,0.04); }
.nav-link.active { color: var(--chart-primary, #c2654a); background: rgba(var(--chart-primary-r, 194), var(--chart-primary-g, 101), var(--chart-primary-b, 74), 0.08); font-weight: 600; }
.header-actions { display: flex; align-items: center; gap: 12px; }
.header-actions .social-icons { display: none; }
@media (min-width: 768px) { .header-actions .social-icons { display: flex; align-items: center; gap: 8px; } }
.social-link { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; color: var(--chart-fg-muted, #6b5e53); transition: all 200ms ease; font-size: 1rem; }
.social-link:hover { color: var(--chart-primary, #c2654a); background: rgba(var(--chart-primary-r, 194), var(--chart-primary-g, 101), var(--chart-primary-b, 74), 0.08); }

/* === HAMBURGER === */
.hamburger { display: flex; flex-direction: column; gap: 5px; padding: 6px; background: none; border: none; cursor: pointer; z-index: 101; }
.hamburger-line { display: block; width: 22px; height: 2px; background: var(--chart-fg, #1a1817); border-radius: 2px; transition: all 250ms ease; }
@media (min-width: 1024px) { .hamburger { display: none; } }

/* === NAVMENU (mobile + dropdown) === */
.navmenu { position: fixed; top: 64px; left: 0; right: 0; bottom: 0; background: var(--chart-bg, #faf8f5); z-index: 99; overflow-y: auto; transform: translateX(-100%); transition: transform 300ms ease; display: flex; flex-direction: column; }
.navmenu.open { transform: translateX(0); }
@media (min-width: 1024px) { .navmenu { display: none; } }
.navmenu-list { padding: 20px 24px; display: flex; flex-direction: column; gap: 4px; }
.navmenu-link { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-radius: 12px; font-size: 15px; font-weight: 500; color: var(--chart-fg, #2d2a26); transition: background 150ms ease; }
.navmenu-link:hover { background: rgba(0,0,0,0.04); }
.has-dropdown { position: relative; }
.dropdown-menu { padding-left: 20px; margin-top: 4px; display: none; }
.has-dropdown.open .dropdown-menu { display: block; }
.dropdown-grid { display: grid; grid-template-columns: 1fr; gap: 16px; padding: 16px; background: rgba(0,0,0,0.02); border-radius: 12px; }
.dropdown-col { min-width: 0; }
.dropdown-label { display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--chart-fg-subtle, #a09080); margin-bottom: 8px; }
.dropdown-arrow { font-size: 1rem; transition: transform 200ms ease; }
.has-dropdown.open .dropdown-arrow { transform: rotate(180deg); }
.navmenu-social { padding: 24px; border-top: 1px solid rgba(0,0,0,0.06); }
.navmenu-social-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #a09080; margin-bottom: 12px; display: block; }
.navmenu-social-icons { display: flex; gap: 8px; }
.mobile-only { display: block; }
@media (min-width: 1024px) { .mobile-only { display: none; } }

/* === HERO === */
.hero { padding: 120px 0 100px; text-align: center; background: linear-gradient(160deg, var(--chart-bg, #faf8f5) 0%, var(--chart-bg-alt, #f0ebe3) 40%, #e8dfd5 100%); position: relative; overflow: hidden; }
.hero-overlay { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 0%, rgba(var(--chart-primary-r, 194), var(--chart-primary-g, 101), var(--chart-primary-b, 74), 0.08), transparent 70%); }
.hero-content { max-width: 720px; margin: 0 auto; padding: 0 24px; position: relative; z-index: 2; }
.hero-title { margin-bottom: 20px; }
.hero-subtitle { font-size: 18px; line-height: 1.7; color: var(--chart-fg-muted, #6b5e53); max-width: 540px; margin: 0 auto 32px; }
.hero-actions { display: flex; align-items: center; justify-content: center; gap: 14px; flex-wrap: wrap; }

/* === PAGE HEADER (inner pages) === */
.page-header { padding: 80px 0 56px; text-align: center; background: linear-gradient(180deg, var(--chart-bg-alt, #f5f1ec), var(--chart-bg, #faf8f5)); }
.page-header h1 { margin-bottom: 12px; }
.page-header p { font-size: 16px; color: var(--chart-fg-muted, #6b5e53); max-width: 520px; margin: 0 auto; }

/* === ABOUT === */
.about-preview { display: grid; grid-template-columns: 1fr; gap: 40px; align-items: center; }
@media (min-width: 768px) { .about-preview { grid-template-columns: 1.2fr 0.8fr; } }
.about-preview-content h2 { margin-bottom: 16px; }
.about-preview-content p { font-size: 15px; color: var(--chart-fg-muted, #6b5e53); line-height: 1.7; margin-bottom: 20px; }
.about-preview-image { display: flex; align-items: center; justify-content: center; }
.about-layout { display: grid; grid-template-columns: 1fr; gap: 40px; align-items: start; }
@media (min-width: 768px) { .about-layout { grid-template-columns: 1.2fr 0.8fr; } }
.about-content { font-size: 15px; color: var(--chart-fg-muted, #6b5e53); line-height: 1.7; }
.about-image { display: flex; align-items: center; justify-content: center; position: sticky; top: 100px; }

/* === CTA BLOCK === */
.cta-block { text-align: center; padding: 64px 32px; background: linear-gradient(135deg, var(--chart-bg-alt, #f5f1ec), #efe7dd); border-radius: 20px; }
.cta-block h2 { margin-bottom: 12px; }
.cta-block p { font-size: 16px; color: var(--chart-fg-muted, #6b5e53); margin-bottom: 24px; max-width: 480px; margin-left: auto; margin-right: auto; }
.cta-actions { display: flex; align-items: center; justify-content: center; gap: 16px; flex-wrap: wrap; }
.cta-phone { font-size: 14px; color: var(--chart-fg-muted, #6b5e53); }
.cta-phone a { color: var(--chart-primary, #c2654a); font-weight: 600; }

/* === NEWSLETTER === */
.newsletter-block { display: flex; flex-direction: column; gap: 24px; align-items: center; text-align: center; padding: 48px 32px; background: linear-gradient(135deg, var(--chart-bg-alt, #f5f1ec), #efe7dd); border-radius: 20px; }
@media (min-width: 768px) { .newsletter-block { flex-direction: row; text-align: left; justify-content: space-between; } }
.newsletter-icon { font-size: 2rem; color: var(--chart-primary, #c2654a); opacity: 0.5; }
.newsletter-content h3 { margin-bottom: 6px; font-family: 'Inter', sans-serif; }
.newsletter-content p { font-size: 14px; color: var(--chart-fg-muted, #6b5e53); max-width: 320px; }

/* === CONTACT PAGE === */
.contact-layout { display: grid; grid-template-columns: 1fr; gap: 32px; }
@media (min-width: 768px) { .contact-layout { grid-template-columns: 1.2fr 0.8fr; } }
.contact-form-wrapper { background: #fff; border-radius: 16px; padding: 32px; border: 1px solid rgba(0,0,0,0.06); }
.contact-form-title { font-family: 'Inter', sans-serif; font-size: 1.1rem; margin-bottom: 24px; }
.contact-info-card { background: var(--chart-bg-alt, #f5f1ec); border-radius: 16px; padding: 32px; display: flex; flex-direction: column; gap: 24px; }
.contact-info-item { display: flex; align-items: flex-start; gap: 12px; }
.contact-info-item i { width: 36px; height: 36px; border-radius: 10px; background: rgba(var(--chart-primary-r, 194), var(--chart-primary-g, 101), var(--chart-primary-b, 74), 0.1); color: var(--chart-primary, #c2654a); display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0; }
.contact-info-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--chart-fg-subtle, #a09080); margin-bottom: 2px; }
.contact-info-item span, .contact-info-item a { font-size: 14px; color: var(--chart-fg, #2d2a26); }
.contact-info-item a:hover { color: var(--chart-primary, #c2654a); }
.contact-social { padding-top: 8px; border-top: 1px solid rgba(0,0,0,0.06); }
.contact-social-icons { display: flex; gap: 8px; margin-top: 8px; }

/* === BOOKING === */
.booking-layout { display: grid; grid-template-columns: 1fr; gap: 32px; }
@media (min-width: 768px) { .booking-layout { grid-template-columns: 1.2fr 0.8fr; } }
.booking-form-wrapper { background: #fff; border-radius: 16px; padding: 32px; border: 1px solid rgba(0,0,0,0.06); }
.booking-info { background: var(--chart-bg-alt, #f5f1ec); border-radius: 16px; padding: 32px; }
.booking-info h3 { font-family: 'Inter', sans-serif; margin-bottom: 20px; }
.booking-info-list { display: flex; flex-direction: column; gap: 20px; }
.booking-info-item { display: flex; align-items: flex-start; gap: 12px; }
.booking-info-item i { font-size: 1.1rem; color: var(--chart-primary, #c2654a); flex-shrink: 0; margin-top: 2px; }
.booking-info-item strong { display: block; font-size: 14px; color: var(--chart-fg, #2d2a26); margin-bottom: 2px; }
.booking-info-item p, .booking-info-item a { font-size: 14px; color: var(--chart-fg-muted, #6b5e53); }

/* === SUCCESS === */
.success-block { text-align: center; padding: 64px 24px; max-width: 480px; margin: 0 auto; }
.success-icon { width: 72px; height: 72px; border-radius: 50%; background: var(--chart-accent-light, #e8f0e3); color: var(--chart-accent-dark, #5a8a4a); display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 2rem; }
.success-block h1 { margin-bottom: 12px; }
.success-block p { font-size: 15px; color: var(--chart-fg-muted, #6b5e53); margin-bottom: 32px; }
.success-actions { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; }

/* === BLOG === */
.blog-layout { display: grid; grid-template-columns: 1fr; gap: 32px; }
@media (min-width: 768px) { .blog-layout { grid-template-columns: 1fr 300px; } }
.blog-main { min-width: 0; }
.blog-article { max-width: 720px; margin: 0 auto; }

/* === AUTH === */
.auth-wrapper { display: flex; align-items: center; justify-content: center; min-height: 50vh; }
.auth-card { width: 100%; max-width: 420px; background: #fff; border-radius: 16px; padding: 40px 32px; border: 1px solid rgba(0,0,0,0.06); }
.auth-header { text-align: center; margin-bottom: 32px; }
.auth-header h2 { font-family: 'Inter', sans-serif; font-size: 1.25rem; margin-bottom: 6px; }
.auth-header p { font-size: 14px; color: var(--chart-fg-muted, #6b5e53); }
.auth-logo { display: inline-block; margin-bottom: 16px; }
.auth-form { display: flex; flex-direction: column; gap: 20px; }
.auth-divider { display: flex; align-items: center; gap: 12px; margin: 24px 0; }
.auth-divider::before, .auth-divider::after { content: ''; flex: 1; height: 1px; background: rgba(0,0,0,0.08); }
.auth-divider span { font-size: 12px; color: var(--chart-fg-subtle, #a09080); text-transform: uppercase; font-weight: 600; }
.auth-alt { text-align: center; font-size: 14px; color: var(--chart-fg-muted, #6b5e53); }
.auth-link { color: var(--chart-primary, #c2654a); font-weight: 600; }
.auth-link:hover { text-decoration: underline; }

/* === FORMS === */
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--chart-fg-muted, #5c534a); }
.form-input { width: 100%; padding: 12px 16px; border: 1.5px solid #e0d8cf; border-radius: 10px; font-size: 14px; font-family: 'Inter', sans-serif; color: var(--chart-fg, #1a1817); background: #fefdfb; transition: border-color 200ms ease, box-shadow 200ms ease; outline: none; }
.form-input:focus { border-color: var(--chart-primary, #c2654a); box-shadow: 0 0 0 3px rgba(var(--chart-primary-r, 194), var(--chart-primary-g, 101), var(--chart-primary-b, 74), 0.1); }
.form-input::placeholder { color: #b8a99a; }
.form-textarea { resize: vertical; min-height: 120px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-label-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.form-link { font-size: 12px; color: var(--chart-primary, #c2654a); font-weight: 500; }
.form-link:hover { text-decoration: underline; }
.form-hint { font-size: 11px; color: var(--chart-fg-subtle, #a09080); margin-top: 2px; }

/* === CARDS / GRID === */
.card { background: #fff; border-radius: 14px; padding: 32px; border: 1px solid rgba(0,0,0,0.06); transition: all 250ms ease-out; }
.card:hover { transform: translateY(-3px); border-color: rgba(0,0,0,0.12); }
.card-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; font-size: 22px; }
.card h3 { font-size: 18px; margin-bottom: 10px; font-family: 'Inter', sans-serif; font-weight: 600; letter-spacing: -0.01em; }
.card p { font-size: 14px; color: var(--chart-fg-muted, #6b5e53); line-height: 1.6; }
.grid-2 { display: grid; grid-template-columns: 1fr; gap: 24px; }
.grid-3 { display: grid; grid-template-columns: 1fr; gap: 24px; }
.grid-4 { display: grid; grid-template-columns: 1fr; gap: 24px; }
@media (min-width: 640px) { .grid-2, .grid-3, .grid-4 { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1024px) { .grid-3 { grid-template-columns: repeat(3, 1fr); } .grid-4 { grid-template-columns: repeat(4, 1fr); } }
.product-grid, .service-card { display: grid; grid-template-columns: 1fr; gap: 24px; }
@media (min-width: 640px) { .product-grid, .service-card { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1024px) { .product-grid { grid-template-columns: repeat(4, 1fr); } .service-card { grid-template-columns: repeat(3, 1fr); } }

/* === PRODUCT / SERVICE DETAIL === */
.product-detail, .service-detail { max-width: 900px; margin: 0 auto; }
.back-link { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; color: var(--chart-fg-muted, #6b5e53); font-weight: 500; margin-bottom: 24px; transition: color 150ms ease; }
.back-link:hover { color: var(--chart-primary, #c2654a); }

/* === LEGAL === */
.legal-content { max-width: 720px; margin: 0 auto; font-size: 15px; line-height: 1.75; color: var(--chart-fg, #2d2a26); }
.legal-content h2 { font-family: 'Inter', sans-serif; font-size: 1.1rem; margin-top: 40px; margin-bottom: 12px; }
.legal-content ul { padding-left: 20px; margin: 12px 0; }
.legal-content ul li { list-style: disc; margin-bottom: 6px; color: var(--chart-fg-muted, #6b5e53); }
.legal-content a { color: var(--chart-primary, #c2654a); font-weight: 500; }

/* === CUSTOMER DASHBOARD === */
.customer-dashboard { display: grid; grid-template-columns: 1fr; gap: 16px; }
@media (min-width: 768px) { .customer-dashboard { grid-template-columns: repeat(3, 1fr); } }
.dashboard-card { background: #fff; border-radius: 14px; padding: 24px; border: 1px solid rgba(0,0,0,0.06); transition: all 200ms ease; cursor: pointer; }
.dashboard-card:hover { border-color: rgba(var(--chart-primary-r, 194), var(--chart-primary-g, 101), var(--chart-primary-b, 74), 0.2); background: #fefdfb; }
.dashboard-card h3 { font-family: 'Inter', sans-serif; font-size: 0.95rem; display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.dashboard-card h3 i { color: var(--chart-primary, #c2654a); font-size: 1.1rem; }
.dashboard-card p { font-size: 13px; color: var(--chart-fg-muted, #6b5e53); }

/* === CART === */
.cart-container { max-width: 800px; margin: 0 auto; }
.cart-empty { text-align: center; padding: 64px 24px; }
.cart-empty-icon { font-size: 3rem; color: #d0c8bc; margin-bottom: 20px; display: block; }
.cart-empty h3 { font-family: 'Inter', sans-serif; margin-bottom: 8px; }
.cart-empty p { font-size: 14px; color: var(--chart-fg-muted, #6b5e53); margin-bottom: 24px; }

/* === FAQ === */
.faq-wrapper { max-width: 720px; margin: 0 auto; }
.faq-search { margin-bottom: 40px; }
.faq-search-input { position: relative; max-width: 480px; margin: 0 auto; }
.faq-search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--chart-fg-subtle, #a09080); font-size: 1rem; pointer-events: none; }
.faq-search-field { width: 100%; padding: 14px 16px 14px 44px; border: 1.5px solid #e0d8cf; border-radius: 9999px; font-size: 14px; font-family: 'Inter', sans-serif; color: var(--chart-fg, #1a1817); background: #fefdfb; outline: none; transition: border-color 200ms ease, box-shadow 200ms ease; }
.faq-search-field:focus { border-color: var(--chart-primary, #c2654a); box-shadow: 0 0 0 3px rgba(var(--chart-primary-r, 194), var(--chart-primary-g, 101), var(--chart-primary-b, 74), 0.08); }
.faq-list { display: flex; flex-direction: column; gap: 0; }
.faq-item { border-bottom: 1px solid rgba(0,0,0,0.06); }
.faq-item:first-child { border-top: 1px solid rgba(0,0,0,0.06); }
.faq-item-trigger { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 20px 8px; background: none; border: none; cursor: pointer; text-align: left; font-family: 'Inter', sans-serif; transition: color 200ms ease; }
.faq-item-trigger:hover { color: var(--chart-primary, #c2654a); }
.faq-item-question { font-size: 15px; font-weight: 600; color: var(--chart-fg, #2d2a26); flex: 1; }
.faq-item-open .faq-item-question { color: var(--chart-primary, #c2654a); }
.faq-item-icon { width: 28px; height: 28px; border-radius: 50%; border: 1.5px solid rgba(0,0,0,0.12); display: flex; align-items: center; justify-content: center; font-size: 0.9rem; color: var(--chart-fg-muted, #6b5e53); flex-shrink: 0; transition: all 250ms ease; }
.faq-item-open .faq-item-icon { background: var(--chart-primary, #c2654a); border-color: var(--chart-primary, #c2654a); color: var(--chart-primary-fg, #fff); }
.faq-item-answer-wrapper { overflow: hidden; max-height: 0; transition: max-height 350ms ease; }
.faq-item-answer-open { max-height: 600px; }
.faq-item-answer { padding: 0 8px 24px; font-size: 14px; color: var(--chart-fg-muted, #6b5e53); line-height: 1.7; }

/* === GALLERY === */
.gallery-filters { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 40px; flex-wrap: wrap; }
.gallery-filter { padding: 8px 20px; border-radius: 9999px; font-size: 13px; font-weight: 500; border: 1.5px solid #e0d8cf; background: transparent; color: var(--chart-fg-muted, #6b5e53); cursor: pointer; transition: all 200ms ease; font-family: 'Inter', sans-serif; }
.gallery-filter:hover { border-color: var(--chart-primary, #c2654a); color: var(--chart-primary, #c2654a); }
.gallery-filter-active { background: var(--chart-primary, #c2654a); border-color: var(--chart-primary, #c2654a); color: var(--chart-primary-fg, #fff); }
.gallery-filter-active:hover { background: var(--chart-primary-dark, #a8543b); color: var(--chart-primary-fg, #fff); }
.gallery-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
@media (min-width: 640px) { .gallery-grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 1024px) { .gallery-grid { grid-template-columns: repeat(4, 1fr); gap: 20px; } }
.gallery-item { position: relative; border-radius: 14px; overflow: hidden; cursor: pointer; aspect-ratio: 1; background: var(--chart-bg-alt, #f0ebe3); }
.gallery-item-large { grid-column: span 2; grid-row: span 2; aspect-ratio: auto; }
@media (min-width: 640px) { .gallery-item-large { grid-column: span 2; } }
.gallery-item-img { width: 100%; height: 100%; object-fit: cover; transition: transform 500ms ease; }
.gallery-item:hover .gallery-item-img { transform: scale(1.05); }
.gallery-item-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 50%); display: flex; flex-direction: column; justify-content: flex-end; padding: 20px; opacity: 0; transition: opacity 300ms ease; }
.gallery-item:hover .gallery-item-overlay { opacity: 1; }
.gallery-item-title { font-size: 15px; font-weight: 600; color: #fff; margin-bottom: 4px; font-family: 'Inter', sans-serif; }
.gallery-item-desc { font-size: 12px; color: rgba(255,255,255,0.8); line-height: 1.4; margin-bottom: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.gallery-item-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.gallery-item-tag { padding: 3px 10px; border-radius: 9999px; font-size: 10px; font-weight: 500; background: rgba(255,255,255,0.2); color: #fff; backdrop-filter: blur(4px); }

/* === GALLERY LIGHTBOX === */
.gallery-lightbox { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.92); display: flex; align-items: center; justify-content: center; padding: 24px; cursor: zoom-out; animation: fadeIn 200ms ease; }
.gallery-lightbox-close { position: absolute; top: 20px; right: 20px; width: 44px; height: 44px; border-radius: 50%; background: rgba(255,255,255,0.15); border: none; color: #fff; font-size: 1.3rem; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 200ms ease; z-index: 2; }
.gallery-lightbox-close:hover { background: rgba(255,255,255,0.25); }
.gallery-lightbox-img { max-width: 90vw; max-height: 85vh; border-radius: 12px; object-fit: contain; cursor: default; }

/* === SITE FOOTER === */
.site-footer { background: var(--chart-fg, #1a1817); color: #b8a99a; padding: 0; margin-top: auto; }
.site-footer .container { padding-top: 64px; padding-bottom: 0; }
.footer-newsletter { display: flex; flex-direction: column; gap: 20px; padding: 32px; background: rgba(255,255,255,0.04); border-radius: 16px; margin-bottom: 48px; }
@media (min-width: 768px) { .footer-newsletter { flex-direction: row; align-items: center; justify-content: space-between; } }
.footer-newsletter-content h4 { color: #fff; font-family: 'Inter', sans-serif; font-weight: 600; margin-bottom: 4px; }
.footer-newsletter-content p { font-size: 13px; color: var(--chart-fg-subtle, #8a8078); }
.footer-grid { display: grid; grid-template-columns: 1fr; gap: 32px; }
@media (min-width: 480px) { .footer-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1024px) { .footer-grid { grid-template-columns: 2fr 1fr 1fr 1fr 1fr; } }
.footer-col { min-width: 0; }
.footer-col-brand { display: flex; flex-direction: column; gap: 16px; }
.footer-brand { display: flex; align-items: center; gap: 10px; }
.footer-brand-name { font-family: 'Playfair Display', Georgia, serif; font-size: 1.1rem; font-weight: 700; color: #fff; }
.footer-description { font-size: 13px; color: var(--chart-fg-subtle, #8a8078); line-height: 1.6; max-width: 280px; }
.footer-social { display: flex; gap: 8px; }
.footer-social .social-link { color: var(--chart-fg-subtle, #8a8078); }
.footer-social .social-link:hover { color: #fff; background: rgba(255,255,255,0.1); }
.footer-col-title { color: #fff; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 16px; font-family: 'Inter', sans-serif; }
.footer-links { display: flex; flex-direction: column; gap: 10px; }
.footer-links a { font-size: 13px; color: var(--chart-fg-subtle, #8a8078); transition: color 150ms ease; }
.footer-links a:hover { color: #fff; }
.footer-contact { display: flex; flex-direction: column; gap: 10px; }
.footer-contact li { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; color: var(--chart-fg-subtle, #8a8078); }
.footer-contact li i { color: var(--chart-fg-muted, #6b5e53); font-size: 0.9rem; flex-shrink: 0; margin-top: 1px; }
.footer-contact li a { color: var(--chart-fg-subtle, #8a8078); }
.footer-contact li a:hover { color: #fff; }
.footer-bottom { display: flex; flex-direction: column; gap: 16px; align-items: center; padding: 24px 0; margin-top: 48px; border-top: 1px solid rgba(255,255,255,0.08); }
@media (min-width: 640px) { .footer-bottom { flex-direction: row; justify-content: space-between; } }
.footer-bottom-left p { font-size: 13px; color: #6b5e53; }
.footer-bottom-right { display: flex; align-items: center; gap: 12px; }
.footer-payment-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b5e53; }
.footer-payment-icons { display: flex; align-items: center; gap: 8px; font-size: 1.2rem; color: #6b5e53; }

/* === ANIMATIONS === */
@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.animate-fade-in { animation: fadeInUp 600ms ease-out forwards; }

/* === RESPONSIVE OVERRIDES === */
@media (max-width: 767px) {
  .section { padding: 64px 0; }
  .page-header { padding: 56px 0 40px; }
  .hero { padding: 80px 0 64px; }
  .cta-block { padding: 40px 20px; }
  .newsletter-block { padding: 32px 20px; }
  .site-header .container { height: 56px; }
  .header-actions .btn span { display: none; }
  .footer-newsletter { padding: 24px; }
}`;

// ============ MAIN COMPONENT ============
export default function ThemeBuilderPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [categories, setCategories] = useState<ThemeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'draft'>('all');
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [userIdcommerce, setUserIdcommerce] = useState<string>('');

  // Theme info form state
  const [formTitre, setFormTitre] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formVersion, setFormVersion] = useState('1.0');
  const [formPrix, setFormPrix] = useState('0');
  const [formStylesheet, setFormStylesheet] = useState(DEFAULT_STYLESHEET);
  const [savingTheme, setSavingTheme] = useState(false);
  const [themeSaved, setThemeSaved] = useState(false);
  const [deletingTheme, setDeletingTheme] = useState<Theme | null>(null);

  // Editor tab
  const [editorTab, setEditorTab] = useState<'params' | 'pages' | 'preview' | 'versions' | 'ai'>('params');

  // Pages state
  const [themePages, setThemePages] = useState<ThemePage[]>([]);
  const [selectedPageKey, setSelectedPageKey] = useState<string>('');
  const [pageTitle, setPageTitle] = useState('');
  const [pageContent, setPageContent] = useState('');
  const [savingPage, setSavingPage] = useState(false);
  const [pageSaved, setPageSaved] = useState(false);
  const [pageDirty, setPageDirty] = useState(false);

  // AI state
  const [aiProviderId, setAiProviderId] = useState('openai');
  const [aiModel, setAiModel] = useState('gpt-4o');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiProgress, setAiProgress] = useState('');
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiGeneratedTheme, setAiGeneratedTheme] = useState<GeneratedTheme | null>(null);
  const [aiError, setAiError] = useState('');
  const [apiKeys, setApiKeys] = useState<ApiKeys>({ xai: '', openrouter: '', ollama: '', openai: '', ollama_endpoint: '' });
  const [customInstructions, setCustomInstructions] = useState(() => {
    try { return localStorage.getItem('theme-builder-instructions') || ''; } catch { return ''; }
  });
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Theme contenu + paramettre (Zifek compatibility)
  const [themeContenu, setThemeContenu] = useState<ThemeContenu | null>(null);
  const [themeParamettre, setThemeParamettre] = useState<ThemeParamettre | null>(null);
  const [savingContenu, setSavingContenu] = useState(false);
  const [contenuSaved, setContenuSaved] = useState(false);
  const [versionRestoreKey, setVersionRestoreKey] = useState(0);

  // ============ INIT ============
  useEffect(() => {
    fetchThemes();
    fetchCategories();
    fetchUserCommerceId();
    fetchApiKeys();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  const fetchApiKeys = async () => {
    try {
      const { data } = await supabase.from('zifek').select('xai_api_key, openrouter_api_key, ollama_api_key, openai_api_key, ollama_endpoint').limit(1).maybeSingle();
      if (data) {
        setApiKeys({
          xai: data.xai_api_key || '',
          openrouter: data.openrouter_api_key || '',
          ollama: data.ollama_api_key || '',
          openai: data.openai_api_key || '',
          ollama_endpoint: data.ollama_endpoint || 'http://localhost:11434',
        });
      }
    } catch { /* */ }
  };

  const fetchUserCommerceId = async () => {
    if (!user) return;
    try {
      const { data } = await supabase.from('users').select('idcommerce').eq('id', user.id).maybeSingle();
      setUserIdcommerce(data && data.idcommerce != null ? String(data.idcommerce) : String(user.id));
    } catch {
      setUserIdcommerce(String(user.id));
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await supabase.from('typetheme').select('*').order('id');
      setCategories((data as ThemeCategory[]) || []);
    } catch { /* */ }
  };

  const fetchThemes = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('sitewebtheme').select('*').order('id', { ascending: false });
      setThemes((data as Theme[]) || []);
    } catch { /* */ } finally {
      setLoading(false);
    }
  };

  const getCategoryName = (typethemeId?: string): string => {
    if (!typethemeId || categories.length === 0) return 'Sans catégorie';
    const found = categories.find((c) => String(c.id) === typethemeId);
    return found ? found.titre : `ID: ${typethemeId}`;
  };

  const getPageLabel = (key: string): string => {
    const def = PAGE_DEFS.find((p) => p.key === key);
    return def ? def.label : key;
  };

  const getPageIcon = (key: string): string => {
    const def = PAGE_DEFS.find((p) => p.key === key);
    return def ? def.icon : 'ri-file-line';
  };

  const getPageDesc = (key: string): string => {
    const def = PAGE_DEFS.find((p) => p.key === key);
    return def ? def.description : '';
  };

  // ============ THEME PAGES ============
  const fetchThemePages = async (themeId: number) => {
    try {
      const { data } = await supabase
        .from('sitewebthemepage')
        .select('*')
        .eq('idtheme', themeId)
        .order('id');
      setThemePages((data as ThemePage[]) || []);
    } catch { /* */ }
  };

  const fetchThemeContenuParamettre = async (themeId: number) => {
    try {
      const { data: contenuData } = await supabase
        .from('sitewebthemecontenu')
        .select('*')
        .eq('idtheme', themeId)
        .maybeSingle();
      setThemeContenu((contenuData as ThemeContenu) || null);

      const { data: paramData } = await supabase
        .from('sitewebthemeparamettre')
        .select('*')
        .eq('idtheme', themeId)
        .maybeSingle();
      setThemeParamettre((paramData as ThemeParamettre) || null);
    } catch { /* */ }
  };

  const ensureThemeHasAllPages = async (themeId: number) => {
    const existingKeys = new Set(themePages.map((p) => p.page_key));
    const missingDefs = PAGE_DEFS.filter((d) => !existingKeys.has(d.key));
    if (missingDefs.length === 0) return;

    const inserts = missingDefs.map((d) => ({
      idtheme: themeId,
      page_key: d.key,
      title: d.label,
      content: '',
    }));

    try {
      await supabase.from('sitewebthemepage').insert(inserts);
      await fetchThemePages(themeId);
    } catch { /* */ }
  };

  const selectPage = (pageKey: string) => {
    if (pageDirty) {
      if (!confirm('Vous avez des modifications non sauvegardées. Continuer sans enregistrer ?')) return;
    }
    setSelectedPageKey(pageKey);
    const page = themePages.find((p) => p.page_key === pageKey);
    setPageTitle(page?.title || getPageLabel(pageKey));
    setPageContent(page?.content || '');
    setPageDirty(false);
    setPageSaved(false);
  };

  const handleSavePage = async () => {
    if (!editingTheme || !selectedPageKey) return;
    setSavingPage(true);
    try {
      await supabase
        .from('sitewebthemepage')
        .update({
          title: pageTitle,
          content: pageContent,
          updated_at: new Date().toISOString(),
        })
        .eq('idtheme', editingTheme.id)
        .eq('page_key', selectedPageKey);
      setPageSaved(true);
      setPageDirty(false);
      setTimeout(() => setPageSaved(false), 2000);
      await fetchThemePages(editingTheme.id);
    } catch { /* */ } finally {
      setSavingPage(false);
    }
  };

  // ============ THEME EDITOR ============
  const openEditor = async (theme: Theme) => {
    setEditingTheme(theme);
    setFormTitre(theme.titre || '');
    setFormDescription(theme.description || '');
    setFormCategory(theme.typetheme || (categories.length > 0 ? String(categories[0].id) : ''));
    setFormVersion(theme.version || '1.0');
    setFormPrix(theme.prix || '0');
    setFormStylesheet(theme.stylesheet || DEFAULT_STYLESHEET);
    setThemeSaved(false);
    setEditorTab('params');
    setSelectedPageKey('');
    setPageDirty(false);
    setPageSaved(false);
    setAiGeneratedTheme(null);
    setAiMessages([]);
    setAiPrompt('');
    setAiError('');

    await fetchThemePages(theme.id);
    await fetchThemeContenuParamettre(theme.id);
    setContenuSaved(false);
    setTimeout(() => ensureThemeHasAllPages(theme.id), 200);
  };

  const closeEditor = () => {
    if (pageDirty) {
      if (!confirm('Vous avez des modifications non sauvegardées. Voulez-vous vraiment fermer ?')) return;
    }
    setEditingTheme(null);
    setThemeSaved(false);
    setSelectedPageKey('');
    setPageDirty(false);
    setAiGeneratedTheme(null);
    fetchThemes();
  };

  const handleSaveVersion = async (label: string) => {
    if (!editingTheme) return;
    const pagesSnapshot: Record<string, { title: string; content: string }> = {};
    themePages.forEach((p) => {
      pagesSnapshot[p.page_key] = { title: p.title, content: p.content };
    });
    const lbl = label.trim() || `v${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
    await supabase.from('sitewebtheme_versions').insert({
      idtheme: editingTheme.id,
      stylesheet: formStylesheet,
      pages_snapshot: pagesSnapshot,
      version_label: lbl,
    });
  };

  const handleRestoreVersion = (stylesheet: string, pagesSnapshot: Record<string, { title: string; content: string }>) => {
    if (!editingTheme) return;
    setFormStylesheet(stylesheet);
    // Update all pages from snapshot
    const updatedPages = themePages.map((p) => {
      const snap = pagesSnapshot[p.page_key];
      if (snap) {
        return { ...p, title: snap.title, content: snap.content };
      }
      return p;
    });
    setThemePages(updatedPages);
    // Persist to DB
    Promise.all(updatedPages.map((p) =>
      supabase.from('sitewebthemepage').update({
        title: p.title,
        content: p.content,
        updated_at: new Date().toISOString(),
      }).eq('id', p.id)
    )).then(() => {
      supabase.from('sitewebtheme').update({ stylesheet }).eq('id', editingTheme.id);
    });
    // Refresh selected page if one is active
    if (selectedPageKey) {
      const snap = pagesSnapshot[selectedPageKey];
      if (snap) {
        setPageContent(snap.content);
        setPageTitle(snap.title);
        setPageDirty(false);
      }
    }
    setVersionRestoreKey((k) => k + 1);
  };

  const handleSaveTheme = async () => {
    if (!formTitre.trim() || !editingTheme) return;
    setSavingTheme(true);
    try {
      await supabase.from('sitewebtheme').update({
        titre: formTitre.trim(),
        description: formDescription.trim(),
        typetheme: formCategory,
        version: formVersion,
        prix: formPrix,
        stylesheet: formStylesheet,
      }).eq('id', editingTheme.id);
      setThemeSaved(true);
      setTimeout(() => setThemeSaved(false), 2000);
    } catch { /* */ } finally {
      setSavingTheme(false);
    }
  };

  const handleSaveContenuParamettre = async () => {
    if (!editingTheme || !themeContenu || !themeParamettre) return;
    setSavingContenu(true);
    try {
      // Upsert contenu
      if (themeContenu.id) {
        await supabase.from('sitewebthemecontenu').update({
          titrenavmenudefaut: themeContenu.titrenavmenudefaut,
          descriptionnavmenudefault: themeContenu.descriptionnavmenudefault,
          imagebannierenavmenudefault: themeContenu.imagebannierenavmenudefault,
        }).eq('id', themeContenu.id);
      } else {
        const { data: newContenu } = await supabase.from('sitewebthemecontenu').insert({
          idtheme: editingTheme.id,
          idshop: 1,
          titrenavmenudefaut: themeContenu.titrenavmenudefaut,
          descriptionnavmenudefault: themeContenu.descriptionnavmenudefault,
          imagebannierenavmenudefault: themeContenu.imagebannierenavmenudefault,
        }).select('id').single();
        if (newContenu) setThemeContenu(prev => prev ? { ...prev, id: newContenu.id } : null);
      }
      // Upsert paramettre
      if (themeParamettre.id) {
        await supabase.from('sitewebthemeparamettre').update({
          titre: themeParamettre.titre,
          descriptionbanniere: themeParamettre.descriptionbanniere,
          imageaboutus: themeParamettre.imageaboutus,
          titreblocdecouvert: themeParamettre.titreblocdecouvert,
          descriptionblocdecouvert: themeParamettre.descriptionblocdecouvert,
          fichierblocdecouvert: themeParamettre.fichierblocdecouvert,
        }).eq('id', themeParamettre.id);
      } else {
        const { data: newParam } = await supabase.from('sitewebthemeparamettre').insert({
          idtheme: editingTheme.id,
          idcommerce: 1,
          titre: themeParamettre.titre,
          descriptionbanniere: themeParamettre.descriptionbanniere,
          imageaboutus: themeParamettre.imageaboutus,
          titreblocdecouvert: themeParamettre.titreblocdecouvert,
          descriptionblocdecouvert: themeParamettre.descriptionblocdecouvert,
          fichierblocdecouvert: themeParamettre.fichierblocdecouvert,
        }).select('id').single();
        if (newParam) setThemeParamettre(prev => prev ? { ...prev, id: newParam.id } : null);
      }
      setContenuSaved(true);
      setTimeout(() => setContenuSaved(false), 2000);
      await fetchThemeContenuParamettre(editingTheme.id);
    } catch { /* */ } finally {
      setSavingContenu(false);
    }
  };

  const handleCreateTheme = async (name: string, desc: string, categoryId: string, imageCouverture: string): Promise<boolean> => {
    if (!name.trim()) return false;
    try {
      const dossierSlug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const authorIdInt = user?.id ? (() => { const parsed = parseInt(String(user.id), 10); return Number.isNaN(parsed) ? 1 : parsed; })() : 1;
      const safeTypetheme = categoryId || (categories.length > 0 ? String(categories[0].id) : '1');

      const insertPayload: Record<string, unknown> = {
        titre: name.trim(),
        description: desc.trim(),
        typetheme: safeTypetheme,
        version: '1.0',
        prix: '0',
        stylesheet: DEFAULT_STYLESHEET,
        active: 0,
        idauteur: authorIdInt,
        dossier: dossierSlug,
        imagecouverture: imageCouverture || '',
      };

      if (userIdcommerce) {
        insertPayload.idcommerce = userIdcommerce;
      }

      const { data: newTheme, error: insertError } = await supabase
        .from('sitewebtheme')
        .insert(insertPayload)
        .select('id')
        .single();

      if (insertError) {
        console.error('Erreur INSERT sitewebtheme:', JSON.stringify(insertError));
        throw new Error(`Erreur base de données : ${insertError.message || insertError.code || 'inconnue'}`);
      }

      if (!newTheme) {
        throw new Error('Aucune donnée retournée après insertion');
      }

      const newThemeId = newTheme.id;

      // Create pages
      const pageInserts = PAGE_DEFS.map((d) => ({
        idtheme: newThemeId,
        page_key: d.key,
        title: d.label,
        content: '',
      }));

      const { error: pagesError } = await supabase.from('sitewebthemepage').insert(pageInserts);
      if (pagesError) {
        console.error('Erreur INSERT pages:', JSON.stringify(pagesError));
      }

      // Create contenu (nav menu defaults)
      const { error: contenuError } = await supabase.from('sitewebthemecontenu').insert({
        idtheme: newThemeId,
        idshop: 1,
        titrenavmenudefaut: `${name.trim()} | Services | À propos | Contact`,
        descriptionnavmenudefault: `Navigation du thème ${name.trim()}`,
        imagebannierenavmenudefault: '',
      });
      if (contenuError) {
        console.error('Erreur INSERT contenu:', JSON.stringify(contenuError));
      }

      // Create paramettre (banner/about defaults)
      const { error: paramError } = await supabase.from('sitewebthemeparamettre').insert({
        idtheme: newThemeId,
        idcommerce: 1,
        titre: `${name.trim()} - Paramètres`,
        descriptionbanniere: `Bannière principale du thème ${name.trim()}`,
        imageaboutus: '',
        titreblocdecouvert: 'Découvrez nos services',
        descriptionblocdecouvert: `Contenu découverte du thème ${name.trim()}`,
        fichierblocdecouvert: '',
      });
      if (paramError) {
        console.error('Erreur INSERT paramettre:', JSON.stringify(paramError));
      }

      setShowNewModal(false);
      fetchThemes();
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      console.error('Create theme error:', msg);
      throw e;
    }
  };

  const toggleActive = async (theme: Theme) => {
    try {
      const newStatus = theme.active === 1 ? 0 : 1;
      await supabase.from('sitewebtheme').update({ active: newStatus }).eq('id', theme.id);
      setThemes((prev) => prev.map((t) => (t.id === theme.id ? { ...t, active: newStatus } : t)));
    } catch { /* */ }
  };

  const handleDeleteTheme = (theme: Theme) => {
    setDeletingTheme(theme);
  };

  const confirmDeleteTheme = async () => {
    if (!deletingTheme) return;

    if (editingTheme?.id === deletingTheme.id) {
      setEditingTheme(null);
      setPageDirty(false);
    }

    const themeId = deletingTheme.id;
    setDeletingTheme(null);

    try {
      await supabase.from('sitewebthemepage').delete().eq('idtheme', themeId);
      await supabase.from('sitewebthemecontenu').delete().eq('idtheme', themeId);
      await supabase.from('sitewebthemeparamettre').delete().eq('idtheme', themeId);
      await supabase.from('sitewebtheme').delete().eq('id', themeId);
      setThemes((prev) => prev.filter((t) => t.id !== themeId));
    } catch (e) {
      console.error('Delete theme error:', e);
    }
  };

  const duplicateTheme = async (theme: Theme) => {
    try {
      // 1. Copy the theme row
      const { data: newTheme, error: copyError } = await supabase
        .from('sitewebtheme')
        .insert({
          titre: `${theme.titre || 'Sans nom'} (copie)`,
          description: theme.description || '',
          typetheme: theme.typetheme || '',
          version: theme.version || '1.0',
          prix: theme.prix || '0',
          stylesheet: theme.stylesheet || DEFAULT_STYLESHEET,
          dossier: (theme.dossier || 'theme') + '-copie',
          imagecouverture: theme.imagecouverture || '',
          active: 0,
          idauteur: theme.idauteur,
          idcommerce: theme.idcommerce,
        })
        .select('id')
        .single();

      if (copyError || !newTheme) throw new Error('Échec de la duplication du thème');

      const newId = newTheme.id;

      // 2. Copy pages
      const { data: pages } = await supabase
        .from('sitewebthemepage')
        .select('*')
        .eq('idtheme', theme.id);

      if (pages && pages.length > 0) {
        const pageCopies = pages.map((p: ThemePage) => ({
          idtheme: newId,
          page_key: p.page_key,
          title: p.title,
          content: p.content,
        }));
        await supabase.from('sitewebthemepage').insert(pageCopies);
      }

      // 3. Copy contenu
      const { data: contenu } = await supabase
        .from('sitewebthemecontenu')
        .select('*')
        .eq('idtheme', theme.id)
        .maybeSingle();

      if (contenu) {
        await supabase.from('sitewebthemecontenu').insert({
          idtheme: newId,
          idshop: (contenu as ThemeContenu).idshop || 1,
          titrenavmenudefaut: (contenu as ThemeContenu).titrenavmenudefaut || '',
          descriptionnavmenudefault: (contenu as ThemeContenu).descriptionnavmenudefault || '',
          imagebannierenavmenudefault: (contenu as ThemeContenu).imagebannierenavmenudefault || '',
        });
      }

      // 4. Copy paramettre
      const { data: param } = await supabase
        .from('sitewebthemeparamettre')
        .select('*')
        .eq('idtheme', theme.id)
        .maybeSingle();

      if (param) {
        await supabase.from('sitewebthemeparamettre').insert({
          idtheme: newId,
          idcommerce: (param as ThemeParamettre).idcommerce || 1,
          titre: (param as ThemeParamettre).titre || '',
          descriptionbanniere: (param as ThemeParamettre).descriptionbanniere || '',
          imageaboutus: (param as ThemeParamettre).imageaboutus || '',
          titreblocdecouvert: (param as ThemeParamettre).titreblocdecouvert || '',
          descriptionblocdecouvert: (param as ThemeParamettre).descriptionblocdecouvert || '',
          fichierblocdecouvert: (param as ThemeParamettre).fichierblocdecouvert || '',
        });
      }

      // Refresh list + open the new theme in editor
      await fetchThemes();
      const fresh: Theme = {
        id: newId,
        titre: `${theme.titre || 'Sans nom'} (copie)`,
        description: theme.description || '',
        typetheme: theme.typetheme || '',
        version: theme.version || '1.0',
        prix: theme.prix || '0',
        stylesheet: theme.stylesheet || DEFAULT_STYLESHEET,
        dossier: (theme.dossier || 'theme') + '-copie',
        imagecouverture: theme.imagecouverture || '',
        active: 0,
        idauteur: theme.idauteur,
        idcommerce: theme.idcommerce,
      };
      openEditor(fresh);
    } catch (e) {
      console.error('Duplicate error:', e);
    }
  };

  const handleExportTheme = async (theme: Theme) => {
    try {
      const { data: pages } = await supabase
        .from('sitewebthemepage')
        .select('*')
        .eq('idtheme', theme.id);

      const zip = new JSZip();

      // ─── style.css ───
      zip.file('style.css', theme.stylesheet || DEFAULT_STYLESHEET);

      // ─── pages/ folder ───
      const pagesFolder = zip.folder('pages');
      if (pages && pagesFolder) {
        (pages as ThemePage[]).forEach((page) => {
          pagesFolder.file(`${page.page_key}.html`, page.content || '');
        });
      }

      // ─── assets folder (placeholder for external devs) ───
      const assetsFolder = zip.folder('assets');
      const imagesFolder = assetsFolder?.folder('images');
      if (imagesFolder) {
        imagesFolder.file('.gitkeep', '# Place your theme images here\n# Reference them in page HTML as: assets/images/your-image.jpg');
      }
      const fontsFolder = assetsFolder?.folder('fonts');
      if (fontsFolder) {
        fontsFolder.file('.gitkeep', '# Place custom font files here (.woff2, .woff, .ttf)\n# Reference them in style.css via @font-face');
      }

      // ─── theme-manifest.json (spec portable) ───
      const manifest = {
        manifestVersion: '1.0.0',
        theme: {
          name: theme.titre || 'Sans nom',
          description: theme.description || '',
          version: theme.version || '1.0',
          author: {
            name: '',
            email: '',
            url: '',
          },
          category: getCategoryName(theme.typetheme),
          price: theme.prix || '0',
          license: 'MIT',
          keywords: [],
          screenshot: 'assets/screenshot.png',
        },
        pages: PAGE_DEFS.map(p => p.key),
        templateTags: {
          simple: ['site_name', 'site_description', 'site_logo', 'site_phone', 'site_email', 'site_address', 'site_about', 'year'],
          blocks: ['products', 'services', 'blog_posts', 'partners', 'team', 'portfolio', 'testimonials', 'stats', 'contact_form', 'booking_form', 'faq', 'gallery'],
          marketplace: ['marketplace_products', 'marketplace_sellers', 'marketplace_search', 'marketplace_categories', 'featured_products'],
        },
        assets: {
          images: [],
          fonts: [],
        },
        compatibility: {
          zifekVersion: '>=3.0.0',
          templateEngine: '2.0',
        },
        exportedAt: new Date().toISOString(),
      };

      zip.file('theme-manifest.json', JSON.stringify(manifest, null, 2));

      // ─── theme-info.json (legacy) ───
      zip.file('theme-info.json', JSON.stringify({
        name: theme.titre,
        description: theme.description,
        version: theme.version,
        category: getCategoryName(theme.typetheme),
        price: theme.prix,
        imageCouverture: theme.imagecouverture || '',
        exportedAt: new Date().toISOString(),
      }, null, 2));

      // ─── README.md ───
      const readmeContent = `# ${theme.titre || 'Mon Thème Zifek'}

${theme.description || 'Thème créé avec Zifek Theme Builder'}

## 🚀 Développement

Ce thème suit la **spécification portable Zifek Theme v1.0**.

### Structure du thème

\`\`\`
theme.zip
├── theme-manifest.json   ← Spec complète du thème
├── theme-info.json       ← Métadonnées legacy
├── style.css             ← Feuille de style principale
├── pages/                ← Contenu HTML de chaque page
│   ├── home.html
│   ├── produits.html
│   ├── marketplace.html
│   └── ...
├── assets/               ← Images et polices
│   ├── images/
│   └── fonts/
└── README.md
\`\`\`

### Template Tags disponibles

**Simples :** \`{{site_name}}\` \`{{site_description}}\` \`{{site_logo}}\` \`{{site_phone}}\` \`{{site_email}}\` \`{{site_address}}\` \`{{site_about}}\` \`{{year}}\`

**Blocs :** \`{{products}}\` \`{{services}}\` \`{{blog_posts}}\` \`{{partners}}\` \`{{team}}\` \`{{portfolio}}\` \`{{testimonials}}\` \`{{stats}}\` \`{{contact_form}}\` \`{{booking_form}}\` \`{{faq}}\` \`{{gallery}}\`

**Marketplace :** \`{{marketplace_products}}\` \`{{marketplace_sellers}}\` \`{{marketplace_search}}\` \`{{marketplace_categories}}\` \`{{featured_products}}\`

### Comment développer

1. Modifie \`style.css\` pour le design
2. Édite les fichiers dans \`pages/\` pour le contenu
3. Ajoute tes images dans \`assets/images/\`
4. Mets à jour \`theme-manifest.json\` avec tes infos
5. Re-compresse en ZIP et importe dans Zifek

### Prérequis techniques

- CSS vanilla (pas de préprocesseur requis)
- HTML5 sémantique
- Les template tags sont remplacés automatiquement par Zifek
- Ne pas inclure de JavaScript dans les pages (géré par Zifek)
- Les polices Google Fonts sont supportées via \`@import\` dans style.css

---

Développé avec [Zifek Theme Builder](${getMainSiteUrl()})
`;
      zip.file('README.md', readmeContent);

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `theme-${theme.dossier || theme.id}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export error:', e);
    }
  };

  // ============ AI GENERATION ============
  const buildAiSystemPrompt = (): string => {
    const pageDescriptions = PAGE_DEFS.map((p) => `- ${p.key}: ${p.description}`).join('\n');
    const instructionsBlock = customInstructions.trim()
      ? `\n\n📐 DIRECTIVES DE DESIGN PERSONNALISÉES (prioritaires sur tout le reste)\n${customInstructions.trim()}\n\n⚠️ Ces directives sont LA LOI. Tout le design, l'UX et la structure doivent les respecter en priorité absolue.`
      : '';

    return `Tu es un Designer UI/UX Senior spécialisé dans la création de sites web premium. Tu travailles pour des clients exigeants qui attendent un niveau de qualité comparable à Stripe, Linear, Vercel ou Airbnb. Ton code HTML/CSS doit être IRRÉPROCHABLE.${instructionsBlock}

🎯 TA MISSION
Générer un thème web complet dont la qualité visuelle est ta PRIORITÉ ABSOLUE. Chaque pixel compte. Chaque espacement est intentionnel. Chaque animation a un sens. Aucun design daté, basique ou générique n'est acceptable.

🏆 STANDARD DE QUALITÉ EXIGÉ
- Design premium, raffiné, moderne — comparable aux plus belles startups (Stripe, Linear, Airbnb, Vercel)
- Rien de générique : chaque thème doit avoir sa propre PERSONNALITÉ visuelle unique
- Hiérarchie visuelle impeccable : le visiteur comprend instantanément où regarder
- Micro-interactions subtiles qui élèvent l'expérience (hover, transitions, animations d'entrée)
- Espacement généreux et respiration : le design respire, jamais étouffé
- Typographie sophistiquée qui donne le ton immédiatement

📐 PRINCIPES DE DESIGN — À RESPECTER ABSOLUMENT

1. TYPOGRAPHIE PREMIUM
- Minimum 2 Google Fonts soigneusement choisies : une display/heading + une body
- La font heading doit avoir du CARACTÈRE (pas Inter par défaut — utilise Playfair Display, Space Grotesk, DM Serif Display, Clash Display, Syne, Cabinet Grotesk, etc.)
- Tailles raffinées : headings ni trop gros ni trop petits, body en 15-16px, labels en 11-12px
- Letter-spacing négatif subtil sur les grands titres (-0.02em à -0.04em)
- Line-height confortable : 1.1-1.2 pour headings, 1.6-1.7 pour body

2. PALETTE DE COULEURS
- JAMAIS de bleu standard (#0066FF, #3B82F6) ni de violet banal — c'est le niveau zéro du design
- JAMAIS de dégradés bleu-violet bon marché
- Utilise des couleurs SOFISTIQUÉES et INATTENDUES : terracotta, olive, sauge, bordeaux profond, ambre brûlé, vert forêt, crème chaud, charcoal, bronze, ocre, taupe
- Une couleur primaire forte ET une couleur accent contrastée bien distincte
- Palette monochromatique raffinée pour les neutres (pas de #f5f5f5 gris triste)
- Utilise des tons chauds ou terreux pour les backgrounds (jamais blanc pur #fff sauf contenu)
- Background du body : tons crème/chauds (#faf8f5, #fefcf8, #f7f4ef) ou dark sophistiqué (#0d0d0d, #111110, #1a1817)

3. MISE EN PAGE
- Container max-width : 1200-1280px (pas moins, pas plus)
- Sections avec padding vertical généreux : 80px-120px desktop, 60px mobile
- Grilles avec gap cohérent : 24-32px desktop, 16-20px mobile
- Les sections alternent entre fond clair et fond légèrement teinté pour créer du rythme
- Largeur de ligne de texte limitée à 65-75 caractères pour le confort de lecture

4. HERO SECTION
- La hero DOIT être spectaculaire et donner le ton immédiatement
- Grand titre avec la typographie display qui claque
- Sous-titre plus petit et subtil
- Un ou deux CTA maximum — jamais plus
- Fond : soit un dégradé subtil sophistiqué, soit une couleur pleine avec texture/couleur osée
- Le hero ne doit JAMAIS ressembler à un template Bootstrap

5. CARTES ET COMPOSANTS
- Bordures subtiles (1px solid avec opacité) plutôt que des ombres lourdes
- Border-radius cohérent : 12-16px pour les grandes cartes, 8px pour les petites, FULL pour les pills
- Hover : transition fluide (200-300ms ease-out), l'élévation doit être MINIME (2-4px translateY max, ou un simple changement de bordure/couleur)
- JAMAIS de box-shadow noir agressif — préfère des ombres très douces ou pas d'ombre du tout

6. BOUTONS
- Boutons primaires : fond plein couleur forte, texte blanc/crème
- Boutons secondaires : outline avec la couleur primaire, fond transparent
- Border-radius : FULL (9999px) pour un look moderne et doux
- Padding proportionnel : plus de padding horizontal que vertical (ex: 12px 28px)
- Hover : légère réduction d'opacité ou changement de teinte, transition 200ms
- Taille de police cohérente : 14-15px, jamais en dessous

7. FORMULAIRES
- Inputs avec bordure subtile, border-radius 8-10px
- Labels au-dessus des inputs (pas en placeholder), en petites majuscules ou semi-bold
- Focus : anneau fin (1-2px) de la couleur primaire, pas le focus bleu par défaut du navigateur
- Messages d'erreur en rouge subtil, pas en rouge vif agressif

8. RESPONSIVE — MOBILE FIRST
- Toutes les grilles s'adaptent : 1 colonne mobile → 2 tablettes → 3/4 desktop
- La navigation desktop devient un menu hamburger élégant sur mobile
- Les paddings se réduisent proportionnellement sur mobile (ne disparaissent pas)
- Les tailles de police s'adaptent sans être minuscules sur mobile

9. ANIMATIONS CSS
- Transitions fluides sur tous les éléments interactifs (200-300ms ease-out)
- Animation d'apparition subtile au scroll si pertinent (fade-in + translateY léger via @keyframes)
- Les cartes peuvent avoir un effet hover élégant : élévation minimale + changement de bordure
- JAMAIS d'animations flashy ou de transitions agressives

10. ACCESSIBILITÉ (WCAG AA minimum)
- Contraste minimum de 4.5:1 pour le texte normal, 3:1 pour le texte large
- États focus visibles sur tous les éléments interactifs
- Labels associés aux inputs
- Tailles de cible tactiles minimum 44x44px sur mobile

⚠️ SYSTÈME DE TEMPLATE TAGS ZIFEK ⚠️
NE génère JAMAIS de scripts, de fetch() ou d'appels API dans les pages. Le moteur TemplateRenderer de Zifek remplace automatiquement les balises spéciales par les données réelles du sous-domaine visité.

📋 TEMPLATE TAGS DISPONIBLES

🔤 Balises simples (remplacement texte) :
{{site_name}} · {{site_description}} · {{site_logo}} · {{site_phone}} · {{site_email}} · {{site_address}} · {{site_about}} · {{year}}

🧩 Balises de blocs (composants complets avec loading/empty/error) :
{{products}} · {{products limit="N"}} · {{services}} · {{blog_posts}} · {{partners}} · {{team}} · {{portfolio}} · {{testimonials}} · {{stats}} · {{contact_form}} · {{booking_form}} · {{faq}} · {{gallery}} · {{gallery limit="N"}}

🛒 Balises Marketplace :
{{marketplace_products}} · {{marketplace_products limit="N"}} · {{marketplace_sellers}} · {{marketplace_sellers limit="N"}} · {{marketplace_search placeholder="..."}} · {{marketplace_categories}} · {{featured_products}} · {{featured_products limit="N"}}

⚠️ Utilise EXCLUSIVEMENT ces balises. N'en invente pas. Le TemplateRenderer gère tout le rendu dynamique.

📤 FORMAT DE RÉPONSE EXIGÉ

Tu dois générer UNIQUEMENT cet objet JSON (pas de markdown, pas de texte avant/après).
ATTENTION : tu dois générer EXACTEMENT ${PAGE_DEFS.length} pages — ni plus, ni moins. Chaque clé ci-dessous DOIT être présente :

{
  "stylesheet": "CSS MINIMUM 150 LIGNES. Design premium, responsive mobile-first, animations subtiles, typographie Google Fonts, palette sophistiquée, système de classes complet et cohérent. Chaque section du site doit avoir son style défini. JAMAIS de variables CSS custom properties — utilise des classes concrètes.",
  "pages": {
    "head": { "title": "Head", "content": "<title>{{site_name}} — {{site_description}}</title>\\n<meta charset=\"UTF-8\">\\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\\n<meta name=\"description\" content=\"{{site_description}}\">\\n<meta property=\"og:title\" content=\"{{site_name}}\">\\n<meta property=\"og:description\" content=\"{{site_description}}\">\\n<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\\n<link href=\"https://fonts.googleapis.com/css2?family=...&display=swap\" rel=\"stylesheet\">\\n<link rel=\"stylesheet\" href=\"/style.css\">" },
    "header": { "title": "Header", "content": "<header class=\"site-header\">...{{site_logo}}...</header>" },
    "navmenu": { "title": "Nav Menu", "content": "<nav class=\"navmenu\">...</nav>" },
    "home": { "title": "Accueil — NomDuSite", "content": "HTML minimal structurant UNIQUEMENT les template tags dans des wrappers sémantiques stylés par le CSS" },
    "footer": { "title": "Footer", "content": "<footer class=\"site-footer\">...{{year}} {{site_name}}...</footer>" },
    ...TOUTES les autres pages listées ci-dessous (${PAGE_DEFS.length} pages au TOTAL)
  },
  "contenu": {
    "titrenavmenudefaut": "Accueil | Services | À propos | Contact",
    "descriptionnavmenudefault": "Navigation premium — NomDuSite",
    "imagebannierenavmenudefault": ""
  },
  "paramettre": {
    "titre": "NomDuSite — Paramètres",
    "descriptionbanniere": "Description soignée de la bannière — minimum 40 caractères, en français correct",
    "imageaboutus": "",
    "titreblocdecouvert": "Titre engageant pour le bloc découverte — minimum 25 caractères",
    "descriptionblocdecouvert": "Description détaillée du bloc découverte — minimum 60 caractères",
    "fichierblocdecouvert": ""
  }
}

🚫 RÈGLE ABSOLUE : PAS DE TEXTE EN DUR DANS LES PAGES 🚫

Les pages NE DOIVENT PAS contenir de texte descriptif en dur. Tout le contenu textuel doit venir des TEMPLATE TAGS.
Le HTML des pages est un SQUELETTE STRUCTUREL : des wrappers <section>, <div>, des classes CSS, et des template tags.
Le CSS fait TOUT le travail visuel. Les pages HTML sont uniquement la structure sémantique + les tags.

❌ EXEMPLES INTERDITS (texte en dur que le tenant ne peut pas changer) :
- <h2>Nos services exceptionnels</h2> → REMPLACE par <h2>{{site_name}} — Services</h2> ou section wrapper autour de {{services}}
- <p>Nous sommes une entreprise familiale depuis 1990...</p> → REMPLACE par {{site_about}}
- <span>Découvrez notre sélection</span> → SUPPRIME, le tag {{products}} affiche déjà tout

✅ BONNE PRATIQUE — contenu de page type :
- Des wrappers <section> avec des classes CSS pour le style
- Des template tags comme seuls enfants significatifs
- Éventuellement un <h2> avec {{site_name}} ou une balise simple pour le titre de section
- AUCUN paragraphe, AUCUNE description textuelle écrite en dur

📑 STRUCTURE PAR PAGE (template tags uniquement)

🏠 HOME — Hero + empilement de tous les tags principaux :
<section class="hero"><div class="container"><h1>{{site_name}}</h1><p>{{site_description}}</p></div></section>
<section class="section"><div class="container">{{products limit="6"}}</div></section>
<section class="section section-alt"><div class="container">{{services}}</div></section>
<section class="section"><div class="container">{{testimonials}}</div></section>
<section class="section section-alt"><div class="container">{{stats}}</div></section>
<section class="section"><div class="container">{{contact_form}}</div></section>

🛍️ PRODUITS : <section class="page-header"><h1>{{site_name}} — Boutique</h1></section><section class="section"><div class="container">{{products}}</div></section>
🛠️ SERVICES : <section class="page-header"><h1>{{site_name}} — Services</h1></section><section class="section"><div class="container">{{services}}</div></section>
📝 BLOG : <section class="page-header"><h1>{{site_name}} — Blog</h1></section><section class="section"><div class="container">{{blog_posts}}</div></section>
👤 À PROPOS : <section class="page-header"><h1>À propos de {{site_name}}</h1></section><section class="section"><div class="container">{{site_about}}</div></section><section class="section section-alt"><div class="container">{{stats}}</div></section>
👥 ÉQUIPE : <section class="page-header"><h1>Notre équipe</h1></section><section class="section"><div class="container">{{team}}</div></section>
🤝 PARTENAIRES : <section class="page-header"><h1>Nos partenaires</h1></section><section class="section"><div class="container">{{partners}}</div></section>
💬 TÉMOIGNAGES : <section class="page-header"><h1>Témoignages</h1></section><section class="section"><div class="container">{{testimonials}}</div></section>
📞 CONTACT : <section class="page-header"><h1>Contact</h1></section><section class="section"><div class="container">{{contact_form}}</div></section><section class="section section-alt"><div class="container"><p>{{site_phone}} · {{site_email}} · {{site_address}}</p></div></section>
📅 FAQ : <section class="page-header"><h1>FAQ — {{site_name}}</h1></section><section class="section"><div class="container">{{faq}}</div></section>
🖼️ GALERIE : <section class="page-header"><h1>Galerie — {{site_name}}</h1></section><section class="section"><div class="container">{{gallery}}</div></section>
📅 BOOKING : <section class="page-header"><h1>Réservation</h1></section><section class="section"><div class="container">{{booking_form}}</div></section>
🏪 MARKETPLACE : <section class="page-header"><h1>Marketplace</h1></section><section class="section"><div class="container">{{marketplace_search}}</div></section><section class="section"><div class="container">{{marketplace_categories}}</div></section><section class="section section-alt"><div class="container">{{featured_products limit="8"}}</div></section><section class="section"><div class="container">{{marketplace_products}}</div></section>
👤 VENDEUR : <section class="page-header"><h1>Vendeur</h1></section><section class="section"><div class="container">{{marketplace_sellers limit="1"}}</div></section><section class="section section-alt"><div class="container">{{marketplace_products}}</div></section>
💼 CLIENT : Tableau de bord statique avec sections commandes, favoris, messages (React gère l'auth)
🔐 AUTH : Formulaires HTML5 avec validation native, AUCUN template tag (React gère l'auth)
📄 STATIQUES (conditions, politique, retours) : HTML soigné avec structure légale
📄 LAYOUT (head, header, navmenu, footer) — ⛔ OBLIGATOIRE, NE JAMAIS OMETTRE ⛔
Ces 4 pages DOIVENT être générées. Si tu les omets, le thème est CASSÉ.

🔴 HEAD (OBLIGATOIRE) — Balises <title>, <meta>, <link> Google Fonts, Open Graph, SEO :
<title>{{site_name}} — {{site_description}}</title>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="{{site_description}}">
<meta name="keywords" content="...">
<meta property="og:title" content="{{site_name}}">
<meta property="og:description" content="{{site_description}}">
<meta property="og:type" content="website">
<link rel="canonical" href="{{site_url}}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css">
⚠️ Les Google Fonts dans le <head> DOIVENT correspondre aux polices utilisées dans le CSS !

🔴 HEADER (OBLIGATOIRE) — Structure de l'en-tête avec logo + navigation :
<header class="site-header"><div class="container"><a href="/" class="logo">{{site_logo}}</a><nav class="main-nav" aria-label="Navigation principale"><ul><li><a href="/">Accueil</a></li><li><a href="/produits">Boutique</a></li><li><a href="/service">Services</a></li><li><a href="/apropos">À propos</a></li><li><a href="/contact">Contact</a></li></ul></nav><button class="hamburger" aria-label="Menu"><span></span><span></span><span></span></button></div></header>
⚠️ Le header contient le logo {{site_logo}}, les liens de navigation principaux, et un bouton hamburger pour mobile.

🔴 NAVMENU (OBLIGATOIRE) — Menu de navigation détaillé (dropdowns, sous-menus) :
<nav class="navmenu" aria-label="Menu principal"><div class="container"><ul class="navmenu-list"><li><a href="/">Accueil</a></li><li class="has-dropdown"><a href="/produits">Boutique</a><ul class="dropdown">{{marketplace_categories}}</ul></li><li><a href="/service">Services</a></li><li><a href="/apropos">À propos</a></li><li><a href="/blog">Blog</a></li><li><a href="/contact">Contact</a></li></ul></div></nav>

🔴 FOOTER (OBLIGATOIRE) — Pied de page complet avec colonnes + copyright :
<footer class="site-footer"><div class="container"><div class="footer-grid"><div class="footer-col"><h4>{{site_name}}</h4><p>{{site_description}}</p></div><div class="footer-col"><h4>Liens rapides</h4><ul><li><a href="/">Accueil</a></li><li><a href="/produits">Boutique</a></li><li><a href="/service">Services</a></li><li><a href="/apropos">À propos</a></li><li><a href="/contact">Contact</a></li></ul></div><div class="footer-col"><h4>Contact</h4><p>{{site_phone}}</p><p>{{site_email}}</p><p>{{site_address}}</p></div><div class="footer-col"><h4>Légal</h4><ul><li><a href="/conditionsdutilisation">Conditions</a></li><li><a href="/politique">Confidentialité</a></li><li><a href="/retours">Retours</a></li></ul></div></div><div class="footer-bottom"><p>&copy; {{year}} {{site_name}}. Tous droits réservés.</p></div></div></footer>
⚠️ Le footer utilise {{site_name}}, {{site_description}}, {{site_phone}}, {{site_email}}, {{site_address}}, {{year}}.

📄 BOOKINGSUCCESS : HTML statique de confirmation

📏 RÈGLES DE CONTENU STRICTES
- ZÉRO paragraphe descriptif écrit en dur — TOUT passe par les template tags
- ZÉRO lorem ipsum ou texte fictif
- Le CSS fait TOUT le style : les wrappers HTML sont juste des conteneurs sémantiques
- URLs relatives : /produits, /service, /apropos, /contact
- Formulaires AUTH = validation HTML5 native (required, type="email", minlength, etc.)

⚠️ RAPPEL FINAL — À LIRE AVANT DE GÉNÉRER
- Qualité visuelle > quantité. Chaque section doit être DÉLIBÉRÉE et RAFFINÉE
- Le CSS doit faire MINIMUM 150 lignes bien organisées
- PAS de bleu générique, PAS de violet, PAS de dégradés basiques
- PAS de variables CSS — uniquement des classes concrètes
- RESPONSIVE mobile-first avec 3 breakpoints minimum
- PAS DE TEXTE EN DUR — uniquement la structure HTML + template tags + CSS
- Si le résultat ressemble à un template WordPress gratuit de 2015, tu as ÉCHOUÉ

⛔⛔⛔ RÈGLE SUPRÊME — NE JAMAIS VIOLER ⛔⛔⛔
Tu DOIS générer ABSOLUMENT TOUTES les pages listées ci-dessous, SANS EXCEPTION.
Particulièrement head, header, navmenu et footer — ces 4 pages sont le SQUELETTE du site.
Si tu omets head, le site n'aura pas de <title>, pas de Google Fonts, pas de SEO.
Si tu omets header ou footer, le site sera AMBULÉ.
VÉRIFIE TON JSON avant de répondre : chaque clé de page DOIT être présente.
TOUTES LES PAGES. SANS EXCEPTION. C'EST UN ORDRE.

Pages à générer :
${pageDescriptions}

Réponds UNIQUEMENT avec l'objet JSON, pas de texte avant ou après.`;
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim() || !editingTheme) return;

    const providerDef = AI_PROVIDERS.find((p) => p.id === aiProviderId);
    if (!providerDef) return;

    const key = apiKeys[aiProviderId as keyof ApiKeys] || '';
    if (!key && aiProviderId !== 'ollama') {
      setAiError(`Aucune clé API configurée pour ${providerDef.name}. Va dans Paramètres IA pour en ajouter une.`);
      return;
    }

    setAiGenerating(true);
    setAiProgress('Construction du prompt...');
    setAiError('');
    setAiGeneratedTheme(null);

    const userMsg: AiMessage = { role: 'user', content: aiPrompt };
    setAiMessages((prev) => [...prev, userMsg]);

    try {
      const systemPrompt = buildAiSystemPrompt();

      setAiProgress('Envoi à l\'IA...');

      let endpoint = providerDef.endpoint;
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      };

      if (aiProviderId === 'openrouter') {
        headers['HTTP-Referer'] = window.location.origin;
        headers['X-Title'] = 'Zifek Theme Builder';
      }

      // For ollama, adjust endpoint
      if (aiProviderId === 'ollama') {
        endpoint = `${apiKeys.ollama_endpoint}/v1/chat/completions`;
        headers = { 'Content-Type': 'application/json' };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: aiModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: aiPrompt },
          ],
          temperature: 0.7,
          max_tokens: 32000,
          response_format: (aiProviderId === 'openai' || aiProviderId === 'xai') ? { type: 'json_object' } : undefined,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API error ${response.status}: ${errText.slice(0, 200)}`);
      }

      setAiProgress('Réception de la réponse...');

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || '';

      if (!content) throw new Error('Réponse vide de l\'IA');

      // Parse JSON from response
      let parsed: GeneratedTheme;
      try {
        // Try direct parse first
        parsed = JSON.parse(content);
      } catch {
        // Try extracting JSON from markdown code block
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1].trim());
        } else {
          throw new Error('Impossible de parser la réponse JSON de l\'IA');
        }
      }

      if (!parsed.stylesheet || !parsed.pages) {
        throw new Error('Réponse IA incomplète (stylesheet ou pages manquants)');
      }

      setAiGeneratedTheme(parsed);

      const generatedCount = Object.keys(parsed.pages).length;
      const assistantMsg: AiMessage = {
        role: 'assistant',
        content: `✅ Thème généré avec succès !\n- **${generatedCount} pages** créées\n- **CSS** : ${parsed.stylesheet.length.toLocaleString()} caractères\n\nClique sur \"Appliquer le thème généré\" pour tout enregistrer.`,
      };
      setAiMessages((prev) => [...prev, assistantMsg]);

      // Log API call
      await supabase.from('zifek_api_logs').insert({
        provider: aiProviderId,
        model: aiModel,
        endpoint,
        request_tokens: result.usage?.prompt_tokens || 0,
        response_tokens: result.usage?.completion_tokens || 0,
        duration_ms: 0,
        status: 'success',
      });

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      setAiError(msg);
      const errorMsg: AiMessage = {
        role: 'assistant',
        content: `❌ Erreur : ${msg}`,
      };
      setAiMessages((prev) => [...prev, errorMsg]);
    } finally {
      setAiGenerating(false);
      setAiProgress('');
    }
  };

  const handleApplyGeneratedTheme = async () => {
    if (!aiGeneratedTheme || !editingTheme) return;

    setAiProgress('Application du thème...');

    try {
      // 1. Update stylesheet
      await supabase.from('sitewebtheme').update({
        stylesheet: aiGeneratedTheme.stylesheet,
      }).eq('id', editingTheme.id);
      setFormStylesheet(aiGeneratedTheme.stylesheet);

      // 2. Update all pages that the AI generated
      const generatedPageKeys = new Set(Object.keys(aiGeneratedTheme.pages));
      for (const [pageKey, pageData] of Object.entries(aiGeneratedTheme.pages)) {
        const hasContent = pageData.content && pageData.content.trim().length > 0;
        await supabase
          .from('sitewebthemepage')
          .update({
            title: pageData.title || getPageLabel(pageKey),
            content: hasContent ? pageData.content : getDefaultPageContent(pageKey),
            updated_at: new Date().toISOString(),
          })
          .eq('idtheme', editingTheme.id)
          .eq('page_key', pageKey);
      }

      // 3. CRITICAL: Auto-fill any pages that the AI forgot to generate
      //    (head, header, navmenu, footer are MANDATORY for the theme to work)
      const allPageKeys = PAGE_DEFS.map((d) => d.key);
      const missingPages = allPageKeys.filter((key) => !generatedPageKeys.has(key));
      
      if (missingPages.length > 0) {
        console.warn(`[ThemeBuilder] AI missed ${missingPages.length} pages, auto-filling defaults:`, missingPages);
        
        for (const pageKey of missingPages) {
          await supabase
            .from('sitewebthemepage')
            .update({
              title: getPageLabel(pageKey),
              content: getDefaultPageContent(pageKey),
              updated_at: new Date().toISOString(),
            })
            .eq('idtheme', editingTheme.id)
            .eq('page_key', pageKey);
        }
      }

      // 4. Also check for pages that were "generated" but are empty (AI sent back empty content)
      const emptyGeneratedPages = Object.entries(aiGeneratedTheme.pages)
        .filter(([, pageData]) => !pageData.content || pageData.content.trim().length === 0)
        .map(([key]) => key);

      if (emptyGeneratedPages.length > 0) {
        console.warn(`[ThemeBuilder] AI generated ${emptyGeneratedPages.length} empty pages, auto-filling defaults:`, emptyGeneratedPages);
        // Already handled in step 2 above
      }

      // 5. Upsert contenu (nav menu) if generated
      if (aiGeneratedTheme.contenu) {
        const { data: existingContenu } = await supabase
          .from('sitewebthemecontenu').select('id').eq('idtheme', editingTheme.id).maybeSingle();
        if (existingContenu) {
          await supabase.from('sitewebthemecontenu').update({
            titrenavmenudefaut: aiGeneratedTheme.contenu.titrenavmenudefaut,
            descriptionnavmenudefault: aiGeneratedTheme.contenu.descriptionnavmenudefault,
            imagebannierenavmenudefault: aiGeneratedTheme.contenu.imagebannierenavmenudefault || '',
          }).eq('id', existingContenu.id);
        } else {
          await supabase.from('sitewebthemecontenu').insert({
            idtheme: editingTheme.id,
            idshop: 1,
            titrenavmenudefaut: aiGeneratedTheme.contenu.titrenavmenudefaut,
            descriptionnavmenudefault: aiGeneratedTheme.contenu.descriptionnavmenudefault,
            imagebannierenavmenudefault: aiGeneratedTheme.contenu.imagebannierenavmenudefault || '',
          });
        }
      }

      // 6. Upsert paramettre (banner/about) if generated
      if (aiGeneratedTheme.paramettre) {
        const { data: existingParam } = await supabase
          .from('sitewebthemeparamettre').select('id').eq('idtheme', editingTheme.id).maybeSingle();
        if (existingParam) {
          await supabase.from('sitewebthemeparamettre').update({
            titre: aiGeneratedTheme.paramettre.titre,
            descriptionbanniere: aiGeneratedTheme.paramettre.descriptionbanniere,
            imageaboutus: aiGeneratedTheme.paramettre.imageaboutus || '',
            titreblocdecouvert: aiGeneratedTheme.paramettre.titreblocdecouvert,
            descriptionblocdecouvert: aiGeneratedTheme.paramettre.descriptionblocdecouvert,
            fichierblocdecouvert: aiGeneratedTheme.paramettre.fichierblocdecouvert || '',
          }).eq('id', existingParam.id);
        } else {
          await supabase.from('sitewebthemeparamettre').insert({
            idtheme: editingTheme.id,
            idcommerce: 1,
            titre: aiGeneratedTheme.paramettre.titre,
            descriptionbanniere: aiGeneratedTheme.paramettre.descriptionbanniere,
            imageaboutus: aiGeneratedTheme.paramettre.imageaboutus || '',
            titreblocdecouvert: aiGeneratedTheme.paramettre.titreblocdecouvert,
            descriptionblocdecouvert: aiGeneratedTheme.paramettre.descriptionblocdecouvert,
            fichierblocdecouvert: aiGeneratedTheme.paramettre.fichierblocdecouvert || '',
          });
        }
      }

      await fetchThemePages(editingTheme.id);
      await fetchThemeContenuParamettre(editingTheme.id);

      // Build warning message about missing pages
      let warningNote = '';
      if (missingPages.length > 0) {
        const missingLabels = missingPages.map((k) => getPageLabel(k)).join(', ');
        warningNote = `\n\n⚠️ L'IA n'a pas généré ${missingPages.length} page(s) — elles ont été remplies automatiquement avec des valeurs par défaut : ${missingLabels}. Tu peux les retoucher dans l'onglet Pages.`;
      }

      const successMsg: AiMessage = {
        role: 'assistant',
        content: `🎉 Thème appliqué avec succès ! Toutes les pages et le CSS ont été enregistrés.${warningNote}\n\nTu es maintenant dans l'onglet Pages pour voir et retoucher chaque page.`,
      };
      setAiMessages((prev) => [...prev, successMsg]);
      setAiGeneratedTheme(null);
      // Auto-switch to Pages tab
      setEditorTab('pages');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      setAiError(`Erreur lors de l'application : ${msg}`);
    } finally {
      setAiProgress('');
    }
  };

  // ============ FILTERING ============
  const filteredThemes = themes.filter((t) => {
    if (activeTab === 'active') return t.active === 1;
    if (activeTab === 'draft') return t.active !== 1;
    return true;
  });

  const currentProvider = AI_PROVIDERS.find((p) => p.id === aiProviderId);

  // ============ LOADING ============
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <i className="ri-loader-4-line animate-spin text-3xl text-primary-500"></i>
      </div>
    );
  }

  // ============ RENDER ============
  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-foreground-950">Theme Builder</h2>
          <p className="text-sm text-foreground-500 mt-1">Créez, éditez et générez des thèmes avec l'IA</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/superadmin/themes/generate')}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent-500 text-background-50 dark:text-foreground-950 rounded-full text-sm font-medium whitespace-nowrap hover:bg-accent-600 transition-colors cursor-pointer"
          >
            <i className="ri-magic-line"></i>
            Générer un thème
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-background-100 border border-background-200/70 text-foreground-700 rounded-full text-sm font-medium whitespace-nowrap hover:bg-background-200/70 hover:text-foreground-900 transition-colors cursor-pointer"
          >
            <i className="ri-upload-cloud-line"></i>
            Importer un thème
          </button>
          <button
            onClick={() => setShowConvertModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-background-100 border border-background-200/70 text-foreground-700 rounded-full text-sm font-medium whitespace-nowrap hover:bg-background-200/70 hover:text-foreground-900 transition-colors cursor-pointer"
          >
            <i className="ri-code-s-slash-line"></i>
            Convertir un thème
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-foreground-950 text-background-50 rounded-full text-sm font-medium whitespace-nowrap hover:bg-foreground-800 transition-colors cursor-pointer"
          >
            <i className="ri-add-line"></i>
            Nouveau thème
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 bg-background-100 rounded-full p-0.5 w-fit mb-6">
        {[
          { key: 'all', label: 'Tous' },
          { key: 'active', label: 'Actifs' },
          { key: 'draft', label: 'Brouillons' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === tab.key ? 'bg-background-50 text-foreground-900 shadow-sm' : 'text-foreground-500 hover:text-foreground-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Themes Grid */}
      {filteredThemes.length === 0 ? (
        <div className="text-center py-16">
          <i className="ri-palette-line text-4xl text-foreground-300 mb-3 block"></i>
          <p className="text-foreground-500 text-sm">Aucun thème trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredThemes.map((theme) => (
            <div
              key={theme.id}
              className="bg-background-50 border border-background-200/70 rounded-lg overflow-hidden hover:border-background-300/60 transition-colors group"
            >
              <div className="aspect-[16/10] bg-background-100 flex items-center justify-center relative">
                {theme.imagecouverture ? (
                  <img src={theme.imagecouverture} alt={theme.titre || ''} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <i className="ri-palette-line text-3xl text-foreground-300"></i>
                    <span className="text-xs text-foreground-400">Aperçu</span>
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1.5">
                  <button
                    onClick={() => duplicateTheme(theme)}
                    className="w-7 h-7 rounded-md bg-background-50/90 flex items-center justify-center hover:bg-background-50 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                    title="Dupliquer"
                  >
                    <i className="ri-file-copy-line text-xs text-foreground-600"></i>
                  </button>
                  <button
                    onClick={() => openEditor(theme)}
                    className="w-7 h-7 rounded-md bg-background-50/90 flex items-center justify-center hover:bg-background-50 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                    title="Éditer"
                  >
                    <i className="ri-edit-line text-xs text-foreground-600"></i>
                  </button>
                  <button
                    onClick={() => toggleActive(theme)}
                    className={`w-7 h-7 rounded-md bg-background-50/90 flex items-center justify-center hover:bg-background-50 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 ${
                      theme.active === 1 ? 'text-accent-600' : 'text-foreground-400'
                    }`}
                    title={theme.active === 1 ? 'Désactiver' : 'Activer'}
                  >
                    <i className="ri-toggle-line text-xs"></i>
                  </button>
                  <button
                    onClick={() => handleDeleteTheme(theme)}
                    className="w-7 h-7 rounded-md bg-background-50/90 flex items-center justify-center hover:bg-red-50 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                    title="Supprimer"
                  >
                    <i className="ri-delete-bin-line text-xs text-red-500"></i>
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-semibold text-foreground-900 truncate">{theme.titre || 'Sans nom'}</h4>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${theme.active === 1 ? 'bg-accent-500' : 'bg-foreground-300'}`}></span>
                </div>
                <p className="text-xs text-foreground-500 line-clamp-2 mb-3">{theme.description || 'Aucune description'}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-foreground-400 bg-background-100 px-2 py-0.5 rounded-full">
                    {getCategoryName(theme.typetheme)}
                  </span>
                  <span className={`text-[11px] font-medium ${theme.active === 1 ? 'text-accent-600' : 'text-foreground-500'}`}>
                    v{theme.version || '1.0'}
                  </span>
                </div>
                <button
                  onClick={() => handleExportTheme(theme)}
                  className="w-full mt-3 h-8 rounded-md bg-background-100 hover:bg-background-200/70 border border-background-200/70 flex items-center justify-center gap-1.5 text-[11px] font-medium text-foreground-600 hover:text-foreground-800 transition-colors cursor-pointer"
                >
                  <i className="ri-download-2-line text-xs"></i>
                  Exporter ZIP
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========== EDITOR OVERLAY ========== */}
      {editingTheme && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={closeEditor} />

          <div className="fixed inset-0 z-50 flex justify-center">
            <div className="w-full max-w-5xl bg-background-50 border border-background-200/70 flex flex-col h-full overflow-hidden shadow-xl">
              {/* Top bar */}
              <div className="flex items-center justify-between px-5 h-14 border-b border-background-200/70 flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <i className="ri-edit-line text-sm text-foreground-500 flex-shrink-0"></i>
                  <span className="text-sm font-semibold text-foreground-900 truncate">
                    Éditer : {formTitre || 'Sans nom'}
                  </span>
                </div>
                <button
                  onClick={closeEditor}
                  className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-background-100 transition-colors cursor-pointer flex-shrink-0"
                >
                  <i className="ri-close-line text-foreground-500"></i>
                </button>
              </div>

              {/* Tab bar */}
              <div className="flex items-center bg-background-100 border-b border-background-200/70 flex-shrink-0 overflow-x-auto">
                <button
                  onClick={() => setEditorTab('params')}
                  className={`flex-1 py-2.5 text-xs font-semibold tracking-wide uppercase whitespace-nowrap transition-colors cursor-pointer ${
                    editorTab === 'params'
                      ? 'text-foreground-950 border-b-2 border-foreground-950 bg-background-50'
                      : 'text-foreground-500 hover:text-foreground-700'
                  }`}
                >
                  <i className="ri-settings-3-line mr-1.5"></i>
                  Paramètres
                </button>
                <button
                  onClick={() => setEditorTab('pages')}
                  className={`flex-1 py-2.5 text-xs font-semibold tracking-wide uppercase whitespace-nowrap transition-colors cursor-pointer ${
                    editorTab === 'pages'
                      ? 'text-foreground-950 border-b-2 border-foreground-950 bg-background-50'
                      : 'text-foreground-500 hover:text-foreground-700'
                  }`}
                >
                  <i className="ri-stack-line mr-1.5"></i>
                  Pages ({themePages.length})
                </button>
                <button
                  onClick={() => setEditorTab('preview')}
                  className={`flex-1 py-2.5 text-xs font-semibold tracking-wide uppercase whitespace-nowrap transition-colors cursor-pointer ${
                    editorTab === 'preview'
                      ? 'text-foreground-950 border-b-2 border-foreground-950 bg-background-50'
                      : 'text-foreground-500 hover:text-foreground-700'
                  }`}
                >
                  <i className="ri-eye-line mr-1.5"></i>
                  Aperçu
                </button>
                <button
                  onClick={() => setEditorTab('versions')}
                  className={`flex-1 py-2.5 text-xs font-semibold tracking-wide uppercase whitespace-nowrap transition-colors cursor-pointer ${
                    editorTab === 'versions'
                      ? 'text-foreground-950 border-b-2 border-foreground-950 bg-background-50'
                      : 'text-foreground-500 hover:text-foreground-700'
                  }`}
                >
                  <i className="ri-history-line mr-1.5"></i>
                  Versions
                </button>
                <button
                  onClick={() => { setEditorTab('ai'); fetchApiKeys(); }}
                  className={`flex-1 py-2.5 text-xs font-semibold tracking-wide uppercase whitespace-nowrap transition-colors cursor-pointer ${
                    editorTab === 'ai'
                      ? 'text-foreground-950 border-b-2 border-foreground-950 bg-background-50'
                      : 'text-foreground-500 hover:text-foreground-700'
                  }`}
                >
                  <i className="ri-robot-line mr-1.5"></i>
                  IA Générer
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-hidden">
                {editorTab === 'params' ? (
                  /* ===== PARAMS TAB ===== */
                  <div className="overflow-y-auto h-full p-5 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Nom du thème</label>
                        <input
                          type="text"
                          value={formTitre}
                          onChange={(e) => setFormTitre(e.target.value)}
                          className="w-full h-10 px-3 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Description</label>
                        <input
                          type="text"
                          value={formDescription}
                          onChange={(e) => setFormDescription(e.target.value)}
                          className="w-full h-10 px-3 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Catégorie</label>
                        <select
                          value={formCategory}
                          onChange={(e) => setFormCategory(e.target.value)}
                          className="w-full h-10 px-3 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={String(c.id)}>{c.titre}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Version</label>
                        <input
                          type="text"
                          value={formVersion}
                          onChange={(e) => setFormVersion(e.target.value)}
                          className="w-full h-10 px-3 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Prix (0 = gratuit)</label>
                        <input
                          type="text"
                          value={formPrix}
                          onChange={(e) => setFormPrix(e.target.value)}
                          className="w-full h-10 px-3 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-foreground-600">Feuille de style CSS</label>
                        <span className="text-[10px] text-foreground-400 font-mono bg-background-100 px-1.5 py-0.5 rounded">
                          {formStylesheet.length} car.
                        </span>
                      </div>
                      <textarea
                        value={formStylesheet}
                        onChange={(e) => setFormStylesheet(e.target.value)}
                        rows={14}
                        spellCheck={false}
                        className="w-full px-3 py-2 rounded-md border border-background-200/70 bg-background-100 text-xs text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300 resize-none font-mono leading-relaxed"
                        style={{ tabSize: 2 }}
                      />
                    </div>

                    {/* ===== Contenu du menu (sitewebthemecontenu) ===== */}
                    <div className="p-4 rounded-lg border border-foreground-300/60 bg-background-100/50">
                      <div className="flex items-center gap-2 mb-3">
                        <i className="ri-menu-line text-foreground-600"></i>
                        <span className="text-xs font-semibold text-foreground-700 uppercase tracking-wider">Contenu du menu</span>
                        <span className="text-[10px] text-foreground-400">(sitewebthemecontenu)</span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-foreground-600 mb-1">Titre du menu de navigation</label>
                          <input
                            type="text"
                            value={themeContenu?.titrenavmenudefaut || ''}
                            onChange={(e) => setThemeContenu(prev => prev ? { ...prev, titrenavmenudefaut: e.target.value } : null)}
                            placeholder="Accueil | Services | À propos | Contact"
                            className="w-full h-10 px-3 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-foreground-600 mb-1">Description du menu</label>
                          <input
                            type="text"
                            value={themeContenu?.descriptionnavmenudefault || ''}
                            onChange={(e) => setThemeContenu(prev => prev ? { ...prev, descriptionnavmenudefault: e.target.value } : null)}
                            className="w-full h-10 px-3 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
                          />
                        </div>
                        <div>
                          <ThemeImageField
                            label="Image bannière navigation"
                            value={themeContenu?.imagebannierenavmenudefault || ''}
                            onChange={(url) => setThemeContenu(prev => prev ? { ...prev, imagebannierenavmenudefault: url } : null)}
                            placeholder="https://..."
                            folder="theme-images"
                          />
                        </div>
                      </div>
                    </div>

                    {/* ===== Paramètres du thème (sitewebthemeparamettre) ===== */}
                    <div className="p-4 rounded-lg border border-foreground-300/60 bg-background-100/50">
                      <div className="flex items-center gap-2 mb-3">
                        <i className="ri-settings-3-line text-foreground-600"></i>
                        <span className="text-xs font-semibold text-foreground-700 uppercase tracking-wider">Paramètres du thème</span>
                        <span className="text-[10px] text-foreground-400">(sitewebthemeparamettre)</span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-foreground-600 mb-1">Titre des paramètres</label>
                          <input
                            type="text"
                            value={themeParamettre?.titre || ''}
                            onChange={(e) => setThemeParamettre(prev => prev ? { ...prev, titre: e.target.value } : null)}
                            className="w-full h-10 px-3 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-foreground-600 mb-1">Description bannière</label>
                          <textarea
                            value={themeParamettre?.descriptionbanniere || ''}
                            onChange={(e) => setThemeParamettre(prev => prev ? { ...prev, descriptionbanniere: e.target.value } : null)}
                            rows={2}
                            className="w-full px-3 py-2 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300 resize-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <ThemeImageField
                            label="Image À propos"
                            value={themeParamettre?.imageaboutus || ''}
                            onChange={(url) => setThemeParamettre(prev => prev ? { ...prev, imageaboutus: url } : null)}
                            placeholder="https://..."
                            folder="theme-images"
                          />
                          <div>
                            <label className="block text-xs font-semibold text-foreground-600 mb-1">Titre bloc découverte</label>
                            <input
                              type="text"
                              value={themeParamettre?.titreblocdecouvert || ''}
                              onChange={(e) => setThemeParamettre(prev => prev ? { ...prev, titreblocdecouvert: e.target.value } : null)}
                              className="w-full h-10 px-3 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-foreground-600 mb-1">Description bloc découverte</label>
                          <textarea
                            value={themeParamettre?.descriptionblocdecouvert || ''}
                            onChange={(e) => setThemeParamettre(prev => prev ? { ...prev, descriptionblocdecouvert: e.target.value } : null)}
                            rows={2}
                            className="w-full px-3 py-2 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300 resize-none"
                          />
                        </div>
                        <div>
                          <ThemeImageField
                            label="Fichier bloc découverte"
                            value={themeParamettre?.fichierblocdecouvert || ''}
                            onChange={(url) => setThemeParamettre(prev => prev ? { ...prev, fichierblocdecouvert: url } : null)}
                            placeholder="https://..."
                            folder="theme-images"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Save contenu + paramettre */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSaveContenuParamettre}
                        disabled={savingContenu || !themeContenu || !themeParamettre}
                        className="flex-1 h-11 bg-secondary-500 text-background-50 rounded-full text-sm font-semibold whitespace-nowrap hover:bg-secondary-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {savingContenu ? (
                          <><i className="ri-loader-4-line animate-spin text-xs"></i>Sauvegarde...</>
                        ) : contenuSaved ? (
                          <><i className="ri-check-line"></i>Sauvegardé !</>
                        ) : (
                          <><i className="ri-save-line"></i>Enregistrer contenu & paramètres</>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSaveTheme}
                        disabled={savingTheme || !formTitre.trim()}
                        className="flex-1 h-11 bg-foreground-950 text-background-50 rounded-full text-sm font-semibold whitespace-nowrap hover:bg-foreground-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {savingTheme ? (
                          <><i className="ri-loader-4-line animate-spin text-xs"></i>Sauvegarde...</>
                        ) : themeSaved ? (
                          <><i className="ri-check-line"></i>Sauvegardé !</>
                        ) : (
                          <><i className="ri-save-line"></i>Enregistrer les paramètres</>
                        )}
                      </button>

                      <div className="flex items-center gap-2 px-3 py-2 bg-background-100 rounded-lg">
                        <span className="text-xs text-foreground-500">Statut :</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${editingTheme.active === 1 ? 'bg-accent-100 text-accent-700' : 'bg-foreground-100 text-foreground-500'}`}>
                          {editingTheme.active === 1 ? 'Actif' : 'Brouillon'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : editorTab === 'pages' ? (
                  /* ===== PAGES TAB ===== */
                  <div className="flex h-full">
                    {/* Page list sidebar */}
                    <div className="w-[200px] border-r border-background-200/70 bg-background-100/50 overflow-y-auto flex-shrink-0">
                      <div className="p-2">
                        <div className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold px-2 py-1.5">
                          Pages du thème
                        </div>
                        {PAGE_DEFS.map((def) => {
                          const exists = themePages.some((p) => p.page_key === def.key && p.content);
                          const isSelected = selectedPageKey === def.key;
                          return (
                            <button
                              key={def.key}
                              onClick={() => selectPage(def.key)}
                              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors cursor-pointer mb-0.5 ${
                                isSelected
                                  ? 'bg-foreground-950 text-background-50'
                                  : 'text-foreground-600 hover:bg-background-100 hover:text-foreground-900'
                              }`}
                            >
                              <i className={`${def.icon} text-sm flex-shrink-0`}></i>
                              <span className="truncate">{def.label}</span>
                              {exists && !isSelected && (
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-400 flex-shrink-0 ml-auto" title="Page avec contenu"></span>
                              )}
                              {!exists && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 ml-auto" title="Page vide"></span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Page editor */}
                    <div className="flex-1 overflow-y-auto p-5">
                      {selectedPageKey ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <i className={`${getPageIcon(selectedPageKey)} text-foreground-500`}></i>
                              <span className="text-sm font-semibold text-foreground-900">{getPageLabel(selectedPageKey)}</span>
                            </div>
                            {pageDirty && (
                              <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Non sauvegardé</span>
                            )}
                          </div>

                          <p className="text-xs text-foreground-400 bg-background-100 px-3 py-2 rounded-md">
                            {getPageDesc(selectedPageKey)}
                          </p>

                          <div>
                            <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Titre de la page</label>
                            <input
                              type="text"
                              value={pageTitle}
                              onChange={(e) => { setPageTitle(e.target.value); setPageDirty(true); }}
                              className="w-full h-10 px-3 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-xs font-semibold text-foreground-600">Contenu HTML</label>
                              <span className="text-[10px] text-foreground-400 font-mono bg-background-100 px-1.5 py-0.5 rounded">
                                {pageContent.length} car.
                              </span>
                            </div>
                            <textarea
                              value={pageContent}
                              onChange={(e) => { setPageContent(e.target.value); setPageDirty(true); }}
                              rows={20}
                              spellCheck={false}
                              className="w-full px-3 py-2 rounded-md border border-background-200/70 bg-background-100 text-xs text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300 resize-none font-mono leading-relaxed"
                              style={{ tabSize: 2 }}
                              placeholder="<section>...</section>"
                            />
                          </div>

                          <button
                            onClick={handleSavePage}
                            disabled={savingPage || !selectedPageKey}
                            className="w-full h-11 bg-foreground-950 text-background-50 rounded-full text-sm font-semibold whitespace-nowrap hover:bg-foreground-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {savingPage ? (
                              <><i className="ri-loader-4-line animate-spin text-xs"></i>Sauvegarde...</>
                            ) : pageSaved ? (
                              <><i className="ri-check-line"></i>Page sauvegardée !</>
                            ) : (
                              <><i className="ri-save-line"></i>Enregistrer la page</>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center">
                            <i className="ri-file-list-3-line text-3xl text-foreground-300 mb-2 block"></i>
                            <p className="text-xs text-foreground-500">Sélectionnez une page à gauche</p>
                            <p className="text-[10px] text-foreground-400 mt-1">pour éditer son contenu</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : editorTab === 'preview' ? (
                  /* ===== PREVIEW TAB ===== */
                  <LivePreviewPanel
                    stylesheet={formStylesheet}
                    pages={themePages}
                    pageDefs={PAGE_DEFS}
                  />
                ) : editorTab === 'versions' ? (
                  /* ===== VERSIONS TAB ===== */
                  <VersionHistory
                    key={versionRestoreKey}
                    themeId={editingTheme.id}
                    currentStylesheet={formStylesheet}
                    currentPages={themePages.map((p) => ({ page_key: p.page_key, title: p.title, content: p.content }))}
                    onRestoreVersion={handleRestoreVersion}
                  />
                ) : (
                  /* ===== AI TAB ===== */
                  <div className="flex h-full">
                    {/* Left: Chat */}
                    <div className="flex-1 flex flex-col min-w-0 border-r border-background-200/70">
                      {/* Provider selector */}
                      <div className="px-4 py-3 border-b border-background-200/70 bg-background-100/50 flex-shrink-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-[11px] font-semibold text-foreground-500 uppercase tracking-wider">Provider</span>
                          {AI_PROVIDERS.map((prov) => {
                            const hasKey = prov.id === 'ollama' || !!apiKeys[prov.id as keyof ApiKeys];
                            return (
                              <button
                                key={prov.id}
                                onClick={() => {
                                  setAiProviderId(prov.id);
                                  setAiModel(prov.defaultModel);
                                }}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                                  aiProviderId === prov.id
                                    ? 'bg-foreground-950 text-background-50'
                                    : 'bg-background-50 text-foreground-600 hover:text-foreground-900 border border-background-200/70'
                                }`}
                              >
                                <i className={`${prov.icon} text-sm`}></i>
                                {prov.name}
                                {!hasKey && <span className="w-1 h-1 rounded-full bg-amber-400" title="Clé API non configurée"></span>}
                              </button>
                            );
                          })}
                        </div>

                        {/* Model selector */}
                        {currentProvider && currentProvider.models.length > 1 && (
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="text-[10px] text-foreground-400">Modèle :</span>
                            {currentProvider.models.map((m) => (
                              <button
                                key={m}
                                onClick={() => setAiModel(m)}
                                className={`px-2 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                                  aiModel === m
                                    ? 'bg-background-50 text-foreground-900 border border-background-200/70'
                                    : 'text-foreground-500 hover:text-foreground-700'
                                }`}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Custom Instructions — always visible */}
                        <div className="mt-3">
                          <textarea
                            value={customInstructions}
                            onChange={(e) => {
                              setCustomInstructions(e.target.value);
                              try { localStorage.setItem('theme-builder-instructions', e.target.value); } catch { /* */ }
                            }}
                            placeholder="Exemples d'instructions :&#10;- Utilise un design dark mode avec accent vert forêt&#10;- Style minimaliste japonais, beaucoup de whitespace&#10;- Layout asymétrique, typographie bold et moderne&#10;- Palette : noir profond, or, crème&#10;- Hero fullscreen avec image de fond&#10;- Pas de cartes, utilise des listes alternées"
                            rows={4}
                            className="w-full px-3 py-2 rounded-md border border-background-200/70 bg-background-50 text-xs text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:border-accent-300 focus:ring-1 focus:ring-accent-300 resize-none font-sans leading-relaxed"
                          />
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-[10px] text-foreground-400">
                              Ces directives seront ajoutées en tête du prompt système. Elles dictent le design, l&apos;UX et la structure à l&apos;IA.
                            </p>
                            {customInstructions.trim() && (
                              <button
                                onClick={() => {
                                  setCustomInstructions('');
                                  try { localStorage.removeItem('theme-builder-instructions'); } catch { /* */ }
                                }}
                                className="text-[10px] text-red-500 hover:text-red-600 font-medium whitespace-nowrap cursor-pointer px-2 py-0.5"
                              >
                                Effacer
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {aiMessages.length === 0 ? (
                          <div className="h-full flex items-center justify-center">
                            <div className="text-center max-w-sm">
                              <div className="w-12 h-12 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-3">
                                <i className="ri-robot-line text-xl text-foreground-400"></i>
                              </div>
                              <p className="text-sm text-foreground-700 font-medium mb-1">Génération IA de thème</p>
                              <p className="text-xs text-foreground-400 leading-relaxed">
                                Décris le site que tu veux créer et l&apos;IA générera automatiquement le CSS et le contenu de toutes les pages.
                              </p>
                              <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
                                {[
                                  'Un site vitrine premium pour un restaurant italien gastronomique',
                                  'Une boutique e-commerce de vêtements minimalistes',
                                  'Un site pour un hôtel de luxe avec réservation en ligne',
                                  'Un portfolio pour photographe avec galerie élégante',
                                  'Un site corporate pour une agence de design',
                                ].map((ex) => (
                                  <button
                                    key={ex}
                                    onClick={() => setAiPrompt(ex)}
                                    className="text-[10px] px-2.5 py-1.5 rounded-full bg-background-100 text-foreground-600 hover:bg-background-200/70 hover:text-foreground-900 transition-colors cursor-pointer whitespace-nowrap"
                                  >
                                    {ex}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          aiMessages.map((msg, i) => (
                            <div
                              key={i}
                              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                                  msg.role === 'user'
                                    ? 'bg-foreground-950 text-background-50'
                                    : 'bg-background-100 text-foreground-800 border border-background-200/70'
                                }`}
                              >
                                {msg.content}
                              </div>
                            </div>
                          ))
                        )}

                        {aiGenerating && (
                          <div className="flex justify-start">
                            <div className="bg-background-100 border border-background-200/70 rounded-lg px-4 py-3 flex items-center gap-2">
                              <i className="ri-loader-4-line animate-spin text-foreground-500"></i>
                              <span className="text-xs text-foreground-500">{aiProgress}</span>
                            </div>
                          </div>
                        )}

                        {aiError && !aiGenerating && (
                          <div className="flex justify-start">
                            <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-xs text-red-700 max-w-[85%]">
                              {aiError}
                            </div>
                          </div>
                        )}

                        {/* Generated theme preview */}
                        {aiGeneratedTheme && (
                          <div className="flex justify-start">
                            <div className="bg-accent-50 border border-accent-100 rounded-lg px-4 py-3 w-full">
                              <div className="flex items-center gap-2 mb-3">
                                <i className="ri-robot-line text-accent-600"></i>
                                <span className="text-sm font-semibold text-accent-800">Thème généré</span>
                              </div>
                              <div className="grid grid-cols-4 gap-2 mb-3">
                                <div className="bg-white rounded-md p-2 text-center">
                                  <div className="text-lg font-bold text-foreground-900">{Object.keys(aiGeneratedTheme.pages).length}</div>
                                  <div className="text-[10px] text-foreground-500">pages</div>
                                </div>
                                <div className="bg-white rounded-md p-2 text-center">
                                  <div className="text-lg font-bold text-foreground-900">{aiGeneratedTheme.stylesheet.length.toLocaleString()}</div>
                                  <div className="text-[10px] text-foreground-500">car. CSS</div>
                                </div>
                                <div className="bg-white rounded-md p-2 text-center">
                                  <div className="text-lg font-bold text-foreground-900">
                                    {Object.values(aiGeneratedTheme.pages).reduce((sum, p) => sum + p.content.length, 0).toLocaleString()}
                                  </div>
                                  <div className="text-[10px] text-foreground-500">car. HTML</div>
                                </div>
                                <div className="bg-white rounded-md p-2 text-center">
                                  <div className="text-lg font-bold text-accent-600">{currentProvider?.name || 'IA'}</div>
                                  <div className="text-[10px] text-foreground-500">généré par</div>
                                </div>
                              </div>
                              <button
                                onClick={handleApplyGeneratedTheme}
                                disabled={!!aiProgress}
                                className="w-full h-10 bg-accent-600 text-background-50 rounded-full text-sm font-semibold whitespace-nowrap hover:bg-accent-700 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                              >
                                {aiProgress ? (
                                  <><i className="ri-loader-4-line animate-spin text-xs"></i>{aiProgress}</>
                                ) : (
                                  <><i className="ri-check-line"></i>Appliquer le thème généré</>
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        <div ref={chatEndRef} />
                      </div>

                      {/* Input */}
                      <div className="p-4 border-t border-background-200/70 flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <textarea
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAiGenerate();
                              }
                            }}
                            placeholder="Décris le site que tu veux créer... (ex: je veux un site pour un restaurant italien avec menu en ligne et réservation)"
                            rows={2}
                            disabled={aiGenerating}
                            className="flex-1 px-3 py-2 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300 resize-none disabled:opacity-50"
                          />
                          <button
                            onClick={handleAiGenerate}
                            disabled={aiGenerating || !aiPrompt.trim()}
                            className="h-10 w-10 flex-shrink-0 rounded-full bg-foreground-950 text-background-50 flex items-center justify-center hover:bg-foreground-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {aiGenerating ? (
                              <i className="ri-loader-4-line animate-spin text-sm"></i>
                            ) : (
                              <i className="ri-send-plane-fill text-sm"></i>
                            )}
                          </button>
                        </div>
                        <p className="text-[10px] text-foreground-400 mt-2 text-center">
                          Entrée pour envoyer &bull; L&apos;IA va générer le CSS complet + le contenu des {PAGE_DEFS.length} pages
                        </p>
                      </div>
                    </div>

                    {/* Right: Page descriptions */}
                    <div className="w-[220px] bg-background-100/30 overflow-y-auto flex-shrink-0 p-3 hidden xl:block">
                      {customInstructions.trim() && (
                        <div className="mb-3 px-2 py-2 rounded-md bg-accent-50 border border-accent-100">
                          <div className="flex items-center gap-1.5 mb-1">
                            <i className="ri-settings-3-line text-[10px] text-accent-600"></i>
                            <span className="text-[10px] font-semibold text-accent-700 uppercase tracking-wider">Directives actives</span>
                          </div>
                          <p className="text-[10px] text-accent-600 leading-relaxed line-clamp-3">
                            {customInstructions.slice(0, 120)}{customInstructions.length > 120 ? '...' : ''}
                          </p>
                        </div>
                      )}
                      <div className="text-[10px] uppercase tracking-wider text-foreground-400 font-semibold mb-2 px-1">
                        Pages qui seront générées
                      </div>
                      {PAGE_DEFS.map((def) => (
                        <div key={def.key} className="px-2 py-1.5 mb-1 rounded-md hover:bg-background-100/50 transition-colors">
                          <div className="flex items-center gap-1.5">
                            <i className={`${def.icon} text-xs text-foreground-400`}></i>
                            <span className="text-[11px] text-foreground-700 font-medium whitespace-nowrap truncate">{def.label}</span>
                          </div>
                          <p className="text-[10px] text-foreground-400 mt-0.5 ml-5 line-clamp-2">{def.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTheme && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setDeletingTheme(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-background-50 rounded-lg border border-background-200/70 p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <i className="ri-error-warning-line text-red-500 text-lg"></i>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground-950">Supprimer le thème ?</h3>
                <p className="text-xs text-foreground-500 mt-0.5">Cette action est irréversible.</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-md px-3 py-2.5 mb-4">
              <p className="text-xs text-red-700">
                <strong>{deletingTheme.titre || 'Sans nom'}</strong> sera définitivement supprimé, ainsi que toutes ses pages, son contenu de menu et ses paramètres.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeletingTheme(null)}
                className="px-4 py-2 rounded-full text-sm font-medium text-foreground-600 hover:text-foreground-800 transition-colors cursor-pointer whitespace-nowrap"
              >
                Annuler
              </button>
              <button
                onClick={confirmDeleteTheme}
                className="px-5 py-2 rounded-full text-sm font-semibold bg-red-500 text-white whitespace-nowrap hover:bg-red-600 transition-colors cursor-pointer flex items-center gap-2"
              >
                <i className="ri-delete-bin-line"></i>
                Supprimer
              </button>
            </div>
          </div>
        </>
      )}

      {/* Import Theme Modal */}
      {showImportModal && (
        <ImportThemeModal
          categories={categories}
          onClose={() => setShowImportModal(false)}
          onImported={fetchThemes}
          userIdcommerce={userIdcommerce}
          userId={user?.id ? parseInt(String(user.id), 10) : null}
        />
      )}

      {/* Convert Theme Modal (PHP -> Zifek) */}
      {showConvertModal && (
        <ConvertThemeModal
          categories={categories}
          onClose={() => setShowConvertModal(false)}
          onImported={fetchThemes}
          userIdcommerce={userIdcommerce}
          userId={user?.id ? parseInt(String(user.id), 10) : null}
        />
      )}

      {/* New Theme Modal */}
      {showNewModal && (
        <NewThemeModal
          categories={categories}
          onClose={() => setShowNewModal(false)}
          onCreate={handleCreateTheme}
        />
      )}
    </div>
  );
}

// ============ NEW THEME MODAL ============
function NewThemeModal({ categories, onClose, onCreate }: {
  categories: ThemeCategory[];
  onClose: () => void;
  onCreate: (name: string, desc: string, categoryId: string, imageCouverture: string) => Promise<boolean>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState(categories.length > 0 ? String(categories[0].id) : '');
  const [imageCouverture, setImageCouverture] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [imageTab, setImageTab] = useState<'url' | 'upload'>('url');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setUploadProgress('Upload en cours...');
    setUploading(true);

    try {
      const url = await uploadMediaFile(file, 'theme-covers');
      setImageCouverture(url);
      setUploadProgress('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur upload';
      setUploadError(msg);
      setImageCouverture('');
    } finally {
      setUploading(false);
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const success = await onCreate(name.trim(), desc.trim(), category, imageCouverture.trim());
      if (!success) {
        setError("Erreur lors de la création du thème. Vérifie la console pour plus de détails.");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50" onClick={saving ? undefined : onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-background-50 rounded-lg border border-background-200/70 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-foreground-950">Nouveau thème</h3>
          <button
            onClick={onClose}
            disabled={saving}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-background-100 transition-colors cursor-pointer disabled:opacity-40"
          >
            <i className="ri-close-line text-foreground-500"></i>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground-600 mb-1.5">
              Nom du thème <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="Mon super thème"
              autoFocus
              className="w-full h-10 px-3 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Description</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Description du thème..."
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground-600 mb-1.5">Catégorie</label>
            {categories.length > 0 ? (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-background-200/70 bg-background-50 text-sm text-foreground-950 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
              >
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.titre}</option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-background-200/70 bg-background-100 text-xs text-foreground-400">
                <i className="ri-loader-4-line animate-spin"></i>
                Chargement des catégories...
              </div>
            )}
          </div>

          {/* Image de couverture */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-foreground-600">Image de couverture</label>
              {!showImageInput && (
                <button
                  onClick={() => setShowImageInput(true)}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-add-line mr-1"></i>Ajouter
                </button>
              )}
            </div>

            {showImageInput ? (
              <div className="space-y-3">
                {/* Tab switcher */}
                <div className="flex items-center bg-background-100 rounded-full p-0.5 w-fit">
                  <button
                    onClick={() => { setImageTab('url'); setUploadError(''); }}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      imageTab === 'url'
                        ? 'bg-background-50 text-foreground-900 shadow-sm'
                        : 'text-foreground-500 hover:text-foreground-700'
                    }`}
                  >
                    <i className="ri-link mr-1"></i>URL
                  </button>
                  <button
                    onClick={() => { setImageTab('upload'); setUploadError(''); }}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      imageTab === 'upload'
                        ? 'bg-background-50 text-foreground-900 shadow-sm'
                        : 'text-foreground-500 hover:text-foreground-700'
                    }`}
                  >
                    <i className="ri-upload-cloud-line mr-1"></i>Upload
                  </button>
                </div>

                {imageTab === 'url' ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={imageCouverture}
                      onChange={(e) => setImageCouverture(e.target.value)}
                      placeholder="https://... ou colle l'URL de l'image"
                      className="flex-1 h-10 px-3 rounded-md border border-background-200/70 bg-background-50 text-xs text-foreground-950 font-mono placeholder:text-foreground-400 focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300"
                    />
                    <button
                      onClick={() => { setShowImageInput(false); setImageCouverture(''); setUploadError(''); }}
                      className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-red-50 text-foreground-400 hover:text-red-500 transition-colors cursor-pointer flex-shrink-0"
                    >
                      <i className="ri-close-line"></i>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex-1 h-10 rounded-md border border-dashed border-background-300/60 bg-background-100/50 flex items-center justify-center gap-2 text-xs font-medium text-foreground-600 hover:text-foreground-800 hover:border-foreground-300/60 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploading ? (
                          <>
                            <i className="ri-loader-4-line animate-spin"></i>
                            {uploadProgress}
                          </>
                        ) : imageCouverture ? (
                          <>
                            <i className="ri-check-line text-accent-500"></i>
                            Image uploadée
                          </>
                        ) : (
                          <>
                            <i className="ri-upload-cloud-line"></i>
                            Choisir un fichier (max 1 Mo)
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => { setShowImageInput(false); setImageCouverture(''); setUploadError(''); }}
                        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-red-50 text-foreground-400 hover:text-red-500 transition-colors cursor-pointer flex-shrink-0"
                      >
                        <i className="ri-close-line"></i>
                      </button>
                    </div>
                    {uploadError && (
                      <div className="flex items-center gap-1.5 text-[11px] text-red-600">
                        <i className="ri-error-warning-line text-xs"></i>
                        {uploadError}
                      </div>
                    )}
                    <p className="text-[10px] text-foreground-400">
                      Formats acceptés : JPG, PNG, WebP, GIF — 1 Mo max. Stocké sur Supabase Storage.
                    </p>
                  </div>
                )}

                {/* Preview */}
                {imageCouverture && (
                  <div className="relative rounded-md overflow-hidden bg-background-100 border border-background-200/70 h-32">
                    <img
                      src={imageCouverture}
                      alt="Aperçu couverture"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="h-10 px-3 rounded-md border border-dashed border-background-200/70 bg-background-100/50 flex items-center">
                <span className="text-xs text-foreground-400">Aucune image de couverture</span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 px-3 py-2.5 rounded-md bg-red-50 border border-red-100 flex items-start gap-2">
            <i className="ri-error-warning-line text-red-500 text-sm flex-shrink-0 mt-0.5"></i>
            <span className="text-xs text-red-700">{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 mt-5">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-full text-sm font-medium text-foreground-600 hover:text-foreground-800 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40"
          >
            Annuler
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !name.trim() || (categories.length > 0 && !category)}
            className="px-5 py-2 rounded-full text-sm font-semibold bg-foreground-950 text-background-50 whitespace-nowrap hover:bg-foreground-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <i className="ri-loader-4-line animate-spin text-xs"></i>
                Création...
              </>
            ) : (
              <>
                <i className="ri-add-line"></i>
                Créer le thème
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}