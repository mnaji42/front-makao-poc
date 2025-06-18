import { fetchFromSubgraph, fetchMetadataFromIPFS } from './subgraph'

interface MarketEvent {
  id: string
  eventId: string
  name: string
  description: string
}

interface Market {
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
  ipfsHash?: string
  metadata?: {
    id: string
    name?: string
    description?: string
    image?: string
    events: MarketEvent[]
  }
  engagements: Array<{
    id: string
    user: string
    amount: string
    timestamp: string
  }>
}

interface MarketCategory {
  title: string
  description: string
  markets: Market[]
  isLoading: boolean
  error: string | null
}

export interface MarketCategories {
  recentMarkets: MarketCategory
  endingSoonMarkets: MarketCategory
  highVolumeMarkets: MarketCategory
}

// Requête pour les marchés récents
const RECENT_MARKETS_QUERY = `
  query GetRecentMarkets($first: Int!) {
    markets(
      first: $first
      orderBy: createdAt
      orderDirection: desc
      where: { isCancelled: false }
    ) {
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
        name
        description
        image
        events {
          id
          eventId
          name
          description
        }
      }
      engagements {
        id
        user
        amount
        timestamp
      }
    }
  }
`

// Requête pour les marchés se terminant bientôt
const ENDING_SOON_MARKETS_QUERY = `
  query GetEndingSoonMarkets($first: Int!, $currentTime: BigInt!) {
    markets(
      first: $first
      orderBy: engagementDeadline
      orderDirection: asc
      where: {
        isCancelled: false
        isResolved: false
        engagementDeadline_gt: $currentTime
      }
    ) {
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
        name
        description
        image
        events {
          id
          eventId
          name
          description
        }
      }
      engagements {
        id
        user
        amount
        timestamp
      }
    }
  }
`

// Requête pour les marchés avec gros volumes
const HIGH_VOLUME_MARKETS_QUERY = `
  query GetHighVolumeMarkets($first: Int!) {
    markets(
      first: $first
      orderBy: totalAmount
      orderDirection: desc
      where: { isCancelled: false }
    ) {
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
        name
        description
        image
        events {
          id
          eventId
          name
          description
        }
      }
      engagements {
        id
        user
        amount
        timestamp
      }
    }
  }
`

// Fonction pour enrichir les marchés avec les métadonnées IPFS
async function enrichMarketsWithIPFS(markets: Market[]): Promise<Market[]> {
  return Promise.all(
    markets.map(async (market) => {
      if (market.ipfsHash && !market.metadata) {
        try {
          const metadata = await fetchMetadataFromIPFS(market.ipfsHash)
          return { ...market, metadata }
        } catch (error) {
          console.warn(`Erreur lors de la récupération des métadonnées IPFS pour ${market.id}:`, error)
          return market
        }
      }
      return market
    })
  )
}

// Fonction SSR pour récupérer les données côté serveur
export async function getMarketCategoriesSSR(): Promise<MarketCategories> {
  try {
    const currentTime = Math.floor(Date.now() / 1000).toString()
    
    const [recentData, endingSoonData, highVolumeData] = await Promise.all([
      fetchFromSubgraph<{ markets: Market[] }>(RECENT_MARKETS_QUERY, { first: 20 }),
      fetchFromSubgraph<{ markets: Market[] }>(ENDING_SOON_MARKETS_QUERY, { first: 20, currentTime }),
      fetchFromSubgraph<{ markets: Market[] }>(HIGH_VOLUME_MARKETS_QUERY, { first: 20 })
    ])

    // Enrichir avec les métadonnées IPFS
    const [recentMarkets, endingSoonMarkets, highVolumeMarkets] = await Promise.all([
      enrichMarketsWithIPFS(recentData.markets),
      enrichMarketsWithIPFS(endingSoonData.markets),
      enrichMarketsWithIPFS(highVolumeData.markets)
    ])

    return {
      recentMarkets: {
        title: 'Marchés Récents',
        description: 'Les derniers marchés créés sur la plateforme',
        markets: recentMarkets,
        isLoading: false,
        error: null
      },
      endingSoonMarkets: {
        title: 'Se Terminent Bientôt',
        description: 'Marchés dont la période de pari se termine prochainement',
        markets: endingSoonMarkets,
        isLoading: false,
        error: null
      },
      highVolumeMarkets: {
        title: 'Plus Gros Volumes',
        description: 'Marchés avec le plus de volume de paris',
        markets: highVolumeMarkets,
        isLoading: false,
        error: null
      }
    }
  } catch (error) {
    console.error('Erreur lors de la récupération SSR des catégories de marchés:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    
    return {
      recentMarkets: {
        title: 'Marchés Récents',
        description: 'Les derniers marchés créés sur la plateforme',
        markets: [],
        isLoading: false,
        error: errorMessage
      },
      endingSoonMarkets: {
        title: 'Se Terminent Bientôt',
        description: 'Marchés dont la période de pari se termine prochainement',
        markets: [],
        isLoading: false,
        error: errorMessage
      },
      highVolumeMarkets: {
        title: 'Plus Gros Volumes',
        description: 'Marchés avec le plus de volume de paris',
        markets: [],
        isLoading: false,
        error: errorMessage
      }
    }
  }
}