"""
Vues du catalogue : référentiels, groupements, productions.

Les ressources publiques s'adressent par **slug**, jamais par identifiant
numérique : la vitrine expose ces URL (`15-CONTRAT-API.md` §2).
"""

from django.db.models import Count, Q
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from api.filtres import FiltresGroupement, FiltresProduction
from api.serialiseurs import (
    FiliereSerializer,
    FinancementSerializer,
    GroupementSerializer,
    MembreSerializer,
    PointCarteSerializer,
    ProductionSerializer,
    QuartierSerializer,
    compteurs_referentiels,
)
from core.models import Filiere, Groupement, Membre, Production, Quartier

from .workflow import MixinWorkflowValidation


class MixinSlugOuIdentifiant:
    """Permet d'adresser une ressource par son slug **ou** par son identifiant.

    Les ressources publiques s'adressent par slug — la vitrine expose ces URL.
    Mais plusieurs fonctions du contrat front reçoivent un identifiant numérique
    (`membresDuGroupement(groupementId)`), et changer leur signature reviendrait
    à toucher les écrans, ce que la bascule doit précisément éviter.

    Accepter les deux formes coûte une condition et évite un aller-retour
    supplémentaire pour convertir un identifiant en slug.
    """

    def get_object(self):
        valeur = self.kwargs.get(self.lookup_field)
        if valeur is not None and str(valeur).isdigit():
            from django.shortcuts import get_object_or_404

            objet = get_object_or_404(self.filter_queryset(self.get_queryset()), pk=valeur)
            self.check_object_permissions(self.request, objet)
            return objet
        return super().get_object()


class MixinCompteurs:
    """Dépose les compteurs des référentiels dans le contexte du sérialiseur.

    Deux requêtes agrégées une fois par appel, plutôt que deux `COUNT` par ligne
    de liste.
    """

    def get_serializer_context(self):
        contexte = super().get_serializer_context()
        contexte["compteurs"] = compteurs_referentiels()
        return contexte


class QuartierViewSet(MixinCompteurs, viewsets.ReadOnlyModelViewSet):
    """Les quartiers de la commune.

    ⚠️ La liste est une **liste de travail à faire valider par la Commune** :
    ni les noms ni les coordonnées ne proviennent d'une source officielle.
    """

    queryset = Quartier.objects.all()
    serializer_class = QuartierSerializer
    lookup_field = "slug"
    pagination_class = None  # dix lignes : une pagination n'apporterait rien
    search_fields = ["nom"]


class FiliereViewSet(MixinCompteurs, viewsets.ReadOnlyModelViewSet):
    """Les filières de production du projet."""

    queryset = Filiere.objects.all()
    serializer_class = FiliereSerializer
    lookup_field = "slug"
    pagination_class = None
    search_fields = ["nom", "description"]


class GroupementViewSet(
    MixinSlugOuIdentifiant, MixinCompteurs, MixinWorkflowValidation, viewsets.ModelViewSet
):
    """Les groupements, leurs membres, leurs productions et leurs financements."""

    serializer_class = GroupementSerializer
    lookup_field = "slug"
    filterset_class = FiltresGroupement
    search_fields = ["nom", "description", "quartier__nom", "filiere__nom"]
    ordering_fields = [
        "nom",
        "nombre_membres",
        "progression",
        "chiffre_affaires_fcfa",
        "note_moyenne",
    ]
    ordering = ["nom"]
    categorie_journal = "groupement"

    def get_queryset(self):
        return Groupement.objects.avec_agregats().prefetch_related(
            "filieres_secondaires"
        )

    def libelle_journal(self, objet) -> str:
        return objet.nom

    @extend_schema(responses=MembreSerializer(many=True))
    @action(detail=True, methods=["get"])
    def membres(self, request, slug=None):
        groupement = self.get_object()
        membres = groupement.membres.annotate(
            nb_formations=Count(
                "participations", filter=Q(participations__present=True), distinct=True
            ),
            nb_certifications=Count("certifications", distinct=True),
        )
        return Response(MembreSerializer(membres, many=True).data)

    @extend_schema(responses=ProductionSerializer(many=True))
    @action(detail=True, methods=["get"])
    def productions(self, request, slug=None):
        groupement = self.get_object()
        productions = groupement.productions.avec_liens()
        return Response(ProductionSerializer(productions, many=True).data)

    @extend_schema(responses=FinancementSerializer(many=True))
    @action(detail=True, methods=["get"])
    def financements(self, request, slug=None):
        groupement = self.get_object()
        financements = groupement.financements.select_related("groupement")
        return Response(FinancementSerializer(financements, many=True).data)

    @extend_schema(
        responses=PointCarteSerializer(many=True),
        description=(
            "Charge allégée pour la carte : ni description, ni photo, ni compteurs."
        ),
    )
    @action(detail=False, methods=["get"], url_path="carte")
    def carte(self, request):
        points = (
            Groupement.objects.avec_agregats()
            .only(
                "id", "nom", "slug", "latitude", "longitude", "etape",
                "quartier", "filiere",
            )
            .order_by("nom")
        )
        return Response(PointCarteSerializer(points, many=True).data)


class ProductionViewSet(
    MixinSlugOuIdentifiant, MixinWorkflowValidation, viewsets.ModelViewSet
):
    """Le catalogue des productions."""

    serializer_class = ProductionSerializer
    lookup_field = "slug"
    filterset_class = FiltresProduction
    search_fields = ["nom", "description", "groupement__nom", "filiere__nom"]
    ordering_fields = ["nom", "prix_unitaire_fcfa", "note_moyenne", "date_ajout"]
    ordering = ["-date_ajout"]
    categorie_journal = "production"

    def get_queryset(self):
        return Production.objects.avec_liens()

    def libelle_journal(self, objet) -> str:
        return objet.nom

    @extend_schema(responses=ProductionSerializer(many=True))
    @action(detail=True, methods=["get"])
    def similaires(self, request, slug=None):
        """Autres productions de la même filière, la fiche courante exclue."""
        production = self.get_object()
        limite = self._entier(request.query_params.get("limite"), defaut=4)
        similaires = (
            Production.objects.avec_liens()
            .filter(filiere_id=production.filiere_id)
            .exclude(pk=production.pk)
            .order_by("-note_moyenne", "-date_ajout")[:limite]
        )
        return Response(ProductionSerializer(similaires, many=True).data)

    @extend_schema(
        responses=ProductionSerializer(many=True),
        description="Productions dont le stock est au seuil d'alerte ou en deçà.",
    )
    @action(detail=False, methods=["get"], url_path="en-rupture")
    def en_rupture(self, request):
        alertes = Production.objects.avec_liens().en_alerte().order_by("stock_disponible")
        return Response(ProductionSerializer(alertes, many=True).data)

    @staticmethod
    def _entier(brut, defaut: int) -> int:
        try:
            return max(1, min(50, int(brut)))
        except (TypeError, ValueError):
            return defaut
