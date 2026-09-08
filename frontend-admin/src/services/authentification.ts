/**
 * Authentification — appels de l'API.
 *
 * Une fonction par route de `django-api/api/vues/authentification.py`. Les
 * écrans ne connaissent que ces fonctions : le jour où le transport changerait,
 * seul ce fichier bougerait.
 */

import {
  appelerApi,
  oublierJetonCsrf,
  rafraichirJetonCsrf,
} from './api';

/** Le compte connecté, tel que le rend `ProfilSerializer`. */
export interface Profil {
  id: number;
  username: string;
  email: string;
  telephone: string | null;
  first_name: string;
  last_name: string;
  nom_complet: string;
  initiales: string;
  fonction: string;
  role: 'administrateur' | 'agent' | 'lecture';
  avatar_teinte: string;
  est_administrateur: boolean;
  peut_ecrire: boolean;
  last_login: string | null;
}

/**
 * Ouvre une session.
 *
 * `identifiant` accepte indifféremment l'identifiant, le courriel ou le
 * téléphone : un agent municipal retient plus sûrement son numéro que
 * l'identifiant qu'on lui a attribué.
 */
export async function seConnecter(
  identifiant: string,
  motDePasse: string,
): Promise<Profil> {
  const profil = await appelerApi<Profil>('/auth/connexion/', {
    methode: 'POST',
    corps: { identifiant, mot_de_passe: motDePasse },
  });
  // Le jeton CSRF tourne à la connexion : sans cette relecture, la première
  // écriture qui suit repartirait avec l'ancien.
  await rafraichirJetonCsrf();
  return profil;
}

/** Ferme la session. Ne lève pas : se déconnecter deux fois n'est pas une erreur. */
export async function seDeconnecter(): Promise<void> {
  try {
    await appelerApi<null>('/auth/deconnexion/', { methode: 'POST' });
  } finally {
    oublierJetonCsrf();
  }
}

/** Profil du compte connecté, ou `null` si la session est fermée. */
export async function profilCourant(): Promise<Profil | null> {
  try {
    return await appelerApi<Profil>('/auth/moi/');
  } catch {
    return null;
  }
}

/** Change le mot de passe du compte connecté. */
export async function changerMotDePasse(
  motDePasseActuel: string,
  nouveauMotDePasse: string,
): Promise<void> {
  await appelerApi<null>('/auth/mot-de-passe/', {
    methode: 'POST',
    corps: {
      mot_de_passe_actuel: motDePasseActuel,
      nouveau_mot_de_passe: nouveauMotDePasse,
    },
  });
}

/**
 * Demande l'envoi d'un lien de réinitialisation.
 *
 * Le serveur répond de la même façon que le compte existe ou non : l'écran ne
 * peut donc pas — et ne doit pas — dire à l'utilisateur si l'adresse est
 * connue. Ce serait transformer le formulaire en annuaire.
 */
export async function demanderReinitialisation(identifiant: string): Promise<void> {
  await appelerApi<null>('/auth/mot-de-passe/oubli/', {
    methode: 'POST',
    corps: { identifiant },
  });
}

/** Pose un nouveau mot de passe à partir du lien reçu par courriel. */
export async function reinitialiserMotDePasse(
  uid: string,
  jeton: string,
  nouveauMotDePasse: string,
): Promise<void> {
  await appelerApi<null>('/auth/mot-de-passe/reinitialiser/', {
    methode: 'POST',
    corps: { uid, jeton, nouveau_mot_de_passe: nouveauMotDePasse },
  });
}
