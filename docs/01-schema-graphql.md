# Schéma GraphQL

Le fichier `schema.graphql` est le plan directeur de notre base de données. Il définit toutes les entités de données que le subgraph indexe, leurs champs, leurs types, ainsi que les relations qui les unissent. Comprendre ce schéma est essentiel pour interroger l'API et pour travailler sur les fonctions de mapping.

## Concepts Clés

Avant de détailler chaque entité, voici quelques concepts fondamentaux utilisés dans notre schéma :

- **`@entity`** : Cette directive déclare un type comme une "entité", ce qui signifie qu'il sera stocké dans la base de données du subgraph et sera interrogeable. C'est l'équivalent d'une table dans une base de données traditionnelle.

- **Immutabilité (`immutable: true/false`)** :

  - `immutable: false` : L'entité peut être modifiée après sa création. Utilisé pour des entités qui représentent un état qui évolue, comme `Market` ou `GlobalStat`.
  - `immutable: true` : L'entité ne peut pas être modifiée une fois créée. Utilisé pour des enregistrements historiques qui ne changent jamais, comme un `Engagement` ou les métadonnées `MarketMetadata` issues d'un fichier IPFS immuable.

- **Relations Dérivées (`@derivedFrom`)** :
  C'est une optimisation de performance clé. Au lieu de stocker une liste d'IDs dans une entité parente (ce qui peut être coûteux à mettre à jour), nous créons un lien simple depuis l'entité enfant vers le parent. La relation est "dérivée" à la lecture. Par exemple, au lieu que `Market` stocke une liste de tous ses engagements, chaque `Engagement` déclare simplement à quel `Market` il appartient.

## Diagramme des Relations

Ce diagramme illustre comment les principales entités sont connectées entre elles :

```graphql
graph TD
    subgraph Entités Principales
        M(Market)
        MM(MarketMetadata)
        ME(MarketEvent)
        E(Engagement)
    end

    subgraph Entité Globale
        GS(GlobalStat)
    end

    M -- One-to-One --> MM
    M -- One-to-Many --> E
    MM -- One-to-Many --> ME

    style M fill:#d4e4ff,stroke:#333,stroke-width:2px
    style GS fill:#ffe4b3,stroke:#333,stroke-width:2px
```

## Description Détaillée des Entités

### 1. `Market`

Représente un marché de prédiction. C'est l'entité centrale de notre subgraph, qui agrège les données on-chain et les liens vers les données off-chain.

| Champ                | Type             | Description                                                                     |
| :------------------- | :--------------- | :------------------------------------------------------------------------------ |
| `id`                 | `ID!`            | **Clé Primaire.** L'adresse du contrat `MakaoFixture` du marché.                |
| `contractAddress`    | `Bytes!`         | L'adresse du contrat, stockée au format `Bytes`.                                |
| `owner`              | `Bytes!`         | L'adresse du propriétaire du marché.                                            |
| `creator`            | `Bytes!`         | L'adresse du créateur initial du marché (via la Factory).                       |
| `createdAt`          | `BigInt!`        | Timestamp (Unix) de la création du marché.                                      |
| `stakeToken`         | `Bytes!`         | L'adresse du token ERC20 utilisé pour les participations.                       |
| `engagementDeadline` | `BigInt!`        | Timestamp (Unix) de la fin de la période de participation.                      |
| `resolutionDeadline` | `BigInt!`        | Timestamp (Unix) de la fin de la période de résolution.                         |
| `creatorFee`         | `BigInt!`        | Les frais prélevés pour le créateur.                                            |
| `predictionCount`    | `BigInt!`        | Le nombre de prédictions possibles.                                             |
| `totalAmount`        | `BigInt!`        | Le montant total engagé sur ce marché, mis à jour à chaque participation.       |
| `isCancelled`        | `Boolean!`       | Indique si le marché a été annulé. Mis à jour par l'événement `EventCancelled`. |
| `isResolved`         | `Boolean!`       | Indique si le marché a été résolu. Mis à jour par l'événement `ResolveEvent`.   |
| `ipfsHash`           | `String`         | Le hash du fichier IPFS contenant les métadonnées. Peut être `null`.            |
| `metadata`           | `MarketMetadata` | **Relation (1-à-1).** Lien dérivé vers les métadonnées IPFS via `@derivedFrom`. |
| `engagements`        | `[Engagement!]!` | **Relation (1-à-N).** Liste dérivée de toutes les participations sur ce marché. |

