/*
 * Vireo Next.js — (shell) route-group layout.
 *
 * Every route in this group renders inside the Aurora app shell. The shell
 * (sidebar / header / footer / customizer / command palette / loader) is the
 * client <Layout> component; the routed page arrives as `children` where the
 * reference put its <Outlet/>. Pages add their own <PageHead> at the top.
 *
 * To make a page render WITHOUT the shell (e.g. auth / error / landing screens
 * when they are ported), put it in a different route group, NOT under (shell).
 *
 * `SessionProvider` n'enveloppe que ce groupe : les écrans d'authentification
 * sont dans `(bare)` et n'ont personne à identifier — leur faire appeler
 * `/api/auth/moi/` produirait un 403 attendu à chaque affichage de la page de
 * connexion.
 */
import type { ReactNode } from 'react';
import { SessionProvider } from '../../src/context/SessionContext';
import { Layout } from '../../src/components/shell/Layout';

export default function ShellLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <Layout>{children}</Layout>
    </SessionProvider>
  );
}
