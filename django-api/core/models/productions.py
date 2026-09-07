"""
Productions — ce que les groupements fabriquent et vendent.

Le vocabulaire du projet dit « production », jamais « produit » : les templates
parlent e-commerce, le projet parle suivi-évaluation (CLAUDE.md §4).
"""

from django.db import models
from django.db.models import F, Q

from ..referentiels import EtatValidation
from .base import Horodate
from .groupements import Groupement
from .territoire import Filiere


class ProductionQuerySet(models.QuerySet):
    def avec_liens(self):
        """Charge le groupement et la filière : la vitrine construit ses URL
        sur leurs slugs, donc chaque ligne de liste y accède sans exception."""
        return self.select_related("groupement", "groupement__quartier", "filiere")

    def disponibles(self):
        return self.filter(stock_disponible__gt=0)

    def en_alerte(self):
        """Stock au niveau du seuil ou en dessous — alerte du tableau de bord."""
        return self.filter(stock_disponible__lte=F("seuil_alerte"))

    def publiees(self):
        return self.filter(etat_validation=EtatValidation.VALIDE)


class Production(Horodate):
    groupement = models.ForeignKey(
        Groupement,
        on_delete=models.CASCADE,
        related_name="productions",
        verbose_name="groupement producteur",
    )
    filiere = models.ForeignKey(
        Filiere,
        on_delete=models.PROTECT,
        related_name="productions",
        verbose_name="filière",
    )

    nom = models.CharField("nom", max_length=255)
    slug = models.SlugField("identifiant d'URL", unique=True, max_length=255)
    description = models.TextField("description", blank=True)

    # -- Commerce --------------------------------------------------------- #
    prix_unitaire_fcfa = models.PositiveIntegerField(
        "prix unitaire (FCFA)",
        help_text="Entier en FCFA, sans décimale ni séparateur : le formatage "
        "est du ressort du front.",
    )
    prix_barre_fcfa = models.PositiveIntegerField(
        "prix relevé au marché (FCFA)",
        null=True,
        blank=True,
        help_text="Prix de référence constaté ailleurs, supérieur au prix "
        "pratiqué. Ce n'est pas une promotion : le projet ne fait pas de soldes.",
    )
    unite = models.CharField("unité", max_length=50, default="unité")

    stock_disponible = models.PositiveIntegerField("stock disponible", default=0)
    seuil_alerte = models.PositiveIntegerField(
        "seuil d'alerte",
        default=5,
        help_text="En deçà, la production remonte dans les alertes de stock.",
    )

    # -- Média ------------------------------------------------------------ #
    photo = models.CharField("chemin de la photo", max_length=500, blank=True)
    photo_cle = models.CharField("clé de la photo", max_length=120, blank=True)
    photos_additionnelles = models.JSONField(
        "vues secondaires",
        default=list,
        blank=True,
        help_text="Clés de catalogue, pas des chemins : la fiche a besoin de la "
        "variante et du flou, que seule la clé permet de retrouver.",
    )

    # -- Appréciations ---------------------------------------------------- #
    note_moyenne = models.FloatField("note moyenne", default=0)
    nombre_appreciations = models.PositiveIntegerField(
        "nombre d'appréciations", default=0
    )

    date_ajout = models.DateField("date d'ajout")
    etiquettes = models.JSONField("étiquettes", default=list, blank=True)

    etat_validation = models.CharField(
        "état de validation",
        max_length=20,
        choices=EtatValidation.choices,
        default=EtatValidation.BROUILLON,
        db_index=True,
    )
    motif_rejet = models.TextField("motif de rejet", blank=True)

    objects = ProductionQuerySet.as_manager()

    class Meta:
        verbose_name = "production"
        verbose_name_plural = "productions"
        ordering = ["-date_ajout", "nom"]
        indexes = [
            models.Index(fields=["filiere", "etat_validation"]),
            models.Index(fields=["groupement"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(prix_barre_fcfa__isnull=True)
                | Q(prix_barre_fcfa__gt=F("prix_unitaire_fcfa")),
                name="prix_barre_superieur_au_prix_pratique",
                violation_error_message=(
                    "Le prix relevé au marché doit dépasser le prix pratiqué : "
                    "l'écran montre l'écart en faveur de la boutique témoin."
                ),
            ),
        ]

    def __str__(self) -> str:
        return f"{self.nom} ({self.groupement.nom})"

    @property
    def disponible(self) -> bool:
        return self.stock_disponible > 0
