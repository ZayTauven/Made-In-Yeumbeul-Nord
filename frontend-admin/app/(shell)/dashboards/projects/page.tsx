/*
 * Route « dashboards/projects » — Tableau de bord de suivi.
 *
 * Composant **serveur** : il interroge la couche de domaine et passe le résultat
 * à l'écran de présentation.
 *
 * Il ne calcule ici que ce qui relève de la géométrie de l'écran — la fenêtre du
 * diagramme de Gantt et la position de ses barres. Tous les agrégats métier
 * viennent de `domaine/source.ts`, qui porte le contrat d'API : le jour où
 * Django répondra sur `GET /api/activites/resume/` et
 * `GET /api/suivi/kpis/?tableau=plan-action`, ce fichier ne bouge pas.
 */
import {
  DATE_REFERENCE,
  ETAPES,
  cadreLogique,
  entonnoirAccompagnement,
  formaterMoisAnnee,
  kpisPlanAction,
  listerActivites,
  listerJalons,
  resumePlanAction,
} from '../../../../src/domaine';
import { TableauDeBordSuivi } from '../../../../src/screens/dashboards/TableauDeBordSuivi';
import type {
  BarreEcheancier,
  DonneesSuivi,
  EtapeParcours,
  LigneActivite,
} from '../../../../src/screens/dashboards/TableauDeBordSuivi';

/** Nombre de graduations sous l'échéancier. */
const REPERES_ECHEANCIER = 6;
/** Nombre de barres du diagramme de Gantt : au-delà, la carte déborde. */
const BARRES_ECHEANCIER = 8;
/** Lignes du tableau du plan d'action. */
const LIGNES_PLAN = 6;

const JOUR_MS = 86_400_000;

