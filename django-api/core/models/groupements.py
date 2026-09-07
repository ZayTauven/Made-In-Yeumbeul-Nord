"""
Groupements (GIE) et membres.

Les champs dérivés — effectif, part de femmes, progression, responsable — ne sont
**pas stockés**. Ils sont annotés par `Groupement.objects.avec_agregats()`, pour
deux raisons :

1. Une valeur stockée se désynchronise dès qu'un membre est ajouté ailleurs.
   Un compteur qui contredit la liste affichée juste en dessous est le défaut le
   plus coûteux d'une démonstration (`15-CONTRAT-API.md` §6.3).
2. Le contrat impose de trier sur `nombre_membres` et `progression`. Un tri ne
   porte que sur une colonne ou une annotation, jamais sur une propriété Python.
"""

from django.db import models
from django.db.models import Case, Count, IntegerField, OuterRef, Q, Subquery, Sum, Value, When
from django.db.models.functions import Coalesce

from ..referentiels import (
    PROGRESSION_ETAPE,
    EtapeAccompagnement,
    EtatValidation,
    Genre,
    StatutJuridique,
    initiales,
)
from .base import Horodate
from .territoire import Commune, Filiere, Quartier


def _compte_lie(modele, champ_lien: str = "groupement", filtre: Q | None = None):
    """Sous-requête de comptage d'une relation inverse.

    On passe par une sous-requête plutôt que par `Count()` avec jointure : deux
    `Count()` sur deux relations différentes dans la même requête se multiplient
    l'un l'autre et rendent les deux comptages faux. Le piège est classique et
    silencieux — les nombres sont plausibles, seulement trop grands.
    """
    requete = modele.objects.filter(**{champ_lien: OuterRef("pk")})
    if filtre is not None:
        requete = requete.filter(filtre)
    return Subquery(
        requete.order_by().values(champ_lien).annotate(n=Count("pk")).values("n"),
        output_field=IntegerField(),
    )


class GroupementQuerySet(models.QuerySet):
    """QuerySet portant les agrégats attendus par le contrat d'API."""

    def avec_agregats(self):
        from .finances import Financement
        from .productions import Production

        nombre_membres = Coalesce(_compte_lie(Membre), Value(0))
        nombre_femmes = Coalesce(
            _compte_lie(Membre, filtre=Q(genre=Genre.FEMME)), Value(0)
        )

        return self.select_related("quartier", "filiere").annotate(
            nombre_membres=nombre_membres,
            nombre_productions=Coalesce(_compte_lie(Production), Value(0)),
            # Part de femmes en points de pourcentage, 0 quand l'effectif est nul —
            # une division par zéro sur un groupement fraîchement déclaré ferait
            # tomber la liste entière.
            part_femmes=Case(
                When(nombre_membres=0, then=Value(0)),
                default=nombre_femmes * Value(100) / nombre_membres,
                output_field=IntegerField(),
            ),
            financement_recu_fcfa=Coalesce(
                Subquery(
                    Financement.objects.filter(groupement=OuterRef("pk"))
                    .order_by()
                    .values("groupement")
                    .annotate(total=Sum("montant_fcfa"))
                    .values("total"),
                    output_field=models.BigIntegerField(),
                ),
                Value(0),
            ),
            # La progression se déduit de l'étape franchie, barème partagé avec le
            # front (`PROGRESSION_ETAPE`). Annotée et non calculée en Python, parce
            # que le contrat impose de pouvoir trier dessus.
            progression=Case(
                *[
                    When(etape=etape, then=Value(valeur))
                    for etape, valeur in PROGRESSION_ETAPE.items()
                ],
                default=Value(0),
                output_field=IntegerField(),
            ),
            responsable=Coalesce(
                Subquery(
                    Membre.objects.filter(groupement=OuterRef("pk"))
                    .order_by("-est_responsable", "pk")
                    .values("nom_complet_cache")[:1],
                    output_field=models.CharField(),
                ),
                Value(""),
            ),
        )

    def publiees(self):
        """Seules les fiches validées ont vocation à paraître sur la vitrine."""
        return self.filter(etat_validation=EtatValidation.VALIDE)


