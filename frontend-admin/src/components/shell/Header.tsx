'use client';
/*
 * Vireo Next.js — Header (top bar).
 *
 * Faithful re-expression of partials/header.html: sidebar toggle, ⌘K command
 * search, language menu, fullscreen, light/dark quick-toggle, app grid, cart,
 * notifications, profile, and the customizer trigger. Dropdowns use the native
 * <Dropdown> primitive (Alpine axDropdown re-implementation). Same DOM classes
 * and ARIA as the reference so pixels match.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Dropdown } from '../ui/Dropdown';
import { useCustomizer } from '../../context/CustomizerContext';
import { useSession } from '../../context/SessionContext';
import { formaterFcfa } from '../../domaine';

/** Libellés des rôles, pour la ligne secondaire du bloc de compte. */
const ROLES: Record<string, string> = {
  administrateur: 'Administrateur',
  agent: 'Agent',
  lecture: 'Lecture seule',
};

/*
 * Contenu de démonstration de l'en-tête.
 *
 * Ces valeurs sont figées et non tirées au sort : l'en-tête est rendu sur chaque
 * écran, et un contenu aléatoire changerait à chaque navigation.
 *
 * À brancher sur la source de données quand les écrans correspondants existeront —
 * `listerCommandes()` et `journalActivite()` de `domaine/source.ts` servent déjà
 * exactement ces formes.
 *
 * Le bloc de compte, lui, n'est plus une démonstration : il affiche le compte
 * réellement connecté, lu par `useSession()`.
 */

const NOTIFICATIONS_NON_LUES = 2;

const COMMANDES_EN_ATTENTE = 3;

const COMMANDES_APERCU = [
  {
    photo: '/img/photos/thumbs/foire-stand-cosmetiques-vendeuse.webp',
    nom: 'Beurre de karité pur — GIE Jàppo',
    detail: '4 × 3 500 FCFA',
  },
  {
    photo: '/img/photos/thumbs/marche-cereales-vendeuses.webp',
    nom: 'Couscous de mil — Coopérative Teranga',
    detail: '10 × 1 200 FCFA',
  },
  {
    photo: '/img/photos/thumbs/restauration-vente-plats-rue.webp',
    nom: 'Plateau traiteur — GIE Bokk Jom',
    detail: '1 × 35 000 FCFA',
  },
];

const TOTAL_APERCU = 4 * 3500 + 10 * 1200 + 35000;

const ICON = {
  burger: (
    <svg className="ax-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true"><path d="M4 6l16 0" /><path d="M4 12l16 0" /><path d="M4 18l16 0" /></svg>
  ),
  search: (
    <svg className="ax-icon ax-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true"><path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" /></svg>
  ),
  apps: (
    <svg className="ax-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true"><path d="M4 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4" /><path d="M14 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4" /><path d="M4 15a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4" /><path d="M14 15a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -4" /></svg>
  ),
  cart: (
    <svg className="ax-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true"><path d="M6.331 8h11.339a2 2 0 0 1 1.977 2.304l-1.255 8.152a3 3 0 0 1 -2.966 2.544h-6.852a3 3 0 0 1 -2.965 -2.544l-1.255 -8.152a2 2 0 0 1 1.977 -2.304" /><path d="M9 11v-5a3 3 0 0 1 6 0v5" /></svg>
  ),
  bell: (
    <svg className="ax-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true"><path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6" /><path d="M9 17v1a3 3 0 0 0 6 0v-1" /></svg>
  ),
  cog: (
    <svg className="ax-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true"><path d="M4 10a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M6 4v4" /><path d="M6 12v8" /><path d="M10 16a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M12 4v10" /><path d="M12 18v2" /><path d="M16 7a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" /><path d="M18 4v1" /><path d="M18 9v11" /></svg>
  ),
  check: (
    <svg className="ax-dropdown__check ax-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true"><path d="M5 12l5 5l10 -10" /></svg>
  ),
};

/*
 * Langues proposées.
 *
 * Le template en offrait huit, purement décoratives. Le projet n'en sert qu'une :
 * le français. Le wolof est prévu mais pas livré — l'ajouter ici sans catalogue
 * `messages/wo/` afficherait des clés brutes.
 *
 * Attention le jour où une deuxième langue arrive : `c.setLang()` écrit dans
 * `localStorage`, alors que `next-intl` lit la locale dans le cookie `ax:locale`
 * (voir src/i18n/config.ts). Le sélecteur devra écrire le cookie et provoquer un
 * nouveau rendu serveur, sinon il changera l'attribut `lang` sans changer un seul
 * libellé.
 */
const LANGS: Array<[string, string]> = [['FR', 'Français']];

