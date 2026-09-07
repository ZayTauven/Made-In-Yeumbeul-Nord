"""
Sérialiseurs du financement.

Tous les montants sortent en entiers FCFA. C'est la raison pour laquelle les
modèles n'emploient pas `DecimalField` : DRF le sérialiserait en chaîne
(« 1200.00 »), là où les deux fronts typent un nombre.
"""

from rest_framework import serializers

from core.models import Financement, MouvementFinancier

from .suivi import PointSerieSerializer, RepartitionSerializer


class FinancementSerializer(serializers.ModelSerializer):
    groupement_id = serializers.IntegerField(read_only=True)
    groupement_nom = serializers.CharField(source="groupement.nom", read_only=True)

    class Meta:
        model = Financement
        fields = [
            "id",
            "reference",
            "groupement_id",
            "groupement_nom",
            "type_financement",
            "montant_fcfa",
            "montant_rembourse_fcfa",
            "bailleur",
            "date_decaissement",
            "date_prevue_remboursement",
            "statut",
            "objet",
        ]


class MouvementFinancierSerializer(serializers.ModelSerializer):
    class Meta:
        model = MouvementFinancier
        fields = [
            "id",
            "reference",
            "libelle",
            "contrepartie",
            "categorie",
            "montant_fcfa",
            "date",
            "moyen",
            "statut",
        ]


class ResumeFinancementSerializer(serializers.Serializer):
    """Bloc de tête de l'écran financement.

    `taux_remboursement` porte sur les seuls financements **remboursables** —
    crédit rotatif et fonds de roulement. Le rapporter aux subventions donnerait
    un taux structurellement bas et faux.
    """

    total_decaisse_fcfa = serializers.IntegerField()
    total_rembourse_fcfa = serializers.IntegerField()
    taux_remboursement = serializers.IntegerField()
    groupements_finances = serializers.IntegerField()
    encours_fcfa = serializers.IntegerField()
    defaillants = serializers.IntegerField()
    par_type = RepartitionSerializer(many=True)
    flux_mensuel = PointSerieSerializer(many=True)
