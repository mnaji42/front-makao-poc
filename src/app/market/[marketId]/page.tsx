import { notFound } from "next/navigation"
import { getMarket, Market } from "@/lib/subgraph"
import MarketDetails from "./MarketDetails"

interface MarketPageProps {
  params: {
    marketId: string
  }
}

export default async function MarketPage({ params }: MarketPageProps) {
  const { marketId } = params

  try {
    const market = await getMarket(marketId)

    if (!market) {
      notFound()
    }

    return <MarketDetails market={market} />
  } catch (error) {
    console.error("Error loading market:", error)
    notFound()
  }
}

// Génération des métadonnées pour SEO
export async function generateMetadata({ params }: MarketPageProps) {
  const { marketId } = params

  try {
    const market = await getMarket(marketId)

    if (!market) {
      return {
        title: "Marché non trouvé",
        description: "Ce marché n'existe pas ou n'est plus disponible.",
      }
    }

    return {
      title: market.metadata?.name || `Marché ${marketId.slice(0, 8)}...`,
      description:
        market.metadata?.description || "Marché de prédiction décentralisé",
      openGraph: {
        title: market.metadata?.name || `Marché ${marketId.slice(0, 8)}...`,
        description:
          market.metadata?.description || "Marché de prédiction décentralisé",
        images: market.metadata?.image ? [market.metadata.image] : [],
      },
    }
  } catch (error) {
    return {
      title: "Erreur de chargement",
      description: "Une erreur est survenue lors du chargement du marché.",
    }
  }
}
