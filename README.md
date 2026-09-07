# MADE IN YEUMBEUL NORD

> **And Jappo Meunal Souniou Bopp** — se rassembler pour compter sur soi-même.

![Statut](https://img.shields.io/badge/Statut-MVP1%20en%20cours-629D23?style=for-the-badge)
![Node](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js&style=for-the-badge)
![Next](https://img.shields.io/badge/Next.js-15%20%2F%2016-000000?logo=next.js&style=for-the-badge)
![Django](https://img.shields.io/badge/Django-4.2-092E20?logo=django&style=for-the-badge)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&style=for-the-badge)

Plateforme de suivi-évaluation et de vitrine commerciale des **100 groupements** de Yeumbeul Nord.
D'un côté, un outil de pilotage pour la commune et les accompagnateurs ; de l'autre, une vitrine
publique où les productions des groupements se montrent et se vendent.

**Échéance MVP1 : démonstration au Maire le 31 octobre 2026.**

## Pourquoi ce projet

Les groupements de Yeumbeul Nord produisent déjà — savon, cosmétiques, céréales transformées,
maraîchage, vannerie, couture, restauration. Ce qui manque n'est pas l'activité, c'est la trace :
qui fait quoi, à quel stade d'accompagnement, avec quels résultats, et comment le montrer à
l'extérieur.

La plateforme répond à deux besoins que rien ne relie aujourd'hui :

- **compter** — savoir, groupement par groupement, où en est l'accompagnement, ce qui a été
  décaissé, quelles formations ont été suivies, quels indicateurs bougent ;
- **montrer** — donner à chaque groupement une page publique, un catalogue et un canal de vente,
  sans dépendre d'une place de marché extérieure.

## Ce que fait la plateforme

- un tableau de bord de suivi-évaluation : indicateurs, jalons, activités, cartographie des
  quartiers ;
- un annuaire des groupements et de leurs membres, avec leur étape d'accompagnement ;
- un catalogue public des productions, par filière ;
- le suivi des formations, des sessions et des certifications ;
- le suivi des appuis financiers et des décaissements, en FCFA ;
- une vitrine de vente avec panier et commande, en paiement mobile.

## Architecture

Trois briques : **une API, deux fronts**.

```text
django-api/         Django 4.2+ · DRF · PostgreSQL 15    API unique
frontend-admin/     Vireo   · Next 15 · Tailwind v4      gestion et suivi-évaluation
frontend-vitrine/   Ekomart · Next 16 · Bootstrap 5.3    vitrine de vente publique
```

**Pourquoi deux fronts et non un seul.** Tailwind v4 et Bootstrap 5 imposent chacun un reset global
et se disputent les mêmes noms de classes — `.btn`, `.card`, `.container`, `.row`, `.badge`,
`.modal`, `.table`. Les fusionner produirait des régressions visuelles impossibles à prévoir. Les
deux fronts restent donc séparés, chacun avec son identité, et **leur seul point de partage est le
contrat d'API**. Ne jamais importer un composant d'un front dans l'autre.

## Vocabulaire métier

Les templates d'origine sont en anglais et parlent e-commerce. Le projet impose son propre
vocabulaire, dans le code comme dans l'interface :

| Template | Projet |
|---|---|
| Customer, Vendor, Seller | **Groupement** (GIE) |
| Product | **Production** |
| Category | **Filière** |
| Region, Branch | **Quartier** |
| Employee, Member | **Membre** |
| Project | **Activité** |
| Milestone | **Jalon** |
| Invoice, Payment | **Décaissement**, **Appui financier** |
| KPI | **Indicateur** |

**Étapes d'accompagnement**, dans l'ordre canonique :
`identifié` → `formé` → `certifié` → `formalisé` → `équipé` → `en production` → `autonome`

**Filières** : saponification, cosmétiques, transformation agroalimentaire, céréales, maraîchage,
artisanat et vannerie, couture, restauration, commerce vivrier, services, logistique.

## Conventions non négociables

- **Français** partout : interface, commentaires, messages de commit.
- **`next-intl`** dès le premier écran, locale `fr`, `wo` prévue. Rétrofitter l'i18n plus tard sur
  80 000 lignes coûterait dix fois plus cher.
- **Montants en FCFA**, entiers, sans décimales. Jamais d'euro ni de dollar.
- **Paiement mobile** : Wave, Orange Money, Free Money. Jamais Visa, Mastercard ou PayPal.
- **Aucune image distante.** `remotePatterns` est vide et doit le rester : la démonstration devant
  le Maire doit fonctionner sans connexion Internet.
- **Aucune couleur en dur.** Toute couleur passe par un token de rôle, ce qui permettra de basculer
  la palette d'un seul geste le jour où le logo sera livré.

## Démarrage rapide

### Prérequis

- Node.js 22.x et npm 11.x
- Python 3.11+ et PostgreSQL 15 (pour l'API, à venir)

### Les deux fronts

```bash
# Front de gestion — http://localhost:3000
cd frontend-admin
npm ci
npm run dev

# Front vitrine — http://localhost:3001
cd frontend-vitrine
npm ci
npm run dev
```

Les ports sont épinglés dans les scripts `dev` et `start` : les deux fronts tournent en parallèle
sans se marcher dessus.

```bash
# Vérifier que tout compile
npm run build
```

## Structure du dépôt

```text
frontend-admin/           Front de gestion (Vireo · Next 15 · Tailwind v4)
frontend-vitrine/         Front vitrine (Ekomart · Next 16 · Bootstrap 5.3)
django-api/               API Django (à venir)
```

Le dépôt de travail contient aussi l'audit de l'existant (`_AUDIT/`), le plan MVP1 et le backlog
(`PLAN & PRODUCT/`), l'outillage d'optimisation d'images (`tools/`), les sources graphiques
(`Assets/`) et les définitions des agents (`.claude/`). Ces dossiers sont **exclus du dépôt
public** par `.gitignore`.

## État d'avancement

| Chantier | État |
|---|---|
| Templates installés et compilés | ✅ les deux fronts buildent, 186 et 54 pages prérendues |
| Dépendances de sécurité | ✅ vitrine à 0 vulnérabilité ; admin sur `next@15.5.25` |
| Cartographie Leaflet | ✅ dépendance résolue, écran prérendu |
| API Django | ⬜ non démarrée |
| Vocabulaire métier appliqué aux écrans | ⬜ les templates sont encore en anglais |
| Charte graphique | 🔒 gelée sur les valeurs natives des templates, en attente du logo |

## Charte graphique

Aucune charte projet n'est arrêtée et le logo n'est pas livré. Chaque front **conserve la palette et
la typographie d'origine de son template** en attendant : accent `verdigris` #1E856C et police Inter
côté gestion, `--color-primary` #629D23 et police Barlow côté vitrine. Heureux hasard, les deux
accents natifs sont des verts voisins.

Le blason présent dans les sources est celui de la **Commune de Yeumbeul Nord** — la tutelle
institutionnelle, pas l'identité du produit. Il s'emploie en pied de page, sur la page « À propos »
ou dans un bandeau de partenaires, jamais comme logo dans l'en-tête.

## Contribution

Le projet est développé avec huit agents spécialisés, chacun sur son périmètre : backend Django,
front admin, front vitrine, charte et assets, données de démonstration, langue et contenu, qualité
et performance, infrastructure. Le protocole de passation est décrit dans
`_AUDIT/07-ORCHESTRATION-AGENTS.md`.

Messages de commit **en français, à l'impératif** : « Ajoute la dépendance Leaflet manquante ».

## Licence

**À clarifier avant livraison à la collectivité.** Les deux templates sont des produits commerciaux
Envato : `frontend-admin` déclare `LicenseRef-Envato-Regular`, `frontend-vitrine` ne déclare rien, et
aucun des deux ne contient de fichier de licence. Le régime applicable au livrable remis à la
commune doit être tranché avant la mise en production.

---

Fait à Yeumbeul Nord, pour celles et ceux qui produisent déjà.
