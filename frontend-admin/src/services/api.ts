/**
 * Client HTTP de l'API — MADE IN YEUMBEUL NORD
 * ============================================
 *
 * L'authentification repose sur la **session Django**, pas sur un jeton porté
 * par le navigateur. Trois conséquences, qui expliquent tout ce fichier :
 *
 * 1. Chaque appel part avec `credentials: 'include'`. Sans cela le navigateur
 *    n'envoie pas le cookie de session, et l'API répond 403 sur les écritures.
 * 2. Toute écriture porte l'en-tête `X-CSRFToken`. Le cookie CSRF est
 *    `HttpOnly` — donc illisible ici — et le serveur nous rend le jeton dans le
 *    corps de `GET /api/auth/csrf/`. On le garde en mémoire.
 * 3. Le jeton **tourne à la connexion**. On le relit donc après chaque
 *    connexion réussie, faute de quoi la première écriture qui suit repartirait
 *    avec l'ancien et serait refusée.
 */

export const BASE_API = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
).replace(/\/$/, '');

/** Erreur d'API portant le statut et le détail rendu par le serveur. */
export class ErreurApi extends Error {
  readonly statut: number;
  /** Erreurs par champ, telles que DRF les rend : `{ champ: ['message'] }`. */
  readonly champs: Record<string, string[]>;

  constructor(statut: number, message: string, champs: Record<string, string[]> = {}) {
    super(message);
    this.name = 'ErreurApi';
    this.statut = statut;
    this.champs = champs;
  }

  /** Premier message concernant un champ donné, s'il y en a un. */
  messagePour(champ: string): string | undefined {
    return this.champs[champ]?.[0];
  }
}

/**
 * Jeton CSRF courant, gardé en mémoire volontairement.
 *
 * Le stocker dans `localStorage` l'exposerait à tout script injecté, ce qui
 * annulerait la protection qu'il apporte. Le perdre au rechargement n'est pas
 * un problème : on le redemande.
 */
let jetonCsrf: string | null = null;

/** Redemande un jeton CSRF au serveur et le mémorise. */
export async function rafraichirJetonCsrf(): Promise<string> {
  const reponse = await fetch(`${BASE_API}/auth/csrf/`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if (!reponse.ok) {
    throw new ErreurApi(reponse.status, "Impossible d'obtenir le jeton de sécurité.");
  }
  const donnees = (await reponse.json()) as { jeton_csrf: string };
  jetonCsrf = donnees.jeton_csrf;
  return jetonCsrf;
}

/** Oublie le jeton courant — à appeler à la déconnexion. */
export function oublierJetonCsrf(): void {
  jetonCsrf = null;
}

async function jetonCourant(): Promise<string> {
  return jetonCsrf ?? (await rafraichirJetonCsrf());
}

async function lireErreur(reponse: Response): Promise<ErreurApi> {
  let detail = 'Le serveur n’a pas pu traiter la demande.';
  let champs: Record<string, string[]> = {};

  try {
    const corps = await reponse.json();
    if (typeof corps?.detail === 'string') {
      detail = corps.detail;
    }
    if (corps && typeof corps === 'object') {
      champs = Object.fromEntries(
        Object.entries(corps)
          .filter(([cle]) => cle !== 'detail')
          .map(([cle, valeur]) => [cle, Array.isArray(valeur) ? valeur.map(String) : [String(valeur)]]),
      );
      // Quand DRF ne rend que des erreurs de champ, le premier message est plus
      // parlant que le libellé générique.
      const premier = Object.values(champs)[0]?.[0];
      if (premier && !('detail' in corps)) detail = premier;
    }
  } catch {
    // Réponse sans corps JSON — un 500 en HTML, par exemple.
  }

  if (reponse.status === 429) {
    detail = 'Trop de tentatives. Patientez une minute avant de réessayer.';
  }
  return new ErreurApi(reponse.status, detail, champs);
}

type Options = { methode?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; corps?: unknown };

/**
 * Appelle l'API et rend le corps décodé, ou `null` pour une réponse 204.
 *
 * Une écriture dont le jeton CSRF est périmé est **rejouée une fois** avec un
 * jeton frais : cela arrive normalement après une connexion, et l'utilisateur
 * n'a pas à en subir un échec.
 */
export async function appelerApi<T>(chemin: string, options: Options = {}): Promise<T> {
  const methode = options.methode ?? 'GET';
  const ecriture = methode !== 'GET';

  const envoyer = async (jeton?: string): Promise<Response> => {
    const entetes: Record<string, string> = { Accept: 'application/json' };
    if (options.corps !== undefined) entetes['Content-Type'] = 'application/json';
    if (jeton) entetes['X-CSRFToken'] = jeton;

    return fetch(`${BASE_API}${chemin}`, {
      method: methode,
      credentials: 'include',
      headers: entetes,
      body: options.corps === undefined ? undefined : JSON.stringify(options.corps),
    });
  };

  let reponse = await envoyer(ecriture ? await jetonCourant() : undefined);

  if (ecriture && reponse.status === 403) {
    reponse = await envoyer(await rafraichirJetonCsrf());
  }

  if (!reponse.ok) throw await lireErreur(reponse);
  if (reponse.status === 204) return null as T;
  return (await reponse.json()) as T;
}
