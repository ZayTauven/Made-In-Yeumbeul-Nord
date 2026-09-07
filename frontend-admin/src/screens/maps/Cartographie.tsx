'use client';
/*
 * Cartographie des groupements — route « maps/leaflet ».
 *
 * Adapté de l'écran « Leaflet Maps » de Vireo. La carte est réelle : fonds de
 * plan CARTO/OSM sans clé d'API, marqueurs, popups thématisées, périmètres de
 * quartier et couche de densité. Le contenu est le territoire de Yeumbeul Nord.
 *
 * Deux écarts avec le template :
 *
 *  - les « régions » sont des cercles centrés sur le chef-lieu de chaque
 *    quartier, et non des polygones : la commune n'a pas fourni de découpage
 *    géographique, et en dessiner un de mémoire serait inventer une donnée
 *    administrative. Le jour où le GeoJSON arrivera, seule la fonction
 *    `poserQuartiers` change ;
 *  - la couche de densité est proportionnelle au nombre de groupements
 *    recensés, pas à un chiffre d'affaires.
 *
 * **Réserve connue pour la démonstration :** les tuiles CARTO/OSM sont
 * distantes. Un plan de repli hors ligne est requis avant le 31 octobre 2026 ;
 * voir CLAUDE.md §5.
 *
 * Leaflet est importé paresseusement dans un effet — la bibliothèque touche à
 * `window` et ne peut pas être évaluée au rendu serveur.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
// eslint-disable-next-line import/no-unresolved
import 'leaflet/dist/leaflet.css';
import '../../styles/leaflet-theme.css';
import { useTranslations } from 'next-intl';
import { PageHead } from '../../components/shell/PageHead';
import { formaterNombre } from '../../domaine';
import type { EtapeAccompagnement } from '../../domaine';

/**
 * Résout une valeur de token en couleur concrète.
 * Les teintes du domaine arrivent sous la forme `var(--ax-chart-3)` : Leaflet
 * dessine sur un canevas et n'interprète pas les variables CSS, il lui faut la
 * couleur calculée.
 */
function resoudreTeinte(teinte: string, repli = '#1E856C'): string {
  if (typeof document === 'undefined') return repli;
  const nom = teinte.trim().startsWith('var(') ? teinte.trim().slice(4, -1).trim() : teinte;
  if (!nom.startsWith('--')) return nom || repli;
  return getComputedStyle(document.documentElement).getPropertyValue(nom).trim() || repli;
}

const FONDS: Record<string, { url: string; attribution: string; sousDomaines: string; zoomMax: number }> = {
  positron: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap · © CARTO',
    sousDomaines: 'abcd',
    zoomMax: 20,
  },
  voyager: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap · © CARTO',
    sousDomaines: 'abcd',
    zoomMax: 20,
  },
  sombre: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap · © CARTO',
    sousDomaines: 'abcd',
    zoomMax: 20,
  },
};

const CLES_FONDS = ['positron', 'voyager', 'sombre'] as const;

/** Rayon du cercle de quartier, en mètres. Ordre de grandeur d'un quartier urbain. */
const RAYON_QUARTIER = 550;

/* ------------------------------------------------------------------------- *
 * Contrat de props
 * ------------------------------------------------------------------------- */

export interface PointGroupement {
  id: number;
  nom: string;
  slug: string;
  latitude: number;
  longitude: number;
  quartier: string;
  filiere: string;
  filiereSlug: string;
  filiereTeinte: string;
  etape: EtapeAccompagnement;
  nombreMembres: number;
}

export interface QuartierCarte {
  id: number;
  nom: string;
  slug: string;
  latitude: number;
  longitude: number;
  nombreGroupements: number;
  populationEstimee: number;
  /** Part des groupements de la commune implantés ici, 0–100. */
  partCommune: number;
}

export interface BoutiqueCarte {
  id: number;
  nom: string;
  quartier: string;
  latitude: number;
  longitude: number;
  responsable: string;
  horaires: string;
}

export interface DonneesCartographie {
  groupements: PointGroupement[];
  quartiers: QuartierCarte[];
  boutiques: BoutiqueCarte[];
  filieres: Array<{ slug: string; nom: string; teinte: string }>;
  centre: [number, number];
}

/* eslint-disable @typescript-eslint/no-explicit-any -- Leaflet n'expose pas de
   types utilisables sans charger la bibliothèque au rendu serveur. */

