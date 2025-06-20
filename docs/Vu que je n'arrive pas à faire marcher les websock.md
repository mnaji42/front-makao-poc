# Vu que je n'arrive pas à faire marcher les websocket on va essayer la version avec le cache

Fais moi un plan complet à jour, avec toutes les dernières technologie à jour pour mettre en place ce système. Tu vas me faire un plan détaillé pour mettre en place ce système de cache avec nextjs 15 et appolo en utilisant les meilleur pratique.

Tu vas me faire un documents que je pourrais copié coller dans mon ide IA pour qu'il puisse suivre ce document.

Il faut que ce soit deterministe avec des exemples de code.

L'idée est que lorsque un marché est créé et qu'on a reçus la validation de la blockchain on mette en cache les informations du marché.

Puisque je n'arrive pas à faire fonctionner les websocket, on ne peut pas faire une connexion websocket pour mettre a jour le cache.

Donc il faudra trouver une solution pour ça.

On peut par exemple a chaque requète verifier a la fois le cache et le subgraph ? Je te laisse me faire une proposition.

Est ce que c'est possible que le cache soit cotè serveur pour que n'importe quel utilisater le voit ? Je ne sais pas si c'est une bonne pratique ?
Ou le cache est que coté client ? Donc uniquement le createur du marché pourra voir son marché avant tout le monde ?

Fais moi un guide complet

Comprendre et gérer le cache d'Apollo Client est crucial pour optimiser la performance et l'expérience utilisateur dans une application Next.js. Étant donné que les WebSockets ne sont pas une option viable pour la mise à jour en temps réel du cache depuis votre subgraph, nous allons implémenter un système basé sur l'**optimistic UI** et le **polling ciblé**.

---

# Guide Complet : Cache Optimiste avec Polling pour Marchés sur Next.js 15 \& Apollo Client

## Objectifs

1. **Affichage Immédiat (Optimistic UI)** : Dès la confirmation d'une transaction de création de marché par la blockchain (via Wagmi), afficher immédiatement le nouveau marché dans l'interface utilisateur, sans attendre l'indexation par le subgraph.
2. **Synchronisation Progressive** : Mettre en place un mécanisme de polling pour que le marché s'actualise avec les données réelles du subgraph dès qu'il est indexé, garantissant que le cache reflète la "source de vérité".
3. **Gestion du Cache** : Utiliser les meilleures pratiques d'Apollo Client pour la manipulation du cache côté client.

## Clarification sur le Cache

- **Cache Côté Client (Apollo InMemoryCache)** : Le cache d'Apollo Client (`InMemoryCache`) est **toujours côté client**. Cela signifie que chaque utilisateur aura sa propre copie du cache dans son navigateur. Si un utilisateur crée un marché et que l'on applique l'optimistic UI, seul cet utilisateur (sur son appareil) verra le marché "instantanément". Les autres utilisateurs ne le verront que lorsque le marché sera indexé par le subgraph et qu'ils le récupéreront via une requête.
- **Cache Côté Serveur** : Un cache côté serveur (par exemple, avec Redis) est utilisé pour partager des données entre plusieurs utilisateurs ou pour accélérer les requêtes SSR. Pour un affichage "immédiat" d'une action utilisateur spécifique, il n'est pas directement pertinent, car il faudrait que le serveur sache que _cet utilisateur_ vient de créer un marché et qu'il doive le mettre dans un cache partagé avant même l'indexation du subgraph. Cela ajoute une complexité considérable pour un bénéfice limité dans ce cas précis. La meilleure pratique pour l'affichage immédiat d'une action utilisateur est l'optimistic UI côté client.

## Stratégie Proposée

1. **Création du Marché (Front-end)** :
   - L'utilisateur interagit avec le contrat intelligent via Wagmi pour créer un marché.
   - Une fois la transaction confirmée par Wagmi, on **écrit manuellement** une représentation de ce nouveau marché dans le cache Apollo (optimistic update).
2. **Affichage Initial du Marché (Optimistic)** :
   - Le composant d'affichage du marché utilise `useQuery` avec une `fetchPolicy: "cache-first"`. Cela permet de récupérer et d'afficher instantanément le marché depuis le cache.
