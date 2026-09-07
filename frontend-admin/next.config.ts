import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

/*
 * Vireo Next.js 15 — front d'administration « Made in Yeumbeul Nord ».
 *
 * Le socle de tokens partagé (src/styles/app.css) est importé une seule fois
 * dans app/layout.tsx. Tailwind v4 compile via le plugin PostCSS
 * (postcss.config.mjs).
 *
 * IMAGES — DÉPENDANCE RÉSEAU SUPPRIMÉE (6 septembre 2026)
 * ------------------------------------------------------
 * Le template autorisait `i.pravatar.cc`, `picsum.photos` et `loremflickr.com`
 * en `remotePatterns` : tous les visuels de démonstration étaient donc chargés
 * depuis Internet. La démo devant le Maire doit fonctionner sans connexion —
 * ces domaines ont été retirés et les 8 références correspondantes
 * (src/components/shell/Header.tsx, src/screens/ui/Avatars.tsx) pointent
 * désormais sur des fichiers locaux de public/img/.
 *
 * NE PAS réintroduire de `remotePatterns` sans décision explicite : c'est le
 * garde-fou qui garantit que la démo reste jouable hors ligne. Les seules
 * ressources encore distantes sont les polices Google (app/layout.tsx) et les
 * fonds de carte CARTO/OSM (src/screens/maps/Leaflet.tsx) — voir
 * _AUDIT/06-CONTRAINTES-ET-DECISIONS.md §6 pour le plan de repli.
 */
const nextConfig: NextConfig = {
  images: {
    // Aucun domaine distant autorisé : tous les visuels viennent de public/.
    remotePatterns: [],
    // Les assets sont pré-encodés en WebP par tools/optimize_assets.py ;
    // on garde AVIF en tête pour les navigateurs qui le supportent.
    formats: ['image/avif', 'image/webp'],
  },
};

/*
 * INTERNATIONALISATION (7 septembre 2026)
 * ---------------------------------------
 * `next-intl` est branché sans routage par locale : la langue est résolue par cookie,
 * pas par préfixe d'URL. Le raisonnement complet est dans src/i18n/config.ts.
 *
 * La couche est posée dès le premier écran, conformément à CLAUDE.md §5 : rétrofitter
 * l'i18n après coup sur les ~52 000 lignes de Vireo coûterait dix fois plus cher.
 */
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
