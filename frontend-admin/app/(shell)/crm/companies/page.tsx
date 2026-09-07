/*
 * Route « crm/companies » — Annuaire des groupements.
 *
 * Composant **serveur**.
 *
 * Les cent groupements sont chargés d'un bloc : à cette taille, filtrer côté
 * navigateur donne une réponse instantanée là où un aller-retour réseau se
 * verrait. `listerGroupements()` accepte déjà tous les paramètres de filtre —
 * le jour où la commune en recensera mille, seule cette page changera.
 */
import { kpisSuivi, listerFilieres, listerGroupements, listerQuartiers } from '../../../../src/domaine';
import { Annuaire } from '../../../../src/screens/groupements/Annuaire';
import type { DonneesAnnuaire } from '../../../../src/screens/groupements/Annuaire';

/** Indicateurs d'en-tête retenus, dans l'ordre d'affichage. */
const CLES_KPI = ['groupements', 'membres', 'part_femmes', 'en_production'];

export default async function AnnuairePage() {
  const [page, kpis, filieres, quartiers] = await Promise.all([
    listerGroupements({ taille: 1000 }),
    kpisSuivi(),
    listerFilieres(),
    listerQuartiers(),
  ]);

  const donnees: DonneesAnnuaire = {
    groupements: page.results,
    kpis: CLES_KPI.map((cle) => kpis.find((k) => k.cle === cle)).filter((k) => k !== undefined),
    filieres: filieres.map((f) => ({ slug: f.slug, nom: f.nom, teinte: f.teinte })),
    quartiers: quartiers.map((q) => ({ slug: q.slug, nom: q.nom })),
  };

  return <Annuaire donnees={donnees} />;
}
