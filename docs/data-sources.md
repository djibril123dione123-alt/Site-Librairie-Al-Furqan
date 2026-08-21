# Sources de Données Géographiques et Logistiques

Ce document résume l'analyse technique des sources de données officielles pour le Sénégal, et comment elles sont intégrées dans le projet Librairie Al Furqan.

## 1. ANSD (Agence Nationale de la Statistique et de la Démographie)

**Source :** Répertoire des localités (RGPH-5 2023)
**Lien officiel :** https://www.ansd.sn/donnees-recensements

### Analyse Technique
L'outil interactif sur le portail de l'ANSD cache en réalité un endpoint d'export direct au format CSV :
`https://www.ansd.sn/data-recensement.csv?field_liste_annee_value=2023&_format=csv`

En interrogeant cet endpoint avec un script Node.js (et en désactivant temporairement la stricte vérification SSL `rejectUnauthorized: false`), nous avons récupéré **l'intégralité du dataset RGPH-5 2023**.

### Structure des Données
Le fichier CSV téléchargé contient 25 318 lignes avec les colonnes suivantes :
- `Region`, `Departement`, `COM_ARRT_VILLE`, `COMMUNE`, `QUARTIER_VILLAGE_HAMEAU`

### Stratégie d'Importation
Un script `scripts/import-ansd-locations.ts` lit ce CSV et insère les 25 318 localités par lots de 1000 dans la table `senegal_locations` de Supabase.

---

## 2. La Poste Sénégal

**Source :** Carte du Réseau Postal (Google My Maps intégrée au site officiel)
**Lien officiel :** https://www.laposte.sn/trouver-un-bureau/
**Map ID:** `11FgBObnRyCpT006ykvUBXRvNtIX-G4qT`

### Analyse Technique
Le site de La Poste Sénégal intègre une carte Google My Maps officielle pour répertorier son réseau. Bien que l'export classique au format KML ne fournisse pas toujours les coordonnées précises (se reposant sur le géocodage à la volée des adresses), l'URL du "Viewer" Google My Maps (`https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT`) contient une variable embarquée `_pageData`.

En téléchargeant et en parsant directement cette variable JSON brute, nous avons pu identifier la structure exacte de chaque Placemark contenant les coordonnées géographiques réelles (latitude/longitude) assignées par La Poste lors de la création de la carte !

### Structure des Données Extraites
Nous avons extrait avec succès un fichier `laposte_offices_parsed.json` contenant **129 bureaux de poste uniques**, structurés ainsi :
- `name` : Nom du bureau de poste (ex: "Dakar Liberté")
- `latitude` : (ex: 14.7228367)
- `longitude` : (ex: -17.442546699999998)

*Cette méthode garantit la provenance officielle "La Poste Sénégal / Google My Maps" et nous évite tout géocodage arbitraire, garantissant l'authenticité des coordonnées.*

### Stratégie d'Importation
Un script `scripts/import-la-poste-offices.ts` lit le fichier JSON généré et alimente la table `delivery_points`, avec les coordonnées `latitude` et `longitude` désormais incluses. La fonctionnalité "Trouver le bureau le plus proche" pourra donc être activée.
