'use client';
/*
 * Vireo Next.js — generic placeholder for routes not yet ported.
 *
 * The Phase A foundation ships ONE real page (Sales). Every other manifest slug
 * resolves to this starter shell so the sidebar, breadcrumb and command palette
 * all navigate correctly. Page-porting agents replace these with real screens
 * (see CONVENTIONS.md → "Add one page").
 */
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PageHead } from '../components/shell/PageHead';
import { manifest, slugFromPath } from '../lib/manifest';

export function Placeholder() {
  const slug = slugFromPath(usePathname() || '/');
  const node = manifest.bySlug.get(slug);
  const t = useTranslations('chrome');
  const title = node?.title ?? t('placeholder.titreParDefaut');

  return (
    <>
      <PageHead title={title} subtitle={t('placeholder.sousTitre')} />
      <div className="ax-dash-grid">
        <section className="ax-card ax-col--12" role="region" aria-label={title}>
          <div className="ax-card__body">
            <div className="ax-empty" style={{ textAlign: 'center', padding: 'var(--ax-space-8) var(--ax-space-4)' }}>
              <h2 className="ax-card__title" style={{ marginBottom: 'var(--ax-space-2)' }}>{title}</h2>
              <p style={{ color: 'var(--ax-text-muted)' }}>
                {t('placeholder.corps')}
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

export default Placeholder;
