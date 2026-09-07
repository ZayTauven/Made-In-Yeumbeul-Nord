'use client';
/*
 * Fiche groupement — route « ecommerce/customer-details ».
 *
 * Adapté de l'écran « Customer details » de Vireo : carte d'identité à gauche,
 * quatre tuiles d'indicateurs et un panneau à onglets à droite.
 *
 * Ce que le template appelle un client est ici un groupement : une organisation
 * de vingt personnes, pas un acheteur. Les onglets suivent donc ce que la
 * coordination a besoin de vérifier sur le terrain — qui en est membre, ce
 * qu'il produit, ce qu'il a reçu — et non un historique d'achats.
 *
 * L'onglet « Vue d'ensemble » ouvre sur le parcours d'accompagnement plutôt que
 * sur une courbe de dépenses : la question posée à cet écran est « où en est ce
 * groupement », et le parcours y répond en une ligne.
 *
 * Composant client : onglets et notes internes vivent en état local.
 */
import { useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHead } from '../../components/shell/PageHead';
import { ApexChart } from '../../components/charts/ApexChart';
import {
  formaterDate,
  formaterDateLongue,
  formaterFcfa,
  formaterFcfaCompact,
  formaterNombre,
  initiales,
} from '../../domaine';
import type {
  EtapeAccompagnement,
  EtatValidation,
  Financement,
  Groupement,
  Membre,
  Production,
} from '../../domaine';

const ETAPES: readonly EtapeAccompagnement[] = [
  'identifie',
  'forme',
  'certifie',
  'formalise',
  'equipe',
  'en_production',
  'autonome',
] as const;

const TONALITE_VALIDATION: Record<EtatValidation, string> = {
  brouillon: 'neutral',
  soumis: 'warning',
  valide: 'success',
  rejete: 'danger',
};

const TONALITE_FINANCEMENT: Record<Financement['statut'], string> = {
  decaisse: 'info',
  remboursement_partiel: 'warning',
  rembourse: 'success',
  defaillant: 'danger',
};

const ONGLETS = ['apercu', 'membres', 'productions', 'financements', 'notes'] as const;
type Onglet = (typeof ONGLETS)[number];

interface NoteInterne {
  auteur: string;
  quand: string;
  corps: string;
}

export interface DonneesFiche {
  groupement: Groupement;
  membres: Membre[];
  productions: Production[];
  financements: Financement[];
  /** Valeur du stock par production, déjà classée — alimente le graphique. */
  valeurStock: Array<{ nom: string; valeur: number }>;
  notes: NoteInterne[];
  totaux: {
    financementRecu: number;
    valeurCatalogue: number;
    productionsEnAlerte: number;
  };
}

