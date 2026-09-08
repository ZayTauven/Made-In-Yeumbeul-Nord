"""
Tests du suivi-évaluation : indicateurs d'en-tête, cadre logique, agrégations,
plan d'action.

Les assertions portent surtout sur les **règles de cohérence** énoncées au
contrat : la valeur d'un KPI est le dernier point de sa série, le delta se
mesure depuis le point précédent, un taux d'atteinte se lit dans le sens de
l'indicateur, et l'entonnoir respecte l'ordre canonique des étapes.
"""

from core.referentiels import ETAPES

from .test_catalogue import SocleApi


class TestKpis(SocleApi):
    def test_cles_et_ordre_suivent_le_contrat_front(self):
        """Les écrans lisent ces clés dans cet ordre : en changer décale la grille."""
        for tableau, attendues in [
            ("", ["groupements", "membres", "part_femmes", "decaissements"]),
            ("?tableau=plan-action", ["terminees", "jalons", "echues", "cadre"]),
            (
                "?tableau=formations",
                ["membres_formes", "sessions", "certification", "presence"],
            ),
        ]:
            cles = [k["cle"] for k in self.json(f"/api/suivi/kpis/{tableau}")]
            self.assertEqual(cles, attendues, f"tableau « {tableau or 'général'} »")

    def test_les_cartes_adossees_au_cadre_logique_le_suivent(self):
        """Une carte d'indicateur doit rendre exactement ce que rend sa fiche.

        C'est la garantie qui justifie de les construire depuis le cadre logique
        plutôt que de recalculer une série à part.
        """
        cadre = {i["code"]: i for i in self.json("/api/suivi/cadre-logique/")["indicateurs"]}
        cartes = {k["cle"]: k for k in self.json("/api/suivi/kpis/?tableau=formations")}

        for code, cle in [
            ("I2.1.1", "membres_formes"),
            ("I2.1.2", "certification"),
            ("I2.1.3", "presence"),
        ]:
            if code not in cadre:
                continue
            indicateur, carte = cadre[code], cartes[cle]
            self.assertEqual(carte["valeur"], indicateur["valeur_actuelle"], cle)
            self.assertEqual(carte["cible"], indicateur["valeur_cible"], cle)
            self.assertEqual(carte["tendance"], indicateur["tendance"], cle)
            self.assertEqual(carte["sens"], indicateur["sens"], cle)

    def test_forme_des_cartes(self):
        kpis = self.json("/api/suivi/kpis/")
        self.assertGreater(len(kpis), 0)
        for kpi in kpis:
            self.assertLessEqual(
                {"cle", "libelle", "valeur", "valeur_affichee", "unite", "delta",
                 "tendance", "etincelle"},
                set(kpi),
            )

    def test_valeur_est_le_dernier_point_de_la_serie(self):
        """Règle du contrat : sans cela, la carte contredit son propre sparkline."""
        for tableau in ["", "?tableau=plan-action", "?tableau=formations"]:
            for kpi in self.json(f"/api/suivi/kpis/{tableau}"):
                self.assertEqual(
                    kpi["valeur"],
                    kpi["etincelle"][-1],
                    f"{kpi['cle']} : la valeur affichée n'est pas le dernier point.",
                )

    def test_serie_a_huit_points(self):
        for kpi in self.json("/api/suivi/kpis/"):
            self.assertEqual(len(kpi["etincelle"]), 8)

    def test_tendance_est_coherente_avec_le_delta(self):
        for kpi in self.json("/api/suivi/kpis/"):
            attendu = (
                "hausse" if kpi["delta"] > 0
                else "baisse" if kpi["delta"] < 0
                else "stable"
            )
            self.assertEqual(kpi["tendance"], attendu, f"{kpi['cle']}")

    def test_kpi_a_faire_baisser_porte_son_sens(self):
        """« Activités en retard en baisse » doit se lire en vert, pas en rouge."""
        plan = self.json("/api/suivi/kpis/?tableau=plan-action")
        echues = next(k for k in plan if k["cle"] == "echues")
        self.assertEqual(echues.get("sens"), "decroissant")

    def test_montants_formates_en_fcfa(self):
        kpis = self.json("/api/suivi/kpis/")
        decaisse = next(k for k in kpis if k["cle"] == "decaissements")
        self.assertIn("FCFA", decaisse["valeur_affichee"])
        for interdit in ("€", "$", "EUR", "USD"):
            self.assertNotIn(interdit, decaisse["valeur_affichee"])

    def test_tableau_inconnu_rejete(self):
        self.json("/api/suivi/kpis/?tableau=inexistant", attendu=400)


