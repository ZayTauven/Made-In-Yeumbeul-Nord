"""
Jeu de données des tests.

Il est produit par un générateur **à graine fixe** : le même appel donne toujours
le même jeu, donc un test qui passe aujourd'hui passera demain. C'est le même
principe que `frontend-admin/src/domaine/generateur.ts`, pour la même raison.

Ce n'est pas le jeu de démonstration : celui-là est du ressort de `yn-data-demo`
et vise la crédibilité (toponymie réelle, anthroponymie sénégalaise, montants
plausibles). Ici on ne cherche que la couverture des cas.
"""

import random
from datetime import date, timedelta

from core.models import (
    Activite,
    Actualite,
    AxeStrategique,
    Boutique,
    Certification,
    Commune,
    EvenementJournal,
    Filiere,
    Financement,
    Formation,
    Groupement,
    Indicateur,
    Jalon,
    Membre,
    MouvementFinancier,
    Participation,
    Production,
    Quartier,
    ReleveIndicateur,
    ResultatAttendu,
    SessionFormation,
)
from core.referentiels import (
    ETAPES,
    CategorieJournal,
    EtatValidation,
    Genre,
    MoyenPaiement,
    PeriodiciteCollecte,
    SensIndicateur,
    StatutFinancement,
    StatutMouvement,
    TypeFinancement,
    TypeModule,
)

AUJOURDHUI = date.today()

QUARTIERS = [
    ("Darou Salam", "darou-salam", 14.7871, -17.3818, 18400),
    ("Aïnoumady 1", "ainoumady-1", 14.7802, -17.3841, 12800),
    ("Bountou Pikine", "bountou-pikine", 14.7909, -17.3771, 16700),
    ("Diamalaye", "diamalaye", 14.7756, -17.3699, 13900),
]

FILIERES = [
    ("Saponification", "saponification", "bubble"),
    ("Cosmétiques", "cosmetiques", "droplet"),
    ("Maraîchage", "maraichage", "plant-2"),
    ("Couture", "couture", "needle-thread"),
]

PRENOMS_FEMMES = ["Khady", "Aminata", "Fatou", "Ndèye", "Mariama", "Awa", "Sokhna"]
PRENOMS_HOMMES = ["Moussa", "Ibrahima", "Cheikh", "Abdou"]
NOMS = ["Sène", "Diop", "Fall", "Ndiaye", "Sow", "Bâ", "Gueye"]