export function Cartographie({ donnees }: { donnees: DonneesCartographie }) {
  const t = useTranslations('ecrans');
  const tc = useTranslations('commun');

  const [fond, setFond] = useState<string>('positron');
  const [filiere, setFiliere] = useState('');
  const [voirQuartiers, setVoirQuartiers] = useState(true);
  const [voirGroupements, setVoirGroupements] = useState(true);
  const [voirDensite, setVoirDensite] = useState(false);
  const [voirBoutiques, setVoirBoutiques] = useState(false);
  const [quartierActif, setQuartierActif] = useState<string>(donnees.quartiers[0]?.slug ?? '');

  const conteneur = useRef<HTMLDivElement>(null);
  const carte = useRef<{
    L: any;
    map: any;
    tuiles: any;
    marqueurs: Map<number, any>;
    coucheQuartiers: any;
    coucheDensite: any;
    coucheBoutiques: any;
  }>({
    L: null,
    map: null,
    tuiles: null,
    marqueurs: new Map(),
    coucheQuartiers: null,
    coucheDensite: null,
    coucheBoutiques: null,
  });

  /*
   * Les popups sont du HTML construit à la main, hors du rendu React : leurs
   * libellés doivent donc être capturés dans une référence que l'effet relit,
   * sans quoi il faudrait remonter la carte à chaque changement de langue.
   */
  const libelles = useRef({
    membres: '',
    etapes: {} as Record<string, string>,
    boutiqueResponsable: '',
  });
  libelles.current = {
    membres: t('cartographie.popupMembres'),
    etapes: {
      identifie: tc('etapes.identifie'),
      forme: tc('etapes.forme'),
      certifie: tc('etapes.certifie'),
      formalise: tc('etapes.formalise'),
      equipe: tc('etapes.equipe'),
      en_production: tc('etapes.en_production'),
      autonome: tc('etapes.autonome'),
    },
    boutiqueResponsable: t('cartographie.popupResponsable'),
  };

  const visibles = useMemo(
    () => (filiere ? donnees.groupements.filter((g) => g.filiereSlug === filiere) : donnees.groupements),
    [donnees.groupements, filiere],
  );

  /* --------------------------------------------------------------------- *
   * Construction de la carte, une seule fois
   * --------------------------------------------------------------------- */
  useEffect(() => {
    let annule = false;
    if (!conteneur.current) return;

    import('leaflet').then((mod) => {
      const L = (mod as any).default ?? mod;
      if (annule || !conteneur.current || carte.current.map) return;

      const map = L.map(conteneur.current, {
        zoomControl: false,
        attributionControl: true,
        center: donnees.centre,
        zoom: 14,
        scrollWheelZoom: false,
      });
      map.attributionControl.setPrefix('');
      carte.current.L = L;
      carte.current.map = map;

      const f = FONDS.positron;
      carte.current.tuiles = L.tileLayer(f.url, {
        attribution: f.attribution,
        subdomains: f.sousDomaines,
        maxZoom: f.zoomMax,
      }).addTo(map);

      for (const g of donnees.groupements) {
        const marqueur = L.marker([g.latitude, g.longitude], { icon: icone(L, g.filiereTeinte) });
        marqueur.bindPopup(popupGroupement(g, libelles.current), {
          closeButton: false,
          className: 'ax-leaflet-popup',
        });
        carte.current.marqueurs.set(g.id, marqueur);
        marqueur.addTo(map);
      }

      poserQuartiers();
      setTimeout(() => map.invalidateSize(), 60);
    });

    return () => {
      annule = true;
      if (carte.current.map) {
        carte.current.map.remove();
        carte.current = {
          L: null,
          map: null,
          tuiles: null,
          marqueurs: new Map(),
          coucheQuartiers: null,
          coucheDensite: null,
          coucheBoutiques: null,
        };
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------------------------------------------------------- *
   * Couches
   * --------------------------------------------------------------------- */

  function poserQuartiers() {
    const { L, map } = carte.current;
    if (!L || !map || carte.current.coucheQuartiers) return;
    const accent = resoudreTeinte('var(--ax-accent)');
    carte.current.coucheQuartiers = L.layerGroup(
      donnees.quartiers.map((q) =>
        L.circle([q.latitude, q.longitude], {
          radius: RAYON_QUARTIER,
          color: accent,
          weight: 1.5,
          fillColor: accent,
          fillOpacity: 0.1,
        }).bindTooltip(q.nom, { permanent: false, direction: 'top' }),
      ),
    ).addTo(map);
  }

  function retirerQuartiers() {
    const { map } = carte.current;
    if (carte.current.coucheQuartiers) {
      map.removeLayer(carte.current.coucheQuartiers);
      carte.current.coucheQuartiers = null;
    }
  }

  function poserDensite() {
    const { L, map } = carte.current;
    if (!L || !map || carte.current.coucheDensite) return;
    const teinte = resoudreTeinte('var(--ax-viz-pink)', '#F472B6');
    carte.current.coucheDensite = L.layerGroup(
      donnees.quartiers.map((q) =>
        L.circle([q.latitude, q.longitude], {
          // Le rayon suit le nombre de groupements recensés : c'est la densité
          // d'accompagnement qu'on montre, pas la densité de population.
          radius: 260 + q.nombreGroupements * 55,
          stroke: false,
          fillColor: teinte,
          fillOpacity: 0.18,
        }),
      ),
    ).addTo(map);
  }

  function retirerDensite() {
    const { map } = carte.current;
    if (carte.current.coucheDensite) {
      map.removeLayer(carte.current.coucheDensite);
      carte.current.coucheDensite = null;
    }
  }

  function poserBoutiques() {
    const { L, map } = carte.current;
    if (!L || !map || carte.current.coucheBoutiques) return;
    const teinte = resoudreTeinte('var(--ax-viz-amber)', '#FBBF24');
    carte.current.coucheBoutiques = L.layerGroup(
      donnees.boutiques.map((b) => {
        const marqueur = L.marker([b.latitude, b.longitude], { icon: icone(L, teinte, 18) });
        marqueur.bindPopup(popupBoutique(b, libelles.current), {
          closeButton: false,
          className: 'ax-leaflet-popup',
        });
        return marqueur;
      }),
    ).addTo(map);
  }

  function retirerBoutiques() {
    const { map } = carte.current;
    if (carte.current.coucheBoutiques) {
      map.removeLayer(carte.current.coucheBoutiques);
      carte.current.coucheBoutiques = null;
    }
  }

  // Fond de plan.
  useEffect(() => {
    const { L, map } = carte.current;
    if (!L || !map) return;
    if (carte.current.tuiles) map.removeLayer(carte.current.tuiles);
    const f = FONDS[fond] ?? FONDS.positron;
    carte.current.tuiles = L.tileLayer(f.url, {
      attribution: f.attribution,
      subdomains: f.sousDomaines,
      maxZoom: f.zoomMax,
    }).addTo(map);
  }, [fond]);

  // Marqueurs : visibilité globale et filtre par filière, en un seul passage.
  useEffect(() => {
    const { map, marqueurs } = carte.current;
    if (!map) return;
    const retenus = new Set(visibles.map((g) => g.id));
    for (const [id, marqueur] of marqueurs) {
      const doitParaitre = voirGroupements && retenus.has(id);
      const present = map.hasLayer(marqueur);
      if (doitParaitre && !present) marqueur.addTo(map);
      if (!doitParaitre && present) map.removeLayer(marqueur);
    }
  }, [visibles, voirGroupements]);

  useEffect(() => {
    if (!carte.current.map) return;
    if (voirQuartiers) poserQuartiers();
    else retirerQuartiers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voirQuartiers]);

  useEffect(() => {
    if (!carte.current.map) return;
    if (voirDensite) poserDensite();
    else retirerDensite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voirDensite]);

  useEffect(() => {
    if (!carte.current.map) return;
    if (voirBoutiques) poserBoutiques();
    else retirerBoutiques();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voirBoutiques]);

  // Quartier actif : recentrage.
  useEffect(() => {
    const { map } = carte.current;
    if (!map) return;
    const q = donnees.quartiers.find((x) => x.slug === quartierActif);
    if (q) map.panTo([q.latitude, q.longitude]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quartierActif]);

  // Rethématisation : le changement d'accent repeint les couches vectorielles.
  useEffect(() => {
    const surChangement = () => {
      if (carte.current.coucheQuartiers) {
        retirerQuartiers();
        poserQuartiers();
      }
      if (carte.current.coucheDensite) {
        retirerDensite();
        poserDensite();
      }
    };
    document.addEventListener('ax:change', surChangement);
    return () => document.removeEventListener('ax:change', surChangement);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <PageHead
        title={t('cartographie.titre')}
        subtitle={t('cartographie.sousTitre', {
          groupements: donnees.groupements.length,
          quartiers: donnees.quartiers.length,
        })}
        actions={
          <>
            <button type="button" className="ax-btn ax-btn--secondary ax-btn--pill">
              <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4l-8 4l8 4l8 -4l-8 -4" /><path d="M4 12l8 4l8 -4" /><path d="M4 16l8 4l8 -4" /></svg>
              <span className="ax-btn__label">{t('cartographie.gererCouches')}</span>
            </button>
            <button type="button" className="ax-btn ax-btn--primary">
              <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 11l5 5l5 -5" /><path d="M12 4l0 12" /></svg>
              <span className="ax-btn__label">{t('cartographie.exporter')}</span>
            </button>
          </>
        }
      />

      <div className="ax-dash-grid">
        {/* ===== RAIL DE CONTRÔLES ===== */}
        <section className="ax-card ax-col--4" role="region" aria-label={t('cartographie.controlesTitre')}>
          <div className="ax-card__header">
            <div className="ax-card__titles">
              <span className="ax-card__eyebrow">{t('cartographie.eyebrow')}</span>
              <h2 className="ax-card__title">{t('cartographie.controlesTitre')}</h2>
              <p className="ax-card__subtitle">{t('cartographie.controlesSousTitre')}</p>
            </div>
          </div>
          <div className="ax-card__body" style={{ paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-4)' }}>
            <div>
              <div style={{ fontSize: 'var(--ax-text-xs)', textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ax-text-subtle)', marginBottom: 'var(--ax-space-2)' }}>
                {t('cartographie.fondDePlan')}
              </div>
              <div style={{ display: 'grid', gap: 'var(--ax-space-2)' }}>
                {CLES_FONDS.map((cle) => (
                  <label
                    key={cle}
                    className={`ax-cluster${fond === cle ? ' is-selected' : ''}`}
                    style={{
                      gap: 'var(--ax-space-3)',
                      padding: 'var(--ax-space-3)',
                      border: '1px solid var(--ax-border)',
                      borderRadius: 'var(--ax-radius-sm)',
                      cursor: 'pointer',
                      flexWrap: 'nowrap',
                      ...(fond === cle ? { borderColor: 'var(--ax-accent)', background: 'var(--ax-accent-wash)' } : {}),
                    }}
                  >
                    <input
                      type="radio"
                      name="fond-de-plan"
                      className="ax-radio"
                      value={cle}
                      checked={fond === cle}
                      onChange={() => setFond(cle)}
                      aria-label={t(`cartographie.fonds.${cle}.nom`)}
                    />
                    <span style={{ flex: '1 1 auto', minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 'var(--ax-weight-medium)', color: 'var(--ax-text-strong)', fontSize: 'var(--ax-text-sm)' }}>
                        {t(`cartographie.fonds.${cle}.nom`)}
                      </span>
                      <span style={{ display: 'block', fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>
                        {t(`cartographie.fonds.${cle}.detail`)}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="ax-divider" />

            <div>
              <div style={{ fontSize: 'var(--ax-text-xs)', textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ax-text-subtle)', marginBottom: 'var(--ax-space-2)' }}>
                {t('cartographie.couches')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-3)' }}>
                <Bascule
                  pastille={<i style={{ width: 11, height: 11, borderRadius: 3, background: 'color-mix(in oklab,var(--ax-accent) 45%,transparent)' }} />}
                  libelle={t('cartographie.couchesQuartiers')}
                  actif={voirQuartiers}
                  onChanger={setVoirQuartiers}
                />
                <Bascule
                  pastille={<i style={{ width: 11, height: 11, borderRadius: '50%', background: 'var(--ax-accent)' }} />}
                  libelle={t('cartographie.couchesGroupements')}
                  actif={voirGroupements}
                  onChanger={setVoirGroupements}
                />
                <Bascule
                  pastille={<i style={{ width: 11, height: 11, borderRadius: '50%', background: 'radial-gradient(circle,var(--ax-viz-pink),transparent 70%)' }} />}
                  libelle={t('cartographie.couchesDensite')}
                  actif={voirDensite}
                  onChanger={setVoirDensite}
                />
                <Bascule
                  pastille={<i style={{ width: 11, height: 11, borderRadius: '50%', background: 'var(--ax-viz-amber)' }} />}
                  libelle={t('cartographie.couchesBoutiques')}
                  actif={voirBoutiques}
                  onChanger={setVoirBoutiques}
                />
              </div>
            </div>

            <div className="ax-divider" />

            <div>
              <label
                htmlFor="filtre-filiere"
                style={{ display: 'block', fontSize: 'var(--ax-text-xs)', textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ax-text-subtle)', marginBottom: 'var(--ax-space-2)' }}
              >
                {t('cartographie.filtrerFiliere')}
              </label>
              <select
                id="filtre-filiere"
                className="ax-select"
                value={filiere}
                onChange={(e) => setFiliere(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">{tc('filtres.toutesLesFilieres')}</option>
                {donnees.filieres.map((f) => (
                  <option key={f.slug} value={f.slug}>{f.nom}</option>
                ))}
              </select>
              <div style={{ marginTop: 'var(--ax-space-2)', fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>
                {tc('unites.groupements', { nombre: visibles.length })}
              </div>
            </div>
          </div>
        </section>

        {/* ===== CARTE ===== */}
        <section
          className="ax-card ax-card--chart ax-col--8"
          role="region"
          aria-label={t('cartographie.carteAria')}
          style={{ overflow: 'hidden' }}
        >
          <div className="ax-card__header">
            <div className="ax-card__titles">
              <h2 className="ax-card__title">{t('cartographie.carteTitre')}</h2>
              <p className="ax-card__subtitle">
                {t('cartographie.carteSousTitre', {
                  fond: t(`cartographie.fonds.${fond}.nom`),
                  marqueurs: visibles.length,
                })}
              </p>
            </div>
            <div className="ax-card__actions">
              <span className="ax-badge ax-badge--soft ax-badge--pill">
                <span className="ax-badge__dot" style={{ background: 'var(--ax-viz-emerald)' }} />
                OpenStreetMap
              </span>
            </div>
          </div>
          <div className="ax-card__body" style={{ paddingTop: 0 }}>
            <div style={{ position: 'relative', height: 460, borderRadius: 'var(--ax-radius-lg)', overflow: 'hidden', border: '1px solid var(--ax-border)' }}>
              <div
                ref={conteneur}
                aria-label={t('cartographie.carteAria')}
                style={{ position: 'absolute', inset: 0, height: '100%', background: 'var(--ax-surface-subtle)' }}
              />
              <div style={{ position: 'absolute', left: 'var(--ax-space-4)', top: 'var(--ax-space-4)', display: 'flex', flexDirection: 'column', gap: 6, zIndex: 500 }}>
                <button
                  type="button"
                  className="ax-btn ax-btn--secondary ax-btn--icon ax-btn--sm"
                  aria-label={t('cartographie.zoomAvant')}
                  style={{ backdropFilter: 'blur(12px)' }}
                  onClick={() => carte.current.map?.zoomIn()}
                >
                  <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5l0 14" /><path d="M5 12l14 0" /></svg>
                </button>
                <button
                  type="button"
                  className="ax-btn ax-btn--secondary ax-btn--icon ax-btn--sm"
                  aria-label={t('cartographie.zoomArriere')}
                  style={{ backdropFilter: 'blur(12px)' }}
                  onClick={() => carte.current.map?.zoomOut()}
                >
                  <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l14 0" /></svg>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ===== FICHES DE QUARTIER ===== */}
        {donnees.quartiers.map((q) => (
          <section
            key={q.slug}
            className={`ax-card ax-card--interactive ax-col--4${quartierActif === q.slug ? ' is-selected' : ''}`}
            role="region"
            onClick={() => setQuartierActif(q.slug)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setQuartierActif(q.slug);
              }
            }}
            aria-label={t('cartographie.ficheQuartier', { quartier: q.nom })}
            style={{ cursor: 'pointer' }}
          >
            <div className="ax-card__body">
              <div className="ax-cluster" style={{ gap: 'var(--ax-space-3)', flexWrap: 'nowrap' }}>
                <span className="ax-avatar ax-avatar--md ax-avatar--squircle" style={{ background: 'var(--ax-accent-wash)', color: 'var(--ax-accent)' }}>
                  <svg className="ax-avatar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" /><path d="M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0" /></svg>
                </span>
                <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                  <div className="ax-text-truncate" style={{ fontWeight: 'var(--ax-weight-semibold)', color: 'var(--ax-text-strong)' }}>{q.nom}</div>
                  <div style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)' }}>
                    {t('cartographie.population', { nombre: formaterNombre(q.populationEstimee) })}
                  </div>
                </div>
                <span className="ax-badge ax-badge--soft ax-badge--pill ax-num">{q.nombreGroupements}</span>
              </div>
              <div className="ax-cluster" style={{ justifyContent: 'space-between', marginTop: 'var(--ax-space-4)', paddingTop: 'var(--ax-space-3)', borderTop: '1px solid var(--ax-border)' }}>
                <span style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-muted)' }}>
                  {t('cartographie.partCommune')}
                </span>
                <b className="ax-num" style={{ color: 'var(--ax-text-strong)', fontSize: 'var(--ax-text-sm)' }}>
                  {tc('unites.pourcentage', { valeur: q.partCommune })}
                </b>
              </div>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------------- *
 * Fabrication des éléments Leaflet
 * ------------------------------------------------------------------------- */

function icone(L: any, teinte: string, taille = 14) {
  const couleur = resoudreTeinte(teinte);
  const bordure = resoudreTeinte('var(--ax-surface-solid)', '#fff');
  return L.divIcon({
    className: 'ax-leaflet-pin',
    html: `<span style="display:block;width:${taille}px;height:${taille}px;border-radius:50%;background:${couleur};border:3px solid ${bordure};box-shadow:var(--ax-shadow-md);"></span>`,
    iconSize: [taille, taille],
    iconAnchor: [taille / 2, taille / 2],
  });
}

interface LibellesPopup {
  membres: string;
  etapes: Record<string, string>;
  boutiqueResponsable: string;
}

/**
 * Les valeurs insérées ici viennent du jeu de données du projet, pas d'une
 * saisie utilisateur ; elles sont néanmoins échappées, parce qu'un nom de
 * groupement finira un jour par arriver de l'API et contenir une apostrophe
 * typographique, un `&`, ou pire.
 */
function echapper(texte: string): string {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function popupGroupement(g: PointGroupement, libelles: LibellesPopup): string {
  const teinte = resoudreTeinte(g.filiereTeinte);
  return `
    <div style="min-width:196px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="width:8px;height:8px;border-radius:50%;background:${teinte};flex:none;"></span>
        <b style="color:var(--ax-text-strong);font-size:var(--ax-text-sm);">${echapper(g.nom)}</b>
      </div>
      <div style="margin-top:6px;font-size:var(--ax-text-xs);color:var(--ax-text-muted);">
        ${echapper(g.filiere)} · ${echapper(g.quartier)}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;gap:12px;">
        <span style="font-size:var(--ax-text-xs);color:var(--ax-text-muted);">${echapper(libelles.etapes[g.etape] ?? g.etape)}</span>
        <b style="font-size:var(--ax-text-xs);color:var(--ax-text-strong);font-family:var(--ax-font-mono);">${g.nombreMembres} ${echapper(libelles.membres)}</b>
      </div>
    </div>`;
}

function popupBoutique(b: BoutiqueCarte, libelles: LibellesPopup): string {
  return `
    <div style="min-width:196px;">
      <b style="color:var(--ax-text-strong);font-size:var(--ax-text-sm);">${echapper(b.nom)}</b>
      <div style="margin-top:6px;font-size:var(--ax-text-xs);color:var(--ax-text-muted);">
        ${echapper(libelles.boutiqueResponsable)} ${echapper(b.responsable)}
      </div>
      <div style="margin-top:4px;font-size:var(--ax-text-xs);color:var(--ax-text-muted);font-family:var(--ax-font-mono);">
        ${echapper(b.horaires)}
      </div>
    </div>`;
}

function Bascule({
  pastille,
  libelle,
  actif,
  onChanger,
}: {
  pastille: React.ReactNode;
  libelle: string;
  actif: boolean;
  onChanger: (valeur: boolean) => void;
}) {
  return (
    <label className="ax-cluster" style={{ justifyContent: 'space-between', cursor: 'pointer' }}>
      <span className="ax-cluster" style={{ gap: 'var(--ax-space-2)' }}>
        {pastille}
        <span style={{ fontSize: 'var(--ax-text-sm)', color: 'var(--ax-text)' }}>{libelle}</span>
      </span>
      <input
        type="checkbox"
        className="ax-switch"
        checked={actif}
        onChange={(e) => onChanger(e.target.checked)}
        aria-label={libelle}
      />
    </label>
  );
}

export default Cartographie;
