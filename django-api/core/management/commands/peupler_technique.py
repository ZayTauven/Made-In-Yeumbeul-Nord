"""
Peuplement **technique** de la base de développement.

    python manage.py peupler_technique --vider

⚠️ Ce n'est pas le jeu de démonstration. Les noms sont des gabarits
(« GIE And Liggéey 7 », « Production 3-2 »), les montants sont tirés au sort et
la chronologie n'a pas été relue. Il sert à brancher les deux fronts sur une API
qui répond, et à rien d'autre.

Le jeu montré au Maire relève de l'agent `yn-data-demo` : toponymie réelle de
Yeumbeul Nord, anthroponymie sénégalaise, filières plausibles, montants en FCFA
cohérents, chronologie tenable. La crédibilité des données est ce qui emportera
ou non la conviction ; ces gabarits-là ne l'emporteraient pas.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from api.tests.fabrique import peupler
from core.models import Commune


class Command(BaseCommand):
    help = "Peuple la base d'un jeu technique, pour brancher les fronts."

    def add_arguments(self, parser):
        parser.add_argument(
            "--vider",
            action="store_true",
            help="Supprime les données métier existantes avant de peupler.",
        )
        parser.add_argument(
            "--graine",
            type=int,
            default=20261031,
            help="Graine du générateur. À graine égale, jeu identique.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if Commune.objects.exists() and not options["vider"]:
            self.stderr.write(
                self.style.ERROR(
                    "La base contient déjà des données. Relancer avec --vider "
                    "pour les remplacer."
                )
            )
            return

        if options["vider"]:
            self._vider()

        peupler(graine=options["graine"])

        from core.models import Activite, Groupement, Indicateur, Membre, Production

        self.stdout.write(
            self.style.SUCCESS(
                f"Jeu technique en place : {Groupement.objects.count()} groupements, "
                f"{Membre.objects.count()} membres, "
                f"{Production.objects.count()} productions, "
                f"{Activite.objects.count()} activités, "
                f"{Indicateur.objects.count()} indicateurs."
            )
        )
        self.stdout.write(
            "Rappel : jeu technique, pas le jeu de démonstration (voir yn-data-demo)."
        )

    def _vider(self):
        """Supprime les données métier, en partant des tables qui dépendent."""
        from core.models import (
            Activite,
            Actualite,
            AxeStrategique,
            Boutique,
            Certification,
            Commande,
            EvenementJournal,
            Filiere,
            Financement,
            Formation,
            Groupement,
            MouvementFinancier,
            Quartier,
            SessionFormation,
        )

        for modele in [
            Commande, Certification, SessionFormation, Formation, Financement,
            MouvementFinancier, Activite, AxeStrategique, Actualite,
            EvenementJournal, Boutique, Groupement, Quartier, Filiere, Commune,
        ]:
            modele.objects.all().delete()
        self.stdout.write("Données métier supprimées.")
