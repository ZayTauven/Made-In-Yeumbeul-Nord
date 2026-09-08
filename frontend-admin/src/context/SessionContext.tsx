'use client';
/**
 * Session du compte connecté.
 *
 * Un seul appel à `GET /api/auth/moi/` au montage du shell, partagé par tous
 * les composants qui ont besoin de savoir qui travaille : l'en-tête pour son
 * bloc de compte, et demain les écrans de saisie pour masquer ce qu'un rôle en
 * lecture seule ne peut pas faire.
 *
 * **Le contexte ne garde pas la porte.** Un visiteur sans session est renvoyé
 * par `middleware.ts` avant d'arriver ici, et l'API refuse de toute façon les
 * écritures. Ce que ce contexte apporte est l'identité, pas l'autorisation.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { profilCourant, seDeconnecter, type Profil } from '../services/authentification';

interface EtatSession {
  profil: Profil | null;
  /** Vrai tant que le premier appel n'a pas répondu. */
  chargement: boolean;
  /** Relit le profil — après un changement de rôle, par exemple. */
  rafraichir: () => Promise<void>;
  /** Ferme la session côté serveur et oublie le profil. */
  fermer: () => Promise<void>;
}

const Session = createContext<EtatSession>({
  profil: null,
  chargement: true,
  rafraichir: async () => {},
  fermer: async () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [profil, setProfil] = useState<Profil | null>(null);
  const [chargement, setChargement] = useState(true);

  const rafraichir = useCallback(async () => {
    // `profilCourant` rend `null` plutôt que de lever quand la session est
    // fermée ou l'API absente : le shell doit s'afficher dans les deux cas.
    const courant = await profilCourant();
    setProfil(courant);
    setChargement(false);
  }, []);

  const fermer = useCallback(async () => {
    await seDeconnecter();
    setProfil(null);
  }, []);

  useEffect(() => {
    void rafraichir();
  }, [rafraichir]);

  const valeur = useMemo(
    () => ({ profil, chargement, rafraichir, fermer }),
    [profil, chargement, rafraichir, fermer],
  );

  return <Session.Provider value={valeur}>{children}</Session.Provider>;
}

/** Le compte connecté, ou `null` tant qu'il n'est pas connu. */
export function useSession(): EtatSession {
  return useContext(Session);
}
