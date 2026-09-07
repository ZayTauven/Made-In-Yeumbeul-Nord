'use client';
/*
 * Fiche production — route « ecommerce/product-details ».
 *
 * Adaptée de l'écran « Product details » de Vireo : galerie avec bande de
 * vignettes, panneau latéral, panneau à onglets et rail de contexte.
 *
 * Trois écarts assumés avec le template :
 *
 *  - le panneau de droite n'est pas un panneau d'achat mais un panneau de
 *    gestion : cette fiche est vue par un agent de la commune, pas par un
 *    client. On y ajuste un stock et on y valide une déclaration ;
 *  - il n'y a ni finition ni taille à choisir : une production du projet n'a
 *    pas de variantes dans le modèle, et en inventer ferait promettre à la
 *    vitrine des articles qui n'existent pas ;
 *  - le troisième onglet montre la traçabilité de la déclaration plutôt que
 *    des avis rédigés. Les appréciations existent en nombre et en moyenne,
 *    pas en texte : afficher des avis inventés signés de noms sénégalais
 *    serait fabriquer de la parole d'habitante.
 */
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHead } from '../../components/shell/PageHead';
import { formaterDate, formaterDateLongue, formaterFcfa, formaterNombre, initiales } from '../../domaine';
import type { EtapeAccompagnement, EtatValidation, Production } from '../../domaine';

const ETOILE = (
  <path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873l-6.158 -3.245" />
);

const TONALITE_VALIDATION: Record<EtatValidation, string> = {
  brouillon: 'neutral',
  soumis: 'warning',
  valide: 'success',
  rejete: 'danger',
};

/** Circuit de validation d'une déclaration, dans l'ordre. */
const CIRCUIT: readonly EtatValidation[] = ['brouillon', 'soumis', 'valide'] as const;

const ONGLETS = ['description', 'caracteristiques', 'tracabilite'] as const;
type Onglet = (typeof ONGLETS)[number];

export interface Vue {
  cle: string;
  src: string;
  flou: string;
  alt: string;
  titre: string;
}

export interface ProductionVoisine {
  slug: string;
  nom: string;
  groupement: string;
  prix: number;
  unite: string;
  image: { src: string; flou: string } | null;
}

export interface DonneesFicheProduction {
  production: Production;
  vues: Vue[];
  groupement: {
    nom: string;
    slug: string;
    quartier: string;
    nombreMembres: number;
    etape: EtapeAccompagnement;
    responsable: string;
  };
  voisines: ProductionVoisine[];
}

