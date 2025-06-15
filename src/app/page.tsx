"use client"

import { useState, useEffect } from "react"
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useWatchContractEvent,
  usePublicClient,
  useConfig,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi"
import { metaMask } from "wagmi/connectors"
import { eventContractInstanceAbi } from "../../docs/abi/eventContractInstanceAbi.js"
import { parseAbiItem, decodeEventLog, keccak256, toBytes } from "viem"
import { MarketsList } from "@/components/MarketsList"

const FACTORY_ADDRESS = "0xfc58FefaDA53D508FD584278B8EED8e7A02c34B2" as const

export default function Home() {
  const [markets, setMarkets] = useState<string[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  // Modifier l'état initial du formulaire
  const [createFormData, setCreateFormData] = useState({
    title: "",
    stakeToken: "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9", // WETH Sepolia par défaut
    tokenType: "preset", // 'preset' ou 'custom'
    customTokenAddress: "",
    engagementDeadline: "",
    resolutionDeadline: "",
    creatorFee: "",
    predictionCount: "2",
  })
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const publicClient = usePublicClient()
  const config = useConfig()
  const {
    writeContract,
    data: hash,
    isPending,
    error: writeError,
  } = useWriteContract()
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash,
    enabled: !!hash && isConnected,
    // Suppression du refetchInterval - wagmi gère automatiquement
  })

  // Logs pour débugger les états
  useEffect(() => {
    console.log("États wagmi:", {
      isPending,
      isConfirming,
      isConfirmed,
      hash,
      writeError,
      confirmError,
    })
  }, [isPending, isConfirming, isConfirmed, hash, writeError, confirmError])

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

  // Modifier la fonction handleCreateMarket
  const handleCreateMarket = async () => {
    console.log("handleCreateMarket appelée")

    if (
      !createFormData.title ||
      !createFormData.engagementDeadline ||
      !createFormData.resolutionDeadline ||
      !createFormData.creatorFee
    ) {
      alert("Veuillez remplir tous les champs obligatoires")
      return
    }

    // Déterminer l'adresse du token à utiliser
    const tokenAddress =
      createFormData.tokenType === "preset"
        ? createFormData.stakeToken
        : createFormData.customTokenAddress

    if (!tokenAddress) {
      alert("Veuillez sélectionner un token ou entrer une adresse valide")
      return
    }

    console.log("Données du formulaire:", createFormData)
    console.log("Adresse du token:", tokenAddress)
    console.log("Adresse connectée:", address)
    console.log("Est connecté:", isConnected)

    try {
      // Générer un salt unique basé sur le titre et l'adresse
      const salt = keccak256(
        toBytes(`${createFormData.title}-${address}-${Date.now()}`)
      )

      // Convertir les dates en timestamps
      const engagementDeadline = Math.floor(
        new Date(createFormData.engagementDeadline).getTime() / 1000
      )
      const resolutionDeadline = Math.floor(
        new Date(createFormData.resolutionDeadline).getTime() / 1000
      )

      // Convertir le fee en wei (supposons que c'est en pourcentage, donc * 100 pour les basis points)
      const creatorFeeWei = BigInt(
        Math.floor(parseFloat(createFormData.creatorFee) * 100)
      )

      const args = [
        salt, // _salt (bytes32)
        tokenAddress as `0x${string}`, // _stakeToken (address)
        BigInt(engagementDeadline), // _engagementDeadline (uint256)
        BigInt(resolutionDeadline), // _resolutionDeadline (uint256)
        creatorFeeWei, // _creatorFee (uint256)
        BigInt(createFormData.predictionCount), // _predictionCount (uint256)
        "QmYwAPZWMgsWfLg2bXm2y2a9B3B3B3B3B3B3B3B3B3B3B", // Mock IPFS hash
      ]

      console.log("Arguments pour createInstance:", args)

      const result = writeContract({
        address: FACTORY_ADDRESS,
        abi: eventContractInstanceAbi,
        functionName: "createInstance",
        args,
      })

      console.log("writeContract appelée, résultat:", result)
      console.log("État isPending après writeContract:", isPending)

      // Attendre un peu pour voir si l'état change
      setTimeout(() => {
        console.log("État après 1 seconde:", { isPending, hash, writeError })
      }, 1000)
    } catch (error) {
      console.error("Erreur lors de la création du marché:", error)
      alert(`Erreur lors de la création du marché: ${error.message}`)
    }
  }

  // Modifier la fonction resetForm
  const resetForm = () => {
    setCreateFormData({
      title: "",
      stakeToken: "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9", // WETH Sepolia par défaut
      tokenType: "preset", // 'preset' ou 'custom'
      customTokenAddress: "",
      engagementDeadline: "",
      resolutionDeadline: "",
      creatorFee: "",
      predictionCount: "2",
    })
    setShowCreateForm(false)
  }

  // Reset form when transaction is confirmed and reload markets
  useEffect(() => {
    if (isConfirmed) {
      resetForm()
      alert("Marché créé avec succès!")

      // Recharger la liste des marchés après création
      const reloadMarkets = async () => {
        if (!publicClient || !isConnected) return

        setIsLoadingHistory(true)
        try {
          // Récupérer les logs des 500000 derniers blocs (même limite que le chargement initial)
          const currentBlock = await publicClient.getBlockNumber()
          const MAX_BLOCKS_TO_SEARCH = BigInt("500000")
          const fromBlock =
            currentBlock > MAX_BLOCKS_TO_SEARCH
              ? currentBlock - MAX_BLOCKS_TO_SEARCH
              : BigInt("0")

          const logs = await publicClient.getLogs({
            address: FACTORY_ADDRESS,
            event: parseAbiItem(
              "event CreateInstance(address indexed instance)"
            ),
            fromBlock,
            toBlock: currentBlock,
          })

          console.log("Rechargement des marchés après création:", logs)

          const historicalMarkets = logs.map((log) => {
            const decoded = decodeEventLog({
              abi: eventContractInstanceAbi,
              ...log,
            })
            return decoded.args.instance as string
          })

          setMarkets(historicalMarkets)
        } catch (error) {
          console.error("Erreur lors du rechargement des marchés:", error)
        } finally {
          setIsLoadingHistory(false)
        }
      }

      // Attendre un peu avant de recharger pour s'assurer que la transaction est bien indexée
      setTimeout(reloadMarkets, 2000)
    }
  }, [isConfirmed, publicClient, isConnected])

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 relative overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,120,120,0.03),transparent_50%)]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-r from-gray-700 to-gray-600 rounded-lg flex items-center justify-center">
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
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-100">
                Makao Predictions
              </h1>
              <p className="text-gray-500 text-sm">
                Live Market Predictions for Streamers
              </p>
            </div>
          </div>
          {!isHydrated ? (
            <div className="flex gap-3">
              <button
                disabled
                className="px-6 py-2 bg-gradient-to-r from-gray-600 to-gray-700 border border-gray-500 rounded-lg text-gray-100 font-medium opacity-50"
              >
                Chargement...
              </button>
            </div>
          ) : isConnected ? (
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Connecté</p>
                <p className="text-sm font-mono">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </p>
              </div>
              <button
                onClick={() => disconnect()}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-500 rounded-lg text-gray-100 transition-colors"
              >
                Déconnecter
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={handleConnect}
                className="px-6 py-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 border border-gray-500 rounded-lg text-gray-100 font-medium transition-all duration-300 transform hover:scale-105"
              >
                Connecter MetaMask
              </button>
            </div>
          )}

          {isHydrated && isConnected && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 border border-green-500 rounded-lg text-gray-100 font-medium transition-all duration-300 transform hover:scale-105"
            >
              Créer un Marché
            </button>
          )}
        </header>

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
        {isHydrated && isConnected && (
          <div className="mt-12">
            <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-100">
                  Tous les Marchés
                </h2>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-green-300 text-sm">
                    En écoute des nouveaux marchés
                  </span>
                </div>
              </div>

              {isLoadingHistory ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="animate-spin w-8 h-8 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-100 mb-2">
                    Chargement des marchés
                  </h3>
                  <p className="text-gray-400 mb-4">
                    Récupération des événements historiques...
                  </p>
                </div>
              ) : markets.length > 0 ? (
                <div className="grid gap-4">
                  {markets.map((market, index) => (
                    <div
                      key={market}
                      className="bg-gray-700/30 border border-gray-600 rounded-lg p-4 hover:border-gray-500 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-100">
                            Marché #{index + 1}
                          </h3>
                          <p className="text-sm font-mono text-gray-400">
                            {market}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-500/20 text-green-300 text-xs">
                            Actif
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-gray-400"
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
                  </div>
                  <h3 className="text-xl font-semibold text-gray-100 mb-2">
                    Aucun marché disponible
                  </h3>
                  <p className="text-gray-400 mb-4">
                    Les nouveaux marchés apparaîtront automatiquement ici
                  </p>
                  <div className="text-sm text-gray-500">
                    <p>
                      Factory Contract:{" "}
                      <span className="font-mono">{FACTORY_ADDRESS}</span>
                    </p>
                    {(implementation as string) && (
                      <p>
                        Implementation:{" "}
                        <span className="font-mono">{implementation}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* MarketsList Component */}
            <div className="mt-8">
              <MarketsList />
            </div>
          </div>
        )}
      </div>

      {/* Modal de création de marché */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-100">
                Créer un Nouveau Marché
              </h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-200"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Titre du marché *
                </label>
                <input
                  type="text"
                  value={createFormData.title}
                  onChange={(e) =>
                    setCreateFormData((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500"
                  placeholder="Ex: Bitcoin atteindra-t-il 100k$ ?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Token de mise *
                </label>

                {/* Radio buttons pour choisir entre preset et custom */}
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="tokenType"
                      value="preset"
                      checked={createFormData.tokenType === "preset"}
                      onChange={(e) =>
                        setCreateFormData((prev) => ({
                          ...prev,
                          tokenType: e.target.value,
                        }))
                      }
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-300">
                      Tokens prédéfinis
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="tokenType"
                      value="custom"
                      checked={createFormData.tokenType === "custom"}
                      onChange={(e) =>
                        setCreateFormData((prev) => ({
                          ...prev,
                          tokenType: e.target.value,
                        }))
                      }
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-300">
                      Adresse personnalisée
                    </span>
                  </label>
                </div>

                {createFormData.tokenType === "preset" ? (
                  <select
                    value={createFormData.stakeToken}
                    onChange={(e) =>
                      setCreateFormData((prev) => ({
                        ...prev,
                        stakeToken: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9">
                      WETH (Wrapped Ether) - Sepolia
                    </option>
                    <option value="0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984">
                      UNI (Uniswap) - Sepolia
                    </option>
                    <option value="0x6f14C02FC1F78322cFd7d707aB90f18baD3B54f5">
                      USDC (USD Coin) - Sepolia
                    </option>
                    <option value="0x7169D38820dfd117C3FA1f22a697dBA58d90BA06">
                      USDT (Tether) - Sepolia
                    </option>
                    <option value="0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357">
                      DAI (Dai Stablecoin) - Sepolia
                    </option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={createFormData.customTokenAddress}
                    onChange={(e) =>
                      setCreateFormData((prev) => ({
                        ...prev,
                        customTokenAddress: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500 font-mono text-sm"
                    placeholder="0x... (Adresse du contrat ERC-20)"
                  />
                )}

                <p className="text-xs text-gray-500 mt-1">
                  {createFormData.tokenType === "preset"
                    ? "Tokens de test disponibles sur Sepolia avec des faucets"
                    : "Entrez l'adresse d'un contrat ERC-20 valide sur Sepolia"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Date limite d'engagement *
                </label>
                <input
                  type="datetime-local"
                  value={createFormData.engagementDeadline}
                  onChange={(e) =>
                    setCreateFormData((prev) => ({
                      ...prev,
                      engagementDeadline: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Date limite de résolution *
                </label>
                <input
                  type="datetime-local"
                  value={createFormData.resolutionDeadline}
                  onChange={(e) =>
                    setCreateFormData((prev) => ({
                      ...prev,
                      resolutionDeadline: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Frais du créateur (wei)
                </label>
                <input
                  type="number"
                  value={createFormData.creatorFee}
                  onChange={(e) =>
                    setCreateFormData((prev) => ({
                      ...prev,
                      creatorFee: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre de prédictions possibles
                </label>
                <select
                  value={createFormData.predictionCount}
                  onChange={(e) =>
                    setCreateFormData((prev) => ({
                      ...prev,
                      predictionCount: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="2">2 (Oui/Non)</option>
                  <option value="3">3 options</option>
                  <option value="4">4 options</option>
                  <option value="5">5 options</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateForm(false)}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateMarket}
                disabled={isPending || isConfirming}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {isPending
                  ? "Signature..."
                  : isConfirming
                  ? "Confirmation..."
                  : "Créer"}
              </button>
            </div>

            {hash && (
              <div className="mt-4 p-3 bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-300">Transaction envoyée:</p>
                <p className="text-xs font-mono text-gray-400 break-all">
                  {hash}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
