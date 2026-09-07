"""
Sérialiseurs des groupements et de leurs membres.

Les champs dérivés (`nombre_membres`, `part_femmes`, `progression`,
`responsable`, `financement_recu_fcfa`) viennent des annotations posées par
`Groupement.objects.avec_agregats()`. Une vue qui oublierait cet appel lèverait
une `AttributeError` explicite plutôt que de servir des zéros silencieux.
"""

from rest_framework import serializers

from core.models import Groupement, Membre

from .territoire import FiliereSerializer, QuartierSerializer


class MembreSerializer(serializers.ModelSerializer):
    groupement_id = serializers.IntegerField(read_only=True)
    nom_complet = serializers.CharField(read_only=True)
    initiales = serializers.CharField(read_only=True)
    age = serializers.IntegerField(read_only=True)
    nombre_formations_suivies = serializers.SerializerMethodField()
    nombre_certifications = serializers.SerializerMethodField()

    class Meta:
        model = Membre
        fields = [
            "id",
            "groupement_id",
            "prenom",
            "nom_famille",
            "nom_complet",
            "initiales",
            "genre",
            "age",
            "telephone",
            "role",
            "avatar_teinte",
            "date_adhesion",
            "nombre_formations_suivies",
            "nombre_certifications",
        ]

    def get_nombre_formations_suivies(self, obj) -> int:
        # `nb_formations` est posé par la vue ; le repli sert l'objet isolé.
        valeur = getattr(obj, "nb_formations", None)
        if valeur is not None:
            return valeur
        return obj.participations.filter(present=True).count()

    def get_nombre_certifications(self, obj) -> int:
        valeur = getattr(obj, "nb_certifications", None)
        if valeur is not None:
            return valeur
        return obj.certifications.count()


class GroupementSerializer(serializers.ModelSerializer):
    """Fiche complète d'un groupement, listes comprises.

    Le contrat ne prévoit qu'une seule forme, pour la liste comme pour la fiche :
    les cartes de l'annuaire affichent déjà le quartier, la filière, l'effectif
    et la note. Deux formes distinctes obligeraient la vitrine à recharger la
    fiche pour afficher une carte.
    """

    quartier = QuartierSerializer(read_only=True)
    filiere = FiliereSerializer(read_only=True)
    filieres_secondaires = serializers.SerializerMethodField()

    # Annotations de `avec_agregats()`.
    nombre_membres = serializers.IntegerField(read_only=True)
    part_femmes = serializers.IntegerField(read_only=True)
    nombre_productions = serializers.IntegerField(read_only=True)
    progression = serializers.IntegerField(read_only=True)
    responsable = serializers.CharField(read_only=True)
    financement_recu_fcfa = serializers.IntegerField(read_only=True)

    class Meta:
        model = Groupement
        fields = [
            "id",
            "nom",
            "slug",
            "description",
            "quartier",
            "latitude",
            "longitude",
            "filiere",
            "filieres_secondaires",
            "statut_juridique",
            "ninea",
            "etape",
            "progression",
            "nombre_membres",
            "part_femmes",
            "nombre_productions",
            "chiffre_affaires_fcfa",
            "financement_recu_fcfa",
            "telephone",
            "email",
            "responsable",
            "date_creation",
            "date_formalisation",
            "note_moyenne",
            "nombre_appreciations",
            "photo",
            "photo_cle",
            "etat_validation",
        ]

    def get_filieres_secondaires(self, obj) -> list[str]:
        """Noms des filières secondaires, comme attendu par `domaine/types.ts`."""
        return [filiere.nom for filiere in obj.filieres_secondaires.all()]


class PointCarteSerializer(serializers.ModelSerializer):
    """Charge allégée pour la carte Leaflet.

    Volontairement distincte de la fiche : ni description, ni photo, ni
    compteurs. Cent marqueurs qui transporteraient chacun une fiche complète
    rendraient la carte lente à l'ouverture, précisément l'écran qu'on montre
    en démonstration.
    """

    quartier = serializers.CharField(source="quartier.nom", read_only=True)
    filiere = serializers.CharField(source="filiere.nom", read_only=True)
    filiere_teinte = serializers.CharField(source="filiere.teinte", read_only=True)
    nombre_membres = serializers.IntegerField(read_only=True)

    class Meta:
        model = Groupement
        fields = [
            "id",
            "nom",
            "slug",
            "latitude",
            "longitude",
            "quartier",
            "filiere",
            "filiere_teinte",
            "etape",
            "nombre_membres",
        ]
