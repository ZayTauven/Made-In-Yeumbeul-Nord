/**
 * Contrat de domaine — MADE IN YEUMBEUL NORD
 * =========================================
 *
 * Ce fichier est la source unique de vérité du modèle métier côté front.
 * Les écrans ne connaissent que ces types ; ils ignorent d'où viennent les données.
 *
 * Convention de nommage : les champs sont en `snake_case`, à l'identique de ce que
 * Django REST Framework sérialise. Aucune couche de transposition ne sera nécessaire
 * le jour de la bascule sur l'API réelle — on remplace la source, pas les écrans.
 *
 * Ce fichier est dupliqué à l'identique dans `frontend-vitrine/src/domaine/types.ts`.
 * C'est le seul point de partage autorisé entre les deux fronts (CLAUDE.md §1).
 */

/* ------------------------------------------------------------------------- *
 * Enveloppes de réponse
 * ------------------------------------------------------------------------- */

/** Pagination DRF standard (`PageNumberPagination`). */
export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Une valeur d'indicateur avec sa tendance — contrat des cartes KPI de Vireo. */
export interface Kpi {
  cle: string;
  libelle: string;
  valeur: number;
  /** Valeur déjà formatée pour l'affichage (« 1 240 », « 48,2 M FCFA »). */
  valeur_affichee: string;
  unite: string;
  /** Variation en % par rapport à la période précédente. */
  delta: number;
  tendance: Tendance;
  /** Série courte alimentant le sparkline de la carte. */
  etincelle: number[];
  /** Cible à atteindre, quand l'indicateur en a une. */
  cible?: number;
}

export type Tendance = 'hausse' | 'baisse' | 'stable';

/** Point de série temporelle avec comparaison à la période précédente. */
export interface PointSerie {
  periode: string;
  valeur: number;
  /** Même période, exercice précédent. Alimente les graphiques comparés. */
  precedent: number;
}

/* ------------------------------------------------------------------------- *
 * Référentiels
 * ------------------------------------------------------------------------- */

/**
 * Étapes d'accompagnement, dans l'ordre canonique (CLAUDE.md §4).
 * L'ordre porte du sens : il alimente l'entonnoir, le pipeline et la progression.
 */
export type EtapeAccompagnement =
  | 'identifie'
  | 'forme'
  | 'certifie'
  | 'formalise'
  | 'equipe'
  | 'en_production'
  | 'autonome';

export type StatutJuridique = 'informel' | 'gie' | 'association' | 'cooperative';

export type Genre = 'femme' | 'homme';

/** États du workflow de validation d'une donnée déclarée par un groupement. */
export type EtatValidation = 'brouillon' | 'soumis' | 'valide' | 'rejete';

export interface Quartier {
  id: number;
  nom: string;
  slug: string;
  /** Latitude du centroïde, pour la carte Leaflet. */
  latitude: number;
  longitude: number;
  /** Population estimée — alimente la couche de densité. */
  population_estimee: number;
  nombre_groupements: number;
}

export interface Filiere {
  id: number;
  nom: string;
  slug: string;
  description: string;
  /** Nom d'icône Tabler (outline, 24×24, currentColor). */
  icone: string;
  /** Token de rôle Vireo pour la teinte de la filière — jamais une couleur en dur. */
  teinte: string;
  nombre_groupements: number;
  nombre_productions: number;
}

/* ------------------------------------------------------------------------- *
 * Groupements et membres
 * ------------------------------------------------------------------------- */

export interface Membre {
  id: number;
  groupement_id: number;
  prenom: string;
  nom_famille: string;
  nom_complet: string;
  initiales: string;
  genre: Genre;
  age: number;
  telephone: string;
  role: string;
  /** Teinte de l'avatar à initiales — aucun portrait réel n'incarne une personne fictive. */
  avatar_teinte: string;
  date_adhesion: string;
  nombre_formations_suivies: number;
  nombre_certifications: number;
}

export interface Groupement {
  id: number;
  nom: string;
  slug: string;
  description: string;

  quartier: Quartier;
  latitude: number;
  longitude: number;

  filiere: Filiere;
  filieres_secondaires: string[];

