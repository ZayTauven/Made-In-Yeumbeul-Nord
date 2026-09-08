"""
Agrégations du suivi-évaluation.

Toutes les valeurs servies ici sont **calculées, jamais stockées**. Un indicateur
d'en-tête qui contredit le tableau affiché juste en dessous est le défaut le plus
coûteux d'une démonstration : il se voit immédiatement et jette le doute sur tout
le reste de l'écran (`PLAN & PRODUCT/15-CONTRAT-API.md` §6.3).

Deux règles que le serveur doit tenir sur chaque KPI :

1. **La valeur affichée est le dernier point de la série**, et la série applique
   aux dates passées le prédicat exact qui définit cette valeur. Une première
   version d'écran comptait les activités dont la fenêtre couvrait le jour quand
   l'anneau placé dessous comptait le statut : cinq d'un côté, quatre de l'autre.
2. **`delta` se mesure depuis le point précédent** de la série — seule lecture
   qu'une pastille autorise sans légende. Mesuré d'un bout à l'autre, il
   annoncerait « +5 141 % » sur un indicateur parti de douze pour atteindre six
   cent trente-quatre.

Les fonctions sont regroupées ici plutôt que dans les vues : une agrégation se
teste sans passer par HTTP, et les vues restent minces.
"""

from __future__ import annotations

from datetime import date

from django.db.models import Count, F, Q, Sum

from core.models import (
    Activite,
    Certification,
    Filiere,
    Financement,
    Formation,
    Groupement,
    Indicateur,
    Jalon,
    Membre,
    Participation,
    Production,
    Quartier,
    SessionFormation,
)
from core.referentiels import (
    ETAPES,
    TYPES_REMBOURSABLES,
    EtapeAccompagnement,
    Genre,
    SensIndicateur,
    StatutActivite,
    StatutFinancement,
    StatutSession,
    Tendance,
    TypeFinancement,
    TypeModule,
    taux_atteinte,
)

#: Nombre de points des sparklines. Huit tient dans la largeur d'une carte KPI
#: sans que les points se confondent.
POINTS_ETINCELLE = 8

#: Espace insécable : le séparateur de milliers du français typographique.
_INSECABLE = " "


# --------------------------------------------------------------------------- #
# Mise en forme
# --------------------------------------------------------------------------- #


def formater_entier(valeur: float) -> str:
    """« 1 240 », avec des espaces insécables."""
    return f"{int(round(valeur)):,}".replace(",", _INSECABLE)


def formater_fcfa(valeur: float) -> str:
    """« 70,3 M FCFA » au-delà du million, « 450 000 FCFA » en deçà.

    Le formatage est fait ici et pas dans les fronts : deux fronts qui formatent
    chacun de leur côté finissent toujours par diverger d'un espace ou d'une
    décimale.
    """
    if abs(valeur) >= 1_000_000:
        millions = valeur / 1_000_000
        return f"{millions:.1f}".replace(".", ",") + f"{_INSECABLE}M{_INSECABLE}FCFA"
    return formater_entier(valeur) + f"{_INSECABLE}FCFA"


def formater_pourcentage(valeur: float) -> str:
    return f"{int(round(valeur))}{_INSECABLE}%"


# --------------------------------------------------------------------------- #
# Séries et deltas
# --------------------------------------------------------------------------- #


def dates_de_coupe(points: int = POINTS_ETINCELLE, aujourdhui: date | None = None):
    """Dates de fin de chaque tranche mensuelle, de la plus ancienne à ce jour.

    La dernière coupe est le jour même, pour que le dernier point de la série
    soit exactement la valeur affichée par la carte.
    """
    aujourdhui = aujourdhui or date.today()
    coupes = []
    for recul in range(points - 1, 0, -1):
        mois = aujourdhui.month - recul
        annee = aujourdhui.year + (mois - 1) // 12
        mois = (mois - 1) % 12 + 1
        # Le 28 existe dans tous les mois : la coupe reste comparable d'un mois
        # à l'autre sans traiter février à part.
        coupes.append(date(annee, mois, min(aujourdhui.day, 28)))
    coupes.append(aujourdhui)
    return coupes


