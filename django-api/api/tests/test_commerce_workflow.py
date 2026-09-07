"""Tests du commerce, des contenus, du workflow de validation et de la doc."""

from django.contrib.auth.models import User

from core.models import EvenementJournal, Groupement
from core.referentiels import EtatValidation

from .test_catalogue import SocleApi


class TestCommerceEtContenus(SocleApi):
    def test_boutiques(self):
        boutiques = self.json("/api/boutiques/")
        self.assertEqual(len(boutiques), 3)
        self.assertLessEqual(
            {"id", "nom", "adresse", "quartier", "latitude", "longitude", "telephone",
             "responsable", "heure_ouverture", "heure_fermeture", "note_moyenne"},
            set(boutiques[0]),
        )

    def test_actualites(self):
        actualites = self.json("/api/actualites/")
        self.assertLessEqual(
            {"id", "titre", "slug", "chapeau", "contenu", "photo", "categorie",
             "auteur", "date_publication", "temps_lecture_min"},
            set(actualites[0]),
        )
        self.assertEqual(len(self.json("/api/actualites/?limite=2")), 2)
        self.json(f"/api/actualites/{actualites[0]['slug']}/")

    def test_journal_avec_avatars_a_initiales(self):
        """Aucun portrait réel n'incarne un utilisateur fictif (CLAUDE.md §5)."""
        journal = self.json("/api/journal/?limite=3")
        self.assertEqual(len(journal), 3)
        self.assertLessEqual(
            {"acteur", "acteur_initiales", "acteur_teinte", "action", "cible",
             "cible_lien", "horodatage", "categorie"},
            set(journal[0]),
        )
        for entree in journal:
            self.assertTrue(1 <= len(entree["acteur_initiales"]) <= 2)
            self.assertNotIn("photo", entree)


class TestCommandes(SocleApi):
    def _corps(self, production, quantite=3):
        return {
            "client_nom": "Awa Diallo",
            "client_telephone": "77 123 45 67",
            "adresse_livraison": "Rue 12, Darou Salam",
            "quartier": self.donnees["quartiers"][0].nom,
            "moyen_paiement": "wave",
            "lignes": [{"production_id": production["id"], "quantite": quantite}],
        }

    def test_visiteur_anonyme_peut_commander(self):
        production = self.json("/api/productions/")["results"][0]
        reponse = self.client.post(
            "/api/commandes/", self._corps(production), content_type="application/json"
        )
        self.assertEqual(reponse.status_code, 201, reponse.content[:400])

    def test_montant_calcule_au_prix_du_catalogue(self):
        """Le prix est figé par le serveur : le navigateur ne le dicte pas."""
        production = self.json("/api/productions/")["results"][0]
        corps = self._corps(production)
        corps["lignes"][0]["prix_unitaire_fcfa"] = 1  # tentative de prix imposé

        commande = self.client.post(
            "/api/commandes/", corps, content_type="application/json"
        ).json()

        self.assertEqual(
            commande["montant_total_fcfa"], 3 * production["prix_unitaire_fcfa"]
        )
        self.assertEqual(
            commande["lignes"][0]["prix_unitaire_fcfa"],
            production["prix_unitaire_fcfa"],
        )

    def test_numero_attribue_par_le_serveur(self):
        production = self.json("/api/productions/")["results"][0]
        premier = self.client.post(
            "/api/commandes/", self._corps(production), content_type="application/json"
        ).json()
        second = self.client.post(
            "/api/commandes/",
            self._corps(self.json("/api/productions/")["results"][1]),
            content_type="application/json",
        ).json()

        self.assertTrue(premier["numero"].startswith("CMD-"))
        self.assertNotEqual(premier["numero"], second["numero"])

    def test_ligne_porte_les_libelles_pour_l_affichage(self):
        production = self.json("/api/productions/")["results"][0]
        commande = self.client.post(
            "/api/commandes/", self._corps(production), content_type="application/json"
        ).json()
        ligne = commande["lignes"][0]
        self.assertLessEqual(
            {"production_id", "production_nom", "production_photo", "groupement_nom",
             "quantite", "prix_unitaire_fcfa", "unite"},
            set(ligne),
        )

    def test_moyens_de_paiement_internationaux_refuses(self):
        production = self.json("/api/productions/")["results"][0]
        corps = self._corps(production)
        corps["moyen_paiement"] = "visa"
        reponse = self.client.post(
            "/api/commandes/", corps, content_type="application/json"
        )
        self.assertEqual(reponse.status_code, 400)


