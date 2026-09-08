/*
 * Annuaire des groupements — route « /vendor-grid ».
 *
 * L'écran du template listait vingt commerçants américains écrits en dur dans
 * le JSX, sur 814 lignes — « Fresh Iuice Bar, 530 Post Ct El Dorado Hills ».
 * Il lit maintenant les cent groupements de la commune par
 * `listerGroupements()`, qui interroge l'API et retombe sur le jeu local si
 * elle ne répond pas.
 *
 * Composant **serveur** : l'appel part du serveur Next, pas du navigateur. Le
 * catalogue public n'a besoin ni de session ni de CORS, et le rendu arrive déjà
 * peuplé — un annuaire qui se remplit après coup donne l'impression d'un site
 * qui rame.
 *
 * Le slug de la route reste celui du template : le renommer casserait les liens
 * déjà posés dans la navigation et les maquettes.
 */
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import HeaderOne from '@/components/header/HeaderOne';
import FooterOne from '@/components/footer/FooterOne';
import ShortService from '@/components/service/ShortService';
import { listerFilieres, listerGroupements } from '@/domaine/source';
import type { Groupement } from '@/domaine/types';

/** Groupements par page. Quatre colonnes sur grand écran, six rangées. */
const PAR_PAGE = 24;

/** Rend les cinq étoiles de la note, pleines ou vides. */
function Etoiles({ note }: { note: number }) {
  const pleines = Math.round(note);
  return (
    <>
      {[1, 2, 3, 4, 5].map((rang) => (
        <i
          key={rang}
          className={rang <= pleines ? 'fa-solid fa-star' : 'fa-regular fa-star'}
          aria-hidden="true"
        />
      ))}
    </>
  );
}

async function CarteGroupement({ groupement }: { groupement: Groupement }) {
  const t = await getTranslations('vitrine.annuaire');

  return (
    <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6 col-12">
      <div className="single-vendor-area">
        <div className="logo-vendor">
          {/*
            La photographie du groupement, pas un logo : aucun des cent
            groupements n'en a. Le corpus local fournit une image d'activité,
            servie depuis public/ — aucune image distante (CLAUDE.md §5).
          */}
          <img
            src={groupement.photo}
            alt={`${groupement.nom} — ${groupement.filiere.nom}`}
            loading="lazy"
          />
        </div>

        <h3 className="title">{groupement.nom}</h3>

        <div className="stars-area">
          {groupement.nombre_appreciations > 0 ? (
            <>
              <Etoiles note={groupement.note_moyenne} />
              <span>{t('note', { note: groupement.note_moyenne.toFixed(1) })}</span>
            </>
          ) : (
            <span>{t('sansNote')}</span>
          )}
        </div>

        <div className="location">
          <i className="fa-regular fa-location-dot" aria-hidden="true" />
          <p>
            {groupement.quartier.nom} · {groupement.filiere.nom}
          </p>
        </div>

        <div className="location">
          <i className="fa-regular fa-users" aria-hidden="true" />
          <p>
            {t('membres', { nombre: groupement.nombre_membres })} ·{' '}
            {t('productions', { nombre: groupement.nombre_productions })}
          </p>
        </div>

        <Link
          href={`/vendor-details?groupement=${groupement.slug}`}
          className="rts-btn btn-primary radious-sm with-icon"
        >
          <div className="btn-text">{t('voirLaFiche')}</div>
          <div className="arrow-icon">
            <i className="fa-light fa-arrow-right" aria-hidden="true" />
          </div>
        </Link>
      </div>
    </div>
  );
}