export default async function TableauDeBordSuiviPage() {
  const [kpis, resume, activites, jalons, cadre, entonnoir] = await Promise.all([
    kpisPlanAction(),
    resumePlanAction(),
    listerActivites(),
    listerJalons(),
    cadreLogique(),
    entonnoirAccompagnement(),
  ]);

  /* --------------------------------------------------------------------- *
   * Parcours d'accompagnement
   * --------------------------------------------------------------------- */

  // Les étapes sont ordonnées : un groupement « équipé » a nécessairement franchi
  // « formé ». L'effectif ayant franchi une étape est donc la somme des effectifs
  // de cette étape et de toutes les suivantes — ce qui produit un entonnoir
  // décroissant, et non deux séries sans rapport l'une avec l'autre.
  const parcours: EtapeParcours[] = ETAPES.map((etape, i) => ({
    etape,
    effectif: entonnoir[i]?.effectif ?? 0,
    franchie: entonnoir.slice(i).reduce((s, e) => s + e.effectif, 0),
  }));

  /* --------------------------------------------------------------------- *
   * Axes stratégiques
   * --------------------------------------------------------------------- */

  const axes = cadre.axes.map((axe) => {
    const indicateurs = cadre.indicateurs.filter((i) => i.axe_id === axe.id);
    return {
      code: axe.code,
      intitule: axe.intitule,
      teinte: axe.teinte,
      avancement: axe.avancement,
      indicateursAtteints: indicateurs.filter((i) => i.taux_atteinte >= 100).length,
      indicateursTotal: indicateurs.length,
    };
  });

  /* --------------------------------------------------------------------- *
   * Échéancier (Gantt)
   * --------------------------------------------------------------------- */

  const teinteAxe = new Map(cadre.axes.map((a) => [a.id, a.teinte]));
  const intituleAxe = new Map(cadre.axes.map((a) => [a.id, `${a.code} · ${a.intitule}`]));

  // On montre les activités ouvertes ; s'il n'y en a pas assez pour remplir la
  // carte, on complète par les dernières achevées, qui donnent le contexte du
  // plan sans le fausser.
  const ouvertes = activites.filter((a) => a.statut !== 'terminee');
  const achevees = activites
    .filter((a) => a.statut === 'terminee')
    .sort((x, y) => y.date_fin.localeCompare(x.date_fin));
  const retenues = [...ouvertes, ...achevees]
    .slice(0, BARRES_ECHEANCIER)
    .sort((x, y) => x.date_debut.localeCompare(y.date_debut));

  const debutFenetre = Math.min(...retenues.map((a) => new Date(a.date_debut).getTime()));
  const finFenetre = Math.max(...retenues.map((a) => new Date(a.date_fin).getTime()));
  const amplitude = Math.max(1, finFenetre - debutFenetre);

  const barres: BarreEcheancier[] = retenues.map((a) => {
    const debut = new Date(a.date_debut).getTime();
    const fin = new Date(a.date_fin).getTime();
    return {
      code: a.code,
      intitule: a.intitule,
      axe: intituleAxe.get(a.axe_id) ?? '',
      gauche: arrondi1(((debut - debutFenetre) / amplitude) * 100),
      largeur: Math.max(2, arrondi1(((fin - debut) / amplitude) * 100)),
      avancement: a.avancement,
      teinte: teinteAxe.get(a.axe_id) ?? 'var(--ax-accent)',
      echeance: a.date_fin,
    };
  });

  // Graduations calculées depuis la fenêtre réelle du plan, et non écrites en
  // dur : l'échelle du diagramme suit les activités qu'il montre.
  const reperes = Array.from({ length: REPERES_ECHEANCIER }, (_, i) =>
    formaterMoisAnnee(
      new Date(debutFenetre + (amplitude * i) / (REPERES_ECHEANCIER - 1)).toISOString(),
    ),
  );

  /* --------------------------------------------------------------------- *
   * Prochains jalons et plan d'action
   * --------------------------------------------------------------------- */

  const intituleActivite = new Map(activites.map((a) => [a.id, a.intitule]));
  const prochainsJalons = jalons
    .filter((j) => j.statut === 'a_venir')
    .sort((x, y) => x.date_prevue.localeCompare(y.date_prevue))
    .slice(0, 4)
    .map((j) => ({
      id: j.id,
      intitule: j.intitule,
      activite: j.activite_id === null ? null : (intituleActivite.get(j.activite_id) ?? null),
      date: j.date_prevue,
      joursRestants: Math.max(
        0,
        Math.round((new Date(j.date_prevue).getTime() - DATE_REFERENCE.getTime()) / JOUR_MS),
      ),
      decisif: j.decisif,
    }));

  // Le tableau reprend les activités ouvertes, la plus proche échéance d'abord :
  // c'est l'ordre dans lequel la coordination doit les traiter.
  const planAction: LigneActivite[] = ouvertes
    .slice()
    .sort((x, y) => x.date_fin.localeCompare(y.date_fin))
    .slice(0, LIGNES_PLAN)
    .map((a) => ({
      code: a.code,
      intitule: a.intitule,
      axe: intituleAxe.get(a.axe_id) ?? '',
      responsable: a.responsable,
      responsableInitiales: a.responsable_initiales,
      teinte: teinteAxe.get(a.axe_id) ?? 'var(--ax-accent)',
      avancement: a.avancement,
      budgetPrevu: a.budget_prevu_fcfa,
      budgetConsomme: a.budget_consomme_fcfa,
      echeance: a.date_fin,
      statut: a.statut,
    }));

  const donnees: DonneesSuivi = {
    kpis,
    parcours,
    statuts: resume.par_statut,
    totalActivites: resume.total,
    echeancier: { barres, reperes },
    charge: resume.charge_par_responsable.slice(0, 6),
    axes,
    budget: {
      engage: resume.budget_engage_fcfa,
      consomme: resume.budget_consomme_fcfa,
      partConsommee: resume.part_consommee,
      avancementMoyen: resume.avancement_moyen,
      ouvertes: resume.ouvertes,
    },
    jalons: prochainsJalons,
    planAction,
  };

  return <TableauDeBordSuivi donnees={donnees} />;
}

function arrondi1(valeur: number): number {
  return Math.round(valeur * 10) / 10;
}
