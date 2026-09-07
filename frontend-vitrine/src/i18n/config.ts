/**
 * Configuration des langues — vitrine publique MADE IN YEUMBEUL NORD
 * ==================================================================
 *
 * Une seule locale active : le français. Le wolof est prévu, pas livré.
 *
 * **Choix d'architecture : `next-intl` sans routage par locale**, comme sur le front
 * d'administration. La locale est résolue par cookie, elle n'apparaît pas dans l'URL.
 *
 * Une nuance propre à la vitrine mérite d'être écrite noir sur blanc : c'est le seul
 * des deux fronts qui a un enjeu de référencement. Le jour où une version wolof serait
 * réellement publiée, il faudrait des URL distinctes — un moteur de recherche ne sait
 * pas indexer deux langues servies sous la même adresse selon un cookie. Ce jour-là,
 * et seulement ce jour-là, on passera cette application au routage par préfixe
 * (`/wo/...`) en déplaçant `src/app/(demos)` et `src/app/(inner)` sous `src/app/[locale]/`.
 *
 * Le faire aujourd'hui pour une langue qui n'est pas commandée coûterait le
 * remaniement de 54 pages et de leurs imports, sans bénéfice. Ce qui a réellement de
 * la valeur — l'extraction des libellés hors du JSX — est identique dans les deux
 * approches, et commence maintenant.
 */

export const LOCALES = ['fr'] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_PAR_DEFAUT: Locale = 'fr';

/** Nom du cookie portant la locale choisie. */
export const COOKIE_LOCALE = 'myn:locale';

/** Libellés des langues, dans leur propre langue. */
export const LIBELLE_LOCALE: Record<Locale, string> = {
  fr: 'Français',
};

/**
 * Fuseau horaire de référence.
 *
 * Fixé explicitement : sans lui, une date formatée avec le fuseau du serveur au rendu
 * initial puis avec celui du navigateur à l'hydratation produit deux valeurs
 * différentes, et React signale une divergence.
 */
export const FUSEAU = 'Africa/Dakar';

export function estLocaleValide(valeur: string | undefined | null): valeur is Locale {
  return Boolean(valeur) && (LOCALES as readonly string[]).includes(valeur as string);
}
