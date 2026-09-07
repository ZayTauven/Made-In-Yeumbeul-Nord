"""Sérialiseurs des actualités et de la piste d'audit."""

from rest_framework import serializers

from core.models import Actualite, EvenementJournal


class ActualiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Actualite
        fields = [
            "id",
            "titre",
            "slug",
            "chapeau",
            "contenu",
            "photo",
            "photo_cle",
            "categorie",
            "auteur",
            "date_publication",
            "temps_lecture_min",
        ]


class EvenementJournalSerializer(serializers.ModelSerializer):
    acteur_initiales = serializers.CharField(read_only=True)

    class Meta:
        model = EvenementJournal
        fields = [
            "id",
            "acteur",
            "acteur_initiales",
            "acteur_teinte",
            "action",
            "cible",
            "cible_lien",
            "horodatage",
            "categorie",
        ]
