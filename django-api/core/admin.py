"""
Interface d'administration.

Elle sert la saisie et la reprise de données par les agents de la commune, pas la
démonstration : les écrans montrés au Maire sont ceux des deux fronts. Elle reste
donc sobre — des listes lisibles, des filtres utiles, et rien de plus.
"""

from django.contrib import admin

from .models import (
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

admin.site.site_header = "Made in Yeumbeul Nord — administration"
admin.site.site_title = "Made in Yeumbeul Nord"
admin.site.index_title = "Suivi-évaluation des groupements"


# --------------------------------------------------------------------------- #
# Territoire
# --------------------------------------------------------------------------- #


@admin.register(Commune)
class CommuneAdmin(admin.ModelAdmin):
    list_display = ["nom", "telephone", "email"]
    prepopulated_fields = {"slug": ["nom"]}


@admin.register(Quartier)
class QuartierAdmin(admin.ModelAdmin):
    list_display = ["nom", "population_estimee", "nombre_groupements"]
    search_fields = ["nom"]
    prepopulated_fields = {"slug": ["nom"]}

    def get_queryset(self, request):
        from django.db.models import Count

        return super().get_queryset(request).annotate(n=Count("groupements"))

    @admin.display(description="groupements", ordering="n")
    def nombre_groupements(self, obj) -> int:
        return obj.n


@admin.register(Filiere)
class FiliereAdmin(admin.ModelAdmin):
    list_display = ["nom", "icone", "teinte"]
    search_fields = ["nom"]
    prepopulated_fields = {"slug": ["nom"]}


# --------------------------------------------------------------------------- #
# Groupements
# --------------------------------------------------------------------------- #


class MembreInline(admin.TabularInline):
    model = Membre
    extra = 0
    fields = ["prenom", "nom_famille", "genre", "role", "est_responsable", "telephone"]


@admin.register(Groupement)
class GroupementAdmin(admin.ModelAdmin):
    list_display = [
        "nom",
        "quartier",
        "filiere",
        "etape",
        "statut_juridique",
        "etat_validation",
    ]
    list_filter = ["etape", "statut_juridique", "etat_validation", "quartier", "filiere"]
    search_fields = ["nom", "ninea", "description"]
    prepopulated_fields = {"slug": ["nom"]}
    autocomplete_fields = ["quartier", "filiere"]
    filter_horizontal = ["filieres_secondaires"]
    inlines = [MembreInline]
    list_select_related = ["quartier", "filiere"]


@admin.register(Membre)
class MembreAdmin(admin.ModelAdmin):
    list_display = ["nom_complet", "groupement", "role", "genre", "est_responsable"]
    list_filter = ["genre", "est_responsable", "groupement__quartier"]
    search_fields = ["prenom", "nom_famille", "telephone"]
    list_select_related = ["groupement"]


@admin.register(Production)
class ProductionAdmin(admin.ModelAdmin):
    list_display = [
        "nom",
        "groupement",
        "filiere",
        "prix_unitaire_fcfa",
        "stock_disponible",
        "etat_validation",
    ]
    list_filter = ["filiere", "etat_validation"]
    search_fields = ["nom", "description", "groupement__nom"]
    prepopulated_fields = {"slug": ["nom"]}
    autocomplete_fields = ["groupement", "filiere"]
    list_select_related = ["groupement", "filiere"]


# --------------------------------------------------------------------------- #
# Suivi-évaluation
# --------------------------------------------------------------------------- #


class ResultatInline(admin.TabularInline):
    model = ResultatAttendu
    extra = 0
    fields = ["code", "intitule", "rang"]


@admin.register(AxeStrategique)
class AxeStrategiqueAdmin(admin.ModelAdmin):
    list_display = ["code", "intitule", "avancement"]
    inlines = [ResultatInline]


class ReleveInline(admin.TabularInline):
    model = ReleveIndicateur
    extra = 0
    fields = ["rang", "periode", "valeur", "precedent"]


@admin.register(Indicateur)
class IndicateurAdmin(admin.ModelAdmin):
    list_display = [
        "code",
        "intitule",
        "valeur_actuelle",
        "valeur_cible",
        "sens",
        "taux_atteinte",
    ]
    list_filter = ["sens", "periodicite", "ventile_par_genre", "resultat__axe"]
    search_fields = ["code", "intitule"]
    inlines = [ReleveInline]
    list_select_related = ["resultat"]


@admin.register(ResultatAttendu)
class ResultatAttenduAdmin(admin.ModelAdmin):
    list_display = ["code", "intitule", "axe", "avancement"]
    list_select_related = ["axe"]


class JalonInline(admin.TabularInline):
    model = Jalon
    extra = 0
    fields = ["intitule", "date_prevue", "date_reelle", "decisif"]


@admin.register(Activite)
class ActiviteAdmin(admin.ModelAdmin):
    list_display = [
        "code",
        "intitule",
        "responsable",
        "date_debut",
        "date_fin",
        "avancement",
        "statut_lisible",
    ]
    list_filter = ["axe", "suspendue"]
    search_fields = ["code", "intitule", "responsable"]
    filter_horizontal = ["quartiers", "filieres"]
    inlines = [JalonInline]
    list_select_related = ["axe"]

    @admin.display(description="statut")
    def statut_lisible(self, obj) -> str:
        return obj.statut_calcule()


@admin.register(Jalon)
class JalonAdmin(admin.ModelAdmin):
    list_display = ["intitule", "activite", "date_prevue", "date_reelle", "decisif"]
    list_filter = ["decisif"]
    list_select_related = ["activite"]


# --------------------------------------------------------------------------- #
# Formations
# --------------------------------------------------------------------------- #


@admin.register(Formation)
class FormationAdmin(admin.ModelAdmin):
    list_display = ["nom", "type_module", "filiere", "duree_heures"]
    list_filter = ["type_module", "filiere"]
    search_fields = ["nom"]
    prepopulated_fields = {"slug": ["nom"]}


class ParticipationInline(admin.TabularInline):
    model = Participation
    extra = 0
    autocomplete_fields = ["membre"]


@admin.register(SessionFormation)
class SessionFormationAdmin(admin.ModelAdmin):
    list_display = [
        "formation",
        "date_debut",
        "quartier",
        "formateur",
        "effectif_cible",
        "annulee",
    ]
    list_filter = ["formation", "quartier", "annulee"]
    inlines = [ParticipationInline]
    list_select_related = ["formation", "quartier"]


@admin.register(Certification)
class CertificationAdmin(admin.ModelAdmin):
    list_display = ["numero_certificat", "membre", "formation", "score", "date_certification"]
    list_filter = ["formation"]
    search_fields = ["numero_certificat", "membre__nom_complet_cache"]
    list_select_related = ["membre", "formation"]


# --------------------------------------------------------------------------- #
# Financement
# --------------------------------------------------------------------------- #


@admin.register(Financement)
class FinancementAdmin(admin.ModelAdmin):
    list_display = [
        "reference",
        "groupement",
        "type_financement",
        "montant_fcfa",
        "montant_rembourse_fcfa",
        "statut",
    ]
    list_filter = ["type_financement", "statut", "bailleur"]
    search_fields = ["reference", "groupement__nom", "objet"]
    autocomplete_fields = ["groupement"]
    list_select_related = ["groupement"]


@admin.register(MouvementFinancier)
class MouvementFinancierAdmin(admin.ModelAdmin):
    list_display = ["reference", "libelle", "montant_fcfa", "date", "moyen", "statut"]
    list_filter = ["moyen", "statut", "categorie"]
    search_fields = ["reference", "libelle", "contrepartie"]


# --------------------------------------------------------------------------- #
# Commerce et contenus
# --------------------------------------------------------------------------- #


@admin.register(Boutique)
class BoutiqueAdmin(admin.ModelAdmin):
    list_display = ["nom", "quartier", "responsable", "telephone"]
    list_select_related = ["quartier"]


class LigneCommandeInline(admin.TabularInline):
    model = LigneCommande
    extra = 0
    autocomplete_fields = ["production"]


@admin.register(Commande)
class CommandeAdmin(admin.ModelAdmin):
    list_display = ["numero", "client_nom", "statut", "moyen_paiement", "created_at"]
    list_filter = ["statut", "moyen_paiement"]
    search_fields = ["numero", "client_nom", "client_telephone"]
    inlines = [LigneCommandeInline]


@admin.register(Actualite)
class ActualiteAdmin(admin.ModelAdmin):
    list_display = ["titre", "categorie", "auteur", "date_publication", "publiee"]
    list_filter = ["categorie", "publiee"]
    search_fields = ["titre", "chapeau"]
    prepopulated_fields = {"slug": ["titre"]}


@admin.register(EvenementJournal)
class EvenementJournalAdmin(admin.ModelAdmin):
    list_display = ["horodatage", "acteur", "action", "cible", "categorie"]
    list_filter = ["categorie"]
    search_fields = ["acteur", "action", "cible"]
    # La piste d'audit se consulte, elle ne se retouche pas.
    readonly_fields = [
        "acteur", "acteur_teinte", "action", "cible", "cible_lien",
        "horodatage", "categorie",
    ]

    def has_add_permission(self, request) -> bool:
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        return False
