/* ATTENTION — COPIE SYNCHRONISEE.
   Le fichier canonique est `frontend-admin/src/domaine/referentiels.ts`.
   Toute modification faite ici sera ecrasee au prochain
   `python tools/synchroniser_domaine.py`. */

/**
 * Référentiels métier — MADE IN YEUMBEUL NORD
 * ===========================================
 *
 * Listes de valeurs stables du projet : quartiers, filières, étapes d'accompagnement,
 * statuts, moyens de paiement, plus les libellés français et les formateurs d'affichage.
 *
 * Un seul endroit à corriger le jour où la mairie amende un libellé ou une liste.
 * Ces mêmes listes alimenteront les fixtures Django (`django-api/core/fixtures/`).
 */

import type {
  EtapeAccompagnement,
  EtatValidation,
  MoyenPaiement,
  StatutActivite,
  StatutJuridique,
  TypeFinancement,
} from './types';

/* ------------------------------------------------------------------------- *
 * Territoire
 * ------------------------------------------------------------------------- */

/** Centroïde approximatif de la commune, point de cadrage par défaut de la carte. */
export const CENTRE_COMMUNE = { latitude: 14.7823, longitude: -17.3762 } as const;
export const ZOOM_COMMUNE = 14;

/**
 * Quartiers de Yeumbeul Nord.
 *
 * ⚠️ LISTE DE TRAVAIL — À FAIRE VALIDER PAR LA COMMUNE avant la démo.
 * Les noms sont plausibles et les coordonnées approchées ; ni l'un ni l'autre ne
 * proviennent d'une source officielle. Un découpage erroné se verrait immédiatement
 * dans la salle. Corriger ici suffit : rien d'autre ne code un nom de quartier en dur.
 */
export const QUARTIERS = [
  { nom: 'Darou Salam', latitude: 14.7871, longitude: -17.3818, population_estimee: 18400 },
  { nom: 'Darou Rahmane', latitude: 14.7845, longitude: -17.3729, population_estimee: 15100 },
  { nom: 'Aïnoumady 1', latitude: 14.7802, longitude: -17.3841, population_estimee: 12800 },
  { nom: 'Aïnoumady 2', latitude: 14.7778, longitude: -17.3806, population_estimee: 11300 },
  { nom: 'Bountou Pikine', latitude: 14.7909, longitude: -17.3771, population_estimee: 16700 },
  { nom: 'Diamalaye', latitude: 14.7756, longitude: -17.3699, population_estimee: 13900 },
  { nom: 'Kip Koko', latitude: 14.7884, longitude: -17.3684, population_estimee: 9600 },
  { nom: 'Nietty Mbar', latitude: 14.7738, longitude: -17.3775, population_estimee: 10400 },
  { nom: 'Yeumbeul Comico', latitude: 14.7817, longitude: -17.3667, population_estimee: 8700 },
  { nom: 'Cité Sotiba', latitude: 14.7862, longitude: -17.3877, population_estimee: 7200 },
] as const;

/* ------------------------------------------------------------------------- *
 * Filières
 * ------------------------------------------------------------------------- */

/**
 * Les 11 filières du projet (CLAUDE.md §4).
 * `teinte` renvoie à un token de rôle Vireo — jamais une couleur en dur, pour que la
 * bascule de charte le jour du logo se fasse sans toucher un seul écran.
 */
