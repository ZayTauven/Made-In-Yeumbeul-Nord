"""
Vues de l'API — MADE IN YEUMBEUL NORD
=====================================

Les vues restent minces : les règles de calcul du suivi-évaluation vivent dans
`api.agregations`, où elles se testent sans passer par HTTP.
"""

from .authentification import (
    ChangementMotDePasseView,
    ConnexionView,
    DeconnexionView,
    JetonCsrfView,
    ProfilView,
)
from .catalogue import (
    FiliereViewSet,
    GroupementViewSet,
    ProductionViewSet,
    QuartierViewSet,
)
from .commerce import BoutiqueViewSet, CommandeViewSet
from .contenus import ActualiteViewSet, JournalViewSet
from .finances import FinancementViewSet, MouvementViewSet, ResumeFinancementView
from .formations import (
    CertificationViewSet,
    FormationViewSet,
    ResumeFormationsView,
    SessionViewSet,
)
from .suivi import (
    ActiviteViewSet,
    CadreLogiqueView,
    CroisementView,
    EntonnoirView,
    IndicateurViewSet,
    JalonViewSet,
    KpisView,
    RepartitionView,
    ResumePlanActionView,
    recherche_globale,
)

__all__ = [
    # Authentification
    "JetonCsrfView",
    "ConnexionView",
    "DeconnexionView",
    "ProfilView",
    "ChangementMotDePasseView",
    # Catalogue
    "QuartierViewSet",
    "FiliereViewSet",
    "GroupementViewSet",
    "ProductionViewSet",
    # Suivi-évaluation
    "ActiviteViewSet",
    "JalonViewSet",
    "IndicateurViewSet",
    "CadreLogiqueView",
    "KpisView",
    "EntonnoirView",
    "RepartitionView",
    "CroisementView",
    "ResumePlanActionView",
    "recherche_globale",
    # Formations
    "FormationViewSet",
    "SessionViewSet",
    "CertificationViewSet",
    "ResumeFormationsView",
    # Finances
    "FinancementViewSet",
    "MouvementViewSet",
    "ResumeFinancementView",
    # Commerce
    "BoutiqueViewSet",
    "CommandeViewSet",
    # Contenus
    "ActualiteViewSet",
    "JournalViewSet",
]
