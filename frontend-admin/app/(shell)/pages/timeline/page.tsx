/*
 * Route « pages/timeline » — Chronologie des jalons.
 *
 * Composant **serveur**. Il calcule ici les écarts et les étiquettes de mois :
 * les dates doivent être mises en forme au même endroit pour le rendu serveur
 * et pour l'hydratation, faute de quoi le fuseau du navigateur peut décaler un
 * jalon d'un mois sur l'autre.
 */
import { DATE_REFERENCE, formaterMoisAnnee, listerActivites, listerJalons } from '../../../../src/domaine';
import { ChronologieJalons } from '../../../../src/screens/activites/ChronologieJalons';
import type { DonneesJalons, JalonAffiche } from '../../../../src/screens/activites/ChronologieJalons';

const JOUR_MS = 86_400_000;
/** Jalons décisifs listés dans le rail latéral. */
const DECISIFS_AU_RAIL = 6;

export default async function ChronologieJalonsPage() {
  const [jalons, activites] = await Promise.all([listerJalons(), listerActivites()]);

  const intituleActivite = new Map(activites.map((a) => [a.id, a.intitule]));

  const enJours = (iso: string) =>
    Math.round((new Date(iso).getTime() - DATE_REFERENCE.getTime()) / JOUR_MS);

  const affiches: JalonAffiche[] = jalons
    // De l'avenir vers le passé : sur un projet, ce qui reste à tenir appelle une
    // décision, ce qui est fait ne se relit qu'en réunion de bilan.
    .slice()
    .sort((x, y) => (y.date_reelle ?? y.date_prevue).localeCompare(x.date_reelle ?? x.date_prevue))
    .map((j) => ({
      id: j.id,
      intitule: j.intitule,
      activite: j.activite_id === null ? null : (intituleActivite.get(j.activite_id) ?? null),
      datePrevue: j.date_prevue,
      dateReelle: j.date_reelle,
      statut: j.statut,
      decisif: j.decisif,
      ecartJours:
        j.date_reelle === null
          ? null
          : Math.round((new Date(j.date_reelle).getTime() - new Date(j.date_prevue).getTime()) / JOUR_MS),
      joursRestants: j.statut === 'a_venir' ? Math.max(0, enJours(j.date_prevue)) : null,
      mois: formaterMoisAnnee(j.date_reelle ?? j.date_prevue),
    }));

  const compteurs = {
    atteint: jalons.filter((j) => j.statut === 'atteint').length,
    a_venir: jalons.filter((j) => j.statut === 'a_venir').length,
    manque: jalons.filter((j) => j.statut === 'manque').length,
  };

  const donnees: DonneesJalons = {
    jalons: affiches,
    decisifs: affiches.filter((j) => j.decisif).slice(0, DECISIFS_AU_RAIL),
    compteurs,
    moisCourant: formaterMoisAnnee(DATE_REFERENCE.toISOString()),
  };

  return <ChronologieJalons donnees={donnees} />;
}
