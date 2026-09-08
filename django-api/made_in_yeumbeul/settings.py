"""
Configuration Django — API « Made in Yeumbeul Nord ».

Une seule API sert les deux fronts : le front de gestion (Vireo, port 3000) et la
vitrine publique (Ekomart, port 3001). Les deux sont séparés côté rendu, mais
partagent ce contrat de données — c'est même leur seul point de partage
(CLAUDE.md §1).

Les secrets se lisent dans `django-api/.env`, jamais en dur ici.
"""

from pathlib import Path

from dotenv import load_dotenv
import os

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")


def variable(nom: str, defaut: str = "") -> str:
    return os.environ.get(nom, defaut)


def booleen(nom: str, defaut: bool = False) -> bool:
    return variable(nom, str(defaut)).strip().lower() in {"1", "true", "oui", "yes"}


# --------------------------------------------------------------------------- #
# Sécurité
# --------------------------------------------------------------------------- #

SECRET_KEY = variable("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY est absente de django-api/.env. "
        "Partir de .env.backend.exemple à la racine du dépôt."
    )

DEBUG = booleen("DEBUG", True)

ALLOWED_HOSTS = [
    hote.strip()
    for hote in variable("ALLOWED_HOSTS", "localhost,127.0.0.1,[::1]").split(",")
    if hote.strip()
]


# --------------------------------------------------------------------------- #
# Applications
# --------------------------------------------------------------------------- #

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # `postgres` porte l'extension « unaccent », sans laquelle une recherche sur
    # « maraichage » ne trouverait pas « maraîchage » — inacceptable pour un
    # corpus français.
    "django.contrib.postgres",
    # Tierces
    "rest_framework",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    # Projet
    "comptes",
    "core",
    "api",
]

MIDDLEWARE = [
    # `corsheaders` se place avant `CommonMiddleware`, faute de quoi une réponse
    # de redirection partirait sans ses en-têtes CORS.
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "made_in_yeumbeul.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "made_in_yeumbeul.wsgi.application"


# --------------------------------------------------------------------------- #
# Base de données
# --------------------------------------------------------------------------- #

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": variable("DB_NAME", "madeInYeumbDB"),
        "USER": variable("DB_USER", "postgres"),
        "PASSWORD": variable("DB_PASSWORD"),
        "HOST": variable("DB_HOST", "localhost"),
        "PORT": variable("DB_PORT", "5432"),
    }
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# --------------------------------------------------------------------------- #
# Comptes et authentification
# --------------------------------------------------------------------------- #

# Modèle utilisateur substitué dès l'origine : le remplacer une fois des comptes
# réels créés est l'une des migrations les plus coûteuses de Django.
AUTH_USER_MODEL = "comptes.Utilisateur"

AUTHENTICATION_BACKENDS = [
    # Accepte identifiant, courriel ou téléphone. Placé avant le backend
    # standard, qui reste en second pour l'interface d'administration.
    "comptes.authentification.IdentifiantSouple",
    "django.contrib.auth.backends.ModelBackend",
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        # Douze caractères plutôt que les huit par défaut : ces comptes ouvrent
        # sur les données de suivi d'une collectivité.
        "OPTIONS": {"min_length": 12},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Argon2 en tête : c'est le hachage recommandé par Django, et il résiste
# nettement mieux au calcul parallèle que PBKDF2. Les empreintes PBKDF2
# existantes restent lisibles et sont réhachées à la connexion suivante.
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
]

# Une journée de travail. Au-delà, l'agent se reconnecte — un poste de mairie
# est souvent partagé.
SESSION_COOKIE_AGE = 60 * 60 * 12
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
# En développement, les deux fronts et l'API tiennent sur `localhost` : même
# site, donc « Lax » suffit et le cookie voyage sans HTTPS. En production, les
# deux réglages ci-dessous passent à True derrière le proxy TLS.
SESSION_COOKIE_SECURE = not DEBUG

CSRF_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SECURE = not DEBUG
# Le cookie reste inaccessible au JavaScript. Le front n'en a pas besoin :
# `GET /api/auth/csrf/` lui rend le jeton dans le corps de la réponse, et Django
# le compare de son côté au cookie. Un jeton CSRF lisible par un script injecté
# n'offrirait plus de protection.
CSRF_COOKIE_HTTPONLY = True
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]


# --------------------------------------------------------------------------- #
# Langue et fuseau
# --------------------------------------------------------------------------- #

# Le français est la langue de travail du projet, y compris pour l'interface
# d'administration (CLAUDE.md §5). Le wolof est prévu, pas encore commandé.
LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Africa/Dakar"
USE_I18N = True
USE_TZ = True


# --------------------------------------------------------------------------- #
# Fichiers statiques
# --------------------------------------------------------------------------- #

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Aucun média n'est hébergé par Django : les visuels sont servis par le `public/`
# de chaque front, depuis le catalogue `Assets/_optimized/`. Les modèles ne
# portent donc que la clé du média, pas un `ImageField` (CLAUDE.md §5).


# --------------------------------------------------------------------------- #
# Django REST Framework
# --------------------------------------------------------------------------- #

REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "api.filtres.RechercheSansAccent",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "api.pagination.PaginationParPage",
    "PAGE_SIZE": 12,
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        # L'interface navigable reste utile en développement pour lire une
        # réponse sans passer par Swagger ; elle disparaît en production.
        *(["rest_framework.renderers.BrowsableAPIRenderer"] if DEBUG else []),
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        # Session seule : le choix a été arrêté contre JWT. Rien à stocker dans
        # le navigateur, et une révocation prend effet immédiatement — supprimer
        # la session suffit, là où un jeton signé reste valable jusqu'à son
        # échéance sauf à tenir une liste noire.
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        # Lecture ouverte — la vitrine est publique par nature —, écriture
        # réservée aux comptes qui en ont le rôle.
        "api.permissions.LectureLibreEcritureControlee",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        # Seule la connexion est limitée : c'est la porte que l'on force. Le
        # reste de l'API est en lecture publique, une limite globale gênerait
        # la vitrine sans rien protéger.
        "connexion": "10/min",
    },
}

SPECTACULAR_SETTINGS = {
    "TITLE": "API Made in Yeumbeul Nord",
    "DESCRIPTION": (
        "API de suivi-évaluation et de vitrine des groupements de Yeumbeul Nord. "
        "Projet « And Jappo Meunal Souniou Bopp »."
    ),
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "SORT_OPERATIONS": False,
    # `MoyenPaiement` sert deux champs de noms différents — `moyen` sur un
    # mouvement, `moyen_paiement` sur une commande. Sans ce nom explicite,
    # drf-spectacular génère deux énumérations concurrentes pour un seul et
    # même jeu de valeurs.
    "ENUM_NAME_OVERRIDES": {
        "MoyenPaiementEnum": "core.referentiels.MoyenPaiement.choices",
    },
}


# --------------------------------------------------------------------------- #
# CORS — les deux fronts Next
# --------------------------------------------------------------------------- #

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # front de gestion (Vireo)
    "http://127.0.0.1:3000",
    "http://localhost:3001",  # vitrine publique (Ekomart)
    "http://127.0.0.1:3001",
]
CORS_ALLOW_CREDENTIALS = True