export const FILIERES = [
  {
    nom: 'Saponification',
    slug: 'saponification',
    icone: 'bubble',
    teinte: 'var(--ax-chart-1)',
    description: "Fabrication de savons solides et liquides à base d'huiles locales.",
  },
  {
    nom: 'Cosmétiques',
    slug: 'cosmetiques',
    icone: 'droplet',
    teinte: 'var(--ax-chart-2)',
    description: 'Beurre de karité, huiles de soin, laits corporels et produits capillaires.',
  },
  {
    nom: 'Transformation agroalimentaire',
    slug: 'transformation-agroalimentaire',
    icone: 'jar',
    teinte: 'var(--ax-chart-3)',
    description: 'Jus, sirops, confitures, séchage de fruits et conditionnement.',
  },
  {
    nom: 'Céréales',
    slug: 'cereales',
    icone: 'wheat',
    teinte: 'var(--ax-chart-4)',
    description: 'Mil, maïs, niébé : décorticage, mouture, couscous et farines infantiles.',
  },
  {
    nom: 'Maraîchage',
    slug: 'maraichage',
    icone: 'plant-2',
    teinte: 'var(--ax-chart-5)',
    description: 'Cultures de contre-saison sur parcelles urbaines et micro-jardins.',
  },
  {
    nom: 'Artisanat et vannerie',
    slug: 'artisanat-vannerie',
    icone: 'basket',
    teinte: 'var(--ax-chart-6)',
    description: 'Paniers, nattes, objets décoratifs et recyclage de matières.',
  },
  {
    nom: 'Couture',
    slug: 'couture',
    icone: 'needle-thread',
    teinte: 'var(--ax-chart-1)',
    description: 'Confection sur mesure, prêt-à-porter, broderie et teinture.',
  },
  {
    nom: 'Restauration',
    slug: 'restauration',
    icone: 'tools-kitchen-2',
    teinte: 'var(--ax-chart-2)',
    description: 'Cuisine collective, traiteur événementiel et vente de repas préparés.',
  },
  {
    nom: 'Commerce vivrier',
    slug: 'commerce-vivrier',
    icone: 'building-store',
    teinte: 'var(--ax-chart-3)',
    description: 'Approvisionnement et revente de produits de première nécessité.',
  },
  {
    nom: 'Services de coiffure',
    slug: 'services-coiffure',
    icone: 'scissors',
    teinte: 'var(--ax-chart-4)',
    description: 'Salons de quartier, coiffure traditionnelle et soins capillaires.',
  },
  {
    nom: 'Logistique',
    slug: 'logistique',
    icone: 'truck-delivery',
    teinte: 'var(--ax-chart-5)',
    description: 'Transport de marchandises, livraison de proximité et stockage.',
  },
] as const;

/* ------------------------------------------------------------------------- *
 * Parcours d'accompagnement
 * ------------------------------------------------------------------------- */

/** Ordre canonique — l'index vaut avancement dans le parcours. */
export const ETAPES: readonly EtapeAccompagnement[] = [
  'identifie',
  'forme',
  'certifie',
  'formalise',
  'equipe',
  'en_production',
  'autonome',
] as const;

export const LIBELLE_ETAPE: Record<EtapeAccompagnement, string> = {
  identifie: 'Identifié',
  forme: 'Formé',
  certifie: 'Certifié',
  formalise: 'Formalisé',
  equipe: 'Équipé',
  en_production: 'En production',
  autonome: 'Autonome',
};

/** Ce que franchir l'étape signifie concrètement — utilisé en infobulle et sur la fiche. */
export const DEFINITION_ETAPE: Record<EtapeAccompagnement, string> = {
  identifie: 'Le groupement est recensé, sa composition et sa filière sont connues.',
  forme: 'Au moins un module de renforcement de capacités a été suivi par ses membres.',
  certifie: 'Des membres ont obtenu une certification à l’issue d’une formation.',
  formalise: 'Le groupement dispose d’un statut juridique et d’un NINEA.',
  equipe: 'Le groupement a reçu un équipement de production ou un local aménagé.',
  en_production: 'Le groupement produit et commercialise de façon régulière.',
  autonome: 'Le groupement fonctionne sans appui financier ni technique de la commune.',
};

/** Progression associée à chaque étape, en pourcentage du parcours. */
export const PROGRESSION_ETAPE: Record<EtapeAccompagnement, number> = {
  identifie: 8,
  forme: 24,
  certifie: 40,
  formalise: 56,
  equipe: 72,
  en_production: 88,
  autonome: 100,
};

/* ------------------------------------------------------------------------- *
 * Statuts et libellés
 * ------------------------------------------------------------------------- */

