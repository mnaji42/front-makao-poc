"use client"

import { useState } from "react"
import { CreateMarketModal } from "./CreateMarketModal"
import { MarketCategorySection } from "./MarketCategorySection"
import { useNotifications } from "../contexts/NotificationContext"
import type { MarketCategories } from "../lib/marketCategories"

interface MarketsListProps {
  initialData: MarketCategories
}

export function MarketsList({ initialData }: MarketsListProps) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const { addNotification } = useNotifications()

  // Utiliser les données initiales passées en props
  const recentMarkets = initialData.recentMarkets
  const endingSoonMarkets = initialData.endingSoonMarkets
  const highVolumeMarkets = initialData.highVolumeMarkets

  const handleQuickBet = (marketId: string, eventId: string) => {
    // TODO: Implémenter la logique de quick bet
    addNotification({
      type: "info",
      title: "Quick Bet",
      message: `Fonctionnalité de pari rapide pour l'événement ${eventId} du marché ${marketId} - À implémenter`,
      duration: 3000,
    })
  }

  // Avec SSR, pas de loading state
  const isAnyLoading = false
  const hasAnyMarkets =
    recentMarkets.markets.length > 0 ||
    endingSoonMarkets.markets.length > 0 ||
    highVolumeMarkets.markets.length > 0

  return (
    <>
      <div className="space-y-8">
        {/* En-tête principal */}
        <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-100 mb-2">
                Marchés de Prédiction
              </h1>
              <p className="text-gray-400">
                Découvrez et participez aux marchés de prédiction décentralisés
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 border border-green-500 rounded-lg text-gray-100 font-medium transition-all duration-300 transform hover:scale-105"
              >
                Créer un Marché
              </button>
            </div>
          </div>
        </div>

        {/* État global vide */}
        {!isAnyLoading && !hasAnyMarkets && (
          <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-xl p-12 text-center">
            <div className="text-gray-400 mb-6">
              <svg
                className="w-20 h-20 mx-auto mb-4 opacity-50"
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
              <h3 className="text-2xl font-bold text-gray-100 mb-2">
                Aucun marché disponible
              </h3>
              <p className="text-lg mb-6">
                Soyez le premier à créer un marché de prédiction !
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 border border-green-500 rounded-lg text-gray-100 font-medium transition-all duration-300 transform hover:scale-105"
              >
                Créer le Premier Marché
              </button>
            </div>
          </div>
        )}

        {/* Catégories de marchés */}
        {hasAnyMarkets && (
          <div className="space-y-12">
            {/* Marchés se terminant bientôt */}
            <MarketCategorySection
              category={endingSoonMarkets}
              onQuickBet={handleQuickBet}
              onRefresh={() => {
                // Refresh de la page entière avec SSR
                window.location.reload()
              }}
            />

            {/* Marchés récents */}
            <MarketCategorySection
              category={recentMarkets}
              onQuickBet={handleQuickBet}
              onRefresh={() => {
                window.location.reload()
              }}
            />

            {/* Marchés avec gros volumes */}
            <MarketCategorySection
              category={highVolumeMarkets}
              onQuickBet={handleQuickBet}
              onRefresh={() => {
                window.location.reload()
              }}
            />
          </div>
        )}
      </div>

      <CreateMarketModal
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
      />
    </>
  )
}
