/*
 * Fiche d'un groupement — route « /vendor-details?groupement=<slug> ».
 *
 * Destination des cent liens que pose l'annuaire. L'écran du template décrivait
 * un commerçant américain écrit en dur — « Food Forulard », ses horaires
 * d'ouverture, son panier — sur 422 lignes ; il présente maintenant un
 * groupement de la commune et ce qu'il produit.
 *
 * **La liste nominative des membres n'y figure pas.** L'API la sert et la fiche
 * du back-office l'affichera : elle s'adresse à des agents de la commune, tenus
 * au même devoir de réserve que sur n'importe quel registre. Publier sur un site
 * ouvert les noms de mille sept cent quatre-vingt-cinq femmes est autre chose,
 * et personne ne l'a demandé. Seule la responsable est nommée : elle représente
 * le groupement, c'est sa fonction.
 *
 * Le chiffre d'affaires est écarté pour une raison voisine — la commune le suit,
 * il n'a pas à s'afficher en vitrine.
 *
 * Composant **serveur**, comme l'annuaire : le catalogue public n'a besoin ni de
 * session ni de CORS, et la page arrive peuplée.
 */
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import HeaderOne from '@/components/header/HeaderOne';
import FooterOne from '@/components/footer/FooterOne';
import ShortService from '@/components/service/ShortService';
import { obtenirGroupement, productionsDuGroupement } from '@/domaine/source';
import {
  LIBELLE_ETAPE,
  LIBELLE_STATUT_JURIDIQUE,
  formaterFcfa,
} from '@/domaine/referentiels';
import { logoDuGroupement } from '@/data/logos-groupements';
import type { Production } from '@/domaine/types';

/** Une ligne du bloc d'identité : intitulé discret, valeur en dessous. */
function Renseignement({ intitule, children }: { intitule: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <span
        style={{
          display: 'block',
          fontSize: 13,
          textTransform: 'uppercase',
          letterSpacing: '.06em',
          color: 'var(--color-body)',
          marginBottom: 2,
        }}
      >
        {intitule}
      </span>
      <strong style={{ color: 'var(--color-heading-1)' }}>{children}</strong>
    </div>
  );
}

/** Les cinq étoiles de la note, pleines ou vides. */
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

