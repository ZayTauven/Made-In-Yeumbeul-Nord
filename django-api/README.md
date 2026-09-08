# API — MADE IN YEUMBEUL NORD

API REST unique servant les deux fronts Next : le front de gestion (Vireo, port 3000) et la
vitrine publique (Ekomart, port 3001). C'est leur **seul point de partage** (CLAUDE.md §1).

Django 5.2 LTS · Django REST Framework 3.16 · PostgreSQL · drf-spectacular

---

## 1. Installation

```bash
cd django-api
python -m venv .venv
./.venv/Scripts/python.exe -m pip install -r requirements.txt   # Windows
# source .venv/bin/activate && pip install -r requirements.txt  # Linux / macOS
```

Créer `django-api/.env` à partir de `.env.backend.exemple` (racine du dépôt) :

```ini
SECRET_KEY=…
DEBUG=True
DB_NAME=madeInYeumbDB
DB_USER=postgres
DB_PASSWORD=…
DB_HOST=localhost
DB_PORT=5432
ALLOWED_HOSTS=localhost,127.0.0.1,[::1]
```

Puis :

```bash
python manage.py migrate
python manage.py peupler_technique --vider   # jeu technique, voir §7
python manage.py createsuperuser             # pour /admin/ et les écritures
python manage.py runserver 8000
```

| Adresse | Contenu |
|---|---|
| `http://localhost:8000/api/` | racine de l'API, navigable en développement |
| `http://localhost:8000/api/doc/` | Swagger |
| `http://localhost:8000/api/redoc/` | Redoc |
| `http://localhost:8000/api/schema/` | schéma OpenAPI brut |
| `http://localhost:8000/admin/` | administration Django, en français |

L'extension PostgreSQL `unaccent` est installée par la migration `core.0002`. Elle demande des
droits de superutilisateur ; à défaut, un administrateur exécute une fois
`CREATE EXTENSION IF NOT EXISTS unaccent;`.

---

## 2. Ce que l'API implémente

Le contrat est écrit par les fronts, pas par le backend :
**`PLAN & PRODUCT/15-CONTRAT-API.md`**, dont l'implémentation de référence est
`frontend-admin/src/domaine/source.ts`. Chaque fonction y porte en commentaire la route qui la
sert, et `domaine/types.ts` donne le nom exact de chaque champ.