  statut_juridique: StatutJuridique;
  ninea: string | null;
  etape: EtapeAccompagnement;
  /** Avancement dans le parcours d'accompagnement, 0–100. Dérivé de l'étape et des jalons franchis. */
  progression: number;

  nombre_membres: number;
  /** Part de femmes dans l'effectif, 0–100. Indicateur de genre suivi par la mairie. */
  part_femmes: number;

  nombre_productions: number;
  chiffre_affaires_fcfa: number;
  financement_recu_fcfa: number;

  telephone: string;
  email: string | null;
  responsable: string;

  date_creation: string;
  date_formalisation: string | null;
  note_moyenne: number;
  nombre_appreciations: number;

  /** Chemin local d'illustration. Jamais d'URL distante (CLAUDE.md §5). */
  photo: string;
  etat_validation: EtatValidation;
}

/* ------------------------------------------------------------------------- *
 * Productions
 * ------------------------------------------------------------------------- */

export interface Production {
  id: number;
  groupement_id: number;
  groupement_nom: string;
  groupement_slug: string;
  filiere_id: number;
  filiere_nom: string;
  filiere_slug: string;

  nom: string;
  slug: string;
  description: string;

  prix_unitaire_fcfa: number;
  /** Prix barré, quand la production est en promotion. */
  prix_barre_fcfa: number | null;
  unite: string;

  stock_disponible: number;
  seuil_alerte: number;
  disponible: boolean;

  photo: string;
  photos_additionnelles: string[];

  note_moyenne: number;
  nombre_appreciations: number;
  date_ajout: string;
  etiquettes: string[];
  etat_validation: EtatValidation;
}

/* ------------------------------------------------------------------------- *
 * Suivi-évaluation — la part que le modèle Django ne couvre pas encore
 * ------------------------------------------------------------------------- */

export type StatutActivite = 'planifiee' | 'en_cours' | 'terminee' | 'en_retard' | 'suspendue';

export interface Activite {
  id: number;
  code: string;
  intitule: string;
  description: string;
  /** Axe du cadre logique auquel l'activité se rattache. */
  axe_id: number;
  responsable: string;
  responsable_initiales: string;
  quartiers: string[];
  filieres: string[];

  date_debut: string;
  date_fin: string;
  avancement: number;
  statut: StatutActivite;

  budget_prevu_fcfa: number;
  budget_consomme_fcfa: number;
  groupements_beneficiaires: number;
}

export interface Jalon {
  id: number;
  activite_id: number | null;
  intitule: string;
  description: string;
  date_prevue: string;
  date_reelle: string | null;
  statut: 'a_venir' | 'atteint' | 'manque';
  /** Un jalon décisif est mis en exergue sur la chronologie de la démo. */
  decisif: boolean;
}

/**
 * Cadre logique : Axe → Résultat attendu → Indicateur.
 * Structure arborescente absente des deux templates comme du modèle Django : elle est
 * définie ici parce que c'est le cœur d'un outil de suivi-évaluation.
 */
export interface AxeStrategique {
  id: number;
  code: string;
  intitule: string;
  description: string;
  teinte: string;
  avancement: number;
}

export interface ResultatAttendu {
  id: number;
  axe_id: number;
  code: string;
  intitule: string;
  avancement: number;
}

export type PeriodiciteCollecte = 'mensuelle' | 'trimestrielle' | 'semestrielle' | 'annuelle';

export interface Indicateur {
  id: number;
  resultat_id: number;
  axe_id: number;
  code: string;
  intitule: string;
  unite: string;

  valeur_reference: number;
  valeur_actuelle: number;
  valeur_cible: number;
  /**
   * Sens d'amélioration de l'indicateur.
   * `decroissant` pour ceux qu'on cherche à faire baisser — un délai, un taux
   * d'abandon. Sans cette distinction, un délai moyen de 118 jours pour une cible
   * de 90 s'afficherait à 131 % d'atteinte, c'est-à-dire en réussite éclatante.
   */
  sens: 'croissant' | 'decroissant';

  /** Taux d'atteinte de la cible, 0–100 et au-delà. Alimente les jauges radiales. */
  taux_atteinte: number;