export function FicheGroupement({ donnees }: { donnees: DonneesFiche }) {
  const t = useTranslations('ecrans');
  const tc = useTranslations('commun');

  const [onglet, setOnglet] = useState<Onglet>('apercu');
  const [notes, setNotes] = useState<NoteInterne[]>(donnees.notes);
  const [brouillon, setBrouillon] = useState('');

  const { groupement: g, membres, productions, financements, totaux } = donnees;
  const rangEtape = ETAPES.indexOf(g.etape);

  const ajouterNote = (e: FormEvent) => {
    e.preventDefault();
    if (!brouillon.trim()) return;
    setNotes((n) => [
      { auteur: t('fiche.vous'), quand: tc('temps.aLInstant'), corps: brouillon.trim() },
      ...n,
    ]);
    setBrouillon('');
  };

  const compteurs: Partial<Record<Onglet, number>> = {
    membres: membres.length,
    productions: productions.length,
    financements: financements.length,
  };

  return (
    <>
      <PageHead
        title={g.nom}
        subtitle={t('fiche.sousTitre', {
          filiere: g.filiere.nom,
          quartier: g.quartier.nom,
          depuis: formaterDateLongue(g.date_creation),
        })}
        actions={
          <>
            <Link className="ax-btn ax-btn--ghost" href="/crm/companies">
              <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l14 0" /><path d="M5 12l6 6" /><path d="M5 12l6 -6" /></svg>
              <span className="ax-btn__label">{t('fiche.retourAnnuaire')}</span>
            </Link>
            <Link className="ax-btn ax-btn--secondary" href={`/pages/profile?groupement=${g.slug}`}>
              <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6" /></svg>
              <span className="ax-btn__label">{t('fiche.vuePublique')}</span>
            </Link>
            <button type="button" className="ax-btn ax-btn--primary">
              <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1" /><path d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3z" /><path d="M16 5l3 3" /></svg>
              <span className="ax-btn__label">{t('fiche.modifier')}</span>
            </button>
          </>
        }
      />

      <div className="ax-dash-grid">
        {/* ===== CARTE D'IDENTITÉ (4) ===== */}
        <aside className="ax-card ax-col--4" role="region" aria-label={t('fiche.identite')} style={{ alignSelf: 'start' }}>
          <div className="ax-card__body" style={{ textAlign: 'center' }}>
            {/* Avatar à initiales, teinté par la filière : un groupement n'a pas de
                visage, et aucune photo du corpus ne doit lui en tenir lieu. */}
            <span
              className="ax-avatar ax-avatar--2xl ax-avatar--ringed"
              style={{
                marginInline: 'auto',
                boxShadow: `0 0 0 4px var(--ax-surface-raised),0 0 0 6px ${g.filiere.teinte}`,
                background: `color-mix(in oklab,${g.filiere.teinte} 16%,var(--ax-surface-solid))`,
                color: g.filiere.teinte,
              }}
            >
              <span className="ax-avatar__initials" style={{ fontSize: 'var(--ax-text-2xl)' }}>{initiales(g.nom)}</span>
            </span>
            <h2 style={{ fontFamily: 'var(--ax-font-display)', fontSize: 'var(--ax-text-xl)', fontWeight: 700, color: 'var(--ax-text-strong)', marginTop: 'var(--ax-space-4)', lineHeight: 1.2 }}>
              {g.nom}
            </h2>
            <div className="ax-cluster" style={{ justifyContent: 'center', gap: 'var(--ax-space-2)', marginTop: 'var(--ax-space-2)' }}>
              <span className="ax-badge ax-badge--soft ax-badge--accent ax-badge--pill">
                <span className="ax-badge__dot" />
                {tc(`etapes.${g.etape}`)}
              </span>
              <span className={`ax-badge ax-badge--soft ax-badge--${TONALITE_VALIDATION[g.etat_validation]} ax-badge--pill`}>
                <span className="ax-badge__dot" />
                {tc(`validation.etats.${g.etat_validation}`)}
              </span>
            </div>
            <p style={{ color: 'var(--ax-text-muted)', fontSize: 'var(--ax-text-sm)', marginTop: 'var(--ax-space-3)' }}>
              {g.description}
            </p>
          </div>

          <div className="ax-card__body" style={{ paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-1)' }}>
            <LigneContact
              icone={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 7a2 2 0 0 1 2 -2h2a1 1 0 0 1 1 1v1a1 1 0 0 1 -1 1h-2v3h3v-1a1 1 0 0 1 1 -1h1a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-6a2 2 0 0 1 -2 -2z" /><path d="M9 3v2" /></svg>}
              contenu={g.responsable}
              mono={false}
            />
            <LigneContact
              lien={`tel:${g.telephone.replace(/\s/g, '')}`}
              icone={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5l1.5 -2.5l5 2v4a2 2 0 0 1 -2 2a16 16 0 0 1 -15 -15a2 2 0 0 1 2 -2" /></svg>}
              contenu={g.telephone}
              mono
            />
            {g.email && (
              <LigneContact
                lien={`mailto:${g.email}`}
                icone={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10z" /><path d="M3 7l9 6l9 -6" /></svg>}
                contenu={g.email}
                mono={false}
              />
            )}
            <LigneContact
              icone={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" /><path d="M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0" /></svg>}
              contenu={t('fiche.adresse', { quartier: g.quartier.nom })}
              mono={false}
            />
            <LigneContact
              icone={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M5 21v-16a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" /></svg>}
              contenu={
                g.ninea
                  ? t('fiche.ninea', { statut: tc(`statutsJuridiques.${g.statut_juridique}`), ninea: g.ninea })
                  : t('fiche.sansNinea', { statut: tc(`statutsJuridiques.${g.statut_juridique}`) })
              }
              mono={false}
            />
          </div>

          {g.filieres_secondaires.length > 0 && (
            <div className="ax-card__body" style={{ paddingTop: 0 }}>
              <div className="ax-label" style={{ marginBottom: 'var(--ax-space-2)' }}>{t('fiche.filieresSecondaires')}</div>
              <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)' }}>
                {g.filieres_secondaires.map((f) => (
                  <span key={f} className="ax-badge ax-badge--soft ax-badge--neutral" style={{ borderRadius: 'var(--ax-radius-xs)' }}>{f}</span>
                ))}
              </div>
            </div>
          )}

          <div className="ax-card__footer" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--ax-space-2)' }}>
            <Link className="ax-btn ax-btn--secondary ax-btn--block" href="/apps/chat">
              <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 9h8" /><path d="M8 13h6" /><path d="M9 18l-3 3v-3h-1a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-7z" /></svg>
              <span className="ax-btn__label">{t('fiche.contacter')}</span>
            </Link>
            <button type="button" className="ax-btn ax-btn--primary ax-btn--block" disabled={g.etat_validation === 'valide'}>
              <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5l10 -10" /></svg>
              <span className="ax-btn__label">{tc('validation.valider')}</span>
            </button>
          </div>
        </aside>

        {/* ===== COLONNE DROITE (8) ===== */}
        <div className="ax-col--8" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-6)', minWidth: 0 }}>
          <div className="ax-fg-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 'var(--ax-space-4)' }}>
            <Tuile
              pastille="c1"
              icone={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /><path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /><path d="M21 21v-2a4 4 0 0 0 -3 -3.85" /></svg>}
              libelle={t('fiche.tuiles.membres')}
              valeur={formaterNombre(g.nombre_membres)}
              note={t('fiche.tuiles.partFemmes', { part: g.part_femmes })}
            />
            <Tuile
              pastille="c2"
              icone={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l8 4.5l0 9l-8 4.5l-8 -4.5l0 -9l8 -4.5" /><path d="M12 12l8 -4.5" /><path d="M12 12l0 9" /><path d="M12 12l-8 -4.5" /></svg>}
              libelle={t('fiche.tuiles.productions')}
              valeur={formaterNombre(productions.length)}
              note={
                totaux.productionsEnAlerte > 0
                  ? t('fiche.tuiles.enAlerte', { nombre: totaux.productionsEnAlerte })
                  : t('fiche.tuiles.stockSain')
              }
              teinteNote={totaux.productionsEnAlerte > 0 ? 'var(--ax-viz-amber)' : undefined}
            />
            <Tuile
              pastille="c3"
              icone={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v18" /><path d="M17 8a4 4 0 0 0 -4 -3h-2a3.5 3.5 0 0 0 0 7h2a3.5 3.5 0 0 1 0 7h-2a4 4 0 0 1 -4 -3" /></svg>}
              libelle={t('fiche.tuiles.chiffreAffaires')}
              valeur={formaterFcfaCompact(g.chiffre_affaires_fcfa)}
              note={t('fiche.tuiles.surExercice')}
            />
            <Tuile
              pastille="c4"
              icone={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z" /></svg>}
              libelle={t('fiche.tuiles.appuiRecu')}
              valeur={formaterFcfaCompact(totaux.financementRecu)}
              note={tc('unites.dossiers', { nombre: financements.length })}
            />
          </div>

          <section className="ax-card" role="region" aria-label={t('fiche.sections')}>
            <div className="ax-card__body" style={{ paddingBottom: 0 }}>
              <div className="ax-tabs">
                <div className="ax-tabs__list" role="tablist" aria-label={t('fiche.sections')}>
                  {ONGLETS.map((o) => (
                    <button
                      key={o}
                      type="button"
                      className={`ax-tabs__tab${onglet === o ? ' is-active' : ''}`}
                      role="tab"
                      id={`fg-onglet-${o}`}
                      aria-selected={onglet === o}
                      onClick={() => setOnglet(o)}
                    >
                      {t(`fiche.onglets.${o}`)}
                      {compteurs[o] !== undefined && (
                        <span className="ax-tabs__badge ax-badge ax-badge--soft ax-badge--neutral">{compteurs[o]}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* --- APERÇU --- */}
            {onglet === 'apercu' && (
              <div className="ax-card__body" role="tabpanel" aria-labelledby="fg-onglet-apercu" style={{ paddingTop: 'var(--ax-space-5)' }}>
                <div className="ax-cluster" style={{ justifyContent: 'space-between', marginBottom: 'var(--ax-space-4)' }}>
                  <div>
                    <div style={{ fontWeight: 'var(--ax-weight-medium)', color: 'var(--ax-text-strong)' }}>
                      {t('fiche.parcours.titre')}
                    </div>
                    <div style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>
                      {t('fiche.parcours.sousTitre', { etape: rangEtape + 1, total: ETAPES.length })}
                    </div>
                  </div>
                  <span className="ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-accent)', fontWeight: 'var(--ax-weight-semibold)' }}>
                    {g.progression} %
                  </span>
                </div>

                {/* Le parcours est un escalier, pas une barre : chaque étape franchie
                    est un fait daté, et l'agent doit voir laquelle vient ensuite. */}
                <ol className="ax-cluster" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 0, flexWrap: 'nowrap', overflowX: 'auto' }}>
                  {ETAPES.map((etape, i) => {
                    const franchie = i <= rangEtape;
                    const courante = i === rangEtape;
                    return (
                      <li key={etape} style={{ flex: '1 1 0', minWidth: 96, textAlign: 'center', position: 'relative' }}>
                        {i > 0 && (
                          <span
                            aria-hidden="true"
                            style={{ position: 'absolute', insetInlineStart: '-50%', top: 13, width: '100%', height: 2, background: franchie ? 'var(--ax-accent)' : 'var(--ax-border)' }}
                          />
                        )}
                        <span
                          style={{
                            position: 'relative',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            fontSize: 'var(--ax-text-xs)',
                            fontFamily: 'var(--ax-font-mono)',
                            background: franchie ? 'var(--ax-accent)' : 'var(--ax-surface-subtle)',
                            color: franchie ? 'var(--ax-on-accent)' : 'var(--ax-text-subtle)',
                            border: courante ? '2px solid var(--ax-accent)' : '2px solid transparent',
                            boxShadow: courante ? '0 0 0 3px var(--ax-accent-wash)' : undefined,
                          }}
                        >
                          {franchie ? (
                            <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5l10 -10" /></svg>
                          ) : (
                            i + 1
                          )}
                        </span>
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 'var(--ax-text-xs)',
                            color: courante ? 'var(--ax-text-strong)' : 'var(--ax-text-subtle)',
                            fontWeight: courante ? 'var(--ax-weight-semibold)' : undefined,
                          }}
                        >
                          {tc(`etapes.${etape}`)}
                        </div>
                      </li>
                    );
                  })}
                </ol>

                <hr className="ax-divider" style={{ marginBlock: 'var(--ax-space-5)' }} />

                <div className="ax-cluster" style={{ justifyContent: 'space-between', marginBottom: 'var(--ax-space-2)' }}>
                  <div>
                    <div style={{ fontWeight: 'var(--ax-weight-medium)', color: 'var(--ax-text-strong)' }}>
                      {t('fiche.stock.titre')}
                    </div>
                    <div style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>
                      {t('fiche.stock.sousTitre')}
                    </div>
                  </div>
                  <span className="ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-text-strong)', fontSize: 'var(--ax-text-sm)' }}>
                    {formaterFcfaCompact(totaux.valeurCatalogue)}
                  </span>
                </div>

                {donnees.valeurStock.length > 0 ? (
                  <ApexChart
                    type="bar"
                    height={220}
                    legend="none"
                    accent
                    ariaLabel={t('fiche.stock.aria')}
                    series={[{ name: t('fiche.stock.serie'), data: donnees.valeurStock.map((v) => v.valeur) }]}
                    apex={{
                      plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '58%' } },
                      xaxis: { categories: donnees.valeurStock.map((v) => v.nom) },
                      dataLabels: { enabled: false },
                    }}
                  />
                ) : (
                  <p style={{ color: 'var(--ax-text-muted)', fontSize: 'var(--ax-text-sm)' }}>
                    {t('fiche.stock.aucune')}
                  </p>
                )}
              </div>
            )}

            {/* --- MEMBRES --- */}
            {onglet === 'membres' && (
              <div role="tabpanel" aria-labelledby="fg-onglet-membres">
                <div className="ax-table-wrap">
                  <table className="ax-table ax-table--hover">
                    <thead className="ax-table__head">
                      <tr>
                        <th className="ax-table__th" scope="col">{t('fiche.membres.colonneNom')}</th>
                        <th className="ax-table__th" scope="col">{t('fiche.membres.colonneRole')}</th>
                        <th className="ax-table__th ax-table__th--num" scope="col">{t('fiche.membres.colonneAge')}</th>
                        <th className="ax-table__th" scope="col">{t('fiche.membres.colonneTelephone')}</th>
                        <th className="ax-table__th ax-table__th--num" scope="col">{t('fiche.membres.colonneFormations')}</th>
                        <th className="ax-table__th ax-table__th--num" scope="col">{t('fiche.membres.colonneAdhesion')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {membres.map((m) => (
                        <tr key={m.id} className="ax-table__row">
                          <td className="ax-table__td">
                            <div className="ax-cluster" style={{ gap: 'var(--ax-space-3)', flexWrap: 'nowrap' }}>
                              <span className="ax-avatar ax-avatar--sm" style={{ background: `color-mix(in oklab,${m.avatar_teinte} 20%,transparent)`, color: m.avatar_teinte, fontWeight: 600 }}>
                                {m.initiales}
                              </span>
                              <span style={{ fontWeight: 'var(--ax-weight-medium)', color: 'var(--ax-text-strong)' }}>{m.nom_complet}</span>
                            </div>
                          </td>
                          <td className="ax-table__td">
                            <span className="ax-badge ax-badge--soft ax-badge--neutral ax-badge--sm">{m.role}</span>
                          </td>
                          <td className="ax-table__td ax-table__td--num ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-text-muted)' }}>{m.age}</td>
                          <td className="ax-table__td ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-text-muted)', whiteSpace: 'nowrap' }}>{m.telephone}</td>
                          <td className="ax-table__td ax-table__td--num ax-num" style={{ fontFamily: 'var(--ax-font-mono)' }}>
                            {m.nombre_formations_suivies}
                            {m.nombre_certifications > 0 && (
                              <span className="ax-badge ax-badge--soft ax-badge--success ax-badge--sm" style={{ marginInlineStart: 6 }}>
                                {t('fiche.membres.certifie', { nombre: m.nombre_certifications })}
                              </span>
                            )}
                          </td>
                          <td className="ax-table__td ax-table__td--num ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-text-muted)', whiteSpace: 'nowrap' }}>
                            {formaterDate(m.date_adhesion)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="ax-card__footer">
                  <Link className="ax-link" href="/crm/contacts">{t('fiche.membres.voirRepertoire')} →</Link>
                </div>
              </div>
            )}

            {/* --- PRODUCTIONS --- */}
            {onglet === 'productions' && (
              <div className="ax-card__body" role="tabpanel" aria-labelledby="fg-onglet-productions" style={{ paddingTop: 'var(--ax-space-5)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 'var(--ax-space-4)' }}>
                  {productions.map((p) => {
                    const enAlerte = p.stock_disponible <= p.seuil_alerte;
                    return (
                      <article key={p.id} style={{ border: '1px solid var(--ax-border)', borderRadius: 'var(--ax-radius-md)', padding: 'var(--ax-space-4)' }}>
                        <div className="ax-cluster" style={{ justifyContent: 'space-between', gap: 'var(--ax-space-2)', flexWrap: 'nowrap' }}>
                          <div className="ax-text-truncate" style={{ fontWeight: 'var(--ax-weight-semibold)', color: 'var(--ax-text-strong)' }}>{p.nom}</div>
                          <span className={`ax-badge ax-badge--soft ax-badge--pill ax-badge--sm ax-badge--${TONALITE_VALIDATION[p.etat_validation]}`}>
                            {tc(`validation.etats.${p.etat_validation}`)}
                          </span>
                        </div>
                        <div className="ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-text-strong)', marginTop: 6 }}>
                          {formaterFcfa(p.prix_unitaire_fcfa)} <span style={{ color: 'var(--ax-text-subtle)', fontSize: 'var(--ax-text-xs)' }}>/ {p.unite}</span>
                        </div>
                        <div className="ax-cluster" style={{ justifyContent: 'space-between', marginTop: 'var(--ax-space-3)', paddingTop: 'var(--ax-space-2)', borderTop: '1px solid var(--ax-border)' }}>
                          <span style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-muted)' }}>{t('fiche.productions.stock')}</span>
                          <b className="ax-num" style={{ fontFamily: 'var(--ax-font-mono)', fontSize: 'var(--ax-text-sm)', color: enAlerte ? 'var(--ax-viz-amber)' : 'var(--ax-text-strong)' }}>
                            {p.stock_disponible}
                            {enAlerte && ` · ${t('fiche.productions.seuilAtteint')}`}
                          </b>
                        </div>
                      </article>
                    );
                  })}
                </div>
                {productions.length === 0 && (
                  <p style={{ color: 'var(--ax-text-muted)', fontSize: 'var(--ax-text-sm)' }}>{t('fiche.productions.aucune')}</p>
                )}
              </div>
            )}

            {/* --- FINANCEMENTS --- */}
            {onglet === 'financements' && (
              <div role="tabpanel" aria-labelledby="fg-onglet-financements">
                <div className="ax-table-wrap">
                  <table className="ax-table ax-table--hover">
                    <thead className="ax-table__head">
                      <tr>
                        <th className="ax-table__th" scope="col">{t('fiche.financements.colonneReference')}</th>
                        <th className="ax-table__th" scope="col">{t('fiche.financements.colonneObjet')}</th>
                        <th className="ax-table__th" scope="col">{t('fiche.financements.colonneBailleur')}</th>
                        <th className="ax-table__th ax-table__th--num" scope="col">{t('fiche.financements.colonneDate')}</th>
                        <th className="ax-table__th ax-table__th--num" scope="col">{t('fiche.financements.colonneMontant')}</th>
                        <th className="ax-table__th" scope="col">{t('fiche.financements.colonneStatut')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {financements.map((f) => (
                        <tr key={f.id} className="ax-table__row">
                          <td className="ax-table__td ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-accent)', fontWeight: 'var(--ax-weight-semibold)' }}>{f.reference}</td>
                          <td className="ax-table__td" style={{ color: 'var(--ax-text-muted)' }}>{f.objet}</td>
                          <td className="ax-table__td" style={{ color: 'var(--ax-text-muted)' }}>{f.bailleur}</td>
                          <td className="ax-table__td ax-table__td--num ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-text-muted)', whiteSpace: 'nowrap' }}>
                            {formaterDate(f.date_decaissement)}
                          </td>
                          <td className="ax-table__td ax-table__td--num ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-text-strong)', fontWeight: 'var(--ax-weight-semibold)', whiteSpace: 'nowrap' }}>
                            {formaterFcfa(f.montant_fcfa)}
                          </td>
                          <td className="ax-table__td">
                            <span className={`ax-badge ax-badge--soft ax-badge--pill ax-badge--sm ax-badge--${TONALITE_FINANCEMENT[f.statut]}`}>
                              <span className="ax-badge__dot" />
                              {t(`decaissements.statuts.${f.statut}`)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {financements.length === 0 && (
                  <div className="ax-card__body">
                    <p style={{ color: 'var(--ax-text-muted)', fontSize: 'var(--ax-text-sm)', margin: 0 }}>
                      {t('fiche.financements.aucun')}
                    </p>
                  </div>
                )}
                <div className="ax-card__footer">
                  <Link className="ax-link" href="/ecommerce/invoices">{t('fiche.financements.voirTous')} →</Link>
                </div>
              </div>
            )}

            {/* --- NOTES --- */}
            {onglet === 'notes' && (
              <div className="ax-card__body" role="tabpanel" aria-labelledby="fg-onglet-notes" style={{ paddingTop: 'var(--ax-space-5)' }}>
                <form onSubmit={ajouterNote} style={{ display: 'flex', gap: 'var(--ax-space-3)', alignItems: 'flex-start', marginBottom: 'var(--ax-space-5)' }}>
                  <span className="ax-avatar ax-avatar--sm" style={{ background: 'color-mix(in oklab,var(--ax-accent) 16%,transparent)', color: 'var(--ax-accent)' }}>
                    <span className="ax-avatar__initials">{t('fiche.vosInitiales')}</span>
                  </span>
                  <div style={{ flex: '1 1 auto' }}>
                    <textarea
                      className="ax-textarea"
                      rows={2}
                      placeholder={t('fiche.notes.exemple')}
                      value={brouillon}
                      onChange={(e) => setBrouillon(e.target.value)}
                      style={{ minHeight: 60 }}
                      aria-label={t('fiche.notes.exemple')}
                    />
                    <div className="ax-cluster" style={{ justifyContent: 'flex-end', marginTop: 'var(--ax-space-2)' }}>
                      <button type="submit" className="ax-btn ax-btn--primary ax-btn--sm" disabled={!brouillon.trim()}>
                        {t('fiche.notes.ajouter')}
                      </button>
                    </div>
                  </div>
                </form>
                <ul className="ax-list" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-3)' }}>
                  {notes.map((n, i) => (
                    <li key={`${n.quand}-${i}`} style={{ border: '1px solid var(--ax-border)', borderRadius: 'var(--ax-radius-md)', padding: 'var(--ax-space-4)' }}>
                      <div className="ax-cluster" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontWeight: 'var(--ax-weight-medium)', color: 'var(--ax-text-strong)', fontSize: 'var(--ax-text-sm)' }}>{n.auteur}</span>
                        <span className="ax-num" style={{ fontFamily: 'var(--ax-font-mono)', fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>{n.quand}</span>
                      </div>
                      <p style={{ color: 'var(--ax-text)', fontSize: 'var(--ax-text-sm)', lineHeight: 1.6 }}>{n.corps}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .ax-fg-kpis { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
        }
      `}</style>
    </>
  );
}

function LigneContact({
  icone,
  contenu,
  mono,
  lien,
}: {
  icone: ReactElement;
  contenu: string;
  mono: boolean;
  lien?: string;
}) {
  const corps = (
    <>
      <span className="ax-list__leading" style={{ color: 'var(--ax-text-subtle)' }}>{icone}</span>
      <span className="ax-list__content">
        <span
          className={`ax-list__title${mono ? ' ax-num' : ''}`}
          style={{ color: 'var(--ax-text)', fontWeight: 'var(--ax-weight-medium)', ...(mono ? { fontFamily: 'var(--ax-font-mono)' } : {}) }}
        >
          {contenu}
        </span>
      </span>
    </>
  );

  const style = { border: 0, padding: 'var(--ax-space-2)', borderRadius: 'var(--ax-radius-sm)' } as const;
  return lien ? (
    <a className="ax-list__row ax-list--linked" href={lien} style={{ ...style, textDecoration: 'none' }}>{corps}</a>
  ) : (
    <div className="ax-list__row" style={style}>{corps}</div>
  );
}

function Tuile({
  pastille,
  icone,
  libelle,
  valeur,
  note,
  teinteNote,
}: {
  pastille: string;
  icone: ReactElement;
  libelle: string;
  valeur: string;
  note: string;
  teinteNote?: string;
}) {
  return (
    <div className="ax-card ax-kpi" role="region" aria-label={`${libelle} : ${valeur}`}>
      <div className="ax-card__body">
        <div className="ax-kpi__top">
          <span className={`ax-kpi__icon ax-kpi__icon--${pastille}`}>{icone}</span>
        </div>
        <div className="ax-kpi__label">{libelle}</div>
        <div className="ax-kpi__value ax-num">{valeur}</div>
        <div style={{ marginTop: 4, fontSize: 'var(--ax-text-xs)', color: teinteNote ?? 'var(--ax-text-subtle)' }}>{note}</div>
      </div>
    </div>
  );
}

export default FicheGroupement;
