"""
Référentiels métier — MADE IN YEUMBEUL NORD
===========================================

Listes de valeurs stables du projet : étapes d'accompagnement, statuts, filières,
moyens de paiement, plus les barèmes de calcul.

Ce module est le pendant Python de `frontend-admin/src/domaine/referentiels.ts`.
Les deux fichiers doivent rester alignés : un barème qui diverge d'un côté produit
un écran qui contredit son propre tableau, et c'est le défaut le plus coûteux en
démonstration (voir `PLAN & PRODUCT/15-CONTRAT-API.md` §6.3).
"""

from django.db import models


# --------------------------------------------------------------------------- #
# Parcours d'accompagnement
# --------------------------------------------------------------------------- #


class EtapeAccompagnement(models.TextChoices):
    """Les sept étapes, dans l'ordre canonique (CLAUDE.md §4).

    L'ordre de déclaration porte du sens : il alimente l'entonnoir, le pipeline
    et la progression. Ne pas réordonner.
    """

    IDENTIFIE = "identifie", "Identifié"
    FORME = "forme", "Formé"
    CERTIFIE = "certifie", "Certifié"
    FORMALISE = "formalise", "Formalisé"
    EQUIPE = "equipe", "Équipé"
    EN_PRODUCTION = "en_production", "En production"
    AUTONOME = "autonome", "Autonome"


#: Ordre canonique, sous forme de liste — l'entonnoir le parcourt tel quel.
ETAPES = [choix.value for choix in EtapeAccompagnement]

#: Progression (0-100) attachée à chaque étape franchie.
#: Aligné sur `PROGRESSION_ETAPE` de `referentiels.ts`.
PROGRESSION_ETAPE = {
    EtapeAccompagnement.IDENTIFIE: 8,
    EtapeAccompagnement.FORME: 24,
    EtapeAccompagnement.CERTIFIE: 40,
    EtapeAccompagnement.FORMALISE: 56,
    EtapeAccompagnement.EQUIPE: 72,
    EtapeAccompagnement.EN_PRODUCTION: 88,
    EtapeAccompagnement.AUTONOME: 100,
}


class StatutJuridique(models.TextChoices):
    INFORMEL = "informel", "Informel"
    GIE = "gie", "Groupement d'intérêt économique"
    ASSOCIATION = "association", "Association"
    COOPERATIVE = "cooperative", "Coopérative"


class EtatValidation(models.TextChoices):
    """Workflow de validation d'une donnée déclarée par un groupement.

    brouillon -> soumis -> valide, avec une branche de rejet motivé
    (`15-CONTRAT-API.md` §11).
    """

    BROUILLON = "brouillon", "Brouillon"
    SOUMIS = "soumis", "Soumis"
    VALIDE = "valide", "Validé"
    REJETE = "rejete", "Rejeté"


class Genre(models.TextChoices):
    FEMME = "femme", "Femme"
    HOMME = "homme", "Homme"


class RoleUtilisateur(models.TextChoices):
    """Rôles des comptes de la plateforme.

    Ils épousent le workflow de validation : un agent saisit et soumet, un
    administrateur valide ou rejette. Séparer les deux est ce qui donne du sens
    à la validation — un circuit où le même compte soumet et valide n'atteste
    de rien.
    """

    ADMINISTRATEUR = "administrateur", "Administrateur"
    AGENT = "agent", "Agent"
    LECTURE = "lecture", "Lecture seule"


class Tendance(models.TextChoices):
    HAUSSE = "hausse", "Hausse"
    BAISSE = "baisse", "Baisse"
    STABLE = "stable", "Stable"


class SensIndicateur(models.TextChoices):
    """Sens d'amélioration d'un indicateur.

    `DECROISSANT` pour ceux qu'on cherche à faire baisser — un délai, un taux
    d'abandon. Sans cette distinction, un délai moyen de 118 jours pour une cible
    de 90 s'afficherait à 131 % d'atteinte, c'est-à-dire en réussite éclatante.
    """

    CROISSANT = "croissant", "Croissant"
    DECROISSANT = "decroissant", "Décroissant"


# --------------------------------------------------------------------------- #
# Suivi-évaluation
# --------------------------------------------------------------------------- #


class PeriodiciteCollecte(models.TextChoices):
    MENSUELLE = "mensuelle", "Mensuelle"
    TRIMESTRIELLE = "trimestrielle", "Trimestrielle"
    SEMESTRIELLE = "semestrielle", "Semestrielle"
    ANNUELLE = "annuelle", "Annuelle"


class StatutActivite(models.TextChoices):
    PLANIFIEE = "planifiee", "Planifiée"
    EN_COURS = "en_cours", "En cours"
    TERMINEE = "terminee", "Terminée"
    EN_RETARD = "en_retard", "En retard"
    SUSPENDUE = "suspendue", "Suspendue"


