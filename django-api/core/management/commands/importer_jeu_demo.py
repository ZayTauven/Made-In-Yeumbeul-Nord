"""
Importe le jeu de démonstration dans la base.

    python manage.py importer_jeu_demo --vider

Le jeu vient de `core/fixtures/jeu-demo.json`, exporté du générateur à graine
fixe des fronts (`python tools/exporter_jeu_demo.py`). Ce n'est pas une
approximation : `PLAN & PRODUCT/15-CONTRAT-API.md` §12 désigne ce générateur
comme **la spécification des fixtures**, parce que c'est lui qui a servi à
dessiner les écrans. Le réécrire en Python aurait produit deux jeux qui
divergent — et la divergence se serait vue à l'écran.

Cent groupements, 1 785 membres, 301 productions, 20 indicateurs du cadre
logique, 18 activités, 12 formations, 66 financements, 180 commandes. Toponymie
réelle de Yeumbeul Nord, anthroponymie sénégalaise, montants en FCFA.

Ce qui se déduit n'est pas importé : effectif d'un groupement, part de femmes,
progression, statut d'activité, montant d'une commande. Ces valeurs figurent
dans le JSON — les écrans les consomment — mais la base les recalcule. Les
stocker créerait deux vérités.
"""

from datetime import date, datetime, timedelta
from pathlib import Path
import json

from django.core.management.base import BaseCommand
from django.db import transaction

from core.models import (
    Activite,
    Actualite,
    AxeStrategique,
    Boutique,
    Certification,
    Commande,
    Commune,
    EvenementJournal,
    Filiere,
    Financement,
    Formation,
    Groupement,
    Indicateur,
    Jalon,
    LigneCommande,
    Membre,
    MouvementFinancier,
    Participation,
    Production,
    Quartier,
    ReleveIndicateur,
    ResultatAttendu,
    SessionFormation,
)

CHEMIN_JEU = Path(__file__).resolve().parents[3] / "core" / "fixtures" / "jeu-demo.json"

#: Date de référence du générateur. Les âges s'y rapportent, pour que la date de
#: naissance calculée ne bouge pas d'un import à l'autre.
DATE_REFERENCE = date(2026, 10, 31)


def _date(valeur):
    return date.fromisoformat(valeur) if valeur else None


def _horodatage(valeur):
    """Convertit un horodatage ISO du générateur en datetime conscient du fuseau."""
    from django.utils import timezone

    if not valeur:
        return None
    brut = datetime.fromisoformat(valeur.replace("Z", "+00:00"))
    return brut if timezone.is_aware(brut) else timezone.make_aware(brut)


