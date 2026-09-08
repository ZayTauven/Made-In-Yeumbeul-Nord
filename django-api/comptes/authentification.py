"""
Backend d'authentification.

Il accepte comme identifiant l'un des trois : `username`, courriel ou téléphone.
Sur le terrain, un agent municipal retient plus sûrement son numéro que
l'identifiant qu'on lui a attribué, et tous n'ont pas d'adresse
professionnelle. Refuser un numéro correct au motif que le champ attendait un
identifiant serait une friction gratuite le jour de la démonstration.
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.db.models import Q


class IdentifiantSouple(ModelBackend):
    """`ModelBackend` acceptant trois formes d'identifiant."""

    def authenticate(self, request, username=None, password=None, **kwargs):
        Utilisateur = get_user_model()
        identifiant = username or kwargs.get(Utilisateur.USERNAME_FIELD)

        if identifiant is None or password is None:
            return None

        comptes = Utilisateur.objects.filter(
            Q(username__iexact=identifiant)
            | Q(email__iexact=identifiant)
            | Q(telephone=identifiant)
        )

        # Une correspondance ambiguë — le courriel de l'un servant d'identifiant
        # à l'autre — ne doit désigner personne plutôt que le mauvais compte.
        if comptes.count() != 1:
            if not comptes.exists():
                # Un mot de passe est tout de même vérifié à vide : sans cela,
                # la réponse revient plus vite pour un identifiant inconnu que
                # pour un identifiant connu, ce qui permet de les distinguer.
                Utilisateur().set_password(password)
            return None

        compte = comptes.first()
        if compte.check_password(password) and self.user_can_authenticate(compte):
            return compte
        return None
