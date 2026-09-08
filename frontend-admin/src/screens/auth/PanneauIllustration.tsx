'use client';
/*
 * Panneau illustré des écrans d'authentification.
 *
 * Moitié gauche du split, visible à partir de 992 px. Il remplace le panneau
 * dégradé du template et son témoignage inventé — « Priya Nair, Head of
 * Operations · Northwind », « 24K+ teams onboard » — par une photographie du
 * corpus du projet et le nom réel du programme.
 *
 * Ce choix n'est pas décoratif. Un écran de connexion a un seul travail :
 * ouvrir la session. Les chiffres d'apparat d'un modèle SaaS n'y servent
 * personne, et des statistiques inventées sur un outil de suivi-évaluation
 * seraient un contresens — c'est précisément la donnée que la plateforme est
 * censée établir.
 *
 * La photographie passe par `next/image` avec le `blurDataURL` du catalogue :
 * aucune image distante, aucun saut de mise en page, et la démonstration tient
 * sans connexion (CLAUDE.md §5).
 *
 * Le blason est celui de la **Commune**, tutelle du projet. Il figure ici en
 * mention institutionnelle, en pied de panneau — jamais comme identité du
 * produit (CLAUDE.md §3).
 */
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { PHOTOS } from '../../domaine/photos.generated';

/**
 * Photographie du panneau. Changer cette seule clé change l'image des trois
 * écrans d'authentification ; le catalogue fournit le reste.
 *
 * « Réunion de coordination » montre le travail que l'outil accompagne, plutôt
 * qu'un produit fini : c'est la scène juste devant un écran de connexion
 * destiné aux agents de la commune.
 */
const CLE_PHOTO = 'coordination-reunion-bureau';

export function PanneauIllustration() {
  const t = useTranslations('auth.marque');
  const photo = PHOTOS[CLE_PHOTO];

  return (
    <aside
      className="ax-auth-cover__panel"
      style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'none',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 'var(--ax-space-10)',
        borderInlineEnd: '1px solid var(--ax-border)',
        // Sous la photographie, au cas où elle tarderait : la couleur de fond
        // évite un rectangle blanc en thème sombre.
        background: 'var(--ax-surface-subtle)',
      }}
    >
      {photo?.hero && (
        <Image
          src={photo.hero.src}
          alt={photo.alt}
          fill
          sizes="(min-width: 992px) 52vw, 0px"
          placeholder="blur"
          blurDataURL={photo.blurDataURL}
          priority
          style={{
            objectFit: 'cover',
            // Le cadrage remonte légèrement : sur un panneau en hauteur, un
            // centrage strict couperait les visages de la scène.
            objectPosition: '50% 38%',
          }}
        />
      )}

      {/*
        Voile de lisibilité. Les valeurs sont des noirs semi-transparents et non
        des tokens : le texte posé dessus est blanc dans les deux thèmes, parce
        qu'il est sur une photographie et non sur une surface de l'interface.
      */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(8,12,11,.55) 0%, rgba(8,12,11,.18) 34%, rgba(8,12,11,.30) 62%, rgba(8,12,11,.82) 100%)',
        }}
      />

      <div style={{ position: 'relative' }}>
        <span
          style={{
            fontFamily: 'var(--ax-font-display)',
            fontWeight: 'var(--ax-weight-semibold)',
            fontSize: 'var(--ax-text-lg)',
            letterSpacing: '.14em',
            textTransform: 'uppercase',
            color: '#ffffff',
          }}
        >
          {t('nom')}
        </span>
      </div>

      <div style={{ position: 'relative', maxInlineSize: '26ch' }}>
        {/*
          Le nom wolof du programme, et sa traduction dessous. C'est le seul
          élément d'apparat de l'écran, et il est vrai : il dit ce que le
          projet est, dans la langue de celles qui le portent.
        */}
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--ax-font-display)',
            fontSize: 'var(--ax-text-2xl)',
            lineHeight: 1.25,
            fontWeight: 'var(--ax-weight-semibold)',
            color: '#ffffff',
            letterSpacing: '-.01em',
          }}
        >
          {t('projet')}
        </p>
        <p
          style={{
            margin: 'var(--ax-space-3) 0 0',
            fontSize: 'var(--ax-text-sm)',
            lineHeight: 1.6,
            color: 'rgba(255,255,255,.78)',
          }}
        >
          {t('traduction')}
        </p>

        <div
          className="ax-cluster"
          style={{
            gap: 'var(--ax-space-3)',
            marginBlockStart: 'var(--ax-space-8)',
            paddingBlockStart: 'var(--ax-space-5)',
            borderBlockStart: '1px solid rgba(255,255,255,.22)',
          }}
        >
          <Image
            src="/brand/logo-cyn-128.png"
            alt={t('blasonAlt')}
            width={34}
            height={34}
            style={{ inlineSize: 34, blockSize: 34, objectFit: 'contain' }}
          />
          <span
            style={{
              fontSize: 'var(--ax-text-xs)',
              lineHeight: 1.5,
              color: 'rgba(255,255,255,.72)',
            }}
          >
            {t('tutelle')}
          </span>
        </div>
      </div>
    </aside>
  );
}

export default PanneauIllustration;
