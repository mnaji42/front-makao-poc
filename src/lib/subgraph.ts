const SUBGRAPH_URL = process.env.NEXT_PUBLIC_SUBGRAPH_URL as string

interface GraphQLResponse<T> {
  data: T
  errors?: Array<{ message: string }>
}

export async function fetchFromSubgraph<T>(
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  if (!SUBGRAPH_URL) {
    throw new Error("NEXT_PUBLIC_SUBGRAPH_URL is not defined")
  }

  const response = await fetch(SUBGRAPH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const result: GraphQLResponse<T> = await response.json()

  if (result.errors) {
    throw new Error(
      `GraphQL error: ${result.errors.map((e) => e.message).join(", ")}`
    )
  }

  return result.data
}

// Fonction pour récupérer les métadonnées depuis IPFS si nécessaire
export async function fetchMetadataFromIPFS(ipfsHash: string) {
  const filebaseUrl = process.env.NEXT_PUBLIC_FILEBASE_URL
  if (!filebaseUrl) {
    throw new Error("NEXT_PUBLIC_FILEBASE_URL is not defined")
  }

  const response = await fetch(`${filebaseUrl}/${ipfsHash}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch metadata from IPFS: ${response.status}`)
  }

  return response.json()
}

// Types pour les entités du subgraph
export interface MarketMetadata {
  id: string
  market: string
  name: string
  description: string
  image: string
  events: MarketEvent[]
}

export interface MarketEvent {
  id: string
  eventId: string
  marketMetadata: string
  name: string
  description: string
}

export interface Engagement {
  id: string
  user: string
  amount: string
  timestamp: string
  transactionHash: string
}

export interface Market {
  id: string
  contractAddress: string
  owner: string
  creator: string
  createdAt: string
  stakeToken: string
  engagementDeadline: string
  resolutionDeadline: string
  creatorFee: string
  predictionCount: string
  totalAmount: string
  isCancelled: boolean
  isResolved: boolean
  ipfsHash: string
  metadata?: MarketMetadata
  engagements: Engagement[]
}

// Requête pour récupérer un marché spécifique
export const GET_MARKET_QUERY = `
  query GetMarket($marketId: ID!) {
    market(id: $marketId) {
      id
      contractAddress
      owner
      creator
      createdAt
      stakeToken
      engagementDeadline
      resolutionDeadline
      creatorFee
      predictionCount
      totalAmount
      isCancelled
      isResolved
      ipfsHash
      metadata {
        id
        market
        name
        description
        image
        events {
          id
          eventId
          marketMetadata
          name
          description
        }
      }
      engagements {
        id
        user
        amount
        timestamp
        transactionHash
      }
    }
  }
`

// Fonction pour récupérer un marché avec ses métadonnées
export async function getMarket(marketId: string): Promise<Market | null> {
  try {
    const result = await fetchFromSubgraph<{ market: Market | null }>(
      GET_MARKET_QUERY,
      { marketId }
    )

    if (!result.market) {
      return null
    }

    let market = result.market

    // Si les métadonnées ne sont pas disponibles dans le subgraph, les récupérer depuis IPFS
    if (!market.metadata && market.ipfsHash) {
      try {
        const ipfsMetadata = await fetchMetadataFromIPFS(market.ipfsHash)
        market = {
          ...market,
          metadata: {
            id: market.ipfsHash,
            market: market.id,
            name: ipfsMetadata.name || "",
            description: ipfsMetadata.description || "",
            image: ipfsMetadata.image || "",
            events: ipfsMetadata.properties?.events || [],
          },
        }
      } catch (error) {
        console.error("Failed to fetch metadata from IPFS:", error)
      }
    }

    return market
  } catch (error) {
    console.error("Error fetching market:", error)
    throw error
  }
}
