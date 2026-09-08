'use client';
/*
 * Choix du mot de passe — split illustré.
 *
 * Cible du lien envoyé par courriel : `/auth/create-password-cover?uid=…&jeton=…`.
 * L'écran consomme `POST /api/auth/mot-de-passe/reinitialiser/`.
 *
 * Le lien expire au bout de deux heures et ne sert qu'une fois. Quand il n'est
 * plus valable, l'écran le dit et propose d'en demander un autre, plutôt que de
 * laisser l'agent saisir un mot de passe qui sera refusé à l'envoi.
 */
import { Suspense, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { ErreurApi } from '../../services/api';
import { reinitialiserMotDePasse } from '../../services/authentification';
import { EYE, EYE_OFF } from './authShared';
import { AlerteErreur, CadreAuth, EnteteAuth } from './communAuth';

/** Longueur minimale, alignée sur le validateur Django (12 caractères). */
const LONGUEUR_MINIMALE = 12;

const COCHE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" width={40} height={40} aria-hidden="true"><path d="M5 12l5 5l10 -10" /></svg>
);

/**
 * Robustesse, en trois paliers.
 *
 * Volontairement grossier : l'autorité est le validateur du serveur, qui refuse
 * aussi les mots de passe courants et ceux trop proches du nom du titulaire.
 * Cette jauge n'est qu'un guide de saisie, pas un verdict.
 */
function robustesse(valeur: string): 0 | 1 | 2 | 3 {
  if (!valeur) return 0;
  const familles = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(valeur)).length;
  if (valeur.length < LONGUEUR_MINIMALE) return 1;
  if (familles >= 3 && valeur.length >= 16) return 3;
  return 2;
}

