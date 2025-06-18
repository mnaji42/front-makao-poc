'use client'

import { useState, useEffect } from 'react'
import { fetchFromSubgraph, fetchMetadataFromIPFS } from '../lib/subgraph'

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

interface UseMarketCategoriesReturn {
  recentMarkets: MarketCategory
  endingSoonMarkets: MarketCategory
  highVolumeMarkets: MarketCategory
  refetchAll: () => Promise<void>
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

// Requête pour les marchés avec le plus de volume
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

// Fonction pour enrichir les marchés avec les métadonnées IPFS si nécessaire
async function enrichMarketsWithIPFS(markets: Market[]): Promise<Market[]> {
  const enrichedMarkets = await Promise.all(
    markets.map(async (market) => {
      // Si les métadonnées ne sont pas disponibles dans le subgraph mais qu'on a un hash IPFS
      if (!market.metadata && market.ipfsHash) {
        try {
          const ipfsMetadata = await fetchMetadataFromIPFS(market.ipfsHash)
          market.metadata = {
            id: market.ipfsHash,
            name: ipfsMetadata.name,
            description: ipfsMetadata.description,
            image: ipfsMetadata.image,
            events: ipfsMetadata.properties?.events || []
          }
        } catch (error) {
          console.warn(`Impossible de récupérer les métadonnées IPFS pour ${market.ipfsHash}:`, error)
        }
      }
      return market
    })
  )
  return enrichedMarkets
}

export function useMarketCategories(): UseMarketCategoriesReturn {
  const [recentMarkets, setRecentMarkets] = useState<MarketCategory>({
    title: 'Marchés Récents',
    description: 'Les derniers marchés créés sur la plateforme',
    markets: [],
    isLoading: false,
    error: null
  })

  const [endingSoonMarkets, setEndingSoonMarkets] = useState<MarketCategory>({
    title: 'Se Terminent Bientôt',
    description: 'Marchés dont la période de pari se termine prochainement',
    markets: [],
    isLoading: false,
    error: null
  })

  const [highVolumeMarkets, setHighVolumeMarkets] = useState<MarketCategory>({
    title: 'Plus Gros Volumes',
    description: 'Marchés avec le plus de volume de paris',
    markets: [],
    isLoading: false,
    error: null
  })

  const fetchRecentMarkets = async () => {
    setRecentMarkets(prev => ({ ...prev, isLoading: true, error: null }))
    try {
      const data = await fetchFromSubgraph<{ markets: Market[] }>(
        RECENT_MARKETS_QUERY,
        { first: 7 }
      )
      const enrichedMarkets = await enrichMarketsWithIPFS(data.markets)
      setRecentMarkets(prev => ({
        ...prev,
        markets: enrichedMarkets,
        isLoading: false
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      setRecentMarkets(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }))
    }
  }

  const fetchEndingSoonMarkets = async () => {
    setEndingSoonMarkets(prev => ({ ...prev, isLoading: true, error: null }))
    try {
      const currentTime = Math.floor(Date.now() / 1000).toString()
      const data = await fetchFromSubgraph<{ markets: Market[] }>(
        ENDING_SOON_MARKETS_QUERY,
        { first: 7, currentTime }
      )
      const enrichedMarkets = await enrichMarketsWithIPFS(data.markets)
      setEndingSoonMarkets(prev => ({
        ...prev,
        markets: enrichedMarkets,
        isLoading: false
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      setEndingSoonMarkets(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }))
    }
  }

  const fetchHighVolumeMarkets = async () => {
    setHighVolumeMarkets(prev => ({ ...prev, isLoading: true, error: null }))
    try {
      const data = await fetchFromSubgraph<{ markets: Market[] }>(
        HIGH_VOLUME_MARKETS_QUERY,
        { first: 7 }
      )
      const enrichedMarkets = await enrichMarketsWithIPFS(data.markets)
      setHighVolumeMarkets(prev => ({
        ...prev,
        markets: enrichedMarkets,
        isLoading: false
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      setHighVolumeMarkets(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }))
    }
  }

  const refetchAll = async () => {
    await Promise.all([
      fetchRecentMarkets(),
      fetchEndingSoonMarkets(),
      fetchHighVolumeMarkets()
    ])
  }

  useEffect(() => {
    refetchAll()
  }, [])

  return {
    recentMarkets,
    endingSoonMarkets,
    highVolumeMarkets,
    refetchAll
  }
}

// Fonction SSR pour récupérer les données côté serveur
export async function getMarketCategoriesSSR() {
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