def serie_par_date(queryset, champ_date: str, agregat=None, points: int = POINTS_ETINCELLE):
    """Valeur cumulée du prédicat à chaque date de coupe.

    `agregat` vaut `None` pour un comptage, ou une expression `Sum(...)` pour un
    montant. Le même queryset sert la valeur courante et la série : c'est la
    seule façon de garantir qu'elles ne divergent pas.
    """
    valeurs = []
    for coupe in dates_de_coupe(points):
        tranche = queryset.filter(**{f"{champ_date}__lte": coupe})
        if agregat is None:
            valeurs.append(tranche.count())
        else:
            valeurs.append(tranche.aggregate(v=agregat)["v"] or 0)
    return valeurs


def delta_depuis_precedent(serie: list[float], en_points: bool = False) -> float:
    """Variation entre les deux derniers points.

    En pourcentage relatif par défaut ; **en points** lorsque l'indicateur est
    lui-même un pourcentage, où une variation relative n'aurait aucun sens
    lisible. Un delta nul n'est pas un défaut : il dit qu'il ne s'est rien passé.
    """
    if len(serie) < 2:
        return 0.0
    precedent, dernier = serie[-2], serie[-1]
    if en_points:
        return round(dernier - precedent, 1)
    if not precedent:
        return 0.0
    return round((dernier - precedent) / precedent * 100, 1)


def tendance_du_delta(delta: float) -> str:
    if delta > 0:
        return Tendance.HAUSSE
    if delta < 0:
        return Tendance.BAISSE
    return Tendance.STABLE


def construire_kpi(
    cle: str,
    libelle: str,
    serie: list[float],
    unite: str,
    formateur,
    cible: float | None = None,
    sens: str | None = None,
    delta_en_points: bool = False,
) -> dict:
    """Assemble une carte KPI en tenant les deux règles du contrat."""
    valeur = serie[-1] if serie else 0
    delta = delta_depuis_precedent(serie, en_points=delta_en_points)
    kpi = {
        "cle": cle,
        "libelle": libelle,
        "valeur": valeur,
        "valeur_affichee": formateur(valeur),
        "unite": unite,
        "delta": delta,
        "tendance": tendance_du_delta(delta),
        "etincelle": serie,
    }
    if cible is not None:
        kpi["cible"] = cible
    if sens is not None:
        kpi["sens"] = sens
    return kpi


# --------------------------------------------------------------------------- #
# Cartes adossées au cadre logique
# --------------------------------------------------------------------------- #


def carte_indicateur(code: str, cle: str, libelle: str) -> dict:
    """Construit une carte KPI **à partir d'un indicateur du cadre logique**.

    C'est ce qui garantit qu'une carte d'en-tête ne contredit jamais la fiche
    d'indicateur correspondante : les deux lisent la même valeur, la même
    cible et le même historique de collectes. Une série recalculée à part
    finirait par diverger d'un relevé.

    Transposition de `carteIndicateur()` de `domaine/source.ts`.
    """
    indicateur = (
        Indicateur.objects.filter(code=code).prefetch_related("releves").first()
    )
    if indicateur is None:
        return {
            "cle": cle,
            "libelle": libelle,
            "valeur": 0,
            "valeur_affichee": "0",
            "unite": "",
            "delta": 0,
            "tendance": Tendance.STABLE,
            "etincelle": [0],
        }

    serie = [releve.valeur for releve in indicateur.releves.all()] or [0]
    pourcentage = indicateur.unite == "%"
    valeur = indicateur.valeur_actuelle

    carte = {
        "cle": cle,
        "libelle": libelle,
        "valeur": valeur,
        "valeur_affichee": (
            formater_pourcentage(valeur) if pourcentage else formater_entier(valeur)
        ),
        "unite": indicateur.unite,
        "delta": delta_depuis_precedent(serie, en_points=pourcentage),
        "tendance": indicateur.tendance,
        "sens": indicateur.sens,
        "etincelle": serie,
        "cible": indicateur.valeur_cible,
    }
    return carte


