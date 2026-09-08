"""
Tests des courriels et de la réinitialisation de mot de passe.

Les envois passent par le backend en mémoire de Django : rien ne part
réellement, mais tout le montage du message est exercé — gabarit, version
texte, pièce jointe, en-têtes.
"""

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase, override_settings

from comptes import courriels
from core.models import EvenementJournal
from core.referentiels import RoleUtilisateur

Utilisateur = get_user_model()
MOT_DE_PASSE = "motdepasse-de-recette"


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class SocleCourriel(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.agente = Utilisateur.objects.create_user(
            username="k.sene",
            email="k.sene@yeumbeulnord.sn",
            password=MOT_DE_PASSE,
            first_name="Khady",
            last_name="Sène",
            telephone="77 123 45 67",
            role=RoleUtilisateur.AGENT,
        )

    def setUp(self):
        from django.core.cache import cache

        cache.clear()
        mail.outbox = []


class TestMontageDesCourriels(SocleCourriel):
    def test_courriel_de_reinitialisation(self):
        envoye = courriels.envoyer_mot_de_passe_oublie(
            self.agente, "http://localhost:3000/auth/reinitialiser?uid=x&jeton=y"
        )
        self.assertTrue(envoye)
        self.assertEqual(len(mail.outbox), 1)

        message = mail.outbox[0]
        self.assertEqual(message.to, ["k.sene@yeumbeulnord.sn"])
        self.assertEqual(message.subject, courriels.SUJETS["mot_de_passe_oublie"])
        self.assertIn("Khady", message.body)
        self.assertIn("uid=x", message.body)

    def test_les_deux_versions_sont_presentes(self):
        """Un client qui n'affiche pas le HTML doit tout de même lire le message."""
        courriels.envoyer_mot_de_passe_oublie(self.agente, "http://exemple/lien")
        message = mail.outbox[0]
        self.assertTrue(message.body.strip(), "La version texte est vide.")
        html = dict(
            (type_contenu, contenu)
            for contenu, type_contenu in message.alternatives
        )
        self.assertIn("text/html", html)
        self.assertIn("<!DOCTYPE html>", html["text/html"])

    def test_illustration_jointe_et_non_distante(self):
        """Un client qui bloque les images distantes doit voir la vignette."""
        courriels.envoyer_mot_de_passe_oublie(self.agente, "http://exemple/lien")
        message = mail.outbox[0]

        # « related » lie les pièces au corps HTML ; sans lui, la vignette
        # s'afficherait en pied de message comme un fichier joint ordinaire.
        self.assertEqual(message.mixed_subtype, "related")

        construit = message.message()
        parties = {
            partie.get("Content-ID"): partie.get("Content-Disposition")
            for partie in construit.walk()
            if partie.get("Content-ID")
        }
        self.assertIn("<reveil-enveloppe.png>", parties)
        self.assertIn("inline", parties["<reveil-enveloppe.png>"])

        html = message.alternatives[0][0]
        self.assertIn('src="cid:reveil-enveloppe.png"', html)
        self.assertNotIn("http://localhost:8000/static", html)

    def test_le_gabarit_porte_la_marque_du_projet(self):
        courriels.envoyer_mot_de_passe_oublie(self.agente, "http://exemple/lien")
        html = mail.outbox[0].alternatives[0][0]
        self.assertIn("Made in Yeumbeul", html)
        self.assertNotIn("Yessal", html)
        self.assertNotIn("Daara", html)

    def test_la_palette_est_celle_de_vireo(self):
        """Accent natif verdigris, et surtout pas le violet du projet d'origine."""
        courriels.envoyer_mot_de_passe_oublie(self.agente, "http://exemple/lien")
        html = mail.outbox[0].alternatives[0][0]
        self.assertIn("#1e856c", html.lower())
        self.assertNotIn("#4a3fd4", html.lower())
        self.assertNotIn("#ffcd3c", html.lower())

    def test_mot_de_passe_provisoire_ne_contient_aucun_mot_de_passe(self):
        """Il se transmet de vive voix : un courriel se conserve indéfiniment."""
        courriels.envoyer_mot_de_passe_provisoire(self.agente, "Aminata Diop")
        message = mail.outbox[0]
        html = message.alternatives[0][0]
        self.assertIn("de vive voix", html)
        self.assertNotIn(MOT_DE_PASSE, html)
        self.assertNotIn(MOT_DE_PASSE, message.body)

    def test_les_autres_courriels_se_montent(self):
        for envoi in (
            lambda: courriels.envoyer_compte_cree(self.agente),
            lambda: courriels.envoyer_acces_suspendu(self.agente, "Départ de la commune"),
            lambda: courriels.envoyer_mot_de_passe_modifie(self.agente),
        ):
            mail.outbox = []
            self.assertTrue(envoi())
            self.assertEqual(len(mail.outbox), 1)
            self.assertTrue(mail.outbox[0].alternatives[0][0].strip())

    def test_compte_sans_adresse_n_envoie_rien(self):
        sans_adresse = Utilisateur.objects.create_user(
            username="sans.mail", password=MOT_DE_PASSE
        )
        self.assertFalse(courriels.envoyer_compte_cree(sans_adresse))
        self.assertEqual(len(mail.outbox), 0)

    def test_un_echec_d_envoi_ne_leve_pas(self):
        """Un serveur SMTP indisponible ne doit pas faire tomber la requête."""
        import logging

        # La trace est attendue : on la fait taire pour ne pas polluer la sortie
        # des tests d'un pavé d'exception normal.
        with self.assertLogs("comptes.courriels", level=logging.ERROR):
            with override_settings(
                EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend",
                EMAIL_HOST="serveur.inexistant.invalid",
                EMAIL_PORT=1,
                EMAIL_TIMEOUT=1,
            ):
                self.assertFalse(
                    courriels.envoyer_mot_de_passe_oublie(self.agente, "http://exemple")
                )


class TestDemandeReinitialisation(SocleCourriel):
    def demander(self, identifiant):
        return self.client.post(
            "/api/auth/mot-de-passe/oubli/",
            {"identifiant": identifiant},
            content_type="application/json",
        )

    def test_envoi_pour_un_compte_connu(self):
        reponse = self.demander("k.sene")
        self.assertEqual(reponse.status_code, 204)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("/auth/create-password-cover?uid=", mail.outbox[0].body)

    def test_par_courriel_et_par_telephone(self):
        self.demander("k.sene@yeumbeulnord.sn")
        self.demander("77 123 45 67")
        self.assertEqual(len(mail.outbox), 2)

    def test_compte_inconnu_repond_pareil_et_n_envoie_rien(self):
        """Sans quoi la route deviendrait un annuaire de comptes existants."""
        connu = self.demander("k.sene")
        mail.outbox = []
        inconnu = self.demander("personne@nulle-part.test")

        self.assertEqual(connu.status_code, inconnu.status_code)
        self.assertEqual(connu.content, inconnu.content)
        self.assertEqual(len(mail.outbox), 0)

    def test_compte_desactive_ne_recoit_rien(self):
        self.agente.is_active = False
        self.agente.save(update_fields=["is_active"])
        self.assertEqual(self.demander("k.sene").status_code, 204)
        self.assertEqual(len(mail.outbox), 0)


class TestReinitialisation(SocleCourriel):
    def setUp(self):
        super().setUp()
        self.client.post(
            "/api/auth/mot-de-passe/oubli/",
            {"identifiant": "k.sene"},
            content_type="application/json",
        )
        corps = mail.outbox[0].body
        fragment = corps.split("uid=")[1].split("\n")[0]
        self.uid, self.jeton = fragment.split("&jeton=")
        mail.outbox = []

    def reinitialiser(self, **remplacements):
        donnees = {
            "uid": self.uid,
            "jeton": self.jeton,
            "nouveau_mot_de_passe": "nouveau-mot-de-passe-solide",
        } | remplacements
        return self.client.post(
            "/api/auth/mot-de-passe/reinitialiser/",
            donnees,
            content_type="application/json",
        )

    def test_reinitialisation_nominale(self):
        reponse = self.reinitialiser()
        self.assertEqual(reponse.status_code, 204, reponse.content[:300])
        self.agente.refresh_from_db()
        self.assertTrue(self.agente.check_password("nouveau-mot-de-passe-solide"))

    def test_le_jeton_ne_sert_qu_une_fois(self):
        self.assertEqual(self.reinitialiser().status_code, 204)
        seconde = self.reinitialiser(nouveau_mot_de_passe="encore-un-autre-solide")
        self.assertEqual(seconde.status_code, 400)

    def test_jeton_falsifie_refuse(self):
        self.assertEqual(self.reinitialiser(jeton="jeton-invente").status_code, 400)

    def test_uid_falsifie_refuse(self):
        self.assertEqual(self.reinitialiser(uid="AAAA").status_code, 400)

    def test_mot_de_passe_trop_court_refuse(self):
        reponse = self.reinitialiser(nouveau_mot_de_passe="court")
        self.assertEqual(reponse.status_code, 400)
        self.assertIn("nouveau_mot_de_passe", reponse.json())

    def test_mot_de_passe_trop_proche_du_compte_refuse(self):
        """La similarité ne se contrôle qu'une fois le compte connu."""
        reponse = self.reinitialiser(nouveau_mot_de_passe="k.sene@yeumbeulnord.sn")
        self.assertEqual(reponse.status_code, 400)

    def test_la_reinitialisation_avertit_et_journalise(self):
        avant = EvenementJournal.objects.count()
        self.reinitialiser()
        self.assertEqual(EvenementJournal.objects.count(), avant + 1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(
            mail.outbox[0].subject, courriels.SUJETS["mot_de_passe_modifie"]
        )

    def test_la_connexion_fonctionne_avec_le_nouveau_mot_de_passe(self):
        self.reinitialiser()
        reponse = self.client.post(
            "/api/auth/connexion/",
            {"identifiant": "k.sene", "mot_de_passe": "nouveau-mot-de-passe-solide"},
            content_type="application/json",
        )
        self.assertEqual(reponse.status_code, 200)


class TestChangementAvertitParCourriel(SocleCourriel):
    def test_le_changement_declenche_un_avertissement(self):
        self.client.post(
            "/api/auth/connexion/",
            {"identifiant": "k.sene", "mot_de_passe": MOT_DE_PASSE},
            content_type="application/json",
        )
        mail.outbox = []

        reponse = self.client.post(
            "/api/auth/mot-de-passe/",
            {
                "mot_de_passe_actuel": MOT_DE_PASSE,
                "nouveau_mot_de_passe": "nouveau-mot-de-passe-solide",
            },
            content_type="application/json",
        )
        self.assertEqual(reponse.status_code, 204)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(
            mail.outbox[0].subject, courriels.SUJETS["mot_de_passe_modifie"]
        )
