"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"

const getImageUrl = (imageUrl: string) => {
  if (imageUrl.startsWith("ipfs://")) {
    const hash = imageUrl.replace("ipfs://", "")
    return `${process.env.NEXT_PUBLIC_FILEBASE_URL}/${hash}`
  }
  return imageUrl
}

interface MarketEvent {
  id: string
  eventId: string
  name: string
  description: string
}

interface Market {
  id: string
  instanceAddress: string
  creatorAddress: string
  blockNumber: string
  blockTimestamp: Date
  transactionHash: string
  ipfsMetadataHash?: string
  title?: string
  description?: string
  image?: string
  events?: MarketEvent[]
  stakeToken?: string
  engagementDeadline?: Date
  resolutionDeadline?: Date
  creatorFee?: string
  predictionCount?: number
  totalAmount?: string
  isCancelled?: boolean
  isResolved?: boolean
  createdAt: Date
}

interface MarketCardProps {
  market: Market
  onQuickBet?: (marketId: string, eventId: string) => void
}

export function MarketCard({ market, onQuickBet }: MarketCardProps) {
  const router = useRouter()
  const [isHovered, setIsHovered] = useState(false)
  const [showQuickBet, setShowQuickBet] = useState(false)

  const handleCardClick = (e: React.MouseEvent) => {
    // Éviter la navigation si on clique sur les boutons de quick bet
    if ((e.target as HTMLElement).closest(".quick-bet-area")) {
      return
    }
    router.push(`/market/${market.instanceAddress}`)
  }

  const handleQuickBet = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (onQuickBet) {
      onQuickBet(market.id, eventId)
    }
  }

  const formatTimeRemaining = (deadline?: Date) => {
    if (!deadline) return "Non définie"
    const now = new Date()
    if (deadline < now) return "Terminée"
    return formatDistanceToNow(deadline, { addSuffix: true, locale: fr })
  }

  const formatAmount = (amount?: string) => {
    if (!amount) return "0"
    // Convertir de wei vers ETH (approximation)
    const eth = parseFloat(amount) / 1e18
    return eth.toFixed(4)
  }

  const getStatusColor = () => {
    if (market.isCancelled) return "text-red-400"
    if (market.isResolved) return "text-green-400"
    if (market.engagementDeadline && new Date() > market.engagementDeadline)
      return "text-yellow-400"
    return "text-blue-400"
  }

  const getStatusText = () => {
    if (market.isCancelled) return "Annulé"
    if (market.isResolved) return "Résolu"
    if (market.engagementDeadline && new Date() > market.engagementDeadline)
      return "Engagement terminé"
    return "Actif"
  }

  return (
    <div
      className="relative bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-gray-500 transition-all duration-300 cursor-pointer group overflow-visible"
      style={{ zIndex: isHovered ? 10000 : 1 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setShowQuickBet(false)
      }}
      onClick={handleCardClick}
    >
      {/* Image et statut */}
      <div className="relative mb-4">
        {market.image && (
          <div className="w-full h-48 rounded-lg overflow-hidden bg-gray-700">
            <img
              src={getImageUrl(market.image)}
              alt={market.title || "Marché"}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium bg-gray-900/80 ${getStatusColor()}`}
          >
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* Titre et description */}
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-100 mb-2 line-clamp-2">
          {market.title || "Marché sans titre"}
        </h3>
        <p className="text-gray-400 text-sm line-clamp-3">
          {market.description || "Aucune description disponible"}
        </p>
      </div>

      {/* Informations principales */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wide">
            Volume Total
          </p>
          <p className="text-gray-100 font-semibold">
            {formatAmount(market.totalAmount)} ETH
          </p>
        </div>
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wide">
            Prédictions
          </p>
          <p className="text-gray-100 font-semibold">
            {market.predictionCount || 0}
          </p>
        </div>
      </div>

      {/* Panneau d'informations détaillées à droite au hover */}
      <div
        className={`absolute left-full top-0 bottom-0 w-80 bg-gray-800/95 backdrop-blur-sm border border-gray-600 rounded-xl p-6 shadow-2xl transition-all duration-300 ${
          isHovered
            ? "opacity-100 translate-x-0"
            : "opacity-0 translate-x-4 pointer-events-none"
        }`}
        style={{ zIndex: 10001 }}
      >
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-100 border-b border-gray-600 pb-2">
            Détails du marché
          </h4>

          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Fin des engagements:</span>
              <span className="text-gray-300">
                {formatTimeRemaining(market.engagementDeadline)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Résolution:</span>
              <span className="text-gray-300">
                {formatTimeRemaining(market.resolutionDeadline)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Frais créateur:</span>
              <span className="text-gray-300">
                {market.creatorFee
                  ? `${parseFloat(market.creatorFee) / 100}%`
                  : "0%"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Créé:</span>
              <span className="text-gray-300">
                {formatDistanceToNow(market.createdAt, {
                  addSuffix: true,
                  locale: fr,
                })}
              </span>
            </div>
          </div>

          {/* Quick Bet Section */}
          {market.events &&
            market.events.length > 0 &&
            !market.isResolved &&
            !market.isCancelled && (
              <div className="quick-bet-area">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400 text-sm font-medium">
                    Paris Rapides
                  </span>
                </div>

                <div className="transition-all duration-200 overflow-hidden">
                  <div className="space-y-2">
                    {market.events.slice(0, 4).map((event) => (
                      <button
                        key={event.id}
                        onClick={(e) => handleQuickBet(event.eventId, e)}
                        className="w-full px-3 py-2 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600 rounded-lg text-left transition-all duration-200 hover:border-blue-500 group/bet"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-gray-200 text-sm font-medium group-hover/bet:text-blue-300 truncate">
                            {event.name}
                          </span>
                          <span className="text-gray-400 text-xs ml-2">
                            Parier →
                          </span>
                        </div>
                      </button>
                    ))}
                    {market.events.length > 4 && (
                      <p className="text-gray-500 text-xs text-center">
                        +{market.events.length - 4} autres options
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Indicateur de hover */}
      <div
        className={`absolute bottom-2 right-2 transition-opacity duration-300 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex items-center text-gray-400 text-xs">
          <span>Cliquer pour voir le marché</span>
          <svg
            className="w-4 h-4 ml-1"
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
        </div>
      </div>
    </div>
  )
}

// Styles CSS pour line-clamp (à ajouter dans globals.css si pas déjà présent)
// .line-clamp-2 {
//   display: -webkit-box;
//   -webkit-line-clamp: 2;
//   -webkit-box-orient: vertical;
//   overflow: hidden;
// }
//
// .line-clamp-3 {
//   display: -webkit-box;
//   -webkit-line-clamp: 3;
//   -webkit-box-orient: vertical;
//   overflow: hidden;
// }
