"""
Tests de l'authentification par session.

Ils couvrent le parcours attendu du front — jeton CSRF, connexion, profil,
déconnexion — et les garde-fous : pas de fuite d'information sur les comptes
existants, pas d'écriture sans jeton CSRF, pas de mot de passe dans les
réponses, limitation des tentatives.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase

from core.models import EvenementJournal
from core.referentiels import RoleUtilisateur

Utilisateur = get_user_model()

MOT_DE_PASSE = "motdepasse-de-recette"


class SocleAuth(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.agente = Utilisateur.objects.create_user(
            username="k.sene",
            email="k.sene@yeumbeulnord.sn",
            password=MOT_DE_PASSE,
            first_name="Khady",
            last_name="Sène",
            telephone="77 123 45 67",
            fonction="Chargée de suivi",
            role=RoleUtilisateur.AGENT,
        )
        cls.administratrice = Utilisateur.objects.create_user(
            username="a.diop",
            email="a.diop@yeumbeulnord.sn",
            password=MOT_DE_PASSE,
            first_name="Aminata",
            last_name="Diop",
            role=RoleUtilisateur.ADMINISTRATEUR,
        )

    def setUp(self):
        # Le compteur de tentatives vit dans le cache, que Django ne réinitialise
        # pas entre deux tests : sans ce vidage, le premier cas à épuiser le
        # quota fait échouer tous les suivants en 429.
        from django.core.cache import cache

        cache.clear()

    def connecter(self, identifiant, mot_de_passe=MOT_DE_PASSE):
        return self.client.post(
            "/api/auth/connexion/",
            {"identifiant": identifiant, "mot_de_passe": mot_de_passe},
            content_type="application/json",
        )


class TestJetonCsrf(SocleAuth):
    def test_le_jeton_est_rendu_dans_le_corps(self):
        """Le cookie est HttpOnly : le front ne peut pas le lire, on le lui
        rend donc dans la réponse."""
        reponse = self.client.get("/api/auth/csrf/")
        self.assertEqual(reponse.status_code, 200)
        self.assertIn("jeton_csrf", reponse.json())
        self.assertTrue(reponse.json()["jeton_csrf"])

    def test_le_cookie_est_pose_et_inaccessible_au_javascript(self):
        reponse = self.client.get("/api/auth/csrf/")
        cookie = reponse.cookies.get("csrftoken")
        self.assertIsNotNone(cookie, "Le cookie CSRF n'a pas été déposé.")
        self.assertTrue(cookie["httponly"])

    def test_accessible_sans_etre_connecte(self):
        """C'est la première requête du front : elle précède la connexion."""
        self.assertEqual(self.client.get("/api/auth/csrf/").status_code, 200)


class TestConnexion(SocleAuth):
    def test_connexion_par_identifiant(self):
        reponse = self.connecter("k.sene")
        self.assertEqual(reponse.status_code, 200, reponse.content[:300])
        profil = reponse.json()
        self.assertEqual(profil["username"], "k.sene")
        self.assertEqual(profil["nom_complet"], "Khady Sène")
        self.assertEqual(profil["initiales"], "KS")
        self.assertEqual(profil["role"], "agent")
        self.assertTrue(profil["peut_ecrire"])
        self.assertFalse(profil["est_administrateur"])

    def test_connexion_par_courriel(self):
        self.assertEqual(self.connecter("k.sene@yeumbeulnord.sn").status_code, 200)

    def test_connexion_par_telephone(self):
        """Un agent municipal retient plus sûrement son numéro que son identifiant."""
        self.assertEqual(self.connecter("77 123 45 67").status_code, 200)

    def test_identifiant_insensible_a_la_casse(self):
        self.assertEqual(self.connecter("K.SENE").status_code, 200)

    def test_mot_de_passe_errone_refuse(self):
        reponse = self.connecter("k.sene", "mauvais-mot-de-passe")
        self.assertEqual(reponse.status_code, 401)

    def test_le_message_ne_distingue_pas_les_deux_echecs(self):
        """Distinguer « identifiant inconnu » de « mot de passe erroné »
        renseignerait sur les comptes existants."""
        inconnu = self.connecter("personne", "peu-importe-vraiment")
        errone = self.connecter("k.sene", "mauvais-mot-de-passe")
        self.assertEqual(inconnu.status_code, errone.status_code)
        self.assertEqual(inconnu.json()["detail"], errone.json()["detail"])

    def test_aucun_secret_dans_la_reponse(self):
        profil = self.connecter("k.sene").json()
        for interdit in ("password", "mot_de_passe", "is_superuser"):
            self.assertNotIn(interdit, profil)

    def test_compte_desactive_refuse(self):
        self.agente.is_active = False
        self.agente.save(update_fields=["is_active"])
        self.assertEqual(self.connecter("k.sene").status_code, 401)

    def test_la_connexion_est_journalisee(self):
        avant = EvenementJournal.objects.count()
        self.connecter("k.sene")
        self.assertEqual(EvenementJournal.objects.count(), avant + 1)
        entree = EvenementJournal.objects.first()
        self.assertEqual(entree.acteur, "Khady Sène")
        self.assertEqual(entree.categorie, "systeme")


