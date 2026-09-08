'use client';
/*
 * Mot de passe oublié — split illustré.
 *
 * Branché sur `POST /api/auth/mot-de-passe/oubli/`, qui répond de la même façon
 * que le compte existe ou non. L'écran ne peut donc pas — et ne doit pas — dire
 * si l'identifiant est connu : ce serait faire du formulaire un annuaire.
 * D'où le message d'accusé conditionnel, « si un compte correspond ».
 */
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { ErreurApi } from '../../services/api';
import { demanderReinitialisation } from '../../services/authentification';
import { AlerteErreur, CadreAuth, EnteteAuth } from './communAuth';

const ENVELOPPE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width={40} height={40} aria-hidden="true"><path d="M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10z" /><path d="M3 7l9 6l9 -6" /></svg>
);

export function ResetPasswordCover() {
  const t = useTranslations('auth.oubli');

  const [identifiant, setIdentifiant] = useState('');
  const [erreurIdentifiant, setErreurIdentifiant] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);

  async function soumettre(evenement: FormEvent) {
    evenement.preventDefault();
    setErreur('');

    if (!identifiant.trim()) {
      setErreurIdentifiant(t('identifiantManquant'));
      return;
    }
    setErreurIdentifiant('');

    setEnvoi(true);
    try {
      await demanderReinitialisation(identifiant.trim());
      setEnvoye(true);
    } catch (cause) {
      setErreur(cause instanceof ErreurApi ? cause.message : t('identifiantManquant'));
    } finally {
      setEnvoi(false);
    }
  }

  if (envoye) {
    return (
      <CadreAuth>
        <span style={{ color: 'var(--ax-accent)' }}>{ENVELOPPE}</span>
        <EnteteAuth titre={t('envoyeTitre')} sousTitre={t('envoyeTexte')} />
        <p style={{ margin: 0, fontSize: 'var(--ax-text-sm)', lineHeight: 1.6, color: 'var(--ax-text-muted)' }}>
          {t('envoyeIndice')}
        </p>
        <Link className="ax-btn ax-btn--secondary ax-btn--block" href="/auth/sign-in-cover">
          <span className="ax-btn__label">{t('retour')}</span>
        </Link>
      </CadreAuth>
    );
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
          <label className="ax-label" htmlFor="identifiant-oubli">{t('identifiant')}</label>
          <input
            id="identifiant-oubli"
            type="text"
            className={`ax-input${erreurIdentifiant ? ' is-invalid' : ''}`}
            autoComplete="username"
            autoFocus
            value={identifiant}
            onChange={(e) => setIdentifiant(e.target.value)}
            aria-invalid={erreurIdentifiant ? 'true' : 'false'}
            aria-describedby="identifiant-oubli-message"
            required
          />
          {erreurIdentifiant && (
            <p id="identifiant-oubli-message" className="ax-field__message ax-field__message--error">
              {erreurIdentifiant}
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

      <Link className="ax-link" href="/auth/sign-in-cover" style={{ fontSize: 'var(--ax-text-sm)' }}>
        {t('retour')}
      </Link>
    </CadreAuth>
  );
}

export default ResetPasswordCover;
