'use client';
/*
 * Catalogue des productions — route « ecommerce/products ».
 *
 * Adapté de l'écran « Ecommerce · Products » de Vireo : rail de filtres collant,
 * catalogue en grille ou en liste, pastilles de filtre actif, sélection
 * multiple, état vide et pagination.
 *
 * Le template affiche un pictogramme coloré à la place des visuels ; ici les
 * productions ont de vraies photos, servies depuis `public/` et posées par
 * `next/image` avec le `blurDataURL` du manifeste — c'est la règle du projet
 * (CLAUDE.md §5) et c'est aussi ce qui fait tenir la démonstration hors ligne.
 *
 * Le prix barré n'est pas une promotion commerciale mais un prix de référence
 * relevé au marché : la commune compare ce que la production se vend en
 * boutique témoin à ce qu'elle se vend ailleurs.
 */
import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageHead } from '../../components/shell/PageHead';
import { Pagination } from '../../components/table/Pagination';
import { formaterFcfa, formaterNombre } from '../../domaine';
import type { EtatValidation, Production } from '../../domaine';

type Tri = 'nom' | 'prix_croissant' | 'prix_decroissant' | 'note' | 'nouveaute' | 'stock';

const TONALITE_VALIDATION: Record<EtatValidation, string> = {
  brouillon: 'neutral',
  soumis: 'warning',
  valide: 'success',
  rejete: 'danger',
};

const ETOILE = (
  <path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873l-6.158 -3.245" />
);
const ICONE_CROIX = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
);

/** Productions par page. Douze remplit trois rangées de quatre en grille. */
const PAR_PAGE = 12;

export interface EntreeFiliere {
  slug: string;
  nom: string;
  teinte: string;
  nombre: number;
}

export interface ProductionAffichee extends Production {
  /**
   * Quartier du groupement producteur. Il n'est pas porté par `Production` :
   * la production appartient au groupement, et c'est lui qui a une adresse.
   * Le serveur fait la jointure pour éviter que l'écran ne la refasse à chaque
   * frappe dans le champ de recherche.
   */
  quartier_slug: string;
  /** Variante « carte » et flou, résolus par le serveur depuis le manifeste. */
  image: { src: string; largeur: number; hauteur: number; flou: string; alt: string } | null;
}

export interface DonneesCatalogue {
  productions: ProductionAffichee[];
  filieres: EntreeFiliere[];
  quartiers: Array<{ slug: string; nom: string }>;
  /** Prix unitaire le plus élevé du catalogue — borne du curseur. */
  prixMaximum: number;
  compteurs: { total: number; enAlerte: number; enRupture: number };
}

