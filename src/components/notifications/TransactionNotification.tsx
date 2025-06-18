'use client'

import React from 'react'
import { useWaitForTransactionReceipt } from 'wagmi'

interface TransactionNotificationProps {
  hash: string
  onSuccess?: (receipt: any) => void
  onError?: (error: any) => void
  showStatus?: boolean // Pour contrôler l'affichage du statut
}

export function TransactionNotification({ 
  hash, 
  onSuccess, 
  onError,
  showStatus = true
}: TransactionNotificationProps) {
  const {
    data: receipt,
    isLoading,
    isSuccess,
    isError,
    error,
  } = useWaitForTransactionReceipt({
    hash: hash as `0x${string}`,
  })

  // Déclencher les callbacks une seule fois
  const [hasTriggeredSuccess, setHasTriggeredSuccess] = React.useState(false)
  const [hasTriggeredError, setHasTriggeredError] = React.useState(false)

  React.useEffect(() => {
    if (isSuccess && receipt && onSuccess && !hasTriggeredSuccess) {
      setHasTriggeredSuccess(true)
      onSuccess(receipt)
    }
  }, [isSuccess, receipt, onSuccess, hasTriggeredSuccess])

  React.useEffect(() => {
    if (isError && error && onError && !hasTriggeredError) {
      setHasTriggeredError(true)
      onError(error)
    }
  }, [isError, error, onError, hasTriggeredError])

  const getStatusColor = () => {
    if (isLoading) return 'text-yellow-400'
    if (isSuccess) return 'text-green-400'
    if (isError) return 'text-red-400'
    return 'text-gray-400'
  }

  const getStatusText = () => {
    if (isLoading) return 'En cours...'
    if (isSuccess) return 'Confirmée'
    if (isError) return 'Échouée'
    return 'En attente'
  }

  const getStatusIcon = () => {
    if (isLoading) return '⟳'
    if (isSuccess) return '✓'
    if (isError) return '✕'
    return '⏳'
  }

  return (
    <div className="space-y-2">
      {showStatus && (
        <div className="flex items-center space-x-2">
          <span className={`${getStatusColor()} ${isLoading ? 'animate-spin' : ''}`}>
            {getStatusIcon()}
          </span>
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>
      )}
      
      <div className="text-xs text-gray-400 space-y-1">
        <div className="flex items-center space-x-1">
          <span>Hash:</span>
          <a 
            href={`https://sepolia.etherscan.io/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline font-mono break-all"
          >
            {hash.slice(0, 10)}...{hash.slice(-8)}
          </a>
        </div>
        
        {isSuccess && receipt && (
          <div className="space-y-1">
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
        )}
        
        {isError && error && (
          <div className="text-red-400 text-xs">
            Erreur: {error.message}
          </div>
        )}
      </div>
    </div>
  )
}