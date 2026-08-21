# Al Furqan — État du projet et points à confirmer

Ce document est interne. Il n'est pas visible sur le site public.

## À obtenir auprès d'Al Furqan

### Catalogue
- Catalogue complet des ouvrages (titres, auteurs, éditeurs, prix, stock)
- Vraies couvertures de livres (photos ou fichiers)
- ISBN, nombre de pages, dimensions, reliure, année pour chaque ouvrage
- Détails des éditions de Coran (lectures Hafs/Warsh disponibles, formats, couleurs, tajwid)
- Liste réelle des auteurs et éditeurs distribués

### Informations commerciales
- Adresse exacte de la librairie (si souhaitée sur le site)
- Horaires d'ouverture (si pertinents)
- Tarifs de livraison réels par destination et par transporteur
- Délais de livraison (si confirmés)
- Politique d'échange/retour (si applicable)
- Conditions générales de vente (si souhaitées)

### Marque
- Logo officiel en haute définition (fourni : image.png — logo oiseau)
- Chartre graphique précise si elle existe
- Domaine souhaité pour la mise en production

### Contenu
- Texte définitif de la section « À propos » (parcours, qualifications — uniquement si validés)
- Sélection définitive des collections éditoriales (choix des ouvrages par Al Furqan)
- Vidéos TikTok à mettre en avant et livres associés
- Contenu religieux/didactique des collections (à valider par Al Furqan)

## Déjà intégré

- Numéro WhatsApp réel : +221 77 700 85 62
- Liens TikTok et Facebook Marketplace
- Localisation : Saint-Louis, Sénégal
- Catégories connues (Coran, Tafsir, Invocations, Croyance, etc.)
- Méthodes de livraison observées : La Poste, Dem Dikk, Tiak Tiak
- 12 produits de démonstration cohérents

## Travail technique futur

### Backend (phase suivante)
- Brancher les données à Supabase ou une API équivalente
- Table products, variants, collections, authors, publishers
- Back-office/admin pour gérer le catalogue
- Stockage des images de couverture (Supabase Storage ou CDN)

### Fonctionnalités
- Analytics (events : search, product_view, add_to_cart, whatsapp_click, etc.)
- Notifications WhatsApp automatisées (si souhaité)
- Compte client (si demandé)
- Paiement en ligne (si demandé — Stripe)
- Sitemap dynamique avec lastModified réel
- OpenGraph images générées par livre

### Contenu
- Remplacer les 12 produits de démonstration par le catalogue réel
- Remplacer les couvertures CSS par les vraies photos
- Valider et compléter les informations bibliographiques
- Ajouter les pages internes du sommaire (« Feuilleter ») si les photos sont disponibles
