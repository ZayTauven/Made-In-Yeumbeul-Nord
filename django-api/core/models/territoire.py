"""
Territoire et référentiels — Commune, Quartier, Filière.

Le quartier est une **entité**, pas un libellé libre. C'est la condition d'une
agrégation territoriale fiable et du tracé des périmètres sur la carte : un
`CharField` de localisation ne permet ni l'un ni l'autre
(`PLAN & PRODUCT/15-CONTRAT-API.md` §1).
"""

from django.db import models

from .base import Horodate


class Commune(Horodate):
    """La collectivité de tutelle. Une seule ligne en pratique."""

    nom = models.CharField("nom", max_length=255, default="Commune de Yeumbeul Nord")
    slug = models.SlugField("identifiant d'URL", unique=True, default="yeumbeul-nord")
    description = models.TextField("description", blank=True)

    email = models.EmailField("courriel", blank=True)
    telephone = models.CharField("téléphone", max_length=20, blank=True)
    adresse = models.CharField("adresse", max_length=500, blank=True)

    #: Blason de la commune. C'est la marque de la **tutelle institutionnelle**,
    #: pas l'identité du produit : il s'emploie en pied de page et sur les
    #: documents officiels, jamais dans l'en-tête applicatif (CLAUDE.md §3).
    blason_cle = models.CharField(
        "clé du blason",
        max_length=120,
        blank=True,
        help_text="Clé au catalogue local des médias.",
    )

    class Meta:
        verbose_name = "commune"
        verbose_name_plural = "communes"
        ordering = ["nom"]

    def __str__(self) -> str:
        return self.nom


class Quartier(Horodate):
    """Quartier de Yeumbeul Nord.

    ⚠️ La liste des dix quartiers est une **liste de travail à faire valider par
    la Commune**. Ni les noms ni les coordonnées ne proviennent d'une source
    officielle, et un découpage erroné se verrait immédiatement dans la salle.
    """

    commune = models.ForeignKey(
        Commune,
        on_delete=models.CASCADE,
        related_name="quartiers",
        verbose_name="commune",
    )
    nom = models.CharField("nom", max_length=255, unique=True)
    slug = models.SlugField("identifiant d'URL", unique=True, max_length=255)

    #: Centroïde, pour le cadrage de la carte Leaflet.
    latitude = models.FloatField("latitude")
    longitude = models.FloatField("longitude")

    population_estimee = models.PositiveIntegerField(
        "population estimée",
        default=0,
        help_text="Alimente la couche de densité de la carte.",
    )

    class Meta:
        verbose_name = "quartier"
        verbose_name_plural = "quartiers"
        ordering = ["nom"]

    def __str__(self) -> str:
        return self.nom


class Filiere(Horodate):
    """Filière de production : saponification, céréales, couture...

    Les onze filières du projet sont listées à CLAUDE.md §4.
    """

    nom = models.CharField("nom", max_length=255, unique=True)
    slug = models.SlugField("identifiant d'URL", unique=True, max_length=255)
    description = models.TextField("description", blank=True)

    icone = models.CharField(
        "icône",
        max_length=100,
        help_text="Nom d'icône Tabler (outline, 24×24, currentColor).",
    )

    #: Token de rôle Vireo, jamais une couleur en dur : c'est ce qui permettra de
    #: basculer la palette d'un seul geste le jour où le logo arrivera
    #: (CLAUDE.md §3).
    teinte = models.CharField(
        "teinte",
        max_length=80,
        default="var(--ax-chart-1)",
        help_text="Token CSS de rôle, par exemple « var(--ax-chart-3) ».",
    )

    class Meta:
        verbose_name = "filière"
        verbose_name_plural = "filières"
        ordering = ["nom"]

    def __str__(self) -> str:
        return self.nom
