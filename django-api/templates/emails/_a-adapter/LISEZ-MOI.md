# Gabarits d'origine — projet Yessal Gui

Les vingt-six fichiers de ce dossier viennent d'un **autre projet** (Yessal Gui, Touba). Ils sont
conservés intacts comme réserve : leur structure HTML est excellente — tableaux, largeur fixe de
600 px, correctif MSO pour Outlook, texte d'aperçu, mode sombre — et c'est elle qui a servi de base
au gabarit `../base.html`.

**Aucun n'est utilisé par le code.** Ils parlent de daaras, de ndiguels, de Jëfs et de titres
fonciers : rien de tout cela n'existe dans Made in Yeumbeul Nord. Les laisser mêlés aux gabarits
du projet aurait fait croire qu'ils sont en service.

## Ce qui a déjà été adapté

| Origine | Devenu | Écart |
|---|---|---|
| `A2-compte_valide` | `../compte_cree.html` | Un administrateur ouvre le compte ; il n'y a pas de validation à attendre |
| `A3-compte_bloque` | `../acces_suspendu.html` | « Vos Jëfs » → « vos saisies » |
| `A4-mot_de_passe_oublie` | `../mot_de_passe_oublie.html` | Marque et palette |
| `A5-mot_de_passe_provisoire` | `../mot_de_passe_provisoire.html` | Marque et palette |
| `A6-mot_de_passe_modifie` | `../mot_de_passe_modifie.html` | Le passage sur les sessions fermées est retiré : Django ne ferme pas les autres sessions |

## Ce qui reste transposable, et à quoi

| Origine | Correspondance dans le projet | Remarque |
|---|---|---|
| `A1-inscription_recue` | Auto-inscription d'un groupement | Sans objet au MVP1 : les comptes sont créés par un administrateur. Utile quand les comptes de groupement arriveront (roadmap post-MVP1) |
| `B1` à `B4` (documents) | **Workflow de validation** des fiches groupement et production | La correspondance est directe : soumis → à valider → validé ou à corriger. C'est le lot le plus immédiatement utile |
| `D3` à `D6` (virements, paiements) | **Décaissements et appuis financiers** | Attention : remplacer les moyens de paiement par Wave, Orange Money, Free Money (CLAUDE.md §5) |
| `F3-annonce` | **Actualités** de la vitrine | |
| `F2-invitation_salon` | Invitation à une session de formation | |

## Sans objet ici

`C1` à `C4` (titres fonciers), `D1`–`D2` (Jëfs), `E1`–`E3` (ndiguels et fêtes religieuses),
`F1-promotion_collecteur`. Ils relèvent d'un domaine que le projet ne couvre pas.

## Comment en adapter un

1. `{% extends "emails/base.html" %}` et ne garder que les blocs : `titre`, `preheader`,
   `rubrique`, `illustration`, `alt`, `entete`, `contenu`, `postscriptum`.
2. Reprendre la palette du gabarit de base — accent `#1e856c`, texte `#16211e` / `#47544f`,
   encart `#f1f7f5`, bordure `#dfe7e4`. Ne pas réintroduire le violet `#4a3fd4` ni le jaune
   `#ffcd3c` de Yessal Gui.
3. L'illustration se référence par `src="cid:nom.png"` : elle est **jointe** au message, jamais
   chargée depuis un serveur.
4. Déclarer l'objet dans `SUJETS` de `comptes/courriels.py`, et écrire la version texte à la main.