> ⚠️ `PLAN & PRODUCT/08-ARCHITECTURE-DJANGO.md` est **dépassé** sur le modèle de données : il ne
> couvre pas le suivi-évaluation (cadre logique, activités, jalons, étapes d'accompagnement,
> workflow de validation, quartier comme entité, journal d'audit). Il reste utile pour l'intention
> générale, pas pour les champs.

Deux principes traversent le code :

1. **Ce qui se déduit ne se stocke pas.** Effectif d'un groupement, part de femmes, progression,
   statut d'une activité, taux de présence, montant d'une commande, taux d'atteinte d'un
   indicateur : autant de valeurs calculées. Un compteur stocké qui contredit la liste affichée
   juste en dessous est le défaut le plus visible d'une démonstration.
2. **Les montants sont des entiers en FCFA.** Jamais de `DecimalField` : DRF le sérialise en
   chaîne (« 1200.00 »), là où les deux fronts typent un nombre.

---

## 3. Authentification

**Session Django, décision arrêtée contre JWT.** Rien à stocker dans le navigateur, et une
révocation prend effet immédiatement — supprimer la session suffit, là où un jeton signé reste
valable jusqu'à son échéance sauf à tenir une liste noire.

Enchaînement côté front. Tous les appels portent `credentials: "include"` ; sans cela le
navigateur n'envoie pas le cookie et l'API refuse toute écriture.

```js
// 1. Jeton CSRF. Le cookie est HttpOnly, donc illisible au JavaScript :
//    le jeton arrive dans le corps de la réponse.
const { jeton_csrf } = await fetch(`${API}/auth/csrf/`, {
  credentials: "include",
}).then((r) => r.json());

// 2. Connexion. `identifiant` accepte l'identifiant, le courriel ou le téléphone.
const profil = await fetch(`${API}/auth/connexion/`, {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json", "X-CSRFToken": jeton_csrf },
  body: JSON.stringify({ identifiant, mot_de_passe }),
}).then((r) => r.json());
```

| Route | Méthode | Effet |
|---|---|---|
| `/api/auth/csrf/` | GET | Rend le jeton CSRF et dépose son cookie |
| `/api/auth/connexion/` | POST | Ouvre la session, renvoie le profil |
| `/api/auth/moi/` | GET | Profil du compte connecté |
| `/api/auth/deconnexion/` | POST | Ferme la session |
| `/api/auth/mot-de-passe/` | POST | Change le mot de passe |
| `/api/auth/mot-de-passe/oubli/` | POST | Envoie un lien de réinitialisation |
| `/api/auth/mot-de-passe/reinitialiser/` | POST | Consomme le lien et pose le nouveau mot de passe |

La demande d'oubli répond **204 dans tous les cas**, compte connu ou non : distinguer les deux
transformerait la route en annuaire d'adresses. Le lien renvoie vers
`FRONT_ADMIN_URL/auth/reinitialiser?uid=…&jeton=…`, valable deux heures et utilisable une seule
fois.

**Le jeton CSRF tourne à la connexion** : le relire après s'être connecté, sinon la première
écriture repartira avec l'ancien.

### Trois rôles, calqués sur le workflow de validation

| Rôle | Lecture | Écriture et soumission | Validation et rejet |
|---|:--:|:--:|:--:|
| `administrateur` | ✅ | ✅ | ✅ |
| `agent` | ✅ | ✅ | ❌ |
| `lecture` | ✅ | ❌ | ❌ |

Séparer la soumission de la validation est ce qui donne du sens au circuit : un dispositif où
le même compte soumet et valide n'atteste de rien. Un superutilisateur est administrateur
d'office, sans quoi le compte issu de `createsuperuser` ne pourrait rien valider.

La **lecture reste ouverte aux visiteurs anonymes** : la vitrine est publique par nature. Les
commandes aussi — on ne demande pas de compte pour acheter un savon.

### Réglages de sécurité

- Modèle utilisateur personnalisé dans l'app `comptes`, **dès l'origine** : substituer
  `AUTH_USER_MODEL` après coup est l'une des migrations les plus coûteuses de Django. L'app est
  séparée de `core` parce que Django résout `AUTH_USER_MODEL` par une dépendance vers la
  *première* migration de l'app concernée.
- Connexion par identifiant, courriel **ou téléphone** : un agent municipal retient plus sûrement
  son numéro que l'identifiant qu'on lui a attribué.
- Argon2 pour le hachage, mots de passe de douze caractères au minimum.
- Dix tentatives de connexion par minute. Le message d'échec ne distingue pas l'identifiant
  inconnu du mot de passe erroné : les séparer renseignerait sur les comptes existants.
- Cookies de session et CSRF `HttpOnly`, `SameSite=Lax`, et `Secure` dès que `DEBUG=False`.
- Connexions et transitions de validation écrivent au journal d'audit.

Créer un compte :

```bash
python manage.py createsuperuser          # administrateur
# puis, dans /admin/, régler « rôle » pour les comptes suivants
```

---

## 4. Organisation

```
comptes/
  models.py             Utilisateur (AbstractUser + rôle, téléphone, fonction)
  authentification.py   Backend acceptant identifiant, courriel ou téléphone
  admin.py              Administration des comptes

core/
  referentiels.py       Choix, barèmes et fonctions de calcul partagés avec le front
  models/               Modèles éclatés par domaine
    territoire.py         Commune, Quartier, Filiere
    groupements.py        Groupement (+ agrégats annotés), Membre
    productions.py        Production
    suivi.py              AxeStrategique, ResultatAttendu, Indicateur, Releve, Activite, Jalon
    formations.py         Formation, SessionFormation, Participation, Certification
    finances.py           Financement, MouvementFinancier
    commerce.py           Boutique, Commande, LigneCommande
    contenus.py           Actualite, EvenementJournal
  admin.py              Administration, pour la saisie des agents
  tests.py              Annotations, propriétés dérivées, contraintes

api/
  permissions.py        Les trois rôles, en classes de permission DRF
  serialiseurs/         Formes de sortie, champ pour champ identiques à domaine/types.ts
  vues/                 ViewSets et vues d'agrégation, volontairement minces
  agregations.py        Les règles de calcul du suivi-évaluation
  filtres.py            FilterSets + recherche insensible aux accents
  pagination.py         { count, next, previous, results }
  urls.py               Le routage, calqué sur le contrat
  tests/                Tests de contrat, par domaine
```

`core/referentiels.py` est le pendant Python de `frontend-admin/src/domaine/referentiels.ts`.
**Les deux doivent rester alignés** : un barème qui diverge d'un côté produit un écran qui
contredit son propre tableau.

---

## 5. Courriels

Cinq courriels, dans `templates/emails/` : compte créé, accès suspendu, mot de passe oublié,
mot de passe provisoire, mot de passe modifié. Ils héritent tous de `base.html`, qui porte la
structure et **toutes les couleurs**.

Le montage passe par `comptes/courriels.py` : une fonction par message, version texte rédigée à
la main, illustration **jointe** au message (`src="cid:…"`) et non chargée depuis un serveur —
la plupart des clients bloquent les images distantes, et la plateforme doit tenir sans connexion.
Un échec d'envoi est journalisé et n'interrompt jamais la requête.

```ini
# .env — laisser EMAIL_HOST_USER vide écrit dans la console au lieu d'envoyer
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=…
EMAIL_HOST_PASSWORD=…        # mot de passe d'application, jamais le mot de passe du compte
DEFAULT_FROM_EMAIL=Made in Yeumbeul Nord <…>
FRONT_ADMIN_URL=http://localhost:3000
```

> Les couleurs des courriels sont **en dur**, et c'est inévitable : aucun client de messagerie ne
> lit les variables CSS. Elles sont réunies dans `base.html`, avec l'accent natif de Vireo
> (verdigris `#1E856C`) conformément au gel de charte — rien n'est inventé. La bascule reste un
> geste unique le jour où la charte sera arrêtée.

`templates/emails/_a-adapter/` conserve les vingt-six gabarits d'origine du projet Yessal Gui,
dont cinq ont été adaptés. Son `LISEZ-MOI.md` dit lesquels restent transposables et à quoi — le
lot « documents » correspond directement au workflow de validation.

Depuis `/admin/`, l'action **« Envoyer un lien de réinitialisation »** couvre le cas courant :
un agent a perdu son mot de passe.

---

## 6. Tests

```bash
python manage.py test comptes core api  # 171 tests
python manage.py test api.tests.test_suivi -v 2
```

Ils vérifient le **contrat**, pas l'implémentation : chaque assertion correspond à une ligne du
document 15 ou à un champ de `domaine/types.ts`. Un champ renommé doit faire échouer un test.

Points spécifiquement couverts, parce qu'ils sont faciles à casser sans s'en apercevoir :

- la valeur d'un KPI est le dernier point de sa série, et son delta se mesure depuis le point
  précédent ;
- un indicateur décroissant se lit dans l'autre sens — 118 jours pour une cible de 90 valent
  76 %, pas 131 % ;
- le taux de remboursement porte sur les seuls financements remboursables ;
- le statut d'activité annoté en SQL et son repli Python restent d'accord ;
- la recherche trouve « Liggéey » quand on tape « liggeey » ;
- aucun moyen de paiement international n'est accepté.

---

## 7. Données

`python manage.py peupler_technique --vider` installe un jeu **technique** : 24 groupements,
~440 membres, 62 productions, 12 activités, 8 indicateurs. Les noms sont des gabarits et les
montants tirés au sort — il sert à brancher les fronts sur une API qui répond.

Le jeu montré au Maire est un autre sujet : toponymie réelle de Yeumbeul Nord, anthroponymie
sénégalaise, filières plausibles, montants cohérents, chronologie tenable. Il relève de l'agent
`yn-data-demo`, avec pour référence le générateur à graine fixe
`frontend-admin/src/domaine/generateur.ts` (voir document 15 §12).

---

## 8. Ce qui n'est pas encore fait

- **Comptes de groupement** : seuls les agents de la commune se connectent. L'auto-inscription
  des groupements et l'OTP par SMS sont en roadmap post-MVP1 (`07-PLAN-MVP1.md`).
- **Écrans de connexion** : `app/(bare)/auth/sign-in-*` de Vireo sont encore les maquettes du
  template, à brancher sur `/api/auth/`.
- **Nomenclature des indicateurs** : les cartes d'en-tête des formations sont adossées aux
  indicateurs `I2.1.1`, `I2.1.2` et `I2.1.3` du cadre logique. Le jeu technique ne crée pas ces
  codes-là, et `I2.1.2` n'y porte pas l'unité « % » : les cartes correspondantes s'affichent
  donc à zéro ou sans signe de pourcentage. Ce n'est pas un défaut du code — les fixtures de
  démonstration devront respecter cette nomenclature (`yn-data-demo`).
- **Médias** : Django n'héberge aucune image. Les modèles portent la clé du média
  (`photo_cle`), les fichiers restent dans le `public/` de chaque front.
- **Déploiement** : pas de Docker, pas de CI, pas de réglages de production. Relève de
  `yn-devops`.
