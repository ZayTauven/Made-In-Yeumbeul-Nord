"""
Vues d'authentification.

Le transport est la **session Django**, décision arrêtée contre JWT : rien à
stocker dans le navigateur, et une révocation prend effet immédiatement —
supprimer la session suffit, là où un jeton signé reste valable jusqu'à son
échéance sauf à tenir une liste noire.

Enchaînement attendu côté front :

    GET  /api/auth/csrf/         → récupère le jeton, à placer en en-tête
                                   `X-CSRFToken` de toute écriture
    POST /api/auth/connexion/    → pose le cookie de session
    GET  /api/auth/moi/          → profil du compte connecté
    POST /api/auth/deconnexion/  → détruit la session

Les appels doivent porter `credentials: "include"` : sans cela le navigateur
n'envoie pas le cookie, et l'API répondra 403 sur toutes les écritures.
"""

from django.conf import settings
from django.contrib.auth import (
    authenticate,
    get_user_model,
    login,
    logout,
    update_session_auth_hash,
)
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ObjectDoesNotExist
from django.core.exceptions import ValidationError as ValidationDjango
from django.db.models import Q
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.views.decorators.debug import sensitive_post_parameters
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from api.permissions import EstAuthentifie
from api.serialiseurs.comptes import (
    ChangementMotDePasseSerializer,
    ConnexionSerializer,
    DemandeReinitialisationSerializer,
    JetonCsrfSerializer,
    ProfilSerializer,
    ReinitialisationSerializer,
)
from comptes.courriels import envoyer_mot_de_passe_modifie, envoyer_mot_de_passe_oublie
from core.models import EvenementJournal
from core.referentiels import CategorieJournal


class JetonCsrfView(APIView):
    """Rend le jeton CSRF et dépose son cookie.

    Le jeton passe par le corps de la réponse et non par une lecture du cookie :
    celui-ci est `HttpOnly`, donc invisible au JavaScript. C'est voulu — un
    jeton CSRF que n'importe quel script injecté pourrait lire ne protégerait
    plus de grand-chose. Django, lui, compare de son côté l'en-tête au cookie.
    """

    authentication_classes = []
    permission_classes = []

    @extend_schema(responses=JetonCsrfSerializer)
    def get(self, request):
        return Response({"jeton_csrf": get_token(request)})


