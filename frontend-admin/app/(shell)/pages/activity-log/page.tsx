/*
 * Route « pages/activity-log » — Journal d'audit.
 *
 * Composant **serveur** : il charge la piste d'audit et la passe à l'écran.
 *
 * `maintenant` traverse en props plutôt que d'être lu par le client : c'est ce
 * qui permet à « Aujourd'hui » et « Hier » d'être calculés sur le même instant
 * au serveur et au navigateur. Un `new Date()` posé des deux côtés produit deux
 * réponses différentes et React signale une divergence d'hydratation sur chaque
 * en-tête de jour.
 */
import { DATE_REFERENCE, journalActivite } from '../../../../src/domaine';
import { JournalAudit } from '../../../../src/screens/pages/JournalAudit';
import type { DonneesJournal } from '../../../../src/screens/pages/JournalAudit';

export default async function JournalAuditPage() {
  const evenements = await journalActivite(60);

  const donnees: DonneesJournal = {
    evenements,
    acteurs: [...new Set(evenements.map((e) => e.acteur))].sort((a, b) => a.localeCompare(b, 'fr')),
    maintenant: DATE_REFERENCE.toISOString(),
  };

  return <JournalAudit donnees={donnees} />;
}
