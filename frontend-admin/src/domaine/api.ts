/**
 * Pont vers l'API Django — MADE IN YEUMBEUL NORD
 * ==============================================
 *
 * `source.ts` appelle `depuisApi()` au lieu de lire le générateur local. Aucune
 * signature ne change, donc aucun écran ne bouge : c'est exactement la bascule
 * que décrit `PLAN & PRODUCT/15-CONTRAT-API.md` §12.
 *
 * **Le repli local n'est pas une précaution timide, c'est une exigence.** La
 * démonstration du 31 octobre doit tenir même si l'API n'est pas démarrée, si
 * PostgreSQL est arrêté, ou si le poste est hors ligne. Un appel qui échoue
 * retombe donc sur le jeu à graine fixe, et l'écran s'affiche — avec des
 * données cohérentes, simplement pas celles de la base.
 *
 * Les écrans du back-office sont des composants **serveur** : ces appels
 * partent du serveur Next, pas du navigateur. Il n'y a donc ni CORS ni cookie
 * en jeu ici — la lecture est publique.
 */

/** Vrai lorsque l'API Django est branchée. Aucun écran n'a besoin de le savoir. */
export const API_BRANCHEE = Boolean(process.env.NEXT_PUBLIC_API_URL);

const BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api').replace(/\/$/, '');

/**
 * Au-delà, on considère l'API absente et on sert le jeu local.
 *
 * Court volontairement : un écran qui met huit secondes à venir passe pour
 * cassé en démonstration, alors qu'un écran servi depuis le jeu local passe
 * pour normal.
 */
const DELAI_MAX_MS = 4000;

/** Signale une fois par chemin, pour ne pas noyer la console à chaque rendu. */
const dejaSignales = new Set<string>();

function signaler(chemin: string, cause: unknown): void {
  if (dejaSignales.has(chemin)) return;
  dejaSignales.add(chemin);
  console.warn(
    `[domaine] ${chemin} : l'API n'a pas répondu, repli sur le jeu local.`,
    cause instanceof Error ? cause.message : cause,
  );
}

/**
 * Interroge l'API, ou rend le jeu local si elle ne répond pas.
 *
 * `repli` est une fonction et non une valeur : sans cela, le jeu local serait
 * calculé à chaque appel même quand l'API répond, ce qui reviendrait à générer
 * cent groupements pour les jeter.
 */
export async function depuisApi<T>(
  chemin: string,
  repli: () => T | Promise<T>,
  parametres?: Record<string, unknown>,
): Promise<T> {
  if (!API_BRANCHEE) return repli();

  const url = new URL(BASE + chemin);
  for (const [cle, valeur] of Object.entries(parametres ?? {})) {
    if (valeur === undefined || valeur === null || valeur === '') continue;
    url.searchParams.set(cle, String(valeur));
  }

  try {
    const reponse = await fetch(url, {
      // Les données de suivi changent à chaque saisie : un écran de pilotage
      // qui sert une page mise en cache annonce des chiffres périmés.
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(DELAI_MAX_MS),
    });
    if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
    return (await reponse.json()) as T;
  } catch (cause) {
    signaler(chemin, cause);
    return repli();
  }
}

/** Enveloppe de pagination de DRF, telle que l'API la rend. */
export interface PageApi<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