# Le décorateur s'applique à `dispatch` et non à `post` : DRF passe à `post` sa
# propre `Request`, alors que `sensitive_post_parameters` exige une `HttpRequest`
# native — celle que reçoit encore `dispatch`.
@method_decorator(sensitive_post_parameters("mot_de_passe"), name="dispatch")
class ConnexionView(APIView):
    """Ouvre une session.

    Limitée à dix tentatives par minute et par adresse : c'est la seule porte
    de l'API qu'on cherche à forcer.
    """

    authentication_classes = []
    permission_classes = []
    throttle_scope = "connexion"

    @extend_schema(request=ConnexionSerializer, responses=ProfilSerializer)
    def post(self, request):
        entree = ConnexionSerializer(data=request.data)
        entree.is_valid(raise_exception=True)

        compte = authenticate(
            request,
            username=entree.validated_data["identifiant"],
            password=entree.validated_data["mot_de_passe"],
        )

        if compte is None:
            # Un message unique pour un identifiant inconnu comme pour un mot de
            # passe erroné : distinguer les deux renseignerait sur les comptes
            # existants.
            return Response(
                {"detail": "Identifiant ou mot de passe incorrect."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        login(request, compte)
        EvenementJournal.objects.create(
            acteur=compte.nom_complet or compte.username,
            acteur_teinte=compte.avatar_teinte,
            action="Connexion au back-office",
            cible=compte.get_role_display(),
            categorie=CategorieJournal.SYSTEME,
        )
        return Response(ProfilSerializer(compte).data)


class DeconnexionView(APIView):
    """Détruit la session.

    Répond 204 même sans session ouverte : se déconnecter deux fois n'est pas
    une erreur, et le front n'a pas à s'en préoccuper.
    """

    permission_classes = []

    @extend_schema(request=None, responses={204: None})
    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProfilView(APIView):
    """Le compte connecté.

    Le front s'en sert au chargement pour savoir s'il doit afficher le
    back-office ou renvoyer vers l'écran de connexion.
    """

    permission_classes = [EstAuthentifie]

    @extend_schema(responses=ProfilSerializer)
    def get(self, request):
        return Response(ProfilSerializer(request.user).data)


@method_decorator(
    sensitive_post_parameters("mot_de_passe_actuel", "nouveau_mot_de_passe"),
    name="dispatch",
)
class ChangementMotDePasseView(APIView):
    """Change le mot de passe du compte connecté."""

    permission_classes = [EstAuthentifie]

    @extend_schema(request=ChangementMotDePasseSerializer, responses={204: None})
    def post(self, request):
        entree = ChangementMotDePasseSerializer(
            data=request.data, context={"request": request}
        )
        entree.is_valid(raise_exception=True)

        request.user.set_password(entree.validated_data["nouveau_mot_de_passe"])
        request.user.save(update_fields=["password"])
        # Sans cela, changer son mot de passe déconnecte l'agent qui vient de le
        # faire : l'empreinte de session ne correspondrait plus.
        update_session_auth_hash(request, request.user)

        EvenementJournal.objects.create(
            acteur=request.user.nom_complet or request.user.username,
            acteur_teinte=request.user.avatar_teinte,
            action="Changement de mot de passe",
            cible=request.user.username,
            categorie=CategorieJournal.SYSTEME,
        )
        # Avertir même quand l'agent est à l'origine du changement : c'est ce
        # message qui alerte le titulaire légitime quand ce n'est pas le cas.
        envoyer_mot_de_passe_modifie(request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class DemandeReinitialisationView(APIView):
    """Envoie un lien de réinitialisation.

    Répond **204 dans tous les cas**, compte connu ou non. Distinguer les deux
    transformerait cette route en annuaire : il suffirait d'y essayer des
    adresses pour savoir lesquelles ont un compte.
    """

    authentication_classes = []
    permission_classes = []
    throttle_scope = "connexion"

    @extend_schema(request=DemandeReinitialisationSerializer, responses={204: None})
    def post(self, request):
        entree = DemandeReinitialisationSerializer(data=request.data)
        entree.is_valid(raise_exception=True)
        identifiant = entree.validated_data["identifiant"].strip()

        Utilisateur = get_user_model()
        compte = Utilisateur.objects.filter(
            Q(username__iexact=identifiant)
            | Q(email__iexact=identifiant)
            | Q(telephone=identifiant),
            is_active=True,
        ).first()

        if compte is not None and compte.email:
            uid = urlsafe_base64_encode(force_bytes(compte.pk))
            jeton = default_token_generator.make_token(compte)
            lien = (
                f"{settings.FRONT_ADMIN_URL}/auth/reinitialiser"
                f"?uid={uid}&jeton={jeton}"
            )
            envoyer_mot_de_passe_oublie(compte, lien)

        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(
    sensitive_post_parameters("nouveau_mot_de_passe"), name="dispatch"
)
class ReinitialisationView(APIView):
    """Consomme le lien reçu par courriel et pose le nouveau mot de passe."""

    authentication_classes = []
    permission_classes = []
    throttle_scope = "connexion"

    @extend_schema(request=ReinitialisationSerializer, responses={204: None})
    def post(self, request):
        entree = ReinitialisationSerializer(data=request.data)
        entree.is_valid(raise_exception=True)

        compte = self._compte_du_lien(entree.validated_data["uid"])
        if compte is None or not default_token_generator.check_token(
            compte, entree.validated_data["jeton"]
        ):
            return Response(
                {
                    "detail": (
                        "Ce lien n'est plus valable. Demandez-en un nouveau "
                        "depuis la page de connexion."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        nouveau = entree.validated_data["nouveau_mot_de_passe"]
        try:
            # Second passage, cette fois avec le compte : il refuse un mot de
            # passe trop proche du nom ou du courriel du titulaire.
            validate_password(nouveau, user=compte)
        except ValidationDjango as erreur:
            return Response(
                {"nouveau_mot_de_passe": list(erreur.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        compte.set_password(nouveau)
        compte.save(update_fields=["password"])

        EvenementJournal.objects.create(
            acteur=compte.nom_complet or compte.username,
            acteur_teinte=compte.avatar_teinte,
            action="Réinitialisation du mot de passe",
            cible=compte.username,
            categorie=CategorieJournal.SYSTEME,
        )
        envoyer_mot_de_passe_modifie(compte)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @staticmethod
    def _compte_du_lien(uid: str):
        """Retrouve le compte depuis l'identifiant encodé du lien."""
        try:
            cle = force_str(urlsafe_base64_decode(uid))
            return get_user_model().objects.get(pk=cle, is_active=True)
        except (TypeError, ValueError, OverflowError, ObjectDoesNotExist):
            return None