class TestCadreLogique(SocleApi):
    def test_trois_listes_a_plat(self):
        cadre = self.json("/api/suivi/cadre-logique/")
        self.assertLessEqual({"axes", "resultats", "indicateurs"}, set(cadre))
        self.assertEqual(len(cadre["axes"]), 2)
        self.assertEqual(len(cadre["resultats"]), 4)
        self.assertEqual(len(cadre["indicateurs"]), 8)

    def test_indicateur_complet(self):
        indicateur = self.json("/api/suivi/cadre-logique/")["indicateurs"][0]
        self.assertLessEqual(
            {"id", "resultat_id", "axe_id", "code", "intitule", "unite",
             "valeur_reference", "valeur_actuelle", "valeur_cible", "sens",
             "taux_atteinte", "periodicite", "source_donnee",
             "date_derniere_collecte", "releves", "tendance", "ventile_par_genre"},
            set(indicateur),
        )
        self.assertLessEqual(
            {"periode", "valeur", "precedent"}, set(indicateur["releves"][0])
        )

    def test_taux_atteinte_lu_dans_le_sens_de_l_indicateur(self):
        """118 jours pour une cible de 90 valent 76 %, pas 131 %."""
        cadre = self.json("/api/suivi/cadre-logique/")
        decroissants = [i for i in cadre["indicateurs"] if i["sens"] == "decroissant"]
        self.assertTrue(decroissants, "Le jeu doit contenir un indicateur décroissant.")
        for indicateur in cadre["indicateurs"]:
            self.assertLessEqual(
                indicateur["taux_atteinte"], 100, f"{indicateur['code']} dépasse 100 %."
            )
            attendu = (
                round(indicateur["valeur_cible"] / indicateur["valeur_actuelle"] * 100)
                if indicateur["sens"] == "decroissant"
                else round(
                    indicateur["valeur_actuelle"] / indicateur["valeur_cible"] * 100
                )
            )
            self.assertEqual(indicateur["taux_atteinte"], min(100, attendu))

    def test_avancement_des_axes_agrege_leurs_resultats(self):
        cadre = self.json("/api/suivi/cadre-logique/")
        for axe in cadre["axes"]:
            resultats = [r for r in cadre["resultats"] if r["axe_id"] == axe["id"]]
            attendu = round(sum(r["avancement"] for r in resultats) / len(resultats))
            self.assertEqual(axe["avancement"], attendu)

    def test_acces_par_code_pointe(self):
        """Le code « I1.1.1 » contient des points : le routeur ne doit pas le couper."""
        indicateur = self.json("/api/suivi/cadre-logique/")["indicateurs"][0]
        detail = self.json(f"/api/suivi/indicateurs/{indicateur['code']}/")
        self.assertEqual(detail["code"], indicateur["code"])


class TestAgregations(SocleApi):
    def test_entonnoir_dans_l_ordre_canonique(self):
        entonnoir = self.json("/api/suivi/entonnoir/")
        self.assertEqual([e["etape"] for e in entonnoir], list(ETAPES))
        self.assertEqual(sum(e["effectif"] for e in entonnoir), 24)

    def test_entonnoir_porte_libelle_et_part(self):
        entonnoir = self.json("/api/suivi/entonnoir/")
        self.assertLessEqual(
            {"etape", "libelle", "effectif", "part"}, set(entonnoir[0])
        )

    def test_repartitions_totalisent_l_effectif(self):
        for axe, total in [("filiere", 24), ("quartier", 24)]:
            lignes = self.json(f"/api/suivi/repartition/?axe={axe}")
            self.assertEqual(sum(l["valeur"] for l in lignes), total)
            self.assertLessEqual({"libelle", "slug", "valeur", "part"}, set(lignes[0]))

    def test_repartition_par_filiere_porte_la_teinte(self):
        lignes = self.json("/api/suivi/repartition/?axe=filiere")
        self.assertTrue(all("teinte" in ligne for ligne in lignes))

    def test_repartition_par_genre(self):
        lignes = self.json("/api/suivi/repartition/?axe=genre")
        self.assertEqual({l["slug"] for l in lignes}, {"femme", "homme"})

    def test_axe_inconnu_rejete(self):
        self.json("/api/suivi/repartition/?axe=couleur-preferee", attendu=400)

    def test_croisement_indexe_par_nom_de_colonne(self):
        croisement = self.json("/api/suivi/croisement/?lignes=quartier&colonnes=filiere")
        self.assertLessEqual({"colonnes", "lignes"}, set(croisement))
        ligne = croisement["lignes"][0]
        self.assertIn("quartier", ligne)
        self.assertIsInstance(
            ligne["valeurs"],
            dict,
            "L'écran lit valeurs[nomDeLaFiliere] : une liste l'obligerait à "
            "retrouver un indice.",
        )
        self.assertEqual(sum(ligne["valeurs"].values()), ligne["total"])
        self.assertEqual(
            sum(l["total"] for l in croisement["lignes"]),
            24,
            "Le tableau croisé doit couvrir tout l'effectif.",
        )


