"use client"

import { useState } from "react"
import { useMarkets } from "@/hooks/useMarkets"

interface Market {
  id: string
  instanceAddress: string
  creatorAddress: string
  blockNumber: string
  blockTimestamp: Date
  transactionHash: string
  title?: string
  stakeToken?: string
  engagementDeadline?: Date
  resolutionDeadline?: Date
  creatorFee?: string
  predictionCount?: number
  createdAt: Date
}

export function MarketsList() {
  const { markets, isLoading, error, totalCount, refetch } = useMarkets()

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Erreur</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              onClick={refetch}
              className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">
            Marchés de Prédiction
          </h2>
          <p className="text-gray-400 mt-1">
            {totalCount} marché{totalCount !== 1 ? "s" : ""} trouvé
            {totalCount !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={refetch}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <svg
            className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
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
          <span>{isLoading ? "Actualisation..." : "Actualiser"}</span>
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="text-gray-400">Chargement des marchés...</span>
          </div>
        </div>
      )}

      {/* Markets List */}
      {!isLoading && markets.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-300">
            Aucun marché trouvé
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Aucun marché de prédiction n'a été créé pour le moment.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {markets.map((market) => (
            <div
              key={market.id}
              className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h3 className="text-lg font-semibold text-gray-100">
                      {market.title || "Marché sans titre"}
                    </h3>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                      {market.predictionCount || 2} options
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Adresse du contrat:</span>
                      <p className="text-gray-200 font-mono">
                        {formatAddress(market.instanceAddress)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400">Créateur:</span>
                      <p className="text-gray-200 font-mono">
                        {formatAddress(market.creatorAddress)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400">Créé le:</span>
                      <p className="text-gray-200">
                        {formatDate(market.blockTimestamp)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400">Bloc:</span>
                      <p className="text-gray-200 font-mono">
                        #{market.blockNumber}
                      </p>
                    </div>
                    {market.stakeToken && (
                      <div>
                        <span className="text-gray-400">Token de mise:</span>
                        <p className="text-gray-200 font-mono">
                          {formatAddress(market.stakeToken)}
                        </p>
                      </div>
                    )}
                    {market.creatorFee && (
                      <div>
                        <span className="text-gray-400">Frais créateur:</span>
                        <p className="text-gray-200">
                          {(parseInt(market.creatorFee) / 100).toFixed(2)}%
                        </p>
                      </div>
                    )}
                    {market.engagementDeadline && (
                      <div>
                        <span className="text-gray-400">Fin des paris:</span>
                        <p className="text-gray-200">
                          {formatDate(market.engagementDeadline)}
                        </p>
                      </div>
                    )}
                    {market.resolutionDeadline && (
                      <div>
                        <span className="text-gray-400">Résolution:</span>
                        <p className="text-gray-200">
                          {formatDate(market.resolutionDeadline)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-2">
                  <a
                    href={`https://sepolia.etherscan.io/address/${market.instanceAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm flex items-center space-x-1"
                  >
                    <span>Voir sur Etherscan</span>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${market.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-300 text-sm flex items-center space-x-1"
                  >
                    <span>Transaction</span>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
