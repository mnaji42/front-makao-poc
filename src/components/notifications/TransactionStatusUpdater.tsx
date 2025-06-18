'use client'

import React from 'react'
import { useWaitForTransactionReceipt } from 'wagmi'
import { useNotifications } from '../../contexts/NotificationContext'

interface TransactionStatusUpdaterProps {
  hash: string
  notificationId: string
  onSuccess?: (receipt: any) => void
  onError?: (error: any) => void
  predictedMarketAddress?: string
}

export function TransactionStatusUpdater({ 
  hash, 
  notificationId,
  onSuccess, 
  onError,
  predictedMarketAddress
}: TransactionStatusUpdaterProps) {
  const { updateNotification } = useNotifications()
  const [hasUpdated, setHasUpdated] = React.useState(false)
  
  const {
    data: receipt,
    isLoading,
    isSuccess,
    isError,
    error,
  } = useWaitForTransactionReceipt({
    hash: hash as `0x${string}`,
  })

  // Mettre à jour la notification selon l'état
  React.useEffect(() => {
    if (hasUpdated) return

    if (isSuccess && receipt) {
      setHasUpdated(true)
      updateNotification(notificationId, {
        type: 'success',
        title: 'Marché créé avec succès!',
        message: 'Votre marché est maintenant disponible. Redirection dans 3 secondes...',
        duration: 3000
      })
      onSuccess?.(receipt)
    } else if (isError && error) {
      setHasUpdated(true)
      updateNotification(notificationId, {
        type: 'error',
        title: 'Échec de la création',
        message: 'La transaction a échoué. Veuillez réessayer.',
        duration: 5000
      })
      onError?.(error)
    } else if (isLoading) {
      // Optionnel: mettre à jour le message pendant le chargement
      updateNotification(notificationId, {
        message: 'Transaction en cours de confirmation...',
      })
    }
  }, [isSuccess, isError, isLoading, receipt, error, notificationId, updateNotification, onSuccess, onError, hasUpdated])

  // Ce composant ne rend rien, il ne fait que gérer les mises à jour
  return null
}