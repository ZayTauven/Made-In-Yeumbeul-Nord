"""
Courriels des comptes.

Un seul point d'envoi, `_envoyer()`, qui monte le message et y **joint** les
illustrations. Elles ne sont pas chargées depuis un serveur : la plupart des
clients de messagerie bloquent les images distantes par défaut, et la plateforme
doit tenir sans connexion (CLAUDE.md §5). Le gabarit les référence donc par
`src="cid:nom-du-fichier.png"`.

Chaque courriel part en deux versions, texte et HTML. Le texte n'est pas produit
en dépouillant le HTML — cela donnerait une bouillie d'espaces — mais rédigé à
part, court et suffisant.

**Un échec d'envoi ne fait jamais échouer la requête.** Il est journalisé et la
vue poursuit : un serveur SMTP indisponible ne doit pas empêcher un agent de
changer son mot de passe, ni révéler par un code d'erreur qu'une adresse existe.
"""

from __future__ import annotations

import logging
from datetime import date
from email.mime.image import MIMEImage
from pathlib import Path

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone

journal = logging.getLogger(__name__)

#: Les illustrations vivent hors de `staticfiles/` : elles ne sont jamais
#: servies par HTTP, seulement lues sur disque pour être jointes.
DOSSIER_ILLUSTRATIONS = settings.BASE_DIR / "static" / "emails" / "illustrations"

NOM_EXPEDITEUR = "Made in Yeumbeul Nord"

SUJETS = {
    "compte_cree": "Votre compte Made in Yeumbeul Nord est actif",
    "acces_suspendu": "Votre accès à Made in Yeumbeul Nord a été suspendu",
    "mot_de_passe_oublie": "Réinitialisez votre mot de passe",
    "mot_de_passe_provisoire": "Un mot de passe provisoire vous a été attribué",
    "mot_de_passe_modifie": "Votre mot de passe a été modifié",
}


def _contexte_commun(utilisateur) -> dict:
    """Variables présentes dans tous les gabarits."""
    return {
        "prenom": utilisateur.first_name or utilisateur.get_username(),
        "nom_expediteur": NOM_EXPEDITEUR,
        "base_url": settings.FRONT_ADMIN_URL,
        "annee": date.today().year,
    }


def _joindre_illustration(message, nom_fichier: str) -> None:
    """Attache une illustration et lui donne le Content-ID attendu par le gabarit.

    Le Content-ID s'écrit entre chevrons dans l'en-tête, et sans chevrons dans
    le `src` du gabarit. Une image manquante n'interrompt pas l'envoi : le
    courriel part sans sa vignette, ce qui vaut mieux qu'un message perdu.
    """
    chemin = Path(DOSSIER_ILLUSTRATIONS) / nom_fichier
    if not chemin.is_file():
        journal.warning("Illustration de courriel introuvable : %s", chemin)
        return

    image = MIMEImage(chemin.read_bytes())
    image.add_header("Content-ID", f"<{nom_fichier}>")
    image.add_header("Content-Disposition", "inline", filename=nom_fichier)
    message.attach(image)


def _envoyer(
    cle: str,
    gabarit: str,
    destinataire: str,
    contexte: dict,
    illustration: str,
    texte: str,
) -> bool:
    """Monte et expédie un courriel. Renvoie `False` si l'envoi a échoué."""
    if not destinataire:
        journal.info("Courriel « %s » non envoyé : aucune adresse.", cle)
        return False

    message = EmailMultiAlternatives(
        subject=SUJETS[cle],
        body=texte,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[destinataire],
    )
    message.attach_alternative(render_to_string(gabarit, contexte), "text/html")
    # « related » indique au client que les pièces jointes appartiennent au
    # corps HTML : sans cela, l'illustration s'afficherait en pied de message
    # comme un fichier joint ordinaire.
    message.mixed_subtype = "related"
    _joindre_illustration(message, illustration)

    try:
        message.send(fail_silently=False)
        return True
    except Exception:
        journal.exception("Échec de l'envoi du courriel « %s » à %s", cle, destinataire)
        return False


# --------------------------------------------------------------------------- #
# Cycle du mot de passe
# --------------------------------------------------------------------------- #


def envoyer_mot_de_passe_oublie(utilisateur, lien: str) -> bool:
    duree = f"{settings.PASSWORD_RESET_TIMEOUT // 3600} heures"
    contexte = _contexte_commun(utilisateur) | {
        "lien_reinitialisation": lien,
        "duree_validite": duree,
    }
    texte = (
        f"Bonjour {contexte['prenom']},\n\n"
        "Vous avez demandé à réinitialiser le mot de passe de votre compte "
        "Made in Yeumbeul Nord.\n\n"
        f"Ouvrez ce lien pour en choisir un nouveau :\n{lien}\n\n"
        f"Ce lien est valable {duree}.\n\n"
        "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : "
        "votre mot de passe reste inchangé.\n\n"
        f"Jërëjëf.\nL'équipe {NOM_EXPEDITEUR}"
    )
    return _envoyer(
        "mot_de_passe_oublie",
        "emails/mot_de_passe_oublie.html",
        utilisateur.email,
        contexte,
        "reveil-enveloppe.png",
        texte,
    )