export function Catalogue({ donnees }: { donnees: DonneesCatalogue }) {
  const t = useTranslations('ecrans');
  const tc = useTranslations('commun');

  const [recherche, setRecherche] = useState('');
  const [tri, setTri] = useState<Tri>('nom');
  const [vue, setVue] = useState<'grille' | 'liste'>('grille');
  const [selection, setSelection] = useState<number[]>([]);
  const [filiere, setFiliere] = useState('');
  const [quartier, setQuartier] = useState('');
  const [prixMax, setPrixMax] = useState(donnees.prixMaximum);
  const [enStock, setEnStock] = useState(false);
  const [sousSeuil, setSousSeuil] = useState(false);
  const [aValider, setAValider] = useState(false);
  const [noteMin, setNoteMin] = useState(0);
  const [page, setPage] = useState(1);

  const filtresActifs =
    Boolean(filiere) ||
    Boolean(quartier) ||
    enStock ||
    sousSeuil ||
    aValider ||
    noteMin > 0 ||
    prixMax < donnees.prixMaximum;

  const nomFiliere = (slug: string) => donnees.filieres.find((f) => f.slug === slug)?.nom ?? '';

  const changerFiltre = (poser: () => void) => {
    poser();
    setPage(1);
  };
  const reinitialiser = () =>
    changerFiltre(() => {
      setFiliere('');
      setQuartier('');
      setPrixMax(donnees.prixMaximum);
      setEnStock(false);
      setSousSeuil(false);
      setAValider(false);
      setNoteMin(0);
      setRecherche('');
    });

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    const liste = donnees.productions.filter((p) => {
      if (q && !`${p.nom} ${p.groupement_nom} ${p.filiere_nom}`.toLowerCase().includes(q)) return false;
      if (filiere && p.filiere_slug !== filiere) return false;
      if (quartier && p.quartier_slug !== quartier) return false;
      if (p.prix_unitaire_fcfa > prixMax) return false;
      if (enStock && p.stock_disponible === 0) return false;
      if (sousSeuil && !(p.stock_disponible > 0 && p.stock_disponible <= p.seuil_alerte)) return false;
      if (aValider && p.etat_validation === 'valide') return false;
      if (noteMin && p.note_moyenne < noteMin) return false;
      return true;
    });

    const comparateurs: Record<Tri, (a: ProductionAffichee, b: ProductionAffichee) => number> = {
      nom: (a, b) => a.nom.localeCompare(b.nom, 'fr'),
      prix_croissant: (a, b) => a.prix_unitaire_fcfa - b.prix_unitaire_fcfa,
      prix_decroissant: (a, b) => b.prix_unitaire_fcfa - a.prix_unitaire_fcfa,
      note: (a, b) => b.note_moyenne - a.note_moyenne,
      nouveaute: (a, b) => b.date_ajout.localeCompare(a.date_ajout),
      stock: (a, b) => a.stock_disponible - b.stock_disponible,
    };
    return [...liste].sort(comparateurs[tri]);
  }, [donnees.productions, recherche, filiere, quartier, prixMax, enStock, sousSeuil, aValider, noteMin, tri]);

  const pages = Math.max(1, Math.ceil(filtres.length / PAR_PAGE));
  const pageSure = Math.min(page, pages);
  const debut = (pageSure - 1) * PAR_PAGE;
  const affichees = filtres.slice(debut, debut + PAR_PAGE);

  const idsPage = affichees.map((p) => p.id);
  const toutSelectionne = idsPage.length > 0 && idsPage.every((id) => selection.includes(id));
  const basculer = (id: number) =>
    setSelection((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <>
      <PageHead
        title={t('catalogue.titre')}
        subtitle={t('catalogue.sousTitre', {
          total: donnees.compteurs.total,
          alerte: donnees.compteurs.enAlerte,
          rupture: donnees.compteurs.enRupture,
        })}
        actions={
          <>
            <button type="button" className="ax-btn ax-btn--ghost">
              <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 11l5 5l5 -5" /><path d="M12 4l0 12" /></svg>
              <span className="ax-btn__label">{tc('actions.exporter')}</span>
            </button>
            <Link className="ax-btn ax-btn--primary" href="/ecommerce/add-product">
              <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5l0 14" /><path d="M5 12l14 0" /></svg>
              <span className="ax-btn__label">{t('catalogue.declarer')}</span>
            </Link>
          </>
        }
      />

      <div className="ax-dash-grid">
        {/* ===== RAIL DE FILTRES ===== */}
        <aside className="ax-card ax-col--3" role="region" aria-label={tc('filtres.titre')} style={{ alignSelf: 'start', position: 'sticky', top: 'var(--ax-space-5)' }}>
          <div className="ax-card__header">
            <div className="ax-card__titles"><h2 className="ax-card__title">{tc('filtres.titre')}</h2></div>
            {filtresActifs && (
              <button type="button" className="ax-btn ax-btn--link ax-btn--sm" onClick={reinitialiser}>
                {tc('actions.reinitialiser')}
              </button>
            )}
          </div>
          <div className="ax-card__body" style={{ paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-5)' }}>
            <div>
              <div className="ax-label" style={{ marginBottom: 'var(--ax-space-3)' }}>{t('catalogue.filiere')}</div>
              <ul className="ax-list ax-list--compact" style={{ gap: 2 }}>
                {donnees.filieres.map((f) => {
                  const actif = filiere === f.slug;
                  return (
                    <li key={f.slug} className="ax-list__row" style={{ border: 0, padding: 0 }}>
                      <button
                        type="button"
                        onClick={() => changerFiltre(() => setFiliere(actif ? '' : f.slug))}
                        aria-pressed={actif}
                        style={{
                          display: 'flex',
                          width: '100%',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 'var(--ax-space-2)',
                          padding: '6px var(--ax-space-2)',
                          borderRadius: 'var(--ax-radius-sm)',
                          border: 0,
                          cursor: 'pointer',
                          background: actif ? 'var(--ax-accent-wash)' : 'transparent',
                          font: 'inherit',
                          textAlign: 'start',
                        }}
                      >
                        <span className="ax-cluster" style={{ gap: 'var(--ax-space-2)', flexWrap: 'nowrap', minWidth: 0 }}>
                          <i aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 3, background: f.teinte, flex: 'none' }} />
                          <span className="ax-text-truncate" style={{ fontWeight: 'var(--ax-weight-medium)', color: actif ? 'var(--ax-accent)' : 'var(--ax-text)' }}>
                            {f.nom}
                          </span>
                        </span>
                        <span className="ax-num" style={{ fontFamily: 'var(--ax-font-mono)', fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>
                          {f.nombre}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="ax-divider" role="separator" style={{ height: 1, background: 'var(--ax-border)' }} />

            <div>
              <label className="ax-label" htmlFor="filtre-quartier" style={{ display: 'block', marginBottom: 'var(--ax-space-3)' }}>
                {t('catalogue.quartier')}
              </label>
              <select
                id="filtre-quartier"
                className="ax-select ax-select--sm"
                value={quartier}
                onChange={(e) => changerFiltre(() => setQuartier(e.target.value))}
                style={{ width: '100%' }}
              >
                <option value="">{tc('filtres.tousLesQuartiers')}</option>
                {donnees.quartiers.map((q) => (
                  <option key={q.slug} value={q.slug}>{q.nom}</option>
                ))}
              </select>
            </div>

            <div className="ax-divider" role="separator" style={{ height: 1, background: 'var(--ax-border)' }} />

            <div>
              <div className="ax-cluster" style={{ justifyContent: 'space-between', marginBottom: 'var(--ax-space-3)' }}>
                <span className="ax-label">{t('catalogue.prix')}</span>
                <span className="ax-num" style={{ fontFamily: 'var(--ax-font-mono)', fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-muted)' }}>
                  {t('catalogue.jusqua', { montant: formaterFcfa(prixMax) })}
                </span>
              </div>
              <div className="ax-range">
                <div className="ax-range__track">
                  <div className="ax-range__fill" style={{ width: `${(prixMax / donnees.prixMaximum) * 100}%` }} />
                </div>
              </div>
              <input
                type="range"
                className="ax-range--native"
                min={0}
                max={donnees.prixMaximum}
                step={250}
                value={prixMax}
                onChange={(e) => changerFiltre(() => setPrixMax(Number(e.target.value)))}
                style={{ width: '100%', marginTop: 'var(--ax-space-3)' }}
                aria-label={t('catalogue.prixMaximum')}
              />
            </div>

            <div className="ax-divider" role="separator" style={{ height: 1, background: 'var(--ax-border)' }} />

            <div>
              <div className="ax-label" style={{ marginBottom: 'var(--ax-space-3)' }}>{t('catalogue.disponibilite')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-2)' }}>
                <label className="ax-check">
                  <input type="checkbox" className="ax-checkbox" checked={enStock} onChange={(e) => changerFiltre(() => setEnStock(e.target.checked))} />
                  <span style={{ fontSize: 'var(--ax-text-sm)' }}>{t('catalogue.enStock')}</span>
                </label>
                <label className="ax-check">
                  <input type="checkbox" className="ax-checkbox" checked={sousSeuil} onChange={(e) => changerFiltre(() => setSousSeuil(e.target.checked))} />
                  <span style={{ fontSize: 'var(--ax-text-sm)' }}>{t('catalogue.sousSeuil')}</span>
                </label>
                <label className="ax-check">
                  <input type="checkbox" className="ax-checkbox" checked={aValider} onChange={(e) => changerFiltre(() => setAValider(e.target.checked))} />
                  <span style={{ fontSize: 'var(--ax-text-sm)' }}>{t('catalogue.aValider')}</span>
                </label>
              </div>
            </div>

            <div className="ax-divider" role="separator" style={{ height: 1, background: 'var(--ax-border)' }} />

            <div>
              <div className="ax-label" style={{ marginBottom: 'var(--ax-space-3)' }}>{t('catalogue.appreciation')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-1)' }}>
                {[4, 3, 2].map((note) => (
                  <label key={note} className="ax-check" style={{ minHeight: 32 }}>
                    <input
                      type="radio"
                      name="note-minimale"
                      className="ax-radio"
                      value={note}
                      checked={noteMin === note}
                      onChange={() => changerFiltre(() => setNoteMin(note))}
                    />
                    <span className="ax-rating ax-rating--sm" aria-hidden="true">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <svg key={s} className={`ax-rating__star${s <= note ? ' ax-rating__star--full' : ''}`} viewBox="0 0 24 24" fill={s <= note ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">{ETOILE}</svg>
                      ))}
                    </span>
                    <span style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>{t('catalogue.etPlus')}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* ===== RÉSULTATS ===== */}
        <section className="ax-card ax-col--9" role="region" aria-label={t('catalogue.resultats')}>
          <div className="ax-card__header" style={{ flexWrap: 'wrap', gap: 'var(--ax-space-3)' }}>
            <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 360 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ position: 'absolute', insetInlineStart: 11, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: 'var(--ax-text-subtle)' }}><path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" /></svg>
              <input
                type="search"
                className="ax-input"
                placeholder={t('catalogue.rechercher')}
                value={recherche}
                onChange={(e) => changerFiltre(() => setRecherche(e.target.value))}
                style={{ paddingInlineStart: 36 }}
                aria-label={t('catalogue.rechercher')}
              />
            </div>
            <div className="ax-card__actions" style={{ flexWrap: 'wrap', gap: 'var(--ax-space-2)' }}>
              <select
                className="ax-select ax-select--sm"
                value={tri}
                onChange={(e) => setTri(e.target.value as Tri)}
                aria-label={tc('table.trier')}
                style={{ minWidth: 170 }}
              >
                <option value="nom">{t('catalogue.tri.nom')}</option>
                <option value="nouveaute">{t('catalogue.tri.nouveaute')}</option>
                <option value="prix_croissant">{t('catalogue.tri.prixCroissant')}</option>
                <option value="prix_decroissant">{t('catalogue.tri.prixDecroissant')}</option>
                <option value="note">{t('catalogue.tri.note')}</option>
                <option value="stock">{t('catalogue.tri.stock')}</option>
              </select>
              <div className="ax-segment" role="group" aria-label={t('catalogue.modeAffichage')}>
                <button type="button" className={`ax-segment__option${vue === 'grille' ? ' is-active' : ''}`} aria-pressed={vue === 'grille'} onClick={() => setVue('grille')} aria-label={t('catalogue.vueGrille')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4" /><path d="M14 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4" /><path d="M4 15a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4" /><path d="M14 15a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4" /></svg>
                </button>
                <button type="button" className={`ax-segment__option${vue === 'liste' ? ' is-active' : ''}`} aria-pressed={vue === 'liste'} onClick={() => setVue('liste')} aria-label={t('catalogue.vueListe')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l11 0" /><path d="M9 12l11 0" /><path d="M9 18l11 0" /><path d="M5 6l0 .01" /><path d="M5 12l0 .01" /><path d="M5 18l0 .01" /></svg>
                </button>
              </div>
            </div>
          </div>

          {filtresActifs && (
            <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)', padding: '0 var(--ax-space-5) var(--ax-space-3)', flexWrap: 'wrap' }}>
              {filiere && <PastilleFiltre libelle={nomFiliere(filiere)} onRetirer={() => changerFiltre(() => setFiliere(''))} />}
              {quartier && (
                <PastilleFiltre
                  libelle={donnees.quartiers.find((q) => q.slug === quartier)?.nom ?? ''}
                  onRetirer={() => changerFiltre(() => setQuartier(''))}
                />
              )}
              {enStock && <PastilleFiltre libelle={t('catalogue.enStock')} onRetirer={() => changerFiltre(() => setEnStock(false))} />}
              {sousSeuil && <PastilleFiltre libelle={t('catalogue.sousSeuil')} onRetirer={() => changerFiltre(() => setSousSeuil(false))} />}
              {aValider && <PastilleFiltre libelle={t('catalogue.aValider')} onRetirer={() => changerFiltre(() => setAValider(false))} />}
              {noteMin > 0 && (
                <PastilleFiltre libelle={t('catalogue.noteMinimale', { note: noteMin })} onRetirer={() => changerFiltre(() => setNoteMin(0))} />
              )}
            </div>
          )}

          {selection.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ax-space-3)', margin: '0 var(--ax-space-5) var(--ax-space-3)', padding: 'var(--ax-space-2) var(--ax-space-4)', background: 'var(--ax-accent-wash)', border: '1px solid var(--ax-accent)', borderRadius: 'var(--ax-radius-md)', flexWrap: 'wrap' }}>
              <b className="ax-num" style={{ color: 'var(--ax-accent)', fontSize: 'var(--ax-text-sm)' }}>
                {tc('table.lignesSelectionnees', { nombre: selection.length })}
              </b>
              <span style={{ width: 1, height: 18, background: 'var(--ax-border-strong)' }} />
              <button type="button" className="ax-btn ax-btn--ghost ax-btn--sm">{tc('validation.valider')}</button>
              <button type="button" className="ax-btn ax-btn--ghost ax-btn--sm">{t('catalogue.actions.mettreEnAvant')}</button>
              <button type="button" className="ax-btn ax-btn--ghost ax-btn--sm">{tc('actions.exporter')}</button>
              <span style={{ flex: '1 1 auto' }} />
              <button type="button" className="ax-btn ax-btn--ghost ax-btn--icon ax-btn--sm" aria-label={t('catalogue.actions.viderSelection')} onClick={() => setSelection([])}>
                <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
              </button>
            </div>
          )}

          <div className="ax-card__body" style={{ paddingTop: 0 }}>
            {/* --- GRILLE --- */}
            {vue === 'grille' && affichees.length > 0 && (
              <div className="ax-grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 'var(--ax-space-4)' }}>
                {affichees.map((p) => {
                  const enRupture = p.stock_disponible === 0;
                  const sousLeSeuil = !enRupture && p.stock_disponible <= p.seuil_alerte;
                  return (
                    <article
                      key={p.id}
                      className="ax-card ax-card--interactive"
                      style={{ margin: 0, ...(selection.includes(p.id) ? { borderColor: 'var(--ax-accent)', boxShadow: '0 0 0 1px var(--ax-accent)' } : {}) }}
                    >
                      <div style={{ position: 'relative', aspectRatio: '4/3', borderRadius: 'var(--ax-radius-md) var(--ax-radius-md) 0 0', overflow: 'hidden', background: 'var(--ax-surface-subtle)' }}>
                        {p.image ? (
                          <Image
                            src={p.image.src}
                            alt={p.image.alt}
                            fill
                            sizes="(max-width: 700px) 50vw, 220px"
                            placeholder="blur"
                            blurDataURL={p.image.flou}
                            style={{ objectFit: 'cover' }}
                          />
                        ) : null}
                        {p.prix_barre_fcfa !== null && (
                          <span className="ax-badge ax-badge--accent ax-badge--solid" style={{ position: 'absolute', top: 8, insetInlineStart: 8, borderRadius: 'var(--ax-radius-xs)' }}>
                            {t('catalogue.sousLePrixDuMarche')}
                          </span>
                        )}
                        <input
                          type="checkbox"
                          className="ax-checkbox"
                          checked={selection.includes(p.id)}
                          onChange={() => basculer(p.id)}
                          style={{ position: 'absolute', top: 8, insetInlineEnd: 8 }}
                          aria-label={t('catalogue.selectionner', { nom: p.nom })}
                        />
                        {enRupture && (
                          <div className="ax-flex" style={{ position: 'absolute', inset: 0, background: 'color-mix(in oklab,var(--ax-canvas) 62%,transparent)', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="ax-badge ax-badge--neutral ax-badge--soft">{t('catalogue.enRupture')}</span>
                          </div>
                        )}
                      </div>
                      <div style={{ padding: 'var(--ax-space-4)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ fontSize: 'var(--ax-text-2xs)', textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ax-text-subtle)', fontWeight: 'var(--ax-weight-medium)' }}>
                          {p.filiere_nom}
                        </span>
                        <Link
                          href={`/ecommerce/product-details?production=${p.slug}`}
                          className="ax-text-truncate"
                          style={{ fontWeight: 'var(--ax-weight-semibold)', color: 'var(--ax-text-strong)', textDecoration: 'none', lineHeight: 1.35 }}
                        >
                          {p.nom}
                        </Link>
                        <div className="ax-text-truncate" style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>{p.groupement_nom}</div>
                        <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)', minHeight: 18 }}>
                          {p.nombre_appreciations > 0 ? (
                            <>
                              <Etoiles note={p.note_moyenne} />
                              <span className="ax-num" style={{ fontFamily: 'var(--ax-font-mono)', fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>
                                ({p.nombre_appreciations})
                              </span>
                            </>
                          ) : (
                            <span style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>
                              {t('catalogue.pasEncoreNotee')}
                            </span>
                          )}
                        </div>
                        <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)', marginTop: 2 }}>
                          <span className="ax-num" style={{ fontFamily: 'var(--ax-font-mono)', fontWeight: 'var(--ax-weight-semibold)', color: 'var(--ax-text-strong)', fontSize: 'var(--ax-text-md)' }}>
                            {formaterFcfa(p.prix_unitaire_fcfa)}
                          </span>
                          <span style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>/ {p.unite}</span>
                          {/* Le prix de référence est barré et placé après : c'est le
                              prix pratiqué qui doit se lire en premier. */}
                          {p.prix_barre_fcfa !== null && (
                            <span className="ax-num" style={{ fontFamily: 'var(--ax-font-mono)', fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)', textDecoration: 'line-through' }}>
                              {formaterFcfa(p.prix_barre_fcfa)}
                            </span>
                          )}
                        </div>
                        <div className="ax-cluster" style={{ justifyContent: 'space-between', marginTop: 'var(--ax-space-2)' }}>
                          <PastilleStock enRupture={enRupture} sousLeSeuil={sousLeSeuil} stock={p.stock_disponible} />
                          <span className={`ax-badge ax-badge--soft ax-badge--pill ax-badge--sm ax-badge--${TONALITE_VALIDATION[p.etat_validation]}`}>
                            {tc(`validation.etats.${p.etat_validation}`)}
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* --- LISTE --- */}
            {vue === 'liste' && affichees.length > 0 && (
              <div className="ax-table-wrap" style={{ margin: '0 calc(-1 * var(--ax-space-5))' }}>
                <table className="ax-table ax-table--hover">
                  <thead className="ax-table__head">
                    <tr>
                      <th className="ax-table__th" scope="col" style={{ width: 38 }}>
                        <input
                          type="checkbox"
                          className="ax-checkbox"
                          aria-label={t('catalogue.selectionnerPage')}
                          checked={toutSelectionne}
                          onChange={(e) =>
                            setSelection((s) =>
                              e.target.checked ? [...new Set([...s, ...idsPage])] : s.filter((id) => !idsPage.includes(id)),
                            )
                          }
                        />
                      </th>
                      <th className="ax-table__th" scope="col">{t('catalogue.colonneProduction')}</th>
                      <th className="ax-table__th" scope="col">{t('catalogue.colonneGroupement')}</th>
                      <th className="ax-table__th ax-table__th--num" scope="col">{t('catalogue.colonnePrix')}</th>
                      <th className="ax-table__th ax-table__th--num" scope="col">{t('catalogue.colonneStock')}</th>
                      <th className="ax-table__th ax-table__th--num" scope="col">{t('catalogue.colonneNote')}</th>
                      <th className="ax-table__th" scope="col">{t('catalogue.colonneFiche')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {affichees.map((p) => {
                      const enRupture = p.stock_disponible === 0;
                      const sousLeSeuil = !enRupture && p.stock_disponible <= p.seuil_alerte;
                      return (
                        <tr key={p.id} className="ax-table__row" style={selection.includes(p.id) ? { background: 'var(--ax-accent-wash)' } : undefined}>
                          <td className="ax-table__td">
                            <input
                              type="checkbox"
                              className="ax-checkbox"
                              checked={selection.includes(p.id)}
                              onChange={() => basculer(p.id)}
                              aria-label={t('catalogue.selectionner', { nom: p.nom })}
                            />
                          </td>
                          <td className="ax-table__td">
                            <div className="ax-cluster" style={{ gap: 'var(--ax-space-3)', flexWrap: 'nowrap' }}>
                              <span style={{ position: 'relative', width: 44, height: 44, flex: 'none', borderRadius: 'var(--ax-radius-sm)', overflow: 'hidden', background: 'var(--ax-surface-subtle)' }}>
                                {p.image && (
                                  <Image
                                    src={p.image.src}
                                    alt=""
                                    fill
                                    sizes="44px"
                                    placeholder="blur"
                                    blurDataURL={p.image.flou}
                                    style={{ objectFit: 'cover' }}
                                  />
                                )}
                              </span>
                              <div style={{ minWidth: 0 }}>
                                <Link href={`/ecommerce/product-details?production=${p.slug}`} style={{ fontWeight: 'var(--ax-weight-medium)', color: 'var(--ax-text-strong)', textDecoration: 'none' }}>
                                  {p.nom}
                                </Link>
                                <div style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>{p.filiere_nom}</div>
                              </div>
                            </div>
                          </td>
                          <td className="ax-table__td" style={{ color: 'var(--ax-text-muted)' }}>{p.groupement_nom}</td>
                          <td className="ax-table__td ax-table__td--num ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-text-strong)', whiteSpace: 'nowrap' }}>
                            {formaterFcfa(p.prix_unitaire_fcfa)}
                            <div style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>/ {p.unite}</div>
                          </td>
                          <td className="ax-table__td ax-table__td--num ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: enRupture ? 'var(--ax-danger-500)' : sousLeSeuil ? 'var(--ax-warning-500)' : 'var(--ax-text-muted)' }}>
                            {formaterNombre(p.stock_disponible)}
                          </td>
                          <td className="ax-table__td ax-table__td--num ax-num" style={{ fontFamily: 'var(--ax-font-mono)', color: 'var(--ax-text-muted)' }}>
                            {p.nombre_appreciations > 0 ? p.note_moyenne.toFixed(1).replace('.', ',') : '—'}
                          </td>
                          <td className="ax-table__td">
                            <span className={`ax-badge ax-badge--soft ax-badge--pill ax-badge--sm ax-badge--${TONALITE_VALIDATION[p.etat_validation]}`}>
                              <span className="ax-badge__dot" />
                              {tc(`validation.etats.${p.etat_validation}`)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {affichees.length === 0 && (
              <div style={{ textAlign: 'center', padding: 'var(--ax-space-10) var(--ax-space-5)' }}>
                <span className="ax-avatar ax-avatar--xl ax-avatar--squircle" style={{ background: 'var(--ax-surface-subtle)', color: 'var(--ax-text-subtle)', margin: '0 auto var(--ax-space-4)' }}>
                  <svg className="ax-avatar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 28, height: 28 }}><path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" /></svg>
                </span>
                <h3 style={{ color: 'var(--ax-text-strong)', fontFamily: 'var(--ax-font-display)', marginBottom: 'var(--ax-space-2)' }}>
                  {tc('table.aucunResultat')}
                </h3>
                <p style={{ color: 'var(--ax-text-muted)', fontSize: 'var(--ax-text-sm)', marginBottom: 'var(--ax-space-4)' }}>
                  {t('catalogue.aucunResultatIndice')}
                </p>
                <button type="button" className="ax-btn ax-btn--secondary" onClick={reinitialiser}>
                  {tc('actions.reinitialiser')}
                </button>
              </div>
            )}
          </div>

          {affichees.length > 0 && (
            <div className="ax-card__footer ax-flex" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--ax-space-3)' }}>
              <span className="ax-pagination__summary ax-num" style={{ fontFamily: 'var(--ax-font-mono)', fontSize: 'var(--ax-text-xs)' }}>
                {tc('table.pagination', { debut: debut + 1, fin: debut + affichees.length, total: filtres.length })}
              </span>
              <Pagination
                courante={pageSure}
                total={pages}
                onChanger={setPage}
                etiquettes={{
                  navigation: t('catalogue.pagination'),
                  precedente: t('catalogue.pagePrecedente'),
                  suivante: t('catalogue.pageSuivante'),
                  page: (numero) => t('catalogue.allerPage', { numero }),
                }}
              />
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function Etoiles({ note }: { note: number }): ReactElement {
  const pleines = Math.round(note);
  return (
    <span className="ax-rating ax-rating--sm" aria-label={`${note.toFixed(1).replace('.', ',')} / 5`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`ax-rating__star${s <= pleines ? ' ax-rating__star--full' : ''}`}
          viewBox="0 0 24 24"
          fill={s <= pleines ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {ETOILE}
        </svg>
      ))}
    </span>
  );
}

function PastilleStock({ enRupture, sousLeSeuil, stock }: { enRupture: boolean; sousLeSeuil: boolean; stock: number }) {
  const t = useTranslations('ecrans');
  if (enRupture) {
    return (
      <span className="ax-badge ax-badge--danger ax-badge--soft" style={{ borderRadius: 'var(--ax-radius-xs)' }}>
        {t('catalogue.enRupture')}
      </span>
    );
  }
  if (sousLeSeuil) {
    return (
      <span className="ax-badge ax-badge--warning ax-badge--soft" style={{ borderRadius: 'var(--ax-radius-xs)' }}>
        {t('catalogue.restant', { nombre: stock })}
      </span>
    );
  }
  return (
    <span className="ax-badge ax-badge--success ax-badge--soft" style={{ borderRadius: 'var(--ax-radius-xs)' }}>
      {t('catalogue.enStock')}
    </span>
  );
}

function PastilleFiltre({ libelle, onRetirer }: { libelle: string; onRetirer: () => void }) {
  return (
    <span className="ax-badge ax-badge--accent ax-badge--soft ax-badge--pill">
      <span>{libelle}</span>
      <button type="button" className="ax-badge__remove" aria-label={`Retirer le filtre ${libelle}`} onClick={onRetirer}>
        {ICONE_CROIX}
      </button>
    </span>
  );
}

export default Catalogue;