function CarteProduction({ production, libelleVoir }: { production: Production; libelleVoir: string }) {
  const lien = `/shop/${production.slug}`;

  return (
    <div className="col-lg-4 col-md-6 col-sm-6 col-12">
      <div className="single-shopping-card-one tranding-product d-flex flex-column" style={{ height: '100%' }}>
        <Link href={lien} className="thumbnail-preview" aria-label={libelleVoir}>
          <img src={production.photo} alt={production.nom} loading="lazy" />
        </Link>
        <div className="body-content d-flex flex-column" style={{ flexGrow: 1 }}>
          <span className="availability">{production.filiere_nom}</span>
          <Link href={lien}>
            {/* Deux lignes au plus : « Savon de karité artisanal parfumé au
                bissap » déborderait sinon sur trois et désalignerait la rangée. */}
            <h4
              className="title"
              title={production.nom}
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                minHeight: '2.6em',
              }}
            >
              {production.nom}
            </h4>
          </Link>
          <div className="price-area mt-auto">
            <span className="current">{formaterFcfa(production.prix_unitaire_fcfa)}</span>
            {/* Le prix barré n'est pas une promotion : c'est le prix relevé au
                marché, face auquel la boutique témoin se situe. Le projet ne
                fait pas de soldes. */}
            {production.prix_barre_fcfa !== null && (
              <div className="previous">{formaterFcfa(production.prix_barre_fcfa)}</div>
            )}
            <span style={{ display: 'block', fontSize: 13, color: 'var(--color-body)' }}>
              {production.unite}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function FicheGroupement({
  searchParams,
}: {
  searchParams: Promise<{ groupement?: string }>;
}) {
  const t = await getTranslations('vitrine.groupement');
  const tNav = await getTranslations('vitrine.navigation');

  const { groupement: slug } = await searchParams;
  const groupement = slug ? await obtenirGroupement(slug) : null;

  /*
   * Un slug inconnu ne tombe pas sur le 404 de Next : celui-ci sort du gabarit
   * de la vitrine — ni en-tête, ni pied de page, ni chemin de retour. Le
   * visiteur arrive ici par un lien partagé ou par un moteur ; il faut qu'il
   * puisse repartir vers l'annuaire.
   */
  if (!groupement) {
    return (
      <div>
        <HeaderOne />
        <div className="rts-section-gap">
          <div className="container">
            <div className="row">
              <div className="col-lg-12 text-center">
                <h1 className="title">{t('introuvableTitre')}</h1>
                <p>{t('introuvableTexte')}</p>
                <Link href="/vendor-grid" className="rts-btn btn-primary radious-sm">
                  <div className="btn-text">{t('retourAnnuaire')}</div>
                </Link>
              </div>
            </div>
          </div>
        </div>
        <FooterOne />
      </div>
    );
  }

  const productions = await productionsDuGroupement(groupement.id);

  return (
    <div>
      <HeaderOne />

      <div className="rts-navigation-area-breadcrumb bg_light-1">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="navigator-breadcrumb-wrapper">
                <Link href="/">{tNav('accueil')}</Link>
                <i className="fa-regular fa-chevron-right" aria-hidden="true" />
                <Link href="/vendor-grid">{tNav('groupements')}</Link>
                <i className="fa-regular fa-chevron-right" aria-hidden="true" />
                <span className="current">{groupement.nom}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rts-section-gap">
        <div className="container">
          <div className="row g-5">
            {/* Identité, en colonne latérale */}
            <div className="col-lg-3">
              <div
                style={{
                  border: '1px solid #E2E2E2',
                  borderRadius: 6,
                  padding: 24,
                  background: '#fff',
                }}
              >
                {/*
                  Même cadre à hauteur fixe que dans l'annuaire, et pour la même
                  raison : les emblèmes vont du SVG panoramique à la photographie
                  haute. `contain` les inscrit sans les déformer.
                */}
                <div
                  className="d-flex align-items-center justify-content-center"
                  style={{ height: 110, marginBottom: 24, overflow: 'hidden' }}
                >
                  <img
                    src={logoDuGroupement(groupement.id)}
                    alt=""
                    style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                  />
                </div>

                <h5 className="title" style={{ marginBottom: 20 }}>
                  {t('identite')}
                </h5>

                <Renseignement intitule={t('filiere')}>{groupement.filiere.nom}</Renseignement>
                <Renseignement intitule={t('quartier')}>{groupement.quartier.nom}</Renseignement>
                <Renseignement intitule={t('etape')}>
                  {LIBELLE_ETAPE[groupement.etape]}
                </Renseignement>
                <Renseignement intitule={t('statutJuridique')}>
                  {LIBELLE_STATUT_JURIDIQUE[groupement.statut_juridique]}
                  <span style={{ display: 'block', fontWeight: 400, color: 'var(--color-body)' }}>
                    {t('creeEn', { annee: new Date(groupement.date_creation).getFullYear() })}
                  </span>
                </Renseignement>
                <Renseignement intitule={t('membres')}>
                  {t('effectif', { nombre: groupement.nombre_membres })}
                  <span style={{ display: 'block', fontWeight: 400, color: 'var(--color-body)' }}>
                    {t('partFemmes', { valeur: groupement.part_femmes })}
                  </span>
                </Renseignement>
                <Renseignement intitule={t('responsable')}>{groupement.responsable}</Renseignement>

                <h5 className="title" style={{ marginBlock: 28 }}>
                  {t('contacter')}
                </h5>
                <div style={{ marginBottom: 10 }}>
                  <i className="fa-regular fa-phone-volume" aria-hidden="true" />{' '}
                  <a href={`tel:${groupement.telephone.replace(/\s/g, '')}`}>
                    {groupement.telephone}
                  </a>
                </div>
                {groupement.email && (
                  <div style={{ wordBreak: 'break-word' }}>
                    <i className="fa-regular fa-envelope" aria-hidden="true" />{' '}
                    <a href={`mailto:${groupement.email}`}>{groupement.email}</a>
                  </div>
                )}
              </div>
            </div>

            {/* Présentation et productions */}
            <div className="col-lg-9">
              <h1 className="title" style={{ marginBottom: 8 }}>
                {groupement.nom}
              </h1>
              <div className="stars-area" style={{ marginBottom: 24 }}>
                {groupement.nombre_appreciations > 0 ? (
                  <>
                    <Etoiles note={groupement.note_moyenne} />
                    <span>
                      {t('note', {
                        note: groupement.note_moyenne.toFixed(1),
                        nombre: groupement.nombre_appreciations,
                      })}
                    </span>
                  </>
                ) : (
                  <span>{t('sansNote')}</span>
                )}
              </div>

              <h5 className="title">{t('apropos')}</h5>
              <p style={{ marginBottom: 40 }}>{groupement.description}</p>

              <h5 className="title" style={{ marginBottom: 24 }}>
                {t('productions')}
              </h5>

              {productions.length === 0 ? (
                <p>{t('aucuneProduction')}</p>
              ) : (
                <div className="row g-4">
                  {productions.map((production) => (
                    <CarteProduction
                      key={production.id}
                      production={production}
                      libelleVoir={t('voirLaProduction')}
                    />
                  ))}
                </div>
              )}

              <div style={{ marginBlockStart: 40 }}>
                {/*
                  Bouton de retour posé en clair. `.rts-btn` impose `color: #fff`
                  et Ekomart n'offre pas de variante claire — sans ces trois
                  déclarations, l'intitulé serait blanc sur blanc. C'est le
                  travers déjà rencontré sur les filtres de l'annuaire.
                */}
                <Link
                  href="/vendor-grid"
                  className="rts-btn radious-sm"
                  style={{
                    background: '#fff',
                    color: 'var(--color-heading-1)',
                    border: '1px solid #E2E2E2',
                  }}
                >
                  <div className="btn-text">{t('retourAnnuaire')}</div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ShortService />
      <FooterOne />
    </div>
  );
}
