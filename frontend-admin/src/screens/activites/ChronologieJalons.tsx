'use client';
/*
 * Chronologie des jalons — route « pages/timeline ».
 *
 * Adapté de l'écran « Timeline » de Vireo : fil vertical groupé, en-têtes de
 * groupe collants, bascule de densité, rail latéral compact et légende des
 * marqueurs. Le contenu est le calendrier du projet : jalons d'activités et
 * rendez-vous institutionnels.
 *
 * Le fil se lit de l'avenir vers le passé — les jalons à venir en premier. Sur
 * un projet, c'est ce qui reste à tenir qui appelle une décision ; ce qui est
 * fait ne se relit qu'en réunion de bilan.
 *
 * Un jalon atteint porte son écart au prévu. C'est la donnée que la coordination
 * regarde : un jalon franchi trois semaines en retard n'est pas un jalon franchi
 * à la date prévue, et le masquer reviendrait à maquiller le suivi.
 *
 * Composant client pour la bascule de densité et le chargement progressif.
 */
import { useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHead } from '../../components/shell/PageHead';
import { formaterDate } from '../../domaine';
import type { Jalon } from '../../domaine';

type StatutJalon = Jalon['statut'];

const ICON_CAL = (
  <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12" /><path d="M16 3v4" /><path d="M8 3v4" /><path d="M4 11h16" /></svg>
);
const ICON_CHEV = (
  <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6l6 -6" /></svg>
);
const ICON_PLAN = (
  <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M5 21v-16a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" /><path d="M9 13h6" /><path d="M9 17h3" /></svg>
);

const ICONE_ATTEINT = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5l10 -10" /></svg>
);
const ICONE_A_VENIR = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 7v5l3 3" /><path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /></svg>
);
const ICONE_MANQUE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
);

/* Classe de l'item, teinte et icône du marqueur — le trio du template. */
const APPARENCE: Record<StatutJalon, { classe: string; teinte?: string; icone: ReactElement }> = {
  atteint: { classe: ' ax-timeline__item--success', icone: ICONE_ATTEINT },
  a_venir: { classe: ' ax-timeline__item--pending', teinte: 'var(--ax-viz-amber)', icone: ICONE_A_VENIR },
  manque: { classe: ' ax-timeline__item--danger', icone: ICONE_MANQUE },
};

const EN_TETE_MOIS: CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 2,
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--ax-space-3)',
  padding: 'var(--ax-space-3) 0',
  background: 'var(--ax-surface)',
  backdropFilter: 'blur(6px)',
};

/** Jalons affichés d'emblée ; le reste vient par le bouton de pied de carte. */
const LOT = 18;

export interface JalonAffiche {
  id: number;
  intitule: string;
  /** Activité de rattachement, ou `null` pour un jalon institutionnel. */
  activite: string | null;
  datePrevue: string;
  dateReelle: string | null;
  statut: StatutJalon;
  decisif: boolean;
  /** Écart en jours entre le réel et le prévu ; positif = en retard. */
  ecartJours: number | null;
  /** Jours restants avant l'échéance, pour un jalon à venir. */
  joursRestants: number | null;
  /** Groupe mensuel, formaté par le serveur pour éviter toute dérive de date. */
  mois: string;
}

export interface DonneesJalons {
  jalons: JalonAffiche[];
  decisifs: JalonAffiche[];
  compteurs: Record<StatutJalon, number>;
  /** Mois courant, affiché dans le bouton de période. */
  moisCourant: string;
}

