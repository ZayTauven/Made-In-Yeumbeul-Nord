"""
Sérialiseur des productions.

Les slugs du groupement et de la filière accompagnent leurs identifiants : la
vitrine construit ses liens sur les slugs, jamais sur les identifiants
numériques (`15-CONTRAT-API.md` §2).
"""

from rest_framework import serializers

from core.models import Production


class ProductionSerializer(serializers.ModelSerializer):
    groupement_id = serializers.IntegerField(read_only=True)
    groupement_nom = serializers.CharField(source="groupement.nom", read_only=True)
    groupement_slug = serializers.CharField(source="groupement.slug", read_only=True)
    filiere_id = serializers.IntegerField(read_only=True)
    filiere_nom = serializers.CharField(source="filiere.nom", read_only=True)
    filiere_slug = serializers.CharField(source="filiere.slug", read_only=True)
    disponible = serializers.BooleanField(read_only=True)

    class Meta:
        model = Production
        fields = [
            "id",
            "groupement_id",
            "groupement_nom",
            "groupement_slug",
            "filiere_id",
            "filiere_nom",
            "filiere_slug",
            "nom",
            "slug",
            "description",
            "prix_unitaire_fcfa",
            "prix_barre_fcfa",
            "unite",
            "stock_disponible",
            "seuil_alerte",
            "disponible",
            "photo",
            "photo_cle",
            "photos_additionnelles",
            "note_moyenne",
            "nombre_appreciations",
            "date_ajout",
            "etiquettes",
            "etat_validation",
        ]
