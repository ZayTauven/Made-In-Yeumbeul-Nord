"""
Vues du suivi-évaluation : cadre logique, agrégations, plan d'action.

Les endpoints d'agrégation sont des vues de lecture seule qui délèguent leur
calcul à `api.agregations`. Les vues restent minces ; les règles de calcul, elles,
se testent sans passer par HTTP.
"""

from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView

from api import agregations
from api.filtres import FiltresActivite
from api.serialiseurs import (
    ActiviteSerializer,
    AxeStrategiqueSerializer,
    CadreLogiqueSerializer,
    CroisementSerializer,
    EtapeEntonnoirSerializer,
    IndicateurSerializer,
    JalonSerializer,
    KpiSerializer,
    RepartitionSerializer,
    ResultatAttenduSerializer,
    ResultatRechercheSerializer,
    ResumePlanActionSerializer,
)
from core.models import Activite, AxeStrategique, Indicateur, Jalon, ResultatAttendu


# --------------------------------------------------------------------------- #
# Plan d'action
# --------------------------------------------------------------------------- #


class ActiviteViewSet(viewsets.ReadOnlyModelViewSet):
    """Les activités du plan d'action.

    Le statut est annoté par `avec_statut()` : il se déduit de l'avancement
    constaté face à l'avancement attendu à ce jour, jamais d'une colonne saisie.
    """

    serializer_class = ActiviteSerializer
    lookup_field = "code"
    filterset_class = FiltresActivite
    search_fields = ["code", "intitule", "responsable"]
    ordering_fields = ["date_debut", "date_fin", "avancement", "code"]
    ordering = ["date_debut"]
    pagination_class = None

    def get_queryset(self):
        return Activite.objects.avec_statut().prefetch_related("quartiers", "filieres")


class JalonViewSet(viewsets.ReadOnlyModelViewSet):
    """Les jalons du plan d'action.

    `?decisif=1` ne retient que les jalons mis en exergue sur la chronologie
    présentée en démonstration.
    """

    serializer_class = JalonSerializer
    pagination_class = None
    ordering = ["date_prevue"]

    def get_queryset(self):
        jalons = Jalon.objects.select_related("activite")
        decisif = self.request.query_params.get("decisif")
        if decisif in {"1", "true", "vrai"}:
            jalons = jalons.filter(decisif=True)
        return jalons


# --------------------------------------------------------------------------- #
# Cadre logique
# --------------------------------------------------------------------------- #


class IndicateurViewSet(viewsets.ReadOnlyModelViewSet):
    """Les indicateurs du cadre logique, adressés par leur code (« I1.2.2 »)."""

    serializer_class = IndicateurSerializer
    lookup_field = "code"
    #: Le code contient des points : sans cette expression, le routeur DRF
    #: couperait « I1.2.2 » sur le premier point.
    lookup_value_regex = "[^/]+"
    pagination_class = None
    search_fields = ["code", "intitule"]

    def get_queryset(self):
        return Indicateur.objects.select_related("resultat").prefetch_related("releves")


class CadreLogiqueView(APIView):
    """L'arbre complet — axes, résultats, indicateurs — en un seul appel."""

    @extend_schema(responses=CadreLogiqueSerializer)
    def get(self, request):
        axes = AxeStrategique.objects.prefetch_related(
            "resultats__indicateurs"
        )
        resultats = ResultatAttendu.objects.select_related("axe").prefetch_related(
            "indicateurs"
        )
        indicateurs = Indicateur.objects.select_related("resultat").prefetch_related(
            "releves"
        )
        return Response(
            {
                "axes": AxeStrategiqueSerializer(axes, many=True).data,
                "resultats": ResultatAttenduSerializer(resultats, many=True).data,
                "indicateurs": IndicateurSerializer(indicateurs, many=True).data,
            }
        )


# --------------------------------------------------------------------------- #
# Agrégations
# --------------------------------------------------------------------------- #


class KpisView(APIView):
    """Indicateurs d'en-tête.

    `?tableau=` choisit le jeu de cartes : celui du tableau de bord général par
    défaut, `plan-action` ou `formations` sinon.
    """

    @extend_schema(
        parameters=[
            OpenApiParameter(
                "tableau",
                description="« plan-action », « formations », ou vide pour le tableau général.",
                required=False,
                type=str,
            )
        ],
        responses=KpiSerializer(many=True),
    )
    def get(self, request):
        tableau = request.query_params.get("tableau", "")
        jeux = {
            "": agregations.kpis_generaux,
            "plan-action": agregations.kpis_plan_action,
            "formations": agregations.kpis_formations,
        }
        if tableau not in jeux:
            return Response(
                {
                    "detail": (
                        f"Tableau inconnu : {tableau!r}. "
                        "Attendu « plan-action », « formations » ou aucun paramètre."
                    )
                },
                status=400,
            )
        return Response(jeux[tableau]())


class EntonnoirView(APIView):
    """Effectif et part par étape d'accompagnement, dans l'ordre canonique."""

    @extend_schema(responses=EtapeEntonnoirSerializer(many=True))
    def get(self, request):
        return Response(agregations.entonnoir())


class RepartitionView(APIView):
    """Répartition des groupements par filière, quartier ou genre."""

    @extend_schema(
        parameters=[
            OpenApiParameter(
                "axe",
                description="« filiere », « quartier » ou « genre ».",
                required=True,
                type=str,
            )
        ],
        responses=RepartitionSerializer(many=True),
    )
    def get(self, request):
        axe = request.query_params.get("axe", "filiere")
        try:
            return Response(agregations.repartition(axe))
        except ValueError as erreur:
            return Response({"detail": str(erreur)}, status=400)


class CroisementView(APIView):
    """Tableau croisé des effectifs, quartiers en lignes et filières en colonnes."""

    @extend_schema(
        parameters=[
            OpenApiParameter("lignes", required=False, type=str),
            OpenApiParameter("colonnes", required=False, type=str),
        ],
        responses=CroisementSerializer,
    )
    def get(self, request):
        lignes = request.query_params.get("lignes", "quartier")
        colonnes = request.query_params.get("colonnes", "filiere")
        try:
            return Response(agregations.croisement(lignes, colonnes))
        except ValueError as erreur:
            return Response({"detail": str(erreur)}, status=400)


class ResumePlanActionView(APIView):
    """Agrégats du plan d'action."""

    @extend_schema(responses=ResumePlanActionSerializer)
    def get(self, request):
        return Response(agregations.resume_plan_action())


@extend_schema(
    parameters=[
        OpenApiParameter("q", description="Texte recherché.", required=True, type=str),
        OpenApiParameter("limite", required=False, type=int),
    ],
    responses=ResultatRechercheSerializer(many=True),
)
@api_view(["GET"])
def recherche_globale(request):
    """Recherche transverse, tous types confondus, en un seul appel.

    La palette ⌘K se déclenche à chaque frappe : six appels parallèles la
    rendraient inutilisable.
    """
    requete = request.query_params.get("q", "")
    try:
        limite = max(1, min(30, int(request.query_params.get("limite", 8))))
    except (TypeError, ValueError):
        limite = 8
    return Response(agregations.recherche_globale(requete, limite))