### 2. `MarketMetadata`

Stocke les données riches d'un marché, récupérées depuis un fichier JSON sur IPFS. Cette entité est **immuable**.

| Champ         | Type              | Description                                                                       |
| :------------ | :---------------- | :-------------------------------------------------------------------------------- |
| `id`          | `ID!`             | **Clé Primaire.** Le hash IPFS du fichier de métadonnées.                         |
| `market`      | `Market!`         | **Relation.** Lien direct vers l'entité `Market` parente.                         |
| `name`        | `String`          | Le nom du marché.                                                                 |
| `description` | `String`          | La description détaillée du marché.                                               |
| `image`       | `String`          | L'URL de l'image de couverture du marché.                                         |
| `events`      | `[MarketEvent!]!` | **Relation (1-à-N).** Liste dérivée des événements/résultats possibles du marché. |

### 3. `MarketEvent`

Définit un résultat ou un événement possible au sein d'un marché, tel que décrit dans le fichier IPFS. Cette entité est **immuable**.

| Champ            | Type              | Description                                                                |
| :--------------- | :---------------- | :------------------------------------------------------------------------- |
| `id`             | `ID!`             | **Clé Primaire.** ID composite : `{id_du_marché}-{eventId}`.               |
| `eventId`        | `BigInt!`         | L'identifiant numérique de l'événement au sein du marché (ex: 1, 2, 3...). |
| `marketMetadata` | `MarketMetadata!` | **Relation.** Lien direct vers l'entité `MarketMetadata` parente.          |
| `name`           | `String!`         | Le nom de l'événement/résultat (ex: "L'équipe A gagne").                   |
| `description`    | `String!`         | Description de cet événement/résultat.                                     |

### 4. `Engagement`

Représente une participation d'un utilisateur sur un marché. C'est un enregistrement historique, donc il est **immuable**.

| Champ             | Type      | Description                                                                     |
| :---------------- | :-------- | :------------------------------------------------------------------------------ |
| `id`              | `ID!`     | **Clé Primaire.** ID unique composite : `{hash_de_transaction}-{index_du_log}`. |
| `market`          | `Market!` | **Relation.** Lien direct vers le `Market` concerné par la participation.       |
| `user`            | `Bytes!`  | L'adresse de l'utilisateur qui a participé.                                     |
| `amount`          | `BigInt!` | Le montant de la participation.                                                 |
| `timestamp`       | `BigInt!` | Timestamp (Unix) de la participation.                                           |
| `transactionHash` | `Bytes!`  | Hash de la transaction de la participation.                                     |

### 5. `GlobalStat`

Une entité singleton servant à stocker des statistiques agrégées sur l'ensemble de la plateforme.

| Champ          | Type      | Description                                                    |
| :------------- | :-------- | :------------------------------------------------------------- |
| `id`           | `ID!`     | **Clé Primaire.** Toujours la chaîne de caractères `"global"`. |
| `totalMarkets` | `BigInt!` | Le nombre total de marchés créés.                              |
| `totalVolume`  | `BigInt!` | Le volume total de tous les engagements sur la plateforme.     |
| `totalUsers`   | `BigInt!` | Le nombre total d'utilisateurs uniques ayant interagi.         |
| `lastUpdated`  | `BigInt!` | Timestamp de la dernière mise à jour de cette entité.          |

```

```
