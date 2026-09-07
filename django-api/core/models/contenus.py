"""
Contenus éditoriaux et piste d'audit.

`Actualite` alimente la vitrine, `EvenementJournal` la traçabilité du back-office.
Les deux entités manquaient au modèle initial (`15-CONTRAT-API.md` §9).
"""

from django.db import models

from ..referentiels import CategorieJournal, initiales
from .base import Horodate


class Actualite(Horodate):
    """Article publié sur la vitrine."""

    titre = models.CharField("titre", max_length=500)
    slug = models.SlugField("identifiant d'URL", unique=True, max_length=255)
    chapeau = models.TextField(
        "chapeau", help_text="Accroche affichée en tête de liste et en aperçu."
    )
    contenu = models.TextField("contenu")

    photo = models.CharField("chemin de la photo", max_length=500, blank=True)
    photo_cle = models.CharField("clé de la photo", max_length=120, blank=True)

    categorie = models.CharField("catégorie", max_length=100)
    auteur = models.CharField("auteur", max_length=255)
    date_publication = models.DateField("date de publication")
    temps_lecture_min = models.PositiveSmallIntegerField(
        "temps de lecture (minutes)", default=3
    )
    publiee = models.BooleanField("publiée", default=True)

    class Meta:
        verbose_name = "actualité"
        verbose_name_plural = "actualités"
        ordering = ["-date_publication"]

    def __str__(self) -> str:
        return self.titre


class EvenementJournal(models.Model):
    """Entrée de la piste d'audit : qui a fait quoi, sur quoi, quand.

    Chaque transition du workflow de validation en écrit une
    (`15-CONTRAT-API.md` §11).
    """

    acteur = models.CharField("acteur", max_length=255)
    #: Teinte de l'avatar à initiales. Les avatars de la piste d'audit ne sont
    #: jamais des portraits : le corpus photo ne contient que des personnes
    #: réelles, qui ne peuvent pas incarner un utilisateur fictif (CLAUDE.md §5).
    acteur_teinte = models.CharField(
        "teinte de l'acteur", max_length=80, default="var(--ax-chart-1)"
    )

    action = models.CharField("action", max_length=255)
    cible = models.CharField("cible", max_length=500)
    cible_lien = models.CharField(
        "lien vers la cible", max_length=500, null=True, blank=True
    )

    horodatage = models.DateTimeField("horodatage", auto_now_add=True, db_index=True)
    categorie = models.CharField(
        "catégorie", max_length=20, choices=CategorieJournal.choices
    )

    class Meta:
        verbose_name = "événement du journal"
        verbose_name_plural = "journal d'activité"
        ordering = ["-horodatage"]

    def __str__(self) -> str:
        return f"{self.acteur} — {self.action} — {self.cible}"

    @property
    def acteur_initiales(self) -> str:
        return initiales(self.acteur)
