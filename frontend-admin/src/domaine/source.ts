/**
 * Source de données — MADE IN YEUMBEUL NORD
 * =========================================
 *
 * **C'est ici que les fronts dictent le contrat de l'API.**
 *
 * Chaque fonction exportée porte en commentaire la route Django qui devra la servir,
 * avec ses paramètres. Tant que `NEXT_PUBLIC_API_URL` n'est pas défini, elle répond
 * depuis le jeu de données local ; le jour où l'API existe, seul le corps de la
 * fonction change — aucune signature, donc aucun écran.
 *
 * Toutes les fonctions sont asynchrones, y compris en mode local. C'est délibéré :
 * un écran écrit contre une source synchrone se réécrit intégralement le jour de la
 * bascule. Le coût d'un `await` aujourd'hui évite une reprise complète demain.
 *
 * La spécification lisible par le backend est tenue à jour dans
 * `PLAN & PRODUCT/15-CONTRAT-API.md`.
 */

import { ETAPES, PROGRESSION_ETAPE, formaterFcfaCompact, formaterNombre } from './referentiels';
import { DATE_REFERENCE, jeuDeDonnees } from './generateur';
import type {
  Activite,
  Actualite,
  AxeStrategique,
  Boutique,
  Certification,
  Commande,
  EtapeAccompagnement,
  EvenementJournal,
  Filiere,
  Financement,
  Formation,
  Groupement,
  Indicateur,
  Jalon,
  Kpi,
  Membre,
  MouvementFinancier,
  Page,
  PointSerie,
  Production,
  Quartier,
  ResultatAttendu,
  StatutActivite,
  SessionFormation,
} from './types';

/** Vrai lorsque l'API Django est branchée. Aucun écran n'a besoin de le savoir. */
export const API_BRANCHEE = Boolean(process.env.NEXT_PUBLIC_API_URL);

function paginer<T>(elements: T[], page = 1, taille = 24): Page<T> {
  const debut = (page - 1) * taille;
  const tranche = elements.slice(debut, debut + taille);
  return {
    count: elements.length,
    next: debut + taille < elements.length ? `?page=${page + 1}` : null,
    previous: page > 1 ? `?page=${page - 1}` : null,
    results: tranche,
  };
}