3. **Synchronisation avec le Subgraph (Polling)** :
   - Pour le composant affichant le marché, on active le **polling** avec `pollInterval`.
   - Ce polling interrogera régulièrement le subgraph. La `fetchPolicy` peut être ajustée sur `network-only` pendant le polling pour s'assurer que l'on obtient toujours les dernières données du serveur.
   - Dès que le subgraph a indexé le marché, le polling le récupérera, et Apollo mettra à jour l'entrée du cache, déclenchant un re-render du composant avec les données réelles.
   - Une fois le marché confirmé par le subgraph, le polling pourra être désactivé pour ce marché spécifique.

---

## 1. Installation des Dépendances

```bash
npm install @apollo/client graphql
```

_(Note : Nous n'avons plus besoin de `graphql-ws` ni `@apollo/client-integration-nextjs` si les WebSockets ne sont pas utilisés du tout et que vous gérez le client Apollo manuellement pour Next.js 15, bien que le package `apollo-client-integration-nextjs` puisse simplifier le setup pour SSR/RSC. Pour cet exemple, nous allons rester minimaliste en ne réutilisant que les `ApolloClient` et `InMemoryCache`.)_

## 2. Configuration d'Apollo Client (pour CSR \& SSR/RSC)

### `lib/apollo-client.ts`

Pour garantir une instance unique du client Apollo, utilisable à la fois en Server Components et Client Components.

```typescript
import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client"

// Fonction pour créer une nouvelle instance d'ApolloClient
function createApolloClient() {
  return new ApolloClient({
    link: new HttpLink({
      uri: process.env.NEXT_PUBLIC_GRAPHQL_HTTP_URL, // Assurez-vous que cette variable est définie dans votre .env
    }),
    cache: new InMemoryCache(),
  })
}

let client: ApolloClient<any> | null = null

// Fonction pour obtenir une instance d'ApolloClient (singleton pour le client)
export function getApolloClient() {
  // Pour Server Components, créez toujours une nouvelle instance pour éviter les fuites de mémoire entre requêtes
  if (typeof window === "undefined") {
    return createApolloClient()
  }
  // Pour Client Components, utilisez un singleton
  if (!client) {
    client = createApolloClient()
  }
  return client
}
```

### `app/ApolloProvider.tsx` (pour les Client Components)

Ceci est votre wrapper pour les Client Components.

```typescript
"use client"

import React, { ReactNode } from "react"
import { ApolloProvider } from "@apollo/client"
import { getApolloClient } from "@/lib/apollo-client"

interface ApolloClientProviderProps {
  children: ReactNode
}

export function ApolloClientProvider({ children }: ApolloClientProviderProps) {
  const client = getApolloClient() // Récupère le singleton pour le client
  return <ApolloProvider client={client}>{children}</ApolloProvider>
}
```

### `app/layout.tsx`

Englobez votre application avec le provider Apollo.

```typescript
import React from "react"
import { ApolloClientProvider } from "./ApolloProvider"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body>
        <ApolloClientProvider>{children}</ApolloClientProvider>
      </body>
    </html>
  )
}
```

## 3. Création Optimiste du Marché

Après la confirmation de la transaction par Wagmi, nous allons manuellement écrire le marché dans le cache.

### `lib/graphql-fragments.ts`

Définissez un fragment GraphQL pour votre entité `Market`. Cela garantit que les données que vous écrivez dans le cache sont conformes à votre schéma GraphQL.

```typescript
import { gql } from "@apollo/client"

// Assurez-vous que ce fragment correspond à la structure de votre entité Market dans le subgraph
export const MARKET_FRAGMENT = gql`
  fragment MarketDetails on Market {
    id
    name
    creator
    timestamp
    # Ajoutez tous les champs pertinents de votre entité Market
  }
`
```

### `components/MarketCreator.tsx`

Ce composant gérera la création du marché via Wagmi et l'écriture optimiste dans le cache Apollo.

```typescript
"use client"

import React, { useState } from "react"
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { getApolloClient } from "@/lib/apollo-client"
import { MARKET_FRAGMENT } from "@/lib/graphql-fragments"
import { gql } from "@apollo/client"

// Importer le contrat ABI et l'adresse (exemple)
import { contractABI } from "@/contracts/yourMarketContractABI"
const contractAddress = "0xYourMarketContractAddress"

export default function MarketCreator() {
  const [marketName, setMarketName] = useState("")
  const [optimisticMarketId, setOptimisticMarketId] = useState<string | null>(
    null
  )

  const { writeContract, data: txHash } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: txHash,
    })

  const apolloClient = getApolloClient()

  const handleCreateMarket = async () => {
    // --- Étape 1: Simuler un ID temporaire et écrire dans le cache ---
    // En pratique, l'ID d'un marché créé sur une blockchain est souvent basé sur l'adresse du contrat
    // ou un hash de transaction. Pour l'optimistic UI, vous pouvez utiliser un ID temporaire
    // ou un ID prédictible. Ici, nous utilisons un timestamp et un nom.
    const tempMarketId = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}`

    const optimisticMarket = {
      id: tempMarketId, // L'ID réel sera mis à jour par le subgraph
      name: marketName,
      creator: "0xYourWalletAddress", // Remplacez par l'adresse de l'utilisateur
      timestamp: Math.floor(Date.now() / 1000),
      __typename: "Market", // TRÈS IMPORTANT pour la normalisation d'Apollo
    }

    try {
      // Écrire le marché "optimiste" dans le cache
      apolloClient.writeFragment({
        id:
          apolloClient.cache.identify(optimisticMarket) ||
          `Market:${optimisticMarket.id}`, // Utilise l'ID interne d'Apollo si possible, sinon un ID explicite
        fragment: MARKET_FRAGMENT,
        data: optimisticMarket,
      })
      setOptimisticMarketId(optimisticMarket.id) // Stocke l'ID optimiste pour le passer au composant d'affichage

      console.log(
        "Marché ajouté au cache de manière optimiste:",
        optimisticMarket
      )

      // --- Étape 2: Envoyer la transaction via Wagmi ---
      writeContract({
        address: contractAddress,
        abi: contractABI,
        functionName: "createMarket",
        args: [marketName], // Arguments de votre fonction de création de marché
      })
    } catch (error) {
      console.error(
        "Erreur lors de la création optimiste ou de la transaction:",
        error
      )
      // En cas d'échec de la transaction, vous devrez invalider le cache manuellement
      // apolloClient.cache.evict({ id: apolloClient.cache.identify(optimisticMarket) });
      // apolloClient.cache.gc();
      setOptimisticMarketId(null)
    }
  }

  return (
    <div>
      <h2>Créer un Nouveau Marché</h2>
      <input
        type="text"
        placeholder="Nom du marché"
        value={marketName}
        onChange={(e) => setMarketName(e.target.value)}
      />
      <button
        onClick={handleCreateMarket}
        disabled={isConfirming || !marketName}
      >
        {isConfirming ? "Confirmation en cours..." : "Créer le Marché"}
      </button>

      {txHash && (
        <p>
          Transaction Hash: {txHash}{" "}
          {isConfirming ? "(Pending)" : "(Confirmed)"}
        </p>
      )}

      {/* Affiche le marché immédiatement si une ID optimiste est disponible */}
      {optimisticMarketId && (
        <MarketDisplay
          marketId={optimisticMarketId}
          isOptimistic={!isConfirmed}
        />
      )}
    </div>
  )
}
```

## 4. Affichage du Marché avec Polling

### `components/MarketDisplay.tsx`

Ce composant affichera le marché et gérera le polling pour le synchroniser avec le subgraph.

```typescript
"use client"