class TestWorkflowValidation(SocleApi):
    def setUp(self):
        self.brouillon = Groupement.objects.filter(
            etat_validation=EtatValidation.BROUILLON
        ).first()
        self.assertIsNotNone(self.brouillon)

    def _connecter(self):
        User.objects.create_user("agent", "agent@yeumbeulnord.sn", "motdepasse")
        self.client.login(username="agent", password="motdepasse")

    def test_ecriture_refusee_a_l_anonyme(self):
        reponse = self.client.post(f"/api/groupements/{self.brouillon.slug}/soumettre/")
        self.assertIn(reponse.status_code, (401, 403))

    def test_chaine_nominale(self):
        self._connecter()
        soumission = self.client.post(
            f"/api/groupements/{self.brouillon.slug}/soumettre/"
        )
        self.assertEqual(soumission.status_code, 200, soumission.content[:300])
        self.assertEqual(soumission.json()["etat_validation"], "soumis")

        validation = self.client.post(f"/api/groupements/{self.brouillon.slug}/valider/")
        self.assertEqual(validation.status_code, 200)
        self.assertEqual(validation.json()["etat_validation"], "valide")

    def test_transition_impossible_rejetee(self):
        """Valider un brouillon n'a pas de sens : 409, pas un succès silencieux."""
        self._connecter()
        reponse = self.client.post(f"/api/groupements/{self.brouillon.slug}/valider/")
        self.assertEqual(reponse.status_code, 409)
        self.brouillon.refresh_from_db()
        self.assertEqual(self.brouillon.etat_validation, EtatValidation.BROUILLON)

    def test_rejet_sans_motif_refuse(self):
        """Un rejet sans motif est ingérable pour le groupement concerné."""
        self._connecter()
        self.client.post(f"/api/groupements/{self.brouillon.slug}/soumettre/")
        reponse = self.client.post(f"/api/groupements/{self.brouillon.slug}/rejeter/")
        self.assertEqual(reponse.status_code, 400)
        self.assertIn("motif", reponse.json())

    def test_rejet_motive_puis_correction(self):
        self._connecter()
        self.client.post(f"/api/groupements/{self.brouillon.slug}/soumettre/")
        rejet = self.client.post(
            f"/api/groupements/{self.brouillon.slug}/rejeter/",
            {"motif": "Pièces justificatives manquantes."},
            content_type="application/json",
        )
        self.assertEqual(rejet.status_code, 200)
        self.assertEqual(rejet.json()["etat_validation"], "rejete")

        correction = self.client.post(
            f"/api/groupements/{self.brouillon.slug}/corriger/"
        )
        self.assertEqual(correction.status_code, 200)
        self.assertEqual(correction.json()["etat_validation"], "brouillon")

    def test_chaque_transition_ecrit_au_journal(self):
        self._connecter()
        avant = EvenementJournal.objects.count()
        self.client.post(f"/api/groupements/{self.brouillon.slug}/soumettre/")
        self.client.post(f"/api/groupements/{self.brouillon.slug}/valider/")
        self.assertEqual(EvenementJournal.objects.count(), avant + 2)

        derniere = EvenementJournal.objects.first()
        self.assertEqual(derniere.categorie, "groupement")
        self.assertEqual(derniere.cible, self.brouillon.nom)

    def test_workflow_disponible_sur_les_productions(self):
        from core.models import Production

        self._connecter()
        production = Production.objects.first()
        production.etat_validation = EtatValidation.BROUILLON
        production.save(update_fields=["etat_validation"])

        reponse = self.client.post(f"/api/productions/{production.slug}/soumettre/")
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse.json()["etat_validation"], "soumis")


class TestDocumentation(SocleApi):
    def test_schema_et_swagger_repondent(self):
        for chemin in ["/api/schema/", "/api/doc/", "/api/redoc/"]:
            reponse = self.client.get(chemin)
            self.assertEqual(reponse.status_code, 200, chemin)

    def test_le_schema_couvre_les_routes_du_contrat(self):
        schema = self.client.get("/api/schema/").content.decode("utf-8")
        for route in [
            "/api/quartiers/", "/api/filieres/", "/api/groupements/",
            "/api/groupements/carte/", "/api/productions/",
            "/api/productions/en-rupture/", "/api/suivi/kpis/",
            "/api/suivi/cadre-logique/", "/api/suivi/entonnoir/",
            "/api/suivi/repartition/", "/api/suivi/croisement/", "/api/activites/",
            "/api/activites/resume/", "/api/jalons/", "/api/formations/",
            "/api/sessions/", "/api/certifications/", "/api/financements/",
            "/api/financements/resume/", "/api/mouvements/", "/api/commandes/",
            "/api/actualites/", "/api/journal/", "/api/boutiques/",
            "/api/recherche/",
        ]:
            self.assertIn(route, schema, f"{route} absente du schéma OpenAPI.")


class TestCorsEtEnTetes(SocleApi):
    def test_les_deux_fronts_sont_autorises(self):
        for origine in ["http://localhost:3000", "http://localhost:3001"]:
            reponse = self.client.get("/api/filieres/", HTTP_ORIGIN=origine)
            self.assertEqual(
                reponse.headers.get("Access-Control-Allow-Origin"),
                origine,
                f"CORS refuse {origine}.",
            )

    def test_une_origine_etrangere_est_refusee(self):
        reponse = self.client.get(
            "/api/filieres/", HTTP_ORIGIN="http://exemple-malveillant.test"
        )
        self.assertIsNone(reponse.headers.get("Access-Control-Allow-Origin"))