class TestProfilEtDeconnexion(SocleAuth):
    def test_profil_refuse_a_l_anonyme(self):
        self.assertIn(self.client.get("/api/auth/moi/").status_code, (401, 403))

    def test_profil_du_compte_connecte(self):
        self.connecter("k.sene")
        reponse = self.client.get("/api/auth/moi/")
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse.json()["username"], "k.sene")
        self.assertEqual(reponse.json()["fonction"], "Chargée de suivi")

    def test_deconnexion_ferme_la_session(self):
        self.connecter("k.sene")
        self.assertEqual(self.client.post("/api/auth/deconnexion/").status_code, 204)
        self.assertIn(self.client.get("/api/auth/moi/").status_code, (401, 403))

    def test_deconnexion_sans_session_n_est_pas_une_erreur(self):
        """Se déconnecter deux fois n'a pas à préoccuper le front."""
        self.assertEqual(self.client.post("/api/auth/deconnexion/").status_code, 204)


class TestChangementMotDePasse(SocleAuth):
    def setUp(self):
        # `super()` vide le compteur de tentatives : sans lui, ces cas
        # échoueraient en 429 dès qu'ils tourneraient après les tests de
        # limitation.
        super().setUp()
        self.connecter("k.sene")

    def _changer(self, actuel, nouveau):
        return self.client.post(
            "/api/auth/mot-de-passe/",
            {"mot_de_passe_actuel": actuel, "nouveau_mot_de_passe": nouveau},
            content_type="application/json",
        )

    def test_changement_nominal(self):
        reponse = self._changer(MOT_DE_PASSE, "nouveau-mot-de-passe-solide")
        self.assertEqual(reponse.status_code, 204, reponse.content[:300])
        self.agente.refresh_from_db()
        self.assertTrue(self.agente.check_password("nouveau-mot-de-passe-solide"))

    def test_la_session_survit_au_changement(self):
        """Sans réaccord de l'empreinte de session, l'agent se déconnecterait
        lui-même en changeant son mot de passe."""
        self._changer(MOT_DE_PASSE, "nouveau-mot-de-passe-solide")
        self.assertEqual(self.client.get("/api/auth/moi/").status_code, 200)

    def test_mot_de_passe_actuel_exige(self):
        """Un poste laissé ouvert ne doit pas suffire à confisquer le compte."""
        reponse = self._changer("pas-le-bon-du-tout", "nouveau-mot-de-passe-solide")
        self.assertEqual(reponse.status_code, 400)
        self.assertIn("mot_de_passe_actuel", reponse.json())

    def test_mot_de_passe_trop_court_refuse(self):
        reponse = self._changer(MOT_DE_PASSE, "court")
        self.assertEqual(reponse.status_code, 400)
        self.assertIn("nouveau_mot_de_passe", reponse.json())

    def test_mot_de_passe_identique_refuse(self):
        reponse = self._changer(MOT_DE_PASSE, MOT_DE_PASSE)
        self.assertEqual(reponse.status_code, 400)

    def test_refuse_a_l_anonyme(self):
        self.client.post("/api/auth/deconnexion/")
        reponse = self._changer(MOT_DE_PASSE, "nouveau-mot-de-passe-solide")
        self.assertIn(reponse.status_code, (401, 403))


class TestLimitationDesTentatives(SocleAuth):
    """La connexion est la seule porte de l'API qu'on cherche à forcer.

    Le test exerce la limite **réelle** — dix par minute, telle que configurée —
    plutôt qu'une valeur abaissée par `override_settings` : DRF fige
    `THROTTLE_RATES` en attribut de classe au moment de l'import, si bien qu'une
    surcharge de réglages n'y parviendrait pas et donnerait un test qui passe
    sans rien vérifier.
    """

    def test_les_tentatives_repetees_sont_bloquees(self):
        codes = [
            self.connecter("k.sene", "mauvais-mot-de-passe").status_code
            for _ in range(12)
        ]
        self.assertIn(429, codes, f"Aucun blocage après douze tentatives : {codes}")
        # Les premières passent bien : la limite ne doit pas gêner un agent qui
        # se trompe une fois de mot de passe.
        self.assertEqual(codes[0], 401)

    def test_une_connexion_valide_reste_possible_sous_le_quota(self):
        for _ in range(3):
            self.connecter("k.sene", "mauvais-mot-de-passe")
        self.assertEqual(self.connecter("k.sene").status_code, 200)


class TestProtectionCsrf(TestCase):
    """DRF applique le contrôle CSRF aux requêtes de session authentifiées.

    Le client de test l'assouplit par défaut ; `enforce_csrf_checks` rétablit le
    comportement réel du navigateur.
    """

    @classmethod
    def setUpTestData(cls):
        cls.compte = Utilisateur.objects.create_user(
            username="k.sene", password=MOT_DE_PASSE, role=RoleUtilisateur.AGENT
        )

    def test_ecriture_sans_jeton_csrf_refusee(self):
        from django.test import Client

        client = Client(enforce_csrf_checks=True)
        client.force_login(self.compte)
        reponse = client.post(
            "/api/commandes/", {"client_nom": "Essai"}, content_type="application/json"
        )
        self.assertEqual(
            reponse.status_code,
            403,
            "Une écriture sans jeton CSRF doit être refusée.",
        )

    def test_ecriture_avec_jeton_csrf_acceptee(self):
        from django.test import Client

        client = Client(enforce_csrf_checks=True)
        client.force_login(self.compte)
        jeton = client.get("/api/auth/csrf/").json()["jeton_csrf"]

        reponse = client.post(
            "/api/commandes/",
            {"client_nom": "Essai"},
            content_type="application/json",
            HTTP_X_CSRFTOKEN=jeton,
        )
        # 400 : le corps est incomplet, mais le contrôle CSRF est passé — c'est
        # exactement ce qu'on vérifie ici.
        self.assertEqual(reponse.status_code, 400, reponse.content[:200])