import React, { useEffect, useState } from "react"
import { useQuery, gql } from "@apollo/client"
import { MARKET_FRAGMENT } from "@/lib/graphql-fragments"

interface MarketDisplayProps {
  marketId: string
  isOptimistic?: boolean // Indique si l'affichage est initialement optimiste
}

// Requête pour récupérer un marché spécifique
const GET_MARKET_QUERY = gql`
  query GetMarket($id: ID!) {
    market(id: $id) {
      ...MarketDetails
    }
  }
  ${MARKET_FRAGMENT}
`

export default function MarketDisplay({
  marketId,
  isOptimistic = false,
}: MarketDisplayProps) {
  const [pollingActive, setPollingActive] = useState(isOptimistic) // Active le polling si l'affichage est optimiste

  const { loading, error, data, startPolling, stopPolling } = useQuery(
    GET_MARKET_QUERY,
    {
      variables: { id: marketId },
      fetchPolicy: "cache-first", // Priorise le cache, puis le réseau
      pollInterval: pollingActive ? 1000 : 0, // Commence le polling à 1 seconde si actif
    }
  )

  useEffect(() => {
    if (pollingActive) {
      // Une fois que les données sont chargées et proviennent du réseau (pas du cache seulement)
      // et que l'ID correspond, cela signifie que le subgraph a indexé le marché.
      // Note: Apollo gère la mise à jour du cache automatiquement via la normalisation.
      if (
        !loading &&
        data &&
        data.market &&
        data.market.id === marketId &&
        !isOptimistic
      ) {
        // Le marché est indexé et l'affichage n'est plus "optimiste" (car la transaction est confirmée)
        // Vous pouvez affiner cette logique pour vous assurer que les données proviennent bien du serveur
        // en vérifiant un champ spécifique qui n'est pas présent dans l'optimistic update.
        console.log("Marché indexé par le subgraph, arrêt du polling.")
        setPollingActive(false)
        stopPolling()
      }
    }
  }, [loading, data, marketId, pollingActive, stopPolling, isOptimistic])

  if (loading && pollingActive)
    return <p>Chargement du marché (optimiste)...</p>
  if (error) return <p>Erreur lors du chargement du marché : {error.message}</p>
  if (!data || !data.market) return <p>Marché non trouvé.</p>

  const market = data.market

  return (
    <div
      style={{ border: "1px solid #ccc", padding: "10px", margin: "10px 0" }}
    >
      <h3>
        Détails du Marché{" "}
        {market.id === marketId && pollingActive
          ? "(En attente d'indexation)"
          : ""}
      </h3>
      <p>ID: {market.id}</p>
      <p>Nom: {market.name}</p>
      <p>Créateur: {market.creator}</p>
      <p>Timestamp: {new Date(market.timestamp * 1000).toLocaleString()}</p>
      {market.id === marketId && pollingActive && (
        <p style={{ color: "orange" }}>
          Ce marché est actuellement affiché depuis le cache local.
          Synchronisation avec le subgraph en cours...
        </p>
      )}
    </div>
  )
}
```

## Résumé du Flux

1. **Utilisateur crée un marché** (`MarketCreator.tsx`).
2. **Confirmation Wagmi** : Une fois la transaction soumise et son hash obtenu, le composant `MarketCreator` crée un objet `Market` temporaire avec un `__typename` et un `id` prédictible.
3. **Écriture Optimiste** : `apolloClient.writeFragment` insère ce marché temporaire directement dans le cache Apollo.
4. **Affichage Immédiat** : Le composant `MarketDisplay` est monté avec l'`id` du marché. Il exécute `useQuery` avec `fetchPolicy: "cache-first"`. Apollo trouve immédiatement le marché dans le cache et l'affiche.
5. **Polling du Subgraph** : Le `useQuery` dans `MarketDisplay` active également un `pollInterval` (par exemple, toutes les secondes). Ce polling effectue des requêtes réseau au subgraph.
6. **Mise à Jour Automatique** : Lorsque le subgraph a indexé le marché (avec son `id` réel), la requête de polling récupère cette donnée. Apollo, grâce à sa normalisation, détecte que l'entité avec cet `id` existe désormais sur le serveur, met à jour le cache et déclenche un re-render de `MarketDisplay` avec les données officielles du subgraph.
7. **Arrêt du Polling** : Une fois que le marché est confirmé comme provenant du subgraph, `setPollingActive(false)` et `stopPolling()` arrêtent le polling pour éviter des requêtes inutiles.

Ce système vous offre la réactivité de l'optimistic UI tout en garantissant la consistance des données une fois que le subgraph a terminé son indexation.
