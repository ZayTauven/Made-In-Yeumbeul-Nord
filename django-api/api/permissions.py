"""
Permissions de l'API.

Trois rôles, calqués sur le workflow de validation : un **agent** saisit et
soumet, un **administrateur** valide ou rejette, un compte en **lecture seule**
consulte. Séparer la soumission de la validation est ce qui donne du sens au
circuit — un dispositif où le même compte soumet et valide n'atteste de rien.

La lecture reste ouverte à tous, y compris aux visiteurs anonymes : la vitrine
est publique par nature, et le catalogue des groupements a vocation à être vu.
"""

from rest_framework import permissions


class LectureLibreEcritureControlee(permissions.BasePermission):
    """Lecture pour tous, écriture pour les comptes qui en ont le rôle.

    Remplace `IsAuthenticatedOrReadOnly`, qui accorderait l'écriture à tout
    compte connecté — y compris à un compte ouvert pour la seule consultation,
    par exemple celui d'un élu ou d'un partenaire.
    """

    message = "Votre compte n'a pas le droit de modifier cette donnée."

    def has_permission(self, request, view) -> bool:
        if request.method in permissions.SAFE_METHODS:
            return True
        utilisateur = request.user
        return bool(
            utilisateur
            and utilisateur.is_authenticated
            and getattr(utilisateur, "peut_ecrire", False)
        )


class EstAdministrateur(permissions.BasePermission):
    """Réservé aux administrateurs.

    Garde les transitions qui engagent la commune : valider une fiche, la
    rejeter. Un superutilisateur l'est d'office, sans quoi le premier compte
    créé par `createsuperuser` ne pourrait rien valider.
    """

    message = "Seul un administrateur peut effectuer cette opération."

    def has_permission(self, request, view) -> bool:
        utilisateur = request.user
        return bool(
            utilisateur
            and utilisateur.is_authenticated
            and getattr(utilisateur, "est_administrateur", False)
        )


class EstAuthentifie(permissions.IsAuthenticated):
    """`IsAuthenticated`, avec un message en français."""

    message = "Vous devez être connecté pour accéder à cette ressource."
