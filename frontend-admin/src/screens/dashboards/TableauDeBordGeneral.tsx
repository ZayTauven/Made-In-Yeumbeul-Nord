'use client';
/*
 * Tableau de bord général — route « / », premier écran de la démonstration.
 *
 * Adapté du tableau de bord « Sales » de Vireo : la composition et les classes
 * `.ax-*` sont conservées à l'identique — c'est le travail de mise en forme du
 * template qu'on garde — mais le contenu est intégralement celui du projet.
 *
 * **Composant de présentation, sans accès aux données.** Tout arrive en props
 * depuis `app/(shell)/page.tsx`, qui est un composant serveur et interroge
 * `domaine/source.ts`. Deux raisons :
 *
 *  - le jour où l'API Django répondra, seul le composant serveur changera ;
 *  - les données transitent déjà sous la forme exacte du contrat d'API, donc
 *    l'écran est écrit contre le contrat et non contre un jeu local.
 *
 * Le composant reste client : `vizColors()` lit les tokens calculés sur
 * `document`, et `<ApexChart>` monte des graphiques impératifs. Les deux sont
 * réservés au navigateur.
 */
import type { ReactElement } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHead } from '../../components/shell/PageHead';
import { ApexChart } from '../../components/charts/ApexChart';
import {
  formaterDate,
  formaterDepuis,
  formaterFcfa,
  formaterFcfaCompact,
  formaterNombre,
  DATE_REFERENCE,
} from '../../domaine';
import type { EvenementJournal, Kpi, MouvementFinancier, PointSerie } from '../../domaine';

/* Résout les tokens --ax-viz-* en couleurs concrètes pour ApexCharts. Compatible
   rendu serveur : sans `document`, renvoie les valeurs Aurora de repli, puis la
   re-thématisation du graphique (ax:change) repeint avec les vrais tokens. */
