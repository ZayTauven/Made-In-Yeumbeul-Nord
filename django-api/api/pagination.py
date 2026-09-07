"""Pagination de l'API."""

from rest_framework.pagination import PageNumberPagination


class PaginationParPage(PageNumberPagination):
    """Pagination DRF standard : `{ count, next, previous, results }`.

    Les deux fronts typent cette enveloppe sous le nom `Page<T>` dans
    `domaine/types.ts`. Le paramètre de taille s'appelle `page_size`, comme
    annoncé au contrat (`15-CONTRAT-API.md` §2).
    """

    page_size_query_param = "page_size"
    #: Plafond de garde : une grille de la vitrine qui demanderait dix mille
    #: lignes ferait tomber la démonstration plutôt que de s'afficher.
    max_page_size = 200
