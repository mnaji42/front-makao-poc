import { createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { metaMask } from 'wagmi/connectors';
import { eventContractInstanceAbi } from '../../docs/abi/eventContractInstanceAbi.js';

export const config = createConfig({
  chains: [sepolia],
  connectors: [
    metaMask({
      // Utiliser les événements MetaMask au lieu du polling
      shimDisconnect: true,
    }),
  ],
  transports: {
    [sepolia.id]: http('https://ethereum-sepolia-rpc.publicnode.com', {
      // Optimisations réseau
      batch: true,
      fetchOptions: {
        timeout: 30000, // Augmenter le timeout à 30 secondes
      },
      retryCount: 3, // Ajouter des tentatives de retry
      retryDelay: 1000, // Délai entre les tentatives
    }),
  },
  ssr: false,
  // DÉSACTIVER le polling automatique - utiliser les événements MetaMask
  pollingInterval: 0, // 0 = désactivé complètement
  syncConnectedChain: false, // Désactiver la synchronisation automatique
});

const factoryConfig = {
  address: '0x5accdde8c2137B231d5cFEbc80Ccc52E9A200674',
  abi: eventContractInstanceAbi,
} as const;