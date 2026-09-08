"""
Comptes de la plateforme.

**Pourquoi une application dédiée.** Django résout `AUTH_USER_MODEL` par une
`swappable_dependency`, qui pointe vers la **première** migration de l'app
concernée. Loger le modèle utilisateur dans `core`, dont la migration initiale
crée déjà vingt-deux tables métier, ferait dépendre `django.contrib.admin` d'une
migration qui ne contient pas l'utilisateur : la migration échoue sur
« Related model cannot be resolved ». Une app à part, dont la `0001` ne crée que
ce modèle, lève la contrainte.

**Pourquoi un modèle personnalisé dès l'origine.** Substituer `AUTH_USER_MODEL`
après coup est l'une des migrations les plus coûteuses de Django :
`auth.Permission`, `admin.LogEntry` et toute clé étrangère vers l'utilisateur
pointent déjà sur l'ancien modèle. Le faire aujourd'hui, alors que la base ne
contient que des données techniques régénérables, coûte une recréation de base.
Le faire après la démonstration coûterait un chantier.

En revanche, on n'anticipe **pas** ce qui restera bon marché plus tard : pas de
clé vers `Groupement`, pas d'OTP. Les comptes de groupement sont en roadmap
post-MVP1 (`PLAN & PRODUCT/07-PLAN-MVP1.md`), et leur ajouter une colonne
nullable le moment venu est une migration triviale.
"""

from django.contrib.auth.models import AbstractUser
from django.db import models

from core.referentiels import RoleUtilisateur, initiales


class Utilisateur(AbstractUser):
    """Agent de la commune accédant au back-office.

    L'identifiant de connexion reste `username` plutôt que le courriel : un
    agent municipal n'a pas toujours d'adresse professionnelle, alors qu'il a
    toujours un identifiant qu'on lui attribue. Le courriel et le téléphone
    servent de porte d'entrée alternative — voir
    `comptes.authentification.IdentifiantSouple`.
    """

    role = models.CharField(
        "rôle",
        max_length=20,
        choices=RoleUtilisateur.choices,
        default=RoleUtilisateur.AGENT,
    )

    telephone = models.CharField(
        "téléphone",
        max_length=20,
        unique=True,
        null=True,
        blank=True,
        help_text="Sert aussi d'identifiant de connexion. Unique lorsqu'il est "
        "renseigné ; laisser vide plutôt que d'inventer un numéro.",
    )

    fonction = models.CharField(
        "fonction",
        max_length=150,
        blank=True,
        help_text="Intitulé affiché sur la fiche : « Secrétaire municipal ».",
    )

    #: Teinte de l'avatar à initiales. Aucun portrait réel n'incarne un compte :
    #: le corpus photo ne contient que des personnes réelles (CLAUDE.md §5).
    avatar_teinte = models.CharField(
        "teinte de l'avatar", max_length=80, default="var(--ax-chart-1)"
    )

    class Meta:
        verbose_name = "utilisateur"
        verbose_name_plural = "utilisateurs"
        ordering = ["last_name", "first_name", "username"]

    def __str__(self) -> str:
        return self.nom_complet or self.username

    def save(self, *args, **kwargs):
        # Une chaîne vide violerait la contrainte d'unicité dès le deuxième
        # compte sans téléphone. `NULL` échappe à l'unicité, pas `''`.
        if not self.telephone:
            self.telephone = None
        super().save(*args, **kwargs)

    @property
    def nom_complet(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def initiales(self) -> str:
        return initiales(self.nom_complet or self.username)

    @property
    def est_administrateur(self) -> bool:
        """Un superutilisateur l'est d'office : sinon, le premier compte créé
        par `createsuperuser` ne pourrait rien valider."""
        return self.role == RoleUtilisateur.ADMINISTRATEUR or self.is_superuser

    @property
    def peut_ecrire(self) -> bool:
        return self.est_administrateur or self.role == RoleUtilisateur.AGENT
