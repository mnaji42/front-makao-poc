"use client"

import { useState, useEffect } from "react"
import {
  useAccount,
  usePublicClient,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi"
import { uploadMarketMetadata } from "../lib/ipfsUploader"
import { eventContractInstanceAbi } from "../../docs/abi/eventContractInstanceAbi.js"
import { keccak256, toBytes } from "viem"
import { useNotifications } from "../contexts/NotificationContext"
import { TransactionNotification } from "./notifications/TransactionNotification"
import { TransactionStatusUpdater } from "./notifications/TransactionStatusUpdater"

const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`

interface CreateMarketModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateMarketModal({ isOpen, onClose }: CreateMarketModalProps) {
  const { addNotification } =
    useNotifications()
  const [transactionNotificationId, setTransactionNotificationId] = useState<
    string | null
  >(null)
  const [createFormData, setCreateFormData] = useState({
    title: "",
    marketDescription: "",
    imageFile: null as File | null,
    stakeToken: process.env.NEXT_PUBLIC_WETH_ADDRESS as `0x${string}`,
    tokenType: "preset",
    customTokenAddress: "",
    engagementDeadline: "",
    resolutionDeadline: "",
    creatorFee: "",
    predictionCount: "2",
    events: [{ id: 0, name: "", description: "" }, { id: 0, name: "", description: "" }],
  })

  const [predictedMarketAddress, setPredictedMarketAddress] = useState<
    string | null
  >(null)

  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
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

  const handleCreateMarket = async () => {
    console.log("handleCreateMarket appelée")

    if (
      !createFormData.title ||
      !createFormData.marketDescription ||
      !createFormData.imageFile ||
      !createFormData.engagementDeadline ||
      !createFormData.resolutionDeadline ||
      !createFormData.creatorFee ||
      createFormData.events.some((event) => !event.name || !event.description)
    ) {
      alert(
        "Veuillez remplir tous les champs obligatoires, y compris les détails de l'événement."
      )
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


    try {
      const ipfsHash = await uploadMarketMetadata(
        createFormData.title,
        createFormData.marketDescription,
        createFormData.imageFile,
        createFormData.events
      )

      if (!ipfsHash) {
        alert("Échec du téléchargement des métadonnées IPFS.")
        return
      }

      // Générer un salt unique basé sur le titre , l'adresse et la date
      const salt = keccak256(
        toBytes(`${createFormData.title}-${address}-${Date.now()}`)
      )

      // 1. Prédire l'adresse du marché avec predictInstance
      const predictedAddress = await publicClient.readContract({
        address: FACTORY_ADDRESS,
        abi: eventContractInstanceAbi,
        functionName: "predictInstance",
        args: [salt],
      })

      setPredictedMarketAddress((predictedAddress as string).toLowerCase())

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
        ipfsHash, // Utiliser le hash IPFS réel
      ]


      // 2. Créer l'instance sur la blockchain
      writeContract({
        address: FACTORY_ADDRESS,
        abi: eventContractInstanceAbi,
        functionName: "createInstance",
        args,
      })

    } catch (error) {
      console.error("Erreur lors de la création du marché:", error)
      const errorNotificationId = addNotification({
        type: "error",
        title: "Erreur lors de la création",
        message: `Impossible de créer le marché: ${error.message}`,
      })
    }
  }

  const resetForm = () => {
    setCreateFormData({
      title: "",
      marketDescription: "",
      imageFile: null,
      stakeToken: "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9", // WETH Sepolia par défaut
      tokenType: "preset",
      customTokenAddress: "",
      engagementDeadline: "",
      resolutionDeadline: "",
      creatorFee: "",
      predictionCount: "2",
      events: [{ id: 0, name: "", description: "" }],
    })
    setPredictedMarketAddress(null)
    setTransactionNotificationId(null)
    onClose()
  }

  // Créer une notification de transaction unique
  useEffect(() => {
    if (hash && predictedMarketAddress && !transactionNotificationId) {
      const notificationId = addNotification({
        type: "loading",
        title: "Création du marché en cours",
        message: "Votre transaction est en cours de confirmation...",
        duration: 0,
        component: (
          <TransactionNotification
            hash={hash}
            showStatus={false} // On gère le statut dans la notification principale
          />
        ),
      })
      setTransactionNotificationId(notificationId)
    }
  }, [hash, predictedMarketAddress, transactionNotificationId, addNotification])

  // Gérer les mises à jour de statut de transaction
  const handleTransactionSuccess = (receipt: any) => {
    console.log("Transaction confirmée:", receipt)
    // Pas de redirection automatique, l'utilisateur choisit via la notification
    resetForm()
  }

  const handleTransactionError = (error: any) => {
    console.error("Erreur de transaction:", error)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Composant invisible pour gérer les mises à jour de notification */}
      {transactionNotificationId && hash && (
        <TransactionStatusUpdater
          hash={hash}
          notificationId={transactionNotificationId}
          onSuccess={handleTransactionSuccess}
          onError={handleTransactionError}
          predictedMarketAddress={predictedMarketAddress}
        />
      )}

      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-100">
              Créer un Nouveau Marché
            </h2>
            <button
              onClick={onClose}
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Colonne gauche - Informations de base */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-200 border-b border-gray-600 pb-2">
                Informations de base
              </h3>
              
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
                  Description du marché *
                </label>
                <textarea
                  value={createFormData.marketDescription}
                  onChange={(e) =>
                    setCreateFormData((prev) => ({
                      ...prev,
                      marketDescription: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500"
                  placeholder="Décrivez le marché en détail..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setCreateFormData((prev) => ({
                        ...prev,
                        imageFile: e.target.files![0],
                      }))
                    }
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </div>

            {/* Colonne droite - Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-200 border-b border-gray-600 pb-2">
                Configuration
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Token de mise *
                </label>
                <div className="flex gap-4 mb-2">
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
                    <span className="text-sm text-gray-300">Prédéfinis</span>
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
                    <span className="text-sm text-gray-300">Personnalisé</span>
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
                    <option value={process.env.NEXT_PUBLIC_WETH_ADDRESS}>
                      WETH Sepolia
                    </option>
                    <option value={process.env.NEXT_PUBLIC_USDT_ADDRESS}>
                      USDT
                    </option>
                    <option value={process.env.NEXT_PUBLIC_USDC_ADDRESS}>
                      USDC
                    </option>
                    <option value={process.env.NEXT_PUBLIC_DAI_ADDRESS}>
                      DAI
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

                )}
                <p className="text-xs text-gray-500 mt-1">
                  {createFormData.tokenType === "preset"
                    ? "Tokens de test disponibles sur Sepolia"
                    : "Entrez l'adresse d'un contrat ERC-20 valide"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Frais du créateur (%)
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
                  step="0.1"
                  min="0"
                  max="10"
                />
              </div>
            </div>
          </div>

          {/* Section des événements - pleine largeur */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-200 border-b border-gray-600 pb-2 mb-4">
               Événements de prédiction
             </h3>
            <div className="space-y-3">
              {createFormData.events.map((event, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-gray-700/30 rounded-lg">
                  <input
                    type="text"
                    value={event.name}
                    onChange={(e) => {
                      const newEvents = [...createFormData.events]
                      newEvents[index].name = e.target.value
                      setCreateFormData((prev) => ({
                        ...prev,
                        events: newEvents,
                      }))
                    }}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500"
                    placeholder={`Titre de l'événement ${index + 1}`}
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={event.description}
                      onChange={(e) => {
                        const newEvents = [...createFormData.events]
                        newEvents[index].description = e.target.value
                        setCreateFormData((prev) => ({
                          ...prev,
                          events: newEvents,
                        }))
                      }}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500"
                      placeholder={`Description de l'événement ${index + 1}`}
                    />
                    {createFormData.events.length > 2 && (
                       <button
                         type="button"
                         onClick={() => {
                           const newEvents = createFormData.events.filter(
                             (_, i) => i !== index
                           )
                           setCreateFormData((prev) => ({
                             ...prev,
                             events: newEvents,
                           }))
                         }}
                         className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
                       >
                         ✕
                       </button>
                     )}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setCreateFormData((prev) => ({
                    ...prev,
                    events: [
                      ...prev.events,
                      { id: prev.events.length, name: "", description: "" },
                    ],
                  }))
                }
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm"
              >
                + Ajouter un événement
              </button>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
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
    </>
  )
}
