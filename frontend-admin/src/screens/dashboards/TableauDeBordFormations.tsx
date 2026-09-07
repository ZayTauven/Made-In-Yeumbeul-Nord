'use client';
/*
 * Tableau de bord des formations — route « dashboards/lms ».
 *
 * Adapté du tableau de bord « LMS & Courses » de Vireo. La composition et les
 * classes `.ax-*` sont conservées ; le contenu est celui du renforcement de
 * capacités du projet : modules, sessions, présences, certifications.
 *
 * Un point de vocabulaire qui n'est pas cosmétique : le template compte des
 * inscriptions payantes, nous comptons des présences à des sessions gratuites.
 * Il n'y a donc ni prix de vente ni chiffre d'affaires ici — seulement le coût
 * par participant supporté par le projet.
 *
 * **Composant de présentation, sans accès aux données.** Tout arrive en props
 * depuis `app/(shell)/dashboards/lms/page.tsx`.
 */
import type { ReactElement } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHead } from '../../components/shell/PageHead';
import { ApexChart } from '../../components/charts/ApexChart';
import { formaterDate, formaterFcfa, formaterFcfaCompact, formaterNombre } from '../../domaine';
import type { Kpi } from '../../domaine';

/* Résout les tokens en couleurs concrètes pour ApexCharts. Sans `document` —
   rendu serveur — renvoie les valeurs Aurora de repli, puis la re-thématisation
   du graphique repeint avec les vrais tokens. */
const VIZ_FALLBACK: Record<string, string> = {
  '--ax-accent': '#1E856C',
  '--ax-viz-cyan': '#38BDF8',
  '--ax-viz-violet': '#A78BFA',
  '--ax-viz-pink': '#F472B6',
  '--ax-viz-amber': '#FBBF24',
  '--ax-viz-emerald': '#34D399',
  '--ax-warning-500': '#F59E0B',
  '--ax-text-strong': '#1B2430',
  '--ax-fill-hover': 'rgba(0,0,0,.06)',
};
function jeton(nom: string): string {
  if (typeof document === 'undefined') return VIZ_FALLBACK[nom] || '#38BDF8';
  return (
    getComputedStyle(document.documentElement).getPropertyValue(nom).trim() ||
    VIZ_FALLBACK[nom] ||
    '#38BDF8'
  );
}

const ICON_CAL = (
  <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12" /><path d="M16 3v4" /><path d="M8 3v4" /><path d="M4 11h16" /></svg>
);
const ICON_CHEV = (
  <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6l6 -6" /></svg>
);
const ICON_MODULES = (
  <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0" /><path d="M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0" /><path d="M3 6l0 13" /><path d="M12 6l0 13" /><path d="M21 6l0 13" /></svg>
);
const ICON_PLUS = (
  <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5l0 14" /><path d="M5 12l14 0" /></svg>
);
const ARROW_UP = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 15l6 -6l6 6" /></svg>
);
const ARROW_DN = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6l6 -6" /></svg>
);
const ICON_CERTIFICAT = (
  <svg className="ax-avatar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 15m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /><path d="M13 17.5v4.5l2 -1.5l2 1.5v-4.5" /><path d="M10 19h-5a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -1 1.73" /><path d="M6 9l12 0" /><path d="M6 12l3 0" /></svg>
);

const ICONES_KPI: Record<string, ReactElement> = {
  membres_formes: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 9l-10 -4l-10 4l10 4l10 -4v6" /><path d="M6 10.6v5.4a6 3 0 0 0 12 0v-5.4" /></svg>,
  sessions: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12" /><path d="M16 3v4" /><path d="M8 3v4" /><path d="M4 11h16" /><path d="M9 15l2 2l4 -4" /></svg>,
  certification: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 15a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /><path d="M13 17.5v4.5l2 -1.5l2 1.5v-4.5" /><path d="M10 19h-5a2 2 0 0 1 -2 -2v-10c0 -1.1 .9 -2 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -1 1.73" /><path d="M6 9l12 0" /><path d="M6 12l3 0" /></svg>,
  presence: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2" /><path d="M9 3m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v0a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z" /><path d="M9 14l2 2l4 -4" /></svg>,
};