def serie_avancement_cadre(profondeur: int = POINTS_ETINCELLE) -> list[int]:
    """Avancement global du cadre logique, relevé par relevé.

    La moyenne des taux d'atteinte à un relevé donné est l'avancement du cadre à
    cette date. Rien n'est inventé : la courbe reconstitue les collectes passées.
    """
    indicateurs = list(Indicateur.objects.prefetch_related("releves"))
    if not indicateurs:
        return [0] * profondeur

    longueurs = [indicateur.releves.count() for indicateur in indicateurs]
    longueur = min(longueurs) if longueurs else 0
    if longueur == 0:
        return [0] * profondeur

    serie = []
    for rang in range(max(0, longueur - profondeur), longueur):
        taux = [
            taux_atteinte(
                list(indicateur.releves.all())[rang].valeur,
                indicateur.valeur_cible,
                indicateur.sens,
            )
            for indicateur in indicateurs
        ]
        serie.append(round(sum(taux) / len(taux)))
    return serie


# --------------------------------------------------------------------------- #
# Indicateurs d'en-tête
# --------------------------------------------------------------------------- #


def kpis_generaux() -> list[dict]:
    """Les quatre cartes d'en-tête du tableau de bord général.

    Les clés, les libellés et l'ordre sont ceux qu'attend `kpisSuivi()` de
    `frontend-admin/src/domaine/source.ts` : l'écran affiche ces quatre cartes,
    dans cet ordre. En servir une cinquième, ou renommer une clé, décalerait la
    grille.
    """
    groupements = Groupement.objects.all()
    membres = Membre.objects.all()

    serie_groupements = serie_par_date(groupements, "date_creation")
    serie_membres = serie_par_date(membres, "date_adhesion")
    serie_decaisse = serie_par_date(
        Financement.objects.all(), "date_decaissement", agregat=Sum("montant_fcfa")
    )

    # Part de femmes à chaque date de coupe : le même prédicat que la valeur
    # courante, appliqué au passé — sans quoi la carte contredirait sa série.
    serie_part_femmes = []
    for coupe in dates_de_coupe():
        recensees = membres.filter(date_adhesion__lte=coupe)
        effectif = recensees.count()
        femmes = recensees.filter(genre=Genre.FEMME).count()
        serie_part_femmes.append(round(femmes / effectif * 100) if effectif else 0)

    return [
        construire_kpi(
            "groupements", "Groupements accompagnés", serie_groupements,
            "groupements", formater_entier, cible=100,
        ),
        construire_kpi(
            "membres", "Membres recensés", serie_membres, "membres",
            formater_entier, cible=1800,
        ),
        construire_kpi(
            "part_femmes", "Part de femmes", serie_part_femmes, "%",
            formater_pourcentage, delta_en_points=True,
        ),
        construire_kpi(
            "decaissements", "Montant décaissé", serie_decaisse, "FCFA", formater_fcfa,
        ),
    ]


