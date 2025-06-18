'use client'

import { useAccount } from "wagmi"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Calendar, TrendingUp, Users, Trophy, Clock } from "lucide-react"
import { fetchFromSubgraph } from "@/lib/subgraph"

interface Market {
  id: string
  question: string
  description: string
  creator: string
  endTime: string
  totalVolume: string
  isResolved: boolean
  winningOutcome?: number
}

interface Participation {
  id: string
  market: Market
  outcome: number
  amount: string
  timestamp: string
}

export default function UserPage() {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const [createdMarkets, setCreatedMarkets] = useState<Market[]>([])
  const [participations, setParticipations] = useState<Participation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'created' | 'participated'>('created')

  useEffect(() => {
    if (!isConnected) {
      router.push('/')
      return
    }
    fetchUserData()
  }, [isConnected, address])

  const fetchUserData = async () => {
    if (!address) return
    
    setLoading(true)
    try {
      // Fetch created markets directly from subgraph
      const createdMarketsQuery = `
        query GetCreatedMarkets($creator: String!) {
          markets(where: { creator: $creator }) {
            id
            title
            description
            creator
            resolutionDeadline
            engagementDeadline
            totalVolume
            isResolved
            winningOutcome
          }
        }
      `
      
      const createdData = await fetchFromSubgraph<{ markets: any[] }>(createdMarketsQuery, {
        creator: address.toLowerCase()
      })
      
      const transformedMarkets = createdData.markets.map((market: any) => ({
        id: market.id,
        question: market.title || 'Question non disponible',
        description: market.description || 'Description du marché',
        creator: market.creator,
        endTime: market.resolutionDeadline || market.engagementDeadline,
        totalVolume: market.totalVolume || '0',
        isResolved: market.isResolved || false,
        winningOutcome: market.winningOutcome
      }))
      setCreatedMarkets(transformedMarkets)

      // Fetch participations directly from subgraph
      const participationsQuery = `
        query GetUserParticipations($user: String!) {
          bets(where: { user: $user }) {
            id
            outcome
            amount
            timestamp
            market {
              id
              title
              description
              creator
              resolutionDeadline
              engagementDeadline
              totalVolume
              isResolved
              winningOutcome
            }
          }
        }
      `
      
      const participationsData = await fetchFromSubgraph<{ bets: any[] }>(participationsQuery, {
        user: address.toLowerCase()
      })
      
      const transformedParticipations = participationsData.bets.map((bet: any) => ({
        id: bet.id,
        outcome: bet.outcome,
        amount: bet.amount,
        timestamp: bet.timestamp,
        market: {
          id: bet.market.id,
          question: bet.market.title || 'Question non disponible',
          description: bet.market.description || 'Description du marché',
          creator: bet.market.creator,
          endTime: bet.market.resolutionDeadline || bet.market.engagementDeadline,
          totalVolume: bet.market.totalVolume || '0',
          isResolved: bet.market.isResolved || false,
          winningOutcome: bet.market.winningOutcome
        }
      }))
      setParticipations(transformedParticipations)
      
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (timestamp: string) => {
    return new Date(parseInt(timestamp) * 1000).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const activeParticipations = participations.filter(p => !p.market.isResolved)
  const finishedParticipations = participations.filter(p => p.market.isResolved)

  if (!isConnected) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <button className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>Retour</span>
              </button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-100">Mon Compte</h1>
              <p className="text-gray-400 text-sm font-mono">{formatAddress(address!)}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg mb-8">
          <button
            onClick={() => setActiveTab('created')}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-md transition-colors ${
              activeTab === 'created'
                ? 'bg-slate-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Marchés Créés ({createdMarkets.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('participated')}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-md transition-colors ${
              activeTab === 'participated'
                ? 'bg-slate-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Mes Participations ({participations.length})</span>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
          </div>
        ) : (
          <div>
            {/* Created Markets Tab */}
            {activeTab === 'created' && (
              <div>
                {createdMarkets.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-400 mb-2">
                      Aucun marché créé
                    </h3>
                    <p className="text-gray-500 mb-6">
                      Vous n'avez pas encore créé de marché de prédiction.
                    </p>
                    <Link href="/">
                      <button className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors">
                        Créer mon premier marché
                      </button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {createdMarkets.map((market) => (
                      <div key={market.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-100 mb-2">
                              {market.question}
                            </h3>
                            <p className="text-gray-400 text-sm mb-3">
                              {market.description}
                            </p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                            market.isResolved
                              ? 'bg-green-900 text-green-300'
                              : 'bg-blue-900 text-blue-300'
                          }`}>
                            {market.isResolved ? 'Terminé' : 'En cours'}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>Fin: {formatDate(market.endTime)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Trophy className="w-4 h-4" />
                              <span>Volume: {market.totalVolume} ETH</span>
                            </div>
                          </div>
                          <Link href={`/market/${market.id}`}>
                            <button className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-md transition-colors">
                              Voir détails
                            </button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Participated Markets Tab */}
            {activeTab === 'participated' && (
              <div>
                {participations.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-400 mb-2">
                      Aucune participation
                    </h3>
                    <p className="text-gray-500 mb-6">
                      Vous n'avez pas encore participé à des marchés de prédiction.
                    </p>
                    <Link href="/">
                      <button className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors">
                        Explorer les marchés
                      </button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Active Participations */}
                    {activeParticipations.length > 0 && (
                      <div>
                        <h3 className="text-xl font-semibold text-gray-100 mb-4 flex items-center space-x-2">
                          <Clock className="w-5 h-5" />
                          <span>Paris en cours ({activeParticipations.length})</span>
                        </h3>
                        <div className="grid gap-4">
                          {activeParticipations.map((participation) => (
                            <div key={participation.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                  <h4 className="text-lg font-semibold text-gray-100 mb-2">
                                    {participation.market.question}
                                  </h4>
                                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                                    <span>Pari: {participation.outcome === 0 ? 'Non' : 'Oui'}</span>
                                    <span>Montant: {participation.amount} ETH</span>
                                    <span>Date: {formatDate(participation.timestamp)}</span>
                                  </div>
                                </div>
                                <Link href={`/market/${participation.market.id}`}>
                                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors">
                                    Voir marché
                                  </button>
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Finished Participations */}
                    {finishedParticipations.length > 0 && (
                      <div>
                        <h3 className="text-xl font-semibold text-gray-100 mb-4 flex items-center space-x-2">
                          <Trophy className="w-5 h-5" />
                          <span>Paris terminés ({finishedParticipations.length})</span>
                        </h3>
                        <div className="grid gap-4">
                          {finishedParticipations.map((participation) => (
                            <div key={participation.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                  <h4 className="text-lg font-semibold text-gray-100 mb-2">
                                    {participation.market.question}
                                  </h4>
                                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                                    <span>Pari: {participation.outcome === 0 ? 'Non' : 'Oui'}</span>
                                    <span>Montant: {participation.amount} ETH</span>
                                    <span>Date: {formatDate(participation.timestamp)}</span>
                                  </div>
                                  {participation.market.winningOutcome !== undefined && (
                                    <div className={`mt-2 px-3 py-1 rounded-full text-xs font-medium inline-block ${
                                      participation.outcome === participation.market.winningOutcome
                                        ? 'bg-green-900 text-green-300'
                                        : 'bg-red-900 text-red-300'
                                    }`}>
                                      {participation.outcome === participation.market.winningOutcome ? 'Gagné' : 'Perdu'}
                                    </div>
                                  )}
                                </div>
                                <Link href={`/market/${participation.market.id}`}>
                                  <button className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-md transition-colors">
                                    Voir résultats
                                  </button>
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}