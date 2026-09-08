"""Sérialiseurs des comptes et de l'authentification."""

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as ValidationDjango
from rest_framework import serializers

Utilisateur = get_user_model()


class ProfilSerializer(serializers.ModelSerializer):
    """Le compte connecté, tel que l'affiche l'en-tête du back-office.

    Ni mot de passe, ni empreinte, ni indicateur interne : ce que sert cette
    forme finit dans le navigateur.
    """

    nom_complet = serializers.CharField(read_only=True)
    initiales = serializers.CharField(read_only=True)
    est_administrateur = serializers.BooleanField(read_only=True)
    peut_ecrire = serializers.BooleanField(read_only=True)

    class Meta:
        model = Utilisateur
        fields = [
            "id",
            "username",
            "email",
            "telephone",
            "first_name",
            "last_name",
            "nom_complet",
            "initiales",
            "fonction",
            "role",
            "avatar_teinte",
            "est_administrateur",
            "peut_ecrire",
            "last_login",
        ]
        read_only_fields = fields


class ConnexionSerializer(serializers.Serializer):
    """Corps de `POST /api/auth/connexion/`.

    `identifiant` accepte indifféremment l'identifiant, le courriel ou le
    téléphone (voir `core.authentification.IdentifiantSouple`).
    """

    identifiant = serializers.CharField(write_only=True)
    mot_de_passe = serializers.CharField(
        write_only=True, style={"input_type": "password"}
    )


class ChangementMotDePasseSerializer(serializers.Serializer):
    """Corps de `POST /api/auth/mot-de-passe/`."""

    mot_de_passe_actuel = serializers.CharField(
        write_only=True, style={"input_type": "password"}
    )
    nouveau_mot_de_passe = serializers.CharField(
        write_only=True, style={"input_type": "password"}
    )

    def validate_mot_de_passe_actuel(self, valeur):
        """Vérifier l'actuel empêche qu'un poste laissé ouvert serve à changer
        le mot de passe et à confisquer le compte."""
        utilisateur = self.context["request"].user
        if not utilisateur.check_password(valeur):
            raise serializers.ValidationError("Le mot de passe actuel est incorrect.")
        return valeur

    def validate_nouveau_mot_de_passe(self, valeur):
        utilisateur = self.context["request"].user
        try:
            validate_password(valeur, user=utilisateur)
        except ValidationDjango as erreur:
            raise serializers.ValidationError(list(erreur.messages))
        return valeur

    def validate(self, donnees):
        if donnees["mot_de_passe_actuel"] == donnees["nouveau_mot_de_passe"]:
            raise serializers.ValidationError(
                {"nouveau_mot_de_passe": ["Le nouveau mot de passe doit différer de l'actuel."]}
            )
        return donnees


class JetonCsrfSerializer(serializers.Serializer):
    """Réponse de `GET /api/auth/csrf/`."""

    jeton_csrf = serializers.CharField(read_only=True)
