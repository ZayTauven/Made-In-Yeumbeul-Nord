"""Tests des formations, du financement et de la trésorerie."""

from core.models import Certification, Participation

from .test_catalogue import SocleApi


class TestFormations(SocleApi):
    def test_formation_porte_ses_trois_agregats(self):
        formations = self.json("/api/formations/")
        self.assertEqual(len(formations), 5)
        self.assertLessEqual(
            {"id", "nom", "slug", "type_module", "filiere_nom", "duree_heures",
             "cout_par_participant_fcfa", "nombre_sessions", "nombre_participants",
             "taux_certification"},
            set(formations[0]),
        )

    def test_nombre_de_sessions_est_juste(self):
        for formation in self.json("/api/formations/"):
            self.assertEqual(formation["nombre_sessions"], 2)

    def test_taux_de_certification_sur_les_participations_reelles(self):
        """L'écran affiche le taux et la liste des certifiés côte à côte."""
        for formation in self.json("/api/formations/"):
            presences = Participation.objects.filter(
                present=True, session__formation__slug=formation["slug"]
            ).count()
            certifies = Certification.objects.filter(
                formation__slug=formation["slug"]
            ).count()
            attendu = round(certifies / presences * 100) if presences else 0
            self.assertEqual(
                formation["taux_certification"],
                attendu,
                f"{formation['nom']} : taux calculé hors des présences réelles.",
            )

    def test_session_porte_effectif_present_et_taux(self):
        sessions = self.json("/api/sessions/")
        self.assertLessEqual(
            {"id", "formation_id", "formation_nom", "date_debut", "date_fin", "lieu",
             "quartier", "formateur", "effectif_cible", "effectif_present",
             "taux_presence", "statut"},
            set(sessions[0]),
        )

    def test_effectif_present_compte_les_presences(self):
        for session in self.json("/api/sessions/"):
            attendu = Participation.objects.filter(
                session_id=session["id"], present=True
            ).count()
            self.assertEqual(session["effectif_present"], attendu)
            self.assertEqual(
                session["taux_presence"],
                round(attendu / session["effectif_cible"] * 100),
            )

    def test_filtre_sur_le_statut_de_session(self):
        toutes = self.json("/api/sessions/")
        for statut in {s["statut"] for s in toutes}:
            filtrees = self.json(f"/api/sessions/?statut={statut}")
            self.assertTrue(all(s["statut"] == statut for s in filtrees))
            self.assertGreater(len(filtrees), 0)

    def _connecter_agent(self):
        """Le pointage des présences est un acte d'agent, pas de visiteur."""
        from django.contrib.auth.models import User

        User.objects.create_user("agente", "agente@yeumbeulnord.sn", "motdepasse")
        self.client.login(username="agente", password="motdepasse")

    def test_pointage_refuse_a_l_anonyme(self):
        from core.models import Membre, SessionFormation

        session = SessionFormation.objects.first()
        membre = Membre.objects.first()
        reponse = self.client.post(
            f"/api/sessions/{session.pk}/marquer_presence/",
            {"membre_id": membre.pk, "present": True},
            content_type="application/json",
        )
        self.assertIn(reponse.status_code, (401, 403))

    def test_marquer_presence_cree_puis_met_a_jour(self):
        from core.models import Membre, SessionFormation

        self._connecter_agent()
        session = SessionFormation.objects.first()
        membre = Membre.objects.exclude(
            participations__session=session
        ).first()

        reponse = self.client.post(
            f"/api/sessions/{session.pk}/marquer_presence/",
            {"membre_id": membre.pk, "present": True},
            content_type="application/json",
        )
        self.assertEqual(reponse.status_code, 200, reponse.content[:300])
        self.assertTrue(reponse.json()["present"])

        # Un second appel corrige au lieu de créer un doublon : la contrainte
        # d'unicité (session, membre) l'exige.
        rectification = self.client.post(
            f"/api/sessions/{session.pk}/marquer_presence/",
            {"membre_id": membre.pk, "present": False},
            content_type="application/json",
        )
        self.assertEqual(rectification.status_code, 200)
        self.assertFalse(rectification.json()["present"])
        self.assertEqual(
            Participation.objects.filter(session=session, membre=membre).count(), 1
        )

    def test_membre_inconnu_refuse(self):
        from core.models import SessionFormation

        self._connecter_agent()
        session = SessionFormation.objects.first()
        reponse = self.client.post(
            f"/api/sessions/{session.pk}/marquer_presence/",
            {"membre_id": 999999, "present": True},
            content_type="application/json",
        )
        self.assertEqual(reponse.status_code, 400)

    def test_certifications(self):
        certifications = self.json("/api/certifications/")
        self.assertLessEqual(
            {"id", "membre_id", "membre_nom", "groupement_nom", "formation_nom",
             "date_certification", "score", "numero_certificat"},
            set(certifications[0]),
        )

    def test_resume_des_formations(self):
        resume = self.json("/api/formations/resume/")
        self.assertLessEqual(
            {"total_formations", "total_sessions", "total_participants",
             "total_certifies", "taux_certification", "taux_presence_moyen"},
            set(resume),
        )
        self.assertEqual(resume["total_formations"], 5)
        self.assertEqual(resume["total_sessions"], 10)


