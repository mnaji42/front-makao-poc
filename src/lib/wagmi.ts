import { createConfig, http } from "wagmi"
import { sepolia, holesky } from "wagmi/chains" // Ajout de holesky
import { metaMask } from "wagmi/connectors"
import { eventContractInstanceAbi } from "../../docs/abi/eventContractInstanceAbi.js"

export const config = createConfig({
  chains: [sepolia, holesky], // Ajout de holesky à la liste des chaînes
  connectors: [
    metaMask({
      // Utiliser les événements MetaMask au lieu du polling
      shimDisconnect: true,
    }),
  ],
  transports: {
    [sepolia.id]: http("https://ethereum-sepolia-rpc.publicnode.com", {
      // Optimisations réseau
      batch: true,
      fetchOptions: {
        timeout: 30000, // Augmenter le timeout à 30 secondes
      },
      retryCount: 3, // Ajouter des tentatives de retry
      retryDelay: 1000, // Délai entre les tentatives
    }),
    [holesky.id]: http("https://holesky.publicnode.com", {
      // Ajout du transport pour Holesky
      batch: true,
      fetchOptions: {
        timeout: 30000,
      },
      retryCount: 3,
      retryDelay: 1000,
    }),
  },
  ssr: false,
  // DÉSACTIVER le polling automatique - utiliser les événements MetaMask
  pollingInterval: 0, // 0 = désactivé complètement
  syncConnectedChain: false, // Désactiver la synchronisation automatique
})

const factoryConfig = {
  address: process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`,
  abi: eventContractInstanceAbi,
} as const
export { factoryConfig }
