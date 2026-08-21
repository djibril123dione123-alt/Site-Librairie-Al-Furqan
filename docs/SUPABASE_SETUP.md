# Guide de configuration Supabase — Librairie Al Furqan

Ce document explique comment connecter Supabase au projet Al Furqan depuis zéro.

---

## Prérequis

- Compte Supabase (gratuit) : https://supabase.com
- Node.js ≥ 18
- Projet Next.js déjà installé (`npm install` effectué)

---

## Étape 1 — Créer un projet Supabase

1. Connectez-vous sur [app.supabase.com](https://app.supabase.com)
2. **New project** → nommez-le `al-furqan` → choisissez une région proche (Europe de l'Ouest de préférence)
3. Notez votre **mot de passe de base de données** en lieu sûr
4. Attendez la création (environ 1 minute)

---

## Étape 2 — Récupérer les variables d'environnement

Dans votre projet Supabase :

- Allez dans **Settings → API**
- Copiez :
  - **URL** → `NEXT_PUBLIC_SUPABASE_URL`
  - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (**NE JAMAIS partager**)

Créez votre fichier `.env.local` à la racine du projet :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_ALLOW_INDEXING=false
```

> ⚠ Le fichier `.env.local` est dans `.gitignore`. Ne le commitez jamais.

---

## Étape 3 — Exécuter les migrations SQL

Dans Supabase, allez dans **SQL Editor → New query** et exécutez dans l'ordre :

### 3.1 — Schéma principal

Copiez-collez le contenu de :
```
supabase/migrations/001_schema.sql
```

### 3.2 — Row Level Security

```
supabase/migrations/002_rls.sql
```

### 3.3 — Seed catégories + aliases

```
supabase/migrations/003_seed_categories.sql
```

### 3.4 — Storage

```
supabase/migrations/004_storage.sql
```

> Si une erreur apparaît sur la politique storage, créez d'abord le bucket manuellement (étape 5).

---

## Étape 4 — Créer le compte administrateur

### 4.1 — Créer l'utilisateur

Dans Supabase → **Authentication → Users → Invite user** :

- Email : l'email de l'administrateur Al Furqan
- L'utilisateur recevra un email d'invitation pour définir son mot de passe

**OU** via le SQL Editor :

```sql
-- Créer un utilisateur directement (remplacez les valeurs)
select auth.admin_create_user('{
  "email": "admin@alfurqan.sn",
  "password": "VotreMotDePasseSecurise!",
  "email_confirm": true
}');
```

### 4.2 — Lui attribuer le rôle admin

Récupérez l'UUID de l'utilisateur dans Authentication → Users, puis :

```sql
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'uuid-de-lutilisateur-ici';
```

---

## Étape 5 — Configurer le Storage

1. Dans Supabase → **Storage → New bucket**
2. Nom : `product-images`
3. Cocher **Public bucket** ✓
4. Cliquer **Create bucket**

Les policies d'accès sont définies dans `004_storage.sql`.

---

## Étape 6 — Vérifier le RLS

Dans Supabase → **Table Editor** → sélectionnez `products` :

- Vérifiez que **Row Level Security** est activé (icône cadenas)
- Vérifiez les policies dans **Authentication → Policies**

Test rapide :
```sql
-- Doit retourner 0 lignes si aucun produit publié
SELECT * FROM products WHERE status = 'published';

-- Doit échouer (RLS interdit l'insert anonyme)
INSERT INTO products (title, slug, status) VALUES ('Test', 'test', 'published');
```

---

## Étape 7 — Générer les types TypeScript (optionnel, recommandé)

Une fois Supabase connecté, vous pouvez auto-générer les types depuis votre schéma réel :

```bash
npx supabase login
npx supabase gen types typescript --project-id VOTRE_PROJECT_ID > lib/types/database.ts
```

Cela remplace le fichier de types manuels par une version exacte et à jour.

---

## Étape 8 — Lancer l'application

```bash
npm run dev
```

Accédez à : http://localhost:3000

Back-office admin : http://localhost:3000/admin

---

## Étape 9 — Saisir les premiers produits réels

> ⚠ Les 12 produits seeds dans `lib/al-furqan-data.ts` sont des exemples fictifs.  
> Ils sont visibles **uniquement** tant que Supabase n'est pas configuré.  
> Une fois Supabase connecté, le catalogue affichera uniquement ce que vous aurez saisi via le back-office.

1. Connectez-vous sur `/admin/login`
2. Allez dans **Produits → Ajouter un livre**
3. Renseignez les informations réelles
4. Sauvegardez en brouillon, vérifiez la fiche, puis publiez

---

## Étape 10 — Activer l'indexation Google

Une fois le vrai catalogue saisi et validé :

Dans `.env.local` ou votre hébergeur (Vercel), mettez :

```env
NEXT_PUBLIC_ALLOW_INDEXING=true
```

Cela active le `robots.txt` avec `allow: /` et permet l'indexation par les moteurs de recherche.

---

## Variables d'environnement récapitulatif

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | Clé publique (navigateur) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ Admin | Clé service (serveur uniquement) |
| `NEXT_PUBLIC_SITE_URL` | Recommandé | URL du site en production |
| `NEXT_PUBLIC_ALLOW_INDEXING` | Recommandé | `false` pendant développement |

---

## En cas de problème

**"Supabase non configuré — mode dev"** → Vérifiez que `.env.local` existe et contient les bonnes valeurs. Redémarrez `npm run dev` après modification.

**"Accès refusé" sur /admin** → Vérifiez que votre utilisateur a bien `role = 'admin'` dans la table `profiles`.

**Images non affichées** → Vérifiez que le bucket `product-images` est bien en mode Public dans Supabase Storage.

**RLS error sur insert** → Normal pour les utilisateurs non-admin. Vérifiez que vous êtes bien connecté et que votre profil est `admin`.

---

## Données Al Furqan à préparer avant saisie

Pour chaque ouvrage, préparez idéalement :

- [ ] Titre exact
- [ ] Auteur (nom complet tel qu'affiché)
- [ ] Éditeur
- [ ] Catégorie
- [ ] Prix en XOF
- [ ] Disponibilité actuelle (stock)
- [ ] Photo de la couverture (JPG/PNG, max 5 Mo)
- [ ] Description (courte phrase ou paragraphe)
- [ ] ISBN si disponible
- [ ] Pour les Corans : lecture (Hafs/Warsh), Tajwid oui/non, format, couleur
