"""Briques communes à tous les modèles métier."""

from django.db import models


class Horodate(models.Model):
    """Traçabilité minimale de création et de modification.

    Abstraite : elle n'ajoute aucune table, seulement deux colonnes aux modèles
    qui en héritent.
    """

    created_at = models.DateTimeField("créé le", auto_now_add=True)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        abstract = True