def kpis_plan_action() -> list[dict]:
    """Les quatre cartes du tableau de bord de suivi.

    Clés, libellés et ordre suivent `kpisPlanAction()` de `domaine/source.ts`.
    Chaque série applique aux dates passées le prédicat exact qui définit la
    valeur affichée — une activité « échue non achevée » l'est à une date donnée
    selon son état à cette date, pas selon son état d'aujourd'hui.
    """
    activites = list(Activite.objects.all())
    jalons = list(Jalon.objects.all())
    coupes = dates_de_coupe()

    serie_terminees = [
        len([a for a in activites if a.date_fin < coupe and a.avancement >= 100])
        for coupe in coupes
    ]
    serie_jalons = [
        len([j for j in jalons if j.date_reelle is not None and j.date_reelle <= coupe])
        for coupe in coupes
    ]
    serie_echues = [
        len([a for a in activites if a.date_fin < coupe and a.avancement < 100])
        for coupe in coupes
    ]
    serie_cadre = serie_avancement_cadre()

    total_activites = len(activites)
    total_jalons = len(jalons)

    return [
        {
            "cle": "terminees",
            "libelle": "Activités terminées",
            "valeur": serie_terminees[-1],
            # « 5 / 18 » plutôt que « 5 » : un décompte sans son total ne dit pas
            # si le plan d'action avance ou piétine.
            "valeur_affichee": f"{serie_terminees[-1]} / {total_activites}",
            "unite": "activités",
            "delta": delta_depuis_precedent(serie_terminees),
            "tendance": tendance_du_delta(delta_depuis_precedent(serie_terminees)),
            "etincelle": serie_terminees,
            "cible": total_activites,
        },
        {
            "cle": "jalons",
            "libelle": "Jalons atteints",
            "valeur": serie_jalons[-1],
            "valeur_affichee": f"{serie_jalons[-1]} / {total_jalons}",
            "unite": "jalons",
            "delta": delta_depuis_precedent(serie_jalons),
            "tendance": tendance_du_delta(delta_depuis_precedent(serie_jalons)),
            "etincelle": serie_jalons,
            "cible": total_jalons,
        },
        {
            "cle": "echues",
            "libelle": "Activités échues non achevées",
            "valeur": serie_echues[-1],
            "valeur_affichee": formater_entier(serie_echues[-1]),
            "unite": "activités",
            "delta": delta_depuis_precedent(serie_echues),
            "tendance": tendance_du_delta(delta_depuis_precedent(serie_echues)),
            # Un retard qui recule est une bonne nouvelle : sans ce sens, la
            # pastille s'afficherait en rouge.
            "sens": SensIndicateur.DECROISSANT,
            "etincelle": serie_echues,
        },
        {
            "cle": "cadre",
            "libelle": "Avancement du cadre logique",
            "valeur": serie_cadre[-1],
            "valeur_affichee": formater_pourcentage(serie_cadre[-1]),
            "unite": "%",
            # En points, jamais en pourcentage relatif : « +12 % » sur une
            # valeur déjà exprimée en pourcentage ne peut que se lire de travers.
            "delta": delta_depuis_precedent(serie_cadre, en_points=True),
            "tendance": tendance_du_delta(
                delta_depuis_precedent(serie_cadre, en_points=True)
            ),
            "etincelle": serie_cadre,
            "cible": 100,
        },
    ]



def kpis_formations() -> list[dict]:
    """Les quatre cartes de l'écran formations.

    Trois d'entre elles sont des indicateurs du cadre logique : la carte affiche
    donc exactement la valeur que la coordination rapporte au bailleur. La
    quatrième, les sessions tenues, n'en est pas un et se reconstitue ici.
    """
    sessions = list(SessionFormation.objects.prefetch_related("participations"))
    tenues = [s for s in sessions if s.statut == StatutSession.TERMINEE]

    serie_sessions = [
        len([s for s in tenues if s.date_fin <= coupe]) for coupe in dates_de_coupe()
    ]

    return [
        carte_indicateur("I2.1.1", "membres_formes", "Membres formés"),
        {
            "cle": "sessions",
            "libelle": "Sessions tenues",
            "valeur": len(tenues),
            "valeur_affichee": formater_entier(len(tenues)),
            "unite": "sessions",
            "delta": delta_depuis_precedent(serie_sessions),
            "tendance": tendance_du_delta(delta_depuis_precedent(serie_sessions)),
            "etincelle": serie_sessions,
            "cible": len(sessions),
        },
        carte_indicateur("I2.1.2", "certification", "Taux de certification"),
        carte_indicateur("I2.1.3", "presence", "Taux de présence aux sessions"),
    ]


# --------------------------------------------------------------------------- #
# Répartitions et entonnoir
# --------------------------------------------------------------------------- #


def entonnoir() -> list[dict]:
    """Effectif et part par étape d'accompagnement, dans l'ordre canonique.

    L'ordre est celui du référentiel, pas celui des effectifs : un entonnoir
    trié par volume ne raconte plus un parcours.
    """
    from core.referentiels import PROGRESSION_ETAPE

    comptes = {
        ligne["etape"]: ligne["n"]
        for ligne in Groupement.objects.values("etape").annotate(n=Count("id"))
    }
    total = sum(comptes.values())
    libelles = dict(EtapeAccompagnement.choices)

    return [
        {
            "etape": etape,
            "libelle": libelles[etape],
            "effectif": comptes.get(etape, 0),
            "part": round(comptes.get(etape, 0) / total * 100) if total else 0,
            # Position de l'étape sur le parcours, 0–100. L'écran s'en sert pour
            # placer les paliers de l'entonnoir : sans elle, il les répartirait
            # à intervalles égaux, ce que le barème n'est pas.
            "progression": PROGRESSION_ETAPE[etape],
        }
        for etape in ETAPES
    ]


