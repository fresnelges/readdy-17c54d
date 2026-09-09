// ============ DEFAULT PAGE CONTENT DISPATCHER ============
// Maps page keys to their template content.
// Templates are kept in separate modules because they're large.

import {
  headTemplate,
  headerTemplate,
  navmenuTemplate,
  footerTemplate,
} from './defaultPageContentLayout';

import {
  homeTemplate,
  produitsTemplate,
  serviceTemplate,
  aproposTemplate,
  blogTemplate,
  contactTemplate,
  bookingTemplate,
  bookingsuccessTemplate,
  faqTemplate,
  galleryTemplate,
  equipeTemplate,
  partenairesTemplate,
  projectTemplate,
  detailsproduitTemplate,
  detailsserviceTemplate,
  detailsblogTemplate,
  detailsproduitsTemplate,
} from './defaultPageContentCore';

import {
  connexionTemplate,
  creationcompteTemplate,
  recuperationTemplate,
  resetpasswordTemplate,
  loginTemplate,
  conditionsdutilisationTemplate,
  politiqueTemplate,
  retoursTemplate,
  marketplaceTemplate,
  marketplaceSellerTemplate,
  marketplaceCustomerTemplate,
  panierTemplate,
  detailsformTemplate,
  fichieraiTemplate,
  workspacepublicTemplate,
  defaultTemplate,
} from './defaultPageContentExtras';

export function getDefaultPageContent(pageKey: string): string {
  switch (pageKey) {
    // Layout
    case 'head': return headTemplate();
    case 'header': return headerTemplate();
    case 'navmenu': return navmenuTemplate();
    case 'footer': return footerTemplate();

    // Core pages
    case 'home': return homeTemplate();
    case 'produits': return produitsTemplate();
    case 'service': return serviceTemplate();
    case 'apropos': return aproposTemplate();
    case 'blog': return blogTemplate();
    case 'contact': return contactTemplate();
    case 'booking': return bookingTemplate();
    case 'bookingsuccess': return bookingsuccessTemplate();
    case 'faq': return faqTemplate();
    case 'gallery': return galleryTemplate();
    case 'equipe': return equipeTemplate();
    case 'partenaires': return partenairesTemplate();
    case 'project': return projectTemplate();

    // Detail pages
    case 'detailsproduit': return detailsproduitTemplate();
    case 'detailsservice': return detailsserviceTemplate();
    case 'detailsblog': return detailsblogTemplate();
    case 'detailsproduits': return detailsproduitsTemplate();

    // Auth pages
    case 'connexion': return connexionTemplate();
    case 'creationcompte': return creationcompteTemplate();
    case 'recuperation': return recuperationTemplate();
    case 'resetpassword': return resetpasswordTemplate();
    case 'login': return loginTemplate();

    // Legal
    case 'conditionsdutilisation': return conditionsdutilisationTemplate();
    case 'politique': return politiqueTemplate();
    case 'retours': return retoursTemplate();

    // Marketplace
    case 'marketplace': return marketplaceTemplate();
    case 'marketplace-seller': return marketplaceSellerTemplate();
    case 'marketplace-customer': return marketplaceCustomerTemplate();

    // Other
    case 'panier': return panierTemplate();
    case 'detailsform': return detailsformTemplate();
    case 'fichierai': return fichieraiTemplate();
    case 'workspacepublic': return workspacepublicTemplate();

    // Generous fallback
    default: return defaultTemplate();
  }
}