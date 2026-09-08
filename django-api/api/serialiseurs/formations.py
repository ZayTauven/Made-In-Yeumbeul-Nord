"""
Sérialiseurs des formations, sessions et certifications.

`taux_certification` se calcule sur les **participations réelles**, jamais sur
une estimation : l'écran affiche le taux et la liste des certifiés côte à côte,
et l'écart se verrait (`15-CONTRAT-API.md` §7).
"""

from rest_framework import serializers

from core.models import Certification, Formation, Participation, SessionFormation

from .suivi import RepartitionSerializer


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


class MoisFormationSerializer(serializers.Serializer):
    periode = serializers.CharField()
    sessions = serializers.IntegerField()
    participants = serializers.IntegerField()


class ChargeFormateurSerializer(serializers.Serializer):
    nom = serializers.CharField()
    sessions = serializers.IntegerField()
    participants = serializers.IntegerField()


class ResumeFormationsSerializer(serializers.Serializer):
    """Agrégats du tableau de bord des formations.

    `participations` et `membres_formes` ne sont pas le même nombre et ne
    doivent jamais être confondus : le premier compte les présences, le second
    les personnes. Un cycle de six sessions suivies par deux cents membres
    produit douze cents participations — l'annoncer comme « 1 200 membres
    formés » sur une commune qui en compte mille sept cents serait un mensonge
    visible à l'œil nu.
    """

    total_modules = serializers.IntegerField()
    sessions_tenues = serializers.IntegerField()
    sessions_a_venir = serializers.IntegerField()
    participations = serializers.IntegerField()
    membres_formes = serializers.IntegerField()
    membres_certifies = serializers.IntegerField()
    certificats_delivres = serializers.IntegerField()
    taux_presence_moyen = serializers.IntegerField()
    taux_certification_moyen = serializers.IntegerField()
    #: Sessions achevées seulement : une session à venir n'a rien dispensé.
    heures_dispensees = serializers.IntegerField()
    cout_total_fcfa = serializers.IntegerField()
    par_type = RepartitionSerializer(many=True)
    activite_mensuelle = MoisFormationSerializer(many=True)
    formateurs = ChargeFormateurSerializer(many=True)
