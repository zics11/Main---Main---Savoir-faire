import "server-only";

// Freine les essais de mots de passe à répétition sur une même adresse.
// En mémoire : suffisant pour un seul serveur ; remis à zéro au redémarrage.

const MAX_ECHECS = 5;
const FENETRE_MS = 15 * 60 * 1000;

const echecs = new Map<string, { nombre: number; depuis: number }>();

export function estBloque(email: string) {
  const entree = echecs.get(email);
  if (!entree) return false;
  if (Date.now() - entree.depuis > FENETRE_MS) {
    echecs.delete(email);
    return false;
  }
  return entree.nombre >= MAX_ECHECS;
}

export function noterEchec(email: string) {
  const entree = echecs.get(email);
  if (!entree || Date.now() - entree.depuis > FENETRE_MS) {
    echecs.set(email, { nombre: 1, depuis: Date.now() });
  } else {
    entree.nombre += 1;
  }
}

export function effacerEchecs(email: string) {
  echecs.delete(email);
}