export function ChronologieJalons({ donnees }: { donnees: DonneesJalons }) {
  const t = useTranslations('ecrans');
  const tc = useTranslations('commun');

  const [densite, setDensite] = useState<'compacte' | 'confortable'>('confortable');
  const [visibles, setVisibles] = useState(LOT);

  const affiches = donnees.jalons.slice(0, visibles);

  // Regroupement par mois : la liste arrive triée, il suffit de couper à chaque
  // changement d'étiquette.
  const groupes: Array<{ mois: string; jalons: JalonAffiche[] }> = [];
  for (const j of affiches) {
    const dernier = groupes[groupes.length - 1];
    if (dernier && dernier.mois === j.mois) dernier.jalons.push(j);
    else groupes.push({ mois: j.mois, jalons: [j] });
  }

  return (
    <>
      <PageHead
        title={t('jalons.titre')}
        subtitle={t('jalons.sousTitre', {
          atteints: donnees.compteurs.atteint,
          total: donnees.jalons.length,
        })}
        actions={
          <>
            <button type="button" className="ax-btn ax-btn--secondary ax-btn--pill">
              {ICON_CAL}
              <span className="ax-btn__label">{donnees.moisCourant}</span>
              {ICON_CHEV}
            </button>
            <Link className="ax-btn ax-btn--ghost" href="/projects/list">
              {ICON_PLAN}
              <span className="ax-btn__label">{t('jalons.voirPlan')}</span>
            </Link>
          </>
        }
      />

      <div className="ax-dash-grid">
        {/* ===== FIL PRINCIPAL ===== */}
        <section className="ax-card ax-col--8" role="region" aria-label={t('jalons.titre')}>
          <div className="ax-card__header">
            <div className="ax-card__titles">
              <span className="ax-card__eyebrow">{t('jalons.eyebrow')}</span>
              <h2 className="ax-card__title">{t('jalons.filTitre')}</h2>
              <p className="ax-card__subtitle">{t('jalons.filSousTitre')}</p>
            </div>
            <div className="ax-card__actions">
              <div className="ax-segment" role="radiogroup" aria-label={t('jalons.densite')}>
                <button
                  type="button"
                  className={`ax-segment__option${densite === 'compacte' ? ' is-active' : ''}`}
                  aria-checked={densite === 'compacte'}
                  role="radio"
                  onClick={() => setDensite('compacte')}
                >
                  {t('jalons.compacte')}
                </button>
                <button
                  type="button"
                  className={`ax-segment__option${densite === 'confortable' ? ' is-active' : ''}`}
                  aria-checked={densite === 'confortable'}
                  role="radio"
                  onClick={() => setDensite('confortable')}
                >
                  {t('jalons.confortable')}
                </button>
              </div>
            </div>
          </div>

          <div
            className="ax-card__body"
            style={{ paddingTop: 0, ...(densite === 'compacte' ? { fontSize: 'var(--ax-text-sm)' } : {}) }}
          >
            {groupes.map((groupe, index) => (
              <div key={groupe.mois}>
                <div style={{ ...EN_TETE_MOIS, ...(index > 0 ? { marginTop: 'var(--ax-space-4)' } : {}) }}>
                  <span className="ax-badge ax-badge--soft ax-badge--accent ax-badge--pill">{groupe.mois}</span>
                  <span className="ax-num" style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>
                    {tc('unites.jalons', { nombre: groupe.jalons.length })}
                  </span>
                  <hr className="ax-divider" style={{ flex: '1 1 auto' }} aria-hidden="true" />
                </div>

                <ol className="ax-timeline" style={{ margin: 0, listStyle: 'none' }}>
                  {groupe.jalons.map((j) => {
                    const apparence = APPARENCE[j.statut];
                    return (
                      <li key={j.id} className={`ax-timeline__item${apparence.classe}`}>
                        <span className="ax-timeline__marker" style={apparence.teinte ? { color: apparence.teinte } : undefined}>
                          {apparence.icone}
                        </span>
                        <div className="ax-timeline__content">
                          <p className="ax-timeline__title">
                            <b style={{ color: 'var(--ax-text-strong)' }}>{j.intitule}</b>
                            {j.activite ? (
                              <> — <span style={{ color: 'var(--ax-text-muted)' }}>{j.activite}</span></>
                            ) : (
                              <> — <span style={{ color: 'var(--ax-text-muted)' }}>{t('jalons.institutionnel')}</span></>
                            )}
                          </p>

                          {densite === 'confortable' && (
                            <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)', marginTop: 'var(--ax-space-2)' }}>
                              {j.decisif && (
                                <span className="ax-badge ax-badge--soft ax-badge--accent ax-badge--sm">
                                  {t('jalons.decisif')}
                                </span>
                              )}
                              <span className={`ax-badge ax-badge--outline ax-badge--sm`}>
                                {t(`jalons.statuts.${j.statut}`)}
                              </span>
                              {/* L'écart au prévu n'apparaît que s'il y en a un :
                                  « 0 jour d'écart » est du bruit sur une chronologie. */}
                              {j.ecartJours !== null && j.ecartJours !== 0 && (
                                <span
                                  className={`ax-badge ax-badge--soft ax-badge--sm ax-badge--${j.ecartJours > 0 ? 'warning' : 'success'}`}
                                >
                                  {j.ecartJours > 0
                                    ? t('jalons.retard', { jours: j.ecartJours })
                                    : t('jalons.avance', { jours: -j.ecartJours })}
                                </span>
                              )}
                            </div>
                          )}

                          <span className="ax-timeline__time ax-num">
                            {j.dateReelle
                              ? t('jalons.atteintLe', {
                                  reelle: formaterDate(j.dateReelle),
                                  prevue: formaterDate(j.datePrevue),
                                })
                              : j.joursRestants !== null
                                ? `${formaterDate(j.datePrevue)} · ${t('jalons.dansJours', { nombre: j.joursRestants })}`
                                : `${formaterDate(j.datePrevue)} · ${t('jalons.statuts.manque')}`}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}

            {visibles >= donnees.jalons.length && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ax-space-3)', marginTop: 'var(--ax-space-4)', color: 'var(--ax-text-subtle)', fontSize: 'var(--ax-text-xs)' }}>
                <hr className="ax-divider" style={{ flex: '1 1 auto' }} aria-hidden="true" />
                <span>{t('jalons.debutProjet')}</span>
                <hr className="ax-divider" style={{ flex: '1 1 auto' }} aria-hidden="true" />
              </div>
            )}
          </div>

          {visibles < donnees.jalons.length && (
            <div className="ax-card__footer">
              <button
                type="button"
                className="ax-btn ax-btn--ghost ax-btn--sm ax-btn--block"
                onClick={() => setVisibles((v) => v + LOT)}
              >
                <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12l7 7l7 -7" /></svg>
                <span className="ax-btn__label">{t('jalons.plusAnciens')}</span>
              </button>
            </div>
          )}
        </section>

        {/* ===== RAIL ===== */}
        <div className="ax-col--4" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-6)' }}>
          <section className="ax-card" role="region" aria-label={t('jalons.decisifsTitre')}>
            <div className="ax-card__header">
              <div className="ax-card__titles">
                <h2 className="ax-card__title">{t('jalons.decisifsTitre')}</h2>
                <p className="ax-card__subtitle">{t('jalons.decisifsSousTitre')}</p>
              </div>
            </div>
            <div className="ax-card__body" style={{ paddingTop: 0 }}>
              <ol className="ax-timeline" style={{ margin: 0, listStyle: 'none' }}>
                {donnees.decisifs.map((j) => (
                  <li
                    key={j.id}
                    className={`ax-timeline__item${j.statut === 'atteint' ? ' ax-timeline__item--success' : ''}`}
                  >
                    <span
                      className="ax-timeline__marker"
                      style={{ width: 10, height: 10, ...(j.statut === 'atteint' ? {} : { color: 'var(--ax-text-subtle)' }) }}
                    />
                    <div className="ax-timeline__content">
                      <p className="ax-timeline__title">
                        <b style={{ color: 'var(--ax-text-strong)' }}>{j.intitule}</b>
                      </p>
                      <span className="ax-timeline__time ax-num">{formaterDate(j.dateReelle ?? j.datePrevue)}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="ax-card" role="region" aria-label={t('jalons.legendeTitre')}>
            <div className="ax-card__header">
              <div className="ax-card__titles"><h2 className="ax-card__title">{t('jalons.legendeTitre')}</h2></div>
            </div>
            <div className="ax-card__body" style={{ paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-3)' }}>
              <LigneLegende
                teinte="var(--ax-viz-emerald)"
                icone={ICONE_ATTEINT}
                titre={t('jalons.statuts.atteint')}
                detail={t('jalons.legende.atteint', { nombre: donnees.compteurs.atteint })}
              />
              <LigneLegende
                teinte="var(--ax-viz-amber)"
                icone={ICONE_A_VENIR}
                titre={t('jalons.statuts.a_venir')}
                detail={t('jalons.legende.a_venir', { nombre: donnees.compteurs.a_venir })}
              />
              <LigneLegende
                teinte="var(--ax-viz-red)"
                icone={ICONE_MANQUE}
                titre={t('jalons.statuts.manque')}
                detail={t('jalons.legende.manque', { nombre: donnees.compteurs.manque })}
              />
              <LigneLegende
                teinte="var(--ax-accent)"
                icone={<svg className="ax-avatar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /></svg>}
                titre={t('jalons.decisif')}
                detail={t('jalons.legende.decisif', { nombre: donnees.decisifs.length })}
              />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function LigneLegende({
  teinte,
  icone,
  titre,
  detail,
}: {
  teinte: string;
  icone: ReactElement;
  titre: string;
  detail: string;
}) {
  return (
    <div className="ax-cluster" style={{ gap: 'var(--ax-space-3)', flexWrap: 'nowrap' }}>
      <span className="ax-avatar ax-avatar--xs" style={{ background: `color-mix(in oklab,${teinte} 18%,transparent)`, color: teinte }}>
        {icone}
      </span>
      <div>
        <div style={{ fontWeight: 'var(--ax-weight-medium)', color: 'var(--ax-text-strong)', fontSize: 'var(--ax-text-sm)' }}>{titre}</div>
        <div style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>{detail}</div>
      </div>
    </div>
  );
}

export default ChronologieJalons;
