"""
Suivi-évaluation — cadre logique, activités, jalons.

C'est le bloc entièrement absent de `08-ARCHITECTURE-DJANGO.md`, et c'est
pourtant ce qu'un élu attend d'un outil de suivi : des cibles, des valeurs
relevées, des écarts, un plan d'action daté.

Arbre du cadre logique : AxeStrategique → ResultatAttendu → Indicateur → relevés.
"""

from datetime import date

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import (
    Case,
    CharField,
    DateField,
    DurationField,
    ExpressionWrapper,
    F,
    IntegerField,
    Value,
    When,
)
from django.db.models.functions import ExtractDay

from ..referentiels import (
    PeriodiciteCollecte,
    SensIndicateur,
    StatutActivite,
    StatutJalon,
    calculer_tendance,
    initiales,
    taux_atteinte,
)
from .base import Horodate
from .territoire import Filiere, Quartier


# --------------------------------------------------------------------------- #
# Cadre logique
# --------------------------------------------------------------------------- #


class AxeStrategique(Horodate):
    """Axe du cadre logique. Racine de l'arbre de suivi."""

    code = models.CharField("code", max_length=20, unique=True)
    intitule = models.CharField("intitulé", max_length=500)
    description = models.TextField("description", blank=True)
    teinte = models.CharField(
        "teinte", max_length=80, default="var(--ax-chart-1)",
        help_text="Token CSS de rôle, jamais une couleur en dur.",
    )
    rang = models.PositiveSmallIntegerField("rang d'affichage", default=0)

    class Meta:
        verbose_name = "axe stratégique"
        verbose_name_plural = "axes stratégiques"
        ordering = ["rang", "code"]

    def __str__(self) -> str:
        return f"{self.code} — {self.intitule}"

    @property
    def avancement(self) -> int:
        """Moyenne des avancements des résultats attendus rattachés."""
        avancements = [resultat.avancement for resultat in self.resultats.all()]
        if not avancements:
            return 0
        return round(sum(avancements) / len(avancements))


class ResultatAttendu(Horodate):
    """Résultat attendu, rattaché à un axe."""

    axe = models.ForeignKey(
        AxeStrategique,
        on_delete=models.CASCADE,
        related_name="resultats",
        verbose_name="axe",
    )
    code = models.CharField("code", max_length=20, unique=True)
    intitule = models.CharField("intitulé", max_length=500)
    rang = models.PositiveSmallIntegerField("rang d'affichage", default=0)

    class Meta:
        verbose_name = "résultat attendu"
        verbose_name_plural = "résultats attendus"
        ordering = ["rang", "code"]

    def __str__(self) -> str:
        return f"{self.code} — {self.intitule}"

    @property
    def avancement(self) -> int:
        """Moyenne des taux d'atteinte des indicateurs rattachés."""
        taux = [indicateur.taux_atteinte for indicateur in self.indicateurs.all()]
        if not taux:
            return 0
        return round(sum(taux) / len(taux))


class Indicateur(Horodate):
    """Indicateur du cadre logique, avec sa cible et son historique de relevés."""

    resultat = models.ForeignKey(
        ResultatAttendu,
        on_delete=models.CASCADE,
        related_name="indicateurs",
        verbose_name="résultat attendu",
    )
    code = models.CharField("code", max_length=20, unique=True)
    intitule = models.CharField("intitulé", max_length=500)
    unite = models.CharField("unité", max_length=50, blank=True)

    valeur_reference = models.FloatField("valeur de référence")
    valeur_actuelle = models.FloatField("valeur actuelle")
    valeur_cible = models.FloatField("valeur cible")

    sens = models.CharField(
        "sens d'amélioration",
        max_length=15,
        choices=SensIndicateur.choices,
        default=SensIndicateur.CROISSANT,
        help_text="« Décroissant » pour ce qu'on cherche à faire baisser — un "
        "délai, un taux d'abandon.",
    )

    periodicite = models.CharField(
        "périodicité de collecte",
        max_length=20,
        choices=PeriodiciteCollecte.choices,
        default=PeriodiciteCollecte.TRIMESTRIELLE,
    )
    source_donnee = models.CharField("source de la donnée", max_length=255, blank=True)
    date_derniere_collecte = models.DateField("dernière collecte", null=True, blank=True)

    ventile_par_genre = models.BooleanField(
        "ventilé par genre",
        default=False,
        help_text="Un indicateur sensible au genre se lit femmes / hommes.",
    )

    class Meta:
        verbose_name = "indicateur"
        verbose_name_plural = "indicateurs"
        ordering = ["code"]

    def __str__(self) -> str:
        return f"{self.code} — {self.intitule}"

    @property
    def axe_id(self) -> int:
        return self.resultat.axe_id

    @property
    def taux_atteinte(self) -> int:
        """Taux d'atteinte de la cible, borné à 100 et lu dans le bon sens."""
        return taux_atteinte(self.valeur_actuelle, self.valeur_cible, self.sens)

    @property
    def tendance(self) -> str:
        return calculer_tendance(self.valeur_reference, self.valeur_actuelle)


