'use client';
/*
 * Journal d'audit — route « pages/activity-log ».
 *
 * Adapté de l'écran « Activity Log » de Vireo : barre de filtres, pastilles de
 * catégorie, fil chronologique groupé par jour. Le contenu est la piste d'audit
 * du projet — qui a validé quelle fiche, qui a enregistré quel décaissement.
 *
 * Un outil de suivi-évaluation destiné à une collectivité doit pouvoir répondre
 * à « qui a saisi cette donnée, et quand ». C'est ce que cet écran montre ; il
 * n'est décoratif que tant qu'on n'en a pas besoin.
 *
 * Composant client : le filtrage et la recherche vivent en état local. Les
 * événements arrivent en props depuis le composant serveur — le filtrage
 * repassera côté serveur le jour où le journal comptera des dizaines de
 * milliers de lignes, la signature de `journalActivite()` étant déjà prête à
 * recevoir ses paramètres.
 */
import { useMemo, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHead } from '../../components/shell/PageHead';
import { formaterHeure, formaterJourRelatif } from '../../domaine';
import type { EvenementJournal } from '../../domaine';

type Categorie = EvenementJournal['categorie'];
type FiltreCategorie = 'toutes' | Categorie;

const CATEGORIES: readonly FiltreCategorie[] = [
  'toutes',
  'groupement',
  'production',
  'formation',
  'financement',
  'activite',
  'systeme',
] as const;

/* Une icône et une teinte par catégorie : le fil se lit en diagonale, sans
   avoir à parcourir chaque libellé. */
const MARQUEUR: Record<Categorie, { teinte: string; icone: ReactElement }> = {
  groupement: {
    teinte: 'var(--ax-accent)',
    icone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M8 21v-1a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v1" /><path d="M15 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M17 10h2a2 2 0 0 1 2 2v1" /><path d="M5 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M3 13v-1a2 2 0 0 1 2 -2h2" /></svg>,
  },
  production: {
    teinte: 'var(--ax-viz-cyan)',
    icone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l8 4.5l0 9l-8 4.5l-8 -4.5l0 -9l8 -4.5" /><path d="M12 12l8 -4.5" /><path d="M12 12l0 9" /><path d="M12 12l-8 -4.5" /></svg>,
  },
  formation: {
    teinte: 'var(--ax-viz-violet)',
    icone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 9l-10 -4l-10 4l10 4l10 -4v6" /><path d="M6 10.6v5.4a6 3 0 0 0 12 0v-5.4" /></svg>,
  },
  financement: {
    teinte: 'var(--ax-viz-emerald)',
    icone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v18" /><path d="M17 8a4 4 0 0 0 -4 -3h-2a3.5 3.5 0 0 0 0 7h2a3.5 3.5 0 0 1 0 7h-2a4 4 0 0 1 -4 -3" /></svg>,
  },
  activite: {
    teinte: 'var(--ax-viz-amber)',
    icone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0" /><path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /></svg>,
  },
  systeme: {
    teinte: 'var(--ax-text-subtle)',
    icone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M5 21v-16a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" /><path d="M9 13l2 2l4 -4" /></svg>,
  },
};

const TONALITE: Record<Categorie, string> = {
  groupement: 'accent',
  production: 'info',
  formation: 'neutral',
  financement: 'success',
  activite: 'warning',
  systeme: 'neutral',
};

const EN_TETE_JOUR: CSSProperties = {
  fontSize: 'var(--ax-text-xs)',
  fontWeight: 'var(--ax-weight-semibold)',
  textTransform: 'uppercase',
  letterSpacing: '.05em',
  color: 'var(--ax-text-subtle)',
};
const MONO: CSSProperties = { fontFamily: 'var(--ax-font-mono)' };

/** Pas d'affichage du bouton « plus ancien » : trois lots suffisent au parcours. */
const LOT = 20;

export interface DonneesJournal {
  evenements: EvenementJournal[];
  acteurs: string[];
  /** Instant de référence de l'écran, décidé par le serveur — voir le composant. */
  maintenant: string;
}

