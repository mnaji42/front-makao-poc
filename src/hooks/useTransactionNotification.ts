"use client"

import { useEffect } from "react"
import { useNotify } from "../contexts/NotificationContext"
import { TransactionNotification } from "../components/notifications/TransactionNotification"

interface UseTransactionNotificationProps {
  hash?: string
  title?: string
  successTitle?: string
  successMessage?: string
  errorTitle?: string
  errorMessage?: string
  onSuccess?: (receipt: any) => void
  onError?: (error: any) => void
}

export function useTransactionNotification({
  hash,
  title = "Transaction en cours",
  successTitle = "Transaction confirmée",
  successMessage = "Votre transaction a été confirmée avec succès.",
  errorTitle = "Transaction échouée",
  errorMessage = "Votre transaction a échoué. Veuillez réessayer.",
  onSuccess,
  onError,
}: UseTransactionNotificationProps) {
  const notify = useNotify()

  useEffect(() => {
    if (!hash) return

    const notificationId = notify.custom({
      type: "loading",
      title,
      message: "Confirmation en cours...",
      duration: 0,
      component: (
        <TransactionNotification
          hash={hash}
          onSuccess={(receipt) => {
            notify.success(successTitle, successMessage)
            onSuccess?.(receipt)
          }}
          onError={(error) => {
            notify.error(errorTitle, errorMessage)
            onError?.(error)
          }}
        />
      ),
    })

    return () => {
      // Optionnel: nettoyer la notification si le composant se démonte
    }
  }, [
    hash,
    title,
    successTitle,
    successMessage,
    errorTitle,
    errorMessage,
    onSuccess,
    onError,
    notify,
  ])
}
