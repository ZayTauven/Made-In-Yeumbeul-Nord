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
python manage.py peupler_technique --vider   # jeu technique, voir §5
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

## 3. Organisation

```
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

## 4. Tests

```bash
python manage.py test core api          # 117 tests
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

## 5. Données

`python manage.py peupler_technique --vider` installe un jeu **technique** : 24 groupements,
~440 membres, 62 productions, 12 activités, 8 indicateurs. Les noms sont des gabarits et les
montants tirés au sort — il sert à brancher les fronts sur une API qui répond.

Le jeu montré au Maire est un autre sujet : toponymie réelle de Yeumbeul Nord, anthroponymie
sénégalaise, filières plausibles, montants cohérents, chronologie tenable. Il relève de l'agent
`yn-data-demo`, avec pour référence le générateur à graine fixe
`frontend-admin/src/domaine/generateur.ts` (voir document 15 §12).

---

## 6. Ce qui n'est pas encore fait

- **Authentification** : lecture ouverte, écriture réservée aux comptes authentifiés
  (`IsAuthenticatedOrReadOnly`), avec la session Django. Ni JWT, ni comptes de groupement, ni
  rôles fins. À poser quand les écrans de saisie arriveront.
- **Bascule des fronts** : ils lisent encore leur générateur local. La bascule se fait fonction
  par fonction dans `domaine/source.ts`, en remplaçant un corps sans toucher aux signatures
  (document 15 §12).
- **Médias** : Django n'héberge aucune image. Les modèles portent la clé du média
  (`photo_cle`), les fichiers restent dans le `public/` de chaque front.
- **Déploiement** : pas de Docker, pas de CI, pas de réglages de production. Relève de
  `yn-devops`.
