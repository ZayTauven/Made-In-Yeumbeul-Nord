"""
Boutiques témoins, commandes et lignes de commande.

Le montant total d'une commande n'est pas stocké : il se somme sur les lignes,
dont le prix unitaire est figé à la commande. Un total stocké et des lignes
recalculées finissent toujours par diverger d'un arrondi.
"""

from django.db import models

from ..referentiels import MoyenPaiement, StatutCommande
from .base import Horodate
from .productions import Production
from .territoire import Quartier


class Boutique(Horodate):
    """Boutique témoin « Made in Yeumbeul Nord »."""

    nom = models.CharField("nom", max_length=255)
    adresse = models.CharField("adresse", max_length=500)
    quartier = models.ForeignKey(
        Quartier,
        on_delete=models.PROTECT,
        related_name="boutiques",
        verbose_name="quartier",
    )
    latitude = models.FloatField("latitude")
    longitude = models.FloatField("longitude")

    telephone = models.CharField("téléphone", max_length=20, blank=True)
    responsable = models.CharField("responsable", max_length=255)

    heure_ouverture = models.TimeField("heure d'ouverture")
    heure_fermeture = models.TimeField("heure de fermeture")

    date_ouverture = models.DateField("date d'ouverture", null=True, blank=True)
    note_moyenne = models.FloatField("note moyenne", default=0)

    class Meta:
        verbose_name = "boutique"
        verbose_name_plural = "boutiques"
        ordering = ["nom"]

    def __str__(self) -> str:
        return self.nom


class Commande(Horodate):
    """Commande passée depuis la vitrine."""

    numero = models.CharField("numéro", max_length=50, unique=True)
    statut = models.CharField(
        "statut",
        max_length=20,
        choices=StatutCommande.choices,
        default=StatutCommande.PANIER,
        db_index=True,
    )

    client_nom = models.CharField("nom du client", max_length=255)
    client_telephone = models.CharField("téléphone du client", max_length=20)
    client_email = models.EmailField("courriel du client", null=True, blank=True)

    adresse_livraison = models.CharField("adresse de livraison", max_length=500)
    quartier = models.ForeignKey(
        Quartier,
        on_delete=models.PROTECT,
        related_name="commandes",
        verbose_name="quartier de livraison",
    )

    moyen_paiement = models.CharField(
        "moyen de paiement", max_length=20, choices=MoyenPaiement.choices
    )
    date_confirmation = models.DateTimeField(
        "confirmée le", null=True, blank=True
    )

    class Meta:
        verbose_name = "commande"
        verbose_name_plural = "commandes"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Commande {self.numero}"

    @property
    def montant_total_fcfa(self) -> int:
        return sum(ligne.montant_fcfa for ligne in self.lignes.all())


class LigneCommande(models.Model):
    """Une ligne de commande, au prix figé le jour de la commande."""

    commande = models.ForeignKey(
        Commande,
        on_delete=models.CASCADE,
        related_name="lignes",
        verbose_name="commande",
    )
    production = models.ForeignKey(
        Production,
        on_delete=models.PROTECT,
        related_name="lignes_commande",
        verbose_name="production",
    )

    quantite = models.PositiveIntegerField("quantité")
    prix_unitaire_fcfa = models.PositiveIntegerField(
        "prix unitaire (FCFA)",
        help_text="Figé à la commande : une hausse ultérieure du tarif ne doit "
        "pas réécrire l'historique.",
    )

    class Meta:
        verbose_name = "ligne de commande"
        verbose_name_plural = "lignes de commande"
        constraints = [
            models.UniqueConstraint(
                fields=["commande", "production"],
                name="une_ligne_par_production_et_commande",
            )
        ]

    def __str__(self) -> str:
        return f"{self.quantite} × {self.production.nom}"

    @property
    def montant_fcfa(self) -> int:
        return self.quantite * self.prix_unitaire_fcfa
