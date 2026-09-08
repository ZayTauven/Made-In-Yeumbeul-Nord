"""
Machine à états de validation, commune aux groupements et aux productions.

    brouillon ──soumettre──> soumis ──valider──> valide
                                │
                                └──rejeter──> rejete ──corriger──> brouillon

Chaque transition écrit une entrée au journal d'audit. Le motif de rejet est
obligatoire : un rejet sans motif est ingérable pour le groupement concerné
(`PLAN & PRODUCT/15-CONTRAT-API.md` §11).
"""

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from api.permissions import EstAdministrateur
from core.models import EvenementJournal
from core.referentiels import EtatValidation

#: Transitions autorisées : état de départ -> état d'arrivée.
TRANSITIONS = {
    "soumettre": (EtatValidation.BROUILLON, EtatValidation.SOUMIS),
    "valider": (EtatValidation.SOUMIS, EtatValidation.VALIDE),
    "rejeter": (EtatValidation.SOUMIS, EtatValidation.REJETE),
    "corriger": (EtatValidation.REJETE, EtatValidation.BROUILLON),
}


class MixinWorkflowValidation:
    """Ajoute les quatre transitions à un `ViewSet`.

    La vue hôte doit définir `categorie_journal` et `libelle_journal(objet)`.
    """

    categorie_journal = "systeme"

    def libelle_journal(self, objet) -> str:
        return str(objet)

    def _transitionner(self, request, nom: str, motif: str = ""):
        objet = self.get_object()
        depart, arrivee = TRANSITIONS[nom]

        if objet.etat_validation != depart:
            return Response(
                {
                    "detail": (
                        f"Transition « {nom} » impossible depuis l'état "
                        f"« {objet.get_etat_validation_display()} » : elle part "
                        f"de « {EtatValidation(depart).label} »."
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )

        objet.etat_validation = arrivee
        objet.motif_rejet = motif if arrivee == EtatValidation.REJETE else ""
        objet.save(update_fields=["etat_validation", "motif_rejet", "updated_at"])

        acteur = request.user
        EvenementJournal.objects.create(
            acteur=acteur.nom_complet or acteur.get_username(),
            acteur_teinte=acteur.avatar_teinte,
            action=f"{nom.capitalize()} — {EtatValidation(arrivee).label.lower()}",
            cible=self.libelle_journal(objet),
            cible_lien=f"/{self.basename}s/{objet.slug}",
            categorie=self.categorie_journal,
        )

        serialiseur = self.get_serializer(objet)
        return Response(serialiseur.data)

    @extend_schema(request=None, description="Passe la fiche de brouillon à soumis.")
    @action(detail=True, methods=["post"])
    def soumettre(self, request, **kwargs):
        return self._transitionner(request, "soumettre")

    @extend_schema(
        request=None,
        description="Valide une fiche soumise. Réservé aux administrateurs.",
    )
    @action(detail=True, methods=["post"], permission_classes=[EstAdministrateur])
    def valider(self, request, **kwargs):
        return self._transitionner(request, "valider")

    @extend_schema(
        request=None,
        description=(
            "Rejette une fiche soumise. Le motif est obligatoire. "
            "Réservé aux administrateurs."
        ),
    )
    @action(detail=True, methods=["post"], permission_classes=[EstAdministrateur])
    def rejeter(self, request, **kwargs):
        motif = (request.data.get("motif") or "").strip()
        if not motif:
            return Response(
                {"motif": ["Le motif de rejet est obligatoire."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return self._transitionner(request, "rejeter", motif=motif)

    @extend_schema(request=None, description="Remet une fiche rejetée en brouillon.")
    @action(detail=True, methods=["post"])
    def corriger(self, request, **kwargs):
        return self._transitionner(request, "corriger")