def repartition(axe: str) -> list[dict]:
    """Répartition des groupements selon un axe d'analyse."""
    if axe == "filiere":
        lignes = [
            {
                "libelle": filiere.nom,
                "slug": filiere.slug,
                "valeur": filiere.n,
                "teinte": filiere.teinte,
            }
            for filiere in Filiere.objects.annotate(n=Count("groupements")).order_by("-n")
        ]
    elif axe == "quartier":
        lignes = [
            {"libelle": quartier.nom, "slug": quartier.slug, "valeur": quartier.n}
            for quartier in Quartier.objects.annotate(n=Count("groupements")).order_by(
                "-n"
            )
        ]
    elif axe == "genre":
        comptes = {
            ligne["genre"]: ligne["n"]
            for ligne in Membre.objects.values("genre").annotate(n=Count("id"))
        }
        lignes = [
            {
                "libelle": libelle,
                "slug": valeur,
                "valeur": comptes.get(valeur, 0),
            }
            for valeur, libelle in Genre.choices
        ]
    else:
        raise ValueError(
            f"Axe de répartition inconnu : {axe!r}. "
            "Attendu « filiere », « quartier » ou « genre »."
        )

    total = sum(ligne["valeur"] for ligne in lignes)
    for ligne in lignes:
        ligne["part"] = round(ligne["valeur"] / total * 100) if total else 0
    return lignes


def croisement(lignes: str = "quartier", colonnes: str = "filiere") -> dict:
    """Tableau croisé des effectifs de groupements.

    Une seule requête groupée, puis remplissage en mémoire : la version naïve —
    une requête par case — en tirerait cent dix sur dix quartiers et onze
    filières.
    """
    champs = {"quartier": "quartier__nom", "filiere": "filiere__nom"}
    if lignes not in champs or colonnes not in champs:
        raise ValueError(
            "Croisement possible entre « quartier » et « filiere » seulement."
        )

    champ_ligne, champ_colonne = champs[lignes], champs[colonnes]
    comptes = {
        (entree[champ_ligne], entree[champ_colonne]): entree["n"]
        for entree in Groupement.objects.values(champ_ligne, champ_colonne).annotate(
            n=Count("id")
        )
    }

    noms_colonnes = list(
        (Filiere if colonnes == "filiere" else Quartier)
        .objects.order_by("nom")
        .values_list("nom", flat=True)
    )
    noms_lignes = list(
        (Quartier if lignes == "quartier" else Filiere)
        .objects.order_by("nom")
        .values_list("nom", flat=True)
    )

    resultat = []
    for nom_ligne in noms_lignes:
        # `valeurs` est un dictionnaire indexé par nom de colonne, et non une
        # liste : c'est la forme que consomme `croisementQuartierFiliere()` de
        # `domaine/source.ts`, qui lit `valeurs[nomDeLaFiliere]`. Une liste
        # obligerait l'écran à retrouver l'indice de chaque colonne.
        valeurs = {
            colonne: comptes.get((nom_ligne, colonne), 0) for colonne in noms_colonnes
        }
        resultat.append(
            {
                # La clé de ligne porte le nom de l'axe demandé — « quartier »
                # par défaut —, comme au contrat.
                lignes: nom_ligne,
                "valeurs": valeurs,
                "total": sum(valeurs.values()),
            }
        )

    return {"colonnes": noms_colonnes, "lignes": resultat}


# --------------------------------------------------------------------------- #
# Résumés
# --------------------------------------------------------------------------- #


