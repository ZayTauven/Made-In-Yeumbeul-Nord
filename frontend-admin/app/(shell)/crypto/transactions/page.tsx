/*
 * Route « crypto/transactions » — Journal des mouvements financiers.
 *
 * Le segment d'URL reste celui du template : cent quatre-vingt-six pages en
 * dépendent, et les renommer orphelinerait autant de fichiers pour un gain
 * cosmétique. Le manifeste de navigation porte le libellé métier, qui est ce
 * que l'utilisateur voit.
 *
 * Composant **serveur**.
 */
import { listerMouvements } from '../../../../src/domaine';
import { JournalMouvements } from '../../../../src/screens/financement/JournalMouvements';
import type { DonneesMouvements } from '../../../../src/screens/financement/JournalMouvements';

export default async function JournalMouvementsPage() {
  const mouvements = await listerMouvements();

  const entrees = mouvements
    .filter((m) => m.montant_fcfa > 0 && m.statut === 'valide')
    .reduce((s, m) => s + m.montant_fcfa, 0);
  const sorties = mouvements
    .filter((m) => m.montant_fcfa < 0 && m.statut === 'valide')
    .reduce((s, m) => s - m.montant_fcfa, 0);

  const donnees: DonneesMouvements = {
    mouvements,
    categories: [...new Set(mouvements.map((m) => m.categorie))].sort((a, b) => a.localeCompare(b, 'fr')),
    synthese: {
      total: mouvements.length,
      // Les mouvements non validés sont exclus des totaux et comptés à part :
      // additionner une pièce en attente à la caisse revient à annoncer un
      // décaissement qui n'a pas eu lieu.
      entrees,
      sorties,
      enAttente: mouvements
        .filter((m) => m.statut === 'en_attente')
        .reduce((s, m) => s + Math.abs(m.montant_fcfa), 0),
    },
  };

  return <JournalMouvements donnees={donnees} />;
}
