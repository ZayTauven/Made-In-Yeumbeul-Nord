'use client';
/*
 * Décaissements — route « ecommerce/invoices ».
 *
 * Adapté de l'écran « Invoices » de Vireo : bandeau de quatre indicateurs,
 * onglets de statut chiffrés, table triable avec sélection multiple, ligne de
 * totaux, état vide et pagination. Le contenu est l'appui financier du projet :
 * subventions, crédits rotatifs, dotations en équipement, fonds de roulement.
 *
 * Une facture attend un paiement ; un décaissement attend, selon son type, un
 * remboursement ou rien du tout. La colonne « Échéance » reste donc vide pour
 * une subvention — ce n'est pas une donnée manquante, c'est la nature de l'aide.
 *
 * Composant client : filtres, tri, sélection et pagination en état local.
 */
import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslations } from 'next-intl';
import { PageHead } from '../../components/shell/PageHead';
import { Pagination } from '../../components/table/Pagination';
import {
  formaterDate,
  formaterFcfa,
  formaterFcfaCompact,
  formaterNombre,
  initiales,
} from '../../domaine';
import type { Financement, TypeFinancement } from '../../domaine';

type StatutFinancement = Financement['statut'];
type Tri = 'recent' | 'montant_desc' | 'montant_asc' | 'groupement' | 'echeance';

const STATUTS: readonly StatutFinancement[] = [
  'decaisse',
  'remboursement_partiel',
  'rembourse',
  'defaillant',
] as const;

const TONALITE_STATUT: Record<StatutFinancement, string> = {
  decaisse: 'info',
  remboursement_partiel: 'warning',
  rembourse: 'success',
  defaillant: 'danger',
};

/* Le tracé de l'icône de statut, en un seul `d` — c'est la forme du template. */
const TRACE_STATUT: Record<StatutFinancement, string> = {
  decaisse: 'M12 7v5l3 3M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0',
  remboursement_partiel: 'M12 3v18M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0',
  rembourse: 'M9 12l2 2l4 -4M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0',
  defaillant:
    'M12 9v4M12 16h.01M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0',
};

/* Une teinte par type d'appui : la colonne se lit sans relire les libellés. */
const TEINTE_TYPE: Record<TypeFinancement, string> = {
  subvention: 'var(--ax-accent)',
  credit_rotatif: 'var(--ax-viz-cyan)',
  equipement: 'var(--ax-viz-violet)',
  fonds_de_roulement: 'var(--ax-viz-amber)',
};

const ICONES_KPI: Record<string, ReactElement> = {
  decaisse: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v18" /><path d="M17 8a4 4 0 0 0 -4 -3h-2a3.5 3.5 0 0 0 0 7h2a3.5 3.5 0 0 1 0 7h-2a4 4 0 0 1 -4 -3" /></svg>,
  encours: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 7v5l3 3" /><path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /></svg>,
  rembourse: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 12l2 2l4 -4" /><path d="M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3" /></svg>,
  defaillants: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 9v4" /><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0" /><path d="M12 16h.01" /></svg>,
};

const PAR_PAGE = 20;

export interface DonneesDecaissements {
  financements: Financement[];
  bailleurs: string[];
  /**
   * Date du jour, en ISO, décidée par le serveur. Sans elle le client la lirait
   * lui-même, et une échéance dépassée changerait de couleur entre le rendu
   * serveur et l'hydratation.
   */
  aujourdhui: string;
  /** Libellé métier de chaque type, servi par la source. */
  libelleType: Record<TypeFinancement, string>;
  synthese: {
    totalDecaisse: number;
    encours: number;
    totalRembourse: number;
    defaillants: number;
    tauxRemboursement: number;
  };
}

