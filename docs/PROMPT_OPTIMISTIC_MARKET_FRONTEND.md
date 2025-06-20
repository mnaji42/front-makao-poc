# 🚀 Prompt pour créer un Frontend de Test - Marchés Optimistes

## 📋 Contexte du Projet

Créer un frontend Next.js minimal pour tester les fonctionnalités de **marchés optimistes** avec Apollo Client. Le projet doit être simple, moderne et fonctionnel avec :

- **Page principale** avec connexion MetaMask
- **Création de marchés** avec cache optimiste
- **Liste des marchés** (réels + optimistes)
- **Design system** moderne Web3

## 🎯 Objectifs

1. ✅ Interface simple et intuitive
2. ✅ Intégration complète du cache optimiste
3. ✅ Design moderne sans gradients flashy
4. ✅ Architecture modulaire et maintenable
5. ✅ Tests en temps réel des fonctionnalités

---

## 📦 Stack Technique

### Technologies Principales

- **Next.js 15**
- **TypeScript**
- **Tailwind CSS**
- **Apollo Client** (avec cache optimiste)
- **Wagmi** (connexion Web3)
- **Viem** (interactions blockchain)

### Dépendances à installer

```bash
# Créer le projet
npx create-next-app@latest optimistic-market-test --typescript --tailwind --eslint --app
cd optimistic-market-test

# Apollo Client
npm install @apollo/client graphql

# Web3 & Wagmi
npm install wagmi viem @tanstack/react-query

# Utilitaires
npm install clsx class-variance-authority lucide-react
npm install @types/node
```

---

## 🗂️ Fichiers à Récupérer du Projet Existant

### 📁 Structure à copier :

```
src/
├── hooks/
│   └── useOptimisticMarket.ts          # ✅ Hook principal optimiste
├── lib/
│   ├── apollo-client.ts                # ✅ Configuration Apollo
│   ├── graphql-fragments.ts            # ✅ Fragments GraphQL
│   └── subgraph.ts                     # ✅ Requêtes subgraph
├── components/
│   ├── OptimisticMarketsList.tsx       # ✅ Liste avec marchés optimistes
│   ├── MarketCreator.tsx               # ✅ Créateur de marchés
│   └── MarketPolling.tsx               # ✅ Polling intelligent
└── contexts/
    └── NotificationContext.tsx         # ✅ Système de notifications
```

### 📋 Instructions de copie :

1. **Créer les dossiers** : `src/hooks`, `src/lib`, `src/components`, `src/contexts`
2. **Copier les fichiers** listés ci-dessus
3. **Adapter les imports** si nécessaire
4. **Vérifier les types** TypeScript

---

## 🎨 Design System

### 🎯 Principes de Design

- **Moderne et épuré** : Interfaces claires, espaces aérés
- **Web3 friendly** : Couleurs sombres, accents bleus/verts
- **Pas de gradients flashy** : Couleurs solides et subtiles
- **Accessibilité** : Contrastes suffisants, tailles lisibles

### 🎨 Palette de Couleurs

```css
/* Couleurs principales */
--bg-primary: #0f172a      /* Fond principal (slate-900) */
--bg-secondary: #1e293b    /* Fond secondaire (slate-800) */
--bg-tertiary: #334155     /* Fond tertiaire (slate-700) */

/* Textes */
--text-primary: #f8fafc    /* Texte principal (slate-50) */
--text-secondary: #cbd5e1  /* Texte secondaire (slate-300) */
--text-muted: #64748b      /* Texte atténué (slate-500) */

/* Accents */
--accent-blue: #3b82f6     /* Bleu principal (blue-500) */
--accent-green: #10b981    /* Vert succès (emerald-500) */
--accent-orange: #f59e0b   /* Orange warning (amber-500) */
--accent-red: #ef4444      /* Rouge erreur (red-500) */

/* Bordures */
--border-primary: #475569  /* Bordure principale (slate-600) */
--border-secondary: #64748b /* Bordure secondaire (slate-500) */
```

### 🧩 Composants de Base

