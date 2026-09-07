import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

/*
 * Ekomart Next.js 16 — vitrine publique « Made in Yeumbeul Nord ».
 *
 * IMAGES — AUCUN DOMAINE DISTANT
 * ------------------------------
 * `remotePatterns` reste vide et doit le rester : la démonstration devant le Maire
 * doit fonctionner sans connexion Internet. Toutes les illustrations viennent de
 * `public/img/`, publiées depuis la bibliothèque de travail par
 * `python tools/publier_photos_front.py`.
 *
 * INTERNATIONALISATION (7 septembre 2026)
 * ---------------------------------------
 * `next-intl` est branché sans routage par locale : la langue est résolue par cookie,
 * pas par préfixe d'URL. Le raisonnement, et la condition qui justifierait de passer
 * au routage par préfixe le jour où le wolof serait publié, sont dans
 * src/i18n/config.ts.
 */
const nextConfig: NextConfig = {
  /*
   * Next 16 genere de lui-meme un AGENTS.md et un CLAUDE.md a la racine du front.
   * On les refuse : le projet a deja son CLAUDE.md a la racine du depot, qui fait
   * autorite, et un second fichier d'instructions dans un sous-dossier entrerait en
   * concurrence avec lui sans que personne ne l'ait decide.
   */
  agentRules: false,

  images: {
    remotePatterns: [],
    // Les assets sont pré-encodés en WebP par tools/optimize_assets.py ;
    // AVIF passe en tête pour les navigateurs qui le supportent.
    formats: ['image/avif', 'image/webp'],
  },
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