class ReleveIndicateur(models.Model):
    """Un point de la série d'un indicateur.

    Le champ `precedent` porte la même période de l'exercice antérieur : les
    graphiques comparés du template en ont besoin sur le même point.
    """

    indicateur = models.ForeignKey(
        Indicateur,
        on_delete=models.CASCADE,
        related_name="releves",
        verbose_name="indicateur",
    )
    periode = models.CharField(
        "période", max_length=20, help_text="Libellé court affiché en abscisse : « nov. »."
    )
    valeur = models.FloatField("valeur")
    precedent = models.FloatField("valeur de l'exercice précédent", default=0)
    rang = models.PositiveSmallIntegerField(
        "rang", default=0, help_text="Du plus ancien au plus récent."
    )

    class Meta:
        verbose_name = "relevé d'indicateur"
        verbose_name_plural = "relevés d'indicateurs"
        ordering = ["rang"]
        constraints = [
            models.UniqueConstraint(
                fields=["indicateur", "rang"], name="un_seul_releve_par_rang"
            )
        ]

    def __str__(self) -> str:
        return f"{self.indicateur.code} · {self.periode}"


# --------------------------------------------------------------------------- #
# Plan d'action
# --------------------------------------------------------------------------- #


class ActiviteQuerySet(models.QuerySet):
    """QuerySet dérivant le statut d'une activité côté serveur.

    Le statut n'est pas stocké : il se déduit de la comparaison entre
    l'avancement constaté et l'avancement attendu à la date du jour. Le calculer
    ici, une fois, garantit que les deux fronts racontent la même chose
    (`15-CONTRAT-API.md` §6.4).
    """

    def avec_statut(self, aujourdhui: date | None = None):
        aujourdhui = aujourdhui or date.today()

        duree_jours = ExtractDay(
            ExpressionWrapper(
                F("date_fin") - F("date_debut"), output_field=DurationField()
            )
        )
        jours_ecoules = ExtractDay(
            ExpressionWrapper(
                Value(aujourdhui, output_field=DateField()) - F("date_debut"),
                output_field=DurationField(),
            )
        )
        # Avancement qu'une activité linéaire afficherait aujourd'hui. Une durée
        # nulle — début et fin le même jour — vaut 100 : l'activité est due.
        avancement_attendu = Case(
            When(date_fin=F("date_debut"), then=Value(100)),
            default=jours_ecoules * Value(100) / duree_jours,
            output_field=IntegerField(),
        )

        return self.annotate(
            avancement_attendu=avancement_attendu,
            statut=Case(
                When(suspendue=True, then=Value(StatutActivite.SUSPENDUE)),
                # Une activité achevée est terminée, même si son échéance n'est
                # pas encore passée : c'est l'avancement qui fait foi, pas le
                # calendrier. Sans cette règle, une activité bouclée en avance
                # s'afficherait « en cours » jusqu'à sa date de fin.
                When(avancement__gte=100, then=Value(StatutActivite.TERMINEE)),
                When(date_fin__lt=aujourdhui, then=Value(StatutActivite.EN_RETARD)),
                When(date_debut__gt=aujourdhui, then=Value(StatutActivite.PLANIFIEE)),
                # Une tolérance de quinze points évite de peindre en rouge une
                # activité qui a simplement démarré la semaine passée.
                When(
                    avancement__lt=F("avancement_attendu") - 15,
                    then=Value(StatutActivite.EN_RETARD),
                ),
                default=Value(StatutActivite.EN_COURS),
                output_field=CharField(),
            ),
        )


