"use client"

import Link from "next/link"
import { useAccount, useConnect, useDisconnect } from "wagmi"
import { metaMask } from "wagmi/connectors"
import { useState, useEffect } from "react"

export default function Header() {
  const [isHydrated, setIsHydrated] = useState(false)
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const handleConnect = () => {
    connect({ connector: metaMask() })
  }

  return (
    <header className="flex justify-between items-center mb-12">
      <Link href="/">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-gradient-to-r from-gray-700 to-gray-600 rounded-lg flex items-center justify-center">
            <svg
              className="w-6 h-6 text-gray-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-100">
              Makao Predictions
            </h1>
            <p className="text-gray-500 text-sm">
              Live Market Predictions for Streamers
            </p>
          </div>
        </div>
      </Link>

      {!isHydrated ? (
        <div className="flex gap-3">
          <button
            disabled
            className="px-6 py-2 bg-gradient-to-r from-gray-600 to-gray-700 border border-gray-500 rounded-lg text-gray-100 font-medium opacity-50"
          >
            Chargement...
          </button>
        </div>
      ) : isConnected ? (
        <div className="flex items-center space-x-4">
          <Link href="/user">
            <button className="flex items-center space-x-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 border border-slate-500 rounded-lg text-gray-100 transition-colors">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span className="text-sm">Mon Compte</span>
            </button>
          </Link>
          <button
            onClick={() => disconnect()}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-500 rounded-lg text-gray-100 transition-colors"
          >
            Déconnecter
          </button>
        </div>
      ) : (
        <div className="flex gap-3">
          <button
            onClick={handleConnect}
            className="px-6 py-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 border border-gray-500 rounded-lg text-gray-100 font-medium transition-all duration-300 transform hover:scale-105"
          >
            Connecter MetaMask
          </button>
        </div>
      )}
    </header>
  )
}
