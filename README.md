# 🍽️ Frood

**Décide enfin où manger.**

Trouve les meilleurs restaurants autour de toi selon ton budget, puis laisse un **tournoi à élimination** choisir le gagnant. Mode groupe, partage et favoris — le tout gratuit (avec un plan Premium optionnel).

## Stack

- [Next.js](https://nextjs.org/docs) 16 (App Router, RSC, TypeScript)
- [Tailwind CSS](https://tailwindcss.com) v4 + [shadcn/ui](https://ui.shadcn.com) (Radix primitives)
- [Supabase](https://supabase.com) — Auth, profils, favoris, historique, abonnements
- [Stripe](https://stripe.com) — abonnements Premium (checkout + webhooks)
- PWA installable (`app/manifest.ts` + service worker), mobile-first

## Démarrage rapide

```bash
npm install
npm run dev
```

Ouvre http://localhost:3000 — l'app fonctionne **sans aucune configuration**
(restaurants mock, favoris/historique en localStorage, Premium simulé via la
pagette `/premium?mock=success=true`).

### Options d'environnement

Voir `.env.example`. Toutes les variables sont optionnelles :

| Variable | Rôle | Exemple |
| --- | --- | --- |
| `NEXT_PUBLIC_DEV_PREMIUM` | Donne Premium à tout le monde (dev) | `true` |
| `NEXT_PUBLIC_USE_MOCK_RESTAURANTS` | Vrai = restaurants mock (défaut) | `false` pour l'API réelle |
| `OVERPASS_INTERPRETER` | Miroir Overpass pour les restaurants réels (optionnel) | … |
| `GOOGLE_PLACES_API_KEY` | Vraies photos sur les cartes (serveur) | `AIza…` |
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | Auth + sync des données | … |
| `NEXT_PUBLIC_STRIPE_PRICE_MONTHLY` / `_YEARLY` | Prix Stripe (public) | `price_…` |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Paiements réels (serveur) | `sk_live_…` |

### Restaurants réels (gratuit, sans clé)

En désactivant `NEXT_PUBLIC_USE_MOCK_RESTAURANTS`, les restaurants sont chargés
d'**OpenStreetMap** via l'API Overpass (`app/api/restaurants`, route serveur :
rien n'est exposé au client) : cuisine détectée depuis les tags OSM, prix estimé
par type de cuisine, distance calculée. Aucune clé ni facturation. Plusieurs
miroirs publics sont essayés en ordre (`OVERPASS_INTERPRETER` pour l'override),
et si le fournisseur est indisponible, les données mock servent de repli
silencieux.

### Photos des restaurants

Les cartes affichent la **vraie photo** du restaurant via `/api/photo?name=…`
(route serveur, image par image — la liste ne bloque jamais) :

- **Sans clé (défaut, 0 €)** : Wikimedia Commons — photo réelle quand elle
  existe (lieux notoires), sinon repli photo de stock.
- **Avec `GOOGLE_PLACES_API_KEY`** : Google Places d'abord (couverture
  totale), Commons en secours. Grille gratuite : **5 000 Text Search +
  1 000 photos/mois**.

Activation Google (optionnel, carte bancaire exigée par Google — aucune API
Maps fonctionne sans) :

1. [Google Cloud Console](https://console.cloud.google.com/) → projet.
2. **Billing → Link a billing account**.
3. **APIs & Services → Enable APIs → « Places API (New) »** (pas Legacy).
4. **Credentials → API key** → `.env.local` → `GOOGLE_PLACES_API_KEY=…` →
   redémarre `npm run dev`.

## Parcours de l'utilisateur

1. **Accueil** — « Tu manges quoi aujourd'hui ? »
   - Budget : `<10€`, `10–15€`, `15–25€`, `25–40€`, `Peu importe`
   - Distance : `1 / 3 / 5 / 10 km` (géolocalisation, ou saisie d'une ville)
   - Cuisines : Burger 🍔, Pizza 🍕, Japonais 🍣, Mexicain 🌮, Asiatique 🥡,
     Healthy 🥗, Poulet 🍗, Café ☕, Tout 🌎
2. **Sélection** — choisis tes restaurants (gratuit jusqu'à 8, Premium jusqu'à 32).
3. **Tournoi** — élimination directe : choisis un gagnant à chaque match (Quarts →
   Demi → Finale). Un tournoi sans 2 participants minimum est impossible.
4. **Victoire** 🏆 — photo, « Voir le restaurant », « Ajouter aux favoris »,
   « Refaire un tournoi », « Partager » (Web Share API + presse-papiers).
5. **Favoris / Historique / Profil** — synchronisés avec Supabase si connecté.

## Monetisation (plan Free vs Premium)

- **Free** : jusqu'à 8 restaurants / tournoi, 3 tournois / jour, 20 favoris.
- **Premium** : jusqu'à 32 restaurants, tournois illimités, favoris illimités,
  historique, filtres avancés — `3,99 €/mois` ou `29,99 €/an` (≈ −37 %).

Toute la logique de gating est centralisée dans `lib/feature-flags.ts` ;
rendre un feature Premium = modifier `PREMIUM_FEATURES` + `canUseFeature`.

Paiements : `app/api/stripe/checkout` (création de session), `app/api/stripe/webhook`
(sync `subscriptions` + `profiles.subscription_status`), `app/api/stripe/portal`
(gestion de l'abonnement). Sans clé Stripe, un **mode simulation** est utilisé
(`lib/dev-subscription.ts`, localStorage).

## Suppabase

1. Crée un projet, exécute `supabase/migrations/001_initial.sql` puis
   `supabase/migrations/002_admin.sql`.
2. Active les providers **Email/Password** et **Google** (Authentication → Providers).
3. Copie les clés dans `.env.local`.

Tables : `profiles`, `favorites`, `tournaments`, `subscriptions` — toutes avec RLS
(chaque utilisateur ne voit que ses données ; les admin voient/éditent tout).

## Administration & Premium à vie

Un compte **admin** peut donner/retirer le **Premium à vie** à n'importe quel
utilisateur, **sans paiement** (accord temporaire, remboursement, VIP, testeur…).

1. **Promouvoir un compte admin** (SQL Editor de Supabase) :
   ```sql
   update public.profiles set is_admin = true where id = '<uuid-de-ton-compte>';
   ```
2. Connecte-toi avec ce compte puis ouvre **/admin**.
3. Bouton « Donner Premium à vie » par utilisateur.

Le Premium à vie est stocké dans `profiles.premium_lifetime` : il est indépendant
des abonnements Stripe et **jamais annulé par un webhook**. Un admin peut aussi
promouvoir d'autres admin (`profiles.is_admin`). Toute la partie admin est dans
`components/admin/` + `services/adminService.ts` — protégée côté UI et par RLS
(`public.is_admin()` dans `002_admin.sql`).

## PWA

- `app/manifest.ts` — app name/theme/image.
- `public/sw.js` — app shell + cache stale-while-revalidate (les appels `/api/` ne sont jamais mis en cache).
- Icônes : `app/icon.svg` + `public/icon-192.png` / `icon-512.png`.

## Architecture

- `config/app.ts` — nom & textes de l'app (rebranding en un seul fichier).
- `components/` — `home`, `restaurants`, `tournament`, `favorites`, `history`,
  `premium`, `profile`, `auth`, `admin`, `navigation`, `ui`.
- `hooks/` — `useTournament`, `useRestaurants`, `useLocation`, `useFavorites`,
  `useTournamentHistory`, `useTournamentLaunch`, `useSubscription`.
- `services/` — `restaurantService`, `locationService`, `tournamentService`,
  `shareService`, `stripeService`, `adminService` (l'UI ne touche jamais les données directement).
- `lib/` — `feature-flags`, `session-context`, `supabase/*`, `pricing`, utils.
- `types/`, `data/` — modèles et données mock.

## Vérification

```bash
npm run lint      # ESLint (next build ne lint plus depuis Next 15)
npx tsc --noEmit  # typecheck
npm run build
```

## Déploiement (Vercel)

Importe le repo sur [Vercel](https://vercel.com/new), renseigne les variables
d'environnement, puis configure le webhook Stripe
(`https://<ton-app>.vercel.app/api/stripe/webhook`) avec les événements
`checkout.session.completed`, `customer.subscription.updated` (créé/mis à jour),
`customer.subscription.deleted`.

## Distribution mobile (Play Store / App Store)

L'app est un PWA ; pour l'App Store et le Play Store elle est emballée dans un
shell natif [Capacitor](https://capacitorjs.com) qui charge le site déployé en HTTPS
(les routes serveur Stripe restent sur le serveur).

### Prérequis store
- Compte **Google Play Console** (25 $, unique), compte **Apple Developer** (99 $/an).
- Une URL de production stable, en **HTTPS**, qui **ne change jamais**
  (`CAPACITOR_SERVER_URL`) — le bundle natif pointe dessus.
- Policy de confidentialité + politique de données publiques (requis par Google & Apple).
- **Recommandé** : gomme tes données 100 % gratuites **sans** passer par l'In-App Purchase
  (IAP) : utilise l'admin pour accorder le Premium à vie (`/admin`). Si tu vends le
  Premium **dans** l'app iOS, Apple exige son IAP (30 % de commission) — le checkout
  Stripe externe n'est autorisé que pour les abonnements de type média/lecture.

### Les projets natifs (déjà générés)
Les projets `android/` et `ios/` existent (générés par `npm run mobile:add`) :
- App id `com.frood.app`, nom `Frood`.
- Icônes & splash générés depuis `assets/icon.png` (1024) + `assets/splash.png` (2732).

### Build Android (Windows ou Mac)
```bash
npm install
npx cap sync android          # copie le config + assets
npx cap open android          # ouvre Android Studio
```
Dans Android Studio : Build → Generate Signed Bundle (**.aab**, requis Play Store) →
upload sur Google Play (créer l'app, sous « Production »). Bump de version :
`android/app/build.gradle` (versionCode/versionName).

### Build iOS (nécessite macOS + Xcode)
```bash
npm install
npx cap sync ios
npx cap open ios              # ouvre Xcode
```
Dans Xcode : signer l'app (Team), incrémenter version, Product → Archive →
Organizer → upload → App Store Connect.

### PWA directe (Play Store, alternative sans Capacitor)
Google accepte aussi les PWAs via Trusted Web Activity (Bubblewrap) ; pas besoin de
bundle natif, mais les stores restent fournis par l'APK. Apple n'a pas d'équivalent.

### Relancer les assets natifs après rebranding
```bash
npm run mobile:assets   # régénère icônes + splash depuis assets/
```

> ⚠️ Le bundle natif charge le site distant : après un déploiement web, pense à
> bump le **versionCode/versionName** natif avant de resoumettre aux stores.