export function JournalAudit({ donnees }: { donnees: DonneesJournal }) {
  const t = useTranslations('ecrans');
  const tc = useTranslations('commun');

  const [categorie, setCategorie] = useState<FiltreCategorie>('toutes');
  const [acteur, setActeur] = useState('');
  const [recherche, setRecherche] = useState('');
  const [visibles, setVisibles] = useState(LOT);

  const maintenant = useMemo(() => new Date(donnees.maintenant), [donnees.maintenant]);

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return donnees.evenements.filter((e) => {
      if (categorie !== 'toutes' && e.categorie !== categorie) return false;
      if (acteur && e.acteur !== acteur) return false;
      if (q && !`${e.acteur} ${e.action} ${e.cible}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [donnees.evenements, categorie, acteur, recherche]);

  const affiches = filtres.slice(0, visibles);

  // Regroupement par jour civil, dans l'ordre du fil : la liste arrive déjà triée
  // du plus récent au plus ancien, il suffit de couper à chaque changement de jour.
  const groupes: Array<{ jour: string; evenements: EvenementJournal[] }> = [];
  for (const e of affiches) {
    const jour = formaterJourRelatif(e.horodatage, maintenant);
    const dernier = groupes[groupes.length - 1];
    if (dernier && dernier.jour === jour) dernier.evenements.push(e);
    else groupes.push({ jour, evenements: [e] });
  }

  const filtresActifs = categorie !== 'toutes' || acteur !== '' || recherche !== '';

  return (
    <>
      <PageHead
        title={t('journal.titre')}
        subtitle={t('journal.sousTitre')}
        actions={
          <button type="button" className="ax-btn ax-btn--ghost">
            <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 11l5 5l5 -5" /><path d="M12 4l0 12" /></svg>
            <span className="ax-btn__label">{t('journal.exporter')}</span>
          </button>
        }
      />

      <div className="ax-dash-grid">
        {/* ===== BARRE DE FILTRES ===== */}
        <section className="ax-card ax-col--12" role="region" aria-label={tc('filtres.titre')}>
          <div className="ax-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-3)' }}>
            <div className="ax-cluster" style={{ gap: 'var(--ax-space-3)', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
                <svg style={{ position: 'absolute', left: 'var(--ax-space-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--ax-text-subtle)' }} width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 10a7 7 0 1 0 14 0a7 7 0 0 0 -14 0" /><path d="M21 21l-6 -6" /></svg>
                <input
                  type="search"
                  className="ax-input"
                  placeholder={t('journal.rechercher')}
                  value={recherche}
                  onChange={(e) => {
                    setRecherche(e.target.value);
                    setVisibles(LOT);
                  }}
                  aria-label={t('journal.rechercher')}
                  style={{ paddingInlineStart: 'var(--ax-space-8)' }}
                />
              </div>
              <select
                className="ax-select"
                aria-label={t('journal.filtrerActeur')}
                style={{ maxWidth: 220 }}
                value={acteur}
                onChange={(e) => {
                  setActeur(e.target.value);
                  setVisibles(LOT);
                }}
              >
                <option value="">{t('journal.tousLesActeurs')}</option>
                {donnees.acteurs.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)' }} role="group" aria-label={t('journal.categories')}>
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`ax-badge ax-badge--filter ax-badge--pill${categorie === c ? ' is-selected' : ''}`}
                  aria-pressed={categorie === c}
                  onClick={() => {
                    setCategorie(c);
                    setVisibles(LOT);
                  }}
                >
                  {t(`journal.filtres.${c}`)}
                </button>
              ))}
            </div>

            <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)' }}>
              <span style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>
                {t('journal.resultats', { affiches: affiches.length, total: filtres.length })}
              </span>
              {filtresActifs && (
                <button
                  type="button"
                  className="ax-btn ax-btn--link ax-btn--sm"
                  onClick={() => {
                    setCategorie('toutes');
                    setActeur('');
                    setRecherche('');
                    setVisibles(LOT);
                  }}
                >
                  {tc('actions.reinitialiser')}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ===== FIL CHRONOLOGIQUE ===== */}
        <section className="ax-card ax-col--12" role="region" aria-label={t('journal.titre')}>
          <div className="ax-card__body" style={{ paddingTop: 'var(--ax-space-5)' }}>
            {groupes.length === 0 && (
              <div style={{ textAlign: 'center', padding: 'var(--ax-space-7) 0' }}>
                <div style={{ fontWeight: 'var(--ax-weight-semibold)', color: 'var(--ax-text-strong)' }}>
                  {tc('table.aucunResultat')}
                </div>
                <p style={{ color: 'var(--ax-text-muted)', marginTop: 'var(--ax-space-2)' }}>
                  {tc('table.aucunResultatIndice')}
                </p>
              </div>
            )}

            {groupes.map((groupe, index) => (
              <div key={groupe.jour}>
                <div style={{ ...EN_TETE_JOUR, margin: index === 0 ? '0 0 var(--ax-space-3)' : 'var(--ax-space-5) 0 var(--ax-space-3)' }}>
                  {groupe.jour} · {tc('unites.evenements', { nombre: groupe.evenements.length })}
                </div>
                <ol className="ax-timeline" style={{ listStyle: 'none' }}>
                  {groupe.evenements.map((e) => {
                    const marqueur = MARQUEUR[e.categorie];
                    return (
                      <li key={e.id} className="ax-timeline__item">
                        <span className="ax-timeline__marker" style={{ color: marqueur.teinte }}>
                          {marqueur.icone}
                        </span>
                        <div className="ax-timeline__content">
                          <p className="ax-timeline__title">
                            <b style={{ color: 'var(--ax-text-strong)' }}>{e.acteur}</b> {e.action}{' '}
                            {e.cible_lien ? (
                              <Link href={e.cible_lien} style={{ color: 'var(--ax-accent)' }}>{e.cible}</Link>
                            ) : (
                              <span style={{ color: 'var(--ax-text)' }}>{e.cible}</span>
                            )}{' '}
                            <span className={`ax-badge ax-badge--soft ax-badge--${TONALITE[e.categorie]} ax-badge--pill`}>
                              {t(`journal.filtres.${e.categorie}`)}
                            </span>
                          </p>
                          <span className="ax-timeline__time ax-num" style={MONO}>
                            {formaterHeure(e.horodatage)} · {e.acteur_initiales}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}

            {visibles < filtres.length && (
              <div className="ax-cluster" style={{ justifyContent: 'center', marginTop: 'var(--ax-space-5)' }}>
                <button
                  type="button"
                  className="ax-btn ax-btn--secondary ax-btn--pill"
                  onClick={() => setVisibles((v) => v + LOT)}
                >
                  {t('journal.plusAnciens')}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

export default JournalAudit;