class Command(BaseCommand):
    help = "Importe le jeu de démonstration depuis core/fixtures/jeu-demo.json."

    def add_arguments(self, parser):
        parser.add_argument(
            "--vider",
            action="store_true",
            help="Supprime les données métier existantes avant l'import.",
        )
        parser.add_argument(
            "--fichier",
            default=str(CHEMIN_JEU),
            help="Chemin du JSON à importer.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        chemin = Path(options["fichier"])
        if not chemin.is_file():
            self.stderr.write(
                self.style.ERROR(
                    f"Jeu introuvable : {chemin}\n"
                    "Le régénérer avec « python tools/exporter_jeu_demo.py »."
                )
            )
            return

        if Commune.objects.exists() and not options["vider"]:
            self.stderr.write(
                self.style.ERROR(
                    "La base contient déjà des données. Relancer avec --vider."
                )
            )
            return

        jeu = json.loads(chemin.read_text(encoding="utf-8"))

        if options["vider"]:
            self._vider()

        commune = Commune.objects.create(
            slug="yeumbeul-nord",
            description=(
                "Commune de Yeumbeul Nord, département de Pikine, région de Dakar. "
                "Porteuse du projet « And Jappo Meunal Souniou Bopp »."
            ),
            email="contact@yeumbeulnord.sn",
            telephone="+221 33 000 00 00",
            adresse="Hôtel de ville, Yeumbeul Nord",
        )

        quartiers = self._quartiers(jeu, commune)
        filieres = self._filieres(jeu)
        groupements = self._groupements(jeu, commune, quartiers, filieres)
        self._membres(jeu, groupements)
        productions = self._productions(jeu, groupements, filieres)
        self._cadre_logique(jeu)
        self._plan_action(jeu, quartiers, filieres)
        self._formations(jeu, quartiers)
        self._finances(jeu, groupements)
        self._commerce(jeu, quartiers, productions)
        self._contenus(jeu, quartiers)

        self.stdout.write(self.style.SUCCESS("Jeu de démonstration en place :"))
        for libelle, modele in [
            ("quartiers", Quartier), ("filières", Filiere), ("groupements", Groupement),
            ("membres", Membre), ("productions", Production), ("indicateurs", Indicateur),
            ("activités", Activite), ("jalons", Jalon), ("formations", Formation),
            ("sessions", SessionFormation), ("certifications", Certification),
            ("financements", Financement), ("commandes", Commande),
            ("actualités", Actualite), ("boutiques", Boutique),
        ]:
            self.stdout.write(f"  {modele.objects.count():>5}  {libelle}")

    # ------------------------------------------------------------------ #
    # Territoire et groupements
    # ------------------------------------------------------------------ #

    def _quartiers(self, jeu, commune) -> dict:
        objets = Quartier.objects.bulk_create(
            Quartier(
                commune=commune,
                nom=q["nom"],
                slug=q["slug"],
                latitude=q["latitude"],
                longitude=q["longitude"],
                population_estimee=q["population_estimee"],
            )
            for q in jeu["quartiers"]
        )
        return {q["id"]: objet for q, objet in zip(jeu["quartiers"], objets)}

    def _filieres(self, jeu) -> dict:
        objets = Filiere.objects.bulk_create(
            Filiere(
                nom=f["nom"],
                slug=f["slug"],
                description=f["description"],
                icone=f["icone"],
                teinte=f["teinte"],
            )
            for f in jeu["filieres"]
        )
        return {f["id"]: objet for f, objet in zip(jeu["filieres"], objets)}

    def _groupements(self, jeu, commune, quartiers, filieres) -> dict:
        objets = Groupement.objects.bulk_create(
            Groupement(
                commune=commune,
                nom=g["nom"],
                slug=g["slug"],
                description=g["description"],
                quartier=quartiers[g["quartier"]["id"]],
                latitude=g["latitude"],
                longitude=g["longitude"],
                filiere=filieres[g["filiere"]["id"]],
                statut_juridique=g["statut_juridique"],
                ninea=g["ninea"],
                etape=g["etape"],
                chiffre_affaires_fcfa=g["chiffre_affaires_fcfa"],
                telephone=g["telephone"],
                email=g["email"],
                date_creation=_date(g["date_creation"]),
                date_formalisation=_date(g["date_formalisation"]),
                note_moyenne=g["note_moyenne"],
                nombre_appreciations=g["nombre_appreciations"],
                photo=g["photo"],
                photo_cle=g["photo_cle"],
                etat_validation=g["etat_validation"],
            )
            for g in jeu["groupements"]
        )
        par_id = {g["id"]: objet for g, objet in zip(jeu["groupements"], objets)}

        par_nom = {f.nom: f for f in filieres.values()}
        for source, objet in zip(jeu["groupements"], objets):
            secondaires = [
                par_nom[nom] for nom in source["filieres_secondaires"] if nom in par_nom
            ]
            if secondaires:
                objet.filieres_secondaires.set(secondaires)
        return par_id

    def _membres(self, jeu, groupements) -> None:
        """Crée les membres et désigne la responsable de chaque groupement.

        Le JSON porte l'âge ; le modèle stocke une date de naissance, qui reste
        vraie quand les mois passent. On la calcule depuis la date de référence
        du générateur pour que deux imports donnent le même résultat.
        """
        responsables = {
            g["id"]: g["responsable"] for g in jeu["groupements"] if g.get("responsable")
        }
        a_creer = []
        for m in jeu["membres"]:
            nom_complet = f"{m['prenom']} {m['nom_famille']}".strip()
            a_creer.append(
                Membre(
                    groupement=groupements[m["groupement_id"]],
                    prenom=m["prenom"],
                    nom_famille=m["nom_famille"],
                    nom_complet_cache=nom_complet,
                    genre=m["genre"],
                    date_naissance=DATE_REFERENCE - timedelta(days=int(m["age"]) * 365),
                    telephone=m["telephone"],
                    role=m["role"],
                    est_responsable=responsables.get(m["groupement_id"]) == nom_complet,
                    avatar_teinte=m["avatar_teinte"],
                    date_adhesion=_date(m["date_adhesion"]),
                )
            )
        Membre.objects.bulk_create(a_creer, batch_size=500)

    def _productions(self, jeu, groupements, filieres) -> dict:
        objets = Production.objects.bulk_create(
            (
                Production(
                    groupement=groupements[p["groupement_id"]],
                    filiere=filieres[p["filiere_id"]],
                    nom=p["nom"],
                    slug=p["slug"],
                    description=p["description"],
                    prix_unitaire_fcfa=p["prix_unitaire_fcfa"],
                    prix_barre_fcfa=p["prix_barre_fcfa"],
                    unite=p["unite"],
                    stock_disponible=p["stock_disponible"],
                    seuil_alerte=p["seuil_alerte"],
                    photo=p["photo"],
                    photo_cle=p["photo_cle"],
                    photos_additionnelles=p["photos_additionnelles"],
                    note_moyenne=p["note_moyenne"],
                    nombre_appreciations=p["nombre_appreciations"],
                    date_ajout=_date(p["date_ajout"]),
                    etiquettes=p["etiquettes"],
                    etat_validation=p["etat_validation"],
                )
                for p in jeu["productions"]
            ),
            batch_size=200,
        )
        return {p["id"]: objet for p, objet in zip(jeu["productions"], objets)}

    # ------------------------------------------------------------------ #
    # Suivi-évaluation
    # ------------------------------------------------------------------ #

    def _cadre_logique(self, jeu) -> None:
        axes = AxeStrategique.objects.bulk_create(
            AxeStrategique(
                code=a["code"],
                intitule=a["intitule"],
                description=a["description"],
                teinte=a["teinte"],
                rang=rang,
            )
            for rang, a in enumerate(jeu["axes"])
        )
        par_axe = {a["id"]: objet for a, objet in zip(jeu["axes"], axes)}

        resultats = ResultatAttendu.objects.bulk_create(
            ResultatAttendu(
                axe=par_axe[r["axe_id"]],
                code=r["code"],
                intitule=r["intitule"],
                rang=rang,
            )
            for rang, r in enumerate(jeu["resultats"])
        )
        par_resultat = {r["id"]: objet for r, objet in zip(jeu["resultats"], resultats)}

        indicateurs = Indicateur.objects.bulk_create(
            Indicateur(
                resultat=par_resultat[i["resultat_id"]],
                code=i["code"],
                intitule=i["intitule"],
                unite=i["unite"],
                valeur_reference=i["valeur_reference"],
                valeur_actuelle=i["valeur_actuelle"],
                valeur_cible=i["valeur_cible"],
                sens=i["sens"],
                periodicite=i["periodicite"],
                source_donnee=i["source_donnee"],
                date_derniere_collecte=_date(i["date_derniere_collecte"]),
                ventile_par_genre=i["ventile_par_genre"],
            )
            for i in jeu["indicateurs"]
        )

        releves = []
        for source, objet in zip(jeu["indicateurs"], indicateurs):
            for rang, r in enumerate(source["releves"]):
                releves.append(
                    ReleveIndicateur(
                        indicateur=objet,
                        periode=r["periode"],
                        valeur=r["valeur"],
                        precedent=r["precedent"],
                        rang=rang,
                    )
                )
        ReleveIndicateur.objects.bulk_create(releves, batch_size=500)

    def _plan_action(self, jeu, quartiers, filieres) -> None:
        par_code_axe = {a.code: a for a in AxeStrategique.objects.all()}
        codes_axes = {a["id"]: a["code"] for a in jeu["axes"]}

        objets = []
        for a in jeu["activites"]:
            # `date_achevement` n'existe pas dans le générateur : on la déduit de
            # l'avancement, faute de quoi l'historique des activités terminées
            # ne serait pas reconstituable.
            achevement = _date(a["date_fin"]) if a["avancement"] >= 100 else None
            objets.append(
                Activite(
                    code=a["code"],
                    intitule=a["intitule"],
                    description=a["description"],
                    axe=par_code_axe[codes_axes[a["axe_id"]]],
                    responsable=a["responsable"],
                    date_debut=_date(a["date_debut"]),
                    date_fin=_date(a["date_fin"]),
                    avancement=a["avancement"],
                    date_achevement=achevement,
                    suspendue=a["statut"] == "suspendue",
                    budget_prevu_fcfa=a["budget_prevu_fcfa"],
                    budget_consomme_fcfa=a["budget_consomme_fcfa"],
                    groupements_beneficiaires=a["groupements_beneficiaires"],
                )
            )
        activites = Activite.objects.bulk_create(objets)
        par_activite = {a["id"]: objet for a, objet in zip(jeu["activites"], activites)}

        quartiers_par_nom = {q.nom: q for q in quartiers.values()}
        filieres_par_nom = {f.nom: f for f in filieres.values()}
        for source, objet in zip(jeu["activites"], activites):
            couverts = [quartiers_par_nom[n] for n in source["quartiers"] if n in quartiers_par_nom]
            visees = [filieres_par_nom[n] for n in source["filieres"] if n in filieres_par_nom]
            if couverts:
                objet.quartiers.set(couverts)
            if visees:
                objet.filieres.set(visees)

        Jalon.objects.bulk_create(
            Jalon(
                activite=par_activite.get(j["activite_id"]),
                intitule=j["intitule"],
                description=j["description"],
                date_prevue=_date(j["date_prevue"]),
                date_reelle=_date(j["date_reelle"]),
                decisif=j["decisif"],
            )
            for j in jeu["jalons"]
        )

    # ------------------------------------------------------------------ #
    # Formations
    # ------------------------------------------------------------------ #

    def _formations(self, jeu, quartiers) -> None:
        filieres_par_nom = {f.nom: f for f in Filiere.objects.all()}
        formations = Formation.objects.bulk_create(
            Formation(
                nom=f["nom"],
                slug=f["slug"],
                description=f["description"],
                type_module=f["type_module"],
                filiere=filieres_par_nom.get(f["filiere_nom"]),
                duree_heures=f["duree_heures"],
                cout_par_participant_fcfa=f["cout_par_participant_fcfa"],
            )
            for f in jeu["formations"]
        )
        par_formation = {f["id"]: objet for f, objet in zip(jeu["formations"], formations)}
        par_nom = {f.nom: f for f in formations}

        quartiers_par_nom = {q.nom: q for q in quartiers.values()}
        premier_quartier = next(iter(quartiers.values()))
        sessions = SessionFormation.objects.bulk_create(
            SessionFormation(
                formation=par_formation[s["formation_id"]],
                quartier=quartiers_par_nom.get(s["quartier"], premier_quartier),
                date_debut=_date(s["date_debut"]),
                date_fin=_date(s["date_fin"]),
                lieu=s["lieu"],
                formateur=s["formateur"],
                effectif_cible=s["effectif_cible"],
                annulee=s["statut"] == "annulee",
            )
            for s in jeu["sessions"]
        )

        # L'effectif présent n'est pas un champ du modèle : il se compte sur les
        # présences enregistrées. On crée donc autant de participations que le
        # jeu en annonce, sinon les taux de présence tomberaient tous à zéro.
        #
        # Le tirage est **aléatoire à graine fixe**, et non séquentiel : des
        # membres tirés à la suite ne se recroiseraient jamais d'une session à
        # l'autre, et le nombre de participations égalerait exactement celui des
        # personnes formées. Or les deux ne sont pas le même nombre — ce sont
        # les mêmes femmes qui suivent plusieurs modules, et c'est précisément
        # la distinction que l'écran doit montrer.
        import random

        tirage = random.Random(20261031)
        membres = list(Membre.objects.order_by("pk").values_list("pk", flat=True))
        participations = []
        for source, session in zip(jeu["sessions"], sessions):
            presents = min(source["effectif_present"], len(membres))
            if presents <= 0:
                continue
            participations.extend(
                Participation(session=session, membre_id=pk, present=True)
                for pk in tirage.sample(membres, presents)
            )
        Participation.objects.bulk_create(participations, batch_size=500)

        membres_par_nom = {}
        for pk, nom in Membre.objects.values_list("pk", "nom_complet_cache"):
            membres_par_nom.setdefault(nom, pk)

        certifications, vus = [], set()
        for c in jeu["certifications"]:
            formation = par_nom.get(c["formation_nom"])
            membre_pk = membres_par_nom.get(c["membre_nom"])
            if formation is None or membre_pk is None:
                continue
            # Une seule certification par couple (formation, membre) : la
            # contrainte d'unicité du modèle l'impose.
            if (formation.pk, membre_pk) in vus:
                continue
            vus.add((formation.pk, membre_pk))
            certifications.append(
                Certification(
                    formation=formation,
                    membre_id=membre_pk,
                    date_certification=_date(c["date_certification"]),
                    score=c["score"],
                    numero_certificat=c["numero_certificat"],
                )
            )
        Certification.objects.bulk_create(certifications, batch_size=500)

    # ------------------------------------------------------------------ #
    # Finances, commerce, contenus
    # ------------------------------------------------------------------ #

    def _finances(self, jeu, groupements) -> None:
        Financement.objects.bulk_create(
            Financement(
                reference=f["reference"],
                groupement=groupements[f["groupement_id"]],
                type_financement=f["type_financement"],
                montant_fcfa=f["montant_fcfa"],
                montant_rembourse_fcfa=f["montant_rembourse_fcfa"],
                bailleur=f["bailleur"],
                objet=f["objet"],
                date_decaissement=_date(f["date_decaissement"]),
                date_prevue_remboursement=_date(f["date_prevue_remboursement"]),
                statut=f["statut"],
            )
            for f in jeu["financements"]
        )
        MouvementFinancier.objects.bulk_create(
            MouvementFinancier(
                reference=m["reference"],
                libelle=m["libelle"],
                contrepartie=m["contrepartie"],
                categorie=m["categorie"],
                montant_fcfa=m["montant_fcfa"],
                date=_date(m["date"]),
                moyen=m["moyen"],
                statut=m["statut"],
            )
            for m in jeu["mouvements"]
        )

    def _commerce(self, jeu, quartiers, productions) -> None:
        quartiers_par_nom = {q.nom: q for q in quartiers.values()}
        premier = next(iter(quartiers.values()))

        commandes = Commande.objects.bulk_create(
            Commande(
                numero=c["numero"],
                statut=c["statut"],
                client_nom=c["client_nom"],
                client_telephone=c["client_telephone"],
                adresse_livraison=c["adresse_livraison"],
                quartier=quartiers_par_nom.get(c["quartier"], premier),
                moyen_paiement=c["moyen_paiement"],
            )
            for c in jeu["commandes"]
        )

        lignes, vus = [], set()
        for source, commande in zip(jeu["commandes"], commandes):
            for ligne in source["lignes"]:
                production = productions.get(ligne["production_id"])
                if production is None or (commande.pk, production.pk) in vus:
                    continue
                vus.add((commande.pk, production.pk))
                lignes.append(
                    LigneCommande(
                        commande=commande,
                        production=production,
                        quantite=ligne["quantite"],
                        prix_unitaire_fcfa=ligne["prix_unitaire_fcfa"],
                    )
                )
        LigneCommande.objects.bulk_create(lignes, batch_size=500)

        Boutique.objects.bulk_create(
            Boutique(
                nom=b["nom"],
                adresse=b["adresse"],
                quartier=quartiers_par_nom.get(b["quartier"], premier),
                latitude=b["latitude"],
                longitude=b["longitude"],
                telephone=b["telephone"],
                responsable=b["responsable"],
                heure_ouverture=b["heure_ouverture"],
                heure_fermeture=b["heure_fermeture"],
                note_moyenne=b["note_moyenne"],
            )
            for b in jeu["boutiques"]
        )

    def _contenus(self, jeu, quartiers) -> None:
        Actualite.objects.bulk_create(
            Actualite(
                titre=a["titre"],
                slug=a["slug"],
                chapeau=a["chapeau"],
                contenu=a["contenu"],
                photo=a["photo"],
                photo_cle=a.get("photo_cle", ""),
                categorie=a["categorie"],
                auteur=a["auteur"],
                date_publication=_date(a["date_publication"]),
                temps_lecture_min=a["temps_lecture_min"],
            )
            for a in jeu["actualites"]
        )

        # `horodatage` est en `auto_now_add` : il faut le réécrire après coup,
        # sinon toute la piste d'audit porterait l'instant de l'import.
        entrees = EvenementJournal.objects.bulk_create(
            EvenementJournal(
                acteur=e["acteur"],
                acteur_teinte=e["acteur_teinte"],
                action=e["action"],
                cible=e["cible"],
                cible_lien=e["cible_lien"],
                categorie=e["categorie"],
            )
            for e in jeu["journal"]
        )
        for source, objet in zip(jeu["journal"], entrees):
            objet.horodatage = _horodatage(source["horodatage"])
        EvenementJournal.objects.bulk_update(entrees, ["horodatage"], batch_size=200)

    # ------------------------------------------------------------------ #

    def _vider(self) -> None:
        """Supprime les données métier, des tables dépendantes vers les socles."""
        for modele in [
            LigneCommande, Commande, Certification, Participation, SessionFormation,
            Formation, Financement, MouvementFinancier, Jalon, Activite,
            ReleveIndicateur, Indicateur, ResultatAttendu, AxeStrategique,
            Actualite, EvenementJournal, Boutique, Production, Membre, Groupement,
            Quartier, Filiere, Commune,
        ]:
            modele.objects.all().delete()
        self.stdout.write("Données métier supprimées.")
