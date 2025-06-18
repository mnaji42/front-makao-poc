"use client"

import { useState, useRef, useEffect } from "react"
import { MarketCard } from "./MarketCard"
import { useNotifications } from "../contexts/NotificationContext"

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

interface MarketCategorySectionProps {
  category: MarketCategory
  onQuickBet?: (marketId: string, eventId: string) => void
  onRefresh?: () => void
}

// Fonction pour convertir les données du subgraph vers le format MarketCard
function convertToMarketCardFormat(market: Market) {
  return {
    id: market.id,
    instanceAddress: market.contractAddress,
    creatorAddress: market.creator,
    blockNumber: "0", // Non disponible dans le subgraph
    blockTimestamp: new Date(parseInt(market.createdAt) * 1000),
    transactionHash: "", // Non disponible dans le subgraph
    ipfsMetadataHash: market.ipfsHash,
    title: market.metadata?.name,
    description: market.metadata?.description,
    image: market.metadata?.image,
    events: market.metadata?.events?.map((event) => ({
      id: event.id,
      eventId: event.eventId,
      name: event.name,
      description: event.description,
    })),
    stakeToken: market.stakeToken,
    engagementDeadline: new Date(parseInt(market.engagementDeadline) * 1000),
    resolutionDeadline: new Date(parseInt(market.resolutionDeadline) * 1000),
    creatorFee: market.creatorFee,
    predictionCount: parseInt(market.predictionCount),
    totalAmount: market.totalAmount,
    isCancelled: market.isCancelled,
    isResolved: market.isResolved,
    createdAt: new Date(parseInt(market.createdAt) * 1000),
  }
}

export function MarketCategorySection({
  category,
  onQuickBet,
  onRefresh,
}: MarketCategorySectionProps) {
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const { addNotification } = useNotifications()

  const handleQuickBet = (marketId: string, eventId: string) => {
    if (onQuickBet) {
      onQuickBet(marketId, eventId)
    } else {
      addNotification({
        type: "info",
        title: "Quick Bet",
        message: `Fonctionnalité de pari rapide pour l'événement ${eventId} du marché ${marketId} - À implémenter`,
        duration: 3000,
      })
    }
  }

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        scrollContainerRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1)
    }
  }

  // Vérifier les boutons de navigation au montage et quand les marchés changent
  useEffect(() => {
    if (category.markets.length > 0) {
      setTimeout(checkScrollButtons, 100)
    }
  }, [category.markets])

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320 // Largeur d'une carte + gap
      const newScrollLeft =
        direction === "left"
          ? scrollContainerRef.current.scrollLeft - scrollAmount
          : scrollContainerRef.current.scrollLeft + scrollAmount

      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: "smooth",
      })

      // Mettre à jour les boutons après l'animation
      setTimeout(checkScrollButtons, 300)
    }
  }

  return (
    <div className="mb-16">
      {/* En-tête de la catégorie */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-100 mb-3">
            {category.title}
          </h2>
          <p className="text-gray-400 text-base">{category.description}</p>
        </div>
        <div className="flex items-center space-x-3">
          {category.markets.length > 0 && (
            <span className="text-gray-500 text-sm">
              {category.markets.length} marché
              {category.markets.length > 1 ? "s" : ""}
            </span>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={category.isLoading}
              className="p-2 text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50"
              title="Actualiser"
            >
              <svg
                className={`w-5 h-5 ${
                  category.isLoading ? "animate-spin" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* État de chargement */}
      {category.isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-400">Chargement des marchés...</span>
        </div>
      )}

      {/* État d'erreur */}
      {category.error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-center">
          <p className="text-red-400 mb-2">Erreur lors du chargement</p>
          <p className="text-gray-400 text-sm mb-4">{category.error}</p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white transition-colors"
            >
              Réessayer
            </button>
          )}
        </div>
      )}

      {/* État vide */}
      {!category.isLoading &&
        !category.error &&
        category.markets.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg
                className="w-16 h-16 mx-auto mb-4 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <p className="text-lg font-medium">
                Aucun marché dans cette catégorie
              </p>
              <p className="text-sm">
                Les marchés apparaîtront ici une fois créés
              </p>
            </div>
          </div>
        )}

      {/* Carrousel des marchés */}
      {!category.isLoading &&
        !category.error &&
        category.markets.length > 0 && (
          <div className="relative group">
            {/* Bouton de navigation gauche */}
            {canScrollLeft && (
              <button
                onClick={() => scroll("left")}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-black/80 hover:bg-black/90 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            )}

            {/* Bouton de navigation droite */}
            {canScrollRight && (
              <button
                onClick={() => scroll("right")}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-black/80 hover:bg-black/90 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            )}

            {/* Container de défilement horizontal */}
            <div
              ref={scrollContainerRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 pr-80"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              onScroll={checkScrollButtons}
            >
              {category.markets.map((market) => (
                <div key={market.id} className="flex-none w-80">
                  <MarketCard
                    market={convertToMarketCardFormat(market)}
                    onQuickBet={handleQuickBet}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  )
}
