import { useState, useEffect } from 'react'
import { usePublicClient } from 'wagmi'
import { parseAbiItem, decodeEventLog } from 'viem'
import { eventContractInstanceAbi } from '../../docs/abi/eventContractInstanceAbi.js'

const FACTORY_ADDRESS = '0x5accdde8c2137B231d5cFEbc80Ccc52E9A200674' as const

interface Market {
  id: string
  instanceAddress: string
  creatorAddress: string
  blockNumber: string
  blockTimestamp: Date
  transactionHash: string
  title?: string
  stakeToken?: string
  engagementDeadline?: Date
  resolutionDeadline?: Date
  creatorFee?: string
  predictionCount?: number
  createdAt: Date
}

interface UseMarketsReturn {
  markets: Market[]
  isLoading: boolean
  error: string | null
  totalCount: number
  refetch: () => Promise<void>
}

export function useMarkets(): UseMarketsReturn {
  const [markets, setMarkets] = useState<Market[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  
  const publicClient = usePublicClient()

  const fetchDecentralizedMarkets = async (): Promise<Market[]> => {
    if (!publicClient) {
      throw new Error('Client public non disponible')
    }

    try {
      console.log('Récupération des marchés décentralisés...')
      
      // Obtenir le numéro de bloc actuel
      const currentBlock = await publicClient.getBlockNumber()
      console.log('Bloc actuel:', currentBlock)
      
      // Limiter la recherche aux derniers 45000 blocs pour respecter la limite RPC de 50000
      const MAX_BLOCKS_TO_SEARCH = BigInt("45000")
      const startBlock = currentBlock > MAX_BLOCKS_TO_SEARCH ? currentBlock - MAX_BLOCKS_TO_SEARCH : BigInt("0")
      
      console.log(`Recherche des événements du bloc ${startBlock} au bloc ${currentBlock}`)
      
      // Récupérer les événements InstanceCreated avec une plage de blocs limitée
      const logs = await publicClient.getLogs({
        address: FACTORY_ADDRESS,
        event: parseAbiItem('event InstanceCreated(bytes32 indexed salt, address indexed instance, address indexed creator)'),
        fromBlock: startBlock,
        toBlock: currentBlock
      })
      
      console.log(`${logs.length} événements InstanceCreated trouvés`)
      
      const marketsPromises = logs.map(async (log) => {
        try {
          const decodedLog = decodeEventLog({
            abi: [parseAbiItem('event InstanceCreated(bytes32 indexed salt, address indexed instance, address indexed creator)')],
            data: log.data,
            topics: log.topics
          })
          
          const block = await publicClient.getBlock({ blockNumber: log.blockNumber })
          
          const market: Market = {
            id: log.transactionHash || '',
            instanceAddress: decodedLog.args.instance,
            creatorAddress: decodedLog.args.creator,
            blockNumber: log.blockNumber.toString(),
            blockTimestamp: new Date(Number(block.timestamp) * 1000),
            transactionHash: log.transactionHash || '',
            createdAt: new Date(Number(block.timestamp) * 1000)
          }
          
          // Essayer de récupérer les détails du marché
          try {
            const [stakeToken, engagementDeadline, resolutionDeadline, creatorFee, predictionCount] = await Promise.all([
              publicClient.readContract({
                address: market.instanceAddress as `0x${string}`,
                abi: eventContractInstanceAbi,
                functionName: 'stakeToken'
              }),
              publicClient.readContract({
                address: market.instanceAddress as `0x${string}`,
                abi: eventContractInstanceAbi,
                functionName: 'engagementDeadline'
              }),
              publicClient.readContract({
                address: market.instanceAddress as `0x${string}`,
                abi: eventContractInstanceAbi,
                functionName: 'resolutionDeadline'
              }),
              publicClient.readContract({
                address: market.instanceAddress as `0x${string}`,
                abi: eventContractInstanceAbi,
                functionName: 'creatorFee'
              }),
              publicClient.readContract({
                address: market.instanceAddress as `0x${string}`,
                abi: eventContractInstanceAbi,
                functionName: 'predictionCount'
              })
            ])
            
            market.stakeToken = stakeToken as string
            market.engagementDeadline = new Date(Number(engagementDeadline) * 1000)
            market.resolutionDeadline = new Date(Number(resolutionDeadline) * 1000)
            market.creatorFee = (creatorFee as bigint).toString()
            market.predictionCount = Number(predictionCount)
            
          } catch (detailError) {
            console.warn(`Impossible de récupérer les détails pour le marché ${market.instanceAddress}:`, detailError)
          }
          
          return market
        } catch (error) {
          console.error('Erreur lors du décodage du log:', error)
          return null
        }
      })
      
      const marketsResults = await Promise.all(marketsPromises)
      const validMarkets = marketsResults.filter((market): market is Market => market !== null)
      
      // Trier par timestamp décroissant (plus récent en premier)
      validMarkets.sort((a, b) => b.blockTimestamp.getTime() - a.blockTimestamp.getTime())
      
      console.log(`${validMarkets.length} marchés valides récupérés`)
      return validMarkets
      
    } catch (error) {
      console.error('Erreur lors de la récupération des marchés décentralisés:', error)
      throw error
    }
  }

  const fetchMarkets = async () => {
    if (!publicClient) {
      console.log('Client public non disponible')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const fetchedMarkets = await fetchDecentralizedMarkets()
      setMarkets(fetchedMarkets)
      setTotalCount(fetchedMarkets.length)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue'
      console.error('Erreur lors de la récupération des marchés:', errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const refetch = async () => {
    await fetchMarkets()
  }

  useEffect(() => {
    fetchMarkets()
  }, [publicClient])

  return {
    markets,
    isLoading,
    error,
    totalCount,
    refetch
  }
}