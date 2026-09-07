/* ATTENTION — COPIE SYNCHRONISEE.
   Le fichier canonique est `frontend-admin/src/domaine/generateur.ts`.
   Toute modification faite ici sera ecrasee au prochain
   `python tools/synchroniser_domaine.py`. */

/**
 * Générateur de données de démonstration — MADE IN YEUMBEUL NORD
 * ==============================================================
 *
 * Produit un jeu complet et cohérent : 100 groupements, leurs membres, leurs
 * productions, le cadre logique, les activités, les formations, les financements
 * et le journal d'audit.
 *
 * Trois exigences ont guidé l'écriture :
 *
 * 1. **Déterminisme.** Le tirage passe par un générateur pseudo-aléatoire à graine
 *    fixe. Le serveur et le navigateur produisent exactement la même chose : pas de
 *    divergence d'hydratation, et une démo qui ne change pas entre deux répétitions.
 *
 * 2. **Cohérence.** Les agrégats ne sont pas inventés séparément des détails : le
 *    nombre de membres d'un quartier est la somme de ses groupements, le taux de
 *    certification découle des participations réelles. Un chiffre de KPI qui ne
 *    correspond pas au tableau juste en dessous, c'est la démo qui tombe.
 *
 * 3. **Crédibilité.** Toponymie de Yeumbeul Nord, anthroponymie sénégalaise,
 *    filières réelles, montants en FCFA à l'échelle d'un GIE de quartier.
 *
 * Ce fichier a vocation à être transposé en fixtures Django (`yn-data-demo`) :
 * les valeurs produites ici sont la référence, pas une approximation jetable.
 */

import {
  BAILLEURS,
  CENTRE_COMMUNE,
  ETAPES,
  FILIERES,
  NOMS_FAMILLE,
  PRENOMS_FEMININS,
  PRENOMS_MASCULINS,
  PROGRESSION_ETAPE,
  QUARTIERS,
  ROLES_MEMBRE,
  initiales,
  slugifier,
} from './referentiels';
import { CLES_PHOTOS, PHOTOS, photosParFiliere, photosParTheme } from './photos.generated';
import type {
  Activite,
  Actualite,
  AxeStrategique,
  Boutique,
  Certification,
  Commande,
  EtapeAccompagnement,
  EtatValidation,
  EvenementJournal,
  Filiere,
  Financement,
  Formation,
  Genre,
  Groupement,
  Indicateur,
  Jalon,
  Membre,
  MouvementFinancier,
  MoyenPaiement,
  PointSerie,
  Production,
  Quartier,
  ResultatAttendu,
  SessionFormation,
  StatutActivite,
  Tendance,
  TypeFinancement,
} from './types';

/* ------------------------------------------------------------------------- *
 * Instant de référence
 * ------------------------------------------------------------------------- */

/**
 * Toute date relative de la plateforme se calcule par rapport à cet instant, et non
 * par rapport à l'horloge du poste.
 *
 * Deux raisons : le rendu serveur et le rendu client donnent le même « il y a 8 min »
 * (sinon React signale une divergence d'hydratation à chaque ligne de journal), et la
 * démo affiche une actualité fraîche le jour J quelle que soit la date de la dernière
 * compilation.
 *
 * Cale sur le **31 octobre 2026**, jour de la démonstration au Maire.
 */
export const DATE_REFERENCE = new Date('2026-10-31T09:30:00');

const JOUR_MS = 86_400_000;

function ilYAJours(jours: number, heure = 10, minute = 0): string {
  const d = new Date(DATE_REFERENCE.getTime() - jours * JOUR_MS);
  d.setHours(heure, minute, 0, 0);
  return d.toISOString();
}

function dansJours(jours: number): string {
  return new Date(DATE_REFERENCE.getTime() + jours * JOUR_MS).toISOString().slice(0, 10);
}

function jourSeul(iso: string): string {
  return iso.slice(0, 10);
}

/* ------------------------------------------------------------------------- *
 * Aléatoire déterministe
 * ------------------------------------------------------------------------- */

