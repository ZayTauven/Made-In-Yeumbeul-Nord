'use client';
/*
 * Annuaire des groupements — route « crm/companies ».
 *
 * Adapté de l'écran « CRM · Companies » de Vireo : sous-navigation, rangée
 * d'indicateurs, table triable ou grille de cartes au choix, sélection multiple,
 * menu d'actions de ligne, état vide, pagination et modale de création.
 *
 * C'est l'écran que la plateforme doit à son nom : les cent groupements de
 * Yeumbeul Nord, avec ce que la coordination a besoin de lire d'un coup d'œil —
 * la filière, le quartier, l'effectif, l'étape d'accompagnement et l'état de
 * validation de la fiche.
 *
 * Le filtrage vit en état local sur les cent lignes reçues en props. Le jour où
 * la commune en recensera mille, `listerGroupements()` accepte déjà `page`,
 * `recherche`, `filiere`, `quartier`, `etape` et `tri` : le filtrage repassera
 * côté serveur sans que la forme de l'écran change.
 */
import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHead } from '../../components/shell/PageHead';
import { Pagination } from '../../components/table/Pagination';
import { formaterFcfaCompact, formaterNombre, initiales } from '../../domaine';
import type { EtapeAccompagnement, EtatValidation, Groupement, Kpi } from '../../domaine';
import { SousNavigationGroupements } from './SousNavigation';

type Tri = 'nom' | 'membres' | 'progression' | 'chiffre_affaires';

const ETAPES: readonly EtapeAccompagnement[] = [
  'identifie',
  'forme',
  'certifie',
  'formalise',
  'equipe',
  'en_production',
  'autonome',
] as const;

/* Une étape franchie se lit à sa couleur : le vert n'est atteint qu'à la fin du
   parcours, ce qui rend l'avancement lisible en balayant la colonne. */
const TONALITE_ETAPE: Record<EtapeAccompagnement, string> = {
  identifie: 'neutral',
  forme: 'info',
  certifie: 'info',
  formalise: 'accent',
  equipe: 'accent',
  en_production: 'success',
  autonome: 'success',
};

const TONALITE_VALIDATION: Record<EtatValidation, string> = {
  brouillon: 'neutral',
  soumis: 'warning',
  valide: 'success',
  rejete: 'danger',
};

const ICONES_KPI: Record<string, ReactElement> = {
  groupements: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M8 21v-1a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v1" /><path d="M15 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M17 10h2a2 2 0 0 1 2 2v1" /><path d="M5 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M3 13v-1a2 2 0 0 1 2 -2h2" /></svg>,
  membres: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /><path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /><path d="M21 21v-2a4 4 0 0 0 -3 -3.85" /></svg>,
  part_femmes: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 9a5 5 0 1 0 10 0a5 5 0 0 0 -10 0" /><path d="M13 14v7" /><path d="M10 18h6" /></svg>,
  en_production: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 21h18" /><path d="M5 21v-14l8 -4v18" /><path d="M19 21v-10l-6 -4" /><path d="M9 9v.01" /><path d="M9 12v.01" /><path d="M9 15v.01" /></svg>,
};

const CLASSES_PASTILLE = ['c1', 'c2', 'c3', 'c4'];
const PAR_PAGE = 10;

function Chevron({ actif, sens }: { actif: boolean; sens: 'asc' | 'desc' }): ReactElement {
  if (!actif) {
    return (
      <svg className="ax-table__sort" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ opacity: 0.4 }}><path d="M8 9l4 -4l4 4" /><path d="M16 15l-4 4l-4 -4" /></svg>
    );
  }
  return sens === 'asc' ? (
    <svg className="ax-table__sort" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 15l6 -6l6 6" /></svg>
  ) : (
    <svg className="ax-table__sort" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6l6 -6" /></svg>
  );
}

export interface DonneesAnnuaire {
  groupements: Groupement[];
  kpis: Kpi[];
  filieres: Array<{ slug: string; nom: string; teinte: string }>;
  quartiers: Array<{ slug: string; nom: string }>;
}

