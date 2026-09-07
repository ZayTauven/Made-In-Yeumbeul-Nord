'use client';
/*
 * Sous-navigation du module Groupements — la rangée `.ax-tabs` du template.
 *
 * Les libellés et les routes viennent du manifeste (CLAUDE.md §5) : ils sont
 * repris ici tels quels plutôt que réinventés, pour que l'onglet et l'entrée de
 * sidebar qui mènent au même écran portent le même mot.
 */
import Link from 'next/link';
import { useTranslations } from 'next-intl';

const ONGLETS = [
  { slug: 'crm/companies', cle: 'annuaire' },
  { slug: 'crm/deals', cle: 'etapes' },
  { slug: 'crm/leads', cle: 'candidats' },
  { slug: 'crm/contacts', cle: 'membres' },
] as const;

export function SousNavigationGroupements({ actif }: { actif: string }) {
  const t = useTranslations('ecrans');

  return (
    <nav className="ax-tabs ax-tabs--pill" aria-label={t('groupements.sousNavigation')} style={{ marginBottom: 'var(--ax-space-5)' }}>
      <div className="ax-tabs__list" role="tablist">
        {ONGLETS.map((onglet) => {
          const courant = onglet.slug === actif;
          return (
            <Link
              key={onglet.slug}
              className={`ax-tabs__tab${courant ? ' is-active' : ''}`}
              role="tab"
              aria-selected={courant ? true : undefined}
              aria-current={courant ? 'page' : undefined}
              href={`/${onglet.slug}`}
            >
              {t(`groupements.onglets.${onglet.cle}`)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default SousNavigationGroupements;
