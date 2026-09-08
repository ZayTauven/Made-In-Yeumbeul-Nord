'use client';
/*
 * Déconnexion.
 *
 * L'écran du template affichait un compte inventé — « Devon Okafor,
 * devon@vireo.io » —, la marque Vireo, un badge « Secure », le tout en anglais,
 * et ne fermait aucune session : il se contentait de la mise en scène, puis
 * renvoyait sur `/` au bout de dix secondes. Comme le tableau de bord n'était
 * pas gardé, on se retrouvait connecté après s'être déconnecté.
 *
 * Ici, la session est réellement fermée côté serveur, et le retour se fait vers
 * l'écran de connexion, pas vers le back-office.
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { seDeconnecter } from '../../services/authentification';
import { CadreAuth, EnteteAuth } from '../auth/communAuth';

const ROUTE_CONNEXION = '/auth/sign-in-cover';

/** Délai avant retour automatique, en secondes. */
const DELAI = 8;

const PORTE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width={40} height={40} aria-hidden="true"><path d="M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2" /><path d="M9 12h12l-3 -3" /><path d="M18 15l3 -3" /></svg>
);

export function Logout() {
  const t = useTranslations('auth.deconnexion');
  const routeur = useRouter();

  const [secondes, setSecondes] = useState(DELAI);
  const [annule, setAnnule] = useState(false);
  const [ferme, setFerme] = useState(false);
  const annuleRef = useRef(false);

  // Fermer la session pour de bon. `seDeconnecter` n'échoue pas : se
  // déconnecter deux fois, ou sans session, n'est pas une erreur.
  useEffect(() => {
    let vivant = true;
    seDeconnecter().finally(() => {
      if (vivant) setFerme(true);
    });
    return () => {
      vivant = false;
    };
  }, []);

  // Le compte à rebours ne démarre qu'une fois la session close : renvoyer vers
  // la connexion avant que le cookie soit tombé rouvrirait le back-office.
  useEffect(() => {
    if (!ferme) return undefined;
    const minuterie = setInterval(() => {
      if (annuleRef.current) return;
      setSecondes((reste) => {
        if (reste <= 1) {
          clearInterval(minuterie);
          routeur.replace(ROUTE_CONNEXION);
          return 0;
        }
        return reste - 1;
      });
    }, 1000);
    return () => clearInterval(minuterie);
  }, [ferme, routeur]);

  const annuler = () => {
    annuleRef.current = true;
    setAnnule(true);
  };

  return (
    <CadreAuth>
      <span style={{ color: 'var(--ax-accent)' }}>{PORTE}</span>

      <EnteteAuth
        titre={t('titre')}
        sousTitre={ferme ? t('sousTitre') : t('enCours')}
      />

      <Link className="ax-btn ax-btn--primary ax-btn--lg ax-btn--block" href={ROUTE_CONNEXION}>
        <span className="ax-btn__label">{t('seReconnecter')}</span>
      </Link>

      {ferme && !annule && (
        <p
          aria-live="polite"
          style={{ margin: 0, fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text-muted)' }}
        >
          {t('redirection', { secondes })}{' '}
          <button
            type="button"
            className="ax-link"
            onClick={annuler}
            style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', font: 'inherit' }}
          >
            {t('rester')}
          </button>
        </p>
      )}
    </CadreAuth>
  );
}

export default Logout;