export function FicheProduction({ donnees }: { donnees: DonneesFicheProduction }) {
  const t = useTranslations('ecrans');
  const tc = useTranslations('commun');

  const { production: p, groupement, vues, voisines } = donnees;

  const [vueActive, setVueActive] = useState(0);
  const [onglet, setOnglet] = useState<Onglet>('description');
  const [stock, setStock] = useState(p.stock_disponible);

  const enRupture = stock === 0;
  const sousLeSeuil = !enRupture && stock <= p.seuil_alerte;
  // La jauge est bornée à cinq fois le seuil : au-delà, un stock abondant
  // écraserait visuellement la zone qui compte, celle du seuil d'alerte.
  const remplissage = Math.min(100, Math.round((stock / (p.seuil_alerte * 5)) * 100));
  const rangCircuit = CIRCUIT.indexOf(p.etat_validation);

  const vue = vues[vueActive] ?? vues[0];

  return (
    <>
      <PageHead
        title={p.nom}
        subtitle={t('ficheProduction.sousTitre', {
          filiere: p.filiere_nom,
          groupement: p.groupement_nom,
          quartier: groupement.quartier,
        })}
        actions={
          <>
            <Link className="ax-btn ax-btn--ghost" href="/ecommerce/products">
              <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l14 0" /><path d="M5 12l6 6" /><path d="M5 12l6 -6" /></svg>
              <span className="ax-btn__label">{t('ficheProduction.retourCatalogue')}</span>
            </Link>
            <Link className="ax-btn ax-btn--secondary" href="/ecommerce/edit-product">
              <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1" /><path d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3z" /><path d="M16 5l3 3" /></svg>
              <span className="ax-btn__label">{tc('actions.modifier')}</span>
            </Link>
            <button type="button" className="ax-btn ax-btn--primary" disabled={p.etat_validation === 'valide'}>
              <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5l10 -10" /></svg>
              <span className="ax-btn__label">{tc('validation.valider')}</span>
            </button>
          </>
        }
      />

      <div className="ax-dash-grid">
        {/* ===== GALERIE ===== */}
        <section className="ax-card ax-col--6" role="region" aria-label={t('ficheProduction.galerie')}>
          <div className="ax-card__body">
            <div style={{ position: 'relative', aspectRatio: '4/3', borderRadius: 'var(--ax-radius-lg)', overflow: 'hidden', background: 'var(--ax-surface-subtle)' }}>
              {vue && (
                <Image
                  src={vue.src}
                  alt={vue.alt}
                  fill
                  sizes="(max-width: 900px) 100vw, 520px"
                  placeholder="blur"
                  blurDataURL={vue.flou}
                  priority
                  style={{ objectFit: 'cover' }}
                />
              )}
            </div>

            {/* La légende dit ce que la photo montre. Le corpus documente une
                activité de la commune : la vue n'est pas le portrait de l'article,
                et le laisser croire tromperait le lecteur comme l'acheteur. */}
            {vue && (
              <p style={{ marginTop: 'var(--ax-space-2)', fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>
                {t('ficheProduction.legende', { titre: vue.titre })}
              </p>
            )}

            {vues.length > 1 && (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${vues.length}, minmax(0,1fr))`, gap: 'var(--ax-space-3)', marginTop: 'var(--ax-space-3)' }}>
                {vues.map((v, i) => (
                  <button
                    key={v.cle}
                    type="button"
                    onClick={() => setVueActive(i)}
                    aria-pressed={i === vueActive}
                    aria-label={t('ficheProduction.voirVue', { titre: v.titre })}
                    style={{
                      position: 'relative',
                      aspectRatio: '1/1',
                      borderRadius: 'var(--ax-radius-md)',
                      overflow: 'hidden',
                      border: '2px solid transparent',
                      cursor: 'pointer',
                      padding: 0,
                      background: 'var(--ax-surface-subtle)',
                      ...(i === vueActive ? { borderColor: 'var(--ax-accent)', boxShadow: '0 0 0 1px var(--ax-accent)' } : {}),
                    }}
                  >
                    <Image src={v.src} alt="" fill sizes="120px" placeholder="blur" blurDataURL={v.flou} style={{ objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ===== PANNEAU DE GESTION ===== */}
        <section className="ax-card ax-col--6" role="region" aria-label={t('ficheProduction.gestion')}>
          <div className="ax-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-4)' }}>
            <div className="ax-cluster" style={{ justifyContent: 'space-between', gap: 'var(--ax-space-3)', flexWrap: 'nowrap' }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: 'var(--ax-text-2xs)', textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ax-text-subtle)', fontWeight: 'var(--ax-weight-medium)' }}>
                  {p.filiere_nom}
                </span>
                <h2 style={{ fontFamily: 'var(--ax-font-display)', fontSize: 'var(--ax-text-xl)', fontWeight: 700, color: 'var(--ax-text-strong)', lineHeight: 1.25, marginTop: 4 }}>
                  {p.nom}
                </h2>
              </div>
              <span className={`ax-badge ax-badge--soft ax-badge--pill ax-badge--${TONALITE_VALIDATION[p.etat_validation]}`}>
                <span className="ax-badge__dot" />
                {tc(`validation.etats.${p.etat_validation}`)}
              </span>
            </div>

            <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)' }}>
              {p.nombre_appreciations > 0 ? (
                <>
                  <span className="ax-rating" aria-label={`${p.note_moyenne.toFixed(1).replace('.', ',')} / 5`}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <svg
                        key={s}
                        className={`ax-rating__star${s <= Math.round(p.note_moyenne) ? ' ax-rating__star--full' : ''}`}
                        viewBox="0 0 24 24"
                        fill={s <= Math.round(p.note_moyenne) ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        {ETOILE}
                      </svg>
                    ))}
                  </span>
                  <span className="ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-text-muted)', fontSize: 'var(--ax-text-sm)' }}>
                    {p.note_moyenne.toFixed(1).replace('.', ',')} · {tc('unites.appreciations', { nombre: p.nombre_appreciations })}
                  </span>
                </>
              ) : (
                <span style={{ fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text-subtle)' }}>
                  {t('catalogue.pasEncoreNotee')}
                </span>
              )}
            </div>

            <div className="ax-cluster" style={{ gap: 'var(--ax-space-3)', alignItems: 'baseline' }}>
              <span className="ax-num" style={{ fontFamily: 'var(--ax-font-mono)', fontSize: 'var(--ax-text-2xl)', fontWeight: 700, color: 'var(--ax-text-strong)' }}>
                {formaterFcfa(p.prix_unitaire_fcfa)}
              </span>
              <span style={{ color: 'var(--ax-text-subtle)', fontSize: 'var(--ax-text-sm)' }}>/ {p.unite}</span>
              {p.prix_barre_fcfa !== null && (
                <span className="ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-text-subtle)', textDecoration: 'line-through', fontSize: 'var(--ax-text-sm)' }}>
                  {formaterFcfa(p.prix_barre_fcfa)}
                </span>
              )}
            </div>
            {p.prix_barre_fcfa !== null && (
              <p style={{ margin: 0, fontSize: 'var(--ax-text-xs)', color: 'var(--ax-viz-emerald)' }}>
                {t('ficheProduction.ecartMarche', {
                  ecart: Math.round(((p.prix_barre_fcfa - p.prix_unitaire_fcfa) / p.prix_barre_fcfa) * 100),
                })}
              </p>
            )}

            <div className="ax-divider" />

            {/* Stock : la jauge et le pas de réglage. */}
            <div>
              <div className="ax-cluster" style={{ justifyContent: 'space-between', marginBottom: 'var(--ax-space-2)' }}>
                <span className="ax-label">{t('ficheProduction.stock')}</span>
                <span
                  className="ax-num"
                  style={{ fontFamily: 'var(--ax-font-mono)', fontWeight: 'var(--ax-weight-semibold)', color: enRupture ? 'var(--ax-danger-500)' : sousLeSeuil ? 'var(--ax-warning-500)' : 'var(--ax-text-strong)' }}
                >
                  {formaterNombre(stock)} {p.unite}
                </span>
              </div>
              <div className="ax-progress ax-progress--sm">
                <div className="ax-progress__track">
                  <div
                    className="ax-progress__fill"
                    style={{ width: `${remplissage}%`, background: enRupture ? 'var(--ax-danger-500)' : sousLeSeuil ? 'var(--ax-warning-500)' : 'var(--ax-viz-emerald)' }}
                  />
                </div>
              </div>
              <div style={{ marginTop: 6, fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>
                {t('ficheProduction.seuilAlerte', { seuil: p.seuil_alerte })}
              </div>

              <div className="ax-cluster" style={{ gap: 'var(--ax-space-3)', marginTop: 'var(--ax-space-3)', flexWrap: 'nowrap' }}>
                <div className="ax-cluster" style={{ gap: 0, flexWrap: 'nowrap', border: '1px solid var(--ax-border)', borderRadius: 'var(--ax-radius-md)', overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => setStock((s) => Math.max(0, s - 1))}
                    disabled={stock <= 0}
                    style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ax-surface)', border: 0, cursor: 'pointer', color: 'var(--ax-text)' }}
                    aria-label={t('ficheProduction.diminuerStock')}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 16, height: 16 }}><path d="M5 12l14 0" /></svg>
                  </button>
                  <input
                    type="text"
                    className="ax-num"
                    inputMode="numeric"
                    value={stock}
                    onChange={(e) => setStock(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)}
                    style={{ width: 64, height: 38, textAlign: 'center', border: 0, borderInline: '1px solid var(--ax-border)', background: 'var(--ax-surface)', fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-text-strong)' }}
                    aria-label={t('ficheProduction.quantiteEnStock')}
                  />
                  <button
                    type="button"
                    onClick={() => setStock((s) => s + 1)}
                    style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ax-surface)', border: 0, cursor: 'pointer', color: 'var(--ax-text)' }}
                    aria-label={t('ficheProduction.augmenterStock')}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 16, height: 16 }}><path d="M12 5l0 14" /><path d="M5 12l14 0" /></svg>
                  </button>
                </div>
                <button type="button" className="ax-btn ax-btn--secondary" disabled={stock === p.stock_disponible}>
                  {t('ficheProduction.enregistrerStock')}
                </button>
              </div>
            </div>

            {p.etiquettes.length > 0 && (
              <>
                <div className="ax-divider" />
                <div>
                  <div className="ax-label" style={{ marginBottom: 'var(--ax-space-2)' }}>{t('ficheProduction.etiquettes')}</div>
                  <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)' }}>
                    {p.etiquettes.map((e) => (
                      <span key={e} className="ax-badge ax-badge--soft ax-badge--neutral" style={{ borderRadius: 'var(--ax-radius-xs)' }}>{e}</span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ===== ONGLETS ===== */}
        <section className="ax-card ax-col--8" role="region" aria-label={t('ficheProduction.informations')}>
          <div className="ax-card__body" style={{ paddingBottom: 0 }}>
            <div className="ax-tabs">
              <div className="ax-tabs__list" role="tablist" aria-label={t('ficheProduction.informations')}>
                {ONGLETS.map((o) => (
                  <button
                    key={o}
                    type="button"
                    className={`ax-tabs__tab${onglet === o ? ' is-active' : ''}`}
                    role="tab"
                    id={`fp-onglet-${o}`}
                    aria-selected={onglet === o}
                    onClick={() => setOnglet(o)}
                  >
                    {t(`ficheProduction.onglets.${o}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="ax-card__body" style={{ paddingTop: 'var(--ax-space-5)' }}>
            {onglet === 'description' && (
              <div role="tabpanel" aria-labelledby="fp-onglet-description">
                <p style={{ color: 'var(--ax-text)', lineHeight: 1.7 }}>{p.description}</p>
              </div>
            )}

            {onglet === 'caracteristiques' && (
              <div role="tabpanel" aria-labelledby="fp-onglet-caracteristiques">
                <dl style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 0, margin: 0 }}>
                  <Caracteristique libelle={t('ficheProduction.caracteristiques.filiere')} valeur={p.filiere_nom} />
                  <Caracteristique libelle={t('ficheProduction.caracteristiques.unite')} valeur={p.unite} />
                  <Caracteristique libelle={t('ficheProduction.caracteristiques.prix')} valeur={formaterFcfa(p.prix_unitaire_fcfa)} mono />
                  <Caracteristique
                    libelle={t('ficheProduction.caracteristiques.prixReference')}
                    valeur={p.prix_barre_fcfa !== null ? formaterFcfa(p.prix_barre_fcfa) : t('ficheProduction.caracteristiques.nonReleve')}
                    mono={p.prix_barre_fcfa !== null}
                  />
                  <Caracteristique libelle={t('ficheProduction.caracteristiques.seuil')} valeur={formaterNombre(p.seuil_alerte)} mono />
                  <Caracteristique libelle={t('ficheProduction.caracteristiques.ajout')} valeur={formaterDateLongue(p.date_ajout)} />
                  <Caracteristique libelle={t('ficheProduction.caracteristiques.groupement')} valeur={p.groupement_nom} />
                  <Caracteristique libelle={t('ficheProduction.caracteristiques.quartier')} valeur={groupement.quartier} />
                </dl>
              </div>
            )}

            {onglet === 'tracabilite' && (
              <div role="tabpanel" aria-labelledby="fp-onglet-tracabilite">
                <p style={{ color: 'var(--ax-text-muted)', fontSize: 'var(--ax-text-sm)', marginBottom: 'var(--ax-space-5)' }}>
                  {t('ficheProduction.tracabilite.intro')}
                </p>

                <ol className="ax-timeline" style={{ listStyle: 'none', margin: 0 }}>
                  {CIRCUIT.map((etat, i) => {
                    const franchi = p.etat_validation === 'rejete' ? i === 0 : i <= rangCircuit;
                    return (
                      <li key={etat} className={`ax-timeline__item${franchi ? ' ax-timeline__item--success' : ''}`}>
                        <span className="ax-timeline__marker" style={franchi ? undefined : { color: 'var(--ax-text-subtle)' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d={franchi ? 'M5 12l5 5l10 -10' : 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0 -18'} />
                          </svg>
                        </span>
                        <div className="ax-timeline__content">
                          <p className="ax-timeline__title">
                            <b style={{ color: 'var(--ax-text-strong)' }}>{tc(`validation.etats.${etat}`)}</b>
                          </p>
                          <span className="ax-timeline__time">{t(`ficheProduction.tracabilite.${etat}`)}</span>
                        </div>
                      </li>
                    );
                  })}
                  {p.etat_validation === 'rejete' && (
                    <li className="ax-timeline__item ax-timeline__item--danger">
                      <span className="ax-timeline__marker">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
                      </span>
                      <div className="ax-timeline__content">
                        <p className="ax-timeline__title"><b style={{ color: 'var(--ax-text-strong)' }}>{tc('validation.etats.rejete')}</b></p>
                        <span className="ax-timeline__time">{t('ficheProduction.tracabilite.rejete')}</span>
                      </div>
                    </li>
                  )}
                </ol>

                <div style={{ marginTop: 'var(--ax-space-5)', padding: 'var(--ax-space-4)', border: '1px solid var(--ax-border)', borderRadius: 'var(--ax-radius-md)', background: 'var(--ax-surface-subtle)' }}>
                  <div className="ax-cluster" style={{ justifyContent: 'space-between', gap: 'var(--ax-space-3)' }}>
                    <span style={{ fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text-muted)' }}>
                      {t('ficheProduction.tracabilite.declaree', { date: formaterDate(p.date_ajout) })}
                    </span>
                    <Link className="ax-link" href="/pages/activity-log">{t('ficheProduction.tracabilite.voirJournal')} →</Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ===== RAIL DE CONTEXTE ===== */}
        <aside className="ax-col--4" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-6)' }}>
          <div className="ax-card" role="region" aria-label={t('ficheProduction.producteur')}>
            <div className="ax-card__header">
              <div className="ax-card__titles"><h2 className="ax-card__title">{t('ficheProduction.producteur')}</h2></div>
            </div>
            <div className="ax-card__body" style={{ paddingTop: 0 }}>
              <div className="ax-cluster" style={{ gap: 'var(--ax-space-3)', flexWrap: 'nowrap' }}>
                <span className="ax-avatar ax-avatar--lg ax-avatar--squircle" style={{ background: 'var(--ax-accent-wash)', color: 'var(--ax-accent)', fontWeight: 700 }}>
                  {initiales(groupement.nom)}
                </span>
                <div style={{ minWidth: 0 }}>
                  <Link
                    href={`/ecommerce/customer-details?groupement=${groupement.slug}`}
                    className="ax-text-truncate"
                    style={{ display: 'block', fontWeight: 'var(--ax-weight-semibold)', color: 'var(--ax-text-strong)', textDecoration: 'none' }}
                  >
                    {groupement.nom}
                  </Link>
                  <div style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>{groupement.responsable}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--ax-space-3)', marginTop: 'var(--ax-space-4)', paddingTop: 'var(--ax-space-3)', borderTop: '1px solid var(--ax-border)' }}>
                <div>
                  <small style={{ display: 'block', color: 'var(--ax-text-subtle)', fontSize: 'var(--ax-text-2xs)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                    {t('ficheProduction.quartier')}
                  </small>
                  <b style={{ color: 'var(--ax-text-strong)', fontSize: 'var(--ax-text-sm)' }}>{groupement.quartier}</b>
                </div>
                <div>
                  <small style={{ display: 'block', color: 'var(--ax-text-subtle)', fontSize: 'var(--ax-text-2xs)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                    {t('ficheProduction.membres')}
                  </small>
                  <b className="ax-num" style={{ color: 'var(--ax-text-strong)', fontSize: 'var(--ax-text-sm)' }}>{groupement.nombreMembres}</b>
                </div>
              </div>
              <div style={{ marginTop: 'var(--ax-space-3)' }}>
                <span className="ax-badge ax-badge--soft ax-badge--accent ax-badge--pill">
                  <span className="ax-badge__dot" />
                  {tc(`etapes.${groupement.etape}`)}
                </span>
              </div>
            </div>
          </div>

          {voisines.length > 0 && (
            <div className="ax-card" role="region" aria-label={t('ficheProduction.voisines')}>
              <div className="ax-card__header">
                <div className="ax-card__titles">
                  <h2 className="ax-card__title">{t('ficheProduction.voisines')}</h2>
                  <p className="ax-card__subtitle">{t('ficheProduction.voisinesSousTitre', { filiere: p.filiere_nom })}</p>
                </div>
              </div>
              <div className="ax-card__body" style={{ paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-3)' }}>
                {voisines.map((v) => (
                  <Link
                    key={v.slug}
                    href={`/ecommerce/product-details?production=${v.slug}`}
                    className="ax-cluster"
                    style={{ gap: 'var(--ax-space-3)', flexWrap: 'nowrap', textDecoration: 'none', padding: 'var(--ax-space-2)', borderRadius: 'var(--ax-radius-sm)' }}
                  >
                    <span style={{ position: 'relative', width: 44, height: 44, flex: 'none', borderRadius: 'var(--ax-radius-sm)', overflow: 'hidden', background: 'var(--ax-surface-subtle)' }}>
                      {v.image && (
                        <Image src={v.image.src} alt="" fill sizes="44px" placeholder="blur" blurDataURL={v.image.flou} style={{ objectFit: 'cover' }} />
                      )}
                    </span>
                    <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                      <div className="ax-text-truncate" style={{ fontWeight: 'var(--ax-weight-medium)', color: 'var(--ax-text-strong)' }}>{v.nom}</div>
                      <div className="ax-text-truncate" style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>{v.groupement}</div>
                    </div>
                    <span className="ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-text-strong)', fontSize: 'var(--ax-text-sm)', whiteSpace: 'nowrap' }}>
                      {formaterFcfa(v.prix)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function Caracteristique({ libelle, valeur, mono }: { libelle: string; valeur: string; mono?: boolean }) {
  return (
    <div style={{ display: 'contents' }}>
      <dt style={{ padding: 'var(--ax-space-3) 0', borderBottom: '1px solid var(--ax-border)', color: 'var(--ax-text-muted)', fontSize: 'var(--ax-text-sm)' }}>
        {libelle}
      </dt>
      <dd
        className={mono ? 'ax-num' : undefined}
        style={{ padding: 'var(--ax-space-3) 0', borderBottom: '1px solid var(--ax-border)', margin: 0, color: 'var(--ax-text-strong)', fontSize: 'var(--ax-text-sm)', textAlign: 'end', ...(mono ? { fontFamily: 'var(--ax-font-mono)' } : {}) }}
      >
        {valeur}
      </dd>
    </div>
  );
}

export default FicheProduction;