```typescript
// Bouton principal
const Button = {
  primary:
    "bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors",
  secondary:
    "bg-slate-700 hover:bg-slate-600 text-slate-200 px-6 py-3 rounded-lg font-medium transition-colors",
  outline:
    "border border-slate-600 hover:border-slate-500 text-slate-200 px-6 py-3 rounded-lg font-medium transition-colors",
}

// Cartes
const Card = {
  base: "bg-slate-800 border border-slate-700 rounded-xl p-6",
  hover:
    "bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-colors",
}

// Inputs
const Input = {
  base: "bg-slate-700 border border-slate-600 text-slate-200 px-4 py-3 rounded-lg focus:border-blue-500 focus:outline-none",
}
```

---

## 🏗️ Architecture du Projet

### 📁 Structure des Dossiers

```
src/
├── app/
│   ├── layout.tsx                 # Layout principal avec providers
│   ├── page.tsx                   # Page d'accueil
│   └── globals.css                # Styles globaux
├── components/
│   ├── ui/                        # Composants UI de base
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   └── Badge.tsx
│   ├── web3/                      # Composants Web3
│   │   ├── ConnectWallet.tsx
│   │   └── WalletStatus.tsx
│   ├── markets/                   # Composants marchés
│   │   ├── MarketCard.tsx
│   │   ├── MarketForm.tsx
│   │   └── MarketsList.tsx
│   └── layout/                    # Composants layout
│       ├── Header.tsx
│       └── Navigation.tsx
├── hooks/                         # Hooks personnalisés (copiés)
├── lib/                          # Utilitaires et config (copiés)
├── contexts/                     # Contextes React (copiés)
└── types/                        # Types TypeScript
    └── market.ts
```

### 🔧 Configuration des Providers

```typescript
// app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className="bg-slate-900 text-slate-50">
        <WagmiProvider>
          <ApolloProvider>
            <NotificationProvider>{children}</NotificationProvider>
          </ApolloProvider>
        </WagmiProvider>
      </body>
    </html>
  )
}
```

---

## 🧩 Composants à Créer

### 1. 🔗 ConnectWallet.tsx

**Fonctionnalités :**

- Bouton de connexion MetaMask
- Affichage de l'adresse connectée
- Gestion des erreurs de connexion
- Indicateur de statut réseau

**Design :**

- Bouton bleu principal quand déconnecté
- Badge vert avec adresse tronquée quand connecté
- Icône MetaMask

### 2. 📝 MarketForm.tsx

**Fonctionnalités :**

- Formulaire de création de marché
- Validation des champs
- Intégration du hook `useOptimisticMarket`
- Feedback visuel de création

**Champs :**

- Titre du marché
- Description
- Date de fin
- Token de mise (preset)
- Événements/options

### 3. 📊 MarketCard.tsx

**Fonctionnalités :**

- Affichage d'un marché individuel
- Badge "Optimiste" pour les marchés non confirmés
- Indicateur de synchronisation
- Actions rapides (voir détails)

**Design :**

- Carte avec bordure subtile
- Badge orange pour les marchés optimistes
- Animation de loading pour la synchronisation

### 4. 📋 MarketsList.tsx

**Fonctionnalités :**

- Liste de tous les marchés (réels + optimistes)
- Filtrage par statut
- Tri par date de création
- Pagination si nécessaire

### 5. 🎯 Header.tsx

**Fonctionnalités :**

- Logo/titre de l'application
- Bouton de connexion wallet
- Navigation simple
- Indicateur de réseau

---

## 📱 Page Principale (app/page.tsx)

### 🎯 Layout de la Page

```typescript
export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-900">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Section Hero */}
        <section className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-50 mb-4">
            Test des Marchés Optimistes
          </h1>
          <p className="text-slate-400 text-lg">
            Interface de test pour les fonctionnalités de cache optimiste
          </p>
        </section>

        {/* Section Actions */}
        <section className="mb-8">
          <div className="flex gap-4 justify-center">
            <ConnectWallet />
            <CreateMarketButton />
          </div>
        </section>

        {/* Section Marchés */}
        <section>
          <MarketsList />
        </section>
      </main>
    </div>
  )
}
```

### 🔄 Fonctionnalités Principales

1. **Connexion Wallet** → Bouton MetaMask prominent
2. **Création de Marché** → Modal avec formulaire
3. **Liste des Marchés** → Affichage temps réel avec optimistes
4. **Feedback Visuel** → Notifications et indicateurs

---

## ⚙️ Configuration Technique

### 🔧 Configuration Apollo Client

