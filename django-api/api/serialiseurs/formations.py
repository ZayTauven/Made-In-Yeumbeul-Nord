"""
Sérialiseurs des formations, sessions et certifications.

`taux_certification` se calcule sur les **participations réelles**, jamais sur
une estimation : l'écran affiche le taux et la liste des certifiés côte à côte,
et l'écart se verrait (`15-CONTRAT-API.md` §7).
"""

from rest_framework import serializers

from core.models import Certification, Formation, Participation, SessionFormation


class FormationSerializer(serializers.ModelSerializer):
    filiere_nom = serializers.CharField(
        source="filiere.nom", read_only=True, default=None
    )
    nombre_sessions = serializers.IntegerField(read_only=True)
    nombre_participants = serializers.IntegerField(read_only=True)
    taux_certification = serializers.SerializerMethodField()

    class Meta:
        model = Formation
        fields = [
            "id",
            "nom",
            "slug",
            "description",
            "type_module",
            "filiere_nom",
            "duree_heures",
            "cout_par_participant_fcfa",
            "nombre_sessions",
            "nombre_participants",
            "taux_certification",
        ]

    def get_taux_certification(self, obj) -> int:
        """Certificats délivrés rapportés aux présences enregistrées.

        Les deux compteurs viennent des annotations d'`agregats_formations()`.
        Sans présence enregistrée, le taux vaut zéro plutôt que de diviser par
        rien — une formation qui n'a pas encore eu lieu n'a pas de taux.
        """
        presences = getattr(obj, "nombre_participants", None)
        certifies = getattr(obj, "nombre_certifies", None)
        if presences is None or certifies is None:
            presences = obj.sessions.filter(participations__present=True).count()
            certifies = obj.certifications.count()
        return round(certifies / presences * 100) if presences else 0


class SessionFormationSerializer(serializers.ModelSerializer):
    formation_id = serializers.IntegerField(read_only=True)
    formation_nom = serializers.CharField(source="formation.nom", read_only=True)
    quartier = serializers.CharField(source="quartier.nom", read_only=True)
    effectif_present = serializers.IntegerField(read_only=True)
    taux_presence = serializers.IntegerField(read_only=True)
    statut = serializers.CharField(read_only=True)

    class Meta:
        model = SessionFormation
        fields = [
            "id",
            "formation_id",
            "formation_nom",
            "date_debut",
            "date_fin",
            "lieu",
            "quartier",
            "formateur",
            "effectif_cible",
            "effectif_present",
            "taux_presence",
            "statut",
        ]


class CertificationSerializer(serializers.ModelSerializer):
    membre_id = serializers.IntegerField(read_only=True)
    membre_nom = serializers.CharField(source="membre.nom_complet", read_only=True)
    groupement_nom = serializers.CharField(
        source="membre.groupement.nom", read_only=True
    )
    formation_nom = serializers.CharField(source="formation.nom", read_only=True)

    class Meta:
        model = Certification
        fields = [
            "id",
            "membre_id",
            "membre_nom",
            "groupement_nom",
            "formation_nom",
            "date_certification",
            "score",
            "numero_certificat",
        ]


class ParticipationSerializer(serializers.ModelSerializer):
    membre_nom = serializers.CharField(source="membre.nom_complet", read_only=True)

    class Meta:
        model = Participation
        fields = ["id", "session", "membre", "membre_nom", "present"]


class MarquerPresenceSerializer(serializers.Serializer):
    """Corps de `POST /api/sessions/{id}/marquer_presence/`."""

    membre_id = serializers.IntegerField()
    present = serializers.BooleanField(default=True)


class ResumeFormationsSerializer(serializers.Serializer):
    total_formations = serializers.IntegerField()
    total_sessions = serializers.IntegerField()
    total_participants = serializers.IntegerField()
    total_certifies = serializers.IntegerField()
    taux_certification = serializers.IntegerField()
    taux_presence_moyen = serializers.IntegerField()
