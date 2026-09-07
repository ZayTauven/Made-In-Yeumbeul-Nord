/*
 * Route « ecommerce/customer-details » — Fiche groupement.
 *
 * Composant **serveur**. Le groupement affiché est choisi par le paramètre
 * `?groupement=<slug>` ; sans paramètre, la fiche ouvre sur le premier de
 * l'annuaire, ce qui permet d'atteindre l'écran depuis le menu sans passer par
 * une liste.
 *
 * Le segment d'URL reste celui du template. Le jour où les routes seront
 * réécrites en `/groupements/[slug]`, seul ce fichier bouge : l'écran reçoit
 * déjà un groupement complet, pas un identifiant à résoudre.
 */
import { notFound } from 'next/navigation';
import {
  financementsDuGroupement,
  formaterDate,
  listerGroupements,
  membresDuGroupement,
  obtenirGroupement,
  productionsDuGroupement,
} from '../../../../src/domaine';
import { FicheGroupement } from '../../../../src/screens/groupements/FicheGroupement';
import type { DonneesFiche } from '../../../../src/screens/groupements/FicheGroupement';

/** Productions détaillées dans le graphique de valeur de stock. */
const PRODUCTIONS_AU_GRAPHIQUE = 6;

export default async function FicheGroupementPage({
  searchParams,
}: {
  searchParams: Promise<{ groupement?: string }>;
}) {
  const { groupement: slug } = await searchParams;

  const groupement = slug
    ? await obtenirGroupement(slug)
    : (await listerGroupements({ taille: 1 })).results[0];

  if (!groupement) notFound();

  const [membres, productions, financements] = await Promise.all([
    membresDuGroupement(groupement.id),
    productionsDuGroupement(groupement.id),
    financementsDuGroupement(groupement.id),
  ]);

  // Valeur du stock : prix unitaire multiplié par la quantité disponible. C'est
  // le seul chiffre par production que le modèle permet de calculer — il n'y a
  // pas d'historique de ventes par article, et en inventer un ferait dire à
  // l'écran plus que ce que la commune sait.
  const valeurStock = productions
    .map((p) => ({ nom: p.nom, valeur: p.prix_unitaire_fcfa * p.stock_disponible }))
    .sort((a, b) => b.valeur - a.valeur)
    .slice(0, PRODUCTIONS_AU_GRAPHIQUE);

  const donnees: DonneesFiche = {
    groupement,
    membres,
    productions,
    financements,
    valeurStock,
    // Notes de suivi : la coordination en tient sur chaque groupement. Elles ne
    // sont pas encore une entité du modèle — à créer côté Django avec l'auteur
    // et l'horodatage, puisqu'une note non signée n'a aucune valeur d'audit.
    notes: [
      {
        auteur: 'Khady Sène',
        quand: formaterDate(groupement.date_creation),
        corps: `Fiche ouverte lors du recensement du quartier de ${groupement.quartier.nom}. Filière principale déclarée : ${groupement.filiere.nom.toLowerCase()}.`,
      },
    ],
    totaux: {
      financementRecu: financements.reduce((s, f) => s + f.montant_fcfa, 0),
      valeurCatalogue: productions.reduce((s, p) => s + p.prix_unitaire_fcfa * p.stock_disponible, 0),
      productionsEnAlerte: productions.filter((p) => p.stock_disponible <= p.seuil_alerte).length,
    },
  };

  return <FicheGroupement donnees={donnees} />;
}
