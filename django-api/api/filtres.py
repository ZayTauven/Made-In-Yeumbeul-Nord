"""
Filtres et recherche de l'API.

La recherche est **insensible aux accents autant qu'à la casse**
(`15-CONTRAT-API.md` §2). Sans cela, « maraichage » tapé sans accent circonflexe
ne trouverait pas « maraîchage », et « Ainoumady » ne trouverait pas
« Aïnoumady » — sur un corpus français, la recherche paraîtrait cassée.
"""

import django_filters as filtres
from django.db.models.constants import LOOKUP_SEP
from rest_framework.filters import SearchFilter

from core.models import Activite, Financement, Groupement, Production, SessionFormation
from core.referentiels import EtapeAccompagnement, EtatValidation, StatutJuridique


class RechercheSansAccent(SearchFilter):
    """`SearchFilter` de DRF, augmenté du lookup `unaccent` de PostgreSQL.

    L'extension est installée par la migration `core.0002_extension_unaccent`.
    Les recherches plein texte (`@`) et par expression régulière (`$`) sont
    laissées intactes : `unaccent` ne s'y applique pas.
    """

    #: Lookups auxquels le dépliage d'accents s'applique.
    LOOKUPS_ACCENTUABLES = {"icontains", "istartswith", "iexact", "exact"}

    def construct_search(self, field_name, *args, **kwargs):
        recherche = super().construct_search(field_name, *args, **kwargs)
        champ, _, lookup = recherche.rpartition(LOOKUP_SEP)
        if champ and lookup in self.LOOKUPS_ACCENTUABLES:
            return LOOKUP_SEP.join([champ, "unaccent", lookup])
        return recherche


class FiltresGroupement(filtres.FilterSet):
    """Filtres de la liste des groupements.

    `filiere` et `quartier` portent sur le **slug**, pas sur l'identifiant : la
    vitrine construit ses URL sur les slugs, et un filtre numérique obligerait
    chaque front à résoudre l'identifiant au préalable.
    """

    filiere = filtres.CharFilter(field_name="filiere__slug", lookup_expr="exact")
    quartier = filtres.CharFilter(field_name="quartier__slug", lookup_expr="exact")
    etape = filtres.ChoiceFilter(choices=EtapeAccompagnement.choices)
    statut_juridique = filtres.ChoiceFilter(choices=StatutJuridique.choices)
    etat_validation = filtres.ChoiceFilter(choices=EtatValidation.choices)

    class Meta:
        model = Groupement
        fields = ["filiere", "quartier", "etape", "statut_juridique", "etat_validation"]


class FiltresProduction(filtres.FilterSet):
    """Filtres du catalogue.

    `quartier` porte sur le quartier **du groupement producteur**, pas sur une
    adresse de la production : une production n'a pas d'adresse propre.
    """

    filiere = filtres.CharFilter(field_name="filiere__slug", lookup_expr="exact")
    groupement = filtres.CharFilter(field_name="groupement__slug", lookup_expr="exact")
    quartier = filtres.CharFilter(
        field_name="groupement__quartier__slug", lookup_expr="exact"
    )
    prix_min = filtres.NumberFilter(field_name="prix_unitaire_fcfa", lookup_expr="gte")
    prix_max = filtres.NumberFilter(field_name="prix_unitaire_fcfa", lookup_expr="lte")
    disponible = filtres.BooleanFilter(method="filtrer_disponibilite")
    etat_validation = filtres.ChoiceFilter(choices=EtatValidation.choices)

    class Meta:
        model = Production
        fields = [
            "filiere",
            "groupement",
            "quartier",
            "prix_min",
            "prix_max",
            "disponible",
            "etat_validation",
        ]

    def filtrer_disponibilite(self, queryset, nom, valeur):
        """`disponible` est dérivé du stock, il n'a pas de colonne à lui."""
        if valeur is None:
            return queryset
        if valeur:
            return queryset.filter(stock_disponible__gt=0)
        return queryset.filter(stock_disponible=0)


class FiltresActivite(filtres.FilterSet):
    """Filtres du plan d'action.

    `statut` porte sur l'annotation calculée par `avec_statut()`, pas sur une
    colonne : le statut se déduit de l'avancement constaté face à l'avancement
    attendu (`15-CONTRAT-API.md` §6.4).
    """

    axe = filtres.NumberFilter(field_name="axe_id")
    statut = filtres.CharFilter(field_name="statut", lookup_expr="exact")

    class Meta:
        model = Activite
        fields = ["axe", "statut"]


class FiltresSession(filtres.FilterSet):
    formation = filtres.NumberFilter(field_name="formation_id")

    class Meta:
        model = SessionFormation
        fields = ["formation"]


class FiltresFinancement(filtres.FilterSet):
    type = filtres.CharFilter(field_name="type_financement", lookup_expr="exact")

    class Meta:
        model = Financement
        fields = ["statut", "type"]