class TestPlanAction(SocleApi):
    def test_activite_porte_son_statut_calcule(self):
        activites = self.json("/api/activites/")
        self.assertEqual(len(activites), 12)
        self.assertLessEqual(
            {"id", "code", "intitule", "axe_id", "responsable",
             "responsable_initiales", "quartiers", "filieres", "date_debut",
             "date_fin", "date_achevement", "avancement", "statut",
             "budget_prevu_fcfa", "budget_consomme_fcfa",
             "groupements_beneficiaires"},
            set(activites[0]),
        )

    def test_statut_annote_egale_le_repli_python(self):
        """Les deux implémentations doivent rester rigoureusement d'accord."""
        from core.models import Activite

        servis = {a["code"]: a["statut"] for a in self.json("/api/activites/")}
        for activite in Activite.objects.all():
            self.assertEqual(
                servis[activite.code],
                activite.statut_calcule(),
                f"{activite.code} : le SQL et le repli Python divergent.",
            )

    def test_activite_suspendue_est_reconnue(self):
        statuts = {a["statut"] for a in self.json("/api/activites/")}
        self.assertIn("suspendue", statuts)

    def test_filtre_par_statut(self):
        toutes = self.json("/api/activites/")
        for statut in {a["statut"] for a in toutes}:
            filtrees = self.json(f"/api/activites/?statut={statut}")
            self.assertTrue(all(a["statut"] == statut for a in filtrees))

    def test_acces_par_code(self):
        code = self.json("/api/activites/")[0]["code"]
        self.assertEqual(self.json(f"/api/activites/{code}/")["code"], code)

    def test_resume_du_plan_action(self):
        resume = self.json("/api/activites/resume/")
        self.assertLessEqual(
            {"total", "par_statut", "charge_par_responsable", "budget_engage_fcfa",
             "budget_consomme_fcfa", "part_consommee", "avancement_moyen",
             "terminees", "ouvertes"},
            set(resume),
        )
        self.assertEqual(resume["total"], 12)
        self.assertEqual(
            resume["ouvertes"],
            resume["total"] - resume["terminees"],
            "« ouvertes » vaut « total − terminees », par définition.",
        )
        self.assertEqual(sum(s["effectif"] for s in resume["par_statut"]), 12)
        self.assertEqual(
            sum(c["activites"] for c in resume["charge_par_responsable"]), 12
        )

    def test_jalons_et_filtre_decisif(self):
        jalons = self.json("/api/jalons/")
        self.assertLessEqual(
            {"id", "activite_id", "intitule", "date_prevue", "date_reelle",
             "statut", "decisif"},
            set(jalons[0]),
        )
        decisifs = self.json("/api/jalons/?decisif=1")
        self.assertTrue(all(j["decisif"] for j in decisifs))
        self.assertLess(len(decisifs), len(jalons))

    def test_statut_du_jalon_derive_des_dates(self):
        for jalon in self.json("/api/jalons/"):
            if jalon["date_reelle"]:
                self.assertEqual(jalon["statut"], "atteint")
            else:
                self.assertIn(jalon["statut"], {"a_venir", "manque"})


class TestRecherche(SocleApi):
    def test_un_seul_appel_tous_types_confondus(self):
        resultats = self.json("/api/recherche/?q=gie&limite=6")
        self.assertLessEqual(len(resultats), 6)
        self.assertLessEqual(
            {"type", "titre", "sousTitre", "lien", "icone"}, set(resultats[0])
        )

    def test_recherche_sans_accent(self):
        self.assertTrue(self.json("/api/recherche/?q=liggeey"))

    def test_requete_vide_ne_renvoie_rien(self):
        self.assertEqual(self.json("/api/recherche/?q="), [])

    def test_plusieurs_types_atteignables(self):
        types = {r["type"] for r in self.json("/api/recherche/?q=a&limite=30")}
        self.assertGreater(len(types), 1, f"Un seul type trouvé : {types}")
