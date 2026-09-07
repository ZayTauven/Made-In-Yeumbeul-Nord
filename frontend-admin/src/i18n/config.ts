/**
 * Configuration des langues — MADE IN YEUMBEUL NORD
 * =================================================
 *
 * Une seule locale active au démarrage : le français. Le wolof est prévu, pas livré.
 *
 * **Choix d'architecture : `next-intl` sans routage par locale.**
 *
 * La locale ne figure pas dans l'URL ; elle est résolue par cookie. Les trois raisons :
 *
 * 1. Passer par le routage aurait imposé de déplacer les ~60 dossiers de routes sous
 *    `app/[locale]/`, avec la reprise de tous les imports relatifs qui va avec. Un
 *    remaniement de cette ampleur, à sept semaines de la démonstration, pour une
 *    seconde langue qui n'est pas commandée, ne se justifie pas.
 * 2. Le coût réel de l'internationalisation n'est pas le routage : c'est l'extraction
 *    des libellés. Celle-ci est identique dans les deux approches, et elle commence
 *    maintenant — c'est précisément ce que `CLAUDE.md` §5 impose.
 * 3. Le front d'administration est derrière authentification : ses URL n'ont aucun
 *    enjeu de référencement.
 *
 * **Le jour où le wolof arrive** : ajouter `'wo'` à `LOCALES`, créer `messages/wo/`,
 * et brancher un sélecteur qui écrit le cookie. Aucune route ne bouge. Si la vitrine
 * publique doit un jour être référencée en wolof — et elle seule pourrait en avoir
 * besoin —, le passage au routage par préfixe se fera là-bas, sans toucher à l'admin.
 */

export const LOCALES = ['fr'] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_PAR_DEFAUT: Locale = 'fr';

/**
 * Nom du cookie portant la locale choisie.
 *
 * Le préfixe `ax:` est celui qu'utilise déjà le script anti-flash de `app/layout.tsx`
 * pour ses clés de `localStorage` (`ax:theme`, `ax:accent`, `ax:lang`). On reste dans
 * la même famille pour que tout ce qui concerne les préférences d'affichage se lise
 * d'un coup d'œil.
 */
export const COOKIE_LOCALE = 'ax:locale';

/** Libellés des langues, dans leur propre langue. */
export const LIBELLE_LOCALE: Record<Locale, string> = {
  fr: 'Français',
};

/**
 * Fuseau horaire de référence.
 *
 * Fixé explicitement : sans lui, `next-intl` formate les dates avec le fuseau du
 * serveur au rendu initial puis avec celui du navigateur à l'hydratation. Un poste de
 * démonstration réglé sur un autre fuseau que Dakar afficherait deux valeurs
 * différentes pour la même date, et React signalerait une divergence.
 */
export const FUSEAU = 'Africa/Dakar';

export function estLocaleValide(valeur: string | undefined | null): valeur is Locale {
  return Boolean(valeur) && (LOCALES as readonly string[]).includes(valeur as string);
}

/**
 * Clé de message correspondant à un identifiant de nœud du manifeste de navigation.
 *
 * Les identifiants du manifeste sont pointés (`groupements.parcours`), mais `next-intl`
 * réserve le point à l'imbrication : une clé plate qui en contient est rejetée avec
 * `INVALID_KEY`, et tout le catalogue tombe.
 *
 * L'imbrication n'est pas une option non plus. Neuf identifiants sont à la fois une
 * feuille et le préfixe d'un sous-groupe — `groupements.parcours` est un écran *et* le
 * parent de `groupements.parcours.*`. Un même emplacement ne peut pas être à la fois
 * une chaîne et un objet.
 *
 * D'où un catalogue plat séparé par `/`, et cette fonction comme seul point de
 * conversion. Ne pas indexer `messages/fr/navigation.json` à la main.
 *
 * Le manifeste porte déjà ses titres en français : ce catalogue ne sert pas encore à
 * l'affichage, il existe pour que la locale `wo` puisse arriver sans le retoucher.
 */
export function cleNavigation(idNoeud: string): string {
  return idNoeud.replace(/\./g, '/');
}
