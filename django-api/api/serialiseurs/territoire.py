"""
Sérialiseurs des référentiels : quartiers et filières.

Les compteurs (`nombre_groupements`, `nombre_productions`) sont **calculés,
jamais stockés**. Ils sont résolus depuis un jeu de compteurs déposé dans le
contexte par la vue, ce qui évite de relancer un `COUNT` par ligne de liste :
sur cent groupements affichant chacun leur filière, la version naïve tirerait
deux cents requêtes.
"""

from rest_framework import serializers

from core.models import Filiere, Quartier


def compteurs_referentiels() -> dict:
    """Compteurs des deux référentiels, en deux requêtes agrégées.

    À déposer dans le contexte des sérialiseurs sous la clé `compteurs`.
    """
    from django.db.models import Count

    quartiers = {
        ligne["id"]: ligne["n"]
        for ligne in Quartier.objects.annotate(n=Count("groupements")).values("id", "n")
    }
    filieres = {}
    for ligne in Filiere.objects.annotate(
        nb_groupements=Count("groupements", distinct=True),
        nb_productions=Count("productions", distinct=True),
    ).values("id", "nb_groupements", "nb_productions"):
        filieres[ligne["id"]] = (ligne["nb_groupements"], ligne["nb_productions"])

    return {"quartiers": quartiers, "filieres": filieres}


class SocleCompteurs:
    """Accès au jeu de compteurs du contexte, avec repli sur un comptage direct.

    Le repli garantit qu'un sérialiseur utilisé hors de sa vue habituelle rend
    tout de même la bonne valeur — au prix d'une requête, ce qui est acceptable
    pour un objet isolé et inacceptable pour une liste, d'où le contexte.
    """

    def _compteurs(self, famille: str) -> dict:
        return (self.context.get("compteurs") or {}).get(famille, {})


class QuartierSerializer(SocleCompteurs, serializers.ModelSerializer):
    nombre_groupements = serializers.SerializerMethodField()

    class Meta:
        model = Quartier
        fields = [
            "id",
            "nom",
            "slug",
            "latitude",
            "longitude",
            "population_estimee",
            "nombre_groupements",
        ]

    def get_nombre_groupements(self, obj) -> int:
        compteurs = self._compteurs("quartiers")
        if obj.pk in compteurs:
            return compteurs[obj.pk]
        return obj.groupements.count()


class FiliereSerializer(SocleCompteurs, serializers.ModelSerializer):
    nombre_groupements = serializers.SerializerMethodField()
    nombre_productions = serializers.SerializerMethodField()

    class Meta:
        model = Filiere
        fields = [
            "id",
            "nom",
            "slug",
            "description",
            "icone",
            "teinte",
            "nombre_groupements",
            "nombre_productions",
        ]

    def _paire(self, obj) -> tuple[int, int]:
        compteurs = self._compteurs("filieres")
        if obj.pk in compteurs:
            return compteurs[obj.pk]
        return obj.groupements.count(), obj.productions.count()

    def get_nombre_groupements(self, obj) -> int:
        return self._paire(obj)[0]

    def get_nombre_productions(self, obj) -> int:
        return self._paire(obj)[1]