  periodicite: PeriodiciteCollecte;
  source_donnee: string;
  date_derniere_collecte: string;
  /** Historique des relevés, du plus ancien au plus récent. */
  releves: PointSerie[];
  tendance: Tendance;
  /** Un indicateur sensible au genre est ventilé femmes / hommes. */
  ventile_par_genre: boolean;
}

/* ------------------------------------------------------------------------- *
 * Formations
 * ------------------------------------------------------------------------- */

export interface Formation {
  id: number;
  nom: string;
  slug: string;
  description: string;
  type_module: 'technique' | 'gestion' | 'commercial' | 'organisationnel';
  filiere_nom: string | null;
  duree_heures: number;
  cout_par_participant_fcfa: number;
  nombre_sessions: number;
  nombre_participants: number;
  taux_certification: number;
}

export interface SessionFormation {
  id: number;
  formation_id: number;
  formation_nom: string;
  date_debut: string;
  date_fin: string;
  lieu: string;
  quartier: string;
  formateur: string;
  effectif_cible: number;
  effectif_present: number;
  taux_presence: number;
  statut: 'planifiee' | 'en_cours' | 'terminee' | 'annulee';
}

export interface Certification {
  id: number;
  membre_id: number;
  membre_nom: string;
  groupement_nom: string;
  formation_nom: string;
  date_certification: string;
  score: number;
  numero_certificat: string;
}

/* ------------------------------------------------------------------------- *
 * Financement
 * ------------------------------------------------------------------------- */

export type TypeFinancement = 'subvention' | 'credit_rotatif' | 'equipement' | 'fonds_de_roulement';

export interface Financement {
  id: number;
  reference: string;
  groupement_id: number;
  groupement_nom: string;
  type_financement: TypeFinancement;
  montant_fcfa: number;
  montant_rembourse_fcfa: number;
  bailleur: string;
  date_decaissement: string;
  date_prevue_remboursement: string | null;
  statut: 'decaisse' | 'remboursement_partiel' | 'rembourse' | 'defaillant';
  objet: string;
}

/** Aucun moyen de paiement international (CLAUDE.md §5). */
export type MoyenPaiement = 'wave' | 'orange_money' | 'free_money' | 'especes' | 'virement';

/** Mouvement financier unitaire — alimente le journal des décaissements. */
export interface MouvementFinancier {
  id: number;
  reference: string;
  libelle: string;
  contrepartie: string;
  categorie: string;
  /** Signé : négatif pour une sortie de caisse. */
  montant_fcfa: number;
  date: string;
  moyen: MoyenPaiement;
  statut: 'valide' | 'en_attente' | 'rejete';
}

/* ------------------------------------------------------------------------- *
 * Commandes (vitrine)
 * ------------------------------------------------------------------------- */

export interface LigneCommande {
  production_id: number;
  production_nom: string;
  production_photo: string;
  groupement_nom: string;
  quantite: number;
  prix_unitaire_fcfa: number;
  unite: string;
}

export interface Commande {
  id: number;
  numero: string;
  statut: 'panier' | 'confirmee' | 'preparee' | 'livree' | 'annulee';
  client_nom: string;
  client_telephone: string;
  adresse_livraison: string;
  quartier: string;
  lignes: LigneCommande[];
  montant_total_fcfa: number;
  moyen_paiement: MoyenPaiement;
  date_creation: string;
}

/* ------------------------------------------------------------------------- *
 * Transverse
 * ------------------------------------------------------------------------- */

export interface Actualite {
  id: number;
  titre: string;
  slug: string;
  chapeau: string;
  contenu: string;
  photo: string;
  categorie: string;
  auteur: string;
  date_publication: string;
  temps_lecture_min: number;
}

/** Piste d'audit : qui a fait quoi, sur quoi, quand. */
export interface EvenementJournal {
  id: number;
  acteur: string;
  acteur_initiales: string;
  acteur_teinte: string;
  action: string;
  cible: string;
  cible_lien: string | null;
  horodatage: string;
  categorie: 'groupement' | 'production' | 'formation' | 'financement' | 'activite' | 'systeme';
}

export interface Boutique {
  id: number;
  nom: string;
  adresse: string;
  quartier: string;
  latitude: number;
  longitude: number;
  telephone: string;
  responsable: string;
  heure_ouverture: string;
  heure_fermeture: string;
  note_moyenne: number;
}
