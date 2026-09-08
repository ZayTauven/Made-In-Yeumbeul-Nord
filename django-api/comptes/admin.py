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

    actions = ["envoyer_lien_reinitialisation"]

    @admin.display(description="nom complet")
    def nom_complet(self, obj) -> str:
        return obj.nom_complet

    @admin.action(description="Envoyer un lien de réinitialisation du mot de passe")
    def envoyer_lien_reinitialisation(self, request, queryset):
        """Le geste courant à la mairie : un agent a perdu son mot de passe.

        Passe par le même jeton que la route publique — donc même durée de
        validité et même usage unique.
        """
        from django.conf import settings
        from django.contrib import messages
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.encoding import force_bytes
        from django.utils.http import urlsafe_base64_encode

        from .courriels import envoyer_mot_de_passe_oublie

        envoyes, sans_adresse, echecs = 0, [], []
        for compte in queryset:
            if not compte.email:
                sans_adresse.append(compte.get_username())
                continue
            uid = urlsafe_base64_encode(force_bytes(compte.pk))
            jeton = default_token_generator.make_token(compte)
            lien = (
                f"{settings.FRONT_ADMIN_URL}/auth/create-password-cover"
                f"?uid={uid}&jeton={jeton}"
            )
            if envoyer_mot_de_passe_oublie(compte, lien):
                envoyes += 1
            else:
                echecs.append(compte.get_username())

        if envoyes:
            self.message_user(request, f"{envoyes} lien(s) envoyé(s).", messages.SUCCESS)
        if sans_adresse:
            self.message_user(
                request,
                "Aucune adresse de courriel : " + ", ".join(sans_adresse),
                messages.WARNING,
            )
        if echecs:
            self.message_user(
                request,
                "Envoi impossible pour : " + ", ".join(echecs),
                messages.ERROR,
            )
