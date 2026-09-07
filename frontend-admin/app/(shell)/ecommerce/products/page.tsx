/*
 * Route « ecommerce/products » — Catalogue des productions.
 *
 * Composant **serveur**. Il résout ici deux choses que l'écran ne doit pas
 * refaire à chaque frappe : le quartier du groupement producteur, et la
 * variante d'image adaptée à une carte, avec son `blurDataURL`.
 */
import {
  PHOTOS,
  listerFilieres,
  listerGroupements,
  listerProductions,
  listerQuartiers,
} from '../../../../src/domaine';
import { Catalogue } from '../../../../src/screens/productions/Catalogue';
import type { DonneesCatalogue, ProductionAffichee } from '../../../../src/screens/productions/Catalogue';

export default async function CataloguePage() {
  const [pageProductions, pageGroupements, filieres, quartiers] = await Promise.all([
    listerProductions({ taille: 1000 }),
    listerGroupements({ taille: 1000 }),
    listerFilieres(),
    listerQuartiers(),
  ]);

  const productions = pageProductions.results;
  const quartierParGroupement = new Map(pageGroupements.results.map((g) => [g.id, g.quartier.slug]));

  const affichees: ProductionAffichee[] = productions.map((p) => {
    const photo = PHOTOS[p.photo_cle];
    // La variante « carte » est celle dimensionnée pour une vignette de grille.
    // À défaut on retombe sur le héros : mieux vaut une image trop grande
    // qu'une carte vide.
    const variante = photo?.carte ?? photo?.hero ?? photo?.vignette;
    return {
      ...p,
      quartier_slug: quartierParGroupement.get(p.groupement_id) ?? '',
      image:
        photo && variante
          ? {
              src: variante.src,
              largeur: variante.largeur,
              hauteur: variante.hauteur,
              flou: photo.blurDataURL,
              // Le texte alternatif décrit la scène photographiée, pas la
              // production : la photo illustre la filière, elle n'est pas le
              // portrait de l'article vendu, et l'annoncer autrement tromperait
              // un lecteur d'écran.
              alt: photo.alt,
            }
          : null,
    };
  });

  const donnees: DonneesCatalogue = {
    productions: affichees,
    filieres: filieres.map((f) => ({
      slug: f.slug,
      nom: f.nom,
      teinte: f.teinte,
      nombre: productions.filter((p) => p.filiere_slug === f.slug).length,
    })),
    quartiers: quartiers.map((q) => ({ slug: q.slug, nom: q.nom })),
    // La borne du curseur suit le catalogue : la figer priverait l'écran des
    // productions les plus chères le jour où une filière en ajoute.
    prixMaximum: Math.max(...productions.map((p) => p.prix_unitaire_fcfa)),
    compteurs: {
      total: productions.length,
      enAlerte: productions.filter((p) => p.stock_disponible > 0 && p.stock_disponible <= p.seuil_alerte).length,
      enRupture: productions.filter((p) => p.stock_disponible === 0).length,
    },
  };

  return <Catalogue donnees={donnees} />;
}