export function Header({
  onCommand,
  onCustomizer,
}: {
  onCommand: () => void;
  onCustomizer: () => void;
}) {
  const c = useCustomizer();
  const t = useTranslations('chrome');
  const { profil, chargement } = useSession();
  const [full, setFull] = useState(false);

  /*
   * Compte connecté. Pendant le premier appel — quelques dizaines de
   * millisecondes — on n'affiche ni nom ni initiales inventés : un libellé
   * d'attente vaut mieux qu'une identité qui change sous les yeux.
   */
  const nomCompte = chargement
    ? t('enTete.chargementCompte')
    : (profil?.nom_complet || profil?.username || t('enTete.compteInconnu'));
  const sousTitreCompte = profil
    ? profil.email || [profil.fonction, ROLES[profil.role]].filter(Boolean).join(' · ')
    : '';

  /**
   * Avatar à initiales, jamais un portrait.
   *
   * Le template posait ici une photographie de visage. Le corpus du projet ne
   * contient que des personnes réelles : leur faire incarner un compte serait
   * un détournement d'image (CLAUDE.md §5). Les initiales et la teinte
   * viennent du compte lui-même.
   */
  function AvatarCompte({ taille = 'sm' }: { taille?: 'sm' | 'md' }) {
    const teinte = profil?.avatar_teinte || 'var(--ax-accent)';
    return (
      <span
        className={`ax-avatar ax-avatar--${taille}${taille === 'sm' ? ' ax-profile__avatar' : ''}`}
        style={{
          background: `color-mix(in oklab, ${teinte} 18%, transparent)`,
          color: teinte,
          flex: 'none',
        }}
        aria-hidden="true"
      >
        <span className="ax-avatar__initials">{profil?.initiales || '—'}</span>
      </span>
    );
  }

  useEffect(() => {
    const onFs = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  return (
    <header className="ax-header" role="banner">
      {/* 1 · SIDEBAR TOGGLE */}
      <button
        type="button"
        className="ax-nav-toggle ax-icon-btn"
        onClick={c.toggleCollapsed}
        aria-label={t('enTete.basculerMenu')}
        aria-expanded={!c.collapsed}
      >
        {ICON.burger}
      </button>

      {/* 2 · COMMAND SEARCH (⌘K) */}
      <button
        type="button"
        className="ax-search"
        onClick={onCommand}
        aria-haspopup="dialog"
        aria-controls="ax-command"
        aria-label={t('enTete.rechercher')}
      >
        {ICON.search}
        <span className="ax-search__placeholder">{t('enTete.rechercher')}</span>
        <kbd className="ax-search__keycap">⌘K</kbd>
      </button>

      <span className="ax-header__spacer"></span>

      {/* 4 · LANGUAGE */}
      <Dropdown
        className="ax-lang"
        panelClassName="ax-dropdown ax-lang__menu"
        trigger={({ open, triggerProps }) => (
          <button
            type="button"
            className="ax-icon-btn ax-lang__trigger"
            aria-label={t('enTete.changerLangue')}
            {...triggerProps}
            aria-expanded={open}
          >
            <span className="ax-lang__code">{c.lang}</span>
          </button>
        )}
      >
        {LANGS.map(([code, name]) => (
          <button
            key={code}
            type="button"
            className={`ax-dropdown__item${c.lang === code ? ' is-active' : ''}`}
            role="menuitemradio"
            aria-checked={c.lang === code}
            onClick={() => c.setLang(code)}
          >
            <span className="ax-lang__code">{code}</span>
            <span className="ax-lang__name">{name}</span>
            {c.lang === code && ICON.check}
          </button>
        ))}
      </Dropdown>

      {/* 5 · FULLSCREEN */}
      <button
        type="button"
        className="ax-fullscreen ax-icon-btn"
        onClick={toggleFullscreen}
        aria-pressed={full}
        aria-label={t('enTete.pleinEcran')}
      >
        {!full ? (
          <svg className="ax-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true"><path d="M4 8v-2a2 2 0 0 1 2 -2h2" /><path d="M4 16v2a2 2 0 0 0 2 2h2" /><path d="M16 4h2a2 2 0 0 1 2 2v2" /><path d="M16 20h2a2 2 0 0 0 2 -2v-2" /></svg>
        ) : (
          <svg className="ax-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true"><path d="M15 19v-2a2 2 0 0 1 2 -2h2" /><path d="M15 5v2a2 2 0 0 0 2 2h2" /><path d="M5 15h2a2 2 0 0 1 2 2v2" /><path d="M5 9h2a2 2 0 0 0 2 -2v-2" /></svg>
        )}
      </button>

      {/* 6 · LIGHT/DARK QUICK-TOGGLE */}
      <button
        type="button"
        className="ax-theme-toggle ax-icon-btn"
        data-ax-toggle="theme"
        onClick={c.toggleTheme}
        aria-pressed={c.themeResolved === 'dark'}
        aria-label={t('enTete.themeSombre')}
      >
        {c.themeResolved === 'dark' ? (
          <svg className="ax-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true"><path d="M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /><path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7" /></svg>
        ) : (
          <svg className="ax-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true"><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454l0 .008" /></svg>
        )}
      </button>

      {/* 7 · APP-GRID */}
      <Dropdown
        className="ax-apps"
        panelClassName="ax-dropdown ax-apps__menu"
        trigger={({ open, triggerProps }) => (
          <button type="button" className="ax-icon-btn ax-apps__trigger" aria-label={t('enTete.applications')} {...triggerProps} aria-expanded={open}>
            {ICON.apps}
          </button>
        )}
      >
        <p className="ax-dropdown__head">{t('enTete.applications')}</p>
        {/* Les destinations sont les slugs du manifeste de navigation. Les tuiles du
            template pointaient vers la messagerie et le gestionnaire de fichiers ;
            ce sont les modules du projet qu'un agent de la coordination ouvre. */}
        <div className="ax-apps__grid">
          <AppTile to="/crm/companies" label={t('accesRapides.annuaire')} />
          <AppTile to="/maps/leaflet" label={t('accesRapides.cartographie')} />
          <AppTile to="/dashboards/projects" label={t('accesRapides.suivi')} />
          <AppTile to="/dashboards/lms" label={t('accesRapides.formations')} />
          <AppTile to="/ecommerce/invoices" label={t('accesRapides.decaissements')} />
          <AppTile to="/apps/calendar" label={t('accesRapides.calendrier')} />
          <AppTile to="/ecommerce/orders" label={t('accesRapides.commandes')} />
          <AppTile to="/pages/activity-log" label={t('accesRapides.journal')} />
        </div>
        <Link className="ax-dropdown__foot" href="/widgets">{t('enTete.voirTousLesModules')}</Link>
      </Dropdown>

      {/*
        8 · COMMANDES RECENTES (le panier du template)
        La structure DOM et les classes .ax-cart__* sont conservees telles quelles :
        la feuille de style les cible et les renommer casserait la mise en forme.
        Seul le contenu change — un panier d'achat n'a rien a faire dans l'en-tete
        d'un outil de suivi-evaluation, alors qu'un apercu des dernieres commandes
        recues depuis la vitrine y a toute sa place.
        A ARBITRER avec yn-front-admin : garder ce bloc, ou le retirer.
      */}
      <Dropdown
        className="ax-cart"
        panelClassName="ax-dropdown ax-cart__menu"
        trigger={({ open, triggerProps }) => (
          <button type="button" className="ax-icon-btn ax-cart__trigger" aria-label={t('commandes.aria', { nombre: COMMANDES_EN_ATTENTE })} {...triggerProps} aria-expanded={open}>
            {ICON.cart}
            <span className="ax-badge-count" aria-hidden="true">{COMMANDES_EN_ATTENTE}</span>
          </button>
        )}
      >
        <div className="ax-dropdown__head ax-cart__head">
          <span>{t('commandes.titre')}</span>
          <span className="ax-cart__count">{t('commandes.compte', { nombre: COMMANDES_EN_ATTENTE })}</span>
        </div>
        <ul className="ax-cart__list" role="presentation">
          {COMMANDES_APERCU.map((ligne) => (
            <CartRow key={ligne.nom} img={ligne.photo} name={ligne.nom} qty={ligne.detail} />
          ))}
        </ul>
        <div className="ax-cart__subtotal">
          <span>{t('commandes.total')}</span>
          <span className="ax-mono">{formaterFcfa(TOTAL_APERCU)}</span>
        </div>
        <div className="ax-cart__actions">
          <Link className="ax-btn ax-btn--ghost ax-btn--sm" href="/ecommerce/orders">{t('commandes.voirLesCommandes')}</Link>
          <Link className="ax-btn ax-btn--accent ax-btn--sm" href="/vitrine/boutiques-temoins">{t('commandes.ouvrirLaVitrine')}</Link>
        </div>
      </Dropdown>

      {/* 9 · NOTIFICATIONS */}
      <Dropdown
        className="ax-notif"
        panelClassName="ax-dropdown ax-notif__menu"
        panelRole="dialog"
        panelAriaLabel={t('enTete.notifications')}
        trigger={({ open, triggerProps }) => (
          <button type="button" className="ax-icon-btn ax-notif__trigger" aria-label={t('enTete.notificationsAria', { nombre: NOTIFICATIONS_NON_LUES })} {...triggerProps} aria-haspopup="dialog" aria-expanded={open}>
            {ICON.bell}
            <span className="ax-badge-count ax-badge-count--dot" aria-hidden="true">{NOTIFICATIONS_NON_LUES}</span>
          </button>
        )}
      >
        <div className="ax-dropdown__head ax-notif__head">
          <span>{t('enTete.notifications')}</span>
          <button type="button" className="ax-notif__mark-all">{t('enTete.marquerToutLu')}</button>
        </div>
        <ul className="ax-notif__list" role="presentation">
          <li className="ax-notif__row is-unread">
            <span className="ax-notif__chip"><img className="ax-avatar" src="/img/avatars/face-woman-4-96.webp" alt="" width={34} height={34} loading="lazy" /></span>
            <span className="ax-notif__body"><b className="ax-notif__title">{t('notifications.mention.titre')}</b><span className="ax-notif__text">{t('notifications.mention.texte')}</span><time className="ax-notif__time ax-mono">{t('notifications.mention.quand')}</time></span>
            <span className="ax-notif__dot" aria-label={t('enTete.nonLue')}></span>
          </li>
          <li className="ax-notif__row is-unread">
            <span className="ax-notif__chip ax-notif__chip--success">{ICON.check}</span>
            <span className="ax-notif__body"><b className="ax-notif__title">{t('notifications.decaissement.titre')}</b><span className="ax-notif__text">{t('notifications.decaissement.texte')}</span><time className="ax-notif__time ax-mono">{t('notifications.decaissement.quand')}</time></span>
            <span className="ax-notif__dot" aria-label={t('enTete.nonLue')}></span>
          </li>
          <li className="ax-notif__row">
            <span className="ax-notif__chip"><img className="ax-avatar" src="/img/avatars/face-man-2-96.webp" alt="" width={34} height={34} loading="lazy" /></span>
            <span className="ax-notif__body"><b className="ax-notif__title">{t('notifications.declaration.titre')}</b><span className="ax-notif__text">{t('notifications.declaration.texte')}</span><time className="ax-notif__time ax-mono">{t('notifications.declaration.quand')}</time></span>
          </li>
        </ul>
        <Link className="ax-dropdown__foot" href="/pages/notifications">{t('enTete.voirToutesNotifications')}</Link>
      </Dropdown>

      {/* 10 · PROFILE */}
      <Dropdown
        className="ax-profile"
        panelClassName="ax-dropdown ax-profile__menu"
        trigger={({ open, triggerProps }) => (
          <button type="button" className="ax-profile__trigger" aria-label={t('enTete.menuCompte')} {...triggerProps} aria-expanded={open}>
            <AvatarCompte />
          </button>
        )}
      >
        <div className="ax-profile__card">
          <AvatarCompte taille="md" />
          <span className="ax-profile__card-meta">
            <b>{nomCompte}</b>
            <small>{sousTitreCompte}</small>
          </span>
        </div>
        <Link className="ax-dropdown__item" role="menuitem" href="/pages/profile">{t('enTete.voirProfil')}</Link>
        <Link className="ax-dropdown__item" role="menuitem" href="/pages/profile-settings">{t('enTete.parametres')}</Link>
        <Link className="ax-dropdown__item" role="menuitem" href="/pages/support">{t('enTete.aide')}</Link>
        <Link className="ax-dropdown__item" role="menuitem" href="/pages/activity-log">{t('enTete.journalAudit')}</Link>
        <div className="ax-dropdown__divider" role="separator"></div>
        <Link className="ax-dropdown__item ax-dropdown__item--danger" role="menuitem" href="/pages/logout">{t('enTete.deconnexion')}</Link>
      </Dropdown>

      {/* 11 · CUSTOMIZER TRIGGER */}
      <button
        type="button"
        className="ax-cog ax-icon-btn"
        data-ax-toggle="customizer"
        onClick={onCustomizer}
        aria-haspopup="dialog"
        aria-controls="ax-customizer"
        aria-label={t('enTete.personnaliser')}
      >
        {ICON.cog}
      </button>
    </header>
  );
}

function AppTile({ to, label }: { to: string; label: string }) {
  return (
    <Link className="ax-apps__tile" role="menuitem" href={to}>
      <span className="ax-apps__tile-icon">
        <svg className="ax-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true"><path d="M4 4h6v6h-6z" /><path d="M14 4h6v6h-6z" /><path d="M4 14h6v6h-6z" /><path d="M14 14h6v6h-6z" /></svg>
      </span>
      <span className="ax-apps__tile-label">{label}</span>
    </Link>
  );
}

function CartRow({ img, name, qty }: { img: string; name: string; qty: string }) {
  const t = useTranslations('chrome');
  return (
    <li className="ax-cart__row">
      <img className="ax-cart__thumb" src={img} alt="" width={40} height={40} loading="lazy" />
      <span className="ax-cart__meta"><b className="ax-cart__name">{name}</b><span className="ax-cart__qty ax-mono">{qty}</span></span>
      <button type="button" className="ax-cart__remove" aria-label={t('commandes.retirer')}>
        <svg className="ax-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
      </button>
    </li>
  );
}

export default Header;