export function Decaissements({ donnees }: { donnees: DonneesDecaissements }) {
  const t = useTranslations('ecrans');
  const tc = useTranslations('commun');

  const [recherche, setRecherche] = useState('');
  const [statut, setStatut] = useState('');
  const [bailleur, setBailleur] = useState('');
  const [tri, setTri] = useState<Tri>('recent');
  const [selection, setSelection] = useState<number[]>([]);
  const [page, setPage] = useState(1);

  // Les compteurs d'onglets portent sur la liste complète et non sur la liste
  // filtrée : un onglet dont le chiffre change quand on tape dans la recherche
  // ne sert plus à naviguer.
  const compteurs = useMemo(() => {
    const parStatut = new Map<string, number>();
    for (const f of donnees.financements) {
      parStatut.set(f.statut, (parStatut.get(f.statut) ?? 0) + 1);
    }
    return parStatut;
  }, [donnees.financements]);

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    const liste = donnees.financements.filter((f) => {
      if (statut && f.statut !== statut) return false;
      if (bailleur && f.bailleur !== bailleur) return false;
      if (q && !`${f.reference} ${f.groupement_nom} ${f.objet}`.toLowerCase().includes(q)) return false;
      return true;
    });

    const comparateurs: Record<Tri, (a: Financement, b: Financement) => number> = {
      recent: (a, b) => b.date_decaissement.localeCompare(a.date_decaissement),
      montant_desc: (a, b) => b.montant_fcfa - a.montant_fcfa,
      montant_asc: (a, b) => a.montant_fcfa - b.montant_fcfa,
      groupement: (a, b) => a.groupement_nom.localeCompare(b.groupement_nom, 'fr'),
      // Sans échéance, l'appui n'est pas remboursable : il part en fin de liste.
      echeance: (a, b) =>
        (a.date_prevue_remboursement ?? '9999').localeCompare(b.date_prevue_remboursement ?? '9999'),
    };
    return [...liste].sort(comparateurs[tri]);
  }, [donnees.financements, recherche, statut, bailleur, tri]);

  const pages = Math.max(1, Math.ceil(filtres.length / PAR_PAGE));
  const pageSure = Math.min(page, pages);
  const debut = (pageSure - 1) * PAR_PAGE;
  const affiches = filtres.slice(debut, debut + PAR_PAGE);

  const totalPage = affiches.reduce((s, f) => s + f.montant_fcfa, 0);
  const rembourseePage = affiches.reduce((s, f) => s + f.montant_rembourse_fcfa, 0);

  const toutSelectionne = affiches.length > 0 && affiches.every((f) => selection.includes(f.id));
  const basculerTout = (actif: boolean) =>
    setSelection(actif ? affiches.map((f) => f.id) : []);
  const basculer = (id: number) =>
    setSelection((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const changerFiltre = (poser: () => void) => {
    poser();
    setPage(1);
    setSelection([]);
  };
  const reinitialiser = () =>
    changerFiltre(() => {
      setRecherche('');
      setStatut('');
      setBailleur('');
    });

  return (
    <>
      <PageHead
        title={t('decaissements.titre')}
        subtitle={t('decaissements.sousTitre', {
          nombre: donnees.financements.length,
          montant: formaterFcfaCompact(donnees.synthese.totalDecaisse),
        })}
        actions={
          <>
            <button type="button" className="ax-btn ax-btn--ghost">
              <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 11l5 5l5 -5" /><path d="M12 4l0 12" /></svg>
              <span className="ax-btn__label">{tc('actions.exporter')}</span>
            </button>
            <a className="ax-btn ax-btn--primary" href="/ecommerce/create-invoice">
              <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5l0 14" /><path d="M5 12l14 0" /></svg>
              <span className="ax-btn__label">{t('decaissements.enregistrer')}</span>
            </a>
          </>
        }
      />

      <div className="ax-dash-grid">
        {/* ===== BANDEAU ===== */}
        <CarteChiffre
          cle="decaisse"
          libelle={t('decaissements.synthese.decaisse')}
          valeur={formaterFcfaCompact(donnees.synthese.totalDecaisse)}
          pastille="c1"
        />
        <CarteChiffre
          cle="encours"
          libelle={t('decaissements.synthese.encours')}
          valeur={formaterFcfaCompact(donnees.synthese.encours)}
          pastille="c3"
        />
        <CarteChiffre
          cle="rembourse"
          libelle={t('decaissements.synthese.rembourse')}
          valeur={formaterFcfaCompact(donnees.synthese.totalRembourse)}
          pastille="c2"
          note={t('decaissements.synthese.tauxRemboursement', {
            taux: donnees.synthese.tauxRemboursement,
          })}
        />
        <CarteChiffre
          cle="defaillants"
          libelle={t('decaissements.synthese.defaillants')}
          valeur={formaterNombre(donnees.synthese.defaillants)}
          pastille="c4"
          teinte={donnees.synthese.defaillants > 0 ? 'var(--ax-danger-500)' : undefined}
        />

        {/* ===== TABLE ===== */}
        <section className="ax-card ax-col--12" role="region" aria-label={t('decaissements.tableTitre')}>
          {/* Onglets de statut */}
          <div className="ax-card__header" style={{ paddingBottom: 0, border: 0 }}>
            <div className="ax-cluster" style={{ gap: 'var(--ax-space-1)', flexWrap: 'wrap' }}>
              {['', ...STATUTS].map((s) => (
                <button
                  key={s || 'tous'}
                  type="button"
                  className="ax-btn ax-btn--ghost ax-btn--sm"
                  onClick={() => changerFiltre(() => setStatut(s))}
                  style={
                    statut === s
                      ? { boxShadow: 'inset 0 -2px 0 var(--ax-accent)', color: 'var(--ax-accent)', borderRadius: 0 }
                      : { borderRadius: 0 }
                  }
                >
                  <span>{s === '' ? t('decaissements.statuts.tous') : t(`decaissements.statuts.${s}`)}</span>
                  <span className="ax-badge ax-badge--soft ax-badge--neutral ax-badge--sm ax-num" style={{ marginInlineStart: 6 }}>
                    {s === '' ? donnees.financements.length : (compteurs.get(s) ?? 0)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Barre d'outils */}
          <div className="ax-card__header" style={{ flexWrap: 'wrap', gap: 'var(--ax-space-3)', borderTop: '1px solid var(--ax-border)' }}>
            <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 340 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ position: 'absolute', insetInlineStart: 11, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: 'var(--ax-text-subtle)' }}><path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" /></svg>
              <input
                type="search"
                className="ax-input"
                placeholder={t('decaissements.rechercher')}
                value={recherche}
                onChange={(e) => changerFiltre(() => setRecherche(e.target.value))}
                style={{ paddingInlineStart: 36 }}
                aria-label={t('decaissements.rechercher')}
              />
            </div>
            <div className="ax-card__actions" style={{ flexWrap: 'wrap', gap: 'var(--ax-space-2)' }}>
              <select
                className="ax-select ax-select--sm"
                value={bailleur}
                onChange={(e) => changerFiltre(() => setBailleur(e.target.value))}
                aria-label={t('decaissements.filtrerBailleur')}
                style={{ minWidth: 190 }}
              >
                <option value="">{t('decaissements.tousBailleurs')}</option>
                {donnees.bailleurs.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <select
                className="ax-select ax-select--sm"
                value={tri}
                onChange={(e) => setTri(e.target.value as Tri)}
                aria-label={tc('table.trier')}
                style={{ minWidth: 170 }}
              >
                <option value="recent">{t('decaissements.tri.recent')}</option>
                <option value="echeance">{t('decaissements.tri.echeance')}</option>
                <option value="montant_desc">{t('decaissements.tri.montantDesc')}</option>
                <option value="montant_asc">{t('decaissements.tri.montantAsc')}</option>
                <option value="groupement">{t('decaissements.tri.groupement')}</option>
              </select>
            </div>
          </div>

          {/* Barre d'actions groupées */}
          {selection.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ax-space-3)', margin: 'var(--ax-space-4) var(--ax-space-5) 0', padding: 'var(--ax-space-2) var(--ax-space-4)', background: 'var(--ax-accent-wash)', border: '1px solid var(--ax-accent)', borderRadius: 'var(--ax-radius-md)', flexWrap: 'wrap' }}>
              <b className="ax-num" style={{ color: 'var(--ax-accent)', fontSize: 'var(--ax-text-sm)' }}>
                {tc('table.lignesSelectionnees', { nombre: selection.length })}
              </b>
              <span style={{ width: 1, height: 18, background: 'var(--ax-border-strong)' }} />
              <button type="button" className="ax-btn ax-btn--ghost ax-btn--sm">{t('decaissements.actions.marquerRembourse')}</button>
              <button type="button" className="ax-btn ax-btn--ghost ax-btn--sm">{t('decaissements.actions.relancer')}</button>
              <button type="button" className="ax-btn ax-btn--ghost ax-btn--sm">{t('decaissements.actions.telechargerPieces')}</button>
              <span style={{ flex: '1 1 auto' }} />
              <button
                type="button"
                className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm"
                aria-label={t('decaissements.actions.viderSelection')}
                onClick={() => setSelection([])}
              >
                <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
              </button>
            </div>
          )}

          <div className="ax-table-wrap">
            <table className="ax-table ax-table--hover">
              <thead className="ax-table__head">
                <tr>
                  <th className="ax-table__th" scope="col" style={{ width: 38 }}>
                    <input
                      type="checkbox"
                      className="ax-checkbox"
                      aria-label={t('decaissements.selectionnerTout')}
                      checked={toutSelectionne}
                      onChange={(e) => basculerTout(e.target.checked)}
                    />
                  </th>
                  <th className="ax-table__th" scope="col">{t('decaissements.colonneReference')}</th>
                  <th className="ax-table__th" scope="col">{t('decaissements.colonneGroupement')}</th>
                  <th className="ax-table__th" scope="col">{t('decaissements.colonneType')}</th>
                  <th className="ax-table__th" scope="col">{t('decaissements.colonneDate')}</th>
                  <th className="ax-table__th" scope="col">{t('decaissements.colonneEcheance')}</th>
                  <th className="ax-table__th ax-table__th--num" scope="col">{t('decaissements.colonneMontant')}</th>
                  <th className="ax-table__th ax-table__th--num" scope="col">{t('decaissements.colonneRembourse')}</th>
                  <th className="ax-table__th" scope="col">{t('decaissements.colonneStatut')}</th>
                </tr>
              </thead>
              <tbody>
                {affiches.map((f) => {
                  const teinte = TEINTE_TYPE[f.type_financement];
                  // Échéance dépassée sans remboursement soldé : la date passe en
                  // rouge. Comparaison de chaînes ISO, qui s'ordonnent comme des dates.
                  const echue =
                    f.date_prevue_remboursement !== null &&
                    f.statut !== 'rembourse' &&
                    f.date_prevue_remboursement < donnees.aujourdhui;
                  return (
                    <tr
                      key={f.id}
                      className="ax-table__row"
                      style={selection.includes(f.id) ? { background: 'var(--ax-accent-wash)' } : undefined}
                    >
                      <td className="ax-table__td">
                        <input
                          type="checkbox"
                          className="ax-checkbox"
                          checked={selection.includes(f.id)}
                          onChange={() => basculer(f.id)}
                          aria-label={t('decaissements.selectionner', { reference: f.reference })}
                        />
                      </td>
                      <td className="ax-table__td">
                        <a
                          href="/ecommerce/invoice-details"
                          className="ax-num"
                          style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-accent)', fontWeight: 'var(--ax-weight-semibold)', textDecoration: 'none' }}
                        >
                          {f.reference}
                        </a>
                        <div className="ax-text-truncate" style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)', maxWidth: 260 }}>
                          {f.objet}
                        </div>
                      </td>
                      <td className="ax-table__td">
                        <div className="ax-cluster" style={{ gap: 'var(--ax-space-3)', flexWrap: 'nowrap' }}>
                          {/* Avatar à initiales : un groupement n'a pas de portrait,
                              et aucune photo du corpus ne doit lui en tenir lieu. */}
                          <span className="ax-avatar ax-avatar--sm ax-avatar--squircle" style={{ background: `color-mix(in oklab,${teinte} 18%,transparent)`, color: teinte }}>
                            <span className="ax-avatar__initials">{initiales(f.groupement_nom)}</span>
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div className="ax-text-truncate" style={{ fontWeight: 'var(--ax-weight-medium)', color: 'var(--ax-text-strong)', maxWidth: 220 }}>
                              {f.groupement_nom}
                            </div>
                            <div style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>{f.bailleur}</div>
                          </div>
                        </div>
                      </td>
                      <td className="ax-table__td">
                        <span className="ax-badge ax-badge--soft ax-badge--neutral ax-badge--pill">
                          {donnees.libelleType[f.type_financement]}
                        </span>
                      </td>
                      <td className="ax-table__td ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-text-muted)', whiteSpace: 'nowrap' }}>
                        {formaterDate(f.date_decaissement)}
                      </td>
                      <td className="ax-table__td ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: echue ? 'var(--ax-danger-500)' : 'var(--ax-text-muted)', whiteSpace: 'nowrap' }}>
                        {f.date_prevue_remboursement ? (
                          formaterDate(f.date_prevue_remboursement)
                        ) : (
                          <span style={{ color: 'var(--ax-text-subtle)' }}>{t('decaissements.sansEcheance')}</span>
                        )}
                      </td>
                      <td className="ax-table__td ax-table__td--num ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-text-strong)', fontWeight: 'var(--ax-weight-semibold)', whiteSpace: 'nowrap' }}>
                        {formaterFcfa(f.montant_fcfa)}
                      </td>
                      <td className="ax-table__td ax-table__td--num ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: f.montant_rembourse_fcfa > 0 ? 'var(--ax-viz-emerald)' : 'var(--ax-text-subtle)', whiteSpace: 'nowrap' }}>
                        {f.montant_rembourse_fcfa > 0 ? formaterFcfa(f.montant_rembourse_fcfa) : '—'}
                      </td>
                      <td className="ax-table__td">
                        <span className={`ax-badge ax-badge--soft ax-badge--${TONALITE_STATUT[f.statut]} ax-badge--pill`}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 13, height: 13 }}>
                            <path d={TRACE_STATUT[f.statut]} />
                          </svg>
                          {t(`decaissements.statuts.${f.statut}`)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {affiches.length > 0 && (
                <tfoot>
                  <tr className="ax-table__row" style={{ background: 'var(--ax-surface-subtle)' }}>
                    <td className="ax-table__td" colSpan={6} style={{ fontWeight: 'var(--ax-weight-semibold)', color: 'var(--ax-text-strong)' }}>
                      {t('decaissements.totauxPage', { nombre: affiches.length })}
                    </td>
                    <td className="ax-table__td ax-table__td--num ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-text-strong)', fontWeight: 'var(--ax-weight-semibold)', whiteSpace: 'nowrap' }}>
                      {formaterFcfa(totalPage)}
                    </td>
                    <td className="ax-table__td ax-table__td--num ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-viz-emerald)', whiteSpace: 'nowrap' }}>
                      {formaterFcfa(rembourseePage)}
                    </td>
                    <td className="ax-table__td" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {affiches.length === 0 && (
            <div style={{ textAlign: 'center', padding: 'var(--ax-space-10) var(--ax-space-5)' }}>
              <span className="ax-avatar ax-avatar--xl ax-avatar--squircle" style={{ background: 'var(--ax-surface-subtle)', color: 'var(--ax-text-subtle)', margin: '0 auto var(--ax-space-4)' }}>
                <svg className="ax-avatar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 28, height: 28 }}><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M5 21v-16a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" /><path d="M9 9l1 0" /><path d="M9 13l6 0" /><path d="M9 17l6 0" /></svg>
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
                  navigation: t('decaissements.pagination'),
                  precedente: t('decaissements.pagePrecedente'),
                  suivante: t('decaissements.pageSuivante'),
                  page: (numero) => t('decaissements.allerPage', { numero }),
                }}
              />
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function CarteChiffre({
  cle,
  libelle,
  valeur,
  pastille,
  teinte,
  note,
}: {
  cle: string;
  libelle: string;
  valeur: string;
  pastille: string;
  teinte?: string;
  note?: string;
}) {
  return (
    <div className="ax-card ax-kpi ax-col--3" role="region" aria-label={`${libelle} : ${valeur}`}>
      <div className="ax-card__body">
        <div className="ax-kpi__top">
          <span className={`ax-kpi__icon ax-kpi__icon--${pastille}`}>{ICONES_KPI[cle]}</span>
        </div>
        <div className="ax-kpi__label">{libelle}</div>
        <div className="ax-kpi__value ax-num" style={teinte ? { color: teinte } : undefined}>{valeur}</div>
        {note && (
          <div style={{ marginTop: 6, fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>{note}</div>
        )}
      </div>
    </div>
  );
}

export default Decaissements;
