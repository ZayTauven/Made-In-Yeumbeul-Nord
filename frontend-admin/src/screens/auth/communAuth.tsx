'use client';
/*
 * Briques communes aux trois écrans d'authentification branchés sur l'API.
 *
 * `CadreAuth` porte le split 52/48 : la photographie à gauche à partir de
 * 992 px, le formulaire à droite. Les trois écrans se réduisent ainsi à leur
 * formulaire, et le jour où le cadrage change, il change en un seul endroit.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { AuthStandalone } from './authShared';
import { PanneauIllustration } from './PanneauIllustration';

/*
 * La mise en page du split vit **entièrement** ici, et non pour moitié dans des
 * styles en ligne.
 *
 * Le template posait `grid-template-columns: 1fr` en style en ligne et comptait
 * sur cette feuille pour le remplacer à partir de 992 px. Un style en ligne
 * l'emporte toujours sur une règle de feuille de style : la colonne unique ne
 * cédait jamais, et comme le panneau, lui, apparaissait bien — sa règle portait
 * `!important` —, la photographie s'empilait AU-DESSUS du formulaire. D'où le
 * split horizontal constaté.
 */
const STYLE_SPLIT = `
.ax-auth-cover {
  position: relative;
  z-index: 1;
  min-block-size: 100dvh;
  display: grid;
  grid-template-columns: 1fr;
}
.ax-auth-cover__panel { display: none; }

@media (min-width: 992px) {
  /* Deux colonnes côte à côte : la photographie occupe la moitié gauche sur
     toute la hauteur, le formulaire la moitié droite. */
  .ax-auth-cover { grid-template-columns: 52% 48%; }
  .ax-auth-cover__panel { display: flex; }
}
`;

const SOLEIL = (
  <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /><path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7" /></svg>
);
const LUNE = (
  <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454l0 .008" /></svg>
);

/**
 * Bascule clair / sombre.
 *
 * Le sélecteur de langue du template n'est pas repris : il fait tourner cinq
 * locales dans `localStorage`, alors que le projet n'en publie qu'une et
 * résout la locale par cookie (`src/i18n/config.ts`). Un sélecteur qui ne
 * propose rien d'autre est du bruit ; il reviendra avec le wolof.
 */
export function BasculeTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setTheme(
      document.documentElement.getAttribute('data-ax-theme') === 'dark' ? 'dark' : 'light',
    );
  }, []);

  const basculer = () => {
    const suivant = theme === 'dark' ? 'light' : 'dark';
    setTheme(suivant);
    document.documentElement.setAttribute('data-ax-theme', suivant);
    try {
      localStorage.setItem('ax:theme', suivant);
    } catch {
      /* Navigation privée : le thème ne se retient pas, l'écran fonctionne. */
    }
    document.dispatchEvent(new CustomEvent('ax:change'));
  };

  return (
    <button
      type="button"
      className="ax-btn ax-btn--ghost ax-btn--icon"
      onClick={basculer}
      aria-pressed={theme === 'dark'}
      aria-label={theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
      style={{
        position: 'absolute',
        insetBlockStart: 'var(--ax-space-5)',
        insetInlineEnd: 'var(--ax-space-5)',
        zIndex: 2,
      }}
    >
      {theme === 'dark' ? SOLEIL : LUNE}
    </button>
  );
}

/** Le split : photographie à gauche, contenu à droite. */
export function CadreAuth({ children }: { children: ReactNode }) {
  return (
    <AuthStandalone cover>
      <style>{STYLE_SPLIT}</style>
      {/* Aucun style en ligne sur ce conteneur : la grille est réglée par
          STYLE_SPLIT, sans quoi la media query ne pourrait pas la reprendre. */}
      <div className="ax-auth-cover">
        <PanneauIllustration />

        <main
          className="ax-center"
          id="ax-main"
          style={{ position: 'relative', padding: 'var(--ax-space-8) var(--ax-space-6)' }}
        >
          <BasculeTheme />
          <div
            style={{
              inlineSize: '100%',
              maxInlineSize: 420,
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--ax-space-6)',
            }}
          >
            {children}
          </div>
        </main>
      </div>
    </AuthStandalone>
  );
}

/** Titre et sous-titre, identiques sur les trois écrans. */
export function EnteteAuth({ titre, sousTitre }: { titre: string; sousTitre: string }) {
  return (
    <header style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-2)' }}>
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--ax-font-display)',
          fontSize: 'var(--ax-text-2xl)',
          fontWeight: 'var(--ax-weight-semibold)',
          color: 'var(--ax-text-strong)',
          letterSpacing: '-.015em',
        }}
      >
        {titre}
      </h1>
      <p style={{ margin: 0, fontSize: 'var(--ax-text-sm)', lineHeight: 1.6, color: 'var(--ax-text-muted)' }}>
        {sousTitre}
      </p>
    </header>
  );
}

/** Bandeau d'erreur. Il dit ce qui s'est passé, jamais « une erreur est survenue ». */
export function AlerteErreur({ message }: { message: string }) {
  return (
    <div role="alert" className="ax-alert ax-alert--danger" style={{ padding: 'var(--ax-space-3) var(--ax-space-4)' }}>
      <svg className="ax-alert__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
      <div className="ax-alert__content">
        <p className="ax-alert__message" style={{ color: 'var(--ax-danger-500)' }}>{message}</p>
      </div>
    </div>
  );
}
