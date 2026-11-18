# Pagepreview : aperçu au survol

Plugin DokuWiki (`pagepreview`).

Au survol d'un lien vers une autre page, affiche le haut de cette page dans une **carte flottante**, comme les aperçus de page d'Obsidian. Les aperçus sont **imbriqués** : on peut survoler un lien dans une carte pour en ouvrir une autre. Une icône à double flèche en haut à droite de la carte ouvre la page.

## Configuration

| Réglage | Défaut | Rôle |
| --- | --- | --- |
| `delay` | 400 | délai (ms) avant l'apparition de la carte |
| `chars` | 1200 | longueur de l'extrait |

## Dépendances

Aucune.

## Installation

Copier le contenu de ce dépôt dans `lib/plugins/pagepreview/` (le fichier `plugin.info.txt` doit se trouver à la racine de ce dossier), puis vider le cache en rendant la date de `conf/local.php` plus récente (`touch conf/local.php`).

Avec le gestionnaire d'extensions de DokuWiki : *Administration → Gestionnaire d'extensions → Installer*, en indiquant l'adresse du dépôt (archive ZIP).

## Licence

Aucune licence n'a encore été choisie : à ajouter (fichier `LICENSE`) avant de publier le dépôt. DokuWiki est sous GPL-2.0.
