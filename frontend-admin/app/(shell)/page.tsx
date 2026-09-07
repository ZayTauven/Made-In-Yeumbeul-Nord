/*
 * Route « / » — Tableau de bord général.
 *
 * Composant **serveur** : il interroge la couche de domaine et passe le résultat,
 * déjà à la forme du contrat d'API, à l'écran de présentation.
 *
 * C'est le point de couture avec le futur backend. Le jour où Django répondra,
 * `domaine/source.ts` appellera l'API au lieu du jeu local : ce fichier ne bouge
 * pas, l'écran non plus.
 *
 * Les écrans vivent dans src/screens et non src/pages : Next traiterait un
 * répertoire `pages/` comme le routeur historique et transformerait chaque écran
 * en route. Le routage App Router ne vit que sous app/.
 */
import {
  journalActivite,
  kpisSuivi,
  listerGroupements,
  listerMouvements,
  obtenirIndicateur,
  repartitionParFiliere,
  repartitionParQuartier,
  resumeFinancement,
} from '../../src/domaine';
import { TableauDeBordGeneral } from '../../src/screens/dashboards/TableauDeBordGeneral';
import type { DonneesTableauBord } from '../../src/screens/dashboards/TableauDeBordGeneral';

export default async function Accueil() {
  // Les appels sont indépendants : les lancer en parallèle plutôt qu'en cascade.
  // Sur la source locale le gain est nul ; sur l'API réelle, il fera la différence
  // entre un écran qui s'affiche et un écran qu'on attend.
  const [
    kpis,
    indicateurRecensement,
    filieres,
    quartiers,
    pageGroupements,
    mouvements,
    journal,
    finance,
  ] = await Promise.all([
    kpisSuivi(),
    obtenirIndicateur('I1.1.1'),
    repartitionParFiliere(),
    repartitionParQuartier(),
    listerGroupements({ tri: 'chiffre_affaires', taille: 4 }),
    listerMouvements(6),
    journalActivite(5),
    resumeFinancement(),
  ]);

  const donnees: DonneesTableauBord = {
    kpis,
    // La courbe suit l'indicateur « groupements recensés » du cadre logique :
    // l'en-tête et le graphique racontent ainsi la même chose.
    progression: indicateurRecensement?.releves ?? [],
    filieres,
    quartiers,
    topGroupements: pageGroupements.results.map((g) => ({
      nom: g.nom,
      slug: g.slug,
      contexte: `${g.filiere.nom} · ${g.quartier.nom}`,
      progression: g.progression,
      chiffreAffaires: g.chiffre_affaires_fcfa,
    })),
    mouvements,
    journal,
    finance: {
      totalDecaisse: finance.total_decaisse_fcfa,
      // Le montant mobilisé n'existe pas encore comme donnée propre : c'est le
      // décaissé augmenté de l'encours non consommé. À remplacer par une valeur
      // servie par l'API quand l'entité « enveloppe » existera côté Django.
      totalMobilise: finance.total_decaisse_fcfa + finance.encours_fcfa,
      totalRembourse: finance.total_rembourse_fcfa,
      encours: finance.encours_fcfa,
    },
    totalGroupements: filieres.reduce((s, f) => s + f.valeur, 0),
  };

  return <TableauDeBordGeneral donnees={donnees} />;
}
