'use client'

import React from 'react'
import { useWaitForTransactionReceipt, useWatchContractEvent, usePublicClient } from 'wagmi'
import { useNotifications } from '../../contexts/NotificationContext'
import factoryAbi from '../../../docs/factory-contract-abi.json'

const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`

interface TransactionStatusUpdaterProps {
  hash: string
  notificationId: string
  onSuccess?: (receipt: any) => void
  onError?: (error: any) => void
  predictedMarketAddress?: string
}

type MarketCreationStage = 'factory_transaction' | 'market_deployment' | 'subgraph_indexing' | 'completed' | 'error'

export function TransactionStatusUpdater({ 
  hash, 
  notificationId,
  onSuccess, 
  onError,
  predictedMarketAddress
}: TransactionStatusUpdaterProps) {
  const { updateNotification } = useNotifications()
  const publicClient = usePublicClient()
  const [currentStage, setCurrentStage] = React.useState<MarketCreationStage>('factory_transaction')
  const [marketDeployed, setMarketDeployed] = React.useState(false)
  const [subgraphIndexed, setSubgraphIndexed] = React.useState(false)
  const [hasProcessedFactoryTx, setHasProcessedFactoryTx] = React.useState(false)
  
  const {
    data: receipt,
    isLoading: isFactoryTxLoading,
    isSuccess: isFactoryTxSuccess,
    isError: isFactoryTxError,
    error: factoryTxError,
  } = useWaitForTransactionReceipt({
    hash: hash as `0x${string}`,
  })

  // Étape 1: Surveiller la transaction factory (une seule fois)
  React.useEffect(() => {
    if (currentStage !== 'factory_transaction' || hasProcessedFactoryTx) return

    if (isFactoryTxLoading) {
      updateNotification(notificationId, {
        message: '🔄 Étape 1/3: Confirmation de la transaction factory...',
      })
    } else if (isFactoryTxSuccess && receipt) {
      console.log('✅ Transaction factory confirmée:', receipt)
      setHasProcessedFactoryTx(true)
      setCurrentStage('market_deployment')
      updateNotification(notificationId, {
        message: '🔄 Étape 2/3: Déploiement du contrat marché en cours...',
      })
    } else if (isFactoryTxError && factoryTxError) {
      setHasProcessedFactoryTx(true)
      setCurrentStage('error')
      updateNotification(notificationId, {
        type: 'error',
        title: 'Échec de la transaction factory',
        message: 'La transaction factory a échoué. Veuillez réessayer.',
        duration: 5000
      })
      onError?.(factoryTxError)
    }
  }, [isFactoryTxLoading, isFactoryTxSuccess, isFactoryTxError, receipt, factoryTxError, currentStage, hasProcessedFactoryTx, notificationId, updateNotification, onError])

  // Étape 2: Surveiller l'événement MarketCreated du factory (seulement si nécessaire)
  useWatchContractEvent({
    address: FACTORY_ADDRESS,
    abi: factoryAbi,
    eventName: 'MarketCreated',
    enabled: currentStage === 'market_deployment' && !marketDeployed, // Optimisation: seulement quand nécessaire
    onLogs(logs) {
      if (currentStage !== 'market_deployment' || marketDeployed) return
      
      // Vérifier si l'événement correspond à notre marché prédit
      const relevantLog = logs.find(log => {
        const marketAddress = log.args?.marketAddress as string
        return marketAddress?.toLowerCase() === predictedMarketAddress?.toLowerCase()
      })
      
      if (relevantLog) {
        console.log('✅ Contrat marché déployé:', relevantLog.args?.marketAddress)
        setMarketDeployed(true)
        setCurrentStage('subgraph_indexing')
        updateNotification(notificationId, {
          message: '🔄 Étape 3/3: Indexation du subgraph en cours...',
        })
      }
    },
  })

  // Étape 3: Polling du subgraph pour vérifier l'indexation (réduit à toutes les 5 secondes)
  React.useEffect(() => {
    if (currentStage !== 'subgraph_indexing' || !predictedMarketAddress) return

    let pollInterval: NodeJS.Timeout
    let pollCount = 0
    const maxPolls = 12 // 12 tentatives = 60 secondes maximum (toutes les 5 secondes)

    const pollSubgraph = async () => {
      try {
        const subgraphUrl = process.env.NEXT_PUBLIC_SUBGRAPH_URL || 'http://localhost:8000/subgraphs/name/makao'
        
        const query = `
          query GetMarket($id: String!) {
            market(id: $id) {
              id
              instanceAddress
            }
          }
        `
        
        const response = await fetch(subgraphUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            variables: { id: predictedMarketAddress.toLowerCase() }
          })
        })
        
        const data = await response.json()
        
        if (data.data?.market) {
          console.log('✅ Marché indexé dans le subgraph:', data.data.market)
          setSubgraphIndexed(true)
          setCurrentStage('completed')
          clearInterval(pollInterval)
          
          updateNotification(notificationId, {
            type: 'success',
            title: 'Marché créé avec succès!',
            message: '✅ Toutes les étapes terminées. Redirection dans 3 secondes...',
            duration: 3000
          })
          
          onSuccess?.(receipt)
        } else {
          pollCount++
          console.log(`🔍 Tentative ${pollCount}/${maxPolls} - Marché non encore indexé`)
          
          if (pollCount >= maxPolls) {
            console.warn('⚠️ Timeout: Le marché n\'a pas été indexé dans les temps')
            clearInterval(pollInterval)
            setCurrentStage('completed')
            
            updateNotification(notificationId, {
              type: 'warning',
              title: 'Marché créé (indexation en cours)',
              message: '⚠️ Le marché est créé mais l\'indexation prend plus de temps que prévu. Redirection dans 3 secondes...',
              duration: 3000
            })
            
            onSuccess?.(receipt)
          }
        }
      } catch (error) {
        console.error('Erreur lors du polling du subgraph:', error)
        pollCount++
        if (pollCount >= maxPolls) {
          clearInterval(pollInterval)
          setCurrentStage('completed')
          
          updateNotification(notificationId, {
            type: 'warning',
            title: 'Marché créé (vérification impossible)',
            message: '⚠️ Le marché est créé mais nous ne pouvons pas vérifier l\'indexation. Redirection dans 3 secondes...',
            duration: 3000
          })
          
          onSuccess?.(receipt)
        }
      }
    }

    // Attendre 5 secondes avant la première vérification pour laisser le temps au subgraph
    const initialDelay = setTimeout(() => {
      pollSubgraph() // Première vérification immédiate
      pollInterval = setInterval(pollSubgraph, 5000) // Puis toutes les 5 secondes
    }, 5000)

    return () => {
      clearTimeout(initialDelay)
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [currentStage, predictedMarketAddress, notificationId, updateNotification, onSuccess, receipt])

  // Ce composant ne rend rien, il ne fait que gérer les mises à jour
  return null
}