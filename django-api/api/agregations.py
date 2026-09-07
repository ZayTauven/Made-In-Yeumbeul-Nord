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
    StatutActivite,
    StatutFinancement,
    Tendance,
    TypeFinancement,
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
# Indicateurs d'en-tête
# --------------------------------------------------------------------------- #


def kpis_generaux() -> list[dict]:
    """Les cartes du tableau de bord principal."""
    groupements = Groupement.objects.all()
    autonomes = groupements.filter(
        etape__in=[EtapeAccompagnement.EN_PRODUCTION, EtapeAccompagnement.AUTONOME]
    )

    serie_groupements = serie_par_date(groupements, "date_creation")
    serie_membres = serie_par_date(Membre.objects.all(), "date_adhesion")
    serie_decaisse = serie_par_date(
        Financement.objects.all(), "date_decaissement", agregat=Sum("montant_fcfa")
    )
    serie_productions = serie_par_date(Production.objects.all(), "date_ajout")
    serie_autonomes = serie_par_date(autonomes, "date_creation")

    return [
        construire_kpi(
            "groupements", "Groupements accompagnés", serie_groupements, "groupements",
            formater_entier, cible=100,
        ),
        construire_kpi(
            "membres", "Membres recensés", serie_membres, "membres", formater_entier,
        ),
        construire_kpi(
            "decaissements", "Montant décaissé", serie_decaisse, "FCFA", formater_fcfa,
        ),
        construire_kpi(
            "productions", "Productions au catalogue", serie_productions,
            "productions", formater_entier,
        ),
        construire_kpi(
            "autonomie", "Groupements en production ou autonomes", serie_autonomes,
            "groupements", formater_entier,
        ),
    ]


def kpis_plan_action() -> list[dict]:
    """Les quatre cartes du tableau de bord de suivi.

    La série applique à chaque date passée le **même prédicat** que la valeur
    courante : une activité est comptée « en retard » à une date donnée selon son
    statut à cette date-là, pas selon son statut d'aujourd'hui.
    """
    activites = list(Activite.objects.all())
    coupes = dates_de_coupe()

    serie_total, serie_terminees, serie_retard, serie_avancement = [], [], [], []
    for coupe in coupes:
        ouvertes_a_la_date = [a for a in activites if a.date_debut <= coupe]
        statuts = [a.statut_calcule(coupe) for a in ouvertes_a_la_date]
        serie_total.append(len(ouvertes_a_la_date))
        serie_terminees.append(statuts.count(StatutActivite.TERMINEE))
        serie_retard.append(statuts.count(StatutActivite.EN_RETARD))
        avancements = [a.avancement for a in ouvertes_a_la_date]
        serie_avancement.append(
            round(sum(avancements) / len(avancements)) if avancements else 0
        )

    return [
        construire_kpi(
            "activites_ouvertes", "Activités engagées", serie_total, "activités",
            formater_entier,
        ),
        construire_kpi(
            "activites_terminees", "Activités terminées", serie_terminees,
            "activités", formater_entier,
        ),
        construire_kpi(
            # Un indicateur qu'on cherche à faire baisser : sans `sens`, une
            # diminution des retards s'afficherait en rouge.
            "activites_en_retard", "Activités en retard", serie_retard, "activités",
            formater_entier, sens="decroissant",
        ),
        construire_kpi(
            "avancement_moyen", "Avancement moyen", serie_avancement, "%",
            formater_pourcentage, cible=100, delta_en_points=True,
        ),
    ]


def kpis_formations() -> list[dict]:
    """Les cartes de l'écran formations."""
    serie_sessions = serie_par_date(SessionFormation.objects.all(), "date_debut")
    serie_certifications = serie_par_date(
        Certification.objects.all(), "date_certification"
    )
    serie_presences = serie_par_date(
        Participation.objects.filter(present=True), "session__date_debut"
    )

    coupes = dates_de_coupe()
    serie_taux = []
    for coupe in coupes:
        presents = Participation.objects.filter(
            present=True, session__date_debut__lte=coupe
        ).count()
        certifies = Certification.objects.filter(
            date_certification__lte=coupe
        ).count()
        serie_taux.append(round(certifies / presents * 100) if presents else 0)

    return [
        construire_kpi(
            "sessions", "Sessions tenues", serie_sessions, "sessions", formater_entier,
        ),
        construire_kpi(
            "participants", "Présences enregistrées", serie_presences, "présences",
            formater_entier,
        ),
        construire_kpi(
            "certifications", "Certificats délivrés", serie_certifications,
            "certificats", formater_entier,
        ),
        construire_kpi(
            "taux_certification", "Taux de certification", serie_taux, "%",
            formater_pourcentage, cible=80, delta_en_points=True,
        ),
    ]


# --------------------------------------------------------------------------- #
# Répartitions et entonnoir
# --------------------------------------------------------------------------- #


def entonnoir() -> list[dict]:
    """Effectif et part par étape d'accompagnement, dans l'ordre canonique.

    L'ordre est celui du référentiel, pas celui des effectifs : un entonnoir
    trié par volume ne raconte plus un parcours.
    """
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

    charges = {}
    for activite in activites:
        charges[activite.responsable] = charges.get(activite.responsable, 0) + 1

    budget_engage = sum(a.budget_prevu_fcfa for a in activites)
    budget_consomme = sum(a.budget_consomme_fcfa for a in activites)
    terminees = effectifs.get(StatutActivite.TERMINEE, 0)

    return {
        "total": total,
        "par_statut": [
            {"statut": statut, "effectif": effectif}
            for statut, effectif in sorted(effectifs.items())
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
    par_type = []
    for ligne in tous.values("type_financement").annotate(v=Sum("montant_fcfa")):
        valeur = ligne["v"] or 0
        par_type.append(
            {
                "libelle": libelles_type.get(
                    ligne["type_financement"], ligne["type_financement"]
                ),
                "slug": ligne["type_financement"],
                "valeur": valeur,
                "part": round(valeur / total_decaisse * 100) if total_decaisse else 0,
            }
        )

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
    presences = Participation.objects.filter(present=True).count()
    certifies = Certification.objects.count()
    sessions = SessionFormation.objects.all()

    taux_presence = [
        session.taux_presence
        for session in sessions.prefetch_related("participations")
    ]

    return {
        "total_formations": Formation.objects.count(),
        "total_sessions": sessions.count(),
        "total_participants": presences,
        "total_certifies": certifies,
        # Sur les participations réelles, jamais sur une estimation : l'écran
        # affiche le taux et la liste des certifiés côte à côte.
        "taux_certification": round(certifies / presences * 100) if presences else 0,
        "taux_presence_moyen": (
            round(sum(taux_presence) / len(taux_presence)) if taux_presence else 0
        ),
    }


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