class TestFinancement(SocleApi):
    def test_liste_des_financements(self):
        financements = self.json("/api/financements/")
        self.assertLessEqual(
            {"id", "reference", "groupement_id", "groupement_nom", "type_financement",
             "montant_fcfa", "montant_rembourse_fcfa", "bailleur",
             "date_decaissement", "date_prevue_remboursement", "statut", "objet"},
            set(financements[0]),
        )
        self.assertIsInstance(financements[0]["montant_fcfa"], int)

    def test_filtres_statut_et_type(self):
        financements = self.json("/api/financements/")
        statut = financements[0]["statut"]
        filtres = self.json(f"/api/financements/?statut={statut}")
        self.assertTrue(all(f["statut"] == statut for f in filtres))

        type_fin = financements[0]["type_financement"]
        par_type = self.json(f"/api/financements/?type={type_fin}")
        self.assertTrue(all(f["type_financement"] == type_fin for f in par_type))

    def test_resume_financier(self):
        resume = self.json("/api/financements/resume/")
        self.assertLessEqual(
            {"total_decaisse_fcfa", "total_rembourse_fcfa", "taux_remboursement",
             "groupements_finances", "encours_fcfa", "defaillants", "par_type",
             "flux_mensuel"},
            set(resume),
        )

    def test_taux_de_remboursement_sur_les_seuls_remboursables(self):
        """Le rapporter aux subventions donnerait un taux structurellement faux."""
        from django.db.models import Sum

        from core.models import Financement
        from core.referentiels import TYPES_REMBOURSABLES

        remboursables = Financement.objects.filter(
            type_financement__in=TYPES_REMBOURSABLES
        )
        du = remboursables.aggregate(v=Sum("montant_fcfa"))["v"] or 0
        rendu = remboursables.aggregate(v=Sum("montant_rembourse_fcfa"))["v"] or 0
        attendu = round(rendu / du * 100) if du else 0

        resume = self.json("/api/financements/resume/")
        self.assertEqual(resume["taux_remboursement"], attendu)
        self.assertTrue(0 <= resume["taux_remboursement"] <= 100)

    def test_repartition_par_type_totalise_cent_pour_cent(self):
        resume = self.json("/api/financements/resume/")
        self.assertEqual(
            sum(t["valeur"] for t in resume["par_type"]),
            resume["total_decaisse_fcfa"],
        )

    def test_flux_mensuel_compare_a_l_exercice_precedent(self):
        flux = self.json("/api/financements/resume/")["flux_mensuel"]
        self.assertEqual(len(flux), 8)
        self.assertLessEqual({"periode", "valeur", "precedent"}, set(flux[0]))


class TestMouvements(SocleApi):
    def test_journal_de_caisse(self):
        mouvements = self.json("/api/mouvements/")
        self.assertLessEqual(
            {"id", "reference", "libelle", "contrepartie", "categorie",
             "montant_fcfa", "date", "moyen", "statut"},
            set(mouvements[0]),
        )

    def test_montants_signes(self):
        mouvements = self.json("/api/mouvements/")
        self.assertTrue(
            any(m["montant_fcfa"] < 0 for m in mouvements),
            "Une sortie de caisse se note en négatif.",
        )

    def test_moyens_de_paiement_locaux_seulement(self):
        """Wave, Orange Money, Free Money, espèces, virement. Rien d'autre."""
        autorises = {"wave", "orange_money", "free_money", "especes", "virement"}
        moyens = {m["moyen"] for m in self.json("/api/mouvements/")}
        self.assertTrue(moyens <= autorises, f"Moyen non autorisé : {moyens - autorises}")

    def test_limite(self):
        self.assertEqual(len(self.json("/api/mouvements/?limite=5")), 5)
