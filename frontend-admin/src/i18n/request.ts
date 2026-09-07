/**
 * Résolution de la locale et chargement des messages, côté serveur.
 *
 * Point d'entrée déclaré à `createNextIntlPlugin` dans `next.config.ts`. Appelé une
 * fois par requête, avant le rendu.
 *
 * Les messages sont éclatés en un fichier par domaine sous `messages/<locale>/`,
 * puis fusionnés ici en un seul objet dont chaque nom de fichier devient l'espace de
 * noms. Deux raisons : un fichier unique de plusieurs milliers de clés devient
 * ingérable à relire, et surtout deux intervenants qui traduisent deux écrans
 * différents ne se marchent pas dessus.
 */

import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

import { COOKIE_LOCALE, FUSEAU, LOCALE_PAR_DEFAUT, estLocaleValide, type Locale } from './config';

/**
 * Espaces de noms chargés à chaque requête.
 *
 * Ajouter un domaine ici en même temps que son fichier — sans quoi le fichier existe
 * mais n'est jamais chargé, et les libellés s'affichent en clés brutes.
 *
 * Le chemin d'import garde un préfixe et un suffixe littéraux autour de la variable :
 * c'est ce qui permet au bundler de résoudre le dossier et d'embarquer les fichiers.
 * Un chemin entièrement calculé serait invisible à l'analyse et les traductions
 * manqueraient en production.
 */
const ESPACES = ['commun', 'chrome', 'ecrans', 'navigation'] as const;

async function chargerMessages(locale: Locale) {
  const entrees = await Promise.all(
    ESPACES.map(async (espace) => {
      try {
        const module = await import(`../../messages/${locale}/${espace}.json`);
        return [espace, module.default] as const;
      } catch {
        // Un espace de noms pas encore traduit ne doit pas faire tomber la page :
        // `next-intl` affichera la clé brute, ce qui se repère immédiatement à
        // l'écran et se corrige, alors qu'une erreur 500 bloque toute la démo.
        return [espace, {}] as const;
      }
    }),
  );
  return Object.fromEntries(entrees);
}

export default getRequestConfig(async () => {
  const magasin = await cookies();
  const choisie = magasin.get(COOKIE_LOCALE)?.value;
  const locale: Locale = estLocaleValide(choisie) ? choisie : LOCALE_PAR_DEFAUT;

  return {
    locale,
    timeZone: FUSEAU,
    messages: await chargerMessages(locale),
    /**
     * Instant de référence des formats relatifs. Sans lui, `next-intl` prend
     * `Date.now()` au serveur puis au client, et un « il y a 3 minutes » calculé à
     * deux instants différents produit une divergence d'hydratation.
     */
    now: new Date(),
  };
});
