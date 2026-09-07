"""
Financement des groupements et journal des mouvements.

Tous les montants sont des **entiers en FCFA**, sans décimale (CLAUDE.md §5).
On n'emploie pas `DecimalField` : DRF le sérialise en chaîne (« 1200.00 »), ce
qui casserait les écrans qui attendent un nombre.
"""

from django.db import models

from ..referentiels import (
    MoyenPaiement,
    StatutFinancement,
    StatutMouvement,
    TypeFinancement,
)
from .base import Horodate
from .groupements import Groupement


class FinancementQuerySet(models.QuerySet):
    def remboursables(self):
        """Crédits rotatifs et fonds de roulement, seuls concernés par un
        remboursement.

        Rapporter les remboursements aux subventions donnerait un taux
        structurellement bas et faux (`15-CONTRAT-API.md` §8).
        """
        from ..referentiels import TYPES_REMBOURSABLES

        return self.filter(type_financement__in=TYPES_REMBOURSABLES)


class Financement(Horodate):
    """Appui financier consenti à un groupement."""

    reference = models.CharField("référence", max_length=50, unique=True)
    groupement = models.ForeignKey(
        Groupement,
        on_delete=models.CASCADE,
        related_name="financements",
        verbose_name="groupement",
    )

    type_financement = models.CharField(
        "type d'appui", max_length=25, choices=TypeFinancement.choices
    )
    montant_fcfa = models.PositiveBigIntegerField("montant décaissé (FCFA)")
    montant_rembourse_fcfa = models.PositiveBigIntegerField(
        "montant remboursé (FCFA)", default=0
    )
    bailleur = models.CharField("bailleur", max_length=255)
    objet = models.CharField("objet", max_length=500, blank=True)

    date_decaissement = models.DateField("date de décaissement")
    date_prevue_remboursement = models.DateField(
        "échéance de remboursement", null=True, blank=True
    )

    statut = models.CharField(
        "statut",
        max_length=25,
        choices=StatutFinancement.choices,
        default=StatutFinancement.DECAISSE,
        db_index=True,
        help_text="La défaillance est un constat de gestion, pas une déduction "
        "automatique : elle reste saisie.",
    )

    objects = FinancementQuerySet.as_manager()

    class Meta:
        verbose_name = "financement"
        verbose_name_plural = "financements"
        ordering = ["-date_decaissement"]
        indexes = [models.Index(fields=["type_financement", "statut"])]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(
                    montant_rembourse_fcfa__lte=models.F("montant_fcfa")
                ),
                name="remboursement_inferieur_au_decaissement",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.reference} — {self.groupement.nom}"

    @property
    def encours_fcfa(self) -> int:
        """Reste dû sur un financement remboursable, zéro sur une subvention."""
        from ..referentiels import TYPES_REMBOURSABLES

        if self.type_financement not in TYPES_REMBOURSABLES:
            return 0
        return max(0, self.montant_fcfa - self.montant_rembourse_fcfa)


class MouvementFinancier(Horodate):
    """Écriture unitaire du journal de caisse."""

    reference = models.CharField("référence", max_length=50, unique=True)
    libelle = models.CharField("libellé", max_length=500)
    contrepartie = models.CharField(
        "contrepartie", max_length=255, help_text="Qui reçoit ou qui verse."
    )
    categorie = models.CharField("catégorie", max_length=100)

    #: **Signé** : négatif pour une sortie de caisse. D'où `BigIntegerField` et
    #: non `PositiveBigIntegerField`.
    montant_fcfa = models.BigIntegerField("montant (FCFA, signé)")

    date = models.DateField("date")
    moyen = models.CharField(
        "moyen de paiement",
        max_length=20,
        choices=MoyenPaiement.choices,
        help_text="Wave, Orange Money, Free Money, espèces ou virement. "
        "Aucun moyen international (CLAUDE.md §5).",
    )
    statut = models.CharField(
        "statut",
        max_length=20,
        choices=StatutMouvement.choices,
        default=StatutMouvement.VALIDE,
    )

    class Meta:
        verbose_name = "mouvement financier"
        verbose_name_plural = "mouvements financiers"
        ordering = ["-date", "-id"]

    def __str__(self) -> str:
        return f"{self.reference} — {self.libelle}"
