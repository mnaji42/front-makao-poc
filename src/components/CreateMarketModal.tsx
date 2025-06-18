"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  useAccount,
  usePublicClient,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi"
import { uploadMarketMetadata } from "../lib/ipfsUploader"
import { eventContractInstanceAbi } from "../../docs/abi/eventContractInstanceAbi.js"
import { parseAbiItem, decodeEventLog, keccak256, toBytes } from "viem"

const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`

interface CreateMarketModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateMarketModal({ isOpen, onClose }: CreateMarketModalProps) {
  const router = useRouter()
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
    events: [{ id: 0, name: "", description: "" }],
  })

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

    console.log("Données du formulaire:", createFormData)
    console.log("Adresse du token:", tokenAddress)
    console.log("Adresse connectée:", address)
    console.log("Est connecté:", isConnected)

    try {
      const ipfsHash = await uploadMarketMetadata(
        createFormData.title,
        createFormData.marketDescription,
        createFormData.imageFile,
        createFormData.events
      )
      console.log("IPFS Hash:", ipfsHash)

      if (!ipfsHash) {
        alert("Échec du téléchargement des métadonnées IPFS.")
        return
      }

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

      console.log("ipfs-hash: ", ipfsHash)
      console.log("salt généré:", salt)

      const args = [
        salt, // _salt (bytes32)
        tokenAddress as `0x${string}`, // _stakeToken (address)
        BigInt(engagementDeadline), // _engagementDeadline (uint256)
        BigInt(resolutionDeadline), // _resolutionDeadline (uint256)
        creatorFeeWei, // _creatorFee (uint256)
        BigInt(createFormData.predictionCount), // _predictionCount (uint256)
        ipfsHash, // Utiliser le hash IPFS réel
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
    onClose()
  }

  // Reset form when transaction is confirmed and redirect to market page
  useEffect(() => {
    if (isConfirmed && hash) {
      const handleMarketCreated = async () => {
        try {
          // Récupérer la transaction pour obtenir les logs
          const receipt = await publicClient?.getTransactionReceipt({ hash })

          if (receipt && receipt.logs) {
            // Chercher l'événement InstanceCreated dans les logs
            for (const log of receipt.logs) {
              try {
                const decoded = decodeEventLog({
                  abi: [
                    parseAbiItem(
                      "event InstanceCreated(bytes32 indexed salt, address indexed instance, address indexed creator)"
                    ),
                  ],
                  data: log.data,
                  topics: log.topics,
                })

                if (decoded.eventName === "InstanceCreated") {
                  // Utiliser le salt comme marketId
                  const marketId = decoded.args.salt
                  console.log("Marché créé avec salt ID:", marketId)

                  // Rediriger vers la page du marché avec le salt
                  router.push(`/market/${marketId}`)
                  resetForm()
                  return
                }
              } catch (error) {
                // Ignorer les logs qui ne correspondent pas à notre événement
                continue
              }
            }
          }

          // Fallback: si on ne trouve pas l'événement, utiliser le hash de transaction
          console.log("Redirection avec hash de transaction:", hash)
          router.push(`/market/${hash}`)
          resetForm()
        } catch (error) {
          console.error("Erreur lors de la redirection:", error)
          alert("Marché créé avec succès!")
          resetForm()
        }
      }

      handleMarketCreated()
    }
  }, [isConfirmed, hash, publicClient, router])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
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
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Événements de prédiction *
            </label>
            {createFormData.events.map((event, index) => (
              <div key={index} className="flex space-x-2 mb-2">
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
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500"
                  placeholder={`Titre de l'événement ${index + 1}`}
                />
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
                {createFormData.events.length > 1 && (
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
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                  >
                    Supprimer
                  </button>
                )}
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
              className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              Ajouter un événement
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
            <p className="text-xs font-mono text-gray-400 break-all">{hash}</p>
          </div>
        )}
      </div>
    </div>
  )
}