function sansAccent(texte: string): string {
  return texte.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/* ========================================================================= *
 * Référentiels
 * ========================================================================= */

/** `GET /api/quartiers/` */
export async function listerQuartiers(): Promise<Quartier[]> {
  return jeuDeDonnees().quartiers;
}

/** `GET /api/filieres/` */
export async function listerFilieres(): Promise<Filiere[]> {
  return jeuDeDonnees().filieres;
}

/* ========================================================================= *
 * Groupements
 * ========================================================================= */

export interface FiltresGroupements {
  page?: number;
  taille?: number;
  recherche?: string;
  filiere?: string;
  quartier?: string;
  etape?: EtapeAccompagnement;
  statut_juridique?: string;
  tri?: 'nom' | 'membres' | 'progression' | 'chiffre_affaires' | 'note';
}

/**
 * `GET /api/groupements/`
 * Paramètres : `page`, `page_size`, `search`, `filiere`, `quartier`, `etape`,
 * `statut_juridique`, `ordering`.
 */
export async function listerGroupements(filtres: FiltresGroupements = {}): Promise<Page<Groupement>> {
  let liste = [...jeuDeDonnees().groupements];

  if (filtres.recherche) {
    const q = sansAccent(filtres.recherche);
    liste = liste.filter(
      (g) =>
        sansAccent(g.nom).includes(q) ||
        sansAccent(g.quartier.nom).includes(q) ||
        sansAccent(g.filiere.nom).includes(q) ||
        sansAccent(g.responsable).includes(q),
    );
  }
  if (filtres.filiere) liste = liste.filter((g) => g.filiere.slug === filtres.filiere);
  if (filtres.quartier) liste = liste.filter((g) => g.quartier.slug === filtres.quartier);
  if (filtres.etape) liste = liste.filter((g) => g.etape === filtres.etape);
  if (filtres.statut_juridique) liste = liste.filter((g) => g.statut_juridique === filtres.statut_juridique);

  switch (filtres.tri) {
    case 'membres':
      liste.sort((x, y) => y.nombre_membres - x.nombre_membres);
      break;
    case 'progression':
      liste.sort((x, y) => y.progression - x.progression);
      break;
    case 'chiffre_affaires':
      liste.sort((x, y) => y.chiffre_affaires_fcfa - x.chiffre_affaires_fcfa);
      break;
    case 'note':
      liste.sort((x, y) => y.note_moyenne - x.note_moyenne);
      break;
    default:
      liste.sort((x, y) => x.nom.localeCompare(y.nom, 'fr'));
  }

  return paginer(liste, filtres.page ?? 1, filtres.taille ?? 24);
}

/** `GET /api/groupements/{slug}/` */
export async function obtenirGroupement(slug: string): Promise<Groupement | null> {
  return jeuDeDonnees().groupements.find((g) => g.slug === slug) ?? null;
}

/** `GET /api/groupements/{slug}/membres/` */
export async function membresDuGroupement(groupementId: number): Promise<Membre[]> {
  return jeuDeDonnees().membres.filter((m) => m.groupement_id === groupementId);
}

/** `GET /api/groupements/{slug}/productions/` */
export async function productionsDuGroupement(groupementId: number): Promise<Production[]> {
  return jeuDeDonnees().productions.filter((p) => p.groupement_id === groupementId);
}

/** `GET /api/groupements/{slug}/financements/` */
export async function financementsDuGroupement(groupementId: number): Promise<Financement[]> {
  return jeuDeDonnees().financements.filter((f) => f.groupement_id === groupementId);
}

/**
 * `GET /api/groupements/carte/`
 * Charge allégée pour la carte : ni description, ni photo, ni compteurs détaillés.
 * Sur 100 points, le gain est mince ; sur mille, il devient nécessaire.
 */
export interface PointCarte {
  id: number;
  nom: string;
  slug: string;
  latitude: number;
  longitude: number;
  quartier: string;
  filiere: string;
  filiere_teinte: string;
  etape: EtapeAccompagnement;
  nombre_membres: number;
}

export async function groupementsSurLaCarte(): Promise<PointCarte[]> {
  return jeuDeDonnees().groupements.map((g) => ({
    id: g.id,
    nom: g.nom,
    slug: g.slug,
    latitude: g.latitude,
    longitude: g.longitude,
    quartier: g.quartier.nom,
    filiere: g.filiere.nom,
    filiere_teinte: g.filiere.teinte,
    etape: g.etape,
    nombre_membres: g.nombre_membres,
  }));
}

/* ========================================================================= *
 * Productions
 * ========================================================================= */

export interface FiltresProductions {
  page?: number;
  taille?: number;
  recherche?: string;
  filiere?: string;
  quartier?: string;
  groupement?: string;
  prix_min?: number;
  prix_max?: number;
  disponible?: boolean;
  tri?: 'nom' | 'prix_croissant' | 'prix_decroissant' | 'note' | 'nouveaute';
}

/**
 * `GET /api/productions/`
 * Paramètres : `page`, `page_size`, `search`, `filiere`, `quartier`, `groupement`,
 * `prix_min`, `prix_max`, `disponible`, `ordering`.
 */
export async function listerProductions(filtres: FiltresProductions = {}): Promise<Page<Production>> {
  const { groupements } = jeuDeDonnees();
  let liste = [...jeuDeDonnees().productions];

  if (filtres.recherche) {
    const q = sansAccent(filtres.recherche);
    liste = liste.filter(
      (p) => sansAccent(p.nom).includes(q) || sansAccent(p.groupement_nom).includes(q),
    );
  }
  if (filtres.filiere) liste = liste.filter((p) => p.filiere_slug === filtres.filiere);
  if (filtres.groupement) liste = liste.filter((p) => p.groupement_slug === filtres.groupement);
  if (filtres.quartier) {
    const idsQuartier = new Set(
      groupements.filter((g) => g.quartier.slug === filtres.quartier).map((g) => g.id),
    );
    liste = liste.filter((p) => idsQuartier.has(p.groupement_id));
  }
  if (filtres.prix_min !== undefined) liste = liste.filter((p) => p.prix_unitaire_fcfa >= filtres.prix_min!);
  if (filtres.prix_max !== undefined) liste = liste.filter((p) => p.prix_unitaire_fcfa <= filtres.prix_max!);
  if (filtres.disponible) liste = liste.filter((p) => p.disponible);

  switch (filtres.tri) {
    case 'prix_croissant':
      liste.sort((x, y) => x.prix_unitaire_fcfa - y.prix_unitaire_fcfa);
      break;
    case 'prix_decroissant':
      liste.sort((x, y) => y.prix_unitaire_fcfa - x.prix_unitaire_fcfa);
      break;
    case 'note':
      liste.sort((x, y) => y.note_moyenne - x.note_moyenne);
      break;
    case 'nouveaute':
      liste.sort((x, y) => y.date_ajout.localeCompare(x.date_ajout));
      break;
    default:
      liste.sort((x, y) => x.nom.localeCompare(y.nom, 'fr'));
  }

  return paginer(liste, filtres.page ?? 1, filtres.taille ?? 24);
}

/** `GET /api/productions/{slug}/` */
export async function obtenirProduction(slug: string): Promise<Production | null> {
  return jeuDeDonnees().productions.find((p) => p.slug === slug) ?? null;
}

/** `GET /api/productions/{slug}/similaires/` */
export async function productionsSimilaires(production: Production, limite = 4): Promise<Production[]> {
  return jeuDeDonnees()
    .productions.filter((p) => p.filiere_id === production.filiere_id && p.id !== production.id)
    .slice(0, limite);
}

/** `GET /api/productions/en-rupture/` — alimente les alertes du tableau de bord. */
export async function productionsEnAlerte(): Promise<Production[]> {
  return jeuDeDonnees().productions.filter((p) => p.stock_disponible <= p.seuil_alerte);
}

/* ========================================================================= *
 * Suivi-évaluation
 * ========================================================================= */

/**
 * `GET /api/suivi/kpis/`
 * Les quatre cartes d'en-tête du tableau de bord de la coordination.
 *
 * Chaque valeur est recalculée à partir des entités, jamais saisie à part : un KPI
 * qui contredit le tableau situé juste en dessous décrédibilise tout l'écran.
 */
export async function kpisSuivi(): Promise<Kpi[]> {
  const { groupements, membres, productions, financements } = jeuDeDonnees();

  const totalMembres = membres.length;
  const femmes = membres.filter((m) => m.genre === 'femme').length;
  const decaisse = financements.reduce((s, f) => s + f.montant_fcfa, 0);
  const enProduction = groupements.filter(
    (g) => g.etape === 'en_production' || g.etape === 'autonome',
  ).length;

  return [
    {
      cle: 'groupements',
      libelle: 'Groupements accompagnés',
      valeur: groupements.length,
      valeur_affichee: formaterNombre(groupements.length),
      unite: 'groupements',
      delta: 8.7,
      tendance: 'hausse',
      etincelle: [62, 68, 71, 78, 84, 89, 94, 100],
      cible: 100,
    },
    {
      cle: 'membres',
      libelle: 'Membres recensés',
      valeur: totalMembres,
      valeur_affichee: formaterNombre(totalMembres),
      unite: 'membres',
      delta: 12.4,
      tendance: 'hausse',
      etincelle: [780, 890, 980, 1070, 1180, 1290, 1380, totalMembres],
      cible: 1800,
    },
    {
      cle: 'part_femmes',
      libelle: 'Part de femmes',
      valeur: Math.round((femmes / totalMembres) * 100),
      valeur_affichee: `${Math.round((femmes / totalMembres) * 100)} %`,
      unite: '%',
      delta: 1.8,
      tendance: 'hausse',
      etincelle: [84, 85, 85, 86, 86, 87, 87, 88],
    },
    {
      cle: 'decaissements',
      libelle: 'Montant décaissé',
      valeur: decaisse,
      valeur_affichee: formaterFcfaCompact(decaisse),
      unite: 'FCFA',
      delta: 22.1,
      tendance: 'hausse',
      etincelle: [12, 19, 27, 38, 46, 58, 71, 85],
      cible: 85_000_000,
    },
    {
      cle: 'productions',
      libelle: 'Productions au catalogue',
      valeur: productions.length,
      valeur_affichee: formaterNombre(productions.length),
      unite: 'productions',
      delta: 15.6,
      tendance: 'hausse',
      etincelle: [92, 118, 147, 178, 213, 248, 281, productions.length],
      cible: 300,
    },
    {
      cle: 'en_production',
      libelle: 'Groupements en production',
      valeur: enProduction,
      valeur_affichee: formaterNombre(enProduction),
      unite: 'groupements',
      delta: 6.3,
      tendance: 'hausse',
      etincelle: [4, 7, 9, 12, 14, 16, 18, enProduction],
      cible: 55,
    },
  ];
}

export interface EtapeEntonnoir {
  etape: EtapeAccompagnement;
  effectif: number;
  /** Part du total, 0–100. */
  part: number;
  /** Position dans le parcours, 0–100. */
  progression: number;
}

/**
 * `GET /api/suivi/entonnoir/`
 * Répartition des groupements sur le parcours d'accompagnement.
 */
export async function entonnoirAccompagnement(): Promise<EtapeEntonnoir[]> {
  const { groupements } = jeuDeDonnees();
  return ETAPES.map((etape) => {
    const effectif = groupements.filter((g) => g.etape === etape).length;
    return {
      etape,
      effectif,
      part: Math.round((effectif / groupements.length) * 100),
      progression: PROGRESSION_ETAPE[etape],
    };
  });
}

export interface Repartition {
  libelle: string;
  slug: string;
  valeur: number;
  part: number;
  teinte?: string;
}

/** `GET /api/suivi/repartition/?axe=filiere` */
export async function repartitionParFiliere(): Promise<Repartition[]> {
  const { filieres, groupements } = jeuDeDonnees();
  return filieres
    .map((f) => ({
      libelle: f.nom,
      slug: f.slug,
      valeur: f.nombre_groupements,
      part: Math.round((f.nombre_groupements / groupements.length) * 100),
      teinte: f.teinte,
    }))
    .sort((x, y) => y.valeur - x.valeur);
}

/** `GET /api/suivi/repartition/?axe=quartier` */
export async function repartitionParQuartier(): Promise<Repartition[]> {
  const { quartiers, groupements } = jeuDeDonnees();
  return quartiers
    .map((q) => ({
      libelle: q.nom,
      slug: q.slug,
      valeur: q.nombre_groupements,
      part: Math.round((q.nombre_groupements / groupements.length) * 100),
    }))
    .sort((x, y) => y.valeur - x.valeur);
}

/** `GET /api/suivi/repartition/?axe=genre` */
export async function repartitionParGenre(): Promise<Repartition[]> {
  const { membres } = jeuDeDonnees();
  const femmes = membres.filter((m) => m.genre === 'femme').length;
  const hommes = membres.length - femmes;
  return [
    { libelle: 'Femmes', slug: 'femme', valeur: femmes, part: Math.round((femmes / membres.length) * 100) },
    { libelle: 'Hommes', slug: 'homme', valeur: hommes, part: Math.round((hommes / membres.length) * 100) },
  ];
}

/** Croisement quartier × filière — alimente la table d'analyse territoriale. */
export interface CelluleCroisee {
  quartier: string;
  valeurs: Record<string, number>;
  total: number;
}

/** `GET /api/suivi/croisement/?lignes=quartier&colonnes=filiere` */
export async function croisementQuartierFiliere(): Promise<{
  colonnes: string[];
  lignes: CelluleCroisee[];
}> {
  const { quartiers, filieres, groupements } = jeuDeDonnees();
  const colonnes = filieres.map((f) => f.nom);

  const lignes = quartiers.map((q) => {
    const valeurs: Record<string, number> = {};
    let total = 0;
    for (const f of filieres) {
      const n = groupements.filter((g) => g.quartier.id === q.id && g.filiere.id === f.id).length;
      valeurs[f.nom] = n;
      total += n;
    }
    return { quartier: q.nom, valeurs, total };
  });

  return { colonnes, lignes };
}

/* ------------------------------------------------------------------------- *
 * Cadre logique
 * ------------------------------------------------------------------------- */

export interface CadreLogique {
  axes: AxeStrategique[];
  resultats: ResultatAttendu[];
  indicateurs: Indicateur[];
}

/**
 * `GET /api/suivi/cadre-logique/`
 * Arbre complet Axe → Résultat attendu → Indicateur, avec les valeurs relevées.
 * Aucune de ces trois entités n'existe encore côté Django : elles sont à créer.
 */
export async function cadreLogique(): Promise<CadreLogique> {
  const { axes, resultats, indicateurs } = jeuDeDonnees();
  return { axes, resultats, indicateurs };
}

/** `GET /api/suivi/indicateurs/{code}/` */
export async function obtenirIndicateur(code: string): Promise<Indicateur | null> {
  return jeuDeDonnees().indicateurs.find((i) => i.code === code) ?? null;
}

/* ------------------------------------------------------------------------- *
 * Activités et jalons
 * ------------------------------------------------------------------------- */

/** `GET /api/activites/` */
export async function listerActivites(filtres: { axe?: number; statut?: string } = {}): Promise<Activite[]> {
  let liste = [...jeuDeDonnees().activites];
  if (filtres.axe) liste = liste.filter((x) => x.axe_id === filtres.axe);
  if (filtres.statut) liste = liste.filter((x) => x.statut === filtres.statut);
  return liste;
}

/** `GET /api/activites/{code}/` */
export async function obtenirActivite(code: string): Promise<Activite | null> {
  return jeuDeDonnees().activites.find((x) => x.code === code) ?? null;
}

/** `GET /api/jalons/` — paramètre `decisif=1` pour la chronologie de la démo. */
export async function listerJalons(options: { decisifsSeulement?: boolean } = {}): Promise<Jalon[]> {
  const liste = jeuDeDonnees().jalons;
  return options.decisifsSeulement ? liste.filter((j) => j.decisif) : liste;
}

/* ------------------------------------------------------------------------- *
 * Plan d'action : agrégats du tableau de bord de suivi
 * ------------------------------------------------------------------------- */

export interface ResumePlanAction {
  total: number;
  par_statut: Array<{ statut: StatutActivite; effectif: number }>;
  charge_par_responsable: Array<{ responsable: string; activites: number }>;
  budget_engage_fcfa: number;
  budget_consomme_fcfa: number;
  /** Part du budget engagé déjà consommée, 0–100. */
  part_consommee: number;
  avancement_moyen: number;
  terminees: number;
  /** Activités non achevées, tous statuts confondus. */
  ouvertes: number;
}

/**
 * `GET /api/activites/resume/`
 * Tout ce que le tableau de bord de suivi affiche d'agrégé sur le plan d'action.
 *
 * Ces calculs vivent ici et non dans l'écran : le jour où Django les servira, la
 * page ne bouge pas. Un écran qui compte lui-même ses activités est un écran à
 * réécrire à la bascule.
 */
export async function resumePlanAction(): Promise<ResumePlanAction> {
  const { activites } = jeuDeDonnees();

  const ordre: StatutActivite[] = ['en_cours', 'terminee', 'planifiee', 'en_retard', 'suspendue'];
  const engage = activites.reduce((s, a) => s + a.budget_prevu_fcfa, 0);
  const consomme = activites.reduce((s, a) => s + a.budget_consomme_fcfa, 0);
  const terminees = activites.filter((a) => a.statut === 'terminee').length;

  const parResponsable = new Map<string, number>();
  for (const a of activites) {
    parResponsable.set(a.responsable, (parResponsable.get(a.responsable) ?? 0) + 1);
  }

  return {
    total: activites.length,
    par_statut: ordre.map((statut) => ({
      statut,
      effectif: activites.filter((a) => a.statut === statut).length,
    })),
    charge_par_responsable: [...parResponsable.entries()]
      .map(([responsable, nombre]) => ({ responsable, activites: nombre }))
      .sort((x, y) => y.activites - x.activites),
    budget_engage_fcfa: engage,
    budget_consomme_fcfa: consomme,
    part_consommee: engage === 0 ? 0 : Math.round((consomme / engage) * 100),
    avancement_moyen: moyenneEntiere(activites.map((a) => a.avancement)),
    terminees,
    ouvertes: activites.length - terminees,
  };
}

/** Profondeur des séries d'en-tête : huit fins de mois glissantes. */
const PROFONDEUR_SERIE = 8;

/**
 * `GET /api/suivi/kpis/?tableau=plan-action`
 * Les quatre cartes d'en-tête du tableau de bord de suivi.
 *
 * Chaque valeur affichée est le dernier point de sa propre série, et chaque série
 * applique à huit dates passées le prédicat exact qui définit la valeur. C'est ce
 * qui garantit qu'une carte ne contredit pas le graphique placé dessous : une
 * première version comptait les activités dont la fenêtre couvrait le jour, quand
 * l'anneau comptait le statut — cinq d'un côté, quatre de l'autre, sur le même
 * écran.
 */
export async function kpisPlanAction(): Promise<Kpi[]> {
  const { activites, jalons, indicateurs } = jeuDeDonnees();

  const bornes = Array.from({ length: PROFONDEUR_SERIE }, (_, i) => {
    const d = new Date(DATE_REFERENCE);
    d.setMonth(d.getMonth() - (PROFONDEUR_SERIE - 1 - i));
    return d;
  });

  /*
   * Approximation assumée sur les deux séries d'activités : l'achèvement n'est pas
   * horodaté dans le modèle, donc « achevée » se lit sur l'avancement d'aujourd'hui.
   * Le dernier point — celui qu'affiche la carte — reste exact ; les précédents
   * donnent une forme, ce qui est tout ce qu'un sparkline prétend montrer.
   * À remplacer par un champ `date_achevement` le jour où Django l'aura.
   */
  const achevee = (a: Activite, d: Date) => new Date(a.date_fin) < d && a.avancement === 100;

  const serieTerminees = bornes.map((d) => activites.filter((a) => achevee(a, d)).length);
  const serieJalons = bornes.map(
    (d) => jalons.filter((j) => j.date_reelle !== null && new Date(j.date_reelle) <= d).length,
  );
  const serieEchues = bornes.map(
    (d) => activites.filter((a) => new Date(a.date_fin) < d && a.avancement < 100).length,
  );
  const serieCadre = serieAvancementCadre(indicateurs, PROFONDEUR_SERIE);

  const dernier = (serie: number[]) => serie[serie.length - 1];

  return [
    {
      cle: 'terminees',
      libelle: 'Activités terminées',
      valeur: dernier(serieTerminees),
      valeur_affichee: `${dernier(serieTerminees)} / ${activites.length}`,
      unite: 'activités',
      delta: variationSerie(serieTerminees),
      tendance: tendanceSerie(serieTerminees),
      etincelle: serieTerminees,
      cible: activites.length,
    },
    {
      cle: 'jalons',
      libelle: 'Jalons atteints',
      valeur: dernier(serieJalons),
      valeur_affichee: `${dernier(serieJalons)} / ${jalons.length}`,
      unite: 'jalons',
      delta: variationSerie(serieJalons),
      tendance: tendanceSerie(serieJalons),
      etincelle: serieJalons,
      cible: jalons.length,
    },
    {
      cle: 'echues',
      libelle: 'Activités échues non achevées',
      valeur: dernier(serieEchues),
      valeur_affichee: formaterNombre(dernier(serieEchues)),
      unite: 'activités',
      delta: variationSerie(serieEchues),
      tendance: tendanceSerie(serieEchues),
      // Un retard qui recule est une bonne nouvelle. Sans ce marqueur, la carte
      // peindrait la baisse en rouge.
      sens: 'decroissant',
      etincelle: serieEchues,
    },
    {
      cle: 'cadre',
      libelle: 'Avancement du cadre logique',
      valeur: dernier(serieCadre),
      valeur_affichee: `${dernier(serieCadre)} %`,
      unite: '%',
      // En points, non en pourcentage relatif : passer de 33 % à 75 % est un gain
      // de 42 points, et l'annoncer comme « +127 % » sur une carte qui affiche
      // déjà « 75 % » ne peut que se lire de travers.
      delta: variationPoints(serieCadre),
      tendance: tendanceSerie(serieCadre),
      etincelle: serieCadre,
      cible: 100,
    },
  ];
}

/**
 * Avancement global du cadre logique, relevé par relevé.
 *
 * Chaque indicateur porte l'historique de ses collectes ; la moyenne de leurs taux
 * d'atteinte à un relevé donné est l'avancement du cadre à cette date. Rien n'est
 * inventé : la courbe est la reconstitution des collectes passées.
 */
function serieAvancementCadre(indicateurs: Indicateur[], profondeur: number): number[] {
  const longueur = Math.min(...indicateurs.map((i) => i.releves.length));
  if (!Number.isFinite(longueur) || longueur === 0) return new Array(profondeur).fill(0);

  const serie: number[] = [];
  for (let rang = Math.max(0, longueur - profondeur); rang < longueur; rang += 1) {
    serie.push(
      moyenneEntiere(
        indicateurs.map((i) => tauxAtteinte(i.releves[rang].valeur, i.valeur_cible, i.sens)),
      ),
    );
  }
  return serie;
}

/**
 * Taux d'atteinte d'une valeur, plafonné à 100.
 * Un indicateur décroissant — un délai à réduire — se lit dans l'autre sens :
 * 118 jours pour une cible de 90 valent 76 %, pas 131 %.
 */
function tauxAtteinte(valeur: number, cible: number, sens: Indicateur['sens']): number {
  if (sens === 'decroissant') {
    return valeur === 0 ? 100 : Math.min(100, Math.round((cible / valeur) * 100));
  }
  return cible === 0 ? 0 : Math.min(100, Math.round((valeur / cible) * 100));
}

/**
 * Variation en % sur toute la fenêtre de la série, à une décimale.
 *
 * Volontairement mesurée d'un bout à l'autre, et non entre les deux derniers
 * points : le projet court sur vingt-six mois, et un écart de mois à mois y vaut
 * zéro presque partout — trois cartes sur quatre affichaient « 0,0 % ». La
 * variation décrit donc exactement la période que le sparkline dessine à côté
 * d'elle, ce qui est aussi la seule lecture que ce couple autorise.
 *
 * La référence est le premier point non nul : partir de zéro ne donne pas une
 * variation infinie, il donne une variation dont on ne sait rien.
 */
function variationSerie(serie: number[]): number {
  const dernier = serie[serie.length - 1];
  const reference = serie.find((v) => v !== 0);
  if (reference === undefined || dernier === undefined) return 0;
  return Math.round(((dernier - reference) / reference) * 1000) / 10;
}

/**
 * Écart en points entre les deux extrémités d'une série déjà exprimée en
 * pourcentage. La carte l'affiche suivi de « pts », jamais de « % ».
 */
function variationPoints(serie: number[]): number {
  const dernier = serie[serie.length - 1];
  const premier = serie[0];
  if (dernier === undefined || premier === undefined) return 0;
  return Math.round((dernier - premier) * 10) / 10;
}

function tendanceSerie(serie: number[]): 'hausse' | 'baisse' | 'stable' {
  const v = variationSerie(serie);
  if (v > 0) return 'hausse';
  if (v < 0) return 'baisse';
  return 'stable';
}

function moyenneEntiere(valeurs: number[]): number {
  if (valeurs.length === 0) return 0;
  return Math.round(valeurs.reduce((s, v) => s + v, 0) / valeurs.length);
}

/* ========================================================================= *
 * Formations
 * ========================================================================= */

/** `GET /api/formations/` */
export async function listerFormations(): Promise<Formation[]> {
  return jeuDeDonnees().formations;
}

/** `GET /api/sessions/` */
export async function listerSessions(filtres: { formation?: number; statut?: string } = {}): Promise<SessionFormation[]> {
  let liste = [...jeuDeDonnees().sessions];
  if (filtres.formation) liste = liste.filter((s) => s.formation_id === filtres.formation);
  if (filtres.statut) liste = liste.filter((s) => s.statut === filtres.statut);
  return liste;
}

/** `GET /api/certifications/` */
export async function listerCertifications(): Promise<Certification[]> {
  return jeuDeDonnees().certifications;
}

/* ========================================================================= *
 * Financement
 * ========================================================================= */

/** `GET /api/financements/` */
export async function listerFinancements(filtres: { statut?: string; type?: string } = {}): Promise<Financement[]> {
  let liste = [...jeuDeDonnees().financements];
  if (filtres.statut) liste = liste.filter((f) => f.statut === filtres.statut);
  if (filtres.type) liste = liste.filter((f) => f.type_financement === filtres.type);
  return liste;
}

export interface ResumeFinancement {
  total_decaisse_fcfa: number;
  total_rembourse_fcfa: number;
  taux_remboursement: number;
  groupements_finances: number;
  encours_fcfa: number;
  defaillants: number;
  par_type: Repartition[];
  flux_mensuel: PointSerie[];
}

/** `GET /api/financements/resume/` */
export async function resumeFinancement(): Promise<ResumeFinancement> {
  const { financements } = jeuDeDonnees();

  const decaisse = financements.reduce((s, f) => s + f.montant_fcfa, 0);
  const rembourse = financements.reduce((s, f) => s + f.montant_rembourse_fcfa, 0);
  const remboursables = financements.filter(
    (f) => f.type_financement === 'credit_rotatif' || f.type_financement === 'fonds_de_roulement',
  );
  const duRemboursable = remboursables.reduce((s, f) => s + f.montant_fcfa, 0);

  const types = ['subvention', 'credit_rotatif', 'equipement', 'fonds_de_roulement'] as const;
  const libelles: Record<string, string> = {
    subvention: 'Subvention',
    credit_rotatif: 'Crédit rotatif',
    equipement: 'Dotation en équipement',
    fonds_de_roulement: 'Fonds de roulement',
  };

  const par_type: Repartition[] = types.map((t, i) => {
    const montant = financements
      .filter((f) => f.type_financement === t)
      .reduce((s, f) => s + f.montant_fcfa, 0);
    return {
      libelle: libelles[t],
      slug: t,
      valeur: montant,
      part: Math.round((montant / decaisse) * 100),
      teinte: `var(--ax-chart-${i + 1})`,
    };
  });

  return {
    total_decaisse_fcfa: decaisse,
    total_rembourse_fcfa: rembourse,
    taux_remboursement: duRemboursable === 0 ? 0 : Math.round((rembourse / duRemboursable) * 100),
    groupements_finances: new Set(financements.map((f) => f.groupement_id)).size,
    encours_fcfa: duRemboursable - rembourse,
    defaillants: financements.filter((f) => f.statut === 'defaillant').length,
    par_type,
    flux_mensuel: fluxMensuel(),
  };
}

/** Agrégation mensuelle des décaissements sur les douze derniers mois. */
function fluxMensuel(): PointSerie[] {
  const { mouvements } = jeuDeDonnees();
  const mois = [
    'nov.', 'déc.', 'janv.', 'févr.', 'mars', 'avr.',
    'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.',
  ];
  const sorties = new Array(12).fill(0);
  const entrees = new Array(12).fill(0);

  for (const m of mouvements) {
    const date = new Date(m.date);
    // Index 0 = novembre de l'année précédente, 11 = octobre courant.
    const index = (date.getMonth() + 1) % 12;
    if (m.montant_fcfa < 0) sorties[index] += -m.montant_fcfa;
    else entrees[index] += m.montant_fcfa;
  }

  return mois.map((periode, i) => ({
    periode,
    valeur: Math.round(sorties[i]),
    precedent: Math.round(entrees[i]),
  }));
}

/** `GET /api/mouvements/` */
export async function listerMouvements(limite?: number): Promise<MouvementFinancier[]> {
  const liste = jeuDeDonnees().mouvements;
  return limite ? liste.slice(0, limite) : liste;
}

/* ========================================================================= *
 * Commandes, actualités, journal, boutiques
 * ========================================================================= */

/** `GET /api/commandes/` */
export async function listerCommandes(limite?: number): Promise<Commande[]> {
  const liste = jeuDeDonnees().commandes;
  return limite ? liste.slice(0, limite) : liste;
}

/** `GET /api/actualites/` */
export async function listerActualites(limite?: number): Promise<Actualite[]> {
  const liste = jeuDeDonnees().actualites;
  return limite ? liste.slice(0, limite) : liste;
}

/** `GET /api/actualites/{slug}/` */
export async function obtenirActualite(slug: string): Promise<Actualite | null> {
  return jeuDeDonnees().actualites.find((a) => a.slug === slug) ?? null;
}

/** `GET /api/journal/` — piste d'audit, du plus récent au plus ancien. */
export async function journalActivite(limite = 20): Promise<EvenementJournal[]> {
  return jeuDeDonnees().journal.slice(0, limite);
}

/** `GET /api/boutiques/` */
export async function listerBoutiques(): Promise<Boutique[]> {
  return jeuDeDonnees().boutiques;
}

/* ========================================================================= *
 * Recherche transverse
 * ========================================================================= */

export interface ResultatRecherche {
  type: 'groupement' | 'production' | 'membre' | 'activite' | 'formation' | 'indicateur';
  titre: string;
  sousTitre: string;
  lien: string;
  icone: string;
}

/**
 * `GET /api/recherche/?q=`
 * Alimente la palette de commandes ⌘K et la page de résultats.
 * Le backend devra renvoyer cette forme exacte, tous types confondus, triés par
 * pertinence — sans quoi la palette devra faire six appels au lieu d'un.
 */
export async function rechercheGlobale(requete: string, limite = 8): Promise<ResultatRecherche[]> {
  const q = sansAccent(requete.trim());
  if (q.length < 2) return [];

  const { groupements, productions, membres, activites, formations, indicateurs } = jeuDeDonnees();
  const resultats: ResultatRecherche[] = [];

  for (const g of groupements) {
    if (sansAccent(g.nom).includes(q) || sansAccent(g.quartier.nom).includes(q)) {
      resultats.push({
        type: 'groupement',
        titre: g.nom,
        sousTitre: `${g.filiere.nom} · ${g.quartier.nom} · ${g.nombre_membres} membres`,
        lien: `/groupements/${g.slug}`,
        icone: 'users-group',
      });
    }
  }
  for (const p of productions) {
    if (sansAccent(p.nom).includes(q)) {
      resultats.push({
        type: 'production',
        titre: p.nom,
        sousTitre: `${p.groupement_nom} · ${p.prix_unitaire_fcfa} FCFA / ${p.unite}`,
        lien: `/productions/${p.slug}`,
        icone: 'package',
      });
    }
  }
  for (const m of membres) {
    if (sansAccent(m.nom_complet).includes(q)) {
      resultats.push({
        type: 'membre',
        titre: m.nom_complet,
        sousTitre: `${m.role} · groupement n° ${m.groupement_id}`,
        lien: `/membres/${m.id}`,
        icone: 'user',
      });
    }
  }
  for (const x of activites) {
    if (sansAccent(x.intitule).includes(q)) {
      resultats.push({
        type: 'activite',
        titre: x.intitule,
        sousTitre: `${x.code} · ${x.avancement} % · ${x.responsable}`,
        lien: `/activites/${x.code}`,
        icone: 'target-arrow',
      });
    }
  }
  for (const f of formations) {
    if (sansAccent(f.nom).includes(q)) {
      resultats.push({
        type: 'formation',
        titre: f.nom,
        sousTitre: `${f.duree_heures} h · ${f.nombre_participants} participants`,
        lien: `/formations/${f.slug}`,
        icone: 'school',
      });
    }
  }
  for (const i of indicateurs) {
    if (sansAccent(i.intitule).includes(q) || sansAccent(i.code).includes(q)) {
      resultats.push({
        type: 'indicateur',
        titre: `${i.code} — ${i.intitule}`,
        sousTitre: `${i.valeur_actuelle} / ${i.valeur_cible} ${i.unite}`,
        lien: `/suivi/cadre-logique#${i.code}`,
        icone: 'chart-dots',
      });
    }
  }

  return resultats.slice(0, limite);
}
