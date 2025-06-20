# Architecture WebSocket dans votre Application

Je vais vous expliquer exactement où et comment la connexion WebSocket est établie dans votre code, ainsi que toute la démarche pour les subscriptions GraphQL.

## 🔌 Où se fait la Connexion WebSocket

### 1. Configuration dans ApolloWrapper.tsx

La connexion WebSocket est configurée dans `ApolloWrapper.tsx` :

```
// Import des dépendances WebSocket
import { GraphQLWsLink } from "@apollo/client/
link/subscriptions"
import { createClient } from "graphql-ws"

// Création du lien WebSocket (uniquement côté 
client)
const wsLink = typeof window !== "undefined"
  ? new GraphQLWsLink(
      createClient({
        url: process.env.
        NEXT_PUBLIC_GRAPHQL_WS_URL!, // wss://
        subgraph.satsuma-prod.com/...
      })
    )
  : null

// Configuration du split pour router les 
requêtes
const splitLink = wsLink
  ? split(
      ({ query }) => {
        const definition = getMainDefinition
        (query)
        return (
          definition.kind === 
          "OperationDefinition" &&
          definition.operation === 
          "subscription" // ← Ici on détecte 
          les subscriptions
        )
      },
      wsLink,    // ← WebSocket pour les 
      subscriptions
      httpLink   // ← HTTP pour les queries/
      mutations
    )
  : httpLink
```

### 2. Variables d'Environnement

Dans votre .env.local :

```
NEXT_PUBLIC_GRAPHQL_HTTP_URL="https://subgraph.
satsuma-prod.com/.../api"
NEXT_PUBLIC_GRAPHQL_WS_URL="wss://subgraph.
satsuma-prod.com/.../api"
```

## 🚀 Démarche Complète pour les WebSockets

### Étape 1: Initialisation de l'Application

1. Layout.tsx enveloppe l'app avec ApolloWrapper
2. ApolloWrapper configure le client Apollo avec le split HTTP/WebSocket
3. La connexion WebSocket est établie automatiquement au premier usage

### Étape 2: Utilisation des Subscriptions

Dans `MarketWatcher.tsx` :

```
import { useSubscription, gql } from "@apollo/
client"

// Définition de la subscription GraphQL
const MARKET_SUBSCRIPTION = gql`
  subscription MarketCreated($marketAddress: 
  ID!) {
    markets(where: { id: $marketAddress }) {
      id
      question
      description
      creator
      createdAt
    }
  }
`

// Utilisation du hook useSubscription
const { data, loading, error } = 
useSubscription(MARKET_SUBSCRIPTION, {
  variables: { marketAddress },
  onData: ({ data }) => {
    if (data?.data?.markets && data.data.
    markets.length > 0) {
      console.log("🎉 Marché indexé dans le 
      subgraph!", data.data.markets[0])
      onMarketIndexed?.()
    }
  },
})
```

## 🔄 Flux Complet des Composants

### 1. Création d'un Marché

```
// 1. L'utilisateur crée un marché
const { writeContract } = useWriteContract()

// 2. Transaction envoyée à la blockchain
writeContract({
  address: FACTORY_ADDRESS,
  abi: factoryAbi,
  functionName: "createMarket",
  args: [/* paramètres du marché */]
})

// 3. Une fois la transaction confirmée, on 
lance le watcher
<MarketWatcher
  marketAddress={predictedMarketAddress}
  onMarketIndexed={handleMarketIndexed}
/>
```

### 2. Surveillance via WebSocket

```
// Le composant MarketWatcher s'abonne 
automatiquement
// aux changements du subgraph via WebSocket
const { data, loading, error } = 
useSubscription(MARKET_SUBSCRIPTION, {
  variables: { marketAddress },
  onData: ({ data }) => {
    // Callback appelé quand le subgraph 
    indexe le nouveau marché
    if (data?.data?.markets && data.data.
    markets.length > 0) {
      onMarketIndexed?.() // ← Notifie le 
      parent que c'est indexé
    }
  },
})
```

### 3. Gestion des États

```
// États dans CreateMarketModal
if (loading) {
  return (
    <div className="flex items-center 
    space-x-2 text-blue-400">
      <div className="animate-spin 
      rounded-full h-4 w-4 border-b-2 
      border-blue-400"></div>
      <span>En attente d'indexation du 
      subgraph...</span>
    </div>
  )
}

if (error) {
  return (
    <div className="text-red-400">Erreur 
    WebSocket : {error.message}</div>
  )
}

if (data?.markets && data.markets.length > 0) {
  return (
    <div className="text-green-400 flex 
    items-center space-x-2">
      <span>Marché indexé avec succès!</span>
    </div>
  )
}
```

## 🎯 Avantages de cette Architecture

1. Temps Réel : Les utilisateurs voient immédiatement quand leur marché est indexé
2. Efficacité : Pas besoin de polling, le subgraph pousse les données
3. Séparation : HTTP pour les requêtes classiques, WebSocket pour le temps réel
4. Robustesse : Gestion automatique des reconnexions par graphql-ws

## 🔧 Points Techniques Importants

- SSR Safe : typeof window !== "undefined" évite les erreurs côté serveur
- Split automatique : Apollo route automatiquement selon le type d'opération
- Gestion d'erreurs : Chaque subscription peut gérer ses propres erreurs
- Variables dynamiques : Les subscriptions peuvent recevoir des paramètres
  Cette architecture vous permet d'avoir une expérience utilisateur fluide où les changements blockchain sont reflétés en temps réel dans l'interface !