def resume_plan_action() -> dict:
    activites = list(Activite.objects.avec_statut())
    total = len(activites)

    effectifs = {}
    for activite in activites:
        effectifs[activite.statut] = effectifs.get(activite.statut, 0) + 1

    # Ordre d'affichage des segments, et **tous** les statuts, y compris à zéro :
    # un anneau dont un segment disparaît quand il tombe à zéro change de
    # couleurs sous les yeux d'une démonstration à l'autre.
    ORDRE_STATUTS = [
        StatutActivite.EN_COURS,
        StatutActivite.TERMINEE,
        StatutActivite.PLANIFIEE,
        StatutActivite.EN_RETARD,
        StatutActivite.SUSPENDUE,
    ]

    charges = {}
    for activite in activites:
        charges[activite.responsable] = charges.get(activite.responsable, 0) + 1

    budget_engage = sum(a.budget_prevu_fcfa for a in activites)
    budget_consomme = sum(a.budget_consomme_fcfa for a in activites)
    terminees = effectifs.get(StatutActivite.TERMINEE, 0)

    return {
        "total": total,
        "par_statut": [
            {"statut": statut, "effectif": effectifs.get(statut, 0)}
            for statut in ORDRE_STATUTS
        ],
        "charge_par_responsable": [
            {"responsable": responsable, "activites": nombre}
            for responsable, nombre in sorted(
                charges.items(), key=lambda paire: -paire[1]
            )
        ],
        "budget_engage_fcfa": budget_engage,
        "budget_consomme_fcfa": budget_consomme,
        "part_consommee": (
            round(budget_consomme / budget_engage * 100) if budget_engage else 0
        ),
        "avancement_moyen": (
            round(sum(a.avancement for a in activites) / total) if total else 0
        ),
        "terminees": terminees,
        # `total − terminees`, compté ici pour que les deux fronts n'en donnent
        # pas chacun sa propre définition.
        "ouvertes": total - terminees,
    }


def resume_financement() -> dict:
    tous = Financement.objects.all()
    remboursables = tous.filter(type_financement__in=TYPES_REMBOURSABLES)

    total_decaisse = tous.aggregate(v=Sum("montant_fcfa"))["v"] or 0
    total_rembourse = tous.aggregate(v=Sum("montant_rembourse_fcfa"))["v"] or 0
    du = remboursables.aggregate(v=Sum("montant_fcfa"))["v"] or 0
    rembourse_sur_remboursables = (
        remboursables.aggregate(v=Sum("montant_rembourse_fcfa"))["v"] or 0
    )

    libelles_type = dict(TypeFinancement.choices)
    montants = {
        ligne["type_financement"]: ligne["v"] or 0
        for ligne in tous.values("type_financement").annotate(v=Sum("montant_fcfa"))
    }
    # Les quatre types, toujours, dans l'ordre du référentiel et avec leur
    # teinte : l'anneau de l'écran garde ainsi les mêmes couleurs aux mêmes
    # postes, qu'un type soit doté ou non.
    par_type = [
        {
            "libelle": libelles_type[type_financement],
            "slug": type_financement,
            "valeur": montants.get(type_financement, 0),
            "part": (
                round(montants.get(type_financement, 0) / total_decaisse * 100)
                if total_decaisse
                else 0
            ),
            "teinte": f"var(--ax-chart-{rang + 1})",
        }
        for rang, type_financement in enumerate(TypeFinancement.values)
    ]

    return {
        "total_decaisse_fcfa": total_decaisse,
        "total_rembourse_fcfa": total_rembourse,
        # Sur les seuls remboursables : rapporter les remboursements aux
        # subventions donnerait un taux structurellement bas et faux.
        "taux_remboursement": (
            round(rembourse_sur_remboursables / du * 100) if du else 0
        ),
        "groupements_finances": tous.values("groupement").distinct().count(),
        "encours_fcfa": max(0, du - rembourse_sur_remboursables),
        "defaillants": tous.filter(statut=StatutFinancement.DEFAILLANT).count(),
        "par_type": par_type,
        "flux_mensuel": flux_mensuel(),
    }


def flux_mensuel(points: int = POINTS_ETINCELLE) -> list[dict]:
    """Décaissements du mois, comparés au même mois de l'exercice précédent."""
    mois_courts = [
        "janv.", "févr.", "mars", "avr.", "mai", "juin",
        "juil.", "août", "sept.", "oct.", "nov.", "déc.",
    ]
    serie = []
    for coupe in dates_de_coupe(points):
        debut_mois = coupe.replace(day=1)
        courant = (
            Financement.objects.filter(
                date_decaissement__gte=debut_mois, date_decaissement__lte=coupe
            ).aggregate(v=Sum("montant_fcfa"))["v"]
            or 0
        )
        precedent = (
            Financement.objects.filter(
                date_decaissement__year=coupe.year - 1,
                date_decaissement__month=coupe.month,
            ).aggregate(v=Sum("montant_fcfa"))["v"]
            or 0
        )
        serie.append(
            {
                "periode": mois_courts[coupe.month - 1],
                "valeur": courant,
                "precedent": precedent,
            }
        )
    return serie