export function Annuaire({ donnees }: { donnees: DonneesAnnuaire }) {
  const t = useTranslations('ecrans');
  const tc = useTranslations('commun');

  const [recherche, setRecherche] = useState('');
  const [filiere, setFiliere] = useState('');
  const [quartier, setQuartier] = useState('');
  const [etape, setEtape] = useState('');
  const [vue, setVue] = useState<'table' | 'cartes'>('table');
  const [tri, setTri] = useState<Tri>('nom');
  const [sens, setSens] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState<number[]>([]);
  const [menu, setMenu] = useState<{ id: number; x: number; y: number } | null>(null);
  const [creation, setCreation] = useState(false);

  const teinteFiliere = useMemo(
    () => new Map(donnees.filieres.map((f) => [f.slug, f.teinte])),
    [donnees.filieres],
  );

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    const liste = donnees.groupements.filter((g) => {
      if (filiere && g.filiere.slug !== filiere) return false;
      if (quartier && g.quartier.slug !== quartier) return false;
      if (etape && g.etape !== etape) return false;
      if (q && !`${g.nom} ${g.responsable} ${g.quartier.nom} ${g.filiere.nom}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });

    const facteur = sens === 'asc' ? 1 : -1;
    const comparateurs: Record<Tri, (a: Groupement, b: Groupement) => number> = {
      nom: (a, b) => a.nom.localeCompare(b.nom, 'fr'),
      membres: (a, b) => a.nombre_membres - b.nombre_membres,
      progression: (a, b) => a.progression - b.progression,
      chiffre_affaires: (a, b) => a.chiffre_affaires_fcfa - b.chiffre_affaires_fcfa,
    };
    return [...liste].sort((a, b) => comparateurs[tri](a, b) * facteur);
  }, [donnees.groupements, recherche, filiere, quartier, etape, tri, sens]);

  const pages = Math.max(1, Math.ceil(filtres.length / PAR_PAGE));
  const pageSure = Math.min(page, pages);
  const debut = (pageSure - 1) * PAR_PAGE;
  const affiches = filtres.slice(debut, debut + PAR_PAGE);

  const idsPage = affiches.map((g) => g.id);
  const toutSelectionne = idsPage.length > 0 && idsPage.every((id) => selection.includes(id));
  const partiellement = idsPage.some((id) => selection.includes(id)) && !toutSelectionne;

  const changerFiltre = (poser: () => void) => {
    poser();
    setPage(1);
  };
  const reinitialiser = () =>
    changerFiltre(() => {
      setRecherche('');
      setFiliere('');
      setQuartier('');
      setEtape('');
    });

  const trierPar = (cle: Tri) => {
    if (tri === cle) setSens((s) => (s === 'asc' ? 'desc' : 'asc'));
    else {
      setTri(cle);
      setSens(cle === 'nom' ? 'asc' : 'desc');
    }
    setPage(1);
  };
  const ariaTri = (cle: Tri): 'ascending' | 'descending' | 'none' =>
    tri === cle ? (sens === 'asc' ? 'ascending' : 'descending') : 'none';

  const ouvrirMenu = (id: number, e: React.MouseEvent<HTMLButtonElement>) => {
    if (menu?.id === id) {
      setMenu(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const racine = document.documentElement;
    const rtl = racine.getAttribute('dir') === 'rtl';
    setMenu({ id, x: Math.max(8, rtl ? rect.left : racine.clientWidth - rect.right), y: rect.bottom + 4 });
  };

  return (
    <>
      <PageHead
        title={t('groupements.titre')}
        subtitle={t('groupements.sousTitre', {
          nombre: donnees.groupements.length,
          membres: formaterNombre(donnees.groupements.reduce((s, g) => s + g.nombre_membres, 0)),
        })}
        actions={
          <>
            <button type="button" className="ax-btn ax-btn--secondary ax-btn--pill">
              <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 11l5 5l5 -5" /><path d="M12 4l0 12" /></svg>
              <span className="ax-btn__label">{tc('actions.exporter')}</span>
            </button>
            <button type="button" className="ax-btn ax-btn--primary" onClick={() => setCreation(true)}>
              <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5l0 14" /><path d="M5 12l14 0" /></svg>
              <span className="ax-btn__label">{t('groupements.recenser')}</span>
            </button>
          </>
        }
      />

      <SousNavigationGroupements actif="crm/companies" />

      {/* ===== INDICATEURS ===== */}
      <div className="ax-dash-grid" style={{ marginBottom: 'var(--ax-space-6)' }}>
        {donnees.kpis.map((k, i) => (
          <div key={k.cle} className="ax-card ax-kpi ax-col--3" role="region" aria-label={`${k.libelle} : ${k.valeur_affichee}`}>
            <div className="ax-card__body">
              <div className="ax-kpi__top">
                <span className={`ax-kpi__icon ax-kpi__icon--${CLASSES_PASTILLE[i % 4]}`}>
                  {ICONES_KPI[k.cle] ?? ICONES_KPI.groupements}
                </span>
                <span className={`ax-kpi__delta ax-kpi__delta--${k.tendance === 'baisse' ? 'down' : 'up'}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={k.tendance === 'baisse' ? 'M6 9l6 6l6 -6' : 'M6 15l6 -6l6 6'} />
                  </svg>
                  {`${Math.abs(k.delta).toFixed(1).replace('.', ',')} %`}
                </span>
              </div>
              <div className="ax-kpi__label">{k.libelle}</div>
              <div className="ax-kpi__value ax-num">{k.valeur_affichee}</div>
              {k.cible !== undefined && (
                <div className="ax-progress ax-progress--xs" style={{ marginTop: 10 }}>
                  <div className="ax-progress__track">
                    <div className="ax-progress__fill" style={{ width: `${Math.min(100, Math.round((k.valeur / k.cible) * 100))}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ===== LISTE ===== */}
      <div className="ax-dash-grid">
        <section className="ax-card ax-col--12" role="region" aria-label={t('groupements.listeTitre')}>
          <div className="ax-card__header" style={{ flexWrap: 'wrap', gap: 'var(--ax-space-3)' }}>
            <div className="ax-card__titles">
              <h2 className="ax-card__title">{t('groupements.listeTitre')}</h2>
              <p className="ax-card__subtitle ax-num" style={{ fontFamily: 'var(--ax-font-mono)' }}>
                {tc('table.pagination', {
                  debut: filtres.length === 0 ? 0 : debut + 1,
                  fin: debut + affiches.length,
                  total: filtres.length,
                })}
              </p>
            </div>
            <div className="ax-card__actions" style={{ flex: '1 1 auto', flexWrap: 'wrap', gap: 'var(--ax-space-2)', minWidth: 0 }}>
              <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 300 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ position: 'absolute', insetInlineStart: 11, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: 'var(--ax-text-subtle)' }}><path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" /></svg>
                <input
                  type="search"
                  className="ax-input ax-input--sm"
                  placeholder={t('groupements.rechercher')}
                  value={recherche}
                  onChange={(e) => changerFiltre(() => setRecherche(e.target.value))}
                  style={{ paddingInlineStart: 34 }}
                  aria-label={t('groupements.rechercher')}
                />
              </div>
              <select
                className="ax-select ax-select--sm"
                value={filiere}
                onChange={(e) => changerFiltre(() => setFiliere(e.target.value))}
                aria-label={tc('filtres.toutesLesFilieres')}
                style={{ minWidth: 160 }}
              >
                <option value="">{tc('filtres.toutesLesFilieres')}</option>
                {donnees.filieres.map((f) => (
                  <option key={f.slug} value={f.slug}>{f.nom}</option>
                ))}
              </select>
              <select
                className="ax-select ax-select--sm"
                value={quartier}
                onChange={(e) => changerFiltre(() => setQuartier(e.target.value))}
                aria-label={tc('filtres.tousLesQuartiers')}
                style={{ minWidth: 160 }}
              >
                <option value="">{tc('filtres.tousLesQuartiers')}</option>
                {donnees.quartiers.map((q) => (
                  <option key={q.slug} value={q.slug}>{q.nom}</option>
                ))}
              </select>
              <select
                className="ax-select ax-select--sm"
                value={etape}
                onChange={(e) => changerFiltre(() => setEtape(e.target.value))}
                aria-label={tc('filtres.toutesLesEtapes')}
                style={{ minWidth: 150 }}
              >
                <option value="">{tc('filtres.toutesLesEtapes')}</option>
                {ETAPES.map((e) => (
                  <option key={e} value={e}>{tc(`etapes.${e}`)}</option>
                ))}
              </select>
              <div className="ax-segment" role="group" aria-label={t('groupements.modeAffichage')} style={{ marginInlineStart: 'auto' }}>
                <button
                  type="button"
                  className={`ax-segment__option ax-btn--icon${vue === 'table' ? ' is-active' : ''}`}
                  aria-checked={vue === 'table'}
                  onClick={() => setVue('table')}
                  aria-label={t('groupements.vueTable')}
                >
                  <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l11 0" /><path d="M9 12l11 0" /><path d="M9 18l11 0" /><path d="M5 6l0 .01" /><path d="M5 12l0 .01" /><path d="M5 18l0 .01" /></svg>
                </button>
                <button
                  type="button"
                  className={`ax-segment__option ax-btn--icon${vue === 'cartes' ? ' is-active' : ''}`}
                  aria-checked={vue === 'cartes'}
                  onClick={() => setVue('cartes')}
                  aria-label={t('groupements.vueCartes')}
                >
                  <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4h6v6h-6z" /><path d="M14 4h6v6h-6z" /><path d="M4 14h6v6h-6z" /><path d="M14 14h6v6h-6z" /></svg>
                </button>
              </div>
            </div>
          </div>

          {/* Actions groupées */}
          {selection.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ax-space-3)', margin: '0 var(--ax-space-5) var(--ax-space-3)', padding: 'var(--ax-space-2) var(--ax-space-4)', background: 'var(--ax-accent-wash)', border: '1px solid var(--ax-accent)', borderRadius: 'var(--ax-radius-md)', flexWrap: 'wrap' }}>
              <b className="ax-num" style={{ color: 'var(--ax-accent)', fontSize: 'var(--ax-text-sm)' }}>
                {tc('table.lignesSelectionnees', { nombre: selection.length })}
              </b>
              <span style={{ width: 1, height: 18, background: 'var(--ax-border-strong)' }} />
              <button type="button" className="ax-btn ax-btn--ghost ax-btn--sm">{t('groupements.actions.changerEtape')}</button>
              <button type="button" className="ax-btn ax-btn--ghost ax-btn--sm">{t('groupements.actions.affecterAgent')}</button>
              <button type="button" className="ax-btn ax-btn--ghost ax-btn--sm">{tc('actions.exporter')}</button>
              <span style={{ flex: '1 1 auto' }} />
              <button
                type="button"
                className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm"
                aria-label={t('groupements.actions.viderSelection')}
                onClick={() => setSelection([])}
              >
                <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
              </button>
            </div>
          )}

          {/* Vue table */}
          {vue === 'table' && affiches.length > 0 && (
            <div className="ax-table-wrap">
              <table className="ax-table ax-table--hover" style={{ minWidth: 960 }}>
                <caption className="ax-visually-hidden">{t('groupements.legendeTable')}</caption>
                <thead className="ax-table__head">
                  <tr>
                    <th className="ax-table__th" scope="col" style={{ width: 38 }}>
                      <input
                        type="checkbox"
                        className="ax-checkbox"
                        aria-label={t('groupements.selectionnerPage')}
                        checked={toutSelectionne}
                        ref={(el) => {
                          if (el) el.indeterminate = partiellement;
                        }}
                        onChange={(e) =>
                          setSelection((s) =>
                            e.target.checked
                              ? [...new Set([...s, ...idsPage])]
                              : s.filter((id) => !idsPage.includes(id)),
                          )
                        }
                      />
                    </th>
                    <th className="ax-table__th ax-table__th--sortable" scope="col" aria-sort={ariaTri('nom')} onClick={() => trierPar('nom')}>
                      {t('groupements.colonneGroupement')} <Chevron actif={tri === 'nom'} sens={sens} />
                    </th>
                    <th className="ax-table__th" scope="col">{t('groupements.colonneFiliere')}</th>
                    <th className="ax-table__th" scope="col">{t('groupements.colonneQuartier')}</th>
                    <th className="ax-table__th ax-table__th--sortable ax-table__th--num" scope="col" aria-sort={ariaTri('membres')} onClick={() => trierPar('membres')}>
                      {t('groupements.colonneMembres')} <Chevron actif={tri === 'membres'} sens={sens} />
                    </th>
                    <th className="ax-table__th ax-table__th--sortable" scope="col" aria-sort={ariaTri('progression')} onClick={() => trierPar('progression')}>
                      {t('groupements.colonneParcours')} <Chevron actif={tri === 'progression'} sens={sens} />
                    </th>
                    <th className="ax-table__th ax-table__th--sortable ax-table__th--num" scope="col" aria-sort={ariaTri('chiffre_affaires')} onClick={() => trierPar('chiffre_affaires')}>
                      {t('groupements.colonneChiffreAffaires')} <Chevron actif={tri === 'chiffre_affaires'} sens={sens} />
                    </th>
                    <th className="ax-table__th" scope="col">{t('groupements.colonneValidation')}</th>
                    <th className="ax-table__th" scope="col" style={{ width: 44 }}>
                      <span className="ax-visually-hidden">{t('groupements.actionsLigne')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {affiches.map((g) => {
                    const teinte = teinteFiliere.get(g.filiere.slug) ?? 'var(--ax-accent)';
                    return (
                      <tr key={g.id} className="ax-table__row" style={selection.includes(g.id) ? { background: 'var(--ax-accent-wash)' } : undefined}>
                        <td className="ax-table__td">
                          <input
                            type="checkbox"
                            className="ax-checkbox"
                            checked={selection.includes(g.id)}
                            onChange={() =>
                              setSelection((s) => (s.includes(g.id) ? s.filter((x) => x !== g.id) : [...s, g.id]))
                            }
                            aria-label={t('groupements.selectionner', { nom: g.nom })}
                          />
                        </td>
                        <td className="ax-table__td">
                          <div className="ax-cluster" style={{ gap: 'var(--ax-space-3)', flexWrap: 'nowrap' }}>
                            {/* Avatar à initiales : un groupement n'a pas de visage, et
                                aucune photo du corpus ne doit lui en tenir lieu. */}
                            <span className="ax-avatar ax-avatar--sm ax-avatar--squircle" style={{ background: `color-mix(in oklab,${teinte} 18%,transparent)`, color: teinte, fontWeight: 700 }}>
                              <span>{initiales(g.nom)}</span>
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <Link
                                href={`/ecommerce/customer-details?groupement=${g.slug}`}
                                className="ax-text-truncate"
                                style={{ display: 'block', fontWeight: 'var(--ax-weight-medium)', color: 'var(--ax-text-strong)', textDecoration: 'none' }}
                              >
                                {g.nom}
                              </Link>
                              <div style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>{g.responsable}</div>
                            </div>
                          </div>
                        </td>
                        <td className="ax-table__td">
                          <span className="ax-badge ax-badge--soft ax-badge--neutral ax-badge--sm">{g.filiere.nom}</span>
                        </td>
                        <td className="ax-table__td" style={{ color: 'var(--ax-text-muted)' }}>{g.quartier.nom}</td>
                        <td className="ax-table__td ax-table__td--num ax-num" style={{ fontFamily: 'var(--ax-font-mono)' }}>
                          {g.nombre_membres}
                          <div style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>
                            {t('groupements.partFemmes', { part: g.part_femmes })}
                          </div>
                        </td>
                        <td className="ax-table__td">
                          <div className="ax-cluster" style={{ gap: 'var(--ax-space-3)', flexWrap: 'nowrap' }}>
                            <div className="ax-progress ax-progress--sm" style={{ minWidth: 72 }}>
                              <div className="ax-progress__track">
                                <div className="ax-progress__fill" style={{ width: `${g.progression}%`, background: teinte }} />
                              </div>
                            </div>
                            <span className={`ax-badge ax-badge--soft ax-badge--pill ax-badge--sm ax-badge--${TONALITE_ETAPE[g.etape]}`}>
                              {tc(`etapes.${g.etape}`)}
                            </span>
                          </div>
                        </td>
                        <td className="ax-table__td ax-table__td--num ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-text-strong)', fontWeight: 'var(--ax-weight-semibold)', whiteSpace: 'nowrap' }}>
                          {formaterFcfaCompact(g.chiffre_affaires_fcfa)}
                        </td>
                        <td className="ax-table__td">
                          <span className={`ax-badge ax-badge--soft ax-badge--pill ax-badge--sm ax-badge--${TONALITE_VALIDATION[g.etat_validation]}`}>
                            <span className="ax-badge__dot" />
                            {tc(`validation.etats.${g.etat_validation}`)}
                          </span>
                        </td>
                        <td className="ax-table__td" style={{ textAlign: 'end' }}>
                          <button
                            type="button"
                            className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm"
                            onClick={(e) => ouvrirMenu(g.id, e)}
                            aria-expanded={menu?.id === g.id}
                            aria-haspopup="menu"
                            aria-label={t('groupements.actionsLigne')}
                          >
                            <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M17 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /></svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Vue cartes */}
          {vue === 'cartes' && affiches.length > 0 && (
            <div className="ax-card__body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 'var(--ax-space-5)' }}>
              {affiches.map((g) => {
                const teinte = teinteFiliere.get(g.filiere.slug) ?? 'var(--ax-accent)';
                return (
                  <article key={g.id} className="ax-card ax-card--interactive" style={{ margin: 0 }}>
                    <div className="ax-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-4)' }}>
                      <div className="ax-cluster" style={{ gap: 'var(--ax-space-3)', flexWrap: 'nowrap', justifyContent: 'space-between' }}>
                        <div className="ax-cluster" style={{ gap: 'var(--ax-space-3)', flexWrap: 'nowrap', minWidth: 0 }}>
                          <span className="ax-avatar ax-avatar--lg ax-avatar--squircle" style={{ background: `color-mix(in oklab,${teinte} 18%,transparent)`, color: teinte, fontWeight: 700 }}>
                            <b style={{ fontSize: 'var(--ax-text-md)' }}>{initiales(g.nom)}</b>
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div className="ax-text-truncate" style={{ fontWeight: 600, color: 'var(--ax-text-strong)' }}>{g.nom}</div>
                            <div className="ax-text-truncate" style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>{g.responsable}</div>
                          </div>
                        </div>
                        <span className={`ax-badge ax-badge--soft ax-badge--pill ax-badge--sm ax-badge--${TONALITE_ETAPE[g.etape]}`}>
                          {tc(`etapes.${g.etape}`)}
                        </span>
                      </div>
                      <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)' }}>
                        <span className="ax-badge ax-badge--soft ax-badge--neutral ax-badge--sm">{g.filiere.nom}</span>
                        <span className="ax-badge ax-badge--soft ax-badge--neutral ax-badge--sm">{g.quartier.nom}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--ax-space-3)', paddingTop: 'var(--ax-space-1)', borderTop: '1px solid var(--ax-border)' }}>
                        <div>
                          <small style={{ display: 'block', color: 'var(--ax-text-subtle)', fontSize: 'var(--ax-text-2xs)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                            {t('groupements.colonneMembres')}
                          </small>
                          <b className="ax-num" style={{ color: 'var(--ax-text-strong)' }}>{g.nombre_membres}</b>
                        </div>
                        <div>
                          <small style={{ display: 'block', color: 'var(--ax-text-subtle)', fontSize: 'var(--ax-text-2xs)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                            {t('groupements.colonneChiffreAffaires')}
                          </small>
                          <b className="ax-num" style={{ color: 'var(--ax-text-strong)' }}>{formaterFcfaCompact(g.chiffre_affaires_fcfa)}</b>
                        </div>
                      </div>
                      <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)', justifyContent: 'space-between' }}>
                        <span className={`ax-badge ax-badge--soft ax-badge--pill ax-badge--sm ax-badge--${TONALITE_VALIDATION[g.etat_validation]}`}>
                          <span className="ax-badge__dot" />
                          {tc(`validation.etats.${g.etat_validation}`)}
                        </span>
                        <Link className="ax-btn ax-btn--link ax-btn--sm" href={`/ecommerce/customer-details?groupement=${g.slug}`}>
                          {tc('actions.voirLaFiche')} →
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* État vide */}
          {affiches.length === 0 && (
            <div style={{ textAlign: 'center', padding: 'var(--ax-space-10) var(--ax-space-5)' }}>
              <span className="ax-avatar ax-avatar--xl ax-avatar--squircle" style={{ background: 'var(--ax-surface-subtle)', color: 'var(--ax-text-subtle)', margin: '0 auto var(--ax-space-4)' }}>
                <svg className="ax-avatar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 28, height: 28 }}><path d="M10 13a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M8 21v-1a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v1" /><path d="M15 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M5 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /></svg>
              </span>
              <h3 style={{ color: 'var(--ax-text-strong)', fontFamily: 'var(--ax-font-display)', marginBottom: 'var(--ax-space-2)' }}>
                {tc('table.aucunResultat')}
              </h3>
              <p style={{ color: 'var(--ax-text-muted)', fontSize: 'var(--ax-text-sm)', marginBottom: 'var(--ax-space-4)' }}>
                {tc('table.aucunResultatIndice')}
              </p>
              <button type="button" className="ax-btn ax-btn--secondary" onClick={reinitialiser}>
                {tc('actions.reinitialiser')}
              </button>
            </div>
          )}

          {affiches.length > 0 && (
            <div className="ax-card__footer ax-flex" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--ax-space-3)' }}>
              <span className="ax-pagination__summary ax-num" style={{ fontFamily: 'var(--ax-font-mono)', fontSize: 'var(--ax-text-xs)' }}>
                {tc('table.pagination', { debut: debut + 1, fin: debut + affiches.length, total: filtres.length })}
              </span>
              <Pagination
                courante={pageSure}
                total={pages}
                onChanger={setPage}
                etiquettes={{
                  navigation: t('groupements.pagination'),
                  precedente: t('groupements.pagePrecedente'),
                  suivante: t('groupements.pageSuivante'),
                  page: (numero) => t('groupements.allerPage', { numero }),
                }}
              />
            </div>
          )}
        </section>
      </div>

      {/* ===== MENU D'ACTIONS DE LIGNE ===== */}
      {menu !== null && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            style={{ position: 'fixed', inset: 0, zIndex: 59, background: 'transparent', border: 0, cursor: 'default' }}
            onClick={() => setMenu(null)}
          />
          <div className="ax-menu" role="menu" style={{ position: 'fixed', top: menu.y, insetInlineEnd: menu.x, zIndex: 60, minWidth: 190 }}>
            <button type="button" className="ax-menu__item" role="menuitem" onClick={() => setMenu(null)}>
              <svg className="ax-menu__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6" /></svg>
              {tc('actions.voirLaFiche')}
            </button>
            <button type="button" className="ax-menu__item" role="menuitem" onClick={() => setMenu(null)}>
              <svg className="ax-menu__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4" /><path d="M13.5 6.5l4 4" /></svg>
              {tc('actions.modifier')}
            </button>
            <button type="button" className="ax-menu__item" role="menuitem" onClick={() => setMenu(null)}>
              <svg className="ax-menu__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5l10 -10" /></svg>
              {t('groupements.actions.changerEtape')}
            </button>
            <div className="ax-menu__divider" role="separator" />
            <button type="button" className="ax-menu__item" role="menuitem" onClick={() => setMenu(null)}>
              <svg className="ax-menu__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 11l5 5l5 -5" /><path d="M12 4l0 12" /></svg>
              {t('groupements.actions.exporterFiche')}
            </button>
          </div>
        </>
      )}

      {/* ===== MODALE DE RECENSEMENT ===== */}
      {creation && (
        <div onKeyDown={(e) => { if (e.key === 'Escape') setCreation(false); }}>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            className="ax-backdrop"
            onClick={() => setCreation(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.4)', border: 0 }}
          />
          <div className="ax-flex" role="dialog" aria-modal="true" aria-label={t('groupements.recenser')} style={{ position: 'fixed', inset: 0, zIndex: 51, alignItems: 'center', justifyContent: 'center', padding: 'var(--ax-space-4)' }}>
            <form
              className="ax-card"
              onSubmit={(e) => {
                e.preventDefault();
                setCreation(false);
              }}
              style={{ width: 'min(520px,100%)', maxHeight: '90vh', overflow: 'auto' }}
            >
              <div className="ax-card__header">
                <div className="ax-card__titles"><h2 className="ax-card__title">{t('groupements.recenser')}</h2></div>
                <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" onClick={() => setCreation(false)} aria-label={tc('actions.fermer')}>
                  <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="ax-card__body" style={{ paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-4)' }}>
                <div className="ax-field">
                  <label className="ax-label" htmlFor="grp-nom">{t('groupements.formulaire.nom')}</label>
                  <input id="grp-nom" type="text" className="ax-input" placeholder={t('groupements.formulaire.nomExemple')} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--ax-space-4)' }}>
                  <div className="ax-field">
                    <label className="ax-label" htmlFor="grp-filiere">{t('groupements.colonneFiliere')}</label>
                    <select id="grp-filiere" className="ax-select">
                      {donnees.filieres.map((f) => (
                        <option key={f.slug} value={f.slug}>{f.nom}</option>
                      ))}
                    </select>
                  </div>
                  <div className="ax-field">
                    <label className="ax-label" htmlFor="grp-quartier">{t('groupements.colonneQuartier')}</label>
                    <select id="grp-quartier" className="ax-select">
                      {donnees.quartiers.map((q) => (
                        <option key={q.slug} value={q.slug}>{q.nom}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--ax-space-4)' }}>
                  <div className="ax-field">
                    <label className="ax-label" htmlFor="grp-responsable">{t('groupements.formulaire.responsable')}</label>
                    <input id="grp-responsable" type="text" className="ax-input" placeholder={t('groupements.formulaire.responsableExemple')} />
                  </div>
                  <div className="ax-field">
                    <label className="ax-label" htmlFor="grp-membres">{t('groupements.colonneMembres')}</label>
                    <input id="grp-membres" type="number" min={1} className="ax-input" placeholder="18" />
                  </div>
                </div>
                <div className="ax-field">
                  <label className="ax-label" htmlFor="grp-telephone">{t('groupements.formulaire.telephone')}</label>
                  <input id="grp-telephone" type="tel" className="ax-input" placeholder="+221 77 000 00 00" />
                </div>
                <p style={{ margin: 0, fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>
                  {t('groupements.formulaire.mention')}
                </p>
              </div>
              <div className="ax-card__footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--ax-space-2)', borderTop: '1px solid var(--ax-border)' }}>
                <button type="button" className="ax-btn ax-btn--ghost" onClick={() => setCreation(false)}>{tc('actions.annuler')}</button>
                <button type="submit" className="ax-btn ax-btn--primary">{t('groupements.formulaire.creer')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default Annuaire;
