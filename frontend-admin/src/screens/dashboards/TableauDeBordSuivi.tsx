'use client';
/*
 * Tableau de bord de suivi — route « dashboards/projects ».
 *
 * C'est l'écran central de la démonstration : celui qui montre que la plateforme
 * n'est pas un annuaire mais un outil de suivi-évaluation. Il répond à quatre
 * questions dans l'ordre où un élu les pose : où en est l'accompagnement, où en
 * sont les activités, qui les porte, et ce qu'elles ont coûté.
 *
 * Adapté du tableau de bord « Projects » de Vireo : composition, classes `.ax-*`
 * et diagramme de Gantt en CSS sont conservés — c'est le travail de mise en forme
 * du template qu'on garde — le contenu est intégralement celui du projet.
 *
 * **Composant de présentation, sans accès aux données.** Tout arrive en props
 * depuis `app/(shell)/dashboards/projects/page.tsx`, composant serveur qui
 * interroge `domaine/source.ts`. Le jour où Django répondra, seul le composant
 * serveur changera.
 *
 * Le composant reste client : `vizColors()` lit les tokens calculés sur
 * `document` et `<ApexChart>` monte des graphiques impératifs.
 */
import type { ReactElement } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHead } from '../../components/shell/PageHead';
import { ApexChart } from '../../components/charts/ApexChart';
import { formaterDate, formaterFcfa, formaterFcfaCompact } from '../../domaine';
import type { EtapeAccompagnement, Kpi, StatutActivite } from '../../domaine';

/* Résout les tokens --ax-viz-* en couleurs concrètes pour ApexCharts. Compatible
   rendu serveur : sans `document`, renvoie les valeurs Aurora de repli, puis la
   re-thématisation du graphique (ax:change) repeint avec les vrais tokens. */
const VIZ_FALLBACK: Record<string, string> = {
  '--ax-accent': '#1E856C',
  '--ax-viz-cyan': '#38BDF8',
  '--ax-viz-violet': '#A78BFA',
  '--ax-viz-pink': '#F472B6',
  '--ax-viz-amber': '#FBBF24',
  '--ax-viz-emerald': '#34D399',
  '--ax-viz-red': '#FB7185',
};
function vizColors(tokens: string[]): string[] {
  if (typeof document === 'undefined') return tokens.map((t) => VIZ_FALLBACK[t] || '#38BDF8');
  const cs = getComputedStyle(document.documentElement);
  return tokens.map((t) => cs.getPropertyValue(t).trim() || VIZ_FALLBACK[t] || '#38BDF8');
}

