"""Briques partagées par les vues."""

from rest_framework.response import Response


class MixinLimite:
    """Applique le paramètre `?limite=` des listes non paginées.

    La coupe se fait **après** filtrage et tri, jamais dans `get_queryset()` :
    Django refuse de réordonner une requête déjà tranchée, et le tri de DRF
    s'applique plus tard dans la chaîne. Trancher trop tôt lève un
    `TypeError: Cannot reorder a query once a slice has been taken`.
    """

    #: Garde-fou : au-delà, on sert tout plutôt que d'accepter n'importe quoi.
    limite_maximale = 500

    def _limite_demandee(self) -> int:
        try:
            limite = int(self.request.query_params.get("limite", 0))
        except (TypeError, ValueError):
            return 0
        return min(max(0, limite), self.limite_maximale)

    def list(self, request, *args, **kwargs):
        objets = self.filter_queryset(self.get_queryset())
        limite = self._limite_demandee()
        if limite:
            objets = objets[:limite]
        return Response(self.get_serializer(objets, many=True).data)