/** Mulberry32 : court, rapide, et reproductible à l'identique dans tout moteur JS. */
function creerAlea(graine: number) {
  let etat = graine >>> 0;
  return function alea(): number {
    etat = (etat + 0x6d2b79f5) >>> 0;
    let t = etat;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Alea = () => number;

const entre = (a: Alea, min: number, max: number): number => min + a() * (max - min);
const entier = (a: Alea, min: number, max: number): number => Math.floor(entre(a, min, max + 1));
const parmi = <T,>(a: Alea, liste: readonly T[]): T => liste[entier(a, 0, liste.length - 1)];
const chance = (a: Alea, probabilite: number): boolean => a() < probabilite;

/** Tirage pondéré : `poids[i]` est la probabilité relative de `liste[i]`. */
function pondere<T>(a: Alea, liste: readonly T[], poids: readonly number[]): T {
  const total = poids.reduce((s, p) => s + p, 0);
  let seuil = a() * total;
  for (let i = 0; i < liste.length; i += 1) {
    seuil -= poids[i];
    if (seuil <= 0) return liste[i];
  }
  return liste[liste.length - 1];
}

/* ------------------------------------------------------------------------- *
 * Vocabulaire de nommage
 * ------------------------------------------------------------------------- */

/**
 * Noms de groupements en wolof et en pulaar, tels qu'on les rencontre sur les
 * récépissés de GIE : une valeur portée collectivement plutôt qu'un nom propre.
 */
const NOMS_GROUPEMENT = [
  'And Liggéey', 'Jàppo', 'Bokk Jom', 'Yakaar', 'Jàmm', 'Teranga', 'Ndimbal',
  'Deggo', 'Takku Liggéey', 'Bamtaare', 'Mbollo', 'Jokko', 'Wallu', 'Natangué',
  'Suñu Yakaar', 'Aar Sunu Gox', 'Fippu', 'Jubbanti', 'Sant Yalla', 'Pencum Gox',
  'Diappo Liggéey', 'Kaddu Jigéen', 'Sopey Askan', 'Xarit', 'Wer Gu Yaram',
  'And Défar', 'Boole', 'Diamono', 'Ngir Suñu Gox', 'Séddo',
] as const;

const PREFIXES_GROUPEMENT = ['GIE', 'Groupement', 'Association', 'Coopérative'] as const;

/** Productions par filière, avec prix indicatif en FCFA et unité de vente. */
const CATALOGUE_PRODUCTIONS: Record<
  string,
  ReadonlyArray<{ nom: string; prix: number; unite: string }>
> = {
  saponification: [
    { nom: 'Savon au beurre de karité', prix: 1500, unite: 'pain' },
    { nom: 'Savon noir africain', prix: 1200, unite: 'pot 250 g' },
    { nom: 'Savon liquide vaisselle', prix: 2000, unite: 'bidon 1 L' },
    { nom: 'Savon au moringa', prix: 1800, unite: 'pain' },
    { nom: "Savon à l'huile de coco", prix: 2200, unite: 'pain' },
    { nom: 'Savon exfoliant au mil', prix: 1700, unite: 'pain' },
    { nom: 'Savon détachant ménager', prix: 900, unite: 'pain' },
  ],
  cosmetiques: [
    { nom: 'Beurre de karité pur', prix: 3500, unite: 'pot 500 g' },
    { nom: 'Huile de baobab pressée à froid', prix: 5000, unite: 'flacon 100 ml' },
    { nom: 'Lait corporel au karité', prix: 4000, unite: 'flacon 250 ml' },
    { nom: 'Masque capillaire au bissap', prix: 3000, unite: 'pot 200 g' },
    { nom: 'Gommage au café et au karité', prix: 3200, unite: 'pot 200 g' },
    { nom: "Huile de nigelle", prix: 4500, unite: 'flacon 100 ml' },
  ],
  'transformation-agroalimentaire': [
    { nom: 'Sirop de bissap', prix: 2500, unite: 'bouteille 1 L' },
    { nom: 'Jus de bouye (pain de singe)', prix: 2000, unite: 'bouteille 1 L' },
    { nom: 'Jus de gingembre', prix: 2200, unite: 'bouteille 1 L' },
    { nom: 'Confiture de mangue', prix: 2800, unite: 'pot 350 g' },
    { nom: 'Mangue séchée', prix: 3000, unite: 'sachet 200 g' },
    { nom: 'Poudre de baobab', prix: 2600, unite: 'sachet 500 g' },
    { nom: 'Beurre de cacahuète artisanal', prix: 2400, unite: 'pot 400 g' },
  ],
  cereales: [
    { nom: 'Couscous de mil (thiéré)', prix: 1200, unite: 'kg' },
    { nom: 'Farine infantile enrichie', prix: 2500, unite: 'sachet 500 g' },
    { nom: 'Sankhal de mil', prix: 1000, unite: 'kg' },
    { nom: 'Arraw', prix: 1500, unite: 'kg' },
    { nom: 'Niébé décortiqué', prix: 1400, unite: 'kg' },
    { nom: 'Farine de maïs', prix: 900, unite: 'kg' },
  ],
  maraichage: [
    { nom: 'Tomate fraîche', prix: 800, unite: 'kg' },
    { nom: 'Oignon local', prix: 700, unite: 'kg' },
    { nom: 'Salade batavia', prix: 500, unite: 'pièce' },
    { nom: 'Gombo frais', prix: 1000, unite: 'kg' },
    { nom: 'Menthe fraîche', prix: 300, unite: 'botte' },
    { nom: 'Piment vert', prix: 1200, unite: 'kg' },
  ],
  'artisanat-vannerie': [
    { nom: 'Panier en osier tressé', prix: 4500, unite: 'pièce' },
    { nom: 'Natte en paille', prix: 6000, unite: 'pièce' },
    { nom: 'Corbeille décorative', prix: 3500, unite: 'pièce' },
    { nom: 'Calebasse gravée', prix: 5500, unite: 'pièce' },
    { nom: 'Sac en tissu recyclé', prix: 4000, unite: 'pièce' },
    { nom: 'Parure de perles', prix: 7500, unite: 'parure' },
  ],
  couture: [
    { nom: 'Boubou brodé sur mesure', prix: 25000, unite: 'pièce' },
    { nom: 'Tenue enfant en wax', prix: 8000, unite: 'pièce' },
    { nom: 'Sac en bazin', prix: 6500, unite: 'pièce' },
    { nom: 'Nappe brodée', prix: 12000, unite: 'pièce' },
    { nom: 'Uniforme scolaire', prix: 7000, unite: 'pièce' },
    { nom: 'Taie de traversin en pagne', prix: 3500, unite: 'pièce' },
  ],
  restauration: [
    { nom: 'Plateau thiéboudiène', prix: 2500, unite: 'part' },
    { nom: 'Yassa poulet', prix: 2000, unite: 'part' },
    { nom: 'Mafé du jour', prix: 2000, unite: 'part' },
    { nom: 'Beignets de mil', prix: 500, unite: 'sachet de 10' },
    { nom: 'Plateau traiteur 10 personnes', prix: 35000, unite: 'plateau' },
    { nom: 'Jus frais pressé', prix: 500, unite: 'gobelet' },
  ],
  'commerce-vivrier': [
    { nom: 'Riz brisé parfumé', prix: 3500, unite: 'sac 5 kg' },
    { nom: "Huile d'arachide", prix: 1800, unite: 'bidon 1 L' },
    { nom: 'Sucre en poudre', prix: 900, unite: 'kg' },
    { nom: 'Oignons en gros', prix: 12000, unite: 'sac 25 kg' },
    { nom: 'Pommes de terre', prix: 3000, unite: 'sac 5 kg' },
    { nom: 'Lait en poudre', prix: 2800, unite: 'boîte 500 g' },
  ],
  'services-coiffure': [
    { nom: 'Tresses africaines', prix: 5000, unite: 'prestation' },
    { nom: 'Pose de mèches', prix: 8000, unite: 'prestation' },
    { nom: 'Défrisage et soin', prix: 6000, unite: 'prestation' },
    { nom: 'Soin capillaire au karité', prix: 3500, unite: 'prestation' },
    { nom: 'Coiffure de cérémonie', prix: 15000, unite: 'prestation' },
    { nom: 'Coupe et brushing', prix: 3000, unite: 'prestation' },
  ],
  logistique: [
    { nom: 'Livraison de colis dans le quartier', prix: 1000, unite: 'course' },
    { nom: 'Livraison express Dakar', prix: 3000, unite: 'course' },
    { nom: 'Transport de marchandises', prix: 8000, unite: 'course' },
    { nom: 'Location de charrette', prix: 5000, unite: 'journée' },
    { nom: 'Stockage en entrepôt', prix: 2500, unite: 'm² / mois' },
    { nom: 'Groupage de commandes', prix: 1500, unite: 'lot' },
  ],
};

const FORMATEURS = [
  'Mamy Kaya',
  'Ndèye Astou Sarr',
  'Cheikh Tidiane Diagne',
  'Rokhaya Ndiaye',
  'Ibrahima Sonko',
  'Sokhna Mbaye',
] as const;

const AGENTS_COORDINATION = [
  'Aminata Diop',
  'Ousmane Fall',
  'Khady Sène',
  'Modou Gueye',
  'Bineta Sarr',
  'Alioune Badara Ndiaye',
] as const;

/**
 * Formes masculines des rôles de bureau.
 * Les rôles sont listés au féminin dans les référentiels parce que les groupements
 * sont massivement féminins ; il faut néanmoins une forme correcte pour les hommes,
 * et une simple troncature du « e » final produirait « Trésorièr ».
 */
const ROLE_MASCULIN: Record<string, string> = {
  Présidente: 'Président',
  'Vice-présidente': 'Vice-président',
  'Secrétaire générale': 'Secrétaire général',
  Trésorière: 'Trésorier',
  'Responsable production': 'Responsable production',
  'Responsable commercialisation': 'Responsable commercialisation',
  'Chargée de la qualité': 'Chargé de la qualité',
  Membre: 'Membre',
};

const TEINTES_AVATAR = [
  'var(--ax-chart-1)',
  'var(--ax-chart-2)',
  'var(--ax-chart-3)',
  'var(--ax-chart-4)',
  'var(--ax-chart-5)',
  'var(--ax-chart-6)',
] as const;

/* ------------------------------------------------------------------------- *
 * Le jeu de données complet
 * ------------------------------------------------------------------------- */

export interface JeuDeDonnees {
  quartiers: Quartier[];
  filieres: Filiere[];
  groupements: Groupement[];
  membres: Membre[];
  productions: Production[];
  axes: AxeStrategique[];
  resultats: ResultatAttendu[];
  indicateurs: Indicateur[];
  activites: Activite[];
  jalons: Jalon[];
  formations: Formation[];
  sessions: SessionFormation[];
  certifications: Certification[];
  /** Ce que les sessions tenues permettent de dire des personnes, et non des présences. */
  statistiquesFormation: StatistiquesFormation;
  financements: Financement[];
  mouvements: MouvementFinancier[];
  commandes: Commande[];
  actualites: Actualite[];
  journal: EvenementJournal[];
  boutiques: Boutique[];
}

let cache: JeuDeDonnees | null = null;

/** Jeu de données complet, calculé une seule fois par processus. */
export function jeuDeDonnees(): JeuDeDonnees {
  if (!cache) cache = construire();
  return cache;
}

function construire(): JeuDeDonnees {
  const a = creerAlea(20261031);

  const quartiers = construireQuartiers();
  const filieres = construireFilieres();
  const { groupements, membres } = construireGroupements(a, quartiers, filieres);
  const productions = construireProductions(a, groupements, filieres);

  // Les compteurs des référentiels se déduisent des entités, jamais l'inverse.
  for (const q of quartiers) {
    q.nombre_groupements = groupements.filter((g) => g.quartier.id === q.id).length;
  }
  for (const f of filieres) {
    f.nombre_groupements = groupements.filter((g) => g.filiere.id === f.id).length;
    f.nombre_productions = productions.filter((p) => p.filiere_id === f.id).length;
  }
  for (const g of groupements) {
    g.nombre_productions = productions.filter((p) => p.groupement_id === g.id).length;
  }

  const { activites, jalons } = construireActivites(a, quartiers, filieres);
  const { formations, sessions, certifications, statistiques } =
    construireFormations(a, membres, groupements, quartiers);
  const { financements, mouvements } = construireFinancement(a, groupements);

  // Les compteurs de la fiche membre se déduisent des certifications produites.
  const certifsParMembre = new Map<number, number>();
  for (const c of certifications) {
    certifsParMembre.set(c.membre_id, (certifsParMembre.get(c.membre_id) ?? 0) + 1);
  }
  for (const m of membres) {
    const certifs = certifsParMembre.get(m.id) ?? 0;
    m.nombre_certifications = certifs;
    // On suit plus de formations qu'on n'obtient de certifications : le jury filtre.
    m.nombre_formations_suivies = certifs + (certifs > 0 ? entier(a, 0, 2) : entier(a, 0, 1));
  }

  const { commandes, horsQuartier } = construireCommandes(a, groupements, productions, quartiers);

  const { axes, resultats, indicateurs } = construireCadreLogique(a, {
    groupements,
    productions,
    membres,
    financements,
    formation: statistiques,
    commandesHorsQuartier: horsQuartier,
  });
  const actualites = construireActualites(a);
  const journal = construireJournal(a, groupements, productions, financements, sessions);
  const boutiques = construireBoutiques();

  return {
    quartiers, filieres, groupements, membres, productions,
    axes, resultats, indicateurs, activites, jalons,
    formations, sessions, certifications, statistiquesFormation: statistiques,
    financements, mouvements, commandes, actualites, journal, boutiques,
  };
}

/* ------------------------------------------------------------------------- *
 * Territoire et filières
 * ------------------------------------------------------------------------- */

function construireQuartiers(): Quartier[] {
  return QUARTIERS.map((q, i) => ({
    id: i + 1,
    nom: q.nom,
    slug: slugifier(q.nom),
    latitude: q.latitude,
    longitude: q.longitude,
    population_estimee: q.population_estimee,
    nombre_groupements: 0,
  }));
}

function construireFilieres(): Filiere[] {
  return FILIERES.map((f, i) => ({
    id: i + 1,
    nom: f.nom,
    slug: f.slug,
    description: f.description,
    icone: f.icone,
    teinte: f.teinte,
    nombre_groupements: 0,
    nombre_productions: 0,
  }));
}

/* ------------------------------------------------------------------------- *
 * Groupements et membres
 * ------------------------------------------------------------------------- */

const NOMBRE_GROUPEMENTS = 100;

function construireGroupements(
  a: Alea,
  quartiers: Quartier[],
  filieres: Filiere[],
): { groupements: Groupement[]; membres: Membre[] } {
  const groupements: Groupement[] = [];
  const membres: Membre[] = [];
  const nomsPris = new Set<string>();

  // Les filières les plus représentées à Yeumbeul Nord pèsent davantage dans le tirage.
  const poidsFilieres = [14, 9, 13, 10, 8, 9, 12, 11, 7, 5, 2];

  // Le parcours d'accompagnement se lit comme un entonnoir : beaucoup d'identifiés,
  // peu d'autonomes. Une répartition uniforme sonnerait faux.
  const poidsEtapes = [14, 20, 18, 16, 13, 12, 7];

  for (let i = 0; i < NOMBRE_GROUPEMENTS; i += 1) {
    const id = i + 1;
    const quartier = parmi(a, quartiers);
    const filiere = pondere(a, filieres, poidsFilieres);
    const etape = pondere(a, ETAPES, poidsEtapes) as EtapeAccompagnement;

    const nom = nomUnique(a, quartier.nom, nomsPris);
    const slug = slugifier(nom);

    // Un groupement plus avancé a eu le temps de grossir et de se structurer.
    const rangEtape = ETAPES.indexOf(etape);
    const nombreMembres = entier(a, 8 + rangEtape, 14 + rangEtape * 4);

    // Filières très largement féminines : la mixité augmente sur la logistique
    // et le commerce, elle reste marginale sur la couture et la coiffure.
    const partFemmesCible = ['logistique', 'commerce-vivrier'].includes(filiere.slug)
      ? entre(a, 45, 75)
      : entre(a, 78, 100);

    const membresGroupement = construireMembres(a, id, nombreMembres, partFemmesCible);
    membres.push(...membresGroupement);
    const nombreFemmes = membresGroupement.filter((m) => m.genre === 'femme').length;

    const anneeCreation = entier(a, 2012, 2024);
    const dateCreation = `${anneeCreation}-${String(entier(a, 1, 12)).padStart(2, '0')}-${String(entier(a, 1, 28)).padStart(2, '0')}`;

    const formalise = rangEtape >= ETAPES.indexOf('formalise');
    const statutJuridique = formalise
      ? pondere(a, ['gie', 'association', 'cooperative'] as const, [70, 20, 10])
      : 'informel';

    const chiffreAffaires = Math.round(
      entre(a, 120_000, 2_600_000) * (0.55 + rangEtape * 0.22),
    );

    const photo = photoPourFiliere(a, filiere.slug, id);

    groupements.push({
      id,
      nom,
      slug,
      description: descriptionGroupement(nom, filiere.nom, quartier.nom, nombreMembres),
      quartier,
      // Dispersion autour du centroïde du quartier : les points ne se superposent pas
      // sur la carte, et la densité par quartier reste lisible.
      latitude: quartier.latitude + entre(a, -0.0035, 0.0035),
      longitude: quartier.longitude + entre(a, -0.0035, 0.0035),
      filiere,
      filieres_secondaires: chance(a, 0.35) ? [parmi(a, filieres).nom] : [],
      statut_juridique: statutJuridique,
      ninea: formalise ? `${entier(a, 1000000, 9999999)}${entier(a, 1, 9)}` : null,
      etape,
      progression: Math.min(100, PROGRESSION_ETAPE[etape] + entier(a, -5, 5)),
      nombre_membres: nombreMembres,
      part_femmes: Math.round((nombreFemmes / nombreMembres) * 100),
      nombre_productions: 0,
      chiffre_affaires_fcfa: chiffreAffaires,
      financement_recu_fcfa: 0,
      telephone: telephone(a),
      email: chance(a, 0.45) ? `${slug.slice(0, 22)}@yeumbeulnord.sn` : null,
      responsable: membresGroupement[0].nom_complet,
      date_creation: dateCreation,
      date_formalisation: formalise ? dansJours(-entier(a, 60, 900)) : null,
      note_moyenne: Number(entre(a, 3.7, 5).toFixed(1)),
      nombre_appreciations: entier(a, 3, 84),
      photo,
      etat_validation: pondere(
        a,
        ['valide', 'soumis', 'brouillon', 'rejete'] as const,
        [72, 16, 9, 3],
      ) as EtatValidation,
    });
  }

  return { groupements, membres };
}

function nomUnique(a: Alea, quartier: string, pris: Set<string>): string {
  for (let essai = 0; essai < 200; essai += 1) {
    const base = `${parmi(a, PREFIXES_GROUPEMENT)} ${parmi(a, NOMS_GROUPEMENT)}`;
    const candidat = essai < 60 ? base : `${base} de ${quartier}`;
    if (!pris.has(candidat)) {
      pris.add(candidat);
      return candidat;
    }
  }
  // Repli déterministe : ne se produit pas avec 100 groupements, mais évite
  // une boucle infinie si la liste de noms venait à être réduite.
  const secours = `GIE ${parmi(a, NOMS_GROUPEMENT)} ${pris.size + 1}`;
  pris.add(secours);
  return secours;
}

function descriptionGroupement(
  nom: string,
  filiere: string,
  quartier: string,
  membres: number,
): string {
  return (
    `${nom} réunit ${membres} membres du quartier de ${quartier} autour de la filière ` +
    `« ${filiere.toLowerCase()} ». Le groupement mutualise l'approvisionnement, partage un ` +
    `local de production et écoule sa production sur les marchés de la commune ainsi qu'à ` +
    `travers les boutiques témoins « Made in Yeumbeul Nord ».`
  );
}

function construireMembres(
  a: Alea,
  groupementId: number,
  nombre: number,
  partFemmesCible: number,
): Membre[] {
  const membres: Membre[] = [];
  for (let i = 0; i < nombre; i += 1) {
    const genre: Genre = chance(a, partFemmesCible / 100) ? 'femme' : 'homme';
    const prenom = parmi(a, genre === 'femme' ? PRENOMS_FEMININS : PRENOMS_MASCULINS);
    const nomFamille = parmi(a, NOMS_FAMILLE);
    const nomComplet = `${prenom} ${nomFamille}`;

    // Les rôles de bureau sont attribués aux premiers membres, les suivants
    // sont des membres simples : un groupement n'a pas huit trésorières.
    const role = i < ROLES_MEMBRE.length - 1 ? ROLES_MEMBRE[i] : 'Membre';

    membres.push({
      id: groupementId * 1000 + i,
      groupement_id: groupementId,
      prenom,
      nom_famille: nomFamille,
      nom_complet: nomComplet,
      initiales: initiales(nomComplet),
      genre,
      age: entier(a, 21, 62),
      telephone: telephone(a),
      role: genre === 'homme' ? (ROLE_MASCULIN[role] ?? role) : role,
      avatar_teinte: TEINTES_AVATAR[(groupementId + i) % TEINTES_AVATAR.length],
      date_adhesion: dansJours(-entier(a, 90, 2600)),
      // Recalculés après la génération des sessions, à partir des présences
      // et des certifications réellement produites.
      nombre_formations_suivies: 0,
      nombre_certifications: 0,
    });
  }
  return membres;
}

function telephone(a: Alea): string {
  const prefixe = parmi(a, ['77', '78', '76', '70'] as const);
  return `+221 ${prefixe} ${entier(a, 100, 999)} ${entier(a, 10, 99)} ${entier(a, 10, 99)}`;
}

/* ------------------------------------------------------------------------- *
 * Productions
 * ------------------------------------------------------------------------- */

function photoPourFiliere(a: Alea, slugFiliere: string, graineStable: number): string {
  const candidates = photosParFiliere(slugFiliere);
  const source = candidates.length > 0 ? candidates : CLES_PHOTOS.map((c) => PHOTOS[c]);
  // L'indice dépend de l'identifiant, pas de l'ordre d'appel : une même entité
  // garde sa photo même si le générateur évolue ailleurs.
  const photo = source[graineStable % source.length];
  return photo.carte?.src ?? photo.hero?.src ?? photo.vignette?.src ?? '';
}

function construireProductions(
  a: Alea,
  groupements: Groupement[],
  filieres: Filiere[],
): Production[] {
  const productions: Production[] = [];
  const slugsPris = new Set<string>();
  let id = 1;

  for (const g of groupements) {
    const catalogue = CATALOGUE_PRODUCTIONS[g.filiere.slug] ?? [];
    if (catalogue.length === 0) continue;

    // Un groupement en début de parcours propose une ou deux références ;
    // un groupement autonome en propose une demi-douzaine.
    const rang = ETAPES.indexOf(g.etape);
    const nombre = Math.min(catalogue.length, entier(a, 1 + Math.floor(rang / 3), 2 + rang));

    const debut = entier(a, 0, catalogue.length - 1);
    for (let k = 0; k < nombre; k += 1) {
      const modele = catalogue[(debut + k) % catalogue.length];
      const filiere = filieres.find((f) => f.id === g.filiere.id)!;

      let slug = slugifier(`${modele.nom}-${g.slug}`);
      while (slugsPris.has(slug)) slug = `${slug}-${id}`;
      slugsPris.add(slug);

      const prix = Math.round((modele.prix * entre(a, 0.85, 1.2)) / 50) * 50;
      const enPromotion = chance(a, 0.18);
      const stock = chance(a, 0.08) ? 0 : entier(a, 4, 240);
      const photo = photoPourFiliere(a, g.filiere.slug, id * 7 + g.id);

      productions.push({
        id,
        groupement_id: g.id,
        groupement_nom: g.nom,
        groupement_slug: g.slug,
        filiere_id: filiere.id,
        filiere_nom: filiere.nom,
        filiere_slug: filiere.slug,
        nom: modele.nom,
        slug,
        description: descriptionProduction(modele.nom, g.nom, g.quartier.nom, modele.unite),
        prix_unitaire_fcfa: prix,
        prix_barre_fcfa: enPromotion ? Math.round((prix * 1.25) / 50) * 50 : null,
        unite: modele.unite,
        stock_disponible: stock,
        seuil_alerte: 12,
        disponible: stock > 0,
        photo,
        photos_additionnelles: [],
        note_moyenne: Number(entre(a, 3.6, 5).toFixed(1)),
        nombre_appreciations: entier(a, 0, 47),
        date_ajout: dansJours(-entier(a, 5, 620)),
        etiquettes: etiquettes(a, enPromotion, stock),
        etat_validation: pondere(
          a,
          ['valide', 'soumis', 'brouillon'] as const,
          [80, 14, 6],
        ) as EtatValidation,
      });
      id += 1;
    }
  }

  return productions;
}

function descriptionProduction(nom: string, groupement: string, quartier: string, unite: string): string {
  return (
    `${nom}, préparé par ${groupement} à ${quartier}. Fabrication artisanale à partir de ` +
    `matières premières approvisionnées localement, conditionnée à l'${unite.startsWith('unité') ? 'unité' : unite} ` +
    `dans l'atelier du groupement. Contrôle qualité assuré dans le cadre de l'accompagnement ` +
    `de la Commune de Yeumbeul Nord.`
  );
}

function etiquettes(a: Alea, enPromotion: boolean, stock: number): string[] {
  const liste: string[] = [];
  if (enPromotion) liste.push('Promotion');
  if (stock === 0) liste.push('Rupture');
  else if (stock < 12) liste.push('Stock faible');
  if (chance(a, 0.22)) liste.push('Nouveauté');
  if (chance(a, 0.15)) liste.push('Certifié');
  return liste;
}

/* ------------------------------------------------------------------------- *
 * Cadre logique — axes, résultats attendus, indicateurs
 * ------------------------------------------------------------------------- */

interface ModeleIndicateur {
  code: string;
  intitule: string;
  unite: string;
  reference: number;
  cible: number;
  actuel: number;
  periodicite: 'mensuelle' | 'trimestrielle' | 'semestrielle' | 'annuelle';
  source: string;
  genre?: boolean;
  /** Par defaut croissant. `decroissant` pour un delai, un taux d'abandon. */
  sens?: 'croissant' | 'decroissant';
}

interface ModeleResultat {
  code: string;
  intitule: string;
  indicateurs: ModeleIndicateur[];
}

interface ModeleAxe {
  code: string;
  intitule: string;
  description: string;
  teinte: string;
  resultats: ModeleResultat[];
}

/**
 * Le cadre logique du projet « And Jappo Meunal Souniou Bopp ».
 *
 * Il est écrit en dur, et c'est délibéré : ce n'est pas une donnée de démonstration
 * mais la structure du projet, celle que le Maire reconnaîtra. Seules les valeurs
 * relevées sont recalculées à partir des entités générées.
 */
const CADRE_LOGIQUE: ModeleAxe[] = [
  {
    code: 'A1',
    intitule: 'Structuration et formalisation des groupements',
    description:
      "Recenser les groupements de la commune, caractériser leur activité et les accompagner vers un statut juridique reconnu.",
    teinte: 'var(--ax-chart-1)',
    resultats: [
      {
        code: 'R1.1',
        intitule: 'Les groupements de la commune sont recensés et caractérisés',
        indicateurs: [
          { code: 'I1.1.1', intitule: 'Groupements recensés', unite: 'groupements', reference: 0, cible: 100, actuel: 100, periodicite: 'mensuelle', source: 'Plateforme — module Groupements' },
          { code: 'I1.1.2', intitule: 'Fiches complètes et validées', unite: '%', reference: 0, cible: 95, actuel: 72, periodicite: 'mensuelle', source: 'Plateforme — workflow de validation' },
        ],
      },
      {
        code: 'R1.2',
        intitule: 'Les groupements accèdent à un statut juridique',
        indicateurs: [
          { code: 'I1.2.1', intitule: 'Groupements formalisés', unite: 'groupements', reference: 12, cible: 60, actuel: 0, periodicite: 'trimestrielle', source: 'Récépissés et NINEA' },
          { code: 'I1.2.2', intitule: 'Délai moyen de formalisation', unite: 'jours', reference: 210, cible: 90, actuel: 118, periodicite: 'trimestrielle', source: 'Suivi administratif', sens: 'decroissant' },
        ],
      },
    ],
  },
  {
    code: 'A2',
    intitule: 'Renforcement des capacités techniques et de gestion',
    description:
      "Former les membres aux techniques de leur filière, à la gestion d'un groupement et à la tenue de comptes.",
    teinte: 'var(--ax-chart-2)',
    resultats: [
      {
        code: 'R2.1',
        intitule: 'Les membres maîtrisent les techniques de leur filière',
        indicateurs: [
          { code: 'I2.1.1', intitule: 'Membres formés', unite: 'membres', reference: 0, cible: 900, actuel: 0, periodicite: 'mensuelle', source: 'Feuilles de présence', genre: true },
          { code: 'I2.1.2', intitule: 'Taux de certification', unite: '%', reference: 0, cible: 70, actuel: 0, periodicite: 'trimestrielle', source: 'Jurys de certification' },
          { code: 'I2.1.3', intitule: 'Taux de présence aux sessions', unite: '%', reference: 0, cible: 85, actuel: 0, periodicite: 'mensuelle', source: 'Feuilles de présence' },
        ],
      },
      {
        code: 'R2.2',
        intitule: 'Les groupements tiennent une comptabilité simple',
        indicateurs: [
          { code: 'I2.2.1', intitule: 'Groupements tenant un carnet de comptes', unite: 'groupements', reference: 8, cible: 80, actuel: 47, periodicite: 'trimestrielle', source: 'Visites de terrain' },
          { code: 'I2.2.2', intitule: 'Groupements déclarant un chiffre d’affaires mensuel', unite: 'groupements', reference: 0, cible: 70, actuel: 52, periodicite: 'mensuelle', source: 'Plateforme — déclarations' },
        ],
      },
    ],
  },
  {
    code: 'A3',
    intitule: 'Accès au marché et valorisation des productions',
    description:
      'Rendre les productions visibles, ouvrir des débouchés hors du quartier et valoriser la marque territoriale.',
    teinte: 'var(--ax-chart-3)',
    resultats: [
      {
        code: 'R3.1',
        intitule: 'Les productions sont référencées et visibles',
        indicateurs: [
          { code: 'I3.1.1', intitule: 'Productions au catalogue', unite: 'productions', reference: 0, cible: 300, actuel: 0, periodicite: 'mensuelle', source: 'Plateforme — vitrine' },
          { code: 'I3.1.2', intitule: 'Visites mensuelles de la vitrine', unite: 'visites', reference: 0, cible: 4000, actuel: 2840, periodicite: 'mensuelle', source: 'Statistiques de fréquentation' },
        ],
      },
      {
        code: 'R3.2',
        intitule: 'Les groupements vendent au-delà de leur quartier',
        indicateurs: [
          { code: 'I3.2.1', intitule: 'Commandes hors quartier', unite: 'commandes', reference: 0, cible: 300, actuel: 0, periodicite: 'mensuelle', source: 'Plateforme — commandes' },
          { code: 'I3.2.2', intitule: 'Chiffre d’affaires cumulé des groupements', unite: 'FCFA', reference: 0, cible: 220_000_000, actuel: 0, periodicite: 'trimestrielle', source: 'Déclarations des groupements' },
          { code: 'I3.2.3', intitule: 'Groupements présents en boutique témoin', unite: 'groupements', reference: 0, cible: 45, actuel: 31, periodicite: 'trimestrielle', source: 'Boutiques témoins' },
        ],
      },
    ],
  },
  {
    code: 'A4',
    intitule: 'Accès au financement et autonomie économique',
    description:
      "Faciliter l'accès au crédit et à la dotation en équipement, et mesurer la marche vers l'autonomie.",
    teinte: 'var(--ax-chart-4)',
    resultats: [
      {
        code: 'R4.1',
        intitule: 'Les groupements accèdent à un financement adapté',
        indicateurs: [
          { code: 'I4.1.1', intitule: 'Montant total décaissé', unite: 'FCFA', reference: 0, cible: 85_000_000, actuel: 0, periodicite: 'trimestrielle', source: 'Plateforme — décaissements' },
          { code: 'I4.1.2', intitule: 'Groupements financés', unite: 'groupements', reference: 0, cible: 65, actuel: 0, periodicite: 'trimestrielle', source: 'Plateforme — décaissements' },
          { code: 'I4.1.3', intitule: 'Taux de remboursement des crédits rotatifs', unite: '%', reference: 0, cible: 90, actuel: 0, periodicite: 'trimestrielle', source: 'Suivi des remboursements' },
        ],
      },
      {
        code: 'R4.2',
        intitule: 'Les groupements progressent vers l’autonomie',
        indicateurs: [
          { code: 'I4.2.1', intitule: 'Groupements autonomes', unite: 'groupements', reference: 0, cible: 25, actuel: 0, periodicite: 'semestrielle', source: 'Plateforme — parcours d’accompagnement' },
          { code: 'I4.2.2', intitule: 'Part de femmes dans les instances dirigeantes', unite: '%', reference: 74, cible: 90, actuel: 0, periodicite: 'semestrielle', source: 'Plateforme — membres', genre: true },
          { code: 'I4.2.3', intitule: 'Groupements en production régulière', unite: 'groupements', reference: 0, cible: 55, actuel: 0, periodicite: 'trimestrielle', source: 'Plateforme — parcours d’accompagnement' },
        ],
      },
    ],
  },
];

interface ContexteCadreLogique {
  groupements: Groupement[];
  productions: Production[];
  membres: Membre[];
  financements: Financement[];
  formation: StatistiquesFormation;
  commandesHorsQuartier: number;
}

function construireCadreLogique(
  a: Alea,
  ctx: ContexteCadreLogique,
): { axes: AxeStrategique[]; resultats: ResultatAttendu[]; indicateurs: Indicateur[] } {
  const { groupements, productions, membres, financements, formation } = ctx;

  const remboursables = financements.filter(
    (f) => f.type_financement === 'credit_rotatif' || f.type_financement === 'fonds_de_roulement',
  );
  const duRemboursable = remboursables.reduce((s, f) => s + f.montant_fcfa, 0);
  const rembourse = financements.reduce((s, f) => s + f.montant_rembourse_fcfa, 0);

  const ROLES_BUREAU = new Set([
    'Présidente', 'Président',
    'Vice-présidente', 'Vice-président',
    'Secrétaire générale', 'Secrétaire général',
    'Trésorière', 'Trésorier',
  ]);
  const bureau = membres.filter((m) => ROLES_BUREAU.has(m.role));
  const femmesAuBureau = bureau.filter((m) => m.genre === 'femme').length;

  /**
   * Valeurs relevées, lues dans les entités produites.
   *
   * Aucun de ces chiffres n'est saisi à part : un indicateur qui contredirait la
   * liste affichée juste à côté est le défaut le plus coûteux d'une démonstration,
   * parce qu'il se voit tout de suite et qu'il jette le doute sur le reste.
   */
  const observees: Record<string, number> = {
    'I1.1.1': groupements.length,
    'I1.1.2': Math.round(
      (groupements.filter((g) => g.etat_validation === 'valide').length / groupements.length) * 100,
    ),
    'I1.2.1': groupements.filter((g) => g.statut_juridique !== 'informel').length,
    'I2.1.1': formation.membresFormes,
    'I2.1.2':
      formation.membresFormes === 0
        ? 0
        : Math.round((formation.membresCertifies / formation.membresFormes) * 100),
    'I2.1.3': formation.tauxPresenceMoyen,
    'I3.1.1': productions.length,
    'I3.2.1': ctx.commandesHorsQuartier,
    'I3.2.2': groupements.reduce((s, g) => s + g.chiffre_affaires_fcfa, 0),
    'I4.1.1': financements.reduce((s, f) => s + f.montant_fcfa, 0),
    'I4.1.2': new Set(financements.map((f) => f.groupement_id)).size,
    'I4.1.3': duRemboursable === 0 ? 0 : Math.round((rembourse / duRemboursable) * 100),
    'I4.2.1': groupements.filter((g) => g.etape === 'autonome').length,
    'I4.2.2': bureau.length === 0 ? 0 : Math.round((femmesAuBureau / bureau.length) * 100),
    'I4.2.3': groupements.filter((g) => g.etape === 'en_production' || g.etape === 'autonome').length,
  };

  const axes: AxeStrategique[] = [];
  const resultats: ResultatAttendu[] = [];
  const indicateurs: Indicateur[] = [];

  let idAxe = 1;
  let idResultat = 1;
  let idIndicateur = 1;

  for (const modeleAxe of CADRE_LOGIQUE) {
    const tauxAxe: number[] = [];

    for (const modeleResultat of modeleAxe.resultats) {
      const tauxResultat: number[] = [];

      for (const m of modeleResultat.indicateurs) {
        const actuel = observees[m.code] ?? m.actuel;
        const sens = m.sens ?? 'croissant';
        // Pour un indicateur décroissant — un délai à réduire — l'atteinte se lit
        // dans l'autre sens : 118 jours pour une cible de 90 valent 76 %, pas 131 %.
        const taux =
          sens === 'decroissant'
            ? actuel === 0
              ? 100
              : Math.round((m.cible / actuel) * 100)
            : m.cible === 0
              ? 0
              : Math.round((actuel / m.cible) * 100);
        tauxResultat.push(Math.min(100, taux));

        indicateurs.push({
          id: idIndicateur,
          resultat_id: idResultat,
          axe_id: idAxe,
          code: m.code,
          intitule: m.intitule,
          unite: m.unite,
          valeur_reference: m.reference,
          valeur_actuelle: actuel,
          valeur_cible: m.cible,
          sens,
          taux_atteinte: taux,
          periodicite: m.periodicite,
          source_donnee: m.source,
          date_derniere_collecte: dansJours(-entier(a, 2, 26)),
          releves: serieVersCible(a, m.reference, actuel, 12),
          tendance: tendance(m.reference, actuel),
          ventile_par_genre: Boolean(m.genre),
        });
        idIndicateur += 1;
      }

      const avancementResultat = Math.round(
        tauxResultat.reduce((s, t) => s + t, 0) / tauxResultat.length,
      );
      resultats.push({
        id: idResultat,
        axe_id: idAxe,
        code: modeleResultat.code,
        intitule: modeleResultat.intitule,
        avancement: avancementResultat,
      });
      tauxAxe.push(avancementResultat);
      idResultat += 1;
    }

    axes.push({
      id: idAxe,
      code: modeleAxe.code,
      intitule: modeleAxe.intitule,
      description: modeleAxe.description,
      teinte: modeleAxe.teinte,
      avancement: Math.round(tauxAxe.reduce((s, t) => s + t, 0) / tauxAxe.length),
    });
    idAxe += 1;
  }

  return { axes, resultats, indicateurs };
}

function tendance(reference: number, actuel: number): Tendance {
  if (actuel > reference * 1.02) return 'hausse';
  if (actuel < reference * 0.98) return 'baisse';
  return 'stable';
}

const MOIS_SERIE = [
  'nov.', 'déc.', 'janv.', 'févr.', 'mars', 'avr.',
  'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.',
];

/**
 * Trajectoire d'un indicateur de sa valeur de référence à sa valeur actuelle.
 * La progression n'est pas linéaire : on ajoute une irrégularité, sinon les
 * courbes ressemblent à des règles et personne n'y croit.
 */
function serieVersCible(a: Alea, depart: number, arrivee: number, points: number): PointSerie[] {
  const serie: PointSerie[] = [];
  for (let i = 0; i < points; i += 1) {
    const avancement = (i + 1) / points;
    // Courbe en S : démarrage lent, accélération, palier.
    const lissage = avancement * avancement * (3 - 2 * avancement);
    const valeur = depart + (arrivee - depart) * lissage;
    const bruit = entre(a, -0.045, 0.045);
    serie.push({
      periode: MOIS_SERIE[i % MOIS_SERIE.length],
      valeur: Math.max(0, Math.round(valeur * (1 + bruit))),
      precedent: Math.max(0, Math.round(valeur * (0.62 + entre(a, -0.06, 0.06)))),
    });
  }
  return serie;
}

/* ------------------------------------------------------------------------- *
 * Activités et jalons
 * ------------------------------------------------------------------------- */

const MODELES_ACTIVITES: ReadonlyArray<{ axe: number; intitule: string; description: string }> = [
  { axe: 1, intitule: 'Recensement de terrain des groupements', description: 'Passage des agents dans les dix quartiers pour recenser et géolocaliser les groupements existants.' },
  { axe: 1, intitule: 'Caractérisation des filières par quartier', description: 'Entretiens collectifs pour rattacher chaque groupement à une filière principale et à ses filières secondaires.' },
  { axe: 1, intitule: 'Appui à la formalisation juridique', description: "Accompagnement au montage des dossiers de récépissé et d'obtention du NINEA." },
  { axe: 1, intitule: 'Mise en place du registre communal des groupements', description: 'Ouverture du registre officiel et procédure de validation des fiches par la coordination.' },
  { axe: 2, intitule: 'Cycle de formation aux techniques de saponification', description: 'Six sessions de deux jours sur la saponification à froid et le contrôle du pH.' },
  { axe: 2, intitule: 'Cycle de formation à la transformation agroalimentaire', description: "Hygiène, chaîne du froid, séchage et conditionnement des jus et confitures." },
  { axe: 2, intitule: 'Formation à la gestion et à la tenue de caisse', description: 'Carnet de comptes, calcul de marge, séparation des caisses personnelle et collective.' },
  { axe: 2, intitule: 'Certification des membres formés', description: 'Organisation des jurys, évaluation pratique et remise des certificats.' },
  { axe: 2, intitule: 'Formation au leadership et à la prise de parole', description: 'Renforcement des instances dirigeantes, en priorité auprès des femmes élues au bureau.' },
  { axe: 3, intitule: 'Constitution du catalogue des productions', description: 'Prise de vue, description et référencement des productions sur la vitrine publique.' },
  { axe: 3, intitule: 'Ouverture des trois boutiques témoins', description: 'Aménagement, dotation en mobilier et mise en place du dispositif de dépôt-vente.' },
  { axe: 3, intitule: 'Participation à la foire de la commune', description: 'Stand collectif « Made in Yeumbeul Nord » et animation commerciale sur trois jours.' },
  { axe: 3, intitule: 'Campagne de communication territoriale', description: 'Affichage, radio de quartier et réseaux sociaux pour faire connaître la marque.' },
  { axe: 3, intitule: 'Mise en place de la logistique de livraison', description: 'Organisation du groupage et des tournées de livraison entre quartiers.' },
  { axe: 4, intitule: 'Instruction des demandes de financement', description: 'Réception, instruction et arbitrage des dossiers de subvention et de crédit rotatif.' },
  { axe: 4, intitule: 'Décaissement de la première tranche', description: 'Versement aux groupements retenus et signature des conventions de remboursement.' },
  { axe: 4, intitule: 'Dotation en équipement de production', description: 'Achat et remise de presses, moulins, machines à coudre et matériel de conditionnement.' },
  { axe: 4, intitule: 'Suivi des remboursements du fonds rotatif', description: 'Relances, échéanciers et traitement des situations de défaillance.' },
];

function construireActivites(
  a: Alea,
  quartiers: Quartier[],
  filieres: Filiere[],
): { activites: Activite[]; jalons: Jalon[] } {
  const activites: Activite[] = [];
  const jalons: Jalon[] = [];
  let idJalon = 1;

  MODELES_ACTIVITES.forEach((modele, i) => {
    const id = i + 1;

    // Les activités s'échelonnent sur toute la durée du projet, en se chevauchant :
    // c'est ce qui rend le diagramme de Gantt lisible et non pas décoratif.
    //
    // La fenêtre déborde volontairement la date de démonstration. Bornée au passé,
    // elle ne produisait ni activité planifiée ni activité suspendue — les deux
    // branches de statut correspondantes étaient inatteignables — et le plan
    // d'action s'affichait intégralement en retard. Un projet présenté au maire
    // a par construction des activités à venir : c'est même ce qui justifie la
    // suite du financement.
    const debutJours =
      -520 + Math.round((i / (MODELES_ACTIVITES.length - 1)) * 640) + entier(a, -18, 18);
    // Durées longues et donc chevauchantes : à 45-165 jours pour dix-huit
    // activités réparties sur vingt-six mois, deux seulement couvraient la date
    // du jour et le plan d'action paraissait à l'arrêt.
    const duree = entier(a, 70, 260);
    const finJours = debutJours + duree;

    const echue = finJours < 0;
    const commencee = debutJours <= 0;

    let avancement: number;
    let statut: StatutActivite;

    if (echue) {
      avancement = chance(a, 0.82) ? 100 : entier(a, 72, 96);
      statut = avancement === 100 ? 'terminee' : 'en_retard';
    } else if (commencee) {
      const attendu = Math.round(((0 - debutJours) / duree) * 100);
      avancement = Math.max(4, Math.min(97, attendu + entier(a, -22, 12)));
      statut = avancement < attendu - 15 ? 'en_retard' : 'en_cours';
    } else {
      avancement = 0;
      statut = chance(a, 0.12) ? 'suspendue' : 'planifiee';
    }

    const budgetPrevu = entier(a, 6, 48) * 500_000;
    const budgetConsomme = Math.round(budgetPrevu * (avancement / 100) * entre(a, 0.82, 1.08));
    const responsable = parmi(a, AGENTS_COORDINATION);

    activites.push({
      id,
      code: `ACT-${String(id).padStart(2, '0')}`,
      intitule: modele.intitule,
      description: modele.description,
      axe_id: modele.axe,
      responsable,
      responsable_initiales: initiales(responsable),
      quartiers: chance(a, 0.4)
        ? [parmi(a, quartiers).nom, parmi(a, quartiers).nom]
        : quartiers.map((q) => q.nom),
      filieres: chance(a, 0.5) ? [parmi(a, filieres).nom] : [],
      date_debut: dansJours(debutJours),
      date_fin: dansJours(finJours),
      avancement,
      statut,
      budget_prevu_fcfa: budgetPrevu,
      budget_consomme_fcfa: Math.min(budgetConsomme, budgetPrevu),
      groupements_beneficiaires: entier(a, 6, 100),
    });

    // Un à trois jalons par activité, dont un décisif de temps à autre.
    const nombreJalons = entier(a, 1, 3);
    for (let k = 0; k < nombreJalons; k += 1) {
      const positionJours = debutJours + Math.round((duree * (k + 1)) / (nombreJalons + 1));
      const atteint = positionJours < 0 && chance(a, 0.88);
      jalons.push({
        id: idJalon,
        activite_id: id,
        intitule: intituleJalon(a, modele.intitule, k),
        description: `Jalon rattaché à l'activité « ${modele.intitule} ».`,
        date_prevue: dansJours(positionJours),
        date_reelle: atteint ? dansJours(positionJours + entier(a, -6, 14)) : null,
        statut: atteint ? 'atteint' : positionJours < 0 ? 'manque' : 'a_venir',
        decisif: k === nombreJalons - 1 && chance(a, 0.45),
      });
      idJalon += 1;
    }
  });

  // Les rendez-vous institutionnels du projet, indépendants des activités.
  const jalonsInstitutionnels: Array<[string, number, boolean]> = [
    ['Délibération du conseil municipal', -498, true],
    ['Lancement officiel du projet And Jappo Meunal Souniou Bopp', -472, true],
    ['Signature de la convention avec les partenaires financiers', -366, true],
    ['Premier comité de pilotage', -288, false],
    ['Restitution publique à mi-parcours', -140, true],
    ['Deuxième comité de pilotage', -62, false],
    ['Démonstration de la plateforme au Maire', 0, true],
    ['Ouverture publique de la vitrine', 21, true],
    ['Bilan annuel devant le conseil municipal', 74, false],
  ];

  for (const [intitule, jours, decisif] of jalonsInstitutionnels) {
    jalons.push({
      id: idJalon,
      activite_id: null,
      intitule,
      description: 'Jalon institutionnel du projet.',
      date_prevue: dansJours(jours),
      date_reelle: jours < 0 ? dansJours(jours + entier(a, 0, 5)) : null,
      statut: jours < 0 ? 'atteint' : 'a_venir',
      decisif,
    });
    idJalon += 1;
  }

  jalons.sort((x, y) => x.date_prevue.localeCompare(y.date_prevue));
  return { activites, jalons };
}

function intituleJalon(a: Alea, activite: string, index: number): string {
  const modeles = [
    'Note de cadrage validée',
    'Première vague achevée',
    'Livrable remis à la coordination',
    'Restitution aux groupements',
    'Recette et clôture',
  ];
  // L'intitulé ne reprend pas celui de l'activité : le jalon porte `activite_id`,
  // c'est à l'écran de décider s'il affiche le rattachement. Le répéter ici
  // produisait « Recette et clôture — mise en place de la logistique — Mise en
  // place de la logistique » sur toute chronologie qui montre les deux.
  return modeles[(index + activite.length) % modeles.length];
}

/* ------------------------------------------------------------------------- *
 * Formations, sessions, certifications
 * ------------------------------------------------------------------------- */

const MODULES_FORMATION: ReadonlyArray<{
  nom: string;
  type: Formation['type_module'];
  filiere: string | null;
  heures: number;
  cout: number;
}> = [
  { nom: 'Techniques de saponification à froid', type: 'technique', filiere: 'Saponification', heures: 16, cout: 12000 },
  { nom: 'Hygiène et qualité en transformation alimentaire', type: 'technique', filiere: 'Transformation agroalimentaire', heures: 14, cout: 10000 },
  { nom: 'Conditionnement et étiquetage', type: 'technique', filiere: null, heures: 8, cout: 7500 },
  { nom: 'Techniques de coupe et de finition', type: 'technique', filiere: 'Couture', heures: 24, cout: 15000 },
  { nom: "Gestion financière d'un groupement", type: 'gestion', filiere: null, heures: 12, cout: 9000 },
  { nom: 'Tenue de caisse et carnet de comptes', type: 'gestion', filiere: null, heures: 8, cout: 6000 },
  { nom: 'Accès au financement et montage de dossier', type: 'gestion', filiere: null, heures: 10, cout: 8000 },
  { nom: 'Techniques de vente et négociation', type: 'commercial', filiere: null, heures: 10, cout: 8000 },
  { nom: 'Commercialisation numérique et réseaux sociaux', type: 'commercial', filiere: null, heures: 12, cout: 10000 },
  { nom: 'Fixation des prix et calcul de marge', type: 'commercial', filiere: null, heures: 8, cout: 6500 },
  { nom: 'Vie associative et gouvernance de GIE', type: 'organisationnel', filiere: null, heures: 10, cout: 7000 },
  { nom: 'Leadership féminin et prise de parole', type: 'organisationnel', filiere: null, heures: 12, cout: 9000 },
];

/** Ce que le module de formation permet de mesurer, une fois les sessions tenues. */
export interface StatistiquesFormation {
  /** Membres ayant assisté à au moins une session achevée. */
  membresFormes: number;
  /** Membres détenant au moins une certification. */
  membresCertifies: number;
  /** Moyenne des taux de présence des sessions achevées, en %. */
  tauxPresenceMoyen: number;
}

function construireFormations(
  a: Alea,
  membres: Membre[],
  groupements: Groupement[],
  quartiers: Quartier[],
): {
  formations: Formation[];
  sessions: SessionFormation[];
  certifications: Certification[];
  statistiques: StatistiquesFormation;
} {
  const formations: Formation[] = [];
  const sessions: SessionFormation[] = [];
  const certifications: Certification[] = [];
  let idSession = 1;
  let idCertification = 1;

  const parId = new Map(membres.map((m) => [m.id, m]));
  const groupementParId = new Map(groupements.map((g) => [g.id, g]));

  // Les présences et les certifications sont nominatives : c'est ce qui permet
  // d'afficher un taux de certification qui corresponde à la liste juste en dessous,
  // et une fiche membre dont le compteur n'est pas décoratif.
  const membresFormes = new Set<number>();
  const membresCertifies = new Set<number>();
  const tauxPresence: number[] = [];

  MODULES_FORMATION.forEach((module, i) => {
    const id = i + 1;
    const nombreSessions = entier(a, 2, 6);
    let participants = 0;
    let certifies = 0;

    for (let k = 0; k < nombreSessions; k += 1) {
      // Une session sur six est encore à venir : un calendrier de formation qui
      // n'annonce plus rien laisse penser que le programme est terminé.
      const debutJours = chance(a, 0.17) ? entier(a, 4, 70) : -entier(a, 6, 470);
      const quartier = parmi(a, quartiers);
      const cible = entier(a, 18, 32);
      const terminee = debutJours < -3;
      const presents = terminee ? Math.round(cible * entre(a, 0.62, 1)) : 0;
      participants += presents;

      sessions.push({
        id: idSession,
        formation_id: id,
        formation_nom: module.nom,
        date_debut: dansJours(debutJours),
        date_fin: dansJours(debutJours + Math.ceil(module.heures / 6)),
        lieu: parmi(a, [
          'Maison des jeunes',
          'Centre socioculturel',
          'Salle polyvalente de la mairie',
          'Foyer des femmes',
          'École élémentaire',
        ] as const) + ` — ${quartier.nom}`,
        quartier: quartier.nom,
        formateur: parmi(a, FORMATEURS),
        effectif_cible: cible,
        effectif_present: presents,
        taux_presence: terminee ? Math.round((presents / cible) * 100) : 0,
        statut: terminee ? 'terminee' : 'planifiee',
      });

      if (terminee) {
        tauxPresence.push(Math.round((presents / cible) * 100));

        // Une session se tient dans un quartier : ses participantes en viennent
        // majoritairement. Un tirage uniforme sur les 1 600 membres donnerait des
        // listes de présence géographiquement absurdes.
        const bassin = membres.filter((m) => {
          const g = groupementParId.get(m.groupement_id);
          return g?.quartier.nom === quartier.nom;
        });
        const vivier = bassin.length >= presents ? bassin : membres;

        const presentsIds = new Set<number>();
        let gardeFou = 0;
        while (presentsIds.size < presents && gardeFou < presents * 12) {
          presentsIds.add(vivier[entier(a, 0, vivier.length - 1)].id);
          gardeFou += 1;
        }

        // Toutes les présentes ne sont pas certifiées : le jury sanctionne.
        const partCertifiee = entre(a, 0.5, 0.88);

        // Le jury se tient une à trois semaines après la session, et jamais après
        // aujourd'hui : une session close il y a six jours produisait sinon des
        // certificats datés de la semaine prochaine.
        const finSession = debutJours + Math.ceil(module.heures / 6);
        const jourJury = Math.min(-1, finSession + entier(a, 5, 18));
        for (const membreId of presentsIds) {
          membresFormes.add(membreId);
          if (!chance(a, partCertifiee)) continue;

          const membre = parId.get(membreId)!;
          const groupement = groupementParId.get(membre.groupement_id)!;
          membresCertifies.add(membreId);
          certifies += 1;

          certifications.push({
            id: idCertification,
            membre_id: membre.id,
            membre_nom: membre.nom_complet,
            groupement_nom: groupement.nom,
            formation_nom: module.nom,
            date_certification: dansJours(jourJury),
            score: entier(a, 58, 98),
            numero_certificat: `MYN-${2025 + (idCertification % 2)}-${String(idCertification).padStart(4, '0')}`,
          });
          idCertification += 1;
        }
      }
      idSession += 1;
    }

    formations.push({
      id,
      nom: module.nom,
      slug: slugifier(module.nom),
      description: `Module « ${module.nom} » du programme de renforcement de capacités, dispensé aux membres des groupements accompagnés par la Commune de Yeumbeul Nord.`,
      type_module: module.type,
      filiere_nom: module.filiere,
      duree_heures: module.heures,
      cout_par_participant_fcfa: module.cout,
      nombre_sessions: nombreSessions,
      nombre_participants: participants,
      taux_certification: participants === 0 ? 0 : Math.round((certifies / participants) * 100),
    });
  });

  sessions.sort((x, y) => y.date_debut.localeCompare(x.date_debut));
  certifications.sort((x, y) => y.date_certification.localeCompare(x.date_certification));

  return {
    formations,
    sessions,
    certifications,
    statistiques: {
      membresFormes: membresFormes.size,
      membresCertifies: membresCertifies.size,
      tauxPresenceMoyen:
        tauxPresence.length === 0
          ? 0
          : Math.round(tauxPresence.reduce((s, t) => s + t, 0) / tauxPresence.length),
    },
  };
}

/* ------------------------------------------------------------------------- *
 * Financement
 * ------------------------------------------------------------------------- */

function construireFinancement(
  a: Alea,
  groupements: Groupement[],
): { financements: Financement[]; mouvements: MouvementFinancier[] } {
  const financements: Financement[] = [];
  const mouvements: MouvementFinancier[] = [];

  // Un groupement encore au stade « identifié » n'a pas reçu de financement :
  // le décaissement suit le parcours, il ne le précède pas.
  const eligibles = groupements.filter((g) => ETAPES.indexOf(g.etape) >= 2);

  let id = 1;
  let idMouvement = 1;

  for (const g of eligibles) {
    if (!chance(a, 0.74)) continue;

    const nombre = entier(a, 1, 2);
    for (let k = 0; k < nombre; k += 1) {
      const type = pondere(
        a,
        ['subvention', 'credit_rotatif', 'equipement', 'fonds_de_roulement'] as const,
        [34, 30, 22, 14],
      ) as TypeFinancement;

      const montant = entier(a, 2, 18) * 100_000;
      const dateJours = -entier(a, 12, 500);
      const remboursable = type === 'credit_rotatif' || type === 'fonds_de_roulement';

      // Le statut se tire d'abord, le montant remboursé en découle. L'inverse — tirer
      // une part remboursée puis en déduire le statut — ne produit jamais de
      // défaillance, puisqu'un tirage continu ne tombe jamais exactement sur zéro.
      // Or une défaillance à zéro pour cent, sur soixante-dix crédits, ne trompe personne.
      let statut: Financement['statut'] = 'decaisse';
      let rembourse = 0;

      if (remboursable) {
        const echu = dateJours < -300;
        statut = pondere(
          a,
          ['rembourse', 'remboursement_partiel', 'defaillant'] as const,
          echu ? [58, 27, 15] : [22, 66, 12],
        ) as Financement['statut'];

        if (statut === 'rembourse') rembourse = montant;
        else if (statut === 'remboursement_partiel') {
          rembourse = Math.round((montant * entre(a, 0.15, 0.85)) / 5_000) * 5_000;
        }
      }

      financements.push({
        id,
        reference: `FIN-${String(id).padStart(4, '0')}`,
        groupement_id: g.id,
        groupement_nom: g.nom,
        type_financement: type,
        montant_fcfa: montant,
        montant_rembourse_fcfa: rembourse,
        bailleur: parmi(a, BAILLEURS),
        date_decaissement: dansJours(dateJours),
        date_prevue_remboursement: remboursable ? dansJours(dateJours + 365) : null,
        statut,
        objet: objetFinancement(a, type, g.filiere.nom),
      });

      g.financement_recu_fcfa += montant;

      mouvements.push({
        id: idMouvement,
        reference: `MVT-${String(idMouvement).padStart(5, '0')}`,
        libelle: `Décaissement ${type === 'equipement' ? 'en équipement' : ''} — ${g.nom}`.replace('  ', ' '),
        contrepartie: g.nom,
        categorie: 'Décaissement',
        montant_fcfa: -montant,
        date: dansJours(dateJours),
        moyen: pondere(
          a,
          ['virement', 'wave', 'orange_money', 'especes'] as const,
          [46, 22, 20, 12],
        ) as MoyenPaiement,
        statut: 'valide',
      });
      idMouvement += 1;

      const fenetreRemboursement = Math.max(1, -dateJours - 5);

      if (rembourse > 0) {
        mouvements.push({
          id: idMouvement,
          reference: `MVT-${String(idMouvement).padStart(5, '0')}`,
          libelle: `Remboursement — ${g.nom}`,
          contrepartie: g.nom,
          categorie: 'Remboursement',
          montant_fcfa: rembourse,
          // Un remboursement se situe entre son décaissement et aujourd'hui, jamais
          // après : le tableau de bord affiche les derniers mouvements par date
          // décroissante, et des remboursements datés de l'an prochain arrivaient
          // en tête de liste.
          date: dansJours(dateJours + entier(a, Math.min(20, fenetreRemboursement), fenetreRemboursement)),
          moyen: pondere(a, ['wave', 'orange_money', 'especes', 'virement'] as const, [38, 30, 18, 14]) as MoyenPaiement,
          statut: pondere(a, ['valide', 'en_attente'] as const, [92, 8]) as MouvementFinancier['statut'],
        });
        idMouvement += 1;
      }

      id += 1;
    }
  }

  mouvements.sort((x, y) => y.date.localeCompare(x.date));
  return { financements, mouvements };
}

function objetFinancement(a: Alea, type: TypeFinancement, filiere: string): string {
  switch (type) {
    case 'equipement':
      return `Dotation en matériel de production — filière ${filiere.toLowerCase()}`;
    case 'credit_rotatif':
      return "Crédit rotatif pour l'achat de matières premières";
    case 'fonds_de_roulement':
      return 'Fonds de roulement pour la campagne de production';
    default:
      return parmi(a, [
        'Subvention pour l’aménagement du local de production',
        'Subvention pour le conditionnement et l’étiquetage',
        'Subvention pour la participation à la foire communale',
        'Subvention d’amorçage post-formalisation',
      ] as const);
  }
}

/* ------------------------------------------------------------------------- *
 * Commandes
 * ------------------------------------------------------------------------- */

function construireCommandes(
  a: Alea,
  groupements: Groupement[],
  productions: Production[],
  quartiers: Quartier[],
): { commandes: Commande[]; horsQuartier: number } {
  const commandes: Commande[] = [];
  const disponibles = productions.filter((p) => p.disponible);
  const quartierDuGroupement = new Map(groupements.map((g) => [g.id, g.quartier.nom]));
  let horsQuartier = 0;

  for (let i = 0; i < 180; i += 1) {
    const id = i + 1;
    const nombreLignes = entier(a, 1, 4);
    const lignes = [];
    const quartiersVendeurs = new Set<string>();
    let total = 0;

    for (let k = 0; k < nombreLignes; k += 1) {
      const p = disponibles[entier(a, 0, disponibles.length - 1)];
      const quantite = entier(a, 1, 6);
      total += p.prix_unitaire_fcfa * quantite;
      quartiersVendeurs.add(quartierDuGroupement.get(p.groupement_id) ?? '');
      lignes.push({
        production_id: p.id,
        production_nom: p.nom,
        production_photo: p.photo,
        groupement_nom: p.groupement_nom,
        quantite,
        prix_unitaire_fcfa: p.prix_unitaire_fcfa,
        unite: p.unite,
      });
    }

    const genre: Genre = chance(a, 0.6) ? 'femme' : 'homme';
    const client = `${parmi(a, genre === 'femme' ? PRENOMS_FEMININS : PRENOMS_MASCULINS)} ${parmi(a, NOMS_FAMILLE)}`;
    const quartier = parmi(a, quartiers);
    const jours = -entier(a, 0, 90);

    // Une commande compte comme « hors quartier » dès qu'un groupement vendeur
    // n'est pas implanté dans le quartier de livraison : c'est exactement la
    // définition de l'indicateur I3.2.1, il n'y a donc rien à saisir à part.
    if ([...quartiersVendeurs].some((q) => q !== quartier.nom)) horsQuartier += 1;

    commandes.push({
      id,
      numero: `CMD-2026-${String(1000 + id)}`,
      statut: pondere(
        a,
        ['livree', 'preparee', 'confirmee', 'annulee'] as const,
        [56, 18, 20, 6],
      ) as Commande['statut'],
      client_nom: client,
      client_telephone: telephone(a),
      adresse_livraison: `${entier(a, 1, 240)} rue ${entier(a, 1, 40)}, ${quartier.nom}`,
      quartier: quartier.nom,
      lignes,
      montant_total_fcfa: total,
      moyen_paiement: pondere(
        a,
        ['wave', 'orange_money', 'free_money', 'especes'] as const,
        [42, 30, 10, 18],
      ) as MoyenPaiement,
      date_creation: ilYAJours(-jours, entier(a, 8, 20), entier(a, 0, 59)),
    });
  }

  commandes.sort((x, y) => y.date_creation.localeCompare(x.date_creation));
  return { commandes, horsQuartier };
}

/* ------------------------------------------------------------------------- *
 * Actualités
 * ------------------------------------------------------------------------- */

const MODELES_ACTUALITES: ReadonlyArray<{
  titre: string;
  chapeau: string;
  categorie: string;
  theme: string;
  jours: number;
}> = [
  {
    titre: 'Ouverture de la troisième boutique témoin à Bountou Pikine',
    chapeau: "La commune inaugure un troisième point de vente permanent pour les productions des groupements accompagnés.",
    categorie: 'Commercialisation',
    theme: 'commerce',
    jours: 6,
  },
  {
    titre: 'Quarante-deux membres certifiés à l’issue du cycle de saponification',
    chapeau: 'La remise des certificats s’est tenue à la salle polyvalente en présence du Maire et des formateurs.',
    categorie: 'Formation',
    theme: 'certification',
    jours: 14,
  },
  {
    titre: 'Le fonds rotatif dépasse les cinquante millions décaissés',
    chapeau: "Depuis le lancement, soixante-trois groupements ont bénéficié d'un appui financier remboursable.",
    categorie: 'Financement',
    theme: 'gestion',
    jours: 23,
  },
  {
    titre: 'Retour sur la foire communale : trois jours, onze filières',
    chapeau: 'Le stand collectif « Made in Yeumbeul Nord » a accueilli plus de mille visiteurs sur le week-end.',
    categorie: 'Événement',
    theme: 'valorisation',
    jours: 38,
  },
  {
    titre: 'Nouvelle session de formation à la gestion ouverte aux inscriptions',
    chapeau: 'Deux sessions de douze heures sont programmées pour les trésorières des groupements.',
    categorie: 'Formation',
    theme: 'formation',
    jours: 47,
  },
  {
    titre: 'Vingt-sept groupements ont obtenu leur NINEA cette année',
    chapeau: "L'accompagnement à la formalisation porte ses fruits : le délai moyen est passé de sept à quatre mois.",
    categorie: 'Structuration',
    theme: 'gouvernance',
    jours: 62,
  },
  {
    titre: 'Les productions de Yeumbeul Nord arrivent en livraison à Dakar',
    chapeau: 'Un groupement de logistique assure désormais deux tournées hebdomadaires vers le centre-ville.',
    categorie: 'Commercialisation',
    theme: 'logistique',
    jours: 78,
  },
  {
    titre: 'Journée internationale des femmes : les groupements à l’honneur',
    chapeau: "Plus de trois cents membres se sont retrouvées pour une journée d'échanges et de démonstrations.",
    categorie: 'Événement',
    theme: 'ceremonie',
    jours: 96,
  },
  {
    titre: 'Le maraîchage urbain s’installe sur les parcelles de Diamalaye',
    chapeau: 'Quatre groupements expérimentent la culture de contre-saison sur des parcelles mises à disposition.',
    categorie: 'Production',
    theme: 'production',
    jours: 118,
  },
  {
    titre: 'And Jappo Meunal Souniou Bopp : un an de mise en œuvre',
    chapeau: 'Bilan à mi-parcours du projet porté par la Commune de Yeumbeul Nord et ses partenaires.',
    categorie: 'Projet',
    theme: 'vie-associative',
    jours: 140,
  },
];

function construireActualites(a: Alea): Actualite[] {
  return MODELES_ACTUALITES.map((m, i) => {
    const candidates = photosParTheme(m.theme);
    const photo = (candidates.length > 0 ? candidates : [PHOTOS[CLES_PHOTOS[i % CLES_PHOTOS.length]]])[0];
    return {
      id: i + 1,
      titre: m.titre,
      slug: slugifier(m.titre),
      chapeau: m.chapeau,
      contenu: corpsActualite(m.chapeau),
      photo: photo.hero?.src ?? photo.carte?.src ?? '',
      categorie: m.categorie,
      auteur: parmi(a, AGENTS_COORDINATION),
      date_publication: jourSeul(ilYAJours(m.jours)),
      temps_lecture_min: entier(a, 2, 6),
    };
  });
}

function corpsActualite(chapeau: string): string {
  return (
    `${chapeau}\n\n` +
    `La coordination du projet « And Jappo Meunal Souniou Bopp » rappelle que l'ensemble des ` +
    `groupements accompagnés est recensé sur la plateforme, avec leur filière, leur quartier et ` +
    `leur catalogue de productions. Les habitants de la commune peuvent y commander directement ` +
    `auprès des groupements, et les partenaires y suivent l'avancement des indicateurs du projet.\n\n` +
    `Pour toute information, la coordination reçoit à la mairie de Yeumbeul Nord du lundi au ` +
    `vendredi, ou par téléphone aux heures d'ouverture.`
  );
}

/* ------------------------------------------------------------------------- *
 * Journal d'audit
 * ------------------------------------------------------------------------- */

function construireJournal(
  a: Alea,
  groupements: Groupement[],
  productions: Production[],
  financements: Financement[],
  sessions: SessionFormation[],
): EvenementJournal[] {
  const journal: EvenementJournal[] = [];
  let id = 1;

  const pousser = (
    acteur: string,
    action: string,
    cible: string,
    lien: string | null,
    categorie: EvenementJournal['categorie'],
    minutes: number,
  ) => {
    const acteurTeinte = TEINTES_AVATAR[id % TEINTES_AVATAR.length];
    journal.push({
      id,
      acteur,
      acteur_initiales: initiales(acteur),
      acteur_teinte: acteurTeinte,
      action,
      cible,
      cible_lien: lien,
      horodatage: new Date(DATE_REFERENCE.getTime() - minutes * 60_000).toISOString(),
      categorie,
    });
    id += 1;
  };

  let minutes = 6;
  for (let i = 0; i < 60; i += 1) {
    const agent = parmi(a, AGENTS_COORDINATION);
    // Tirage pondéré plutôt qu'uniforme : la validation de fiches est le geste
    // quotidien de la coordination, l'export de rapport une opération rare.
    const typeEvenement = pondere(a, [0, 1, 2, 3, 4, 5, 6], [26, 20, 12, 14, 14, 8, 6]);

    switch (typeEvenement) {
      case 0: {
        const g = parmi(a, groupements);
        pousser(agent, 'a validé la fiche du groupement', g.nom, `/groupements/${g.slug}`, 'groupement', minutes);
        break;
      }
      case 1: {
        const p = parmi(a, productions);
        pousser(agent, 'a publié la production', p.nom, `/productions/${p.slug}`, 'production', minutes);
        break;
      }
      case 2: {
        const g = parmi(a, groupements);
        pousser(agent, "a fait passer à l'étape « en production »", g.nom, `/groupements/${g.slug}`, 'groupement', minutes);
        break;
      }
      case 3: {
        const f = parmi(a, financements);
        pousser(agent, 'a enregistré le décaissement', `${f.reference} — ${f.groupement_nom}`, `/financements/${f.reference}`, 'financement', minutes);
        break;
      }
      case 4: {
        const s = parmi(a, sessions);
        pousser(agent, 'a saisi la feuille de présence de la session', s.formation_nom, `/formations/sessions/${s.id}`, 'formation', minutes);
        break;
      }
      case 5: {
        const g = parmi(a, groupements);
        pousser(agent, 'a rejeté la déclaration de production de', g.nom, `/groupements/${g.slug}`, 'production', minutes);
        break;
      }
      default: {
        pousser(
          agent,
          'a exporté le rapport de suivi',
          parmi(a, ['Rapport mensuel', 'Tableau des indicateurs', 'Liste des groupements financés'] as const),
          null,
          'systeme',
          minutes,
        );
      }
    }

    // Les événements s'espacent en remontant le temps : dense sur la journée,
    // clairsemé sur les semaines précédentes.
    minutes += entier(a, 8, 60) * (1 + Math.floor(i / 8));
  }

  return journal;
}

/* ------------------------------------------------------------------------- *
 * Boutiques témoins
 * ------------------------------------------------------------------------- */

function construireBoutiques(): Boutique[] {
  return [
    {
      id: 1,
      nom: 'Boutique témoin — Marché de Darou Salam',
      adresse: 'Marché central, allée des artisanes',
      quartier: 'Darou Salam',
      latitude: 14.7869,
      longitude: -17.3815,
      telephone: '+221 77 412 65 30',
      responsable: 'Fatou Mbaye',
      heure_ouverture: '09:00',
      heure_fermeture: '19:00',
      note_moyenne: 4.6,
    },
    {
      id: 2,
      nom: 'Boutique témoin — Bountou Pikine',
      adresse: 'Route de Malika, face à la maison des jeunes',
      quartier: 'Bountou Pikine',
      latitude: 14.7906,
      longitude: -17.3769,
      telephone: '+221 78 203 11 84',
      responsable: 'Awa Diagne',
      heure_ouverture: '09:30',
      heure_fermeture: '18:30',
      note_moyenne: 4.4,
    },
    {
      id: 3,
      nom: 'Boutique témoin — Esplanade de la mairie',
      adresse: 'Esplanade de la mairie de Yeumbeul Nord',
      quartier: 'Diamalaye',
      latitude: CENTRE_COMMUNE.latitude,
      longitude: CENTRE_COMMUNE.longitude,
      telephone: '+221 76 559 42 07',
      responsable: 'Ndèye Coumba Sy',
      heure_ouverture: '08:30',
      heure_fermeture: '17:30',
      note_moyenne: 4.8,
    },
  ];
}
