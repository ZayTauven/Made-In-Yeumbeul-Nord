"""Administration des comptes."""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Utilisateur


@admin.register(Utilisateur)
class UtilisateurAdmin(UserAdmin):
    """Administration des comptes, calquée sur celle de Django.

    On hérite de `UserAdmin` plutôt que de repartir d'un `ModelAdmin` : c'est
    lui qui porte le formulaire de mot de passe haché. Un `ModelAdmin` ordinaire
    afficherait l'empreinte dans un champ texte et l'enregistrerait telle
    quelle, rendant le compte inutilisable.
    """

    list_display = ["username", "nom_complet", "role", "fonction", "is_active"]
    list_filter = ["role", "is_active", "is_superuser"]
    search_fields = ["username", "first_name", "last_name", "email", "telephone"]
    ordering = ["last_name", "first_name", "username"]

    fieldsets = UserAdmin.fieldsets + (
        (
            "Profil du projet",
            {"fields": ("role", "telephone", "fonction", "avatar_teinte")},
        ),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (
            "Profil du projet",
            {"fields": ("first_name", "last_name", "role", "telephone", "fonction")},
        ),
    )

    @admin.display(description="nom complet")
    def nom_complet(self, obj) -> str:
        return obj.nom_complet
