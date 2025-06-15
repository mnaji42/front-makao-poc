import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Paramètres de pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100) // Max 100
    const skip = (page - 1) * limit
    
    // Paramètres de filtrage
    const creator = searchParams.get('creator')
    const fromBlock = searchParams.get('fromBlock')
    const toBlock = searchParams.get('toBlock')
    const orderBy = searchParams.get('orderBy') || 'blockNumber'
    const orderDirection = searchParams.get('orderDirection') || 'desc'
    
    // Construire les conditions de filtrage
    const where: any = {}
    
    if (creator) {
      where.creatorAddress = creator
    }
    
    if (fromBlock || toBlock) {
      where.blockNumber = {}
      if (fromBlock) {
        where.blockNumber.gte = BigInt(fromBlock)
      }
      if (toBlock) {
        where.blockNumber.lte = BigInt(toBlock)
      }
    }
    
    // Construire l'ordre de tri
    const orderByClause: any = {}
    if (orderBy === 'blockNumber' || orderBy === 'blockTimestamp' || orderBy === 'createdAt') {
      orderByClause[orderBy] = orderDirection
    } else {
      orderByClause.blockNumber = 'desc' // Par défaut
    }
    
    // Récupérer les marchés avec pagination
    const [markets, totalCount] = await Promise.all([
      prisma.market.findMany({
        where,
        orderBy: orderByClause,
        skip,
        take: limit,
        select: {
          id: true,
          instanceAddress: true,
          creatorAddress: true,
          blockNumber: true,
          blockTimestamp: true,
          transactionHash: true,
          title: true,
          stakeToken: true,
          engagementDeadline: true,
          resolutionDeadline: true,
          creatorFee: true,
          predictionCount: true,
          createdAt: true
        }
      }),
      prisma.market.count({ where })
    ])
    
    // Convertir les BigInt en string pour la sérialisation JSON
    const serializedMarkets = markets.map(market => ({
      ...market,
      blockNumber: market.blockNumber.toString(),
      creatorFee: market.creatorFee?.toString() || null
    }))
    
    return NextResponse.json({
      success: true,
      data: {
        markets: serializedMarkets,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page * limit < totalCount,
          hasPrev: page > 1
        }
      }
    })
  } catch (error) {
    console.error('Erreur API /api/markets:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la récupération des marchés',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    )
  }
}