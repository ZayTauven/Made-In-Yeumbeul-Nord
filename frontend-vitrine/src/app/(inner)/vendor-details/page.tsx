/*
 * Fiche d'un groupement — route « /vendor-details?groupement=<slug> ».
 *
 * Destination des cent liens que pose l'annuaire.
 *
 * **Le meuble reste celui d'Ekomart, seul le contenu change.** La première
 * conversion avait remplacé la mise en page du gabarit par la mienne : titre
 * nu, encadré unique en colonne, cartes reconstruites à la main. Elle rendait
 * une page fonctionnelle et laide, sans parenté avec le reste de la vitrine.
 * On reprend donc les classes du gabarit à l'identique — `vendor-name-area-
 * details`, `single-filter-box`, `vendor-details-banner--area`,
 * `vendor-banner-left`, `banner-vendor-details`, `product-area-add-wrapper`,
 * `single-shopping-card-one tranding-product` — et on n'y verse que nos
 * données. Le SCSS de la vitrine fait le reste.
 *
 * **La liste nominative des membres n'y figure pas.** L'API la sert et la fiche
 * du back-office l'affichera : elle s'adresse à des agents de la commune, tenus
 * au même devoir de réserve que sur n'importe quel registre. Publier sur un site
 * ouvert les noms de mille sept cent quatre-vingt-cinq femmes est autre chose,
 * et personne ne l'a demandé. Seule la responsable est nommée : elle représente
 * le groupement, c'est sa fonction. Le chiffre d'affaires est écarté de même —
 * la commune le suit, il n'a pas à s'afficher en vitrine.
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
import type { Groupement, Production } from '@/domaine/types';

/*
 * `.rts-btn` pose `max-width: max-content` sans jamais déclarer de `display` :
 * c'est `.btn-primary` ou `.with-icon` qui l'ajoutent. Un bouton qui n'a que
 * `.rts-btn` reste donc **en ligne**, et son `.btn-text`, lui, est un bloc — le
 * texte sort de la boîte, qui reste vide. C'est exactement ce qu'on voyait sous
 * « Revenir à l'annuaire ». D'où le `display` rendu explicite ici.
 */
const BOUTON_CLAIR: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  background: '#fff',
  color: 'var(--color-heading-1)',
  border: '1px solid #E2E2E2',
};

