# 📋 Spécifications Complètes pour le Composant de Création de Marché

## 🎯 Liste Complète des Champs du Formulaire

### 📝 Informations Générales

1. title (string) - Titre du marché (obligatoire)
2. marketDescription (string) - Description détaillée (obligatoire)
3. imageFile (File | null) - Image du marché (obligatoire)

### 💰 Configuration Token

4. tokenType ("preset" | "custom") - Type de token
5. stakeToken (address) - Token prédéfini (WETH, USDT, USDC, DAI)
6. customTokenAddress (string) - Adresse personnalisée si tokenType = "custom"

### ⏰ Dates et Délais

7. engagementDeadline (datetime-local) - Date limite d'engagement (obligatoire)
8. resolutionDeadline (datetime-local) - Date limite de résolution (obligatoire)

### ⚙️ Paramètres du Marché

9. creatorFee (number) - Frais du créateur en % (0-10%) (obligatoire)
10. predictionCount (string) - Nombre de prédictions (par défaut "2")

### 🎲 Événements de Prédiction

11. events (Array) - Liste des événements (obligatoire)
    - id (number) - Identifiant de l'événement
    - name (string) - Nom de l'événement (obligatoire)
    - description (string) - Description de l'événement (obligatoire)

## 🔧 Logique Complète de Création de Marché

### 🎯 Processus en 6 Étapes 1. Validation des Champs

