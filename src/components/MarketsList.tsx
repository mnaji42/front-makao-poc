import { useState } from "react"
import { CreateMarketModal } from "./CreateMarketModal"

interface Market {}

export function MarketsList() {
  const [showCreateForm, setShowCreateForm] = useState(false)

  return (
    <>
      <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-100">Tous les Marchés</h2>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 border border-green-500 rounded-lg text-gray-100 font-medium transition-all duration-300 transform hover:scale-105"
          >
            Créer un Marché
          </button>
        </div>

        {/* MarketsList Component */}
        <div className="mt-8">LISTE DES MARCHÉ ICI // TODO LISTE MARCHE</div>
      </div>

      <CreateMarketModal
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
      />
    </>
  )
}
