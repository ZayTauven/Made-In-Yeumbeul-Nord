"""
Sérialiseurs de l'API — MADE IN YEUMBEUL NORD
=============================================

Les noms de champs sont en `snake_case` et reproduisent **à l'identique** les
types TypeScript de `frontend-admin/src/domaine/types.ts`. Aucune couche de
transposition n'existe côté front : un champ renommé ici casse un écran là-bas
(`PLAN & PRODUCT/15-CONTRAT-API.md` §2).
"""

from .commerce import (
    BoutiqueSerializer,
    CommandeSerializer,
    LigneCommandeSerializer,
)
from .comptes import (
    ChangementMotDePasseSerializer,
    ConnexionSerializer,
    DemandeReinitialisationSerializer,
    JetonCsrfSerializer,
    ProfilSerializer,
    ReinitialisationSerializer,
)
from .contenus import ActualiteSerializer, EvenementJournalSerializer
from .finances import (
    FinancementSerializer,
    MouvementFinancierSerializer,
    ResumeFinancementSerializer,
)
from .formations import (
    CertificationSerializer,
    FormationSerializer,
    MarquerPresenceSerializer,
    ParticipationSerializer,
    ResumeFormationsSerializer,
    SessionFormationSerializer,
)
from .groupements import (
    GroupementSerializer,
    MembreSerializer,
    PointCarteSerializer,
)
from .productions import ProductionSerializer
from .suivi import (
    ActiviteSerializer,
    AxeStrategiqueSerializer,
    CadreLogiqueSerializer,
    CroisementSerializer,
    EtapeEntonnoirSerializer,
    IndicateurSerializer,
    JalonSerializer,
    KpiSerializer,
    PointSerieSerializer,
    RepartitionSerializer,
    ResultatAttenduSerializer,
    ResultatRechercheSerializer,
    ResumePlanActionSerializer,
)
from .territoire import (
    FiliereSerializer,
    QuartierSerializer,
    compteurs_referentiels,
)

__all__ = [
    "compteurs_referentiels",
    # Comptes
    "ProfilSerializer",
    "ConnexionSerializer",
    "ChangementMotDePasseSerializer",
    "JetonCsrfSerializer",
    "DemandeReinitialisationSerializer",
    "ReinitialisationSerializer",
    # Territoire
    "QuartierSerializer",
    "FiliereSerializer",
    # Groupements
    "GroupementSerializer",
    "MembreSerializer",
    "PointCarteSerializer",
    # Productions
    "ProductionSerializer",
    # Suivi-évaluation
    "KpiSerializer",
    "PointSerieSerializer",
    "RepartitionSerializer",
    "EtapeEntonnoirSerializer",
    "ResultatRechercheSerializer",
    "AxeStrategiqueSerializer",
    "ResultatAttenduSerializer",
    "IndicateurSerializer",
    "CadreLogiqueSerializer",
    "CroisementSerializer",
    "ActiviteSerializer",
    "JalonSerializer",
    "ResumePlanActionSerializer",
    # Formations
    "FormationSerializer",
    "SessionFormationSerializer",
    "CertificationSerializer",
    "ParticipationSerializer",
    "MarquerPresenceSerializer",
    "ResumeFormationsSerializer",
    # Finances
    "FinancementSerializer",
    "MouvementFinancierSerializer",
    "ResumeFinancementSerializer",
    # Commerce
    "BoutiqueSerializer",
    "CommandeSerializer",
    "LigneCommandeSerializer",
    # Contenus
    "ActualiteSerializer",
    "EvenementJournalSerializer",
]
