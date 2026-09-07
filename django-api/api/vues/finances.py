"""Vues du financement et du journal de caisse."""

from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from api import agregations
from api.filtres import FiltresFinancement
from api.serialiseurs import (
    FinancementSerializer,
    MouvementFinancierSerializer,
    ResumeFinancementSerializer,
)
from core.models import Financement, MouvementFinancier

from .communs import MixinLimite


class FinancementViewSet(viewsets.ModelViewSet):
    """Les appuis financiers consentis aux groupements."""

    serializer_class = FinancementSerializer
    filterset_class = FiltresFinancement
    pagination_class = None
    search_fields = ["reference", "groupement__nom", "bailleur", "objet"]
    ordering_fields = ["date_decaissement", "montant_fcfa"]
    ordering = ["-date_decaissement"]

    def get_queryset(self):
        return Financement.objects.select_related("groupement")


class MouvementViewSet(MixinLimite, viewsets.ReadOnlyModelViewSet):
    """Le journal de caisse.

    `montant_fcfa` est **signé** : négatif pour une sortie.
    """

    serializer_class = MouvementFinancierSerializer
    pagination_class = None
    search_fields = ["reference", "libelle", "contrepartie"]
    ordering_fields = ["date", "montant_fcfa"]
    ordering = ["-date"]

    def get_queryset(self):
        return MouvementFinancier.objects.all()


class ResumeFinancementView(APIView):
    """Bloc de tête de l'écran financement."""

    @extend_schema(responses=ResumeFinancementSerializer)
    def get(self, request):
        return Response(agregations.resume_financement())