const VIZ_FALLBACK: Record<string, string> = {
  '--ax-viz-cyan': '#38BDF8',
  '--ax-viz-violet': '#A78BFA',
  '--ax-viz-pink': '#F472B6',
  '--ax-viz-amber': '#FBBF24',
  '--ax-viz-emerald': '#34D399',
  '--ax-accent': '#1E856C',
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
const ICONE_GROUPEMENT = (
  <svg className="ax-avatar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M8 21v-1a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v1" /><path d="M15 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M17 10h2a2 2 0 0 1 2 2v1" /><path d="M5 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M3 13v-1a2 2 0 0 1 2 -2h2" /></svg>
);

/* Une icône par indicateur d'en-tête, choisie sur la clé renvoyée par l'API. */
const ICONES_KPI: Record<string, ReactElement> = {
  groupements: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M8 21v-1a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v1" /><path d="M15 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M17 10h2a2 2 0 0 1 2 2v1" /><path d="M5 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M3 13v-1a2 2 0 0 1 2 -2h2" /></svg>,
  membres: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /><path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /><path d="M21 21v-2a4 4 0 0 0 -3 -3.85" /></svg>,
  part_femmes: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 9a5 5 0 1 0 10 0a5 5 0 0 0 -10 0" /><path d="M13 14v7" /><path d="M10 18h6" /></svg>,
  decaissements: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v18" /><path d="M17 8a4 4 0 0 0 -4 -3h-2a3.5 3.5 0 0 0 0 7h2a3.5 3.5 0 0 1 0 7h-2a4 4 0 0 1 -4 -3" /></svg>,
  productions: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l8 4.5l0 9l-8 4.5l-8 -4.5l0 -9l8 -4.5" /><path d="M12 12l8 -4.5" /><path d="M12 12l0 9" /><path d="M12 12l-8 -4.5" /></svg>,
  en_production: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 21h18" /><path d="M5 21v-14l8 -4v18" /><path d="M19 21v-10l-6 -4" /><path d="M9 9v.01" /><path d="M9 12v.01" /><path d="M9 15v.01" /></svg>,
};

/* Teintes de carte KPI du template : quatre variantes de pastille. */
const CLASSES_PASTILLE = ['c1', 'c2', 'c3', 'c4'];
const COULEURS_SPARK = ['--ax-accent', '--ax-viz-cyan', '--ax-viz-violet', '--ax-viz-amber'];

/* ------------------------------------------------------------------------- *
 * Contrat de props — la forme exacte servie par le composant serveur
 * ------------------------------------------------------------------------- */

export interface EntreeRepartition {
  libelle: string;
  slug: string;
  valeur: number;
  part: number;
  teinte?: string;
}

export interface GroupementEnTete {
  nom: string;
  slug: string;
  contexte: string;
  progression: number;
  chiffreAffaires: number;
}

export interface DonneesTableauBord {
  kpis: Kpi[];
  progression: PointSerie[];
  filieres: EntreeRepartition[];
  quartiers: EntreeRepartition[];
  topGroupements: GroupementEnTete[];
  mouvements: MouvementFinancier[];
  journal: EvenementJournal[];
  finance: {
    totalDecaisse: number;
    totalMobilise: number;
    totalRembourse: number;
    encours: number;
  };
  totalGroupements: number;
}

/* ------------------------------------------------------------------------- *
 * Écran
 * ------------------------------------------------------------------------- */

export function TableauDeBordGeneral({ donnees }: { donnees: DonneesTableauBord }) {
  const t = useTranslations('ecrans');
  const tc = useTranslations('commun');

  const { kpis, progression, filieres, quartiers, topGroupements, mouvements, journal, finance } = donnees;

  // Quatre cartes seulement en en-tête : au-delà, la ligne se casse sur
  // vidéoprojecteur et l'écran perd sa lecture immédiate.
  const kpisEnTete = kpis.slice(0, 4);

  // L'anneau ne supporte pas onze parts lisibles : on garde les cinq premières
  // filières et on agrège le reste, plutôt que d'afficher une couronne illisible.
  const filieresPrincipales = filieres.slice(0, 5);
  const reste = filieres.slice(5).reduce((s, f) => s + f.valeur, 0);
  const partsAnneau = [...filieresPrincipales.map((f) => f.valeur), ...(reste > 0 ? [reste] : [])];
  const libellesAnneau = [
    ...filieresPrincipales.map((f) => f.libelle),
    ...(reste > 0 ? [t('tableauBord.filieres.autres')] : []),
  ];
  const couleursAnneau = vizColors(
    ['--ax-accent', '--ax-viz-cyan', '--ax-viz-violet', '--ax-viz-pink', '--ax-viz-amber', '--ax-viz-emerald'].slice(
      0,
      partsAnneau.length,
    ),
  );

  return (
    <>
      <PageHead
        title={t('tableauBord.titre')}
        subtitle={t('tableauBord.sousTitre')}
        actions={
          <>
            <button type="button" className="ax-btn ax-btn--secondary ax-btn--pill">
              {ICON_CAL}
              <span className="ax-btn__label">{t('tableauBord.periode')}</span>
              {ICON_CHEV}
            </button>
            <button type="button" className="ax-btn ax-btn--ghost">
              {ICON_EXPORT}
              <span className="ax-btn__label">{t('tableauBord.exporter')}</span>
            </button>
            <button type="button" className="ax-btn ax-btn--primary">
              {ICON_PLUS}
              <span className="ax-btn__label">{t('tableauBord.nouveauRapport')}</span>
            </button>
          </>
        }
      />

      <div className="ax-dash-grid">
        {/* ===== INDICATEURS D'EN-TÊTE ===== */}
        {kpisEnTete.map((k, i) => (
          <div
            key={k.cle}
            className="ax-card ax-kpi ax-col--3"
            role="region"
            aria-label={`${k.libelle} : ${k.valeur_affichee}`}
          >
            <div className="ax-card__body">
              <div className="ax-kpi__top">
                <span className={`ax-kpi__icon ax-kpi__icon--${CLASSES_PASTILLE[i % 4]}`}>
                  {ICONES_KPI[k.cle] ?? ICONES_KPI.groupements}
                </span>
                <span className={`ax-kpi__delta ax-kpi__delta--${k.tendance === 'baisse' ? 'down' : 'up'}`}>
                  {k.tendance === 'baisse' ? ARROW_DN : ARROW_UP}
                  {`${k.delta.toFixed(1).replace('.', ',')} %`}
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
        ))}

        {/* ===== PROGRESSION DE L'ACCOMPAGNEMENT (8) ===== */}
        <section className="ax-card ax-card--chart ax-col--8" role="region" aria-label={t('tableauBord.progression.titre')}>
          <div className="ax-card__header">
            <div className="ax-card__titles">
              <span className="ax-card__eyebrow">{t('tableauBord.progression.eyebrow')}</span>
              <h2 className="ax-card__title">{t('tableauBord.progression.titre')}</h2>
              <p className="ax-card__subtitle">{t('tableauBord.progression.sousTitre')}</p>
            </div>
            <div className="ax-card__actions">
              <div className="ax-btn-group ax-btn-group--segmented" role="radiogroup" aria-label={t('tableauBord.progression.granularite')}>
                <button type="button" className="ax-btn ax-btn--sm is-selected" role="radio" aria-checked="true">{t('tableauBord.progression.mois')}</button>
                <button type="button" className="ax-btn ax-btn--sm" role="radio" aria-checked="false">{t('tableauBord.progression.trimestre')}</button>
                <button type="button" className="ax-btn ax-btn--sm" role="radio" aria-checked="false">{t('tableauBord.progression.annee')}</button>
              </div>
            </div>
          </div>
          <div className="ax-card__body" style={{ paddingTop: 0 }}>
            <div className="ax-cluster" style={{ gap: 'var(--ax-space-5)', marginBlockEnd: 'var(--ax-space-3)' }}>
              <span className="ax-cluster" style={{ gap: 'var(--ax-space-2)' }}>
                <i style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--ax-accent)' }} />
                <small style={{ color: 'var(--ax-text-muted)', fontSize: 'var(--ax-text-sm)' }}>{t('tableauBord.progression.serieCourante')}</small>
              </span>
              <span className="ax-cluster" style={{ gap: 'var(--ax-space-2)' }}>
                <i style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--ax-viz-cyan)' }} />
                <small style={{ color: 'var(--ax-text-muted)', fontSize: 'var(--ax-text-sm)' }}>{t('tableauBord.progression.seriePrecedente')}</small>
              </span>
            </div>
            <ApexChart
              type="area"
              height={320}
              legend="none"
              accent
              ariaLabel={t('tableauBord.progression.aria')}
              series={[
                { name: t('tableauBord.progression.serieCourante'), data: progression.map((p) => p.valeur) },
                { name: t('tableauBord.progression.seriePrecedente'), data: progression.map((p) => p.precedent) },
              ]}
              apex={{ xaxis: { categories: progression.map((p) => p.periode) } }}
            />
          </div>
        </section>

        {/* ===== ENVELOPPE DU PROJET (4) ===== */}
        <section className="ax-card ax-card--balance ax-col--4" role="region" aria-label={t('tableauBord.enveloppe.titre')}>
          <div className="ax-card__header">
            <div className="ax-card__titles"><h2 className="ax-card__title">{t('tableauBord.enveloppe.titre')}</h2></div>
          </div>
          <div className="ax-card__body" style={{ paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-5)' }}>
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--ax-radius-lg)', padding: 'var(--ax-space-5)', background: 'var(--ax-gradient-plate)', boxShadow: 'var(--ax-shadow-md)', color: '#fff', minHeight: 172, display: 'flex', flexDirection: 'column' }}>
              <span aria-hidden="true" style={{ position: 'absolute', top: -40, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,.18)', filter: 'blur(6px)' }} />
              <span aria-hidden="true" style={{ position: 'absolute', bottom: -50, left: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,.12)' }} />
              <div className="ax-cluster" style={{ justifyContent: 'space-between', position: 'relative' }}>
                <b style={{ fontFamily: 'var(--ax-font-display)', letterSpacing: '.02em', color: 'inherit' }}>
                  {tc('produit.tutelle')}
                </b>
                <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ opacity: 0.9 }}><path d="M12 3v18" /><path d="M17 8a4 4 0 0 0 -4 -3h-2a3.5 3.5 0 0 0 0 7h2a3.5 3.5 0 0 1 0 7h-2a4 4 0 0 1 -4 -3" /></svg>
              </div>
              <div style={{ marginTop: 'auto', position: 'relative' }}>
                <div style={{ fontSize: 'var(--ax-text-xs)', opacity: 0.85 }}>{t('tableauBord.enveloppe.libelle')}</div>
                <div className="ax-num" style={{ fontFamily: 'var(--ax-font-display)', fontSize: 'var(--ax-text-2xl)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-.01em' }}>
                  {formaterFcfa(finance.totalDecaisse)}
                </div>
                <div className="ax-num" style={{ fontFamily: 'var(--ax-font-mono)', fontSize: 'var(--ax-text-sm)', opacity: 0.92, marginTop: 'var(--ax-space-3)' }}>
                  {t('tableauBord.enveloppe.mobilise', { montant: formaterFcfaCompact(finance.totalMobilise) })}
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--ax-space-3)' }}>
              <Link href="/ecommerce/create-invoice" className="ax-btn ax-btn--solid ax-btn--block">
                <span className="ax-btn__label">{t('tableauBord.enveloppe.enregistrer')}</span>
              </Link>
              <Link href="/financement/remboursements" className="ax-btn ax-btn--secondary ax-btn--block">
                <span className="ax-btn__label">{t('tableauBord.enveloppe.remboursements')}</span>
              </Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'var(--ax-space-3)', textAlign: 'center' }}>
              <div>
                <small style={{ display: 'block', color: 'var(--ax-text-subtle)', fontSize: 'var(--ax-text-xs)', marginBottom: 2 }}>{t('tableauBord.enveloppe.decaisse')}</small>
                <b className="ax-num" style={{ color: 'var(--ax-text-strong)', fontSize: 'var(--ax-text-md)' }}>{formaterFcfaCompact(finance.totalDecaisse)}</b>
              </div>
              <div>
                <small style={{ display: 'block', color: 'var(--ax-text-subtle)', fontSize: 'var(--ax-text-xs)', marginBottom: 2 }}>{t('tableauBord.enveloppe.rembourse')}</small>
                <b className="ax-num" style={{ color: 'var(--ax-viz-emerald)', fontSize: 'var(--ax-text-md)' }}>{formaterFcfaCompact(finance.totalRembourse)}</b>
              </div>
              <div>
                <small style={{ display: 'block', color: 'var(--ax-text-subtle)', fontSize: 'var(--ax-text-xs)', marginBottom: 2 }}>{t('tableauBord.enveloppe.encours')}</small>
                <b className="ax-num" style={{ color: 'var(--ax-viz-cyan)', fontSize: 'var(--ax-text-md)' }}>{formaterFcfaCompact(finance.encours)}</b>
              </div>
            </div>
          </div>
        </section>

        {/* ===== RÉPARTITION PAR FILIÈRE (4) ===== */}
        <section className="ax-card ax-col--4" role="region" aria-label={t('tableauBord.filieres.titre')}>
          <div className="ax-card__header">
            <div className="ax-card__titles"><h2 className="ax-card__title">{t('tableauBord.filieres.titre')}</h2></div>
            <Link className="ax-btn ax-btn--link" href="/productions/filieres">{tc('actions.voirTout')}</Link>
          </div>
          <div className="ax-card__body" style={{ paddingTop: 0 }}>
            <ApexChart
              type="donut"
              height={230}
              legend="none"
              ariaLabel={t('tableauBord.filieres.aria')}
              series={partsAnneau}
              apex={{
                labels: libellesAnneau,
                colors: couleursAnneau,
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
                          label: t('tableauBord.filieres.totalLibelle'),
                          formatter: () => formaterNombre(donnees.totalGroupements),
                        },
                      },
                    },
                  },
                },
              }}
            />
            <ul className="ax-list ax-list--compact" style={{ marginTop: 'var(--ax-space-2)' }}>
              {filieresPrincipales.map((f, i) => (
                <li key={f.slug} className="ax-list__row" style={{ border: 0, paddingInline: 0 }}>
                  <span className="ax-list__leading">
                    <i style={{ width: 9, height: 9, borderRadius: 3, background: couleursAnneau[i], display: 'inline-block' }} />
                  </span>
                  <span className="ax-list__content">
                    <span className="ax-list__title" style={{ fontWeight: 'var(--ax-weight-medium)' }}>{f.libelle}</span>
                  </span>
                  <span className="ax-list__trailing ax-num" style={{ color: 'var(--ax-text-strong)' }}>{f.valeur}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ===== GROUPEMENTS LES PLUS ACTIFS (4) ===== */}
        <section className="ax-card ax-col--4" role="region" aria-label={t('tableauBord.topGroupements.titre')}>
          <div className="ax-card__header">
            <div className="ax-card__titles">
              <h2 className="ax-card__title">{t('tableauBord.topGroupements.titre')}</h2>
              <p className="ax-card__subtitle">{t('tableauBord.topGroupements.sousTitre')}</p>
            </div>
            <Link className="ax-btn ax-btn--link" href="/crm/companies">{t('tableauBord.topGroupements.voirAnnuaire')}</Link>
          </div>
          <div className="ax-card__body" style={{ paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-4)' }}>
            {topGroupements.map((g, i) => {
              const teinte = vizColors([COULEURS_SPARK[i % 4]])[0];
              return (
                <div key={g.slug} className="ax-cluster" style={{ gap: 'var(--ax-space-3)', flexWrap: 'nowrap' }}>
                  <span className="ax-avatar ax-avatar--squircle" style={{ background: `color-mix(in oklab,${teinte} 18%,transparent)`, color: teinte }}>
                    {ICONE_GROUPEMENT}
                  </span>
                  <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                    <div className="ax-text-truncate" style={{ fontWeight: 'var(--ax-weight-medium)', color: 'var(--ax-text-strong)' }}>{g.nom}</div>
                    <div className="ax-text-truncate" style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>{g.contexte}</div>
                    <div className="ax-progress ax-progress--xs" style={{ marginTop: 6 }}>
                      <div className="ax-progress__track"><div className="ax-progress__fill" style={{ width: `${g.progression}%` }} /></div>
                    </div>
                  </div>
                  <div className="ax-num" style={{ fontFamily: 'var(--ax-font-mono)', fontWeight: 'var(--ax-weight-semibold)', color: 'var(--ax-text-strong)', whiteSpace: 'nowrap' }}>
                    {formaterFcfaCompact(g.chiffreAffaires)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ===== IMPLANTATION PAR QUARTIER (4) ===== */}
        <section className="ax-card ax-col--4" role="region" aria-label={t('tableauBord.quartiers.titre')}>
          <div className="ax-card__header">
            <div className="ax-card__titles"><h2 className="ax-card__title">{t('tableauBord.quartiers.titre')}</h2></div>
            <Link className="ax-btn ax-btn--link" href="/pilotage/analyse-quartiers">{t('tableauBord.quartiers.voirAnalyse')}</Link>
          </div>
          <div className="ax-card__body" style={{ paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-4)' }}>
            {quartiers.slice(0, 6).map((q, i) => (
              <div key={q.slug}>
                <div className="ax-cluster" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text)' }}>{q.libelle}</span>
                  <b className="ax-num" style={{ color: 'var(--ax-text-strong)', fontSize: 'var(--ax-text-sm)' }}>
                    {tc('unites.groupements', { nombre: q.valeur })}
                  </b>
                </div>
                <div className="ax-progress ax-progress--sm">
                  <div className="ax-progress__track">
                    <div
                      className="ax-progress__fill"
                      style={{
                        // Rapporté au quartier le plus dense, et non au total : sur dix
                        // quartiers, des barres calées sur 100 % resteraient toutes minuscules.
                        width: `${Math.round((q.valeur / (quartiers[0]?.valeur || 1)) * 100)}%`,
                        background: `var(${COULEURS_SPARK[i % 4]})`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== DERNIERS MOUVEMENTS FINANCIERS (8) ===== */}
        <section className="ax-card ax-col--8" role="region" aria-label={t('tableauBord.mouvements.titre')}>
          <div className="ax-card__header">
            <div className="ax-card__titles">
              <h2 className="ax-card__title">{t('tableauBord.mouvements.titre')}</h2>
              <p className="ax-card__subtitle">{t('tableauBord.mouvements.sousTitre')}</p>
            </div>
            <Link className="ax-btn ax-btn--link" href="/crypto/transactions">{t('tableauBord.mouvements.voirJournal')}</Link>
          </div>
          <div className="ax-table-wrap">
            <table className="ax-table ax-table--hover">
              <thead className="ax-table__head">
                <tr>
                  <th className="ax-table__th" scope="col">{t('tableauBord.mouvements.colonneLibelle')}</th>
                  <th className="ax-table__th" scope="col">{t('tableauBord.mouvements.colonneCategorie')}</th>
                  <th className="ax-table__th" scope="col">{t('tableauBord.mouvements.colonneDate')}</th>
                  <th className="ax-table__th ax-table__th--num" scope="col">{t('tableauBord.mouvements.colonneMontant')}</th>
                  <th className="ax-table__th" scope="col">{t('tableauBord.mouvements.colonneStatut')}</th>
                </tr>
              </thead>
              <tbody>
                {mouvements.map((m) => (
                  <LigneMouvement
                    key={m.id}
                    mouvement={m}
                    statut={t(`tableauBord.mouvements.statuts.${m.statut}`)}
                    moyen={tc(`paiement.${m.moyen}`)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ===== ACTIVITÉ RÉCENTE (4) ===== */}
        <section className="ax-card ax-col--4" role="region" aria-label={t('tableauBord.journal.titre')}>
          <div className="ax-card__header">
            <div className="ax-card__titles"><h2 className="ax-card__title">{t('tableauBord.journal.titre')}</h2></div>
            <Link className="ax-btn ax-btn--link" href="/pages/activity-log">{t('tableauBord.journal.voirTout')}</Link>
          </div>
          <div className="ax-card__body" style={{ paddingTop: 0 }}>
            <ul className="ax-timeline">
              {journal.map((e) => (
                <li
                  key={e.id}
                  className={`ax-timeline__item${e.categorie === 'financement' ? ' ax-timeline__item--success' : ''}`}
                >
                  <span className="ax-timeline__marker" style={{ color: e.acteur_teinte }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5l10 -10" /></svg>
                  </span>
                  <div className="ax-timeline__content">
                    <p className="ax-timeline__title">
                      <b style={{ color: 'var(--ax-text-strong)' }}>{e.acteur}</b>{' '}
                      {e.action}{' '}
                      <span style={{ color: 'var(--ax-accent)' }}>{e.cible}</span>
                    </p>
                    <span className="ax-timeline__time">{formaterDepuis(e.horodatage, DATE_REFERENCE)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </>
  );
}

function LigneMouvement({
  mouvement,
  statut,
  moyen,
}: {
  mouvement: MouvementFinancier;
  statut: string;
  moyen: string;
}) {
  const entrant = mouvement.montant_fcfa >= 0;
  const teinte = entrant ? 'var(--ax-viz-emerald)' : 'var(--ax-viz-amber)';
  const tonalite =
    mouvement.statut === 'valide' ? 'success' : mouvement.statut === 'en_attente' ? 'warning' : 'danger';

  return (
    <tr className="ax-table__row">
      <td className="ax-table__td">
        <div className="ax-cluster" style={{ gap: 'var(--ax-space-3)', flexWrap: 'nowrap' }}>
          <span className="ax-avatar ax-avatar--sm ax-avatar--squircle" style={{ background: `color-mix(in oklab,${teinte} 18%,transparent)`, color: teinte }}>
            <svg className="ax-avatar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v18" /><path d="M17 8a4 4 0 0 0 -4 -3h-2a3.5 3.5 0 0 0 0 7h2a3.5 3.5 0 0 1 0 7h-2a4 4 0 0 1 -4 -3" /></svg>
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="ax-text-truncate" style={{ fontWeight: 'var(--ax-weight-medium)', color: 'var(--ax-text-strong)' }}>{mouvement.contrepartie}</div>
            <div style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>{moyen}</div>
          </div>
        </div>
      </td>
      <td className="ax-table__td" style={{ color: 'var(--ax-text-muted)' }}>{mouvement.categorie}</td>
      <td className="ax-table__td ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-text-muted)', whiteSpace: 'nowrap' }}>
        {formaterDate(mouvement.date)}
      </td>
      <td className="ax-table__td ax-table__td--num" style={{ color: entrant ? 'var(--ax-viz-emerald)' : 'var(--ax-text)', whiteSpace: 'nowrap' }}>
        {/* Le signe est porté par le libellé, pas seulement par la couleur : un
            écran en niveaux de gris, ou un daltonien, doit lire le sens du flux. */}
        {entrant ? '+' : '−'}
        {formaterFcfa(Math.abs(mouvement.montant_fcfa))}
      </td>
      <td className="ax-table__td">
        <span className={`ax-badge ax-badge--soft ax-badge--${tonalite} ax-badge--pill`}>
          <span className="ax-badge__dot" />
          {statut}
        </span>
      </td>
    </tr>
  );
}

export default TableauDeBordGeneral;
