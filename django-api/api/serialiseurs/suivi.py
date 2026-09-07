"""
Sérialiseurs du suivi-évaluation : cadre logique, activités, jalons, séries.

`Kpi`, `PointSerie`, `Repartition` et `EtapeEntonnoir` ne correspondent à aucune
table : ce sont des formes de sortie construites par les vues d'agrégation. Ils
sont déclarés ici pour que le schéma OpenAPI les documente comme les autres.
"""

from rest_framework import serializers

from core.models import Activite, AxeStrategique, Indicateur, Jalon, ResultatAttendu


# --------------------------------------------------------------------------- #
# Formes de sortie sans table
# --------------------------------------------------------------------------- #


class PointSerieSerializer(serializers.Serializer):
    periode = serializers.CharField()
    valeur = serializers.FloatField()
    precedent = serializers.FloatField()


class KpiSerializer(serializers.Serializer):
    """Carte d'indicateur d'en-tête, sparkline comprise.

    `valeur_affichee` est fournie par le serveur : deux fronts qui formatent
    chacun de leur côté finissent toujours par diverger d'un espace ou d'une
    décimale.
    """

    cle = serializers.CharField()
    libelle = serializers.CharField()
    valeur = serializers.FloatField()
    valeur_affichee = serializers.CharField()
    unite = serializers.CharField()
    delta = serializers.FloatField()
    tendance = serializers.CharField()
    etincelle = serializers.ListField(child=serializers.FloatField())
    cible = serializers.FloatField(required=False)
    sens = serializers.CharField(required=False)


class RepartitionSerializer(serializers.Serializer):
    libelle = serializers.CharField()
    slug = serializers.CharField()
    valeur = serializers.FloatField()
    part = serializers.IntegerField()
    teinte = serializers.CharField(required=False)


class EtapeEntonnoirSerializer(serializers.Serializer):
    etape = serializers.CharField()
    libelle = serializers.CharField()
    effectif = serializers.IntegerField()
    part = serializers.IntegerField()


class LigneCroisementSerializer(serializers.Serializer):
    """Une ligne du tableau croisé.

    `valeurs` est indexé par nom de colonne, pas positionnel : l'écran lit
    `valeurs[nomDeLaFiliere]` et n'a donc pas à retrouver un indice.
    La clé d'identité de la ligne porte le nom de l'axe demandé — `quartier`
    dans le seul croisement que les écrans utilisent aujourd'hui.
    """

    quartier = serializers.CharField()
    valeurs = serializers.DictField(child=serializers.IntegerField())
    total = serializers.IntegerField()


class CroisementSerializer(serializers.Serializer):
    colonnes = serializers.ListField(child=serializers.CharField())
    lignes = LigneCroisementSerializer(many=True)


class ResultatRechercheSerializer(serializers.Serializer):
    type = serializers.CharField()
    titre = serializers.CharField()
    sousTitre = serializers.CharField()
    lien = serializers.CharField()
    icone = serializers.CharField()


# --------------------------------------------------------------------------- #
# Cadre logique
# --------------------------------------------------------------------------- #


class IndicateurSerializer(serializers.ModelSerializer):
    resultat_id = serializers.IntegerField(read_only=True)
    axe_id = serializers.IntegerField(read_only=True)
    taux_atteinte = serializers.IntegerField(read_only=True)
    tendance = serializers.CharField(read_only=True)
    releves = PointSerieSerializer(many=True, read_only=True)

    class Meta:
        model = Indicateur
        fields = [
            "id",
            "resultat_id",
            "axe_id",
            "code",
            "intitule",
            "unite",
            "valeur_reference",
            "valeur_actuelle",
            "valeur_cible",
            "sens",
            "taux_atteinte",
            "periodicite",
            "source_donnee",
            "date_derniere_collecte",
            "releves",
            "tendance",
            "ventile_par_genre",
        ]


class ResultatAttenduSerializer(serializers.ModelSerializer):
    axe_id = serializers.IntegerField(read_only=True)
    avancement = serializers.IntegerField(read_only=True)

    class Meta:
        model = ResultatAttendu
        fields = ["id", "axe_id", "code", "intitule", "avancement"]


class AxeStrategiqueSerializer(serializers.ModelSerializer):
    avancement = serializers.IntegerField(read_only=True)

    class Meta:
        model = AxeStrategique
        fields = ["id", "code", "intitule", "description", "teinte", "avancement"]


class CadreLogiqueSerializer(serializers.Serializer):
    """L'arbre complet, servi d'un seul appel.

    Les trois listes arrivent à plat plutôt qu'imbriquées : l'écran du cadre
    logique affiche indifféremment l'arbre replié par axe et la table de tous
    les indicateurs, et une structure imbriquée l'obligerait à l'aplatir
    lui-même.
    """

    axes = AxeStrategiqueSerializer(many=True)
    resultats = ResultatAttenduSerializer(many=True)
    indicateurs = IndicateurSerializer(many=True)


# --------------------------------------------------------------------------- #
# Plan d'action
# --------------------------------------------------------------------------- #


class ActiviteSerializer(serializers.ModelSerializer):
    axe_id = serializers.IntegerField(read_only=True)
    responsable_initiales = serializers.CharField(read_only=True)
    #: Posé par `Activite.objects.avec_statut()`.
    statut = serializers.CharField(read_only=True)
    quartiers = serializers.SerializerMethodField()
    filieres = serializers.SerializerMethodField()

    class Meta:
        model = Activite
        fields = [
            "id",
            "code",
            "intitule",
            "description",
            "axe_id",
            "responsable",
            "responsable_initiales",
            "quartiers",
            "filieres",
            "date_debut",
            "date_fin",
            "date_achevement",
            "avancement",
            "statut",
            "budget_prevu_fcfa",
            "budget_consomme_fcfa",
            "groupements_beneficiaires",
        ]

    def get_quartiers(self, obj) -> list[str]:
        return [quartier.nom for quartier in obj.quartiers.all()]

    def get_filieres(self, obj) -> list[str]:
        return [filiere.nom for filiere in obj.filieres.all()]


class JalonSerializer(serializers.ModelSerializer):
    activite_id = serializers.IntegerField(read_only=True)
    statut = serializers.CharField(read_only=True)

    class Meta:
        model = Jalon
        fields = [
            "id",
            "activite_id",
            "intitule",
            "description",
            "date_prevue",
            "date_reelle",
            "statut",
            "decisif",
        ]


class ChargeResponsableSerializer(serializers.Serializer):
    responsable = serializers.CharField()
    activites = serializers.IntegerField()


class EffectifParStatutSerializer(serializers.Serializer):
    statut = serializers.CharField()
    effectif = serializers.IntegerField()


class ResumePlanActionSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    par_statut = EffectifParStatutSerializer(many=True)
    charge_par_responsable = ChargeResponsableSerializer(many=True)
    budget_engage_fcfa = serializers.IntegerField()
    budget_consomme_fcfa = serializers.IntegerField()
    part_consommee = serializers.IntegerField()
    avancement_moyen = serializers.IntegerField()
    terminees = serializers.IntegerField()
    #: Vaut `total − terminees`. Compté à part pour que les deux fronts n'en
    #: donnent pas chacun sa propre définition.
    ouvertes = serializers.IntegerField()
