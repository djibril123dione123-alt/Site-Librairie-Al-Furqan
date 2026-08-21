# Librairie Al Furqan — Site public

Site web de la Librairie Al Furqan, librairie islamique basée à Saint-Louis, Sénégal.

## Stack

- Next.js 13 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui (composants de base)
- Lucide React (icônes)
- Données locales (pas de backend requis pour le moment)

## Lancement

```bash
npm install
npm run dev
```

Le site est disponible sur `http://localhost:3000`.

## Déploiement (Vercel)

1. Connecter le dépôt à Vercel.
2. Aucune variable d'environnement requise.
3. Déployer.

## Architecture

```
app/
  layout.tsx        — layout racine, metadata globale, schema.org
  page.tsx          — homepage
  demo-app.tsx      — application client (routing par pathname)
  [...slug]/page.tsx — catch-all pour routes dynamiques
  globals.css       — styles globaux et design system
  sitemap.ts        — sitemap dynamique
  robots.ts         — robots.txt

lib/
  al-furqan-data.ts — données, types, fonctions d'accès, configuration
  utils.ts          — utilitaires (cn)

components/ui/      — composants shadcn/ui
```

## Configuration

Toute la configuration commerciale est centralisée dans `lib/al-furqan-data.ts` :

```ts
export const siteConfig = {
  brand: 'Librairie Al Furqan',
  whatsapp: '221777008562',
  phoneDisplay: '+221 77 700 85 62',
  location: 'Saint-Louis, Sénégal',
  tiktok: 'https://www.tiktok.com/@alfurqan.librairie',
  facebook: 'https://www.facebook.com/marketplace/profile/100011780529274/',
  ...
};
```

Pour changer le numéro WhatsApp, modifier `siteConfig.whatsapp`.
Pour ajouter/modifier un produit, éditer le tableau `products`.
Pour ajouter/modifier une collection, éditer le tableau `collections`.

## Données

Les produits, catégories et collections sont définis dans `lib/al-furqan-data.ts`.
La couche d'accès (`findProduct`, `searchProducts`, `getRelatedProducts`, etc.)
sépare les composants des données, facilitant un futur branchement à une API ou Supabase.

## Routes

- `/` — Homepage
- `/catalogue` — Catalogue (avec `?categorie=`, `?q=`, `?nouveautes=1`)
- `/livres/[slug]` — Fiche livre
- `/collections/[slug]` — Collection éditoriale
- `/panier` — Panier
- `/selection` — Ma sélection (wishlist)
- `/livraison` — Informations de livraison
- `/a-propos` — À propos
- `/contact` — Contact
- 404 — Page introuvable

## Fonctionnalités

- Recherche avec normalisation (accents, casse, apostrophes, alias/translittérations)
- Autocomplete avec navigation clavier (flèches, Entrée, Échap)
- Filtres (catégorie, langue, disponibilité, lecture Hafs/Warsh)
- Tri (pertinence, nouveautés, prix)
- Panier persistant (localStorage) avec génération de message WhatsApp
- Ma sélection (wishlist persistante)
- Récemment consultés (localStorage)
- Variantes de produits (Coran : lecture, format, couleur)
- SEO : metadata dynamiques, sitemap, robots, OpenGraph, schema.org
- Responsive mobile-first (390px → 1440px)
- Accessibilité : navigation clavier, aria, focus, reduced motion
