"""Vues des formations, sessions, présences et certifications."""

from django.db.models import Count, Q
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from api import agregations
from api.filtres import FiltresSession
from api.serialiseurs import (
    CertificationSerializer,
    FormationSerializer,
    KpiSerializer,
    MarquerPresenceSerializer,
    ParticipationSerializer,
    ResumeFormationsSerializer,
    SessionFormationSerializer,
)
from core.models import Certification, Formation, Membre, Participation, SessionFormation


class FormationViewSet(viewsets.ReadOnlyModelViewSet):
    """Les modules de formation, avec leurs trois agrégats calculés."""

    serializer_class = FormationSerializer
    lookup_field = "slug"
    pagination_class = None
    search_fields = ["nom", "description"]
    ordering = ["nom"]

    def get_queryset(self):
        return agregations.agregats_formations(
            Formation.objects.select_related("filiere")
        )


class SessionViewSet(viewsets.ModelViewSet):
    """Les sessions de formation et le pointage des présences."""

    serializer_class = SessionFormationSerializer
    filterset_class = FiltresSession
    pagination_class = None
    ordering_fields = ["date_debut", "date_fin"]
    ordering = ["-date_debut"]

    def get_queryset(self):
        return SessionFormation.objects.select_related(
            "formation", "quartier"
        ).prefetch_related("participations")

    def list(self, request, *args, **kwargs):
        """Le filtre `?statut=` s'applique en mémoire.

        Le statut d'une session se déduit de ses dates : il n'a pas de colonne
        sur laquelle filtrer en SQL. L'ensemble compte des dizaines de lignes,
        pas des millions — le coût est nul et la règle reste unique.
        """
        sessions = self.filter_queryset(self.get_queryset())
        statut = request.query_params.get("statut")
        if statut:
            sessions = [session for session in sessions if session.statut == statut]
        return Response(self.get_serializer(sessions, many=True).data)

    @extend_schema(
        request=MarquerPresenceSerializer,
        responses=ParticipationSerializer,
        description="Enregistre ou met à jour la présence d'un membre à la session.",
    )
    @action(detail=True, methods=["post"], url_path="marquer_presence")
    def marquer_presence(self, request, pk=None):
        session = self.get_object()
        entree = MarquerPresenceSerializer(data=request.data)
        entree.is_valid(raise_exception=True)

        membre = Membre.objects.filter(pk=entree.validated_data["membre_id"]).first()
        if membre is None:
            return Response(
                {"membre_id": ["Aucun membre ne porte cet identifiant."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        participation, _ = Participation.objects.update_or_create(
            session=session,
            membre=membre,
            defaults={"present": entree.validated_data["present"]},
        )
        return Response(ParticipationSerializer(participation).data)


class CertificationViewSet(viewsets.ReadOnlyModelViewSet):
    """Les certificats délivrés."""

    serializer_class = CertificationSerializer
    pagination_class = None
    ordering_fields = ["date_certification", "score"]
    ordering = ["-date_certification"]
    search_fields = ["numero_certificat", "membre__nom_complet_cache", "formation__nom"]

    def get_queryset(self):
        return Certification.objects.select_related(
            "formation", "membre", "membre__groupement"
        )


class ResumeFormationsView(APIView):
    """Agrégats de l'écran formations."""

    @extend_schema(responses=ResumeFormationsSerializer)
    def get(self, request):
        return Response(agregations.resume_formations())
