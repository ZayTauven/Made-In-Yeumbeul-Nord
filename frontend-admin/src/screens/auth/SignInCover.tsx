'use client';
/*
 * Connexion — split illustré.
 *
 * Écran réel, branché sur `POST /api/auth/connexion/`. Il remplace la maquette
 * du template : ni boutons Google/Apple/GitHub — le projet n'a pas
 * d'authentification tierce —, ni « créer un compte » : les comptes sont
 * ouverts par un administrateur de la commune, l'auto-inscription est en
 * roadmap post-MVP1.
 *
 * Le champ d'identité accepte identifiant, courriel ou téléphone, comme le
 * backend : un agent municipal retient plus sûrement son numéro que
 * l'identifiant qu'on lui a attribué.
 */
import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { ErreurApi } from '../../services/api';
import { seConnecter } from '../../services/authentification';
import { EYE, EYE_OFF } from './authShared';
import { AlerteErreur, CadreAuth, EnteteAuth } from './communAuth';

/**
 * Destination après connexion.
 *
 * `suite` vient de l'URL, donc de l'extérieur : on n'y accepte qu'un chemin
 * interne. Un `//exemple.test` y serait lu comme une adresse absolue par le
 * navigateur, et la page de connexion deviendrait un tremplin de redirection.
 */
function destinationSure(suite: string | null): string {
  if (!suite || !suite.startsWith('/') || suite.startsWith('//')) return '/';
  return suite;
}

function ContenuConnexion() {
  const t = useTranslations('auth.connexion');
  const routeur = useRouter();
  const suite = destinationSure(useSearchParams().get('suite'));

  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [reveler, setReveler] = useState(false);
  const [erreurIdentifiant, setErreurIdentifiant] = useState('');
  const [erreurMotDePasse, setErreurMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  function valider(): boolean {
    const e1 = identifiant.trim() ? '' : t('identifiantManquant');
    const e2 = motDePasse ? '' : t('motDePasseManquant');
    setErreurIdentifiant(e1);
    setErreurMotDePasse(e2);
    return !e1 && !e2;
  }

  async function soumettre(evenement: FormEvent) {
    evenement.preventDefault();
    setErreur('');
    if (!valider()) return;

    setEnvoi(true);
    try {
      await seConnecter(identifiant.trim(), motDePasse);
      // `refresh()` force le rendu serveur à relire la session : sans lui, le
      // shell resterait sur son rendu d'avant connexion.
      routeur.replace(suite);
      routeur.refresh();
    } catch (cause) {
      if (cause instanceof ErreurApi) {
        // 401 est le refus attendu ; le reste dit que l'API elle-même ne
        // répond pas, et l'agent doit pouvoir distinguer les deux.
        setErreur(cause.statut === 401 ? t('echec') : cause.message);
      } else {
        setErreur(t('indisponible'));
      }
      setEnvoi(false);
    }
  }

  return (
    <CadreAuth>
      <EnteteAuth titre={t('titre')} sousTitre={t('sousTitre')} />

      {erreur && <AlerteErreur message={erreur} />}

      <form
        onSubmit={soumettre}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-4)' }}
        noValidate
      >
        <div className="ax-field">
          <label className="ax-label" htmlFor="identifiant">{t('identifiant')}</label>
          <input
            id="identifiant"
            type="text"
            className={`ax-input${erreurIdentifiant ? ' is-invalid' : ''}`}
            autoComplete="username"
            autoFocus
            placeholder={t('identifiantIndice')}
            value={identifiant}
            onChange={(e) => setIdentifiant(e.target.value)}
            aria-invalid={erreurIdentifiant ? 'true' : 'false'}
            aria-describedby="identifiant-message"
            required
          />
          {erreurIdentifiant && (
            <p id="identifiant-message" className="ax-field__message ax-field__message--error">
              {erreurIdentifiant}
            </p>
          )}
        </div>

        <div className="ax-field">
          <div className="ax-cluster" style={{ justifyContent: 'space-between' }}>
            <label className="ax-label" htmlFor="mot-de-passe">{t('motDePasse')}</label>
            <Link className="ax-link" href="/auth/reset-password-cover" style={{ fontSize: 'var(--ax-text-xs)' }}>
              {t('motDePasseOublie')}
            </Link>
          </div>
          <div className="ax-field__control">
            <input
              id="mot-de-passe"
              className={`ax-input ax-input--with-trailing${erreurMotDePasse ? ' is-invalid' : ''}`}
              autoComplete="current-password"
              placeholder="••••••••••••"
              type={reveler ? 'text' : 'password'}
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              aria-invalid={erreurMotDePasse ? 'true' : 'false'}
              aria-describedby="mot-de-passe-message"
              required
            />
            <button
              type="button"
              className="ax-field__affix ax-field__affix--trailing ax-field__affix--button"
              onClick={() => setReveler((v) => !v)}
              aria-pressed={reveler}
              aria-label={reveler ? t('masquer') : t('afficher')}
            >
              {reveler ? EYE_OFF : EYE}
            </button>
          </div>
          {erreurMotDePasse && (
            <p id="mot-de-passe-message" className="ax-field__message ax-field__message--error">
              {erreurMotDePasse}
            </p>
          )}
        </div>

        <button
          type="submit"
          className={`ax-btn ax-btn--primary ax-btn--lg ax-btn--block${envoi ? ' is-loading' : ''}`}
          aria-busy={envoi}
          disabled={envoi}
        >
          <span className="ax-btn__spinner" aria-hidden="true"></span>
          <span className="ax-btn__label">{envoi ? t('enCours') : t('valider')}</span>
        </button>
      </form>

      <p style={{ margin: 0, fontSize: 'var(--ax-text-sm)', lineHeight: 1.6, color: 'var(--ax-text-muted)' }}>
        {t('aide')}
      </p>
    </CadreAuth>
  );
}

/**
 * `useSearchParams` — pour lire `?suite=` — impose une frontière `Suspense` :
 * sans elle, le prérendu de la page échoue à la construction.
 */
export function SignInCover() {
  return (
    <Suspense fallback={<CadreAuth><span /></CadreAuth>}>
      <ContenuConnexion />
    </Suspense>
  );
}

export default SignInCover;
