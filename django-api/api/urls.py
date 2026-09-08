"""
Routage de l'API.

Les chemins reproduisent le contrat écrit par les fronts
(`PLAN & PRODUCT/15-CONTRAT-API.md`). Toute route déclarée ici est consommée par
au moins un écran : ce n'est pas une API générique, c'est le dos des écrans.

Les vues d'agrégation sont déclarées **avant** le routeur : sans cela,
`/api/activites/resume/` serait capturé par la route de détail
`/api/activites/{code}/` et chercherait une activité de code « resume ».
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import vues

router = DefaultRouter()

# Référentiels
router.register(r"quartiers", vues.QuartierViewSet, basename="quartier")
router.register(r"filieres", vues.FiliereViewSet, basename="filiere")

# Catalogue
router.register(r"groupements", vues.GroupementViewSet, basename="groupement")
router.register(r"productions", vues.ProductionViewSet, basename="production")

# Suivi-évaluation
router.register(r"activites", vues.ActiviteViewSet, basename="activite")
router.register(r"jalons", vues.JalonViewSet, basename="jalon")
router.register(r"suivi/indicateurs", vues.IndicateurViewSet, basename="indicateur")

# Formations
router.register(r"formations", vues.FormationViewSet, basename="formation")
router.register(r"sessions", vues.SessionViewSet, basename="session")
router.register(r"certifications", vues.CertificationViewSet, basename="certification")

# Financement
router.register(r"financements", vues.FinancementViewSet, basename="financement")
router.register(r"mouvements", vues.MouvementViewSet, basename="mouvement")

# Commerce et contenus
router.register(r"boutiques", vues.BoutiqueViewSet, basename="boutique")
router.register(r"commandes", vues.CommandeViewSet, basename="commande")
router.register(r"actualites", vues.ActualiteViewSet, basename="actualite")
router.register(r"journal", vues.JournalViewSet, basename="journal")


urlpatterns = [
    # --- Authentification -------------------------------------------------- #
    # Le front récupère d'abord le jeton CSRF, puis ouvre sa session. Tous ses
    # appels portent `credentials: "include"`, sans quoi le cookie ne part pas.
    path("auth/csrf/", vues.JetonCsrfView.as_view(), name="auth-csrf"),
    path("auth/connexion/", vues.ConnexionView.as_view(), name="auth-connexion"),
    path("auth/deconnexion/", vues.DeconnexionView.as_view(), name="auth-deconnexion"),
    path("auth/moi/", vues.ProfilView.as_view(), name="auth-moi"),
    path(
        "auth/mot-de-passe/",
        vues.ChangementMotDePasseView.as_view(),
        name="auth-mot-de-passe",
    ),
    # --- Agrégations, avant le routeur (voir l'entête) --------------------- #
    path("suivi/kpis/", vues.KpisView.as_view(), name="suivi-kpis"),
    path(
        "suivi/cadre-logique/",
        vues.CadreLogiqueView.as_view(),
        name="suivi-cadre-logique",
    ),
    path("suivi/entonnoir/", vues.EntonnoirView.as_view(), name="suivi-entonnoir"),
    path("suivi/repartition/", vues.RepartitionView.as_view(), name="suivi-repartition"),
    path("suivi/croisement/", vues.CroisementView.as_view(), name="suivi-croisement"),
    path(
        "activites/resume/",
        vues.ResumePlanActionView.as_view(),
        name="activites-resume",
    ),
    path(
        "formations/resume/",
        vues.ResumeFormationsView.as_view(),
        name="formations-resume",
    ),
    path(
        "financements/resume/",
        vues.ResumeFinancementView.as_view(),
        name="financements-resume",
    ),
    path("recherche/", vues.recherche_globale, name="recherche-globale"),
    # --- Ressources -------------------------------------------------------- #
    path("", include(router.urls)),
]
