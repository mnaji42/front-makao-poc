"use client"

import React from "react"
import {
  useWaitForTransactionReceipt,
  useWatchContractEvent,
  usePublicClient,
} from "wagmi"
import { useNotifications } from "../../contexts/NotificationContext"
import factoryAbi from "../../../docs/factory-contract-abi.json"

const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`

interface TransactionStatusUpdaterProps {
  hash: string
  notificationId: string
  onSuccess?: (receipt: any) => void
  onError?: (error: any) => void
  predictedMarketAddress?: string
}

type MarketCreationStage =
  | "market_deployment"
  | "subgraph_indexing"
  | "completed"
  | "error"

export function TransactionStatusUpdater({
  hash,
  notificationId,
  onSuccess,
  onError,
  predictedMarketAddress,
}: TransactionStatusUpdaterProps) {
  const { updateNotification } = useNotifications()
  const publicClient = usePublicClient()
  const [currentStage, setCurrentStage] =
    React.useState<MarketCreationStage>("market_deployment")
  const [marketDeployed, setMarketDeployed] = React.useState(false)
  const [subgraphIndexed, setSubgraphIndexed] = React.useState(false)
  const [hasProcessedFactoryTx, setHasProcessedFactoryTx] =
    React.useState(false)

  const {
    data: receipt,
    isLoading: isFactoryTxLoading,
    isSuccess: isFactoryTxSuccess,
    isError: isFactoryTxError,
    error: factoryTxError,
  } = useWaitForTransactionReceipt({
    hash: hash as `0x${string}`,
  })

  // Étape 1: Surveiller la transaction factory et le déploiement du marché
  React.useEffect(() => {
    if (hasProcessedFactoryTx) return

    if (isFactoryTxLoading) {
      updateNotification(notificationId, {
        message: "🔄 Étape 1/2: Déploiement du contrat marché...",
      })
    } else if (isFactoryTxSuccess && receipt) {
      console.log("✅ Marché déployé avec succès:", receipt)
      console.log("🔄 Passage à l'étape 2 - subgraph_indexing")
      console.log("🔍 Adresse factory:", FACTORY_ADDRESS)
      console.log("🔍 Adresse prédite:", predictedMarketAddress)
      setHasProcessedFactoryTx(true)
      setMarketDeployed(true)
      setCurrentStage("subgraph_indexing")
      updateNotification(notificationId, {
        type: "success",
        title: "Marché déployé avec succès!",
        message:
          "🎉 Votre marché a été déployé avec succès sur la blockchain. Il sera disponible dans votre compte très bientôt.",
        duration: 8000,
        component: (
          <div className="mt-2 space-y-2">
            {/* Lien vers le marché */}
            <div>
              <a
                href={`/market/${predictedMarketAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors duration-200"
              >
                🔗 Voir le marché
              </a>
            </div>
            
            {/* Informations de transaction */}
            <div className="text-xs text-gray-400 space-y-1">
              <div className="flex items-center space-x-1">
                <span>Hash:</span>
                <a
                  href={`https://sepolia.etherscan.io/tx/${receipt.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline font-mono break-all"
                >
                  {receipt.transactionHash.slice(0, 10)}...{receipt.transactionHash.slice(-8)}
                </a>
              </div>
              <div className="flex items-center space-x-1">
                <span>Bloc:</span>
                <span className="text-green-400 font-mono">
                  {receipt.blockNumber?.toString()}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <span>Gas utilisé:</span>
                <span className="text-green-400 font-mono">
                  {receipt.gasUsed?.toString()}
                </span>
              </div>
            </div>
          </div>
        ),
      })
      setCurrentStage("completed")
      onSuccess?.(receipt)
      return
    } else if (isFactoryTxError && factoryTxError) {
      setHasProcessedFactoryTx(true)
      setCurrentStage("error")
      updateNotification(notificationId, {
        type: "error",
        title: "Échec du déploiement",
        message: "Le déploiement du marché a échoué. Veuillez réessayer.",
        duration: 5000,
      })
      onError?.(factoryTxError)
    }
  }, [
    isFactoryTxLoading,
    isFactoryTxSuccess,
    isFactoryTxError,
    receipt,
    factoryTxError,
    hasProcessedFactoryTx,
    notificationId,
  ])

  // Note: L'événement CreateInstance est déjà capturé par useWaitForTransactionReceipt
  // Pas besoin d'un useWatchContractEvent séparé

  // Plus besoin d'étape 2 - tout se termine à l'étape 1

  // Ce composant ne rend rien, il ne fait que gérer les mises à jour
  return null
}