function ContenuDefinition() {
  const t = useTranslations('auth.definir');
  const parametres = useSearchParams();
  const uid = parametres.get('uid') ?? '';
  const jeton = parametres.get('jeton') ?? '';

  const [nouveau, setNouveau] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [reveler, setReveler] = useState(false);
  const [erreurNouveau, setErreurNouveau] = useState('');
  const [erreurConfirmation, setErreurConfirmation] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [reussi, setReussi] = useState(false);
  const [lienPerime, setLienPerime] = useState(false);

  const niveau = useMemo(() => robustesse(nouveau), [nouveau]);
  const libelleNiveau = [null, t('robustesse.faible'), t('robustesse.moyen'), t('robustesse.solide')][niveau];

  // Un lien sans paramètres ne mène nulle part : autant le dire tout de suite.
  if (!uid || !jeton || lienPerime) {
    return (
      <CadreAuth>
        <EnteteAuth titre={t('lienInvalideTitre')} sousTitre={t('lienInvalideTexte')} />
        <Link className="ax-btn ax-btn--primary ax-btn--lg ax-btn--block" href="/auth/reset-password-cover">
          <span className="ax-btn__label">{t('demanderNouveau')}</span>
        </Link>
      </CadreAuth>
    );
  }

  if (reussi) {
    return (
      <CadreAuth>
        <span style={{ color: 'var(--ax-success-500, var(--ax-accent))' }}>{COCHE}</span>
        <EnteteAuth titre={t('succesTitre')} sousTitre={t('succesTexte')} />
        <Link className="ax-btn ax-btn--primary ax-btn--lg ax-btn--block" href="/auth/sign-in-cover">
          <span className="ax-btn__label">{t('valider')}</span>
        </Link>
      </CadreAuth>
    );
  }

  function valider(): boolean {
    const e1 = !nouveau ? t('nouveauManquant') : '';
    const e2 = !confirmation
      ? t('confirmationManquante')
      : confirmation !== nouveau
        ? t('discordance')
        : '';
    setErreurNouveau(e1);
    setErreurConfirmation(e2);
    return !e1 && !e2;
  }

  async function soumettre(evenement: FormEvent) {
    evenement.preventDefault();
    setErreur('');
    if (!valider()) return;

    setEnvoi(true);
    try {
      await reinitialiserMotDePasse(uid, jeton, nouveau);
      setReussi(true);
    } catch (cause) {
      if (cause instanceof ErreurApi) {
        const surLeChamp = cause.messagePour('nouveau_mot_de_passe');
        if (surLeChamp) {
          // Le serveur en sait plus que la jauge : mot de passe trop courant,
          // ou trop proche du nom du titulaire.
          setErreurNouveau(surLeChamp);
        } else if (cause.statut === 400) {
          setLienPerime(true);
        } else {
          setErreur(cause.message);
        }
      } else {
        setErreur(t('lienInvalideTexte'));
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
          <label className="ax-label" htmlFor="nouveau-mot-de-passe">{t('nouveau')}</label>
          <div className="ax-field__control">
            <input
              id="nouveau-mot-de-passe"
              className={`ax-input ax-input--with-trailing${erreurNouveau ? ' is-invalid' : ''}`}
              autoComplete="new-password"
              autoFocus
              type={reveler ? 'text' : 'password'}
              value={nouveau}
              onChange={(e) => setNouveau(e.target.value)}
              aria-invalid={erreurNouveau ? 'true' : 'false'}
              aria-describedby="nouveau-message"
              required
            />
            <button
              type="button"
              className="ax-field__affix ax-field__affix--trailing ax-field__affix--button"
              onClick={() => setReveler((v) => !v)}
              aria-pressed={reveler}
              aria-label={reveler ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {reveler ? EYE_OFF : EYE}
            </button>
          </div>
          {erreurNouveau && (
            <p id="nouveau-message" className="ax-field__message ax-field__message--error">
              {erreurNouveau}
            </p>
          )}
        </div>

        {/* Jauge de robustesse. Trois segments, annoncés aux lecteurs d'écran. */}
        <div aria-live="polite">
          <div className="ax-cluster" style={{ justifyContent: 'space-between', marginBlockEnd: 'var(--ax-space-2)' }}>
            <span style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-muted)' }}>
              {t('robustesse.titre')}
            </span>
            {libelleNiveau && (
              <span style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text)' }}>{libelleNiveau}</span>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--ax-space-2)' }}>
            {[1, 2, 3].map((segment) => (
              <span
                key={segment}
                style={{
                  blockSize: 4,
                  borderRadius: 'var(--ax-radius-pill, 999px)',
                  background: niveau >= segment ? 'var(--ax-accent)' : 'var(--ax-border)',
                }}
              />
            ))}
          </div>
          <p style={{ margin: 'var(--ax-space-2) 0 0', fontSize: 'var(--ax-text-xs)', lineHeight: 1.6, color: 'var(--ax-text-subtle)' }}>
            {t('robustesse.longueur')} · {t('robustesse.varie')} · {t('robustesse.distinct')}
          </p>
        </div>

        <div className="ax-field">
          <label className="ax-label" htmlFor="confirmation-mot-de-passe">{t('confirmation')}</label>
          <input
            id="confirmation-mot-de-passe"
            className={`ax-input${erreurConfirmation ? ' is-invalid' : ''}`}
            autoComplete="new-password"
            type={reveler ? 'text' : 'password'}
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            aria-invalid={erreurConfirmation ? 'true' : 'false'}
            aria-describedby="confirmation-message"
            required
          />
          {erreurConfirmation && (
            <p id="confirmation-message" className="ax-field__message ax-field__message--error">
              {erreurConfirmation}
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
    </CadreAuth>
  );
}

/**
 * `useSearchParams` impose une frontière `Suspense` : sans elle, la page
 * bascule en rendu dynamique et `npm run build` échoue au prérendu.
 */
export function CreatePasswordCover() {
  return (
    <Suspense fallback={<CadreAuth><span /></CadreAuth>}>
      <ContenuDefinition />
    </Suspense>
  );
}

export default CreatePasswordCover;
