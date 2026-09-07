/*
 * Vireo Next.js — ROOT layout (App Router).
 *
 * Replicates the reference document <head> contract (BUILD-CONVENTIONS §3):
 *   1. The anti-flash theme-restore IIFE is the FIRST executable thing in
 *      <head>, before any stylesheet — inlined as a raw <script> with
 *      dangerouslySetInnerHTML so the bundler NEVER defers it. It reads ax:*
 *      localStorage and sets all data-ax-* + dir on <html> before paint.
 *      (Adapté de src/html/partials/head.html lignes 12–83.)
 *   2. Google Fonts — Inter / Space Grotesk / JetBrains Mono + preconnects.
 *   3. The shared --ax-* token core (app.css) imported once below.
 *
 * INTERNATIONALISATION (7 septembre 2026) — l'attribut `lang` est rendu par le
 * serveur à partir de la locale next-intl, et non plus posé par le script
 * anti-flash. Voir src/i18n/config.ts pour le choix d'architecture.
 *
 * `suppressHydrationWarning` on <html> is required: the IIFE mutates <html>
 * attributes before React hydrates, so the server markup and the post-IIFE DOM
 * intentionally differ on data-ax-* — that is the anti-flash design, not a bug.
 *
 * The whole app is wrapped in <CustomizerProvider> (a client component) so the
 * customizer/header controls share one source of theme truth.
 */
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { CustomizerProvider } from '../src/context/CustomizerContext';
import '../src/styles/app.css';

/* The anti-flash IIFE — verbatim from the HTML reference. MUST run before the
   stylesheet and before React. Kept as a string so Next inlines it untouched. */
const ANTI_FLASH = `
(function () {
  var D = document.documentElement, LS;
  try { LS = window.localStorage; } catch (e) { LS = null; }
  function get(k){ try { return LS && LS.getItem(k); } catch(e){ return null; } }

  /* schema guard: wipe unknown shape, never throw */
  try { if (LS && get('ax:schema') && get('ax:schema') !== '1') {
    Object.keys(LS).forEach(function(k){ if (k.indexOf('ax:')===0) LS.removeItem(k); });
  } if (LS) LS.setItem('ax:schema','1'); } catch(e){}

  /* ---- THEME (light | dark | system) ---- */
  var theme = get('ax:theme') || 'system';
  var sysDark = false;
  try { sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches; } catch(e){}
  var resolved = (theme === 'system') ? (sysDark ? 'dark' : 'light') : theme;
  D.setAttribute('data-ax-theme', resolved);

  /* ---- ACCENT ---- */
  var accent = get('ax:accent') || 'verdigris';
  if (accent === 'verdigris') D.removeAttribute('data-ax-accent');
  else D.setAttribute('data-ax-accent', accent);

  /* ---- DIR ---- */
  /* L'attribut lang n'est plus gere ici : depuis la mise en place de next-intl
     (7 sept 2026), la locale est resolue par cookie cote serveur et rendue
     directement sur <html>. Deux sources de verite pour la meme information
     finissent toujours par diverger. La direction, elle, reste ici : elle a un
     effet visuel immediat, donc un risque de scintillement.
     Ce bloc vit dans un litteral de gabarit : pas d'accent grave dans ce commentaire. */
  var dirStored = get('ax:dir');
  D.setAttribute('dir', dirStored ? dirStored : 'ltr');

  /* ---- LAYOUT / SCHEME attributes (write only non-defaults) ---- */
  function setAttr(attr, key, def){
    var v = get(key);
    if (v && v !== def) D.setAttribute(attr, v); else D.removeAttribute(attr);
  }
  setAttr('data-ax-nav',              'ax:nav',              'vertical');
  setAttr('data-ax-shell-style',      'ax:shell-style',      'default');
  setAttr('data-ax-sidebar-behavior', 'ax:sidebar-behavior', 'collapsible');
  setAttr('data-ax-menu',             'ax:menu',             'click');
  setAttr('data-ax-page',             'ax:page',             'regular');
  setAttr('data-ax-width',            'ax:width',            'fluid');
  setAttr('data-ax-header-position',  'ax:header-position',  'fixed');
  setAttr('data-ax-sidebar-position', 'ax:sidebar-position', 'fixed');
  setAttr('data-ax-sidebar',          'ax:sidebar-scheme',   'light');
  setAttr('data-ax-header',           'ax:header-scheme',    'light');
  setAttr('data-ax-sidebar-image',    'ax:sidebar-image',    'none');
  setAttr('data-ax-loader',           'ax:loader',           'on');

  /* ---- COLLAPSED RAIL (header toggle; default expanded) ---- */
  var behavior = get('ax:sidebar-behavior') || 'collapsible';
  if (behavior === 'collapsible' && get('ax:collapsed') === '1') D.setAttribute('data-ax-collapsed', '');
  else D.removeAttribute('data-ax-collapsed');

  /* ---- CUSTOM COLOR PICKERS (inline style; re-derive ramp deterministically) ---- */
  var customAccent = get('ax:accent-custom');
  if (accent === 'custom' && customAccent) {
    D.style.setProperty('--ax-accent', customAccent);
    var h = customAccent.replace('#','');
    var r=parseInt(h.substr(0,2),16),g=parseInt(h.substr(2,2),16),b=parseInt(h.substr(4,2),16);
    var L = (0.2126*r + 0.7152*g + 0.0722*b)/255;
    D.style.setProperty('--ax-on-accent', L > 0.62 ? '#1F1602' : '#FFFFFF');
    D.setAttribute('data-ax-accent','custom');
  }
  var bg = get(resolved === 'dark' ? 'ax:bg-custom-dark' : 'ax:bg-custom');
  if (bg) D.style.setProperty('--ax-canvas', bg);
})();
`;

export const metadata: Metadata = {
  title: {
    default: 'Made in Yeumbeul Nord — Suivi-évaluation',
    template: '%s · Made in Yeumbeul Nord',
  },
  description:
    "Plateforme de suivi-évaluation et de valorisation des 100 groupements de Yeumbeul Nord. " +
    "Projet And Jappo Meunal Souniou Bopp, porté par la Commune de Yeumbeul Nord.",
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0A0C11' },
    { media: '(prefers-color-scheme: light)', color: '#FCFBF9' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Locale résolue côté serveur depuis le cookie (src/i18n/request.ts).
  // C'est la seule source de vérité de la langue : le script anti-flash ne touche
  // plus à l'attribut `lang`.
  const locale = await getLocale();

  /*
   * Seuls les espaces de noms réellement consommés par des composants clients
   * traversent la frontière serveur/client.
   *
   * Sans cette sélection, `NextIntlClientProvider` hérite de tout le catalogue et
   * l'embarque dans la charge utile de chaque page — dont `navigation`, ses
   * 204 entrées, qu'aucun composant client ne lit : le manifeste porte déjà ses
   * titres, ce catalogue n'existe que pour l'arrivée du wolof.
   *
   * Ajouter un espace ici le jour où un composant client en a besoin.
   */
  const messages = await getMessages();
  const messagesClient = {
    commun: messages.commun,
    chrome: messages.chrome,
    ecrans: messages.ecrans,
  };

  return (
    <html lang={locale} dir="ltr" suppressHydrationWarning>
      <head>
        {/* Anti-flash theme-restore — FIRST in <head>, before app.css. */}
        <script dangerouslySetInnerHTML={{ __html: ANTI_FLASH }} />
        {/* Google Fonts — Inter (sans) · Space Grotesk (display) · JetBrains Mono (mono) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <NextIntlClientProvider messages={messagesClient}>
          <CustomizerProvider>{children}</CustomizerProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