export default async function AnnuaireDesGroupements({
  searchParams,
}: {
  searchParams: Promise<{ filiere?: string; page?: string }>;
}) {
  const t = await getTranslations('vitrine.annuaire');
  const parametres = await searchParams;

  const page = Math.max(1, Number(parametres.page) || 1);
  const filiere = parametres.filiere;

  // Les deux appels partent ensemble : l'un ne dépend pas de l'autre, les
  // enchaîner doublerait l'attente pour rien.
  const [filieres, resultats] = await Promise.all([
    listerFilieres(),
    listerGroupements({ page, taille: PAR_PAGE, filiere }),
  ]);

  const pages = Math.max(1, Math.ceil(resultats.count / PAR_PAGE));
  const lienVers = (cible: { filiere?: string; page?: number }) => {
    const parametres = new URLSearchParams();
    if (cible.filiere) parametres.set('filiere', cible.filiere);
    if (cible.page && cible.page > 1) parametres.set('page', String(cible.page));
    const chaine = parametres.toString();
    return chaine ? `/vendor-grid?${chaine}` : '/vendor-grid';
  };

  return (
    <div>
      <HeaderOne />

      {/* Fil d'Ariane */}
      <div className="rts-navigation-area-breadcrumb bg_light-1">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="navigator-breadcrumb-wrapper">
                <Link href="/">{t('titre')}</Link>
                <i className="fa-regular fa-chevron-right" aria-hidden="true" />
                <span className="current">{t('titre')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* En-tête */}
      <div className="vendor-search-area">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="vendor-search-area-wrapper">
                <h1 className="title">{t('titre')}</h1>
                <p>{t('chapeau')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="vendor-search-area rts-section-gap">
        <div className="container">
          {/* Filtres par filière. Des liens, pas un menu déroulant : une
              sélection doit rester dans l'adresse, partageable et indexable. */}
          <div className="row">
            <div className="col-lg-12">
              <div className="filter-search-area-top-between filter-select-area">
                <div className="top-filter">
                  <span>{t('resultats', { nombre: resultats.count })}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="row mb--30">
            <div className="col-lg-12">
              <nav aria-label={t('filtreFiliere')} className="d-flex flex-wrap gap-2">
                <Link
                  href={lienVers({})}
                  className={`rts-btn ${filiere ? 'btn-border' : 'btn-primary'} radious-sm`}
                >
                  <div className="btn-text">{t('toutesFilieres')}</div>
                </Link>
                {filieres.map((f) => (
                  <Link
                    key={f.slug}
                    href={lienVers({ filiere: f.slug })}
                    className={`rts-btn ${
                      filiere === f.slug ? 'btn-primary' : 'btn-border'
                    } radious-sm`}
                  >
                    <div className="btn-text">
                      {f.nom} ({f.nombre_groupements})
                    </div>
                  </Link>
                ))}
              </nav>
            </div>
          </div>

          {/* Grille */}
          {resultats.results.length === 0 ? (
            <div className="row">
              <div className="col-lg-12 text-center">
                <p>{t('aucunResultat')}</p>
                <Link href={lienVers({})} className="rts-btn btn-primary radious-sm">
                  <div className="btn-text">{t('retirerFiltre')}</div>
                </Link>
              </div>
            </div>
          ) : (
            <div className="row g-4">
              {resultats.results.map((groupement) => (
                <CarteGroupement key={groupement.id} groupement={groupement} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="row mt--40">
              <div className="col-lg-12">
                <nav className="d-flex align-items-center justify-content-center gap-3">
                  {page > 1 && (
                    <Link
                      href={lienVers({ filiere, page: page - 1 })}
                      className="rts-btn btn-border radious-sm"
                    >
                      <div className="btn-text">{t('pagePrecedente')}</div>
                    </Link>
                  )}
                  <span>{t('page', { courante: page, total: pages })}</span>
                  {page < pages && (
                    <Link
                      href={lienVers({ filiere, page: page + 1 })}
                      className="rts-btn btn-border radious-sm"
                    >
                      <div className="btn-text">{t('pageSuivante')}</div>
                    </Link>
                  )}
                </nav>
              </div>
            </div>
          )}
        </div>
      </div>

      <ShortService />
      <FooterOne />
    </div>
  );
}