export const LIBELLE_STATUT_JURIDIQUE: Record<StatutJuridique, string> = {
  informel: 'Informel',
  gie: "Groupement d'intérêt économique",
  association: 'Association',
  cooperative: 'Coopérative',
};

export const LIBELLE_ETAT_VALIDATION: Record<EtatValidation, string> = {
  brouillon: 'Brouillon',
  soumis: 'En attente de validation',
  valide: 'Validé',
  rejete: 'Rejeté',
};

/** Sémantique de badge Vireo associée à chaque état. */
export const SEMANTIQUE_ETAT_VALIDATION: Record<EtatValidation, string> = {
  brouillon: 'neutral',
  soumis: 'warning',
  valide: 'success',
  rejete: 'danger',
};

export const LIBELLE_STATUT_ACTIVITE: Record<StatutActivite, string> = {
  planifiee: 'Planifiée',
  en_cours: 'En cours',
  terminee: 'Terminée',
  en_retard: 'En retard',
  suspendue: 'Suspendue',
};

export const SEMANTIQUE_STATUT_ACTIVITE: Record<StatutActivite, string> = {
  planifiee: 'info',
  en_cours: 'accent',
  terminee: 'success',
  en_retard: 'danger',
  suspendue: 'neutral',
};

export const LIBELLE_TYPE_FINANCEMENT: Record<TypeFinancement, string> = {
  subvention: 'Subvention',
  credit_rotatif: 'Crédit rotatif',
  equipement: 'Dotation en équipement',
  fonds_de_roulement: 'Fonds de roulement',
};

/** Moyens de paiement du contexte sénégalais. Aucune carte internationale (CLAUDE.md §5). */
export const LIBELLE_MOYEN_PAIEMENT: Record<MoyenPaiement, string> = {
  wave: 'Wave',
  orange_money: 'Orange Money',
  free_money: 'Free Money',
  especes: 'Espèces',
  virement: 'Virement bancaire',
};

export const BAILLEURS = [
  'Commune de Yeumbeul Nord',
  'Fonds de développement local',
  'Agence de développement local',
  'Programme national de la jeunesse',
  'Diaspora — And Jappo',
  'Partenaire technique et financier',
] as const;

/* ------------------------------------------------------------------------- *
 * Anthroponymie
 * ------------------------------------------------------------------------- */

export const PRENOMS_FEMININS = [
  'Aminata', 'Fatou', 'Awa', 'Ndèye', 'Khady', 'Astou', 'Mariama', 'Sokhna',
  'Coumba', 'Bineta', 'Adja', 'Rokhaya', 'Seynabou', 'Maïmouna', 'Dieynaba',
  'Oumou', 'Yacine', 'Aïssatou', 'Mame Diarra', 'Nogaye', 'Kiné', 'Amy',
  'Ramatoulaye', 'Fatoumata', 'Absa', 'Anta', 'Daba', 'Marième', 'Sophie', 'Thioro',
] as const;

export const PRENOMS_MASCULINS = [
  'Moussa', 'Ibrahima', 'Cheikh', 'Modou', 'Ousmane', 'Abdoulaye', 'Mamadou',
  'Babacar', 'Alioune', 'Serigne', 'Assane', 'Lamine', 'Malick', 'Souleymane',
  'Idrissa', 'Amadou', 'El Hadji', 'Pape', 'Djibril', 'Bara', 'Saliou', 'Omar',
  'Insa', 'Bocar', 'Massamba', 'Talla', 'Cheikhouna', 'Doudou', 'Baye', 'Gora',
] as const;

export const NOMS_FAMILLE = [
  'Diop', 'Ndiaye', 'Fall', 'Sow', 'Ba', 'Diallo', 'Sarr', 'Gueye', 'Faye',
  'Mbaye', 'Sy', 'Cissé', 'Thiam', 'Seck', 'Diouf', 'Sène', 'Ndour', 'Camara',
  'Touré', 'Kane', 'Niang', 'Wade', 'Samb', 'Diagne', 'Dieng', 'Lo', 'Mendy',
  'Badji', 'Sagna', 'Coly', 'Bâ', 'Sylla', 'Sonko', 'Tine', 'Diack',
] as const;

