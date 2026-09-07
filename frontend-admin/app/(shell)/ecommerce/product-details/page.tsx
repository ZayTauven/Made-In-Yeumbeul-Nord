/*
 * Route « ecommerce/product-details » — Fiche production.
 *
 * Composant **serveur**. La production affichée vient de `?production=<slug>` ;
 * sans paramètre, la fiche ouvre sur la première du catalogue, ce qui permet
 * d'atteindre l'écran depuis le menu.
 */
import { notFound } from 'next/navigation';
import {
  PHOTOS,
  listerProductions,
  obtenirGroupement,
  obtenirProduction,
  productionsSimilaires,
} from '../../../../src/domaine';
import { FicheProduction } from '../../../../src/screens/productions/FicheProduction';
import type {
  DonneesFicheProduction,
  ProductionVoisine,
  Vue,
} from '../../../../src/screens/productions/FicheProduction';

/** Productions de la même filière proposées dans le rail. */
const VOISINES = 4;

/** Résout une clé de catalogue en vue affichable, ou rien si la clé est inconnue. */
function vuePour(cle: string, taille: 'hero' | 'carte'): Vue | null {
  const photo = PHOTOS[cle];
  if (!photo) return null;
  const variante = taille === 'hero' ? (photo.hero ?? photo.carte) : (photo.carte ?? photo.hero);
  if (!variante) return null;
  return { cle, src: variante.src, flou: photo.blurDataURL, alt: photo.alt, titre: photo.titre };
}

export default async function FicheProductionPage({
  searchParams,
}: {
  searchParams: Promise<{ production?: string }>;
}) {
  const { production: slug } = await searchParams;

  const production = slug
    ? await obtenirProduction(slug)
    : (await listerProductions({ taille: 1, tri: 'note' })).results[0];

  if (!production) notFound();

  const [groupement, similaires] = await Promise.all([
    obtenirGroupement(production.groupement_slug),
    productionsSimilaires(production, VOISINES),
  ]);

  if (!groupement) notFound();

  const vues = [production.photo_cle, ...production.photos_additionnelles]
    .map((cle) => vuePour(cle, 'hero'))
    .filter((v) => v !== null);

  const voisines: ProductionVoisine[] = similaires.map((v) => {
    const vignette = vuePour(v.photo_cle, 'carte');
    return {
      slug: v.slug,
      nom: v.nom,
      groupement: v.groupement_nom,
      prix: v.prix_unitaire_fcfa,
      unite: v.unite,
      image: vignette ? { src: vignette.src, flou: vignette.flou } : null,
    };
  });

  const donnees: DonneesFicheProduction = {
    production,
    vues,
    groupement: {
      nom: groupement.nom,
      slug: groupement.slug,
      quartier: groupement.quartier.nom,
      nombreMembres: groupement.nombre_membres,
      etape: groupement.etape,
      responsable: groupement.responsable,
    },
    voisines,
  };

  return <FicheProduction donnees={donnees} />;
}
