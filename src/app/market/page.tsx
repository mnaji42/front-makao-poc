import { MarketsList } from "@/components/MarketsList"
import { getMarketCategoriesSSR } from "@/lib/marketCategories"

export default async function MarketPage() {
  // Récupération des données côté serveur
  const marketCategories = await getMarketCategoriesSSR()

  return <MarketsList initialData={marketCategories} />
}