const ICON_CAL = (
  <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12" /><path d="M16 3v4" /><path d="M8 3v4" /><path d="M4 11h16" /><path d="M11 15h1" /><path d="M12 15v3" /></svg>
);
const ICON_CHEV = (
  <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6l6 -6" /></svg>
);
const ICON_EXPORT = (
  <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 11l5 5l5 -5" /><path d="M12 4l0 12" /></svg>
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

/* Une icône par carte d'en-tête, choisie sur la clé renvoyée par la source. */
const ICONES_KPI: Record<string, ReactElement> = {
  terminees: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 11l3 3l8 -8" /><path d="M20 12v6a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h9" /></svg>,
  jalons: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 21v-16" /><path d="M5 5a5 5 0 0 1 7 0a5 5 0 0 0 7 0v9a5 5 0 0 1 -7 0a5 5 0 0 0 -7 0" /></svg>,
  echues: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" /><path d="M12 7v5l3 3" /></svg>,
  cadre: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12h4l3 8l4 -16l3 8h4" /></svg>,
};

/* Teintes de carte KPI du template : quatre variantes de pastille. */
const CLASSES_PASTILLE = ['c1', 'c2', 'c3', 'c4'];
const COULEURS_SPARK = ['--ax-accent', '--ax-viz-cyan', '--ax-viz-amber', '--ax-viz-violet'];

/* Ordre d'affichage de l'anneau des statuts, et tonalité associée. Le rouge est
   réservé au retard : c'est le seul statut sur lequel la coordination doit agir. */
const STATUTS_ACTIVITE: ReadonlyArray<{ cle: StatutActivite; token: string }> = [
  { cle: 'en_cours', token: '--ax-accent' },
  { cle: 'terminee', token: '--ax-viz-emerald' },
  { cle: 'planifiee', token: '--ax-viz-cyan' },
  { cle: 'en_retard', token: '--ax-viz-red' },
  { cle: 'suspendue', token: '--ax-viz-amber' },
];

/* Tonalité de badge par statut d'activité — même convention dans tout le front. */
const TONALITE_STATUT: Record<StatutActivite, string> = {
  planifiee: 'neutral',
  en_cours: 'info',
  terminee: 'success',
  en_retard: 'danger',
  suspendue: 'warning',
};

/* ------------------------------------------------------------------------- *
 * Contrat de props — la forme exacte servie par le composant serveur
 * ------------------------------------------------------------------------- */

/** Une barre du diagramme de Gantt, déjà positionnée en pourcentage. */
export interface BarreEcheancier {
  code: string;
  intitule: string;
  axe: string;
  /** Décalage depuis le bord gauche de la fenêtre du diagramme, 0–100. */
  gauche: number;
  /** Largeur de la barre dans cette même fenêtre, 0–100. */
  largeur: number;
  avancement: number;
  /** Teinte de l'axe stratégique — un token, jamais une couleur en dur. */
  teinte: string;
  echeance: string;
}

export interface LigneActivite {
  code: string;
  intitule: string;
  axe: string;
  responsable: string;
  responsableInitiales: string;
  teinte: string;
  avancement: number;
  budgetPrevu: number;
  budgetConsomme: number;
  echeance: string;
  statut: StatutActivite;
}

export interface AvancementAxe {
  code: string;
  intitule: string;
  teinte: string;
  avancement: number;
  indicateursAtteints: number;
  indicateursTotal: number;
}

export interface JalonAVenir {
  id: number;
  intitule: string;
  activite: string | null;
  date: string;
  joursRestants: number;
  decisif: boolean;
}

export interface EtapeParcours {
  etape: EtapeAccompagnement;
  /** Effectif présent sur cette étape aujourd'hui. */
  effectif: number;
  /** Effectif ayant franchi cette étape — celui-ci, plus tous ceux d'après. */
  franchie: number;
}

export interface DonneesSuivi {
  kpis: Kpi[];
  parcours: EtapeParcours[];
  statuts: Array<{ statut: StatutActivite; effectif: number }>;
  totalActivites: number;
  echeancier: { barres: BarreEcheancier[]; reperes: string[] };
  charge: Array<{ responsable: string; activites: number }>;
  axes: AvancementAxe[];
  budget: {
    engage: number;
    consomme: number;
    partConsommee: number;
    avancementMoyen: number;
    ouvertes: number;
  };
  jalons: JalonAVenir[];
  planAction: LigneActivite[];
}

/* ------------------------------------------------------------------------- *
 * Écran
 * ------------------------------------------------------------------------- */

export function TableauDeBordSuivi({ donnees }: { donnees: DonneesSuivi }) {
  const t = useTranslations('ecrans');
  const tc = useTranslations('commun');

  const {
    kpis,
    parcours,
    statuts,
    totalActivites,
    echeancier,
    charge,
    axes,
    budget,
    jalons,
    planAction,
  } = donnees;

  const couleursStatuts = vizColors(STATUTS_ACTIVITE.map((s) => s.token));
  const couleursCharge = vizColors([
    '--ax-accent',
    '--ax-viz-cyan',
    '--ax-viz-violet',
    '--ax-viz-pink',
    '--ax-viz-amber',
    '--ax-viz-emerald',
  ]);

  return (
    <>
      <PageHead
        title={t('suivi.titre')}
        subtitle={t('suivi.sousTitre')}
        actions={
          <>
            <button type="button" className="ax-btn ax-btn--secondary ax-btn--pill">
              {ICON_CAL}
              <span className="ax-btn__label">{t('suivi.periode')}</span>
              {ICON_CHEV}
            </button>
            <button type="button" className="ax-btn ax-btn--ghost">
              {ICON_EXPORT}
              <span className="ax-btn__label">{t('suivi.exporter')}</span>
            </button>
            <button type="button" className="ax-btn ax-btn--primary">
              {ICON_PLUS}
              <span className="ax-btn__label">{t('suivi.nouvelleActivite')}</span>
            </button>
          </>
        }
      />

      <div className="ax-dash-grid">
        {/* ===== INDICATEURS D'EN-TÊTE ===== */}
        {kpis.map((k, i) => {
          // Pour un indicateur qu'on cherche à faire baisser, une baisse est une
          // bonne nouvelle : la couleur suit le sens métier, la flèche suit le
          // signe. Un écran qui peindrait « moins d'activités en retard » en
          // rouge se ferait corriger dès la première réunion de comité.
          const decroissant = k.sens === 'decroissant';
          const favorable = decroissant ? k.delta <= 0 : k.delta >= 0;
          return (
            <div
              key={k.cle}
              className="ax-card ax-kpi ax-col--3"
              role="region"
              aria-label={`${k.libelle} : ${k.valeur_affichee}`}
            >
              <div className="ax-card__body">
                <div className="ax-kpi__top">
                  <span className={`ax-kpi__icon ax-kpi__icon--${CLASSES_PASTILLE[i % 4]}`}>
                    {ICONES_KPI[k.cle] ?? ICONES_KPI.terminees}
                  </span>
                  <span className={`ax-kpi__delta ax-kpi__delta--${favorable ? 'up' : 'down'}`}>
                    {k.delta >= 0 ? ARROW_UP : ARROW_DN}
                    {/* Un indicateur déjà exprimé en pourcentage varie en points :
                        « +42 pts » à côté d'un « 75 % », pas « +42 % ». */}
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

        {/* ===== PARCOURS D'ACCOMPAGNEMENT (8) ===== */}
        <section className="ax-card ax-card--chart ax-col--8" role="region" aria-label={t('suivi.parcours.titre')}>
          <div className="ax-card__header">
            <div className="ax-card__titles">
              <span className="ax-card__eyebrow">{t('suivi.parcours.eyebrow')}</span>
              <h2 className="ax-card__title">{t('suivi.parcours.titre')}</h2>
              <p className="ax-card__subtitle">{t('suivi.parcours.sousTitre')}</p>
            </div>
          </div>
          <div className="ax-card__body" style={{ paddingTop: 0 }}>
            <div className="ax-cluster" style={{ gap: 'var(--ax-space-5)', marginBlockEnd: 'var(--ax-space-3)' }}>
              <span className="ax-cluster" style={{ gap: 'var(--ax-space-2)' }}>
                <i style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--ax-viz-cyan)' }} />
                <small style={{ color: 'var(--ax-text-muted)', fontSize: 'var(--ax-text-sm)' }}>{t('suivi.parcours.franchie')}</small>
              </span>
              <span className="ax-cluster" style={{ gap: 'var(--ax-space-2)' }}>
                <i style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--ax-accent)' }} />
                <small style={{ color: 'var(--ax-text-muted)', fontSize: 'var(--ax-text-sm)' }}>{t('suivi.parcours.actuelle')}</small>
              </span>
            </div>
            <ApexChart
              type="bar"
              height={320}
              legend="none"
              ariaLabel={t('suivi.parcours.aria')}
              series={[
                { name: t('suivi.parcours.franchie'), data: parcours.map((p) => p.franchie) },
                { name: t('suivi.parcours.actuelle'), data: parcours.map((p) => p.effectif) },
              ]}
              apex={{
                colors: vizColors(['--ax-viz-cyan', '--ax-accent']),
                plotOptions: { bar: { borderRadius: 4, columnWidth: '62%' } },
                xaxis: { categories: parcours.map((p) => tc(`etapes.${p.etape}`)) },
              }}
            />
          </div>
        </section>

        {/* ===== STATUT DES ACTIVITÉS (4) ===== */}
        <section className="ax-card ax-col--4" role="region" aria-label={t('suivi.statuts.titre')}>
          <div className="ax-card__header">
            <div className="ax-card__titles"><h2 className="ax-card__title">{t('suivi.statuts.titre')}</h2></div>
          </div>
          <div className="ax-card__body" style={{ paddingTop: 0 }}>
            <ApexChart
              type="donut"
              height={230}
              legend="none"
              ariaLabel={t('suivi.statuts.aria')}
              series={statuts.map((s) => s.effectif)}
              apex={{
                labels: statuts.map((s) => t(`suivi.statuts.${s.statut}`)),
                colors: couleursStatuts,
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
                          label: t('suivi.statuts.total'),
                          formatter: () => String(totalActivites),
                        },
                      },
                    },
                  },
                },
              }}
            />
            <ul className="ax-list ax-list--compact" style={{ marginTop: 'var(--ax-space-2)' }}>
              {statuts.map((s, i) => (
                <li key={s.statut} className="ax-list__row" style={{ border: 0, paddingInline: 0 }}>
                  <span className="ax-list__leading">
                    <i style={{ width: 9, height: 9, borderRadius: 3, background: `var(${STATUTS_ACTIVITE[i].token})`, display: 'inline-block' }} />
                  </span>
                  <span className="ax-list__content">
                    <span className="ax-list__title" style={{ fontWeight: 'var(--ax-weight-medium)' }}>
                      {t(`suivi.statuts.${s.statut}`)}
                    </span>
                  </span>
                  <span className="ax-list__trailing ax-num" style={{ color: 'var(--ax-text-strong)' }}>{s.effectif}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ===== ÉCHÉANCIER DES ACTIVITÉS (8) ===== */}
        <section className="ax-card ax-col--8" role="region" aria-label={t('suivi.echeancier.titre')}>
          <div className="ax-card__header">
            <div className="ax-card__titles">
              <h2 className="ax-card__title">{t('suivi.echeancier.titre')}</h2>
              <p className="ax-card__subtitle">{t('suivi.echeancier.sousTitre')}</p>
            </div>
            <Link className="ax-btn ax-btn--link" href="/projects/list">{t('suivi.echeancier.voirPlan')}</Link>
          </div>
          <div className="ax-card__body" style={{ paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-5)' }}>
            {/* Graduations calculées depuis les dates réelles des activités, et non
                écrites en dur : la fenêtre du diagramme suit le plan d'action. */}
            <div className="ax-cluster" style={{ justifyContent: 'space-between', paddingLeft: 148, color: 'var(--ax-text-subtle)', fontSize: 'var(--ax-text-xs)', fontFamily: 'var(--ax-font-mono)' }}>
              {echeancier.reperes.map((repere) => (
                <span key={repere}>{repere}</span>
              ))}
            </div>
            {echeancier.barres.map((b) => (
              <BarreGantt
                key={b.code}
                barre={b}
                aria={t('suivi.echeancier.barreAria', {
                  intitule: b.intitule,
                  avancement: String(b.avancement),
                  echeance: formaterDate(b.echeance),
                })}
              />
            ))}
          </div>
        </section>

        {/* ===== CHARGE PAR RESPONSABLE (4) ===== */}
        <section className="ax-card ax-col--4" role="region" aria-label={t('suivi.charge.titre')}>
          <div className="ax-card__header">
            <div className="ax-card__titles">
              <h2 className="ax-card__title">{t('suivi.charge.titre')}</h2>
              <p className="ax-card__subtitle">{t('suivi.charge.sousTitre')}</p>
            </div>
          </div>
          <div className="ax-card__body" style={{ paddingTop: 0 }}>
            <ApexChart
              type="bar"
              height={280}
              legend="none"
              ariaLabel={t('suivi.charge.aria')}
              series={[{ name: t('suivi.charge.serie'), data: charge.map((c) => c.activites) }]}
              apex={{
                plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '56%', distributed: true } },
                colors: couleursCharge.slice(0, charge.length),
                xaxis: { categories: charge.map((c) => c.responsable) },
                tooltip: { y: { title: { formatter: () => t('suivi.charge.serie') } } },
              }}
            />
          </div>
        </section>

        {/* ===== AVANCEMENT PAR AXE STRATÉGIQUE (4) ===== */}
        <section className="ax-card ax-col--4" role="region" aria-label={t('suivi.axes.titre')}>
          <div className="ax-card__header">
            <div className="ax-card__titles">
              <h2 className="ax-card__title">{t('suivi.axes.titre')}</h2>
              <p className="ax-card__subtitle">{t('suivi.axes.sousTitre')}</p>
            </div>
          </div>
          <div className="ax-card__body" style={{ paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-4)' }}>
            {axes.map((axe) => (
              <div key={axe.code}>
                <div className="ax-cluster" style={{ justifyContent: 'space-between', marginBottom: 6, flexWrap: 'nowrap', gap: 'var(--ax-space-3)' }}>
                  <span className="ax-text-truncate" style={{ fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text)' }}>
                    <b style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-text-subtle)' }}>{axe.code}</b>{' '}
                    {axe.intitule}
                  </span>
                  <b className="ax-num" style={{ color: 'var(--ax-text-strong)', fontSize: 'var(--ax-text-sm)' }}>{axe.avancement} %</b>
                </div>
                <div className="ax-progress ax-progress--sm">
                  <div className="ax-progress__track">
                    <div className="ax-progress__fill" style={{ width: `${axe.avancement}%`, background: axe.teinte }} />
                  </div>
                </div>
                <div style={{ marginTop: 6, fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>
                  {t('suivi.axes.indicateurs', { atteints: axe.indicateursAtteints, total: axe.indicateursTotal })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== BUDGET DU PLAN D'ACTION (4) ===== */}
        <section className="ax-card ax-col--4" role="region" aria-label={t('suivi.budget.titre')}>
          <div className="ax-card__header">
            <div className="ax-card__titles"><h2 className="ax-card__title">{t('suivi.budget.titre')}</h2></div>
          </div>
          <div className="ax-card__body" style={{ paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-5)' }}>
            <div>
              <div className="ax-cluster" style={{ justifyContent: 'space-between', marginBottom: 'var(--ax-space-2)' }}>
                <span style={{ fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text-muted)' }}>{t('suivi.budget.libelle')}</span>
                <span className="ax-num" style={{ color: 'var(--ax-text-strong)', fontWeight: 'var(--ax-weight-semibold)', whiteSpace: 'nowrap' }}>
                  {formaterFcfaCompact(budget.consomme)} / {formaterFcfaCompact(budget.engage)}
                </span>
              </div>
              <div style={{ display: 'flex', height: 12, borderRadius: 'var(--ax-radius-pill)', overflow: 'hidden' }}>
                <span style={{ width: `${budget.partConsommee}%`, background: 'var(--ax-accent)' }} aria-hidden="true" />
                <span style={{ width: `${100 - budget.partConsommee}%`, background: 'var(--ax-surface-subtle)' }} aria-hidden="true" />
              </div>
              <div className="ax-cluster" style={{ justifyContent: 'space-between', marginTop: 6, fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>
                <span>{t('suivi.budget.consomme', { part: String(budget.partConsommee) })}</span>
                <span>{t('suivi.budget.restant', { montant: formaterFcfaCompact(budget.engage - budget.consomme) })}</span>
              </div>
            </div>

            <div className="ax-divider" />

            <div>
              <div className="ax-cluster" style={{ justifyContent: 'space-between', marginBottom: 'var(--ax-space-2)' }}>
                <span style={{ fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text-muted)' }}>{t('suivi.budget.avancementTitre')}</span>
                <span className="ax-num" style={{ color: 'var(--ax-text-strong)', fontWeight: 'var(--ax-weight-semibold)' }}>{budget.avancementMoyen} %</span>
              </div>
              <div className="ax-progress ax-progress--sm">
                <div className="ax-progress__track">
                  <div className="ax-progress__fill" style={{ width: `${budget.avancementMoyen}%` }} />
                </div>
              </div>
              <div style={{ marginTop: 6, fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>
                {t('suivi.budget.ouvertes', { ouvertes: String(budget.ouvertes), total: String(totalActivites) })}
              </div>
            </div>
          </div>
        </section>

        {/* ===== PROCHAINS JALONS (4) ===== */}
        <section className="ax-card ax-col--4" role="region" aria-label={t('suivi.jalons.titre')}>
          <div className="ax-card__header">
            <div className="ax-card__titles"><h2 className="ax-card__title">{t('suivi.jalons.titre')}</h2></div>
            <Link className="ax-btn ax-btn--link" href="/pages/timeline">{t('suivi.jalons.voirTout')}</Link>
          </div>
          <div className="ax-card__body" style={{ paddingTop: 0 }}>
            <ul className="ax-timeline">
              {jalons.map((j) => (
                <li key={j.id} className={`ax-timeline__item${j.decisif ? ' ax-timeline__item--success' : ''}`}>
                  <span className="ax-timeline__marker" style={j.decisif ? undefined : { color: 'var(--ax-viz-cyan)' }}>
                    {j.decisif ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 21v-16" /><path d="M5 5a5 5 0 0 1 7 0a5 5 0 0 0 7 0v9a5 5 0 0 1 -7 0a5 5 0 0 0 -7 0" /></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" /><path d="M9 12l2 2l4 -4" /></svg>
                    )}
                  </span>
                  <div className="ax-timeline__content">
                    <p className="ax-timeline__title">
                      <b style={{ color: 'var(--ax-text-strong)' }}>{j.intitule}</b>
                      {j.activite ? <> — <span style={{ color: 'var(--ax-text-muted)' }}>{j.activite}</span></> : null}
                    </p>
                    <span className="ax-timeline__time">
                      {formaterDate(j.date)} · {t('suivi.jalons.dansJours', { nombre: j.joursRestants })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ===== PLAN D'ACTION (12) ===== */}
        <section className="ax-card ax-col--12" role="region" aria-label={t('suivi.plan.titre')}>
          <div className="ax-card__header">
            <div className="ax-card__titles">
              <h2 className="ax-card__title">{t('suivi.plan.titre')}</h2>
              <p className="ax-card__subtitle">{t('suivi.plan.sousTitre')}</p>
            </div>
            <Link className="ax-btn ax-btn--link" href="/projects/list">{t('suivi.plan.voirTout')}</Link>
          </div>
          <div className="ax-table-wrap">
            <table className="ax-table ax-table--hover">
              <thead className="ax-table__head">
                <tr>
                  <th className="ax-table__th" scope="col">{t('suivi.plan.colonneActivite')}</th>
                  <th className="ax-table__th" scope="col">{t('suivi.plan.colonneResponsable')}</th>
                  <th className="ax-table__th" scope="col">{t('suivi.plan.colonneAvancement')}</th>
                  <th className="ax-table__th ax-table__th--num" scope="col">{t('suivi.plan.colonneBudget')}</th>
                  <th className="ax-table__th ax-table__th--num" scope="col">{t('suivi.plan.colonneEcheance')}</th>
                  <th className="ax-table__th" scope="col">{t('suivi.plan.colonneStatut')}</th>
                </tr>
              </thead>
              <tbody>
                {planAction.map((a) => (
                  <tr key={a.code} className="ax-table__row">
                    <td className="ax-table__td">
                      <div style={{ fontWeight: 'var(--ax-weight-medium)', color: 'var(--ax-text-strong)' }}>{a.intitule}</div>
                      <div style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>
                        <span style={{ fontFamily: 'var(--ax-font-mono)' }}>{a.code}</span> · {a.axe}
                      </div>
                    </td>
                    <td className="ax-table__td">
                      <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)', flexWrap: 'nowrap' }}>
                        {/* Avatar à initiales : les agents de coordination sont des
                            personnes fictives, aucun portrait réel ne les incarne. */}
                        <span className="ax-avatar ax-avatar--sm" style={{ background: `color-mix(in oklab,${a.teinte} 22%,transparent)`, color: a.teinte, fontWeight: 600 }}>
                          {a.responsableInitiales}
                        </span>
                        <span style={{ color: 'var(--ax-text-muted)', whiteSpace: 'nowrap' }}>{a.responsable}</span>
                      </div>
                    </td>
                    <td className="ax-table__td">
                      <div className="ax-cluster" style={{ gap: 'var(--ax-space-3)', flexWrap: 'nowrap' }}>
                        <div className="ax-progress ax-progress--sm" style={{ minWidth: 96 }}>
                          <div className="ax-progress__track">
                            <div className="ax-progress__fill" style={{ width: `${a.avancement}%`, background: a.teinte }} />
                          </div>
                        </div>
                        <span className="ax-num" style={{ color: 'var(--ax-text-muted)', fontSize: 'var(--ax-text-xs)' }}>{a.avancement} %</span>
                      </div>
                    </td>
                    <td className="ax-table__td ax-table__td--num" style={{ whiteSpace: 'nowrap' }}>
                      {formaterFcfa(a.budgetConsomme)}
                      <div style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>
                        {t('suivi.plan.surEngage', { montant: formaterFcfaCompact(a.budgetPrevu) })}
                      </div>
                    </td>
                    <td className="ax-table__td ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-text-muted)', whiteSpace: 'nowrap' }}>
                      {formaterDate(a.echeance)}
                    </td>
                    <td className="ax-table__td">
                      <span className={`ax-badge ax-badge--soft ax-badge--${TONALITE_STATUT[a.statut]} ax-badge--pill`}>
                        <span className="ax-badge__dot" />
                        {t(`suivi.statuts.${a.statut}`)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

/**
 * Une ligne du diagramme de Gantt.
 *
 * Le diagramme est en CSS pur, comme dans le template : trois `<span>` empilés
 * dans une piste. Aucune bibliothèque de Gantt n'est chargée pour huit barres.
 *
 * La portion réalisée est peinte en teinte pleine, la portion restante dans la
 * même teinte à 26 % : le contraste se lit dans les deux thèmes, ce que ne
 * ferait pas un mélange avec du blanc.
 */
function BarreGantt({ barre, aria }: { barre: BarreEcheancier; aria: string }) {
  return (
    <div className="ax-cluster" style={{ gap: 'var(--ax-space-3)', flexWrap: 'nowrap' }}>
      <div style={{ width: 136, flex: '0 0 136px' }}>
        <div className="ax-text-truncate" style={{ fontWeight: 'var(--ax-weight-medium)', color: 'var(--ax-text-strong)', fontSize: 'var(--ax-text-sm)' }} title={barre.intitule}>
          {barre.intitule}
        </div>
        <div className="ax-text-truncate" style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>{barre.axe}</div>
      </div>
      <div
        style={{ flex: '1 1 auto', height: 18, borderRadius: 'var(--ax-radius-pill)', background: 'var(--ax-surface-subtle)', position: 'relative' }}
        role="img"
        aria-label={aria}
      >
        <span
          style={{
            position: 'absolute',
            left: `${barre.gauche}%`,
            width: `${barre.largeur}%`,
            top: 0,
            bottom: 0,
            borderRadius: 'var(--ax-radius-pill)',
            background: `color-mix(in oklab,${barre.teinte} 26%,transparent)`,
          }}
          aria-hidden="true"
        />
        <span
          style={{
            position: 'absolute',
            left: `${barre.gauche}%`,
            width: `${(barre.largeur * barre.avancement) / 100}%`,
            top: 0,
            bottom: 0,
            borderRadius: 'var(--ax-radius-pill)',
            background: barre.teinte,
          }}
          aria-hidden="true"
        />
      </div>
      <span className="ax-num" style={{ width: 46, textAlign: 'right', color: 'var(--ax-text-strong)', fontSize: 'var(--ax-text-sm)' }}>
        {barre.avancement} %
      </span>
    </div>
  );
}

export default TableauDeBordSuivi;