/** Une ligne du relevé d'identité : intitulé discret, valeur en dessous. */
function Renseignement({ intitule, children }: { intitule: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <span
        style={{
          display: 'block',
          fontSize: 12,
          textTransform: 'uppercase',
          letterSpacing: '.06em',
          color: 'var(--color-body)',
          marginBottom: 2,
        }}
      >
        {intitule}
      </span>
      <strong style={{ color: 'var(--color-heading-1)', fontWeight: 600 }}>{children}</strong>
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

/**
 * Carte de production, au gabarit exact du modèle `tranding-product` : vignette
 * carrée bordée à gauche, texte à droite, empilement en colonne sous 1200 px.
 *
 * Aucune classe utilitaire de disposition n'est ajoutée ici. La version
 * précédente y collait `d-flex flex-column` et `height: 100%` pour aligner les
 * boutons — sauf que ce modèle-là n'a pas de bouton, et que ces deux règles
 * annulaient le `display: flex; align-items: center` du gabarit. La carte
 * perdait sa vignette, son fond et sa bordure d'un coup.
 */
function CarteProduction({ production }: { production: Production }) {
  const lien = `/shop/${production.slug}`;

  return (
    <div className="col-lg-4 col-md-6">
      <div className="single-shopping-card-one tranding-product">
        <Link href={lien} className="thumbnail-preview">
          <img src={production.photo} alt={production.nom} loading="lazy" />
        </Link>
        <div className="body-content">
          {/* La pastille du gabarit portait un délai de livraison ; elle porte
              ici la filière, qui est ce qui situe une production dans le
              projet. Un groupement peut en cumuler plusieurs. */}
          <div className="time-tag">
            <i className="fa-light fa-tag" aria-hidden="true" /> {production.filiere_nom}
          </div>
          <Link href={lien}>
            <h4
              className="title"
              title={production.nom}
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {production.nom}
            </h4>
          </Link>
          <span className="availability">{production.unite}</span>
          {/*
            `flex-wrap` et `nowrap` : « 13 700 FCFA » fait deux fois la longueur
            du « $36.00 » pour lequel le gabarit a été dessiné. Sur trois
            colonnes, les deux prix se chevauchaient et la barre du prix de
            référence — un pseudo-élément posé à `top: 50%` — tombait *entre*
            les deux lignes, où elle se lisait comme un soulignement. Les
            montants restent donc insécables, et c'est la ligne qui cède.
          */}
          <div className="price-area" style={{ flexWrap: 'wrap' }}>
            <span className="current" style={{ whiteSpace: 'nowrap' }}>
              {formaterFcfa(production.prix_unitaire_fcfa)}
            </span>
            {/* Le prix barré n'est pas une promotion : c'est le prix relevé au
                marché, face auquel la boutique témoin se situe. Le projet ne
                fait pas de soldes. */}
            {production.prix_barre_fcfa !== null && (
              <div className="previous" style={{ whiteSpace: 'nowrap' }}>
                {formaterFcfa(production.prix_barre_fcfa)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Panneau d'identité vert foncé, à gauche de la bannière.
 *
 * L'emblème est posé sur une plaque blanche : les fichiers provisoires sont pour
 * beaucoup des JPEG à fond blanc, qui feraient sinon une tache rectangulaire sur
 * le vert. Le même écueil est documenté pour le blason de la commune dans
 * CLAUDE.md §3.
 */
async function PanneauIdentite({ groupement }: { groupement: Groupement }) {
  const t = await getTranslations('vitrine.groupement');

  return (
    <div className="vendor-banner-left">
      <div
        style={{
          background: '#fff',
          borderRadius: 6,
          height: 96,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 12,
          marginBottom: 24,
          overflow: 'hidden',
        }}
      >
        <img
          src={logoDuGroupement(groupement.id)}
          alt=""
          style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
        />
      </div>

      <div className="stars-area" style={{ justifyContent: 'center' }}>
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

      <div className="location">
        <i className="fa-regular fa-location-dot" aria-hidden="true" />
        <p>{groupement.quartier.nom}</p>
      </div>
      <div className="location">
        <i className="fa-regular fa-phone-volume" aria-hidden="true" />
        <p>{groupement.telephone}</p>
      </div>
      <div className="location">
        <i className="fa-regular fa-users" aria-hidden="true" />
        <p>
          {t('effectif', { nombre: groupement.nombre_membres })} ·{' '}
          {t('partFemmes', { valeur: groupement.part_femmes })}
        </p>
      </div>
      <div className="location">
        <i className="fa-regular fa-basket-shopping" aria-hidden="true" />
        <p>{t('nombreProductions', { nombre: groupement.nombre_productions })}</p>
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
   * de la vitrine — ni en-tête, ni pied de page, ni chemin de retour. On arrive
   * ici par un lien partagé ou par un moteur ; il faut pouvoir repartir.
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
                <Link
                  href="/vendor-grid"
                  className="rts-btn btn-primary radious-sm"
                  style={{ marginInline: 'auto' }}
                >
                  {t('retourAnnuaire')}
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
      <div className="section-seperator bg_light-1">
        <div className="container">
          <hr className="section-seperator" />
        </div>
      </div>

      {/* Titre centré, au gabarit du modèle */}
      <div className="vendor-name">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="vendor-name-area-details">
                <h1 className="title">{groupement.nom}</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="store-details-area rts-section-gap">
        <div className="container">
          <div className="row">
            {/* Colonne latérale : les encadrés de filtre du gabarit, remplis
                d'un relevé d'identité plutôt que de cases à cocher. */}
            <div className="col-xl-3 col-lg-12 pr--60 pr_md--10 pr_sm--10">
              <div className="filter-area-vendor-details">
                <div className="single-filter-box">
                  <h5 className="title">{t('identite')}</h5>
                  <div className="filterbox-body">
                    <Renseignement intitule={t('filiere')}>{groupement.filiere.nom}</Renseignement>
                    <Renseignement intitule={t('quartier')}>{groupement.quartier.nom}</Renseignement>
                    <Renseignement intitule={t('etape')}>
                      {LIBELLE_ETAPE[groupement.etape]}
                    </Renseignement>
                    <Renseignement intitule={t('statutJuridique')}>
                      {LIBELLE_STATUT_JURIDIQUE[groupement.statut_juridique]}
                    </Renseignement>
                    <Renseignement intitule={t('membres')}>
                      {t('effectif', { nombre: groupement.nombre_membres })}
                      <span
                        style={{ display: 'block', fontWeight: 400, color: 'var(--color-body)' }}
                      >
                        {t('partFemmes', { valeur: groupement.part_femmes })}
                      </span>
                    </Renseignement>
                    <div style={{ marginBottom: 0, color: 'var(--color-body)', fontSize: 14 }}>
                      {t('creeEn', { annee: new Date(groupement.date_creation).getFullYear() })}
                    </div>
                  </div>
                </div>

                <div className="single-filter-box">
                  <h5 className="title">{t('contacter')}</h5>
                  {/*
                    Le gabarit posait ici un formulaire « Contact Vendor ». Il
                    n'y a pas d'endpoint pour recevoir ces messages, et un
                    formulaire qui n'envoie rien est pire que pas de formulaire.
                    On donne les coordonnées, qui sont réelles.
                  */}
                  <div className="filterbox-body">
                    <Renseignement intitule={t('responsable')}>
                      {groupement.responsable}
                    </Renseignement>
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
              </div>
            </div>

            <div className="col-xl-9 col-lg-12 mt-lg--30">
              {/* Bannière : panneau d'identité + photo du groupement */}
              <div className="vendor-details-banner--area">
                <div className="row g-5">
                  <div className="col-lg-3">
                    <PanneauIdentite groupement={groupement} />
                  </div>
                  <div className="col-lg-9">
                    <div
                      className="banner-vendor-details"
                      style={{
                        backgroundImage: `url(${groupement.photo})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        display: 'flex',
                        alignItems: 'flex-end',
                        overflow: 'hidden',
                        position: 'relative',
                        /*
                          Le gabarit fige la bannière à 400 px, alors que le
                          panneau voisin est en `height: 100%` et suit le contenu.
                          Nos relevés sont plus longs que les trois lignes du
                          modèle : la photo s'arrêtait 65 px avant le bas du
                          panneau. On laisse la hauteur suivre la rangée, avec
                          400 px pour plancher.
                        */
                        height: '100%',
                        minHeight: 400,
                      }}
                    >
                      {/*
                        Voile sombre. Le gabarit posait son texte sur une
                        illustration claire choisie pour lui ; nos photos sont
                        des scènes de marché, souvent très chargées. Sans voile,
                        aucun texte n'y tient. C'est de la lisibilité, pas de la
                        charte — permis par CLAUDE.md §3.
                      */}
                      <div
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background:
                            'linear-gradient(to top, rgba(28,38,25,.88) 0%, rgba(28,38,25,.35) 55%, rgba(28,38,25,.05) 100%)',
                        }}
                      />
                      <div className="content-area" style={{ position: 'relative' }}>
                        <span
                          className="rts-btn btn-primary radious-sm"
                          style={{ marginBottom: 16 }}
                        >
                          {LIBELLE_ETAPE[groupement.etape]}
                        </span>
                        <h3
                          className="title"
                          style={{ color: '#fff', fontSize: 32, marginBottom: 8 }}
                        >
                          {groupement.filiere.nom}
                        </h3>
                        <p style={{ color: 'rgba(255,255,255,.85)', marginBottom: 0 }}>
                          {t('situeA')} {groupement.quartier.nom}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="row mt--40 ml-v-dec-m">
                <div className="col-lg-12">
                  <h5 className="title">{t('apropos')}</h5>
                  <p style={{ marginBottom: 0 }}>{groupement.description}</p>
                </div>
              </div>

              {/* Bandeau de section du gabarit. Ses deux visuels de produits
                  flottants sont une réclame : on ne garde que le bandeau. */}
              <div className="row">
                <div className="col-lg-12">
                  <div className="product-area-add-wrapper">
                    <h2 className="title" style={{ marginLeft: 0 }}>
                      {t('productions')}
                    </h2>
                  </div>
                </div>
              </div>

              {productions.length === 0 ? (
                <div className="row mt--40 ml-v-dec-m">
                  <div className="col-lg-12">
                    <p>{t('aucuneProduction')}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="row mt--30 ml-v-dec-m">
                    <div className="col-lg-12">
                      <span style={{ color: 'var(--color-body)' }}>
                        {t('nombreProductions', { nombre: productions.length })}
                      </span>
                    </div>
                  </div>
                  <div className="row g-4 ml-v-dec-m mt--20">
                    {productions.map((production) => (
                      <CarteProduction key={production.id} production={production} />
                    ))}
                  </div>
                </>
              )}

              <div className="row mt--40 ml-v-dec-m">
                <div className="col-lg-12">
                  <Link href="/vendor-grid" className="rts-btn radious-sm" style={BOUTON_CLAIR}>
                    {t('retourAnnuaire')}
                  </Link>
                </div>
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
