/*
 * Vireo — déclaration d'ambiance résiduelle pour Leaflet.
 *
 * HISTORIQUE : cette édition du template importait `leaflet` sans le déclarer
 * dans package.json, et compensait par un `declare module 'leaflet'` qui typait
 * tout en `any`. `leaflet` + `@types/leaflet` sont désormais des dépendances
 * déclarées (voir package.json), donc cette déclaration a été RETIRÉE : la
 * conserver masquerait les vrais types et annulerait le bénéfice de l'ajout.
 *
 * Ne subsiste que l'import de feuille de style, qui n'est couvert par aucun
 * paquet de types. Si la configuration Next finit par déclarer `*.css`
 * globalement, ce fichier peut disparaître entièrement.
 */
declare module 'leaflet/dist/leaflet.css';
