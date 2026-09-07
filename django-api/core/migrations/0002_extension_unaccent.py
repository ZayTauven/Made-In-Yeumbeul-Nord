"""
Installe l'extension PostgreSQL « unaccent ».

Sans elle, la recherche serait sensible aux accents : « maraichage » ne
trouverait pas « maraîchage » et « Ainoumady » ne trouverait pas « Aïnoumady ».
Sur un corpus français, une recherche qui ignore les formes non accentuées
paraît simplement cassée (`PLAN & PRODUCT/15-CONTRAT-API.md` §2).

`CREATE EXTENSION` demande des droits de superutilisateur. En développement,
le compte `postgres` les a. Sur un serveur mutualisé où ce ne serait pas le cas,
un administrateur doit exécuter une seule fois :

    CREATE EXTENSION IF NOT EXISTS unaccent;
"""

from django.contrib.postgres.operations import UnaccentExtension
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0001_initial"),
    ]

    operations = [
        UnaccentExtension(),
    ]
