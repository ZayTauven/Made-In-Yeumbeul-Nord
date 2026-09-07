"""Vues des actualités et de la piste d'audit."""

from rest_framework import viewsets

from api.serialiseurs import ActualiteSerializer, EvenementJournalSerializer
from core.models import Actualite, EvenementJournal

from .communs import MixinLimite


class ActualiteViewSet(MixinLimite, viewsets.ReadOnlyModelViewSet):
    """Les actualités publiées sur la vitrine."""

    serializer_class = ActualiteSerializer
    lookup_field = "slug"
    pagination_class = None
    search_fields = ["titre", "chapeau", "contenu"]
    ordering = ["-date_publication"]

    def get_queryset(self):
        return Actualite.objects.filter(publiee=True)


class JournalViewSet(MixinLimite, viewsets.ReadOnlyModelViewSet):
    """La piste d'audit, du plus récent au plus ancien."""

    serializer_class = EvenementJournalSerializer
    pagination_class = None
    filterset_fields = ["categorie"]
    ordering = ["-horodatage"]

    def get_queryset(self):
        return EvenementJournal.objects.all()
