/* ATTENTION — COPIE SYNCHRONISEE.
   Le fichier canonique est `frontend-admin/src/domaine/index.ts`.
   Toute modification faite ici sera ecrasee au prochain
   `python tools/synchroniser_domaine.py`. */

/**
 * Point d'entrée unique de la couche de domaine.
 *
 * Les écrans importent depuis `@/domaine`, jamais depuis un fichier interne :
 * la réorganisation du dossier reste ainsi sans effet sur eux.
 */

export * from './types';
export * from './referentiels';
export * from './source';
export { DATE_REFERENCE, jeuDeDonnees } from './generateur';
export { PHOTOS, CLES_PHOTOS, photosParFiliere, photosParTheme } from './photos.generated';
export type { Photo, VariantePhoto } from './photos.generated';
