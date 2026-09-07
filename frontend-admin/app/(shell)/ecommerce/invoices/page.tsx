/*
 * Route « ecommerce/invoices » — Décaissements.
 *
 * Le segment d'URL reste celui du template ; le manifeste porte le libellé
 * métier, qui est ce que l'utilisateur voit.
 *
 * Composant **serveur**.
 */
import {
  DATE_REFERENCE,
  listerFinancements,
  resumeFinancement,
} from '../../../../src/domaine';
import { Decaissements } from '../../../../src/screens/financement/Decaissements';
import type { DonneesDecaissements } from '../../../../src/screens/financement/Decaissements';

export default async function DecaissementsPage() {
  const [financements, resume] = await Promise.all([listerFinancements(), resumeFinancement()]);

  const donnees: DonneesDecaissements = {
    financements,
    bailleurs: [...new Set(financements.map((f) => f.bailleur))].sort((a, b) => a.localeCompare(b, 'fr')),
    aujourdhui: DATE_REFERENCE.toISOString().slice(0, 10),
    // Les libellés viennent du résumé, qui les sert déjà pour la répartition par
    // type : deux tables de traduction du même énuméré finiraient par diverger.
    libelleType: {
      subvention: resume.par_type.find((r) => r.slug === 'subvention')?.libelle ?? 'Subvention',
      credit_rotatif: resume.par_type.find((r) => r.slug === 'credit_rotatif')?.libelle ?? 'Crédit rotatif',
      equipement: resume.par_type.find((r) => r.slug === 'equipement')?.libelle ?? 'Équipement',
      fonds_de_roulement:
        resume.par_type.find((r) => r.slug === 'fonds_de_roulement')?.libelle ?? 'Fonds de roulement',
    },
    synthese: {
      totalDecaisse: resume.total_decaisse_fcfa,
      encours: resume.encours_fcfa,
      totalRembourse: resume.total_rembourse_fcfa,
      defaillants: resume.defaillants,
      tauxRemboursement: resume.taux_remboursement,
    },
  };

  return <Decaissements donnees={donnees} />;
}