```typescript
// lib/apollo-client.ts (à adapter du projet existant)
import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client"

const httpLink = createHttpLink({
  uri: "https://api.studio.thegraph.com/query/[VOTRE_SUBGRAPH]",
})

export const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          markets: {
            merge(existing = [], incoming) {
              return [...existing, ...incoming]
            },
          },
        },
      },
    },
  }),
})
```

### 🔧 Configuration Wagmi

```typescript
// lib/wagmi.ts
import { createConfig, http } from "wagmi"
import { sepolia } from "wagmi/chains"
import { metaMask } from "wagmi/connectors"

export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [metaMask()],
  transports: {
    [sepolia.id]: http(),
  },
})
```

---

## 🎯 Utilisation du Hook Optimiste

### 📖 Documentation de Référence

Se baser sur le fichier `OPTIMISTIC_CACHE_DOCUMENTATION.md` du projet existant pour :

- Comprendre le fonctionnement du cache optimiste
- Utiliser correctement le hook `useOptimisticMarket`
- Implémenter les bonnes pratiques

### 🔄 Intégration dans MarketForm

```typescript
// components/markets/MarketForm.tsx
import { useOptimisticMarket } from "@/hooks/useOptimisticMarket"

export function MarketForm() {
  const { addOptimisticMarket } = useOptimisticMarket()

  const handleSubmit = async (formData) => {
    // 1. Ajouter au cache optimiste
    addOptimisticMarket(formData, options)

    // 2. Envoyer la transaction
    // 3. Le hook gère automatiquement la synchronisation
  }
}
```

### 📊 Intégration dans MarketsList

```typescript
// components/markets/MarketsList.tsx
import { OptimisticMarketsList } from "@/components/OptimisticMarketsList"

export function MarketsList() {
  return (
    <OptimisticMarketsList
      showOptimisticIndicators={true}
      onMarketClick={handleMarketClick}
    />
  )
}
```

---

## 🗺️ Roadmap de Développement

### Phase 1 : Setup Initial (30 min)

- [ ] Créer le projet Next.js
- [ ] Installer les dépendances
- [ ] Copier les fichiers du projet existant
- [ ] Configurer Tailwind avec le design system

### Phase 2 : Composants UI (45 min)

- [ ] Créer les composants de base (Button, Card, Input)
- [ ] Implémenter ConnectWallet
- [ ] Créer le Header et layout principal
- [ ] Tester la connexion MetaMask

### Phase 3 : Intégration Apollo (30 min)

- [ ] Configurer Apollo Client
- [ ] Adapter les requêtes GraphQL
- [ ] Tester les requêtes de base
- [ ] Vérifier le cache

### Phase 4 : Marchés Optimistes (60 min)

- [ ] Intégrer le hook useOptimisticMarket
- [ ] Créer MarketForm avec cache optimiste
- [ ] Implémenter MarketCard avec indicateurs
- [ ] Intégrer OptimisticMarketsList

### Phase 5 : Tests et Polish (30 min)

- [ ] Tester le flow complet
- [ ] Ajuster le design
- [ ] Ajouter les notifications
- [ ] Documenter les fonctionnalités

---

## 🚨 Points d'Attention

### ⚠️ Configuration Critique

1. **URL du Subgraph** : Mettre à jour l'URL dans apollo-client.ts
2. **Adresse des Contrats** : Vérifier les adresses dans les hooks
3. **Réseau** : S'assurer d'être sur Sepolia
4. **Types TypeScript** : Adapter les types si nécessaire

### 🔍 Debug et Tests

1. **Console Apollo** : Utiliser Apollo DevTools
2. **Cache Inspection** : Vérifier les données optimistes
3. **Network Tab** : Surveiller les requêtes GraphQL
4. **MetaMask** : Tester les transactions

### 📈 Optimisations

1. **Performance** : Lazy loading des composants
2. **UX** : Loading states et error boundaries
3. **Responsive** : Design mobile-friendly
4. **Accessibilité** : ARIA labels et navigation clavier

---

## 🎉 Résultat Attendu

Un frontend minimal mais complet permettant de :

✅ **Se connecter** avec MetaMask  
✅ **Créer des marchés** avec feedback instantané  
✅ **Voir les marchés** optimistes en temps réel  
✅ **Observer la synchronisation** blockchain  
✅ **Tester toutes les fonctionnalités** optimistes

**Design moderne, code propre, architecture modulaire !** 🚀
