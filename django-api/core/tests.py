"""
Tests du modèle métier : annotations, propriétés dérivées, contraintes.

Ils portent sur ce qui se calcule — la part du modèle où une erreur ne lève
aucune exception et se contente de servir un nombre plausible mais faux.
"""

from datetime import date, timedelta

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase

from core.models import (
    Activite,
    AxeStrategique,
    Commune,
    Filiere,
    Financement,
    Groupement,
    Membre,
    Production,
    Quartier,
)
from core.referentiels import (
    EtapeAccompagnement,
    Genre,
    SensIndicateur,
    StatutActivite,
    StatutFinancement,
    TypeFinancement,
    calculer_tendance,
    initiales,
    taux_atteinte,
)

AUJOURDHUI = date.today()


class SocleModele(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.commune = Commune.objects.create(slug="yeumbeul-nord")
        cls.quartier = Quartier.objects.create(
            commune=cls.commune, nom="Aïnoumady 1", slug="ainoumady-1",
            latitude=14.7802, longitude=-17.3841, population_estimee=12800,
        )
        cls.filiere = Filiere.objects.create(
            nom="Maraîchage", slug="maraichage", icone="plant-2",
            teinte="var(--ax-chart-5)",
        )
        cls.groupement = Groupement.objects.create(
            commune=cls.commune, nom="GIE And Liggéey", slug="gie-and-liggeey",
            quartier=cls.quartier, latitude=14.7871, longitude=-17.3818,
            filiere=cls.filiere, etape=EtapeAccompagnement.EQUIPE,
            date_creation=AUJOURDHUI - timedelta(days=900),
            chiffre_affaires_fcfa=4_200_000,
        )

        Membre.objects.create(
            groupement=cls.groupement, prenom="Khady", nom_famille="Sène",
            genre=Genre.FEMME, role="Présidente", est_responsable=True,
            date_adhesion=AUJOURDHUI, date_naissance=date(1985, 4, 12),
        )
        for i in range(6):
            Membre.objects.create(
                groupement=cls.groupement, prenom=f"Aminata{i}", nom_famille="Diop",
                genre=Genre.FEMME, date_adhesion=AUJOURDHUI,
                date_naissance=date(1990, 1, 1),
            )
        for i in range(3):
            Membre.objects.create(
                groupement=cls.groupement, prenom=f"Moussa{i}", nom_famille="Fall",
                genre=Genre.HOMME, date_adhesion=AUJOURDHUI,
                date_naissance=date(1992, 6, 1),
            )

        Production.objects.create(
            groupement=cls.groupement, filiere=cls.filiere,
            nom="Oignons de contre-saison", slug="oignons-contre-saison",
            prix_unitaire_fcfa=750, prix_barre_fcfa=900, unite="kg",
            stock_disponible=40, seuil_alerte=10, date_ajout=AUJOURDHUI,
        )
        Production.objects.create(
            groupement=cls.groupement, filiere=cls.filiere, nom="Tomates séchées",
            slug="tomates-sechees", prix_unitaire_fcfa=1200, unite="sachet",
            stock_disponible=3, seuil_alerte=5, date_ajout=AUJOURDHUI,
        )

        Financement.objects.create(
            reference="FIN-01", groupement=cls.groupement,
            type_financement=TypeFinancement.CREDIT_ROTATIF, montant_fcfa=1_500_000,
            montant_rembourse_fcfa=500_000, bailleur="Commune",
            date_decaissement=AUJOURDHUI,
            statut=StatutFinancement.REMBOURSEMENT_PARTIEL,
        )
        Financement.objects.create(
            reference="FIN-02", groupement=cls.groupement,
            type_financement=TypeFinancement.SUBVENTION, montant_fcfa=800_000,
            bailleur="Commune", date_decaissement=AUJOURDHUI,
        )


class TestAgregatsGroupement(SocleModele):
    def setUp(self):
        self.annote = Groupement.objects.avec_agregats().get(pk=self.groupement.pk)

    def test_effectif_et_part_de_femmes(self):
        """Deux comptages sur deux relations : le piège du produit cartésien."""
        self.assertEqual(self.annote.nombre_membres, 10)
        self.assertEqual(self.annote.part_femmes, 70)
        self.assertEqual(self.annote.nombre_productions, 2)

    def test_financement_recu_somme_tous_les_appuis(self):
        self.assertEqual(self.annote.financement_recu_fcfa, 2_300_000)

    def test_progression_suit_le_bareme_de_l_etape(self):
        self.assertEqual(self.annote.progression, 72)  # « équipé »

    def test_responsable_est_la_presidente(self):
        self.assertEqual(self.annote.responsable, "Khady Sène")

    def test_groupement_sans_membre_ne_divise_pas_par_zero(self):
        vide = Groupement.objects.create(
            commune=self.commune, nom="GIE naissant", slug="gie-naissant",
            quartier=self.quartier, latitude=14.78, longitude=-17.38,
            filiere=self.filiere, date_creation=AUJOURDHUI,
        )
        annote = Groupement.objects.avec_agregats().get(pk=vide.pk)
        self.assertEqual(annote.nombre_membres, 0)
        self.assertEqual(annote.part_femmes, 0)
        self.assertEqual(annote.responsable, "")

    def test_tris_du_contrat_sont_tous_applicables(self):
        for tri in ["nom", "-nombre_membres", "progression",
                    "-chiffre_affaires_fcfa", "note_moyenne"]:
            self.assertIsNotNone(Groupement.objects.avec_agregats().order_by(tri).first())


class TestProprietesDerivees(SocleModele):
    def test_membre(self):
        membre = Membre.objects.get(prenom="Khady")
        self.assertEqual(membre.nom_complet, "Khady Sène")
        self.assertEqual(membre.initiales, "KS")
        self.assertGreater(membre.age, 30)

    def test_age_absent_si_date_de_naissance_inconnue(self):
        membre = Membre.objects.create(
            groupement=self.groupement, prenom="Anonyme", nom_famille="Inconnu",
            genre=Genre.FEMME, date_adhesion=AUJOURDHUI,
        )
        self.assertIsNone(membre.age)

    def test_disponibilite_et_alerte_de_stock(self):
        oignons = Production.objects.get(slug="oignons-contre-saison")
        tomates = Production.objects.get(slug="tomates-sechees")
        self.assertTrue(oignons.disponible)
        self.assertTrue(tomates.disponible)
        self.assertEqual(
            list(Production.objects.en_alerte().values_list("slug", flat=True)),
            ["tomates-sechees"],
        )

    def test_encours_nul_sur_une_subvention(self):
        """Une subvention ne se rembourse pas : son encours est nul par nature."""
        credit = Financement.objects.get(reference="FIN-01")
        subvention = Financement.objects.get(reference="FIN-02")
        self.assertEqual(credit.encours_fcfa, 1_000_000)
        self.assertEqual(subvention.encours_fcfa, 0)


class TestRechercheSansAccent(SocleModele):
    def test_le_texte_accentue_se_trouve_sans_accent(self):
        self.assertEqual(
            Groupement.objects.filter(nom__unaccent__icontains="liggeey").count(), 1
        )
        self.assertEqual(
            Quartier.objects.filter(nom__unaccent__icontains="ainoumady").count(), 1
        )

    def test_et_reciproquement(self):
        self.assertEqual(
            Groupement.objects.filter(nom__unaccent__icontains="Liggéey").count(), 1
        )


class TestStatutActivite(TestCase):
    """Le statut se déduit de l'avancement face à l'avancement attendu.

    Chaque cas est vérifié deux fois : par l'annotation SQL et par le repli
    Python. Les deux implémentations doivent rester rigoureusement d'accord,
    sinon un écran servi par l'API contredirait l'interface d'administration.
    """

    CAS = [
        ("terminée", -300, -100, 100, False, StatutActivite.TERMINEE),
        ("échue et inachevée", -300, -100, 80, False, StatutActivite.EN_RETARD),
        ("planifiée", 30, 200, 0, False, StatutActivite.PLANIFIEE),
        ("suspendue", -50, 100, 20, True, StatutActivite.SUSPENDUE),
        ("en cours dans les clous", -50, 50, 50, False, StatutActivite.EN_COURS),
        ("en cours décrochée", -80, 20, 10, False, StatutActivite.EN_RETARD),
        ("achevée en avance", -10, 100, 100, False, StatutActivite.TERMINEE),
        ("d'un seul jour", 0, 0, 100, False, StatutActivite.TERMINEE),
    ]

    @classmethod
    def setUpTestData(cls):
        cls.axe = AxeStrategique.objects.create(code="A1", intitule="Structurer")
        for i, (libelle, debut, fin, avancement, suspendue, _) in enumerate(cls.CAS):
            Activite.objects.create(
                code=f"ACT-{i:02d}", intitule=libelle, axe=cls.axe,
                responsable="Khady Sène",
                date_debut=AUJOURDHUI + timedelta(days=debut),
                date_fin=AUJOURDHUI + timedelta(days=fin),
                avancement=avancement, suspendue=suspendue,
            )

    def test_annotation_sql(self):
        for activite in Activite.objects.avec_statut().order_by("code"):
            attendu = self.CAS[int(activite.code.split("-")[1])][5]
            self.assertEqual(activite.statut, attendu, activite.intitule)

    def test_repli_python_concorde(self):
        for activite in Activite.objects.avec_statut().order_by("code"):
            self.assertEqual(
                activite.statut, activite.statut_calcule(), activite.intitule
            )

    def test_filtre_sur_l_annotation(self):
        self.assertEqual(
            Activite.objects.avec_statut()
            .filter(statut=StatutActivite.EN_RETARD)
            .count(),
            2,
        )


class TestFonctionsDeCalcul(TestCase):
    def test_initiales(self):
        self.assertEqual(initiales("Khady Sène"), "KS")
        self.assertEqual(initiales("Aminata"), "A")
        self.assertEqual(initiales("Ndèye Fatou Diop"), "NF")
        self.assertEqual(initiales(""), "")

    def test_tendance_a_une_zone_morte(self):
        """Sans zone morte, un arrondi ferait clignoter une pastille stable."""
        self.assertEqual(calculer_tendance(100, 101), "stable")
        self.assertEqual(calculer_tendance(100, 110), "hausse")
        self.assertEqual(calculer_tendance(100, 90), "baisse")

    def test_taux_atteinte_croissant(self):
        self.assertEqual(taux_atteinte(50, 100, SensIndicateur.CROISSANT), 50)
        self.assertEqual(taux_atteinte(120, 100, SensIndicateur.CROISSANT), 100)

    def test_taux_atteinte_decroissant(self):
        """118 jours pour une cible de 90 valent 76 %, pas 131 %."""
        self.assertEqual(taux_atteinte(118, 90, SensIndicateur.DECROISSANT), 76)
        self.assertEqual(taux_atteinte(80, 90, SensIndicateur.DECROISSANT), 100)

    def test_taux_atteinte_ne_divise_pas_par_zero(self):
        self.assertEqual(taux_atteinte(0, 100, SensIndicateur.DECROISSANT), 100)
        self.assertEqual(taux_atteinte(50, 0, SensIndicateur.CROISSANT), 0)


class TestContraintes(SocleModele):
    def test_prix_barre_doit_depasser_le_prix_pratique(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Production.objects.create(
                    groupement=self.groupement, filiere=self.filiere,
                    nom="Prix incohérent", slug="prix-incoherent",
                    prix_unitaire_fcfa=1000, prix_barre_fcfa=500,
                    date_ajout=AUJOURDHUI,
                )

    def test_remboursement_ne_depasse_pas_le_decaissement(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Financement.objects.create(
                    reference="FIN-03", groupement=self.groupement,
                    type_financement=TypeFinancement.CREDIT_ROTATIF,
                    montant_fcfa=100_000, montant_rembourse_fcfa=200_000,
                    bailleur="Commune", date_decaissement=AUJOURDHUI,
                )

    def test_activite_ne_finit_pas_avant_de_commencer(self):
        axe = AxeStrategique.objects.create(code="A9", intitule="Axe de test")
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Activite.objects.create(
                    code="ACT-99", intitule="Chronologie impossible", axe=axe,
                    responsable="Khady Sène",
                    date_debut=AUJOURDHUI, date_fin=AUJOURDHUI - timedelta(days=10),
                )
