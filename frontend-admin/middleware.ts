/**
 * Garde de navigation — MADE IN YEUMBEUL NORD
 * ===========================================
 *
 * Renvoie vers l'écran de connexion quiconque atteint le back-office sans
 * session ouverte. Sans lui, `/` servait le tableau de bord à n'importe quel
 * visiteur — et l'écran de déconnexion y ramenait au bout de dix secondes.
 *
 * **Ce n'est pas la sécurité, c'est la navigation.** Le contrôle qui compte est
 * côté API : Django refuse toute écriture sans session valide, quels que soient
 * les détours du navigateur. Ici on ne fait que vérifier la *présence* du
 * cookie de session, sans en vérifier la validité — la contrôler exigerait un
 * appel à l'API à chaque navigation, pour un gain nul face à un attaquant qui
 * peut de toute façon forger un cookie sans valeur.
 *
 * **Limite connue.** Le cookie de session est posé par Django sur `localhost`.
 * Les cookies ignorent le port, `localhost:8000` et `localhost:3000` le
 * partagent donc en développement. En production, la garde ne tiendra que si
 * l'API et le front partagent le même domaine parent — un reverse proxy
 * `exemple.sn/api` et `exemple.sn` répond au besoin. À défaut, il faudra passer
 * par une vérification serveur dans le layout du groupe `(shell)`.
 */
import { NextResponse, type NextRequest } from 'next/server';

/** Nom du cookie de session Django, valeur par défaut de `SESSION_COOKIE_NAME`. */
const COOKIE_SESSION = 'sessionid';

/** Écran vers lequel un visiteur sans session est renvoyé. */
const ROUTE_CONNEXION = '/auth/sign-in-cover';

/**
 * Préfixes ouverts sans session.
 *
 * `/pages/landing` est la présentation publique du projet, `/error` doit rester
 * atteignable pour afficher une panne, et `/auth` est précisément l'endroit où
 * l'on va se connecter — l'y renvoyer en boucle serait un piège.
 */
const PREFIXES_PUBLICS = [
  '/auth',
  '/error',
  '/pages/landing',
  '/pages/coming-soon',
  '/pages/logout',
];

export function middleware(requete: NextRequest) {
  const chemin = requete.nextUrl.pathname;

  if (PREFIXES_PUBLICS.some((prefixe) => chemin.startsWith(prefixe))) {
    return NextResponse.next();
  }

  if (requete.cookies.has(COOKIE_SESSION)) {
    return NextResponse.next();
  }

  const destination = requete.nextUrl.clone();
  destination.pathname = ROUTE_CONNEXION;
  destination.search = '';
  // On garde où l'agent voulait aller : après connexion, il y est conduit
  // plutôt que déposé sur l'accueil.
  if (chemin !== '/') {
    destination.searchParams.set('suite', chemin + requete.nextUrl.search);
  }
  return NextResponse.redirect(destination);
}

export const config = {
  /*
   * Tout sauf les ressources : les fichiers de Next, les images optimisées, le
   * favicon et les dossiers servis depuis `public/`. Les faire passer par la
   * garde n'apporterait rien et casserait l'écran de connexion lui-même, qui a
   * besoin de sa photographie.
   */
  matcher: ['/((?!_next/static|_next/image|favicon|img|brand|assets).*)'],
};
