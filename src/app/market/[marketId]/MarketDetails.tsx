'use client';

import { useState } from 'react';
import { Market } from '@/lib/subgraph';
import Image from 'next/image';

interface MarketDetailsProps {
  market: Market;
}

export default function MarketDetails({ market }: MarketDetailsProps) {
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState('');

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: string) => {
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(parseInt(timestamp) * 1000));
  };

  const formatAmount = (amount: string) => {
    const eth = parseFloat(amount) / 1e18;
    return eth.toFixed(4);
  };

  const handleBet = (eventId: string) => {
    console.log(`Essayer de parier sur l'événement: ${eventId}`);
  };

  const isMarketActive = () => {
    const now = Date.now() / 1000;
    const engagementDeadline = parseInt(market.engagementDeadline);
    return !market.isCancelled && !market.isResolved && now < engagementDeadline;
  };

  const getMarketStatus = () => {
    if (market.isCancelled) return { text: 'Annulé', color: 'bg-red-900 text-red-200 border border-red-700' };
    if (market.isResolved) return { text: 'Résolu', color: 'bg-green-900 text-green-200 border border-green-700' };
    
    const now = Date.now() / 1000;
    const engagementDeadline = parseInt(market.engagementDeadline);
    const resolutionDeadline = parseInt(market.resolutionDeadline);
    
    if (now > resolutionDeadline) return { text: 'Expiré', color: 'bg-gray-700 text-gray-200 border border-gray-600' };
    if (now > engagementDeadline) return { text: 'En attente de résolution', color: 'bg-yellow-900 text-yellow-200 border border-yellow-700' };
    return { text: 'Actif', color: 'bg-blue-900 text-blue-200 border border-blue-700' };
  };

  const getImageUrl = (imageUrl: string) => {
    if (imageUrl.startsWith('ipfs://')) {
      const hash = imageUrl.replace('ipfs://', '');
      return `${process.env.NEXT_PUBLIC_FILEBASE_URL}/${hash}`;
    }
    return imageUrl;
  };

  const status = getMarketStatus();

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <h1 className="text-3xl font-bold text-gray-100">
                  {market.metadata?.name || `Marché ${market.id.slice(0, 8)}...`}
                </h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                  {status.text}
                </span>
              </div>
              
              {market.metadata?.description && (
                <p className="text-gray-300 text-lg mb-4">
                  {market.metadata.description}
                </p>
              )}
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Créateur:</span>
                  <p className="font-mono text-gray-100">{formatAddress(market.creator)}</p>
                </div>
                <div>
                  <span className="text-gray-400">Volume total:</span>
                  <p className="font-semibold text-gray-100">{formatAmount(market.totalAmount)} ETH</p>
                </div>
                <div>
                  <span className="text-gray-400">Frais créateur:</span>
                  <p className="text-gray-100">{parseInt(market.creatorFee) / 100}%</p>
                </div>
                <div>
                  <span className="text-gray-400">Participants:</span>
                  <p className="text-gray-100">{market.engagements.length}</p>
                </div>
              </div>
            </div>
            
            {market.metadata?.image && (
              <div className="ml-6 flex-shrink-0">
                <div className="w-32 h-32 relative rounded-lg overflow-hidden">
                  <Image
                    src={getImageUrl(market.metadata.image)}
                    alt={market.metadata.name || 'Market image'}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Events Section */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">Événements à prédire</h2>
              
              {market.metadata?.events && market.metadata.events.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {market.metadata.events.map((event) => (
                    <div
                      key={event.id}
                      className="border border-gray-600 rounded-lg p-4 hover:border-blue-500 transition-colors bg-gray-700"
                    >
                      <div className="flex flex-col h-full">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-100 mb-2">{event.name}</h3>
                          <p className="text-gray-300 text-sm mb-3">{event.description}</p>
                        </div>
                        
                        {isMarketActive() && (
                          <div className="flex flex-col gap-2 mt-auto">
                            <input
                              type="number"
                              placeholder="Montant (ETH)"
                              value={selectedEvent === event.eventId ? betAmount : ''}
                              onChange={(e) => {
                                setSelectedEvent(event.eventId);
                                setBetAmount(e.target.value);
                              }}
                              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500 text-sm"
                              step="0.01"
                              min="0"
                            />
                            <button
                              onClick={() => handleBet(event.eventId)}
                              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                              Parier
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">Aucun événement disponible</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Market Info */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-100 mb-4">Informations du marché</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">ID du marché:</span>
                  <span className="font-mono text-gray-100">{formatAddress(market.id)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-400">Contrat:</span>
                  <span className="font-mono text-gray-100">{formatAddress(market.contractAddress)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-400">Token de mise:</span>
                  <span className="font-mono text-gray-100">{formatAddress(market.stakeToken)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-400">Créé le:</span>
                  <span className="text-gray-100">{formatDate(market.createdAt)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-400">Fin des paris:</span>
                  <span className="text-gray-100">{formatDate(market.engagementDeadline)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-400">Résolution:</span>
                  <span className="text-gray-100">{formatDate(market.resolutionDeadline)}</span>
                </div>
              </div>
            </div>

            {/* Recent Engagements */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-100 mb-4">Paris récents</h3>
              
              {market.engagements.length > 0 ? (
                <div className="space-y-3">
                  {market.engagements
                    .sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp))
                    .slice(0, 5)
                    .map((engagement) => (
                      <div key={engagement.id} className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-mono text-gray-100">{formatAddress(engagement.user)}</p>
                          <p className="text-gray-400 text-xs">
                            {formatDate(engagement.timestamp)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-100">
                            {formatAmount(engagement.amount)} ETH
                          </p>
                        </div>
                      </div>
                    ))}
                  
                  {market.engagements.length > 5 && (
                    <p className="text-center text-gray-400 text-xs pt-2">
                      +{market.engagements.length - 5} autres paris
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4">Aucun pari pour le moment</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}