/** Rôles au sein d'un groupement, du plus structurant au plus courant. */
export const ROLES_MEMBRE = [
  'Présidente',
  'Vice-présidente',
  'Secrétaire générale',
  'Trésorière',
  'Responsable production',
  'Responsable commercialisation',
  'Chargée de la qualité',
  'Membre',
] as const;

/* ------------------------------------------------------------------------- *
 * Formatage — français du Sénégal, montants en FCFA entiers
 * ------------------------------------------------------------------------- */

/**
 * Formate un montant en FCFA. Jamais de décimale : le franc CFA n'a pas de subdivision
 * en usage courant, et une virgule dans un tableau de suivi budgétaire fait amateur.
 */
export function formaterFcfa(montant: number): string {
  return `${separerMilliers(Math.round(montant))} FCFA`;
}

/**
 * Separe les milliers par une espace fine insecable normalisee.
 * `toLocaleString` produit selon l'environnement U+202F ou U+00A0 ; on normalise
 * pour que le rendu soit identique cote serveur et cote client, faute de quoi React
 * signale une divergence d'hydratation sur chaque montant affiche.
 */
function separerMilliers(valeur: number): string {
  return valeur.toLocaleString('fr-FR').replace(/[\u202f\u00a0\u2009 ]/g, '\u202f');
}

/**
 * Version compacte pour les cartes KPI, où la place manque :
 * 48 200 000 → « 48,2 M FCFA ».
 */
export function formaterFcfaCompact(montant: number): string {
  const absolu = Math.abs(montant);
  if (absolu >= 1_000_000_000) return `${arrondir(montant / 1_000_000_000)} Md FCFA`;
  if (absolu >= 1_000_000) return `${arrondir(montant / 1_000_000)} M FCFA`;
  if (absolu >= 1_000) return `${arrondir(montant / 1_000)} k FCFA`;
  return formaterFcfa(montant);
}

function arrondir(valeur: number): string {
  return valeur.toFixed(1).replace(/\.0$/, '').replace('.', ',');
}

export function formaterNombre(valeur: number): string {
  return separerMilliers(Math.round(valeur));
}

export function formaterPourcentage(valeur: number, decimales = 0): string {
  return `${valeur.toFixed(decimales).replace('.', ',')} %`;
}

const MOIS_COURTS = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

const MOIS_LONGS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

/** « 2026-10-31 » → « 31 oct. 2026 ». */
export function formaterDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MOIS_COURTS[d.getMonth()]} ${d.getFullYear()}`;
}

/** « 2026-10-31 » → « oct. » — abscisses d'une série mensuelle. */
export function formaterMoisCourt(iso: string): string {
  return MOIS_COURTS[new Date(iso).getMonth()];
}

/** « 2026-10-31 » → « oct. 2026 » — graduations d'un échéancier. */
export function formaterMoisAnnee(iso: string): string {
  const d = new Date(iso);
  return `${MOIS_COURTS[d.getMonth()]} ${d.getFullYear()}`;
}

/** « 2026-10-31 » → « 31 octobre 2026 ». */
export function formaterDateLongue(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MOIS_LONGS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Écart au présent, en français : « il y a 3 jours », « à l'instant ». */
export function formaterDepuis(iso: string, maintenant = new Date()): string {
  const minutes = Math.round((maintenant.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.round(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.round(heures / 24);
  if (jours < 31) return `il y a ${jours} j`;
  const mois = Math.round(jours / 30);
  return `il y a ${mois} mois`;
}

/** Slug ASCII à partir d'un libellé français accentué. */
export function slugifier(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Initiales d'un nom complet, pour les avatars à initiales. */
export function initiales(nomComplet: string): string {
  return nomComplet
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot[0]?.toUpperCase() ?? '')
    .join('');
}
