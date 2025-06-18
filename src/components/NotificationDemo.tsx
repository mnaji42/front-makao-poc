'use client'

import React from 'react'
import { useNotify } from '../contexts/NotificationContext'
import { TransactionNotification } from './notifications/TransactionNotification'

export function NotificationDemo() {
  const notify = useNotify()

  const showSuccessNotification = () => {
    notify.success(
      'Opération réussie',
      'Votre action a été effectuée avec succès.'
    )
  }

  const showErrorNotification = () => {
    notify.error(
      'Erreur détectée',
      'Une erreur est survenue lors de l\'opération.'
    )
  }

  const showWarningNotification = () => {
    notify.warning(
      'Attention',
      'Cette action nécessite votre attention.'
    )
  }

  const showInfoNotification = () => {
    notify.info(
      'Information',
      'Voici une information importante à retenir.'
    )
  }

  const showLoadingNotification = () => {
    notify.loading(
      'Chargement en cours',
      'Veuillez patienter pendant le traitement...'
    )
  }

  const showTransactionNotification = () => {
    // Exemple avec un hash de transaction fictif
    const fakeHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    
    notify.custom({
      type: 'loading',
      title: 'Transaction blockchain',
      message: 'Suivi en temps réel de votre transaction',
      duration: 0,
      component: (
        <TransactionNotification
          hash={fakeHash}
          onSuccess={(receipt) => {
            notify.success(
              'Transaction confirmée!',
              'Votre transaction a été confirmée sur la blockchain.'
            )
          }}
          onError={(error) => {
            notify.error(
              'Transaction échouée',
              'La transaction n\'a pas pu être confirmée.'
            )
          }}
        />
      ),
    })
  }

  const showMultipleNotifications = () => {
    notify.info('Première notification', 'Ceci est la première notification')
    setTimeout(() => {
      notify.warning('Deuxième notification', 'Ceci est la deuxième notification')
    }, 500)
    setTimeout(() => {
      notify.success('Troisième notification', 'Ceci est la troisième notification')
    }, 1000)
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-4">
      <h3 className="text-xl font-semibold text-gray-100 mb-4">
        Démonstration du système de notifications
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <button
          onClick={showSuccessNotification}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          Succès
        </button>
        
        <button
          onClick={showErrorNotification}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Erreur
        </button>
        
        <button
          onClick={showWarningNotification}
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
        >
          Avertissement
        </button>
        
        <button
          onClick={showInfoNotification}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Information
        </button>
        
        <button
          onClick={showLoadingNotification}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          Chargement
        </button>
        
        <button
          onClick={showTransactionNotification}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          Transaction
        </button>
      </div>
      
      <div className="pt-4 border-t border-gray-700">
        <button
          onClick={showMultipleNotifications}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium"
        >
          Afficher plusieurs notifications
        </button>
      </div>
    </div>
  )
}