const CLASSES_PASTILLE = ['c1', 'c2', 'c3', 'c4'];
const COULEURS_SPARK = ['--ax-accent', '--ax-viz-cyan', '--ax-viz-violet', '--ax-viz-amber'];
const COULEURS_MODULE = ['--ax-accent', '--ax-viz-cyan', '--ax-viz-violet', '--ax-viz-pink', '--ax-viz-amber'];

/*
 * La grille de l'écran LMS de Vireo est portée par une feuille de style locale
 * plutôt que par les classes `ax-col--*` : elle est conservée telle quelle, seuls
 * les noms de classes restent ceux du template.
 */
const GRILLE = `
  .ax-dash-grid > * { grid-column: 1 / -1; }
  @media (min-width: 768px) {
    .ax-dash-grid > .ax-kpi { grid-column: span 6; }
    .ax-dash-grid > .ax-col-third { grid-column: span 6; }
  }
  @media (min-width: 1200px) {
    .ax-dash-grid > .ax-kpi { grid-column: span 3; }
    .ax-dash-grid > .ax-col-hero { grid-column: span 8; }
    .ax-dash-grid > .ax-col-side { grid-column: span 4; }
    .ax-dash-grid > .ax-col-third { grid-column: span 4; }
    .ax-dash-grid > .ax-col-wide { grid-column: span 8; }
    .ax-dash-grid > .ax-col-narrow { grid-column: span 4; }
  }`;

/* ------------------------------------------------------------------------- *
 * Contrat de props
 * ------------------------------------------------------------------------- */

export interface EntreeTypeModule {
  libelle: string;
  slug: string;
  valeur: number;
  part: number;
}

export interface LigneModule {
  slug: string;
  nom: string;
  type: string;
  filiere: string | null;
  participants: number;
  sessions: number;
  heures: number;
  tauxCertification: number;
  coutParParticipant: number;
}

export interface SessionAVenir {
  id: number;
  jour: string;
  mois: string;
  module: string;
  formateur: string;
  lieu: string;
  quartier: string;
  effectifCible: number;
  imminente: boolean;
}

export interface LigneFormateur {
  nom: string;
  initiales: string;
  sessions: number;
  participants: number;
}

export interface LigneCertification {
  id: number;
  membre: string;
  initiales: string;
  groupement: string;
  module: string;
  date: string;
  score: number;
}

export interface DonneesFormations {
  kpis: Kpi[];
  activiteMensuelle: Array<{ periode: string; sessions: number; participants: number }>;
  parType: EntreeTypeModule[];
  modulesEnTete: LigneModule[];
  prochainesSessions: SessionAVenir[];
  formateurs: LigneFormateur[];
  certifications: LigneCertification[];
  chiffres: {
    totalModules: number;
    participations: number;
    membresFormes: number;
    membresCertifies: number;
    certificatsDelivres: number;
    tauxPresence: number;
    tauxCertification: number;
    heuresDispensees: number;
    coutTotal: number;
    sessionsAVenir: number;
  };
}

/* ------------------------------------------------------------------------- *
 * Écran
 * ------------------------------------------------------------------------- */

