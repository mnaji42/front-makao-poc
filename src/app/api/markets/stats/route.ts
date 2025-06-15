import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Récupérer les statistiques en parallèle
    const [totalMarkets, uniqueCreators, latestMarket, oldestMarket, indexerState] = await Promise.all([
      prisma.market.count(),
      prisma.market.groupBy({
        by: ['creatorAddress'],
        _count: {
          creatorAddress: true
        }
      }),
      prisma.market.findFirst({
        orderBy: { blockNumber: 'desc' },
        select: {
          blockNumber: true,
          blockTimestamp: true,
          instanceAddress: true
        }
      }),
      prisma.market.findFirst({
        orderBy: { blockNumber: 'asc' },
        select: {
          blockNumber: true,
          blockTimestamp: true,
          instanceAddress: true
        }
      }),
      prisma.indexerState.findUnique({
        where: { id: 'singleton' },
        select: {
          lastProcessedBlock: true,
          isRunning: true,
          updatedAt: true
        }
      })
    ])
    
    // Calculer les statistiques par période
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    const [marketsLast24h, marketsLastWeek, marketsLastMonth] = await Promise.all([
      prisma.market.count({
        where: {
          blockTimestamp: {
            gte: oneDayAgo
          }
        }
      }),
      prisma.market.count({
        where: {
          blockTimestamp: {
            gte: oneWeekAgo
          }
        }
      }),
      prisma.market.count({
        where: {
          blockTimestamp: {
            gte: oneMonthAgo
          }
        }
      })
    ])
    
    const stats = {
      totalMarkets,
      uniqueCreators: uniqueCreators.length,
      marketsLast24h,
      marketsLastWeek,
      marketsLastMonth,
      latestMarket: latestMarket ? {
        ...latestMarket,
        blockNumber: latestMarket.blockNumber.toString()
      } : null,
      oldestMarket: oldestMarket ? {
        ...oldestMarket,
        blockNumber: oldestMarket.blockNumber.toString()
      } : null,
      indexer: indexerState ? {
        lastProcessedBlock: indexerState.lastProcessedBlock.toString(),
        isRunning: indexerState.isRunning,
        lastUpdate: indexerState.updatedAt
      } : null
    }
    
    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Erreur API /api/markets/stats:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la récupération des statistiques',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    )
  }
}