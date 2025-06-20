# Guide de Configuration d’Apollo Client \& WebSocket pour Subgraph en TypeScript

Un guide condensé pour intégrer Apollo Client dans une application Next.js (TS) et écouter en temps réel la création d’un marché via une connexion WebSocket au subgraph.

---

## 1. Installation des dépendances

Exécutez la commande suivante pour installer tous les paquets nécessaires en laissant npm choisir les versions stables par défaut :

```bash
npm install @apollo/client graphql @apollo/client-integration-nextjs graphql-ws
```

Cette commande installe :

- `@apollo/client` (client GraphQL officiel d’Apollo)
- `graphql` (librairie de base GraphQL)
- `@apollo/client-integration-nextjs` (adaptateur Next.js pour Apollo)
- `graphql-ws` (transport WebSocket pour subscriptions)

---

## 2. Configuration d’Apollo pour Next.js

### 2.1. Server Components (SSR/RSC)

Créez le fichier `lib/apollo-client.ts` :

```typescript
import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client"
import { registerApolloClient } from "@apollo/client-integration-nextjs"

export const { getClient, query, PreloadQuery } = registerApolloClient(() => {
  return new ApolloClient({
    link: new HttpLink({
      uri: process.env.NEXT_PUBLIC_GRAPHQL_HTTP_URL!, // URL absolue pour SSR
    }),
    cache: new InMemoryCache(),
  })
})
```

**Utilisation dans un Server Component** :

```typescript
import { getClient } from "@/lib/apollo-client"
import { gql } from "@apollo/client"
import React from "react"

export default async function Page() {
  const { data } = await getClient().query({
    query: gql`
      query GetMarkets {
        markets {
          id
        }
      }
    `,
  })
  return <pre>{JSON.stringify(data, null, 2)}</pre>
}
```

Ce code configure Apollo pour le rendu côté serveur et RSC dans Next.js .

### 2.2. Client Components (CSR)

Créez `app/ApolloWrapper.tsx` pour envelopper vos composants client :

```typescript
"use client"

import React, { ReactNode } from "react"
import { ApolloClient, InMemoryCache, HttpLink, split } from "@apollo/client"
import { ApolloNextAppProvider } from "@apollo/client-integration-nextjs"
import { GraphQLWsLink } from "@apollo/client/link/subscriptions"
import { createClient } from "graphql-ws"
import { getMainDefinition } from "@apollo/client/utilities"

interface ApolloWrapperProps {
  children: ReactNode
}

export function ApolloWrapper({ children }: ApolloWrapperProps) {
  const httpLink = new HttpLink({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_HTTP_URL!,
  })

  const wsLink =
    typeof window !== "undefined"
      ? new GraphQLWsLink(
          createClient({
            url: process.env.NEXT_PUBLIC_GRAPHQL_WS_URL!, // wss:// endpoint
          })
        )
      : null

  const splitLink = wsLink
    ? split(
        ({ query }) => {
          const definition = getMainDefinition(query)
          return (
            definition.kind === "OperationDefinition" &&
            definition.operation === "subscription"
          )
        },
        wsLink,
        httpLink
      )
    : httpLink

  const client = new ApolloClient({
    link: splitLink,
    cache: new InMemoryCache(),
  })

  return (
    <ApolloNextAppProvider makeClient={() => client}>
      {children}
    </ApolloNextAppProvider>
  )
}
```

**Integration dans `app/layout.tsx`** :

```typescript
import React, { ReactNode } from "react"
import { ApolloWrapper } from "./ApolloWrapper"

interface RootLayoutProps {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="fr">
      <body>
        <ApolloWrapper>{children}</ApolloWrapper>
      </body>
    </html>
  )
}
```

Ce wrapper permet d’utiliser Apollo Client pour requêtes, mutations et subscriptions côté client .

---

## 3. Écoute WebSocket du Subgraph

### 3.1. Définition de la subscription

```graphql
subscription MarketCreated($marketAddress: ID!) {
  markets(where: { id: $marketAddress }) {
    id
    # autres champs souhaités
  }
}
```

Cette subscription notifie dès que l’entité `Market` apparaît dans le subgraph .

### 3.2. Composant React pour l’écoute

Créez `components/MarketWatcher.tsx` :

```typescript
"use client"

import React from "react"
import { useSubscription, gql } from "@apollo/client"

interface MarketWatcherProps {
  marketAddress: string
}

const MARKET_SUBSCRIPTION = gql`
  subscription MarketCreated($marketAddress: ID!) {
    markets(where: { id: $marketAddress }) {
      id
    }
  }
`

export default function MarketWatcher({ marketAddress }: MarketWatcherProps) {
  const { data, loading, error } = useSubscription(MARKET_SUBSCRIPTION, {
    variables: { marketAddress },
  })

  if (loading) return <p>En attente d’indexation…</p>
  if (error) return <p>Erreur : {error.message}</p>

  return <p>Marché indexé : {data.markets[0].id}</p>
}
```

**Utilisation après confirmation Wagmi** :

```typescript
"use client"

import React, { useEffect, useState } from "react"
import { useContractWrite } from "wagmi"
import MarketWatcher from "@/components/MarketWatcher"

export default function CreateMarket() {
  const { data: txData, write } = useContractWrite({
    /* config */
  })
  const [marketId, setMarketId] = useState<string | null>(null)

  useEffect(() => {
    if (txData?.hash) {
      setMarketId(txData.hash.toLowerCase())
    }
  }, [txData])

  return (
    <>
      <button onClick={() => write?.()}>Créer le marché</button>
      {marketId && <MarketWatcher marketAddress={marketId} />}
    </>
  )
}
```

Après confirmation blockchain via Wagmi, `MarketWatcher` se connecte en WebSocket au subgraph pour détecter l’indexation .

---

## 4. Récapitulatif des étapes

| Étape                         | Fichier                        | Description                                                                       |
| :---------------------------- | :----------------------------- | :-------------------------------------------------------------------------------- |
| Installation                  | –                              | `npm install @apollo/client graphql @apollo/client-integration-nextjs graphql-ws` |
| Config SSR/RSC                | `lib/apollo-client.ts`         | Client Apollo pour Server Components                                              |
| Config CSR et WebSocket       | `app/ApolloWrapper.tsx`        | Wrapper pour Client Components + WebSocketLink                                    |
| Intégration dans le Layout    | `app/layout.tsx`               | Enveloppement des pages avec `ApolloWrapper`                                      |
| Définition de la subscription | –                              | `MarketCreated` subscription GraphQL                                              |
| Composant d’écoute WebSocket  | `components/MarketWatcher.tsx` | `useSubscription` pour écouter la création du marché                              |
| Intégration après Wagmi       | `CreateMarket` component       | Passage de `marketAddress` après confirmation transaction                         |

Avec ce guide TypeScript, vous pouvez configurer Apollo Client pour SSR/CSR et utiliser WebSocket pour écouter en temps réel l’indexation d’un marché via votre subgraph.
