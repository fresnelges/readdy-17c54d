import type { ZifekUser } from '@/hooks/useAuth';

/**
 * Identifiant du créateur du contenu (la personne connectée qui ajoute).
 */
export function getOwnerId(user: ZifekUser | null | undefined): number | null {
  return user?.id ?? null;
}

/**
 * Identifiant de la boutique / commerce auquel le contenu appartient.
 * - Commerçant propriétaire : son propre id.
 * - Membre du staff : l'id du commerçant propriétaire (via users.idcommerce).
 */
export function getCommerceId(user: ZifekUser | null | undefined): number | null {
  if (!user) return null;
  const cid = Number(user.idcommerce) || 0;
  return cid > 0 ? cid : user.id;
}

/**
 * Champs d'appartenance à tamponner à chaque création de contenu.
 */
export function getOwnership(user: ZifekUser | null | undefined): {
  owner: number | null;
  idcommerce: number | null;
} {
  return {
    owner: getOwnerId(user),
    idcommerce: getCommerceId(user),
  };
}