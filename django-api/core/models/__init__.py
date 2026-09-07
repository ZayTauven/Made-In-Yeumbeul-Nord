"""
Modèles métier — MADE IN YEUMBEUL NORD
======================================

Le modèle est éclaté par domaine plutôt que ramassé dans un `models.py` unique :
une vingtaine d'entités dans un seul fichier se relit mal, et le découpage suit
les mêmes frontières que les catalogues de libellés des deux fronts.

L'importation reste inchangée pour le reste du code : `from core.models import
Groupement` fonctionne comme si le fichier unique existait toujours.

Deux principes traversent l'ensemble :

1. **Ce qui se déduit ne se stocke pas.** Effectif, part de femmes, progression,
   statut d'activité, taux de présence, montant d'une commande : autant de
   valeurs dérivées. Un compteur stocké qui contredit la liste affichée juste en
   dessous est le défaut le plus visible d'une démonstration.
2. **Les montants sont des entiers en FCFA.** Jamais de `DecimalField`, que DRF
   sérialiserait en chaîne de caractères.
"""

from .base import Horodate
from .commerce import Boutique, Commande, LigneCommande
from .contenus import Actualite, EvenementJournal
from .finances import Financement, MouvementFinancier
from .formations import Certification, Formation, Participation, SessionFormation
from .groupements import Groupement, Membre
from .productions import Production
from .suivi import (
    Activite,
    AxeStrategique,
    Indicateur,
    Jalon,
    ReleveIndicateur,
    ResultatAttendu,
)
from .territoire import Commune, Filiere, Quartier

__all__ = [
    "Horodate",
    # Territoire
    "Commune",
    "Quartier",
    "Filiere",
    # Groupements
    "Groupement",
    "Membre",
    # Productions
    "Production",
    # Suivi-évaluation
    "AxeStrategique",
    "ResultatAttendu",
    "Indicateur",
    "ReleveIndicateur",
    "Activite",
    "Jalon",
    # Formations
    "Formation",
    "SessionFormation",
    "Participation",
    "Certification",
    # Finances
    "Financement",
    "MouvementFinancier",
    # Commerce
    "Boutique",
    "Commande",
    "LigneCommande",
    # Contenus
    "Actualite",
    "EvenementJournal",
]
