"""Vues des boutiques témoins et des commandes."""

from rest_framework import viewsets

from api.serialiseurs import BoutiqueSerializer, CommandeSerializer
from core.models import Boutique, Commande

from .communs import MixinLimite


class BoutiqueViewSet(viewsets.ReadOnlyModelViewSet):
    """Les boutiques témoins « Made in Yeumbeul Nord »."""

    serializer_class = BoutiqueSerializer
    pagination_class = None
    ordering = ["nom"]

    def get_queryset(self):
        return Boutique.objects.select_related("quartier")


class CommandeViewSet(MixinLimite, viewsets.ModelViewSet):
    """Les commandes passées depuis la vitrine.

    La création est ouverte : un visiteur commande sans compte. Le numéro et les
    prix sont posés par le serveur, jamais dictés par le navigateur.
    """

    serializer_class = CommandeSerializer
    pagination_class = None
    ordering = ["-created_at"]
    filterset_fields = ["statut"]
    search_fields = ["numero", "client_nom", "client_telephone"]

    def get_queryset(self):
        return Commande.objects.select_related("quartier").prefetch_related(
            "lignes__production__groupement"
        )

    def get_permissions(self):
        from rest_framework.permissions import AllowAny

        if self.action == "create":
            return [AllowAny()]
        return super().get_permissions()
