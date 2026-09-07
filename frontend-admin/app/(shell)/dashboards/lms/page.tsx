/*
 * Route « dashboards/lms » — Tableau de bord des formations.
 *
 * Composant **serveur**. Les agrégats viennent de `domaine/source.ts`
 * (`GET /api/formations/resume/` et `GET /api/suivi/kpis/?tableau=formations`) ;
 * il ne reste ici que la mise en forme des listes affichées.
 */
import {
  DATE_REFERENCE,
  formaterMoisCourt,
  initiales,
  kpisFormations,
  listerCertifications,
  listerFormations,
  listerSessions,
  resumeFormations,
} from '../../../../src/domaine';
import type { Certification } from '../../../../src/domaine';
import { TableauDeBordFormations } from '../../../../src/screens/dashboards/TableauDeBordFormations';
import type {
  DonneesFormations,
  LigneCertification,
  LigneModule,
  SessionAVenir,
} from '../../../../src/screens/dashboards/TableauDeBordFormations';

/** Modules détaillés dans les deux cartes qui en listent. */
const MODULES_EN_TETE = 5;
/** Sessions annoncées dans la carte du calendrier. */
const SESSIONS_ANNONCEES = 4;
/** Une session est « imminente » si elle démarre dans les trois semaines. */
const JOURS_IMMINENCE = 21;

const JOUR_MS = 86_400_000;

const LIBELLE_TYPE: Record<string, string> = {
  technique: 'Technique métier',
  gestion: 'Gestion',
  commercial: 'Commercial',
  organisationnel: 'Vie associative',
};

export default async function TableauDeBordFormationsPage() {
  const [kpis, resume, formations, sessions, certifications] = await Promise.all([
    kpisFormations(),
    resumeFormations(),
    listerFormations(),
    listerSessions(),
    listerCertifications(),
  ]);

  // Les modules sont classés par présences : c'est ce qui décide de ce que la
  // coordination reconduit l'année suivante.
  const modulesEnTete: LigneModule[] = [...formations]
    .sort((x, y) => y.nombre_participants - x.nombre_participants)
    .slice(0, MODULES_EN_TETE)
    .map((f) => ({
      slug: f.slug,
      nom: f.nom,
      type: LIBELLE_TYPE[f.type_module] ?? f.type_module,
      filiere: f.filiere_nom,
      participants: f.nombre_participants,
      sessions: f.nombre_sessions,
      heures: f.duree_heures,
      tauxCertification: f.taux_certification,
      coutParParticipant: f.cout_par_participant_fcfa,
    }));

  const prochainesSessions: SessionAVenir[] = sessions
    .filter((s) => s.statut === 'planifiee')
    .sort((x, y) => x.date_debut.localeCompare(y.date_debut))
    .slice(0, SESSIONS_ANNONCEES)
    .map((s) => {
      const debut = new Date(s.date_debut);
      const jours = Math.round((debut.getTime() - DATE_REFERENCE.getTime()) / JOUR_MS);
      return {
        id: s.id,
        jour: String(debut.getDate()),
        mois: formaterMoisCourt(s.date_debut),
        module: s.formation_nom,
        formateur: s.formateur,
        lieu: s.lieu,
        quartier: s.quartier,
        effectifCible: s.effectif_cible,
        imminente: jours <= JOURS_IMMINENCE,
      };
    });

  /*
   * Un jury certifie une promotion entière le même jour : les cinq certifications
   * les plus récentes viennent donc toutes de la même session, et la colonne
   * « Module » répète cinq fois la même ligne. On retient le dernier jury de
   * chaque module — c'est aussi plus utile à lire, puisqu'on voit d'un coup d'œil
   * quels cycles ont récemment abouti.
   */
  const dernierParModule = new Map<string, Certification>();
  for (const c of certifications) {
    const courant = dernierParModule.get(c.formation_nom);
    if (!courant || c.date_certification > courant.date_certification) {
      dernierParModule.set(c.formation_nom, c);
    }
  }

  const dernieresCertifications: LigneCertification[] = [...dernierParModule.values()]
    .sort((x, y) => y.date_certification.localeCompare(x.date_certification))
    .slice(0, 5)
    .map((c) => ({
      id: c.id,
      membre: c.membre_nom,
      // Avatar à initiales : les membres sont fictifs, aucun portrait du corpus
      // photographique ne doit servir à incarner une identité inventée.
      initiales: initiales(c.membre_nom),
      groupement: c.groupement_nom,
      module: c.formation_nom,
      date: c.date_certification,
      score: c.score,
    }));

  const donnees: DonneesFormations = {
    kpis,
    activiteMensuelle: resume.activite_mensuelle,
    parType: resume.par_type.map((r) => ({
      libelle: r.libelle,
      slug: r.slug,
      valeur: r.valeur,
      part: r.part,
    })),
    modulesEnTete,
    prochainesSessions,
    formateurs: resume.formateurs.slice(0, 4).map((f) => ({
      nom: f.nom,
      initiales: initiales(f.nom),
      sessions: f.sessions,
      participants: f.participants,
    })),
    certifications: dernieresCertifications,
    chiffres: {
      totalModules: resume.total_modules,
      participations: resume.participations,
      membresFormes: resume.membres_formes,
      membresCertifies: resume.membres_certifies,
      certificatsDelivres: resume.certificats_delivres,
      tauxPresence: resume.taux_presence_moyen,
      tauxCertification: resume.taux_certification_moyen,
      heuresDispensees: resume.heures_dispensees,
      coutTotal: resume.cout_total_fcfa,
      sessionsAVenir: resume.sessions_a_venir,
    },
  };

  return <TableauDeBordFormations donnees={donnees} />;
}
