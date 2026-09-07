/*
 * Route « maps/leaflet » — Cartographie des groupements.
 *
 * Composant **serveur**. La charge est allégée volontairement : la carte reçoit
 * `groupementsSurLaCarte()` et non la liste complète des groupements. Sur cent
 * points le gain est mince ; sur mille, il fera la différence entre une carte
 * qui s'affiche et une carte qu'on attend.
 */
import {
  groupementsSurLaCarte,
  listerBoutiques,
  listerFilieres,
  listerQuartiers,
} from '../../../../src/domaine';
import { Cartographie } from '../../../../src/screens/maps/Cartographie';
import type { DonneesCartographie } from '../../../../src/screens/maps/Cartographie';

export default async function CartographiePage() {
  const [points, quartiers, filieres, boutiques] = await Promise.all([
    groupementsSurLaCarte(),
    listerQuartiers(),
    listerFilieres(),
    listerBoutiques(),
  ]);

  // Centre de la vue : le barycentre des quartiers recensés, et non une constante.
  // Le jour où la commune corrige une coordonnée, la carte se recentre seule.
  const centre: [number, number] = [
    quartiers.reduce((s, q) => s + q.latitude, 0) / quartiers.length,
    quartiers.reduce((s, q) => s + q.longitude, 0) / quartiers.length,
  ];

  const parSlugFiliere = new Map(filieres.map((f) => [f.nom, f.slug]));

  const donnees: DonneesCartographie = {
    groupements: points.map((p) => ({
      id: p.id,
      nom: p.nom,
      slug: p.slug,
      latitude: p.latitude,
      longitude: p.longitude,
      quartier: p.quartier,
      filiere: p.filiere,
      filiereSlug: parSlugFiliere.get(p.filiere) ?? '',
      filiereTeinte: p.filiere_teinte,
      etape: p.etape,
      nombreMembres: p.nombre_membres,
    })),
    quartiers: quartiers.map((q) => ({
      id: q.id,
      nom: q.nom,
      slug: q.slug,
      latitude: q.latitude,
      longitude: q.longitude,
      nombreGroupements: q.nombre_groupements,
      populationEstimee: q.population_estimee,
      partCommune: Math.round((q.nombre_groupements / points.length) * 100),
    })),
    boutiques: boutiques.map((b) => ({
      id: b.id,
      nom: b.nom,
      quartier: b.quartier,
      latitude: b.latitude,
      longitude: b.longitude,
      responsable: b.responsable,
      horaires: `${b.heure_ouverture} – ${b.heure_fermeture}`,
    })),
    filieres: filieres.map((f) => ({ slug: f.slug, nom: f.nom, teinte: f.teinte })),
    centre,
  };

  return <Cartographie donnees={donnees} />;
}
