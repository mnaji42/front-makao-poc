"use client"

import { useState, useEffect } from "react"
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  usePublicClient,
} from "wagmi"
import { metaMask } from "wagmi/connectors"
import { eventContractInstanceAbi } from "../../docs/abi/eventContractInstanceAbi.js"
import { parseAbiItem, decodeEventLog } from "viem"
import { MarketsList } from "@/components/MarketsList"

const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`

export default function Home() {
  const [markets, setMarkets] = useState<string[]>([])
  const [isHydrated, setIsHydrated] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const publicClient = usePublicClient()



  // Lecture de l'adresse d'implémentation (seulement si connecté)
  // DÉSACTIVÉ par défaut - sera appelé seulement lors de la création d'un marché
  const { data: implementation, refetch: refetchImplementation } =
    useReadContract({
      address: FACTORY_ADDRESS,
      abi: eventContractInstanceAbi,
      functionName: "implementation",
      query: {
        enabled: false, // Désactivé par défaut
      },
    })

  // COMMENTÉ TEMPORAIREMENT - Génère des timeouts et erreurs RPC
  // Récupération des événements historiques (une seule fois)
  useEffect(() => {
    const loadHistoricalMarkets = async () => {
      console.log("Conditions de chargement:", {
        publicClient: !!publicClient,
        isConnected,
        isHydrated,
        marketsLength: markets.length,
      })

      if (!publicClient || !isConnected || !isHydrated || markets.length > 0) {
        console.log("Chargement des marchés annulé - conditions non remplies")
        return
      }

      console.log("Début du chargement des marchés historiques...")
      setIsLoadingHistory(true)

      try {
        console.log("Début du chargement des marchés historiques...")

        // Vérifier d'abord le réseau
        const chainId = await publicClient.getChainId()
        console.log("Chain ID actuel:", chainId)

        // Obtenir le numéro de bloc actuel
        const currentBlock = await publicClient.getBlockNumber()
        console.log("Bloc actuel:", currentBlock)

        console.log("Adresse du contrat factory:", FACTORY_ADDRESS)

        // Vérifier d'abord si le contrat existe
        const code = await publicClient.getBytecode({
          address: FACTORY_ADDRESS,
        })
        console.log(
          "Code du contrat factory:",
          code ? "Contrat trouvé" : "Aucun contrat à cette adresse"
        )

        // Recherche des événements dans les 500000 derniers blocs pour couvrir ~30 jours
        const MAX_BLOCKS_TO_SEARCH = BigInt("500000")
        const startBlock =
          currentBlock > MAX_BLOCKS_TO_SEARCH
            ? currentBlock - MAX_BLOCKS_TO_SEARCH
            : BigInt("0")

        console.log(
          "Recherche des événements CreateInstance dans les",
          MAX_BLOCKS_TO_SEARCH,
          "derniers blocs"
        )
        console.log("Recherche du bloc", startBlock, "au bloc", currentBlock)

        // Recherche par chunks de 10000 blocs pour éviter les limites RPC
        const CHUNK_SIZE = BigInt("10000")
        const allLogs = []

        for (
          let fromBlock = startBlock;
          fromBlock < currentBlock;
          fromBlock += CHUNK_SIZE
        ) {
          const toBlock =
            fromBlock + CHUNK_SIZE - BigInt("1") > currentBlock
              ? currentBlock
              : fromBlock + CHUNK_SIZE - BigInt("1")

          console.log("Recherche chunk:", fromBlock, "à", toBlock)

          try {
            const logs = await publicClient.getLogs({
              address: FACTORY_ADDRESS,
              event: parseAbiItem(
                "event CreateInstance(address indexed instance)"
              ),
              fromBlock,
              toBlock,
            })

            if (logs.length > 0) {
              console.log(
                "Trouvé",
                logs.length,
                "événements dans le chunk",
                fromBlock,
                "-",
                toBlock
              )
              allLogs.push(...logs)
            }
          } catch (chunkError) {
            console.warn(
              "Erreur pour le chunk",
              fromBlock,
              "-",
              toBlock,
              ":",
              chunkError.message
            )
            // Continuer avec le chunk suivant
          }
        }

        console.log("Total événements historiques trouvés:", allLogs.length)
        console.log("Détails des événements:", allLogs)

        if (allLogs.length > 0) {
          const historicalMarkets = allLogs.map((log) => {
            const decoded = decodeEventLog({
              abi: eventContractInstanceAbi,
              ...log,
            })
            return decoded.args.instance as string
          })

          console.log("Marchés extraits:", historicalMarkets)
          setMarkets(historicalMarkets)
        } else {
          console.log(
            "Aucun marché trouvé dans les",
            MAX_BLOCKS_TO_SEARCH,
            "derniers blocs"
          )
        }
      } catch (error) {
        console.error(
          "Erreur lors du chargement des marchés historiques:",
          error
        )
        console.error("Détails de l'erreur:", error.message)
      } finally {
        setIsLoadingHistory(false)
        console.log("Fin du chargement des marchés historiques")
      }
    }

    // Délai pour éviter les requêtes trop fréquentes
    const timeoutId = setTimeout(loadHistoricalMarkets, 1000)
    return () => clearTimeout(timeoutId)
  }, [publicClient, isConnected, isHydrated, markets.length])

  // Gérer l'hydratation pour éviter les erreurs de mismatch
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Écoute des nouveaux événements de création de marchés (seulement si connecté)
  // COMMENTÉ TEMPORAIREMENT - Génère des appels RPC continus
  /*
  useWatchContractEvent({
    address: FACTORY_ADDRESS,
    abi: eventContractInstanceAbi,
    eventName: 'CreateInstance',
    enabled: isConnected && isHydrated,
    onLogs: (logs) => {
      console.log('Nouveaux marchés créés:', logs);
      const newMarkets = logs.map(log => log.args.instance as string);
      setMarkets(prev => {
        // Éviter les doublons
        const uniqueMarkets = [...prev];
        newMarkets.forEach(market => {
          if (!uniqueMarkets.includes(market)) {
            uniqueMarkets.push(market);
          }
        });
        return uniqueMarkets;
      });
    },
  });
  */

  const handleConnect = () => {
    connect({ connector: metaMask() })
  }



  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 relative overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,120,120,0.03),transparent_50%)]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Hero */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-gray-700/40 border border-gray-600 text-gray-400 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                Live on Sepolia Testnet
              </div>
              <h2 className="text-5xl font-bold leading-tight text-gray-100">
                Prédictions de marché
                <span className="block text-gray-400">en temps réel</span>
              </h2>
              <p className="text-xl text-gray-400 leading-relaxed">
                Plateforme décentralisée permettant aux streamers et leur
                audience de créer et participer à des prédictions de marché en
                direct.
              </p>
            </div>

            {/* Connection Status */}
            {!isHydrated ? (
              <div className="bg-gray-700/20 border border-gray-600 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-gray-400 rounded-full" />
                  <div>
                    <p className="text-gray-300 font-medium">Chargement...</p>
                    <p className="text-gray-500 text-sm">
                      Vérification du wallet
                    </p>
                  </div>
                </div>
              </div>
            ) : isConnected ? (
              <div className="bg-gray-700/20 border border-gray-600 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                  <div>
                    <p className="text-green-300 font-medium">
                      Wallet connecté
                    </p>
                    <p className="text-gray-500 text-sm">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-700/20 border border-gray-600 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-orange-400 rounded-full" />
                  <div>
                    <p className="text-orange-300 font-medium">Wallet requis</p>
                    <p className="text-gray-500 text-sm">
                      Connectez MetaMask pour commencer
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Contract Info */}
            {(implementation as string) && (
              <div className="bg-gray-700/20 border border-gray-600 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-100 mb-2">
                  Contrat Factory
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Factory:</span>
                    <span className="text-gray-200 font-mono text-xs">
                      {FACTORY_ADDRESS}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Side - Features */}
          <div className="space-y-6">
            <div className="grid gap-6">
              <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-gray-500 transition-colors">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-gray-700 to-gray-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-6 h-6 text-gray-200"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-100 mb-2">
                      Prédictions en Live
                    </h3>
                    <p className="text-gray-500">
                      Créez et participez à des prédictions de marché en temps
                      réel pendant les streams.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-gray-500 transition-colors">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-gray-700 to-gray-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-6 h-6 text-gray-200"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-100 mb-2">
                      Économie Décentralisée
                    </h3>
                    <p className="text-gray-500">
                      Système de tokens et récompenses basé sur la blockchain
                      Ethereum.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-gray-500 transition-colors">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-gray-700 to-gray-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-6 h-6 text-gray-200"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-100 mb-2">
                      Sécurité Web3
                    </h3>
                    <p className="text-gray-500">
                      Transactions transparentes et sécurisées via smart
                      contracts.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Markets List */}
        {isHydrated && (
          <div className="mt-12">
            <MarketsList />
          </div>
        )}
      </div>


    </div>
  )
}
