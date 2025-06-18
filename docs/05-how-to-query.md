# Comment Interroger les Données du Subgraph

Le Subgraph Makao expose toutes ses données via une API GraphQL. Ce standard permet de demander précisément les données dont vous avez besoin, rien de plus, ce qui rend vos applications rapides et efficaces.

## 1. L'Endpoint de l'API

Toutes les requêtes doivent être envoyées à une URL unique, appelée "endpoint". Vous trouverez cette URL dans le tableau de bord de votre fournisseur d'hébergement de subgraph (par exemple, dans le Subgraph Studio de The Graph).

Toutes les requêtes vers cet endpoint doivent être des requêtes HTTP `POST` contenant un corps de message JSON avec votre requête GraphQL.

## 2. Les Fondamentaux d'une Requête GraphQL

Une requête GraphQL ressemble à un objet JSON sans les valeurs. Vous décrivez la "forme" des données que vous souhaitez recevoir.

### A. Structure de Base

Pour interroger une collection d'entités, vous spécifiez le nom de la collection (au pluriel) et les champs que vous voulez pour chaque entité.

```graphql
# Demande les 5 premiers marchés avec leur ID et leur date de création
query {
  markets(first: 5) {
    id
    createdAt
  }
}
```

### B. Les Filtres (`where`)

Le filtre `where` est l'outil le plus puissant pour affiner votre recherche. Il permet de spécifier des conditions sur n'importe quel champ.

- **Opérateurs courants :** `_eq` (égal, implicite), `_not` (différent), `_gt` (plus grand que), `_lt` (plus petit que), `_gte`, `_lte`, `_in` (dans une liste), `_contains`.

```graphql
# Demande les marchés qui ne sont PAS annulés
query {
  markets(where: { isCancelled: false }) {
    id
  }
}
```

### C. Le Tri (`orderBy`)

Le tri vous permet d'ordonner les résultats selon un champ spécifique.

- **Directions :** `asc` (ascendant), `desc` (descendant).

```graphql
# Demande les marchés les plus récents en premier
query {
  markets(orderBy: createdAt, orderDirection: desc) {
    id
    createdAt
  }
}
```

### D. La Pagination (`first`, `skip`)

La pagination est **essentielle** pour gérer de grands ensembles de données. Par défaut, les requêtes sont limitées à 100 résultats.

- `first`: Le nombre maximum de résultats à retourner (max 1000).
- `skip`: Le nombre de résultats à ignorer depuis le début (pour passer aux pages suivantes).

```graphql
# Demande la deuxième page de 10 marchés (résultats 11 à 20)
query {
  markets(first: 10, skip: 10) {
    id
  }
}
```

---

## 3. Comment Exécuter une Requête : Exemples Pratiques

### Méthode 1 : `cURL` (Ligne de commande)

Idéal pour des tests rapides depuis votre terminal.

```bash
curl -X POST -H "Content-Type: application/json" \
     -d '{"query": "query { markets(first: 2) { id owner } }"}' \
     <VOTRE_ENDPOINT_URL>
```

### Méthode 2 : Postman (ou tout client API)

Parfait pour explorer l'API de manière interactive.

1.  Définissez la méthode de la requête sur **`POST`**.
2.  Entrez votre **Endpoint URL**.
3.  Allez dans l'onglet **Body** et sélectionnez le type **GraphQL**.
4.  Collez votre requête dans le panneau "Query". Postman propose même l'autocomplétion si le schéma est accessible.

### Méthode 3 : JavaScript / React (Frontend)

C'est le cas d'usage le plus courant. Utilisez une bibliothèque GraphQL comme **Apollo Client** ou **urql** pour simplifier la gestion des données, du cache et des états de chargement.

Voici un exemple simple avec `fetch` pour illustrer le concept.

```typescript
async function getMarkets() {
  const endpoint = "VOTRE_ENDPOINT_URL"
  const graphqlQuery = {
    query: `
      query GetRecentMarkets {
        markets(first: 10, orderBy: createdAt, orderDirection: desc) {
          id
          owner
          metadata {
            name
            description
          }
        }
      }
    `,
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(graphqlQuery),
  })

  const data = await response.json()
  console.log(data.data.markets)
}
```

---

## 4. Livre de Recettes : Exemples de Requêtes Concrètes

Voici des requêtes prêtes à l'emploi pour répondre à des besoins courants.

### Requête 1 : Obtenir un marché spécifique et ses métadonnées

Pour afficher la page de détail d'un marché.

```graphql
query GetMarketDetails($marketId: ID!) {
  market(id: $marketId) {
    id
    owner
    createdAt
    totalAmount
    isResolved
    metadata {
      name
      description
      image
      events {
        eventId
        name
        description
      }
    }
  }
}
```

**Variable à fournir :**

```json
{
  "marketId": "0x..."
}
```

### Requête 2 : Lister les 10 derniers marchés actifs

Pour la page d'accueil ou une liste de marchés.

```graphql
query GetActiveMarkets {
  markets(
    first: 10
    orderBy: createdAt
    orderDirection: desc
    where: { isCancelled: false, isResolved: false }
  ) {
    id
    totalAmount
    engagementDeadline
    metadata {
      name
      image
    }
  }
}
```

### Requête 3 : Trouver tous les engagements d'un utilisateur

Pour afficher l'historique de participation d'un utilisateur.

```graphql
query GetUserEngagements($userId: Bytes!) {
  engagements(
    where: { user: $userId }
    orderBy: timestamp
    orderDirection: desc
  ) {
    id
    amount
    timestamp
    market {
      id
      metadata {
        name
      }
    }
  }
}
```

**Variable à fournir :**

```json
{
  "userId": "0x..."
}
```

### Requête 4 : Obtenir les statistiques globales

Pour afficher des chiffres clés sur la plateforme.

```graphql
query GetGlobalStats {
  globalStat(id: "global") {
    totalMarkets
    totalVolume
    totalUsers
  }
}
```

> **Bonne pratique :** Demandez toujours uniquement les champs dont vous avez besoin pour votre composant. Cela minimise le trafic réseau et accélère le rendu de vos pages.