class Activite(Horodate):
    """Activité du plan d'action. Alimente le diagramme de Gantt."""

    code = models.CharField("code", max_length=20, unique=True)
    intitule = models.CharField("intitulé", max_length=500)
    description = models.TextField("description", blank=True)

    axe = models.ForeignKey(
        AxeStrategique,
        on_delete=models.PROTECT,
        related_name="activites",
        verbose_name="axe",
    )
    responsable = models.CharField("responsable", max_length=255)

    quartiers = models.ManyToManyField(
        Quartier, related_name="activites", blank=True, verbose_name="quartiers couverts"
    )
    filieres = models.ManyToManyField(
        Filiere, related_name="activites", blank=True, verbose_name="filières visées"
    )

    date_debut = models.DateField("date de début")
    date_fin = models.DateField("date de fin")
    avancement = models.PositiveSmallIntegerField(
        "avancement",
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    date_achevement = models.DateField(
        "date d'achèvement",
        null=True,
        blank=True,
        help_text="Horodatage du passage à 100 %. Sans lui, l'historique des "
        "activités terminées ne se reconstitue que par approximation.",
    )
    suspendue = models.BooleanField(
        "suspendue",
        default=False,
        help_text="Une suspension est une décision, pas une déduction : c'est le "
        "seul élément du statut qui ne se calcule pas.",
    )

    budget_prevu_fcfa = models.PositiveBigIntegerField("budget prévu (FCFA)", default=0)
    budget_consomme_fcfa = models.PositiveBigIntegerField(
        "budget consommé (FCFA)", default=0
    )
    groupements_beneficiaires = models.PositiveIntegerField(
        "groupements bénéficiaires", default=0
    )

    objects = ActiviteQuerySet.as_manager()

    class Meta:
        verbose_name = "activité"
        verbose_name_plural = "activités"
        ordering = ["date_debut", "code"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(date_fin__gte=F("date_debut")),
                name="activite_fin_apres_debut",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.code} — {self.intitule}"

    @property
    def responsable_initiales(self) -> str:
        return initiales(self.responsable)

    def statut_calcule(self, aujourdhui: date | None = None) -> str:
        """Repli Python du statut, pour un objet non annoté.

        Reproduit à l'identique la logique de `ActiviteQuerySet.avec_statut()`.
        """
        aujourdhui = aujourdhui or date.today()
        if self.suspendue:
            return StatutActivite.SUSPENDUE
        if self.avancement >= 100:
            return StatutActivite.TERMINEE
        if self.date_fin < aujourdhui:
            return StatutActivite.EN_RETARD
        if self.date_debut > aujourdhui:
            return StatutActivite.PLANIFIEE
        duree = (self.date_fin - self.date_debut).days
        attendu = 100 if duree == 0 else ((aujourdhui - self.date_debut).days * 100) // duree
        if self.avancement < attendu - 15:
            return StatutActivite.EN_RETARD
        return StatutActivite.EN_COURS


class Jalon(Horodate):
    """Échéance décisive du plan d'action. Alimente la chronologie de la démo."""

    activite = models.ForeignKey(
        Activite,
        on_delete=models.CASCADE,
        related_name="jalons",
        null=True,
        blank=True,
        verbose_name="activité",
    )
    intitule = models.CharField("intitulé", max_length=500)
    description = models.TextField("description", blank=True)

    date_prevue = models.DateField("date prévue")
    date_reelle = models.DateField("date réelle", null=True, blank=True)

    decisif = models.BooleanField(
        "décisif",
        default=False,
        help_text="Mis en exergue sur la chronologie présentée en démonstration.",
    )

    class Meta:
        verbose_name = "jalon"
        verbose_name_plural = "jalons"
        ordering = ["date_prevue"]

    def __str__(self) -> str:
        return self.intitule

    @property
    def statut(self) -> str:
        """Atteint, manqué ou à venir — déduit des deux dates, jamais saisi."""
        if self.date_reelle:
            return StatutJalon.ATTEINT
        if self.date_prevue < date.today():
            return StatutJalon.MANQUE
        return StatutJalon.A_VENIR