def envoyer_mot_de_passe_modifie(utilisateur) -> bool:
    maintenant = timezone.localtime()
    contexte = _contexte_commun(utilisateur) | {
        "date": maintenant.strftime("%d/%m/%Y"),
        "heure": maintenant.strftime("%H:%M"),
    }
    texte = (
        f"Bonjour {contexte['prenom']},\n\n"
        "Le mot de passe de votre compte Made in Yeumbeul Nord vient d'être "
        f"modifié, le {contexte['date']} à {contexte['heure']}.\n\n"
        "Si vous n'êtes pas à l'origine de ce changement, prévenez immédiatement "
        "un administrateur de la commune.\n\n"
        f"Jërëjëf.\nL'équipe {NOM_EXPEDITEUR}"
    )
    return _envoyer(
        "mot_de_passe_modifie",
        "emails/mot_de_passe_modifie.html",
        utilisateur.email,
        contexte,
        "cadran.png",
        texte,
    )


def envoyer_mot_de_passe_provisoire(utilisateur, auteur: str) -> bool:
    """Prévient qu'un administrateur a posé un mot de passe provisoire.

    Le mot de passe lui-même ne figure jamais dans le message : un courriel se
    lit par-dessus l'épaule et se conserve indéfiniment. Il se transmet de vive
    voix.
    """
    contexte = _contexte_commun(utilisateur) | {
        "auteur": auteur,
        "lien_connexion": f"{settings.FRONT_ADMIN_URL}/auth/sign-in-cover",
    }
    texte = (
        f"Bonjour {contexte['prenom']},\n\n"
        f"{auteur} vous a attribué un mot de passe provisoire pour votre compte "
        "Made in Yeumbeul Nord. Ce mot de passe vous a été communiqué de vive "
        "voix : il ne figure pas dans ce message, volontairement.\n\n"
        f"Connectez-vous ici :\n{contexte['lien_connexion']}\n\n"
        "Dès votre connexion, choisissez un mot de passe connu de vous seul.\n\n"
        f"Jërëjëf.\nL'équipe {NOM_EXPEDITEUR}"
    )
    return _envoyer(
        "mot_de_passe_provisoire",
        "emails/mot_de_passe_provisoire.html",
        utilisateur.email,
        contexte,
        "porte-voix.png",
        texte,
    )


# --------------------------------------------------------------------------- #
# Cycle du compte
# --------------------------------------------------------------------------- #


def envoyer_compte_cree(utilisateur) -> bool:
    contexte = _contexte_commun(utilisateur) | {
        "identifiant": utilisateur.get_username(),
        "role": utilisateur.get_role_display(),
        "lien_connexion": f"{settings.FRONT_ADMIN_URL}/auth/sign-in-cover",
    }
    texte = (
        f"Bonjour {contexte['prenom']},\n\n"
        "Un compte vous a été ouvert sur la plateforme de suivi des groupements "
        "de Yeumbeul Nord.\n\n"
        f"Identifiant : {contexte['identifiant']}\n"
        f"Rôle : {contexte['role']}\n\n"
        f"Connectez-vous ici :\n{contexte['lien_connexion']}\n\n"
        f"Jërëjëf.\nL'équipe {NOM_EXPEDITEUR}"
    )
    return _envoyer(
        "compte_cree",
        "emails/compte_cree.html",
        utilisateur.email,
        contexte,
        "enveloppe-validee.png",
        texte,
    )


def envoyer_acces_suspendu(utilisateur, motif: str = "") -> bool:
    contexte = _contexte_commun(utilisateur) | {
        "motif": motif or "Aucun motif n'a été précisé.",
    }
    texte = (
        f"Bonjour {contexte['prenom']},\n\n"
        "L'accès à votre compte Made in Yeumbeul Nord a été suspendu par un "
        "administrateur de la commune.\n\n"
        f"Motif : {contexte['motif']}\n\n"
        "Les données que vous avez enregistrées sont conservées et restent "
        "prises en compte dans le suivi.\n\n"
        f"Jërëjëf.\nL'équipe {NOM_EXPEDITEUR}"
    )
    return _envoyer(
        "acces_suspendu",
        "emails/acces_suspendu.html",
        utilisateur.email,
        contexte,
        "cone-signalisation.png",
        texte,
    )