class Groupement(Horodate):
    """Groupement d'intérêt économique — l'une des cent « calebasses »."""

    commune = models.ForeignKey(
        Commune,
        on_delete=models.CASCADE,
        related_name="groupements",
        verbose_name="commune",
    )
    nom = models.CharField("nom", max_length=255, unique=True)
    slug = models.SlugField("identifiant d'URL", unique=True, max_length=255)
    description = models.TextField("description", blank=True)

    # -- Territoire ------------------------------------------------------- #
    quartier = models.ForeignKey(
        Quartier,
        on_delete=models.PROTECT,
        related_name="groupements",
        verbose_name="quartier",
    )
    latitude = models.FloatField("latitude")
    longitude = models.FloatField("longitude")

    # -- Activité --------------------------------------------------------- #
    filiere = models.ForeignKey(
        Filiere,
        on_delete=models.PROTECT,
        related_name="groupements",
        verbose_name="filière principale",
    )
    filieres_secondaires = models.ManyToManyField(
        Filiere,
        related_name="groupements_secondaires",
        blank=True,
        verbose_name="filières secondaires",
    )

    # -- Formalisation ---------------------------------------------------- #
    statut_juridique = models.CharField(
        "statut juridique",
        max_length=20,
        choices=StatutJuridique.choices,
        default=StatutJuridique.INFORMEL,
    )
    ninea = models.CharField(
        "NINEA", max_length=50, unique=True, null=True, blank=True
    )
    etape = models.CharField(
        "étape d'accompagnement",
        max_length=20,
        choices=EtapeAccompagnement.choices,
        default=EtapeAccompagnement.IDENTIFIE,
        db_index=True,
        help_text="Axe de lecture principal de la mairie.",
    )

    # -- Économie (déclarée, donc stockée) -------------------------------- #
    chiffre_affaires_fcfa = models.PositiveBigIntegerField(
        "chiffre d'affaires (FCFA)",
        default=0,
        help_text="Entier en FCFA, sans décimale (CLAUDE.md §5).",
    )

    # -- Contact ---------------------------------------------------------- #
    telephone = models.CharField("téléphone", max_length=20, blank=True)
    email = models.EmailField("courriel", null=True, blank=True)

    # -- Dates ------------------------------------------------------------ #
    date_creation = models.DateField("date de création")
    date_formalisation = models.DateField(
        "date de formalisation", null=True, blank=True
    )

    # -- Appréciations ---------------------------------------------------- #
    note_moyenne = models.FloatField("note moyenne", default=0)
    nombre_appreciations = models.PositiveIntegerField(
        "nombre d'appréciations",
        default=0,
        help_text="Une note sans effectif ne vaut rien : les deux vont ensemble.",
    )

    # -- Média ------------------------------------------------------------ #
    #: Chemin local, jamais une URL distante : la démonstration doit tenir sans
    #: connexion (CLAUDE.md §5). Ce n'est volontairement pas un `ImageField` —
    #: les visuels sont servis par le `public/` de chaque front depuis le
    #: catalogue `Assets/_optimized/`, Django n'en héberge aucun.
    photo = models.CharField("chemin de la photo", max_length=500, blank=True)
    photo_cle = models.CharField(
        "clé de la photo",
        max_length=120,
        blank=True,
        help_text="Clé au catalogue local, d'où l'écran tire la variante et le flou.",
    )

    # -- Workflow --------------------------------------------------------- #
    etat_validation = models.CharField(
        "état de validation",
        max_length=20,
        choices=EtatValidation.choices,
        default=EtatValidation.BROUILLON,
        db_index=True,
    )
    motif_rejet = models.TextField(
        "motif de rejet",
        blank=True,
        help_text="Obligatoire au rejet : un rejet sans motif est ingérable "
        "pour le groupement concerné.",
    )

    objects = GroupementQuerySet.as_manager()

    class Meta:
        verbose_name = "groupement"
        verbose_name_plural = "groupements"
        ordering = ["nom"]
        indexes = [
            models.Index(fields=["quartier", "filiere"]),
        ]

    def __str__(self) -> str:
        return self.nom


class Membre(Horodate):
    """Membre d'un groupement."""

    groupement = models.ForeignKey(
        Groupement,
        on_delete=models.CASCADE,
        related_name="membres",
        verbose_name="groupement",
    )
    prenom = models.CharField("prénom", max_length=100)
    nom_famille = models.CharField("nom de famille", max_length=100)

    #: Dénormalisation assumée de « prénom nom ». Elle sert à désigner le
    #: responsable d'un groupement par sous-requête, ce qu'une concaténation
    #: calculée en Python ne permettrait pas.
    nom_complet_cache = models.CharField("nom complet", max_length=201, editable=False)

    genre = models.CharField("genre", max_length=10, choices=Genre.choices)
    date_naissance = models.DateField(
        "date de naissance",
        null=True,
        blank=True,
        help_text="L'âge servi par l'API en est déduit : un âge stocké devient "
        "faux au fil des mois, une date de naissance reste vraie.",
    )
    telephone = models.CharField("téléphone", max_length=20, blank=True)
    role = models.CharField(
        "rôle", max_length=100, default="Membre",
        help_text="Présidente, Trésorière, Secrétaire, Membre…",
    )
    est_responsable = models.BooleanField(
        "responsable du groupement",
        default=False,
        help_text="Désigne la personne dont le nom paraît sur la fiche publique.",
    )

    #: Teinte de l'avatar à initiales. Aucun portrait réel n'incarne une personne
    #: fictive : ce serait un détournement d'image (CLAUDE.md §5).
    avatar_teinte = models.CharField(
        "teinte de l'avatar", max_length=80, default="var(--ax-chart-1)"
    )
    date_adhesion = models.DateField("date d'adhésion")

    class Meta:
        verbose_name = "membre"
        verbose_name_plural = "membres"
        ordering = ["-est_responsable", "nom_famille", "prenom"]
        indexes = [models.Index(fields=["groupement", "genre"])]

    def __str__(self) -> str:
        return self.nom_complet

    def save(self, *args, **kwargs):
        self.nom_complet_cache = f"{self.prenom} {self.nom_famille}".strip()
        super().save(*args, **kwargs)

    @property
    def nom_complet(self) -> str:
        return self.nom_complet_cache or f"{self.prenom} {self.nom_famille}".strip()

    @property
    def initiales(self) -> str:
        return initiales(self.nom_complet)

    @property
    def age(self) -> int | None:
        """Âge en années révolues, ou `None` faute de date de naissance."""
        if not self.date_naissance:
            return None
        from datetime import date

        aujourdhui = date.today()
        return (
            aujourdhui.year
            - self.date_naissance.year
            - (
                (aujourdhui.month, aujourdhui.day)
                < (self.date_naissance.month, self.date_naissance.day)
            )
        )
