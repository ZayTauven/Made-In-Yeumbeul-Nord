/**
 * Logos des groupements — attribution provisoire.
 *
 * Aucun des cent groupements n'a de logo : ils n'en ont pas dans la vie réelle,
 * et le projet n'en fera pas dessiner cent. En attendant, on pioche dans les
 * emblèmes livrés avec le template et dans ceux ajoutés au dossier.
 *
 * **L'attribution n'a pas vocation à être juste.** Elle est seulement
 * *déterministe* : le même groupement reçoit toujours le même emblème, d'une
 * page à l'autre et d'une démonstration à la suivante. Un tirage au sort ferait
 * changer les logos à chaque rafraîchissement, ce qui se remarquerait
 * immédiatement dans la salle.
 *
 * Ce que ce fichier sert vraiment à éprouver : la carte doit rester propre quel
 * que soit le fichier — un SVG large et plat, un PNG carré, une photographie
 * haute, une planche entière de logos. D'où le cadre à hauteur fixe et le
 * `object-fit: contain` de `CarteGroupement`.
 *
 * Le jour où de vrais emblèmes arriveront, ils remplaceront cette liste sans
 * toucher à l'écran.
 */

/**
 * Fichiers de `public/assets/images/vendor/`.
 *
 * Les noms sont encodés à l'usage : certains portent des espaces, qu'une URL
 * n'accepte pas telle quelle.
 */
const FICHIERS = [
  // Emblèmes livrés avec le template.
  '01.svg', '02.svg', '03.svg', '04.svg', '05.svg',
  '06.svg', '07.svg', '08.svg', '09.svg',
  // Emblèmes neutres ajoutés au dossier.
  'logoipsum-410.svg', 'logoipsum-413.svg', 'logoipsum-417.svg',
  'logoipsum-418.svg', 'logoipsum-425.svg', 'logoipsum-427.svg',
  'logoipsum-428.svg', 'logoipsum-429.svg',
  'logoipsum-431.png', 'logoipsum-433.png', 'logoipsum-434.png',
  // Illustrations et planches, volontairement conservées : ce sont elles qui
  // éprouvent la mise en page, parce qu'elles ne sont ni carrées ni légères.
  '3.jpg', '19.jpg', '514.jpg', '23744.jpg',
  '7513626.jpg', '7515317.jpg', '8674676.jpg',
  'O3GMNX0.jpg', 'bbi3.jpg', 'preview.jpg',
  'christmas_2012_new_2857.jpg',
  'Africa logo collection.jpg',
  'Collection of colorful africa logo templates.jpg',
];

const DOSSIER = '/assets/images/vendor/';

/**
 * Emblème attribué à un groupement, stable dans le temps.
 *
 * Le reste sur l'identifiant suffit : les identifiants sont contigus, la
 * répartition est donc régulière et deux groupements voisins ne se retrouvent
 * pas avec le même emblème côte à côte dans la grille.
 */
export function logoDuGroupement(identifiant: number): string {
  const fichier = FICHIERS[Math.abs(identifiant) % FICHIERS.length];
  return DOSSIER + encodeURIComponent(fichier);
}

export const NOMBRE_DE_LOGOS = FICHIERS.length;