def resume_formations() -> dict:
    """Tout ce que le tableau de bord des formations affiche d'agrégé.

    `participations` et `membres_formes` ne sont pas le même nombre et ne
    doivent jamais être confondus : le premier compte les présences, le second
    les personnes. Un cycle de six sessions suivies par deux cents membres
    produit douze cents participations — l'annoncer comme « 1 200 membres
    formés » sur une commune qui en compte mille sept cents serait un mensonge
    visible à l'œil nu.
    """
    formations = list(Formation.objects.all())
    sessions = list(
        SessionFormation.objects.select_related("formation").prefetch_related(
            "participations"
        )
    )
    tenues = [s for s in sessions if s.statut == StatutSession.TERMINEE]
    a_venir = [s for s in sessions if s.statut == StatutSession.PLANIFIEE]

    participations = sum(s.effectif_present for s in tenues)
    heures = sum(s.formation.duree_heures for s in tenues)
    cout = sum(s.effectif_present * s.formation.cout_par_participant_fcfa for s in tenues)

    identifiants_tenues = [s.pk for s in tenues]
    membres_formes = (
        Participation.objects.filter(present=True, session_id__in=identifiants_tenues)
        .values("membre")
        .distinct()
        .count()
    )
    membres_certifies = Certification.objects.values("membre").distinct().count()

    taux_presence = [s.taux_presence for s in tenues]
    taux_certification = []
    for formation in agregats_formations(Formation.objects.all()):
        presents = formation.nombre_participants or 0
        certifies = formation.nombre_certifies or 0
        taux_certification.append(
            round(certifies / presents * 100) if presents else 0
        )

    # Participants par type de module, les types non représentés écartés :
    # l'anneau n'a pas de segment à zéro à montrer.
    participants_par_type = {}
    for session in tenues:
        type_module = session.formation.type_module
        participants_par_type[type_module] = (
            participants_par_type.get(type_module, 0) + session.effectif_present
        )
    libelles_type = dict(TypeModule.choices)
    par_type = [
        {
            "libelle": libelles_type[type_module],
            "slug": type_module,
            "valeur": participants_par_type.get(type_module, 0),
            "part": (
                round(participants_par_type.get(type_module, 0) / participations * 100)
                if participations
                else 0
            ),
            "teinte": f"var(--ax-chart-{rang + 1})",
        }
        for rang, type_module in enumerate(TypeModule.values)
        if participants_par_type.get(type_module, 0) > 0
    ]

    charge_formateurs = {}
    for session in tenues:
        courant = charge_formateurs.setdefault(
            session.formateur, {"sessions": 0, "participants": 0}
        )
        courant["sessions"] += 1
        courant["participants"] += session.effectif_present

    return {
        "total_modules": len(formations),
        "sessions_tenues": len(tenues),
        "sessions_a_venir": len(a_venir),
        "participations": participations,
        "membres_formes": membres_formes,
        "membres_certifies": membres_certifies,
        "certificats_delivres": Certification.objects.count(),
        "taux_presence_moyen": (
            round(sum(taux_presence) / len(taux_presence)) if taux_presence else 0
        ),
        "taux_certification_moyen": (
            round(sum(taux_certification) / len(taux_certification))
            if taux_certification
            else 0
        ),
        "heures_dispensees": heures,
        "cout_total_fcfa": cout,
        "par_type": par_type,
        "activite_mensuelle": activite_mensuelle(tenues),
        "formateurs": sorted(
            ({"nom": nom, **valeurs} for nom, valeurs in charge_formateurs.items()),
            key=lambda f: (-f["sessions"], -f["participants"]),
        ),
    }


