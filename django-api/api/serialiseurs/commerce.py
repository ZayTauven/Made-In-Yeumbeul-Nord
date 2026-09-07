"""Sérialiseurs des boutiques témoins et des commandes."""

from rest_framework import serializers

from core.models import Boutique, Commande, LigneCommande, Production, Quartier
from core.referentiels import StatutCommande


class BoutiqueSerializer(serializers.ModelSerializer):
    quartier = serializers.CharField(source="quartier.nom", read_only=True)

    class Meta:
        model = Boutique
        fields = [
            "id",
            "nom",
            "adresse",
            "quartier",
            "latitude",
            "longitude",
            "telephone",
            "responsable",
            "heure_ouverture",
            "heure_fermeture",
            "note_moyenne",
        ]


class LigneCommandeSerializer(serializers.ModelSerializer):
    production_id = serializers.PrimaryKeyRelatedField(
        source="production", queryset=Production.objects.all()
    )
    production_nom = serializers.CharField(source="production.nom", read_only=True)
    production_photo = serializers.CharField(source="production.photo", read_only=True)
    groupement_nom = serializers.CharField(
        source="production.groupement.nom", read_only=True
    )
    unite = serializers.CharField(source="production.unite", read_only=True)

    class Meta:
        model = LigneCommande
        fields = [
            "production_id",
            "production_nom",
            "production_photo",
            "groupement_nom",
            "quantite",
            "prix_unitaire_fcfa",
            "unite",
        ]
        extra_kwargs = {
            # Le prix est figé à la commande par le serveur, jamais dicté par le
            # client : accepter un prix envoyé par le navigateur reviendrait à
            # laisser fixer le montant de la commande depuis l'extérieur.
            "prix_unitaire_fcfa": {"read_only": True},
        }


class CommandeSerializer(serializers.ModelSerializer):
    lignes = LigneCommandeSerializer(many=True)
    quartier = serializers.SlugRelatedField(
        slug_field="nom", queryset=Quartier.objects.all()
    )
    montant_total_fcfa = serializers.IntegerField(read_only=True)
    date_creation = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = Commande
        fields = [
            "id",
            "numero",
            "statut",
            "client_nom",
            "client_telephone",
            "adresse_livraison",
            "quartier",
            "lignes",
            "montant_total_fcfa",
            "moyen_paiement",
            "date_creation",
        ]
        extra_kwargs = {
            # Le numéro est attribué par le serveur : deux navigateurs qui
            # calculeraient le leur finiraient par le même.
            "numero": {"read_only": True},
        }

    def create(self, validated_data):
        """Crée la commande et ses lignes, aux prix du catalogue du jour."""
        from django.db import transaction
        from django.utils import timezone

        lignes = validated_data.pop("lignes", [])
        validated_data.setdefault("statut", StatutCommande.CONFIRMEE)

        with transaction.atomic():
            horodatage = timezone.now()
            commande = Commande.objects.create(
                numero=self._numero_suivant(horodatage), **validated_data
            )
            LigneCommande.objects.bulk_create(
                [
                    LigneCommande(
                        commande=commande,
                        production=ligne["production"],
                        quantite=ligne["quantite"],
                        prix_unitaire_fcfa=ligne["production"].prix_unitaire_fcfa,
                    )
                    for ligne in lignes
                ]
            )
        return commande

    @staticmethod
    def _numero_suivant(horodatage) -> str:
        """Numéro lisible et croissant : `CMD-2026-0001`.

        Le rang repart de un chaque année, ce qui garde le numéro court et
        parlant à l'oral — un numéro de commande se lit au téléphone.
        """
        annee = horodatage.year
        rang = (
            Commande.objects.filter(created_at__year=annee).count() + 1
        )
        return f"CMD-{annee}-{rang:04d}"
