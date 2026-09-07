'use client';
/*
 * Journal des mouvements financiers — route « crypto/transactions ».
 *
 * Adapté de l'écran « Crypto · Transactions » de Vireo : bandeau de synthèse,
 * table filtrable, pastilles de filtre actif, état vide, pagination. Le contenu
 * est la caisse du projet : décaissements aux groupements et remboursements du
 * fonds rotatif.
 *
 * Trois écarts assumés par rapport au template :
 *
 *  - la sous-navigation « crypto » disparaît : la route est rattachée au module
 *    Financement du manifeste, pas à une section crypto qui n'existe plus ;
 *  - il n'y a ni hachage de transaction ni frais de réseau, mais une référence
 *    de pièce comptable et un moyen de paiement ;
 *  - les moyens de paiement sont Wave, Orange Money, Free Money, espèces et
 *    virement. Aucun moyen international n'a cours dans ce projet.
 *
 * Composant client : filtres et pagination vivent en état local. Les mouvements
 * arrivent en props du composant serveur.
 */
import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslations } from 'next-intl';
import { PageHead } from '../../components/shell/PageHead';
import { Pagination } from '../../components/table/Pagination';
import { formaterDate, formaterFcfa, formaterFcfaCompact, formaterNombre } from '../../domaine';
import type { MoyenPaiement, MouvementFinancier } from '../../domaine';

type Statut = MouvementFinancier['statut'];

const STATUTS: readonly Statut[] = ['valide', 'en_attente', 'rejete'] as const;
const MOYENS: readonly MoyenPaiement[] = [
  'wave',
  'orange_money',
  'free_money',
  'especes',
  'virement',
] as const;

const TONALITE_STATUT: Record<Statut, string> = {
  valide: 'success',
  en_attente: 'warning',
  rejete: 'danger',
};

const ICONE_ENTREE = (
  <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5l0 14" /><path d="M18 11l-6 6" /><path d="M6 11l6 6" /></svg>
);
const ICONE_SORTIE = (
  <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19l0 -14" /><path d="M18 13l-6 -6" /><path d="M6 13l6 -6" /></svg>
);

const ICONES_KPI: Record<string, ReactElement> = {
  total: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7h18" /><path d="M3 12h18" /><path d="M3 17h18" /></svg>,
  entrees: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5l0 14" /><path d="M18 11l-6 6" /><path d="M6 11l6 6" /></svg>,
  sorties: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19l0 -14" /><path d="M18 13l-6 -6" /><path d="M6 13l6 -6" /></svg>,
  attente: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" /><path d="M12 7v5l3 3" /></svg>,
};

/** Lignes par page. Vingt-cinq tient sur un écran de vidéoprojecteur. */
const PAR_PAGE = 25;

export interface DonneesMouvements {
  mouvements: MouvementFinancier[];
  categories: string[];
  synthese: {
    total: number;
    entrees: number;
    sorties: number;
    enAttente: number;
  };
}

