"""
Formations, sessions, présences et certifications.

L'effectif présent d'une session n'est pas saisi mais compté sur les présences
enregistrées : l'écran affiche le taux et la liste des certifiés côte à côte, et
deux chiffres qui se contredisent sur le même écran se voient immédiatement.
"""

from datetime import date

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from ..referentiels import StatutSession, TypeModule
from .base import Horodate
from .groupements import Membre
from .territoire import Filiere, Quartier


class Formation(Horodate):
    """Module de formation."""

    nom = models.CharField("nom", max_length=255, unique=True)
    slug = models.SlugField("identifiant d'URL", unique=True, max_length=255)
    description = models.TextField("description", blank=True)

    type_module = models.CharField(
        "type de module", max_length=20, choices=TypeModule.choices
    )
    filiere = models.ForeignKey(
        Filiere,
        on_delete=models.SET_NULL,
        related_name="formations",
        null=True,
        blank=True,
        verbose_name="filière",
        help_text="Vide pour un module transversal, qui vaut pour toutes.",
    )

    duree_heures = models.PositiveIntegerField("durée (heures)", default=8)
    cout_par_participant_fcfa = models.PositiveIntegerField(
        "coût par participant (FCFA)", default=0
    )

    class Meta:
        verbose_name = "formation"
        verbose_name_plural = "formations"
        ordering = ["nom"]

    def __str__(self) -> str:
        return self.nom


class SessionFormation(Horodate):
    """Instance datée d'une formation, tenue dans un quartier."""

    formation = models.ForeignKey(
        Formation,
        on_delete=models.CASCADE,
        related_name="sessions",
        verbose_name="formation",
    )
    quartier = models.ForeignKey(
        Quartier,
        on_delete=models.PROTECT,
        related_name="sessions",
        verbose_name="quartier",
    )

    date_debut = models.DateField("date de début")
    date_fin = models.DateField("date de fin")
    lieu = models.CharField("lieu", max_length=500)
    formateur = models.CharField("formateur", max_length=255)

    effectif_cible = models.PositiveIntegerField("effectif cible", default=25)
    annulee = models.BooleanField(
        "annulée",
        default=False,
        help_text="Une annulation est une décision : c'est la seule part du "
        "statut qui ne se déduit pas des dates.",
    )

    class Meta:
        verbose_name = "session de formation"
        verbose_name_plural = "sessions de formation"
        ordering = ["-date_debut"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(date_fin__gte=models.F("date_debut")),
                name="session_fin_apres_debut",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.formation.nom} ({self.date_debut:%d/%m/%Y})"

    @property
    def effectif_present(self) -> int:
        """Compté sur les présences enregistrées, jamais saisi à la main."""
        return self.participations.filter(present=True).count()

    @property
    def taux_presence(self) -> int:
        if not self.effectif_cible:
            return 0
        return round(self.effectif_present / self.effectif_cible * 100)

    @property
    def statut(self) -> str:
        if self.annulee:
            return StatutSession.ANNULEE
        aujourdhui = date.today()
        if self.date_fin < aujourdhui:
            return StatutSession.TERMINEE
        if self.date_debut > aujourdhui:
            return StatutSession.PLANIFIEE
        return StatutSession.EN_COURS


class Participation(models.Model):
    """Présence d'un membre à une session."""

    session = models.ForeignKey(
        SessionFormation,
        on_delete=models.CASCADE,
        related_name="participations",
        verbose_name="session",
    )
    membre = models.ForeignKey(
        Membre,
        on_delete=models.CASCADE,
        related_name="participations",
        verbose_name="membre",
    )
    present = models.BooleanField("présent", default=False)
    date_pointage = models.DateTimeField("pointé le", auto_now=True)

    class Meta:
        verbose_name = "participation"
        verbose_name_plural = "participations"
        constraints = [
            models.UniqueConstraint(
                fields=["session", "membre"], name="une_presence_par_membre_et_session"
            )
        ]

    def __str__(self) -> str:
        etat = "présent" if self.present else "absent"
        return f"{self.membre} — {etat}"


class Certification(Horodate):
    """Certificat délivré à un membre au terme d'une formation."""

    formation = models.ForeignKey(
        Formation,
        on_delete=models.CASCADE,
        related_name="certifications",
        verbose_name="formation",
    )
    membre = models.ForeignKey(
        Membre,
        on_delete=models.CASCADE,
        related_name="certifications",
        verbose_name="membre",
    )

    date_certification = models.DateField("date de certification")
    score = models.PositiveSmallIntegerField(
        "score", validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    numero_certificat = models.CharField(
        "numéro de certificat", max_length=100, unique=True
    )

    class Meta:
        verbose_name = "certification"
        verbose_name_plural = "certifications"
        ordering = ["-date_certification"]
        constraints = [
            models.UniqueConstraint(
                fields=["formation", "membre"],
                name="un_seul_certificat_par_membre_et_formation",
            )
        ]

    def __str__(self) -> str:
        return f"{self.numero_certificat} — {self.membre}"
