"""
Tests du catalogue : référentiels, groupements, productions.

Ces tests vérifient le **contrat**, pas l'implémentation : chaque assertion
correspond à une ligne de `PLAN & PRODUCT/15-CONTRAT-API.md` ou à un champ de
`frontend-admin/src/domaine/types.ts`. Un champ renommé ici casse un écran
là-bas, et c'est précisément ce qu'on veut voir échouer.
"""

from django.test import TestCase

from .fabrique import peupler


class SocleApi(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.donnees = peupler()

    def json(self, chemin, attendu=200):
        reponse = self.client.get(chemin)
        self.assertEqual(
            reponse.status_code,
            attendu,
            f"{chemin} a répondu {reponse.status_code} : "
            f"{reponse.content[:300].decode('utf-8', 'replace')}",
        )
        if reponse["Content-Type"].startswith("application/json"):
            return reponse.json()
        return None


class TestReferentiels(SocleApi):
    def test_quartiers_portent_leur_compteur(self):
        quartiers = self.json("/api/quartiers/")
        self.assertEqual(len(quartiers), 4)
        self.assertIn("nombre_groupements", quartiers[0])
        self.assertEqual(
            sum(q["nombre_groupements"] for q in quartiers),
            24,
            "Le total des groupements par quartier doit couvrir tout l'effectif.",
        )

    def test_filieres_portent_teinte_et_compteurs(self):
        filieres = self.json("/api/filieres/")
        self.assertLessEqual(
            {"teinte", "nombre_groupements", "nombre_productions"},
            set(filieres[0]),
        )
        self.assertTrue(
            filieres[0]["teinte"].startswith("var(--ax-"),
            "La teinte est un token de rôle, jamais une couleur en dur.",
        )


class TestGroupements(SocleApi):
    def test_enveloppe_de_pagination(self):
        page = self.json("/api/groupements/")
        self.assertLessEqual({"count", "next", "previous", "results"}, set(page))
        self.assertEqual(page["count"], 24)
        self.assertEqual(len(page["results"]), 12, "PAGE_SIZE vaut 12.")

    def test_page_size_personnalise(self):
        page = self.json("/api/groupements/?page_size=3")
        self.assertEqual(len(page["results"]), 3)

    def test_fiche_complete_du_contrat(self):
        fiche = self.json("/api/groupements/")["results"][0]
        attendus = {
            "id", "nom", "slug", "description", "quartier", "latitude", "longitude",
            "filiere", "filieres_secondaires", "statut_juridique", "ninea", "etape",
            "progression", "nombre_membres", "part_femmes", "nombre_productions",
            "chiffre_affaires_fcfa", "financement_recu_fcfa", "telephone", "email",
            "responsable", "date_creation", "date_formalisation", "note_moyenne",
            "nombre_appreciations", "photo", "photo_cle", "etat_validation",
        }
        self.assertLessEqual(attendus, set(fiche), f"Manque : {attendus - set(fiche)}")

    def test_quartier_et_filiere_sont_des_objets(self):
        fiche = self.json("/api/groupements/")["results"][0]
        self.assertIsInstance(fiche["quartier"], dict)
        self.assertIsInstance(fiche["filiere"], dict)
        self.assertIsInstance(fiche["filieres_secondaires"], list)

    def test_champs_derives_sont_coherents(self):
        fiche = self.json("/api/groupements/")["results"][0]
        self.assertGreater(fiche["nombre_membres"], 0)
        self.assertTrue(0 <= fiche["part_femmes"] <= 100)
        self.assertTrue(0 <= fiche["progression"] <= 100)
        self.assertTrue(fiche["responsable"], "La présidente doit être nommée.")

    def test_progression_suit_le_bareme_des_etapes(self):
        from core.referentiels import PROGRESSION_ETAPE

        for fiche in self.json("/api/groupements/?page_size=24")["results"]:
            self.assertEqual(
                fiche["progression"],
                PROGRESSION_ETAPE[fiche["etape"]],
                f"{fiche['nom']} : progression et étape divergent.",
            )

    def test_sous_ressources(self):
        slug = self.json("/api/groupements/")["results"][0]["slug"]
        membres = self.json(f"/api/groupements/{slug}/membres/")
        self.assertLessEqual(
            {"nom_complet", "initiales", "age", "avatar_teinte",
             "nombre_formations_suivies", "nombre_certifications"},
            set(membres[0]),
        )
        self.json(f"/api/groupements/{slug}/productions/")
        self.json(f"/api/groupements/{slug}/financements/")

    def test_carte_est_une_charge_allegee(self):
        points = self.json("/api/groupements/carte/")
        self.assertEqual(len(points), 24)
        point = points[0]
        self.assertLessEqual(
            {"id", "nom", "slug", "latitude", "longitude", "quartier", "filiere",
             "filiere_teinte", "etape", "nombre_membres"},
            set(point),
        )
        for champ in ("description", "photo", "chiffre_affaires_fcfa"):
            self.assertNotIn(
                champ, point, f"« {champ} » alourdit inutilement les marqueurs."
            )

    def test_filtres_du_contrat(self):
        filiere = self.json("/api/filieres/")[0]["slug"]
        quartier = self.json("/api/quartiers/")[0]["slug"]
        self.assertGreater(self.json(f"/api/groupements/?filiere={filiere}")["count"], 0)
        self.assertGreater(self.json(f"/api/groupements/?quartier={quartier}")["count"], 0)
        self.assertGreater(self.json("/api/groupements/?etape=identifie")["count"], 0)
        self.json("/api/groupements/?statut_juridique=informel")

    def test_tris_du_contrat(self):
        for tri in ["nom", "-nombre_membres", "progression",
                    "-chiffre_affaires_fcfa", "note_moyenne"]:
            page = self.json(f"/api/groupements/?ordering={tri}")
            self.assertEqual(page["count"], 24, f"Le tri « {tri} » a perdu des lignes.")

    def test_tri_par_nombre_de_membres_est_effectif(self):
        page = self.json("/api/groupements/?ordering=-nombre_membres&page_size=24")
        effectifs = [g["nombre_membres"] for g in page["results"]]
        self.assertEqual(effectifs, sorted(effectifs, reverse=True))

    def test_recherche_insensible_aux_accents(self):
        sans = self.json("/api/groupements/?search=liggeey")
        avec = self.json("/api/groupements/?search=Liggéey")
        self.assertGreater(sans["count"], 0, "« liggeey » sans accent ne trouve rien.")
        self.assertEqual(sans["count"], avec["count"])

    def test_recherche_sur_le_quartier_accentue(self):
        page = self.json("/api/groupements/?search=ainoumady")
        self.assertGreater(page["count"], 0, "« Aïnoumady » doit se trouver sans tréma.")


class TestProductions(SocleApi):
    def test_fiche_porte_les_slugs_de_liaison(self):
        production = self.json("/api/productions/")["results"][0]
        attendus = {
            "id", "groupement_id", "groupement_nom", "groupement_slug", "filiere_id",
            "filiere_nom", "filiere_slug", "nom", "slug", "prix_unitaire_fcfa",
            "prix_barre_fcfa", "unite", "stock_disponible", "seuil_alerte",
            "disponible", "photo", "photo_cle", "photos_additionnelles",
            "note_moyenne", "nombre_appreciations", "date_ajout", "etiquettes",
            "etat_validation",
        }
        self.assertLessEqual(attendus, set(production))

    def test_prix_sont_des_entiers(self):
        """DRF sérialiserait un `DecimalField` en chaîne, ce qui casserait le front."""
        production = self.json("/api/productions/")["results"][0]
        self.assertIsInstance(production["prix_unitaire_fcfa"], int)
        if production["prix_barre_fcfa"] is not None:
            self.assertIsInstance(production["prix_barre_fcfa"], int)

    def test_disponibilite_derivee_du_stock(self):
        for production in self.json("/api/productions/?page_size=50")["results"]:
            self.assertEqual(
                production["disponible"], production["stock_disponible"] > 0
            )

    def test_filtre_disponible(self):
        dispos = self.json("/api/productions/?disponible=true&page_size=100")
        self.assertTrue(all(p["stock_disponible"] > 0 for p in dispos["results"]))
        ruptures = self.json("/api/productions/?disponible=false&page_size=100")
        self.assertTrue(all(p["stock_disponible"] == 0 for p in ruptures["results"]))

    def test_filtre_par_fourchette_de_prix(self):
        page = self.json("/api/productions/?prix_min=1000&prix_max=3000&page_size=100")
        self.assertTrue(
            all(1000 <= p["prix_unitaire_fcfa"] <= 3000 for p in page["results"])
        )

    def test_filtre_quartier_porte_sur_le_producteur(self):
        quartier = self.json("/api/quartiers/")[0]
        page = self.json(f"/api/productions/?quartier={quartier['slug']}&page_size=100")
        self.assertGreater(page["count"], 0)

    def test_similaires_excluent_la_fiche_courante(self):
        production = self.json("/api/productions/")["results"][0]
        similaires = self.json(f"/api/productions/{production['slug']}/similaires/?limite=3")
        self.assertLessEqual(len(similaires), 3)
        self.assertNotIn(production["id"], [p["id"] for p in similaires])
        self.assertTrue(
            all(p["filiere_id"] == production["filiere_id"] for p in similaires)
        )

    def test_alertes_de_stock(self):
        alertes = self.json("/api/productions/en-rupture/")
        self.assertTrue(
            all(p["stock_disponible"] <= p["seuil_alerte"] for p in alertes)
        )
