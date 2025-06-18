import { MarketsList } from "@/components/MarketsList"
import { getMarketCategoriesSSR } from "@/lib/marketCategories"

export default async function MarketPage() {
  // Récupération des données côté serveur
  const marketCategories = await getMarketCategoriesSSR()

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-100 mb-4">
            Tous les marchés
          </h1>
          <p className="text-xl text-gray-400">
            Découvrez tous les marchés de prédiction disponibles
          </p>
        </div>
        
        <MarketsList initialData={marketCategories} />
      </div>
    </div>
  )
}