def activite_mensuelle(tenues) -> list[dict]:
    """Sessions achevées et présences, mois par mois, sur douze mois."""
    mois_courts = [
        "janv.", "févr.", "mars", "avr.", "mai", "juin",
        "juil.", "août", "sept.", "oct.", "nov.", "déc.",
    ]
    aujourdhui = date.today()
    resultat = []
    for recul in range(11, -1, -1):
        mois = aujourdhui.month - recul
        annee = aujourdhui.year + (mois - 1) // 12
        mois = (mois - 1) % 12 + 1
        du_mois = [
            s for s in tenues if s.date_fin.year == annee and s.date_fin.month == mois
        ]
        resultat.append(
            {
                "periode": mois_courts[mois - 1],
                "sessions": len(du_mois),
                "participants": sum(s.effectif_present for s in du_mois),
            }
        )
    return resultat



def agregats_formations(queryset):
    """Annote les trois compteurs attendus sur chaque formation."""
    return queryset.annotate(
        nombre_sessions=Count("sessions", distinct=True),
        nombre_participants=Count(
            "sessions__participations",
            filter=Q(sessions__participations__present=True),
            distinct=True,
        ),
        nombre_certifies=Count("certifications", distinct=True),
    )


# --------------------------------------------------------------------------- #
# Recherche transverse
# --------------------------------------------------------------------------- #


def recherche_globale(requete: str, limite: int = 8) -> list[dict]:
    """Recherche tous types confondus, en un seul appel.

    La palette ⌘K se déclenche à chaque frappe : six appels parallèles la
    rendraient inutilisable (`15-CONTRAT-API.md` §10).
    """
    requete = (requete or "").strip()
    if not requete:
        return []

    resultats: list[dict] = []
    reste = limite

    def ajouter(objets, fabrique):
        nonlocal reste
        for objet in objets[: max(0, reste)]:
            resultats.append(fabrique(objet))
        reste = limite - len(resultats)

    ajouter(
        Groupement.objects.avec_agregats().filter(nom__unaccent__icontains=requete),
        lambda g: {
            "type": "groupement",
            "titre": g.nom,
            "sousTitre": f"{g.filiere.nom} · {g.quartier.nom} · {g.nombre_membres} membres",
            "lien": f"/groupements/{g.slug}",
            "icone": "users-group",
        },
    )
    ajouter(
        Production.objects.avec_liens().filter(nom__unaccent__icontains=requete),
        lambda p: {
            "type": "production",
            "titre": p.nom,
            "sousTitre": f"{p.groupement.nom} · {p.prix_unitaire_fcfa} FCFA / {p.unite}",
            "lien": f"/productions/{p.slug}",
            "icone": "package",
        },
    )
    ajouter(
        Membre.objects.select_related("groupement").filter(
            nom_complet_cache__unaccent__icontains=requete
        ),
        lambda m: {
            "type": "membre",
            "titre": m.nom_complet,
            "sousTitre": f"{m.role} · {m.groupement.nom}",
            "lien": f"/groupements/{m.groupement.slug}",
            "icone": "user",
        },
    )
    ajouter(
        Activite.objects.avec_statut().filter(intitule__unaccent__icontains=requete),
        lambda a: {
            "type": "activite",
            "titre": a.intitule,
            "sousTitre": f"{a.code} · {a.responsable} · {a.avancement} %",
            "lien": f"/activites/{a.code}",
            "icone": "checklist",
        },
    )
    ajouter(
        Formation.objects.filter(nom__unaccent__icontains=requete),
        lambda f: {
            "type": "formation",
            "titre": f.nom,
            "sousTitre": f"{f.get_type_module_display()} · {f.duree_heures} h",
            "lien": f"/formations/{f.slug}",
            "icone": "school",
        },
    )
    ajouter(
        Indicateur.objects.select_related("resultat").filter(
            Q(intitule__unaccent__icontains=requete) | Q(code__icontains=requete)
        ),
        lambda i: {
            "type": "indicateur",
            "titre": i.intitule,
            "sousTitre": f"{i.code} · {i.taux_atteinte} % de la cible",
            "lien": f"/indicateurs/{i.code}",
            "icone": "chart-dots",
        },
    )

    return resultats[:limite]