def peupler(graine: int = 20261031) -> dict:
    """Crée un jeu complet et renvoie les objets utiles aux tests."""
    alea = random.Random(graine)

    commune = Commune.objects.create(slug="yeumbeul-nord")

    quartiers = [
        Quartier.objects.create(
            commune=commune, nom=nom, slug=slug, latitude=lat, longitude=lon,
            population_estimee=pop,
        )
        for nom, slug, lat, lon, pop in QUARTIERS
    ]

    filieres = [
        Filiere.objects.create(
            nom=nom, slug=slug, icone=icone, teinte=f"var(--ax-chart-{i + 1})",
            description=f"Filière {nom.lower()}.",
        )
        for i, (nom, slug, icone) in enumerate(FILIERES)
    ]

    groupements = []
    for i in range(24):
        quartier = quartiers[i % len(quartiers)]
        filiere = filieres[i % len(filieres)]
        groupement = Groupement.objects.create(
            commune=commune,
            # Un nom accentué au moins : la recherche sans accent se teste dessus.
            nom=f"GIE And Liggéey {i + 1}",
            slug=f"gie-{i + 1}",
            description="Groupement d'intérêt économique de Yeumbeul Nord.",
            quartier=quartier,
            latitude=quartier.latitude + alea.uniform(-0.004, 0.004),
            longitude=quartier.longitude + alea.uniform(-0.004, 0.004),
            filiere=filiere,
            etape=ETAPES[i % len(ETAPES)],
            date_creation=AUJOURDHUI - timedelta(days=alea.randint(200, 1400)),
            chiffre_affaires_fcfa=alea.randint(2, 40) * 250_000,
            note_moyenne=round(alea.uniform(3.6, 4.9), 1),
            nombre_appreciations=alea.randint(4, 60),
            telephone="77 000 00 00",
            photo="/photos/groupements/atelier.jpg",
            photo_cle="atelier-saponification",
            etat_validation=(
                EtatValidation.VALIDE if i % 5 else EtatValidation.BROUILLON
            ),
        )
        groupement.filieres_secondaires.add(filieres[(i + 1) % len(filieres)])
        groupements.append(groupement)

        effectif = alea.randint(8, 26)
        for rang in range(effectif):
            femme = rang < int(effectif * 0.8)
            Membre.objects.create(
                groupement=groupement,
                prenom=alea.choice(PRENOMS_FEMMES if femme else PRENOMS_HOMMES),
                nom_famille=alea.choice(NOMS),
                genre=Genre.FEMME if femme else Genre.HOMME,
                role="Présidente" if rang == 0 else "Membre",
                est_responsable=(rang == 0),
                date_naissance=date(alea.randint(1968, 2004), alea.randint(1, 12), 15),
                date_adhesion=AUJOURDHUI - timedelta(days=alea.randint(30, 1200)),
                telephone="77 000 00 00",
                avatar_teinte=f"var(--ax-chart-{(rang % 6) + 1})",
            )

        for p in range(alea.randint(1, 4)):
            prix = alea.randint(2, 30) * 250
            Production.objects.create(
                groupement=groupement,
                filiere=filiere,
                nom=f"Production {i + 1}-{p + 1}",
                slug=f"production-{i + 1}-{p + 1}",
                description="Production issue du groupement.",
                prix_unitaire_fcfa=prix,
                prix_barre_fcfa=prix + alea.randint(1, 6) * 100,
                unite=alea.choice(["kg", "litre", "pièce", "sachet"]),
                # Le zéro et les petits stocks alimentent les tests de rupture.
                stock_disponible=alea.choice([0, 2, 4, 18, 40, 120]),
                seuil_alerte=5,
                date_ajout=AUJOURDHUI - timedelta(days=alea.randint(5, 400)),
                note_moyenne=round(alea.uniform(3.5, 5.0), 1),
                nombre_appreciations=alea.randint(0, 40),
                photo="/photos/productions/savon.jpg",
                photo_cle="savon-artisanal",
                etiquettes=["local"],
                etat_validation=EtatValidation.VALIDE,
            )

        if i % 2 == 0:
            montant = alea.randint(3, 30) * 100_000
            Financement.objects.create(
                reference=f"FIN-{i + 1:03d}",
                groupement=groupement,
                type_financement=alea.choice(list(TypeFinancement)),
                montant_fcfa=montant,
                montant_rembourse_fcfa=alea.choice([0, montant // 3, montant]),
                bailleur="Commune de Yeumbeul Nord",
                objet="Appui à la production",
                date_decaissement=AUJOURDHUI - timedelta(days=alea.randint(10, 500)),
                statut=alea.choice(list(StatutFinancement)),
            )

    _peupler_cadre_logique(alea)
    _peupler_plan_action(alea, quartiers, filieres)
    _peupler_formations(alea, quartiers)
    _peupler_tresorerie(alea, quartiers)

    return {
        "commune": commune,
        "quartiers": quartiers,
        "filieres": filieres,
        "groupements": groupements,
    }


def _peupler_cadre_logique(alea):
    for a, (code_axe, intitule) in enumerate(
        [("A1", "Structurer les groupements"), ("A2", "Développer la production")]
    ):
        axe = AxeStrategique.objects.create(
            code=code_axe, intitule=intitule, rang=a,
            teinte=f"var(--ax-chart-{a + 1})", description="Axe du cadre logique.",
        )
        for r in range(2):
            resultat = ResultatAttendu.objects.create(
                axe=axe, code=f"R{a + 1}.{r + 1}",
                intitule=f"Résultat attendu {a + 1}.{r + 1}", rang=r,
            )
            for k in range(2):
                # Un indicateur décroissant sur deux : le taux d'atteinte se lit
                # dans l'autre sens, et c'est le piège que le test doit couvrir.
                sens = SensIndicateur.DECROISSANT if k else SensIndicateur.CROISSANT
                reference = alea.randint(40, 220)
                actuel = alea.randint(60, 200)
                indicateur = Indicateur.objects.create(
                    resultat=resultat,
                    code=f"I{a + 1}.{r + 1}.{k + 1}",
                    intitule=f"Indicateur {a + 1}.{r + 1}.{k + 1}",
                    unite="jours" if k else "groupements",
                    valeur_reference=reference,
                    valeur_actuelle=actuel,
                    valeur_cible=alea.randint(80, 240),
                    sens=sens,
                    periodicite=PeriodiciteCollecte.TRIMESTRIELLE,
                    source_donnee="Suivi administratif",
                    date_derniere_collecte=AUJOURDHUI - timedelta(days=12),
                    ventile_par_genre=bool(k),
                )
                for rang, mois in enumerate(["nov.", "déc.", "janv.", "févr."]):
                    ReleveIndicateur.objects.create(
                        indicateur=indicateur, rang=rang, periode=mois,
                        valeur=reference + (actuel - reference) * rang / 3,
                        precedent=reference * 0.9,
                    )


def _peupler_plan_action(alea, quartiers, filieres):
    axes = list(AxeStrategique.objects.all())
    for i in range(12):
        debut = AUJOURDHUI + timedelta(days=alea.randint(-500, 120))
        activite = Activite.objects.create(
            code=f"ACT-{i + 1:02d}",
            intitule=f"Activité {i + 1} du plan d'action",
            description="Activité du plan d'action.",
            axe=axes[i % len(axes)],
            responsable=alea.choice(["Khady Sène", "Aminata Diop", "Moussa Fall"]),
            date_debut=debut,
            date_fin=debut + timedelta(days=alea.randint(60, 260)),
            avancement=alea.randint(0, 100),
            budget_prevu_fcfa=alea.randint(6, 48) * 500_000,
            budget_consomme_fcfa=alea.randint(1, 20) * 500_000,
            groupements_beneficiaires=alea.randint(6, 24),
            suspendue=(i == 7),
        )
        activite.quartiers.add(*alea.sample(quartiers, 2))
        activite.filieres.add(filieres[i % len(filieres)])
        for j in range(alea.randint(1, 2)):
            prevue = activite.date_debut + timedelta(days=alea.randint(20, 200))
            Jalon.objects.create(
                activite=activite,
                intitule=f"Jalon {i + 1}.{j + 1}",
                date_prevue=prevue,
                date_reelle=(
                    prevue if prevue < AUJOURDHUI and alea.random() > 0.4 else None
                ),
                decisif=(j == 0 and i % 3 == 0),
            )


def _peupler_formations(alea, quartiers):
    membres = list(Membre.objects.all())
    filieres = list(Filiere.objects.all())
    for i in range(5):
        formation = Formation.objects.create(
            nom=f"Module {i + 1} de formation",
            slug=f"module-{i + 1}",
            description="Module de formation.",
            type_module=list(TypeModule)[i % len(TypeModule)],
            filiere=filieres[i % len(filieres)] if i % 2 else None,
            duree_heures=alea.choice([8, 16, 24]),
            cout_par_participant_fcfa=alea.randint(5, 30) * 1_000,
        )
        for s in range(2):
            # Des sessions passées, en cours et à venir : les trois statuts
            # déduits des dates doivent être représentés.
            debut = AUJOURDHUI - timedelta(days=alea.randint(-40, 300))
            session = SessionFormation.objects.create(
                formation=formation,
                quartier=quartiers[s % len(quartiers)],
                date_debut=debut,
                date_fin=debut + timedelta(days=2),
                lieu="Maison des femmes",
                formateur="Mamy Kaya",
                effectif_cible=25,
            )
            for membre in alea.sample(membres, 18):
                Participation.objects.create(
                    session=session, membre=membre, present=alea.random() > 0.2
                )

        for membre in alea.sample(membres, 8):
            Certification.objects.get_or_create(
                formation=formation,
                membre=membre,
                defaults={
                    "date_certification": AUJOURDHUI
                    - timedelta(days=alea.randint(5, 200)),
                    "score": alea.randint(55, 98),
                    "numero_certificat": f"CERT-{formation.pk}-{membre.pk}",
                },
            )


def _peupler_tresorerie(alea, quartiers):
    for i in range(20):
        MouvementFinancier.objects.create(
            reference=f"MVT-{i + 1:03d}",
            libelle=f"Mouvement {i + 1}",
            contrepartie=alea.choice(["GIE And Liggéey 3", "Fournisseur", "Commune"]),
            categorie=alea.choice(["Décaissement", "Recette", "Frais"]),
            # Signé : le journal doit contenir des sorties de caisse.
            montant_fcfa=alea.choice([1, -1]) * alea.randint(1, 40) * 25_000,
            date=AUJOURDHUI - timedelta(days=alea.randint(1, 200)),
            moyen=alea.choice(list(MoyenPaiement)),
            statut=alea.choice(list(StatutMouvement)),
        )

    for i, quartier in enumerate(quartiers[:3]):
        Boutique.objects.create(
            nom=f"Boutique témoin {quartier.nom}",
            adresse=f"Marché de {quartier.nom}",
            quartier=quartier,
            latitude=quartier.latitude,
            longitude=quartier.longitude,
            telephone="33 000 00 00",
            responsable="Fatou Ndiaye",
            heure_ouverture="09:00",
            heure_fermeture="18:00",
            date_ouverture=AUJOURDHUI - timedelta(days=300 + i * 40),
            note_moyenne=4.6,
        )

    for i in range(4):
        Actualite.objects.create(
            titre=f"Actualité {i + 1} du projet",
            slug=f"actualite-{i + 1}",
            chapeau="Chapeau de l'actualité.",
            contenu="Contenu de l'actualité.",
            categorie="Vie du projet",
            auteur="Cellule de coordination",
            date_publication=AUJOURDHUI - timedelta(days=i * 9),
            temps_lecture_min=3,
        )

    for i in range(6):
        EvenementJournal.objects.create(
            acteur=alea.choice(["Khady Sène", "Aminata Diop"]),
            action="Validation d'une fiche",
            cible=f"GIE And Liggéey {i + 1}",
            cible_lien=f"/groupements/gie-{i + 1}",
            categorie=CategorieJournal.GROUPEMENT,
        )