class StatutJalon(models.TextChoices):
    A_VENIR = "a_venir", "À venir"
    ATTEINT = "atteint", "Atteint"
    MANQUE = "manque", "Manqué"


# --------------------------------------------------------------------------- #
# Formations
# --------------------------------------------------------------------------- #


class TypeModule(models.TextChoices):
    TECHNIQUE = "technique", "Technique métier"
    GESTION = "gestion", "Gestion"
    COMMERCIAL = "commercial", "Commercial"
    ORGANISATIONNEL = "organisationnel", "Vie associative"


class StatutSession(models.TextChoices):
    PLANIFIEE = "planifiee", "Planifiée"
    EN_COURS = "en_cours", "En cours"
    TERMINEE = "terminee", "Terminée"
    ANNULEE = "annulee", "Annulée"


# --------------------------------------------------------------------------- #
# Financement
# --------------------------------------------------------------------------- #


class TypeFinancement(models.TextChoices):
    SUBVENTION = "subvention", "Subvention"
    CREDIT_ROTATIF = "credit_rotatif", "Crédit rotatif"
    EQUIPEMENT = "equipement", "Dotation en équipement"
    FONDS_DE_ROULEMENT = "fonds_de_roulement", "Fonds de roulement"


#: Financements dont le remboursement est attendu.
#: Rapporter les remboursements aux subventions donnerait un taux
#: structurellement bas et faux (`15-CONTRAT-API.md` §8).
TYPES_REMBOURSABLES = [
    TypeFinancement.CREDIT_ROTATIF,
    TypeFinancement.FONDS_DE_ROULEMENT,
]


class StatutFinancement(models.TextChoices):
    DECAISSE = "decaisse", "Décaissé"
    REMBOURSEMENT_PARTIEL = "remboursement_partiel", "Remboursement partiel"
    REMBOURSE = "rembourse", "Remboursé"
    DEFAILLANT = "defaillant", "Défaillant"


class MoyenPaiement(models.TextChoices):
    """Aucun moyen de paiement international (CLAUDE.md §5)."""

    WAVE = "wave", "Wave"
    ORANGE_MONEY = "orange_money", "Orange Money"
    FREE_MONEY = "free_money", "Free Money"
    ESPECES = "especes", "Espèces"
    VIREMENT = "virement", "Virement"


class StatutMouvement(models.TextChoices):
    VALIDE = "valide", "Validé"
    EN_ATTENTE = "en_attente", "En attente"
    REJETE = "rejete", "Rejeté"


# --------------------------------------------------------------------------- #
# Commerce et contenus
# --------------------------------------------------------------------------- #


class StatutCommande(models.TextChoices):
    PANIER = "panier", "Panier"
    CONFIRMEE = "confirmee", "Confirmée"
    PREPAREE = "preparee", "Préparée"
    LIVREE = "livree", "Livrée"
    ANNULEE = "annulee", "Annulée"


class CategorieJournal(models.TextChoices):
    GROUPEMENT = "groupement", "Groupement"
    PRODUCTION = "production", "Production"
    FORMATION = "formation", "Formation"
    FINANCEMENT = "financement", "Financement"
    ACTIVITE = "activite", "Activité"
    SYSTEME = "systeme", "Système"


# --------------------------------------------------------------------------- #
# Fonctions de calcul partagées
# --------------------------------------------------------------------------- #


def initiales(nom_complet: str) -> str:
    """Deux premières initiales d'un nom complet, en majuscules.

    Transposition exacte de `initiales()` de `referentiels.ts` : les avatars de
    la piste d'audit sont des avatars à initiales, jamais des portraits — le
    corpus photo ne contient que des personnes réelles, qui ne peuvent pas
    incarner un utilisateur fictif (CLAUDE.md §5).
    """
    mots = [mot for mot in nom_complet.split() if mot]
    return "".join(mot[0].upper() for mot in mots[:2])


def calculer_tendance(reference: float, actuel: float) -> str:
    """Sens de variation, avec une zone morte de 2 %.

    Sans cette zone morte, un écart d'arrondi ferait clignoter la pastille d'un
    indicateur pourtant stable. Transposition de `tendance()` du générateur.
    """
    if actuel > reference * 1.02:
        return Tendance.HAUSSE
    if actuel < reference * 0.98:
        return Tendance.BAISSE
    return Tendance.STABLE


def taux_atteinte(actuel: float, cible: float, sens: str) -> int:
    """Taux d'atteinte d'une cible, en pourcentage, borné à 100.

    Pour un indicateur décroissant — un délai à réduire — l'atteinte se lit dans
    l'autre sens : 118 jours pour une cible de 90 valent 76 %, pas 131 %.
    """
    if sens == SensIndicateur.DECROISSANT:
        taux = 100 if actuel == 0 else round((cible / actuel) * 100)
    else:
        taux = 0 if cible == 0 else round((actuel / cible) * 100)
    return min(100, taux)