````
// Vérifier que tous les champs obligatoires 
sont remplis
if (
  !createFormData.title ||
  !createFormData.marketDescription ||
  !createFormData.imageFile ||
  !createFormData.engagementDeadline ||
  !createFormData.resolutionDeadline ||
  !createFormData.creatorFee ||
  createFormData.events.some((event) => !event.
  name || !event.description)
) {
  alert("Veuillez remplir tous les champs 
  obligatoires")
  return
}
``` 2. Détermination de l'Adresse Token
````

const tokenAddress = createFormData.tokenType 
=== "preset" 
  ? createFormData.stakeToken 
  : createFormData.customTokenAddress

```3. Upload IPFS des Métadonnées

```

const ipfsHash = await uploadMarketMetadata(
  createFormData.title,
  createFormData.marketDescription,
  createFormData.imageFile,
  createFormData.events
)

```4. Génération du Salt Unique

```

// IMPORTANT: Salt basé sur titre + adresse + 
timestamp
const salt = keccak256(
  toBytes(`${createFormData.title}-${address}-$
  {Date.now()}`)
)

```5. Prédiction de l'Adresse du Marché

```

// Appel au smart contract pour prédire 
l'adresse
const predictedAddress = await publicClient.
readContract({
  address: FACTORY_ADDRESS,
  abi: eventContractInstanceAbi,
  functionName: "predictInstance",
  args: [salt],
})

setPredictedMarketAddress((predictedAddress as 
string).toLowerCase())

```6. Création du Marché sur la Blockchain

```

// Conversion des données pour le smart 
contract
const engagementDeadline = Math.floor(
  new Date(createFormData.engagementDeadline).
  getTime() / 1000
)
const resolutionDeadline = Math.floor(
  new Date(createFormData.resolutionDeadline).
  getTime() / 1000
)
const creatorFeeWei = BigInt(
  Math.floor(parseFloat(createFormData.
  creatorFee) \* 100)
)

// Arguments pour le smart contract
const args = [
  salt,                                    // 
  _salt (bytes32)
  tokenAddress as `0x${string}`,          // 
  _stakeToken (address)
  BigInt(engagementDeadline),              // 
  _engagementDeadline (uint256)
  BigInt(resolutionDeadline),              // 
  _resolutionDeadline (uint256)
  creatorFeeWei,                           // 
  _creatorFee (uint256)
  BigInt(createFormData.predictionCount),  // 
  _predictionCount (uint256)
  ipfsHash,                                // 
  _ipfsHash (string)
]

// Appel du smart contract
writeContract({
  address: FACTORY_ADDRESS,
  abi: eventContractInstanceAbi,
  functionName: "createInstance",
  args,
})

```
## 🚀 Intégration du Cache Optimiste
### 📦 Hook à Utiliser
```

import { useOptimisticMarket } from '@/hooks/
useOptimisticMarket'

const { addOptimisticMarket } = 
useOptimisticMarket()

```
### ⚡ Ajout Optimiste après Transaction
```

const handleTransactionSuccess = (receipt: 
any) => {
  // Préparer les données pour le cache 
  optimiste
  const marketData = {
    title: createFormData.title,
    description: createFormData.
    marketDescription,
    stakeToken: createFormData.tokenType === 
    "preset" 
      ? createFormData.stakeToken 
      : createFormData.customTokenAddress,
    engagementDeadline: createFormData.
    engagementDeadline,
    resolutionDeadline: createFormData.
    resolutionDeadline,
    creatorFee: createFormData.creatorFee,
    predictionCount: createFormData.
    predictionCount,
    events: createFormData.events
  }

const options = {
    predictedAddress: predictedMarketAddress,
    creator: address || "",
    ipfsHash: "" // Sera mis à jour par le 
    subgraph
  }

// Ajouter au cache optimiste
  addOptimisticMarket(marketData, options)
}

```
## 🔧 Configuration Technique Requise
### 📋 Variables d'Environnement
```

NEXT_PUBLIC_FACTORY_ADDRESS=0x... # Adresse du 
contrat factory
NEXT_PUBLIC_WETH_ADDRESS=0x...    # WETH 
Sepolia
NEXT_PUBLIC_USDT_ADDRESS=0x...    # USDT
NEXT_PUBLIC_USDC_ADDRESS=0x...    # USDC
NEXT_PUBLIC_DAI_ADDRESS=0x...     # DAI

```
### 📦 Dépendances Requises
```

// Hooks Wagmi
import {
  useAccount,
  usePublicClient,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi"

// Utilitaires Viem
import { keccak256, toBytes } from "viem"

// Hooks personnalisés
import { useOptimisticMarket } from "@/hooks/
useOptimisticMarket"
import { useNotifications } from "@/contexts/
NotificationContext"

// Fonctions utilitaires
import { uploadMarketMetadata } from "@/lib/
ipfsUploader"

// ABI du contrat
import { eventContractInstanceAbi } from "@/
docs/abi/eventContractInstanceAbi.js"

```
## 🎨 Structure du Composant à Créer
### 📁 Architecture Recommandée
```

// components/markets/MarketForm.tsx
export function MarketForm({ onClose, 
onSuccess }) {
  // 1. États du formulaire
  const [formData, setFormData] = useState
  (initialFormData)
  const [currentStep, setCurrentStep] = 
  useState(1)
  const [predictedAddress, 
  setPredictedAddress] = useState(null)

// 2. Hooks Wagmi
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { writeContract, data: hash, 
  isPending } = useWriteContract()
  const { isConfirming, isConfirmed } = 
  useWaitForTransactionReceipt({ hash })

// 3. Hook optimiste
  const { addOptimisticMarket } = 
  useOptimisticMarket()

// 4. Logique de création
  const handleCreateMarket = async () => {
    // Validation → IPFS → Salt → Prédiction → 
    Transaction
  }

// 5. Gestion du succès
  const handleTransactionSuccess = (receipt) 
  => {
    addOptimisticMarket(marketData, options)
    setCurrentStep(2)
  }

// 6. Interface utilisateur
  return (
    <form>
      {/_ Tous les champs listés ci-dessus _/}
    </form>
  )
}

```
## ⚠️ Points Critiques à Ne Pas Oublier
### 🚨 Validation Obligatoire
- ✅ Tous les champs marqués comme obligatoires
- ✅ Format des dates (datetime-local)
- ✅ Validation de l'adresse token personnalisée
- ✅ Au moins 2 événements avec nom et description
### 🔐 Sécurité
- ✅ Génération de salt unique (titre + adresse + timestamp)
- ✅ Validation côté client ET serveur
- ✅ Gestion des erreurs de transaction
### ⚡ Performance
- ✅ Upload IPFS avant transaction blockchain
- ✅ Prédiction d'adresse pour le cache optimiste
- ✅ Feedback visuel pendant les étapes
### 🎯 UX/UI
- ✅ Étapes visuelles (Création → Indexation)
- ✅ États de chargement (Signature → Confirmation)
- ✅ Notifications de progression
- ✅ Gestion des erreurs utilisateur
## 🎉 Résultat Attendu
Un composant de création de marché complet et fonctionnel qui :

✅ Collecte toutes les données nécessaires ✅ Valide les entrées utilisateur ✅ Upload les métadonnées sur IPFS ✅ Génère un salt unique pour chaque marché ✅ Prédit l'adresse du marché ✅ Crée le marché sur la blockchain ✅ Ajoute immédiatement au cache optimiste ✅ Fournit un feedback visuel complet

Le marché apparaîtra instantanément dans la liste grâce au cache optimiste ! 🚀
```