export function JournalMouvements({ donnees }: { donnees: DonneesMouvements }) {
  const t = useTranslations('ecrans');
  const tc = useTranslations('commun');

  const [recherche, setRecherche] = useState('');
  const [categorie, setCategorie] = useState('');
  const [statut, setStatut] = useState('');
  const [moyen, setMoyen] = useState('');
  const [page, setPage] = useState(1);

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return donnees.mouvements.filter((m) => {
      if (categorie && m.categorie !== categorie) return false;
      if (statut && m.statut !== statut) return false;
      if (moyen && m.moyen !== moyen) return false;
      if (q && !`${m.reference} ${m.libelle} ${m.contrepartie}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [donnees.mouvements, recherche, categorie, statut, moyen]);

  const pages = Math.max(1, Math.ceil(filtres.length / PAR_PAGE));
  // La page courante est bornée à la volée : changer un filtre peut la rendre
  // hors bornes, et une page vide au milieu d'une liste pleine se lit comme un bug.
  const pageSure = Math.min(page, pages);
  const debut = (pageSure - 1) * PAR_PAGE;
  const affiches = filtres.slice(debut, debut + PAR_PAGE);

  const filtresActifs = Boolean(recherche || categorie || statut || moyen);
  const reinitialiser = () => {
    setRecherche('');
    setCategorie('');
    setStatut('');
    setMoyen('');
    setPage(1);
  };
  const changerFiltre = (poser: () => void) => {
    poser();
    setPage(1);
  };

  return (
    <>
      <PageHead
        title={t('mouvements.titre')}
        subtitle={t('mouvements.sousTitre')}
        actions={
          <>
            <button type="button" className="ax-btn ax-btn--secondary ax-btn--pill">
              <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12" /><path d="M16 3v4" /><path d="M8 3v4" /><path d="M4 11h16" /></svg>
              <span className="ax-btn__label">{t('mouvements.periode')}</span>
              <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6l6 -6" /></svg>
            </button>
            <button type="button" className="ax-btn ax-btn--primary">
              <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 11l5 5l5 -5" /><path d="M12 4l0 12" /></svg>
              <span className="ax-btn__label">{t('mouvements.exporter')}</span>
            </button>
          </>
        }
      />

      {/* ===== BANDEAU DE SYNTHÈSE ===== */}
      <div className="ax-dash-grid" style={{ marginBottom: 'var(--ax-space-6)' }}>
        <CarteSynthese
          cle="total"
          libelle={t('mouvements.synthese.total')}
          valeur={formaterNombre(donnees.synthese.total)}
          pastille="c1"
        />
        <CarteSynthese
          cle="entrees"
          libelle={t('mouvements.synthese.entrees')}
          valeur={`+${formaterFcfaCompact(donnees.synthese.entrees)}`}
          pastille="c2"
          teinte="var(--ax-viz-emerald)"
        />
        <CarteSynthese
          cle="sorties"
          libelle={t('mouvements.synthese.sorties')}
          valeur={`−${formaterFcfaCompact(donnees.synthese.sorties)}`}
          pastille="c3"
        />
        <CarteSynthese
          cle="attente"
          libelle={t('mouvements.synthese.attente')}
          valeur={formaterFcfaCompact(donnees.synthese.enAttente)}
          pastille="c4"
        />
      </div>

      {/* ===== TABLE ===== */}
      <div className="ax-dash-grid">
        <section className="ax-card ax-col--12" role="region" aria-label={t('mouvements.tableTitre')}>
          <div className="ax-card__header" style={{ flexWrap: 'wrap', gap: 'var(--ax-space-3)' }}>
            <div className="ax-card__titles">
              <h2 className="ax-card__title">{t('mouvements.tableTitre')}</h2>
              <p className="ax-card__subtitle ax-num" style={{ fontFamily: 'var(--ax-font-mono)' }}>
                {tc('table.pagination', {
                  debut: filtres.length === 0 ? 0 : debut + 1,
                  fin: debut + affiches.length,
                  total: filtres.length,
                })}
              </p>
            </div>
            <div className="ax-card__actions" style={{ flexWrap: 'wrap', gap: 'var(--ax-space-2)' }}>
              <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 280 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ position: 'absolute', insetInlineStart: 11, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: 'var(--ax-text-subtle)' }}><path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" /></svg>
                <input
                  type="search"
                  className="ax-input ax-input--sm"
                  placeholder={t('mouvements.rechercher')}
                  value={recherche}
                  onChange={(e) => changerFiltre(() => setRecherche(e.target.value))}
                  aria-label={t('mouvements.rechercher')}
                  style={{ paddingInlineStart: 34 }}
                />
              </div>
              <select
                className="ax-select ax-select--sm"
                value={categorie}
                onChange={(e) => changerFiltre(() => setCategorie(e.target.value))}
                aria-label={t('mouvements.filtrerCategorie')}
                style={{ minWidth: 160 }}
              >
                <option value="">{t('mouvements.toutesCategories')}</option>
                {donnees.categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                className="ax-select ax-select--sm"
                value={moyen}
                onChange={(e) => changerFiltre(() => setMoyen(e.target.value))}
                aria-label={t('mouvements.filtrerMoyen')}
                style={{ minWidth: 150 }}
              >
                <option value="">{t('mouvements.tousMoyens')}</option>
                {MOYENS.map((m) => (
                  <option key={m} value={m}>{tc(`paiement.${m}`)}</option>
                ))}
              </select>
              <select
                className="ax-select ax-select--sm"
                value={statut}
                onChange={(e) => changerFiltre(() => setStatut(e.target.value))}
                aria-label={t('mouvements.filtrerStatut')}
                style={{ minWidth: 150 }}
              >
                <option value="">{tc('filtres.tousLesStatuts')}</option>
                {STATUTS.map((s) => (
                  <option key={s} value={s}>{t(`mouvements.statuts.${s}`)}</option>
                ))}
              </select>
            </div>
          </div>

          {filtresActifs && (
            <div className="ax-card__body" style={{ paddingBlock: 0 }}>
              <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)', paddingBlock: 'var(--ax-space-3)' }}>
                <span style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>{tc('filtres.titre')} :</span>
                {recherche && (
                  <PastilleFiltre libelle={`« ${recherche} »`} onRetirer={() => changerFiltre(() => setRecherche(''))} />
                )}
                {categorie && <PastilleFiltre libelle={categorie} onRetirer={() => changerFiltre(() => setCategorie(''))} />}
                {moyen && <PastilleFiltre libelle={tc(`paiement.${moyen}`)} onRetirer={() => changerFiltre(() => setMoyen(''))} />}
                {statut && <PastilleFiltre libelle={t(`mouvements.statuts.${statut}`)} onRetirer={() => changerFiltre(() => setStatut(''))} />}
                <button type="button" className="ax-btn ax-btn--link ax-btn--sm" onClick={reinitialiser}>
                  {tc('actions.reinitialiser')}
                </button>
              </div>
            </div>
          )}

          <div className="ax-table-wrap">
            <table className="ax-table ax-table--hover">
              <thead className="ax-table__head">
                <tr>
                  <th className="ax-table__th" scope="col">{t('mouvements.colonneSens')}</th>
                  <th className="ax-table__th" scope="col">{t('mouvements.colonneLibelle')}</th>
                  <th className="ax-table__th" scope="col">{t('mouvements.colonneCategorie')}</th>
                  <th className="ax-table__th" scope="col">{t('mouvements.colonneMoyen')}</th>
                  <th className="ax-table__th" scope="col">{t('mouvements.colonneReference')}</th>
                  <th className="ax-table__th ax-table__th--num" scope="col">{t('mouvements.colonneDate')}</th>
                  <th className="ax-table__th ax-table__th--num" scope="col">{t('mouvements.colonneMontant')}</th>
                  <th className="ax-table__th" scope="col">{t('mouvements.colonneStatut')}</th>
                </tr>
              </thead>
              <tbody>
                {affiches.map((m) => {
                  const entrant = m.montant_fcfa >= 0;
                  return (
                    <tr key={m.id} className="ax-table__row">
                      <td className="ax-table__td">
                        <span className={`ax-badge ax-badge--soft ax-badge--pill ax-badge--${entrant ? 'success' : 'warning'}`}>
                          {entrant ? ICONE_ENTREE : ICONE_SORTIE}
                          {t(`mouvements.sens.${entrant ? 'entree' : 'sortie'}`)}
                        </span>
                      </td>
                      <td className="ax-table__td">
                        <div style={{ fontWeight: 'var(--ax-weight-medium)', color: 'var(--ax-text-strong)' }}>{m.libelle}</div>
                        <div style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>{m.contrepartie}</div>
                      </td>
                      <td className="ax-table__td" style={{ color: 'var(--ax-text-muted)' }}>{m.categorie}</td>
                      <td className="ax-table__td" style={{ color: 'var(--ax-text-muted)' }}>{tc(`paiement.${m.moyen}`)}</td>
                      <td className="ax-table__td">
                        <code className="ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-text-muted)', fontSize: 'var(--ax-text-xs)' }}>
                          {m.reference}
                        </code>
                      </td>
                      <td className="ax-table__td ax-table__td--num ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-text-muted)', whiteSpace: 'nowrap' }}>
                        {formaterDate(m.date)}
                      </td>
                      <td
                        className="ax-table__td ax-table__td--num ax-num"
                        style={{ fontFamily: 'var(--ax-font-mono)', color: entrant ? 'var(--ax-viz-emerald)' : 'var(--ax-text-strong)', fontWeight: 'var(--ax-weight-semibold)', whiteSpace: 'nowrap' }}
                      >
                        {/* Le signe est porté par le libellé et non par la seule
                            couleur : le sens du flux doit se lire en niveaux de gris. */}
                        {entrant ? '+' : '−'}
                        {formaterFcfa(Math.abs(m.montant_fcfa))}
                      </td>
                      <td className="ax-table__td">
                        <span className={`ax-badge ax-badge--soft ax-badge--pill ax-badge--${TONALITE_STATUT[m.statut]}`}>
                          <span className="ax-badge__dot" />
                          {t(`mouvements.statuts.${m.statut}`)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {affiches.length === 0 && (
                  <tr>
                    <td className="ax-table__td" colSpan={8} style={{ textAlign: 'center', paddingBlock: 'var(--ax-space-8)', color: 'var(--ax-text-muted)' }}>
                      <svg viewBox="0 0 24 24" width={40} height={40} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: 'var(--ax-text-subtle)', marginBottom: 'var(--ax-space-3)' }}><path d="M3 10a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z" /><path d="M3 10l9 6l9 -6" /></svg>
                      <p style={{ margin: 0 }}>{tc('table.aucunResultatIndice')}</p>
                      <button type="button" className="ax-btn ax-btn--link" onClick={reinitialiser}>
                        {tc('actions.reinitialiser')}
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="ax-card__footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--ax-space-3)' }}>
            <span className="ax-pagination__summary ax-num" style={{ fontFamily: 'var(--ax-font-mono)', fontSize: 'var(--ax-text-xs)' }}>
              {tc('table.pagination', {
                debut: filtres.length === 0 ? 0 : debut + 1,
                fin: debut + affiches.length,
                total: filtres.length,
              })}
            </span>
            <Pagination
              courante={pageSure}
              total={pages}
              onChanger={setPage}
              etiquettes={{
                navigation: t('mouvements.pagination'),
                precedente: t('mouvements.pagePrecedente'),
                suivante: t('mouvements.pageSuivante'),
                page: (numero) => t('mouvements.allerPage', { numero }),
              }}
            />
          </div>
        </section>
      </div>
    </>
  );
}

function CarteSynthese({
  cle,
  libelle,
  valeur,
  pastille,
  teinte,
}: {
  cle: string;
  libelle: string;
  valeur: string;
  pastille: string;
  teinte?: string;
}) {
  return (
    <div className="ax-card ax-kpi ax-col--3" role="region" aria-label={`${libelle} : ${valeur}`}>
      <div className="ax-card__body">
        <div className="ax-kpi__top">
          <span className={`ax-kpi__icon ax-kpi__icon--${pastille}`}>{ICONES_KPI[cle]}</span>
        </div>
        <div className="ax-kpi__label">{libelle}</div>
        <div className="ax-kpi__value ax-num" style={teinte ? { color: teinte } : undefined}>{valeur}</div>
      </div>
    </div>
  );
}

function PastilleFiltre({ libelle, onRetirer }: { libelle: string; onRetirer: () => void }) {
  return (
    <span className="ax-badge ax-badge--soft ax-badge--neutral ax-badge--pill">
      {libelle}
      <button type="button" className="ax-badge__remove" aria-label={`Retirer le filtre ${libelle}`} onClick={onRetirer}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
      </button>
    </span>
  );
}

export default JournalMouvements;
