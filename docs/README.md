# Documentation du Projet

Ce dossier contient toute la documentation technique relative aux contrats intelligents et à leur intégration dans l'application décentralisée.

## Structure des Fichiers

### 📄 `factory-contract-compiled.txt`
**Bytecode original du contrat factory**
- Contient le bytecode hexadécimal complet du contrat déployé
- Source de vérité pour l'analyse et la décompilation
- Utilisé pour extraire les signatures de fonctions et la logique

### 📋 `factory-contract-abi.json`
**Interface ABI du contrat factory**
- Format JSON standard pour l'interaction avec le contrat
- Contient les signatures des fonctions, événements et types
- **Usage**: À importer directement dans Wagmi pour l'intégration

```typescript
import factoryAbi from './docs/factory-contract-abi.json';
```

### 🔧 `factory-contract-decompiled.sol`
**Code Solidity reconstruit**
- Version lisible du contrat décompilé à partir du bytecode
- Commentaires explicatifs sur la logique métier
- **Attention**: Code reconstruit, peut différer de l'original

### 📊 `factory-contract-analysis.md`
**Analyse technique complète**
- Explication détaillée du fonctionnement du contrat
- Documentation des patterns utilisés (ERC-1167)
- Guide d'intégration avec Wagmi
- Considérations de sécurité

## Informations Clés

### Adresses Importantes
- **Factory Contract**: `0x5accdde8c2137B231d5cFEbc80Ccc52E9A200674`
- **Implementation**: `0x99ed2e56eb69df6fdc89b535c06b769a847ddcdd`
- **Secondary Address**: `0xa0a01effc78ba56c26b95e5e731b8cde023b39bc`

### Réseau
- **Testnet**: Sepolia
- **Production**: Polygon (à configurer)

## Utilisation pour le Développement

### 1. Intégration Wagmi
```typescript
// Configuration du contrat
const factoryConfig = {
  address: '0x5accdde8c2137B231d5cFEbc80Ccc52E9A200674',
  abi: factoryAbi,
} as const;

// Lecture des données
const { data: implementation } = useReadContract({
  ...factoryConfig,
  functionName: 'IMPLEMENTATION',
});

// Création d'un marché
const { writeContract } = useWriteContract();
const createMarket = () => {
  writeContract({
    ...factoryConfig,
    functionName: 'createMarket',
    args: [param1, param2, param3, param4, param5, param6],
  });
};

// Écoute des événements
const { data: logs } = useWatchContractEvent({
  ...factoryConfig,
  eventName: 'MarketCreated',
  onLogs: (logs) => console.log('Nouveau marché:', logs),
});
```

### 2. Récupération des Marchés
Pour afficher tous les marchés existants, plusieurs approches sont possibles :

#### Option A: Écoute des événements historiques
```typescript
const { data: marketEvents } = useContractEvent({
  ...factoryConfig,
  eventName: 'MarketCreated',
  fromBlock: BigInt("0"), // Depuis le début
});
```

#### Option B: Utilisation d'un indexeur
- The Graph Protocol
- Moralis
- Alchemy NFT API

#### Option C: Cache local
- Stockage des adresses dans localStorage
- Synchronisation avec les événements

### 3. Prochaines Étapes
1. **Configuration Wagmi**: Intégrer l'ABI dans la configuration
2. **Hook personnalisé**: Créer `useMarkets()` pour récupérer la liste
3. **Interface utilisateur**: Composants pour afficher les marchés
4. **Gestion d'état**: TanStack Query pour le cache et la synchronisation

## Patterns Utilisés

### ERC-1167 (Minimal Proxy)
- **Avantage**: Déploiement économique en gas
- **Fonctionnement**: Proxy vers une implémentation commune
- **CREATE2**: Adresses prédictibles pour les marchés

### Factory Pattern
- **Centralisation**: Un point d'entrée pour créer tous les marchés
- **Standardisation**: Tous les marchés suivent la même structure
- **Traçabilité**: Événements pour suivre les créations

## Sécurité

### Points Vérifiés ✅
- Utilisation de patterns standards (ERC-1167)
- Vérification de succès lors de l'initialisation
- Émission d'événements pour la traçabilité

### Points d'Attention ⚠️
- Paramètres de création non typés sémantiquement
- Dépendance aux adresses hardcodées
- Pas de vérification d'autorisation visible

## Maintenance

Ce dossier doit être mis à jour lors de :
- Déploiement de nouvelles versions des contrats
- Changement de réseau (Sepolia → Polygon)
- Découverte de nouvelles fonctionnalités
- Mise à jour des patterns d'intégration

---

**Note**: Cette documentation est basée sur l'analyse du bytecode. Pour une documentation complète, il serait idéal d'avoir accès au code source original des contrats.