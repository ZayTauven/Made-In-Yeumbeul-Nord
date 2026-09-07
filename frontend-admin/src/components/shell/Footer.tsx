/*
 * Pied de page de l'interface d'administration.
 *
 * Composant serveur (aucune interactivité). Les libellés viennent du catalogue
 * `chrome`, les destinations du manifeste de navigation.
 *
 * La mention institutionnelle est celle de la Commune de Yeumbeul Nord, tutelle du
 * projet — c'est précisément l'emploi prévu pour l'emblème de la commune, qui n'est
 * pas l'identité du produit (CLAUDE.md §3).
 */
import Link from 'next/link';
import { useTranslations } from 'next-intl';

/** Année de la mention légale. Fixe : elle ne doit pas dépendre de l'horloge du poste,
 *  sous peine de diverger entre le rendu serveur et le rendu client. */
const ANNEE = 2026;

export function Footer() {
  const t = useTranslations('chrome');

  return (
    <footer className="ax-footer">
      <div className="ax-footer__left">
        {/* L'annee est passee en chaine : un nombre serait formate avec le
            separateur de milliers francais, et afficherait « 2 026 ». */}
        <span className="ax-footer__copy">{t('marque.copyright', { annee: String(ANNEE) })}</span>
        <span className="ax-footer__sep" aria-hidden="true">·</span>
        <span className="ax-footer__version ax-mono">{t('marque.version')}</span>
      </div>
      <nav className="ax-footer__links" aria-label={t('piedDePage.aria')}>
        <Link className="ax-footer__link" href="/pages/landing">{t('piedDePage.aPropos')}</Link>
        <Link className="ax-footer__link" href="/pages/support">{t('piedDePage.aide')}</Link>
        <Link className="ax-footer__link" href="/pages/terms">{t('piedDePage.conditions')}</Link>
        <Link className="ax-footer__link" href="/pages/privacy">{t('piedDePage.confidentialite')}</Link>
      </nav>
    </footer>
  );
}

export default Footer;