export function TableauDeBordFormations({ donnees }: { donnees: DonneesFormations }) {
  const t = useTranslations('ecrans');
  const tc = useTranslations('commun');

  const {
    kpis,
    activiteMensuelle,
    parType,
    modulesEnTete,
    prochainesSessions,
    formateurs,
    certifications,
    chiffres,
  } = donnees;

  const couleursType = [
    jeton('--ax-accent'),
    jeton('--ax-viz-cyan'),
    jeton('--ax-viz-violet'),
    jeton('--ax-viz-amber'),
  ].slice(0, parType.length);

  return (
    <>
      <PageHead
        title={t('formations.titre')}
        subtitle={t('formations.sousTitre', {
          membres: formaterNombre(chiffres.membresFormes),
          modules: String(chiffres.totalModules),
        })}
        actions={
          <>
            <button type="button" className="ax-btn ax-btn--secondary ax-btn--pill">
              {ICON_CAL}
              <span className="ax-btn__label">{t('formations.periode')}</span>
              {ICON_CHEV}
            </button>
            <Link className="ax-btn ax-btn--ghost" href="/formations/modules">
              {ICON_MODULES}
              <span className="ax-btn__label">{t('formations.catalogue')}</span>
            </Link>
            <button type="button" className="ax-btn ax-btn--primary">
              {ICON_PLUS}
              <span className="ax-btn__label">{t('formations.planifier')}</span>
            </button>
          </>
        }
      />

      <div className="ax-dash-grid">
        {/* ===== INDICATEURS D'EN-TÊTE ===== */}
        {kpis.map((k, i) => {
          const decroissant = k.sens === 'decroissant';
          const favorable = decroissant ? k.delta <= 0 : k.delta >= 0;
          return (
            <div
              key={k.cle}
              className="ax-card ax-kpi"
              role="region"
              aria-label={`${k.libelle} : ${k.valeur_affichee}`}
            >
              <div className="ax-card__body">
                <div className="ax-kpi__top">
                  <span className={`ax-kpi__icon ax-kpi__icon--${CLASSES_PASTILLE[i % 4]}`}>
                    {ICONES_KPI[k.cle] ?? ICONES_KPI.sessions}
                  </span>
                  <span className={`ax-kpi__delta ax-kpi__delta--${favorable ? 'up' : 'down'}`}>
                    {k.delta >= 0 ? ARROW_UP : ARROW_DN}
                    {`${Math.abs(k.delta).toFixed(1).replace('.', ',')}${k.unite === '%' ? ' pts' : ' %'}`}
                  </span>
                </div>
                <div className="ax-kpi__label">{k.libelle}</div>
                <div className="ax-kpi__meta" style={{ justifyContent: 'space-between', width: '100%' }}>
                  <div className="ax-kpi__value ax-num">{k.valeur_affichee}</div>
                  <ApexChart
                    className="ax-kpi__spark"
                    type="line"
                    sparkline
                    tooltip={false}
                    height={40}
                    color={COULEURS_SPARK[i % 4]}
                    series={[{ name: k.libelle, data: k.etincelle }]}
                    style={{ minHeight: 40 }}
                  />
                </div>
                {k.cible !== undefined && (
                  <div className="ax-progress ax-progress--xs" style={{ marginTop: 10 }}>
                    <div className="ax-progress__track">
                      <div
                        className="ax-progress__fill"
                        style={{ width: `${Math.min(100, Math.round((k.valeur / k.cible) * 100))}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* ===== ACTIVITÉ DE FORMATION (8) ===== */}
        <section className="ax-card ax-card--chart ax-col-hero" role="region" aria-label={t('formations.activite.titre')}>
          <div className="ax-card__header">
            <div className="ax-card__titles">
              <span className="ax-card__eyebrow">{t('formations.activite.eyebrow')}</span>
              <h2 className="ax-card__title">{t('formations.activite.titre')}</h2>
              <p className="ax-card__subtitle">{t('formations.activite.sousTitre')}</p>
            </div>
          </div>
          <div className="ax-card__body" style={{ paddingTop: 0 }}>
            <div className="ax-cluster" style={{ gap: 'var(--ax-space-5)', marginBlockEnd: 'var(--ax-space-3)' }}>
              <span className="ax-cluster" style={{ gap: 'var(--ax-space-2)' }}>
                <i style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--ax-accent)' }} />
                <small style={{ color: 'var(--ax-text-muted)', fontSize: 'var(--ax-text-sm)' }}>{t('formations.activite.sessions')}</small>
              </span>
              <span className="ax-cluster" style={{ gap: 'var(--ax-space-2)' }}>
                <i style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--ax-viz-amber)' }} />
                <small style={{ color: 'var(--ax-text-muted)', fontSize: 'var(--ax-text-sm)' }}>{t('formations.activite.participations')}</small>
              </span>
            </div>
            <ApexChart
              type="line"
              height={300}
              legend="none"
              accent
              ariaLabel={t('formations.activite.aria')}
              series={[
                { name: t('formations.activite.sessions'), type: 'column', data: activiteMensuelle.map((m) => m.sessions) },
                { name: t('formations.activite.participations'), type: 'line', data: activiteMensuelle.map((m) => m.participants) },
              ]}
              apex={{
                colors: [jeton('--ax-accent'), jeton('--ax-viz-amber')],
                stroke: { width: [0, 3], curve: 'smooth' },
                plotOptions: { bar: { borderRadius: 4, columnWidth: '52%' } },
                xaxis: { categories: activiteMensuelle.map((m) => m.periode) },
                yaxis: [
                  { labels: { formatter: (v: number) => String(Math.round(v)) } },
                  { opposite: true, labels: { formatter: (v: number) => String(Math.round(v)) } },
                ],
              }}
            />
          </div>
        </section>

        {/* ===== RÉPARTITION PAR TYPE DE MODULE (4) ===== */}
        <section className="ax-card ax-col-side" role="region" aria-label={t('formations.types.titre')}>
          <div className="ax-card__header">
            <div className="ax-card__titles"><h2 className="ax-card__title">{t('formations.types.titre')}</h2></div>
          </div>
          <div className="ax-card__body" style={{ paddingTop: 0 }}>
            <ApexChart
              type="donut"
              height={220}
              legend="none"
              ariaLabel={t('formations.types.aria')}
              series={parType.map((d) => d.valeur)}
              apex={{
                labels: parType.map((d) => d.libelle),
                colors: couleursType,
                stroke: { width: 0 },
                plotOptions: {
                  pie: {
                    donut: {
                      size: '72%',
                      labels: {
                        show: true,
                        value: { fontFamily: 'var(--ax-font-mono)', fontWeight: 600 },
                        total: {
                          show: true,
                          label: t('formations.types.total'),
                          formatter: () => formaterNombre(chiffres.participations),
                        },
                      },
                    },
                  },
                },
              }}
            />
            <ul className="ax-list ax-list--compact" style={{ marginTop: 'var(--ax-space-2)' }}>
              {parType.map((d, i) => (
                <li key={d.slug} className="ax-list__row" style={{ border: 0, paddingInline: 0 }}>
                  <span className="ax-list__leading">
                    <i style={{ width: 9, height: 9, borderRadius: 3, background: couleursType[i], display: 'inline-block' }} />
                  </span>
                  <span className="ax-list__content">
                    <span className="ax-list__title" style={{ fontWeight: 'var(--ax-weight-medium)' }}>{d.libelle}</span>
                  </span>
                  <span className="ax-list__trailing ax-num" style={{ color: 'var(--ax-text-strong)' }}>
                    {tc('unites.pourcentage', { valeur: d.part })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ===== AVANCEMENT DES CYCLES (8) ===== */}
        <section className="ax-card ax-col-wide" role="region" aria-label={t('formations.cycles.titre')}>
          <div className="ax-card__header">
            <div className="ax-card__titles">
              <h2 className="ax-card__title">{t('formations.cycles.titre')}</h2>
              <p className="ax-card__subtitle">{t('formations.cycles.sousTitre')}</p>
            </div>
            <Link className="ax-btn ax-btn--link" href="/formations/modules">{t('formations.cycles.voirTout')}</Link>
          </div>
          <div className="ax-card__body" style={{ paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-4)' }}>
            {modulesEnTete.map((m, i) => {
              const teinte = `var(${COULEURS_MODULE[i % COULEURS_MODULE.length]})`;
              return (
                <div key={m.slug} className="ax-cluster" style={{ gap: 'var(--ax-space-4)', flexWrap: 'nowrap' }}>
                  <span
                    className="ax-avatar ax-avatar--md ax-avatar--squircle"
                    style={{ background: `color-mix(in oklab,${teinte} 18%,transparent)`, color: teinte }}
                  >
                    {ICON_CERTIFICAT}
                  </span>
                  <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                    <div className="ax-cluster" style={{ justifyContent: 'space-between', flexWrap: 'nowrap', gap: 'var(--ax-space-3)' }}>
                      <div className="ax-text-truncate" style={{ fontWeight: 'var(--ax-weight-semibold)', color: 'var(--ax-text-strong)' }}>{m.nom}</div>
                      <b className="ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-text-strong)' }}>{m.tauxCertification} %</b>
                    </div>
                    <div style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)', margin: '2px 0 6px' }}>
                      {t('formations.cycles.detail', {
                        sessions: m.sessions,
                        participants: formaterNombre(m.participants),
                        heures: String(m.heures),
                      })}
                    </div>
                    <div className="ax-progress ax-progress--sm">
                      <div className="ax-progress__track">
                        <div className="ax-progress__fill" style={{ width: `${m.tauxCertification}%`, background: teinte }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ===== QUALITÉ DU DISPOSITIF (4) ===== */}
        <section className="ax-card ax-col-narrow" role="region" aria-label={t('formations.qualite.titre')}>
          <div className="ax-card__header">
            <div className="ax-card__titles"><h2 className="ax-card__title">{t('formations.qualite.titre')}</h2></div>
          </div>
          <div className="ax-card__body" style={{ paddingTop: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--ax-space-4)', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <ApexChart
                type="radialBar"
                height={160}
                legend="none"
                accent
                ariaLabel={t('formations.qualite.ariaPresence', { valeur: String(chiffres.tauxPresence) })}
                series={[chiffres.tauxPresence]}
                apex={{
                  colors: [jeton('--ax-accent')],
                  plotOptions: {
                    radialBar: {
                      hollow: { size: '58%' },
                      track: { background: jeton('--ax-fill-hover') },
                      dataLabels: {
                        name: { show: false },
                        value: { offsetY: 6, color: jeton('--ax-text-strong'), fontSize: '20px', fontFamily: 'var(--ax-font-mono)', fontWeight: 700, formatter: (v: number) => `${Math.round(v)} %` },
                      },
                    },
                  },
                  fill: { type: 'solid' },
                }}
              />
              <small style={{ color: 'var(--ax-text-subtle)', fontSize: 'var(--ax-text-xs)' }}>{t('formations.qualite.presence')}</small>
            </div>
            <div style={{ textAlign: 'center' }}>
              <ApexChart
                type="radialBar"
                height={160}
                legend="none"
                ariaLabel={t('formations.qualite.ariaCertification', { valeur: String(chiffres.tauxCertification) })}
                series={[chiffres.tauxCertification]}
                apex={{
                  colors: [jeton('--ax-warning-500')],
                  plotOptions: {
                    radialBar: {
                      hollow: { size: '58%' },
                      track: { background: jeton('--ax-fill-hover') },
                      dataLabels: {
                        name: { show: false },
                        value: { offsetY: 6, color: jeton('--ax-text-strong'), fontSize: '20px', fontFamily: 'var(--ax-font-mono)', fontWeight: 700, formatter: (v: number) => `${Math.round(v)} %` },
                      },
                    },
                  },
                  fill: { type: 'solid' },
                }}
              />
              <small style={{ color: 'var(--ax-text-subtle)', fontSize: 'var(--ax-text-xs)' }}>{t('formations.qualite.certification')}</small>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div className="ax-divider" />
              <LigneChiffre libelle={t('formations.qualite.heures')} valeur={`${formaterNombre(chiffres.heuresDispensees)} h`} premier />
              <LigneChiffre libelle={t('formations.qualite.certificats')} valeur={formaterNombre(chiffres.certificatsDelivres)} />
              <LigneChiffre libelle={t('formations.qualite.investissement')} valeur={formaterFcfaCompact(chiffres.coutTotal)} />
              <LigneChiffre libelle={t('formations.qualite.aVenir')} valeur={formaterNombre(chiffres.sessionsAVenir)} />
            </div>
          </div>
        </section>

        {/* ===== PROCHAINES SESSIONS (4) ===== */}
        <section className="ax-card ax-col-third" role="region" aria-label={t('formations.prochaines.titre')}>
          <div className="ax-card__header">
            <div className="ax-card__titles"><h2 className="ax-card__title">{t('formations.prochaines.titre')}</h2></div>
            <Link className="ax-btn ax-btn--link" href="/formations/sessions">{t('formations.prochaines.calendrier')}</Link>
          </div>
          <div className="ax-card__body" style={{ paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-3)' }}>
            {prochainesSessions.map((s, i) => (
              <div
                key={s.id}
                className="ax-cluster"
                style={{
                  gap: 'var(--ax-space-3)',
                  flexWrap: 'nowrap',
                  paddingBottom: i === prochainesSessions.length - 1 ? undefined : 'var(--ax-space-3)',
                  borderBottom: i === prochainesSessions.length - 1 ? undefined : '1px solid var(--ax-border)',
                }}
              >
                <div style={{ textAlign: 'center', minWidth: 54 }}>
                  <div className="ax-num" style={{ fontFamily: 'var(--ax-font-mono)', fontWeight: 700, color: s.imminente ? 'var(--ax-accent)' : 'var(--ax-text-strong)', fontSize: 'var(--ax-text-lg)' }}>
                    {s.jour}
                  </div>
                  <div style={{ fontSize: 'var(--ax-text-2xs)', color: 'var(--ax-text-subtle)' }}>{s.mois}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ax-text-truncate" style={{ fontWeight: 'var(--ax-weight-medium)', color: 'var(--ax-text-strong)' }}>{s.module}</div>
                  <div className="ax-text-truncate" style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>
                    {t('formations.prochaines.detail', { formateur: s.formateur, effectif: s.effectifCible })}
                  </div>
                </div>
                <span className={`ax-badge ax-badge--soft ax-badge--${s.imminente ? 'success' : 'neutral'} ax-badge--pill`}>
                  {s.imminente && <span className="ax-badge__dot" />}
                  {s.quartier}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ===== MODULES LES PLUS SUIVIS (8) ===== */}
        <section className="ax-card ax-col-wide" role="region" aria-label={t('formations.modules.titre')}>
          <div className="ax-card__header">
            <div className="ax-card__titles">
              <h2 className="ax-card__title">{t('formations.modules.titre')}</h2>
              <p className="ax-card__subtitle">{t('formations.modules.sousTitre')}</p>
            </div>
            <Link className="ax-btn ax-btn--link" href="/formations/modules">{t('formations.modules.voirTout')}</Link>
          </div>
          <div className="ax-table-wrap">
            <table className="ax-table ax-table--hover">
              <thead className="ax-table__head">
                <tr>
                  <th className="ax-table__th" scope="col">{t('formations.modules.colonneModule')}</th>
                  <th className="ax-table__th ax-table__th--num" scope="col">{t('formations.modules.colonneParticipants')}</th>
                  <th className="ax-table__th ax-table__th--num" scope="col">{t('formations.modules.colonneSessions')}</th>
                  <th className="ax-table__th ax-table__th--num" scope="col">{t('formations.modules.colonneCertification')}</th>
                  <th className="ax-table__th ax-table__th--num" scope="col">{t('formations.modules.colonneCout')}</th>
                </tr>
              </thead>
              <tbody>
                {modulesEnTete.map((m, i) => {
                  const teinte = `var(${COULEURS_MODULE[i % COULEURS_MODULE.length]})`;
                  // Le taux de certification se lit en trois paliers : sous 50 %, le
                  // module ne remplit pas son office ; c'est ce que la couleur dit.
                  const teinteTaux =
                    m.tauxCertification >= 70
                      ? 'var(--ax-viz-emerald)'
                      : m.tauxCertification >= 50
                        ? 'var(--ax-viz-amber)'
                        : 'var(--ax-viz-red)';
                  return (
                    <tr key={m.slug} className="ax-table__row">
                      <td className="ax-table__td">
                        <div className="ax-cluster" style={{ gap: 'var(--ax-space-3)', flexWrap: 'nowrap' }}>
                          <span className="ax-avatar ax-avatar--sm ax-avatar--squircle" style={{ background: `color-mix(in oklab,${teinte} 22%,transparent)`, color: teinte }}>
                            {ICON_CERTIFICAT}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 'var(--ax-weight-medium)', color: 'var(--ax-text-strong)' }}>{m.nom}</div>
                            <div style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>
                              {m.type}
                              {m.filiere ? ` · ${m.filiere}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="ax-table__td ax-table__td--num ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-text)' }}>{formaterNombre(m.participants)}</td>
                      <td className="ax-table__td ax-table__td--num ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-text-muted)' }}>{m.sessions}</td>
                      <td className="ax-table__td ax-table__td--num ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: teinteTaux }}>{m.tauxCertification} %</td>
                      <td className="ax-table__td ax-table__td--num ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-text-strong)', fontWeight: 'var(--ax-weight-semibold)', whiteSpace: 'nowrap' }}>
                        {formaterFcfa(m.coutParParticipant)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ===== FORMATEURS (4) ===== */}
        <section className="ax-card ax-col-third" role="region" aria-label={t('formations.formateurs.titre')}>
          <div className="ax-card__header">
            <div className="ax-card__titles">
              <h2 className="ax-card__title">{t('formations.formateurs.titre')}</h2>
              <p className="ax-card__subtitle">{t('formations.formateurs.sousTitre')}</p>
            </div>
          </div>
          <div className="ax-card__body" style={{ paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-4)' }}>
            {formateurs.map((f, i) => {
              const teinte = `var(${COULEURS_MODULE[i % COULEURS_MODULE.length]})`;
              return (
                <div key={f.nom} className="ax-cluster" style={{ gap: 'var(--ax-space-3)', flexWrap: 'nowrap' }}>
                  <b className="ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: i === 0 ? 'var(--ax-warning-500)' : 'var(--ax-text-subtle)', width: 18, textAlign: 'center' }}>
                    {i + 1}
                  </b>
                  {/* Avatar à initiales : les formateurs sont des personnes fictives,
                      aucun portrait du corpus ne doit les incarner. */}
                  <span className="ax-avatar ax-avatar--squircle" style={{ background: `color-mix(in oklab,${teinte} 20%,transparent)`, color: teinte, fontWeight: 600 }}>
                    {f.initiales}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ax-text-truncate" style={{ fontWeight: 'var(--ax-weight-medium)', color: 'var(--ax-text-strong)' }}>{f.nom}</div>
                    <div style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>
                      {t('formations.formateurs.detail', { sessions: f.sessions })}
                    </div>
                  </div>
                  <b className="ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-text-strong)' }}>{formaterNombre(f.participants)}</b>
                </div>
              );
            })}
          </div>
        </section>

        {/* ===== DERNIÈRES CERTIFICATIONS (8) ===== */}
        <section className="ax-card ax-col-wide" role="region" aria-label={t('formations.certifications.titre')}>
          <div className="ax-card__header">
            <div className="ax-card__titles">
              <h2 className="ax-card__title">{t('formations.certifications.titre')}</h2>
              <p className="ax-card__subtitle">{t('formations.certifications.sousTitre')}</p>
            </div>
            <Link className="ax-btn ax-btn--link" href="/formations/certifications">{t('formations.certifications.voirTout')}</Link>
          </div>
          <div className="ax-table-wrap">
            <table className="ax-table ax-table--hover">
              <thead className="ax-table__head">
                <tr>
                  <th className="ax-table__th" scope="col">{t('formations.certifications.colonneMembre')}</th>
                  <th className="ax-table__th" scope="col">{t('formations.certifications.colonneModule')}</th>
                  <th className="ax-table__th" scope="col">{t('formations.certifications.colonneDate')}</th>
                  <th className="ax-table__th ax-table__th--num" scope="col">{t('formations.certifications.colonneScore')}</th>
                  <th className="ax-table__th" scope="col">{t('formations.certifications.colonneMention')}</th>
                </tr>
              </thead>
              <tbody>
                {certifications.map((c, i) => {
                  const teinte = `var(${COULEURS_MODULE[i % COULEURS_MODULE.length]})`;
                  const mention = c.score >= 85 ? 'excellent' : c.score >= 70 ? 'bien' : 'passable';
                  const tonalite = c.score >= 85 ? 'success' : c.score >= 70 ? 'info' : 'neutral';
                  return (
                    <tr key={c.id} className="ax-table__row">
                      <td className="ax-table__td">
                        <div className="ax-cluster" style={{ gap: 'var(--ax-space-3)', flexWrap: 'nowrap' }}>
                          <span className="ax-avatar ax-avatar--sm" style={{ background: `color-mix(in oklab,${teinte} 20%,transparent)`, color: teinte, fontWeight: 600 }}>
                            {c.initiales}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 'var(--ax-weight-medium)', color: 'var(--ax-text-strong)' }}>{c.membre}</div>
                            <div className="ax-text-truncate" style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>{c.groupement}</div>
                          </div>
                        </div>
                      </td>
                      <td className="ax-table__td" style={{ color: 'var(--ax-text-muted)' }}>{c.module}</td>
                      <td className="ax-table__td ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-text-muted)', whiteSpace: 'nowrap' }}>{formaterDate(c.date)}</td>
                      <td className="ax-table__td ax-table__td--num ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-text-strong)' }}>{c.score} / 100</td>
                      <td className="ax-table__td">
                        <span className={`ax-badge ax-badge--soft ax-badge--${tonalite} ax-badge--pill`}>
                          <span className="ax-badge__dot" />
                          {t(`formations.certifications.mentions.${mention}`)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <style>{GRILLE}</style>
    </>
  );
}

/** Une ligne « libellé — valeur » du pied de la carte Qualité du dispositif. */
function LigneChiffre({ libelle, valeur, premier }: { libelle: string; valeur: string; premier?: boolean }) {
  return (
    <div
      className="ax-cluster"
      style={{ justifyContent: 'space-between', marginTop: premier ? 'var(--ax-space-3)' : 'var(--ax-space-2)' }}
    >
      <span style={{ fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text-muted)' }}>{libelle}</span>
      <b className="ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-text-strong)' }}>{valeur}</b>
    </div>
  );
}

export default TableauDeBordFormations;
