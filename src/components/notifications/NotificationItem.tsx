"use client"

import React, { useEffect, useState } from "react"
import {
  Notification,
  useNotifications,
} from "../../contexts/NotificationContext"

interface NotificationItemProps {
  notification: Notification
  index: number
}

const typeStyles = {
  success: {
    bg: "bg-green-900/90 border-green-700",
    icon: "✓",
    iconColor: "text-green-400",
    progressColor: "bg-green-500",
  },
  error: {
    bg: "bg-red-900/90 border-red-700",
    icon: "✕",
    iconColor: "text-red-400",
    progressColor: "bg-red-500",
  },
  warning: {
    bg: "bg-yellow-900/90 border-yellow-700",
    icon: "⚠",
    iconColor: "text-yellow-400",
    progressColor: "bg-yellow-500",
  },
  info: {
    bg: "bg-blue-900/90 border-blue-700",
    icon: "ℹ",
    iconColor: "text-blue-400",
    progressColor: "bg-blue-500",
  },
  loading: {
    bg: "bg-gray-800/90 border-gray-600",
    icon: "⟳",
    iconColor: "text-gray-400",
    progressColor: "bg-gray-500",
  },
}

export function NotificationItem({
  notification,
  index,
}: NotificationItemProps) {
  const { removeNotification } = useNotifications()
  const [isVisible, setIsVisible] = useState(false)
  const [progress, setProgress] = useState(100)

  const style = typeStyles[notification.type]

  useEffect(() => {
    // Animation d'entrée
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev - 100 / (notification.duration! / 100)
          return newProgress <= 0 ? 0 : newProgress
        })
      }, 100)

      return () => clearInterval(interval)
    }
  }, [notification.duration])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => removeNotification(notification.id), 300)
  }

  const handleClick = () => {
    if (notification.onClick) {
      notification.onClick()
    }
  }

  return (
    <div
      className={`
        transform transition-all duration-300 ease-out
        ${
          isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
        }
      `}
      style={{
        transform: `translateY(${index * -8}px)`,
        zIndex: 1000 - index,
      }}
    >
      <div
        className={`
        relative max-w-sm w-full
        ${style.bg}
        border backdrop-blur-sm
        rounded-lg shadow-lg
        p-4 mb-3
        overflow-hidden
        ${notification.onClick ? 'cursor-pointer hover:bg-opacity-80 transition-all duration-200' : ''}
      `}
        onClick={handleClick}
      >
        {/* Barre de progression */}
        {notification.duration && notification.duration > 0 && (
          <div className="absolute bottom-0 left-0 h-1 bg-gray-700 w-full">
            <div
              className={`h-full ${style.progressColor} transition-all duration-100 ease-linear`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="flex items-start space-x-3">
          {/* Icône */}
          <div
            className={`
            flex-shrink-0 w-6 h-6 rounded-full 
            flex items-center justify-center
            ${style.iconColor}
            ${notification.type === "loading" ? "animate-spin" : ""}
          `}
          >
            {style.icon}
          </div>

          {/* Contenu */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-100 mb-1">
                  {notification.title}
                </h4>
                {notification.message && (
                  <p className="text-xs text-gray-300">
                    {notification.message}
                  </p>
                )}
                {notification.component && (
                  <div className="mt-2">{notification.component}</div>
                )}
              </div>

              {/* Bouton fermer */}
              <button
                onClick={handleClose}
                className="
                  flex-shrink-0 ml-2 p-1 rounded-full
                  text-gray-400 hover:text-gray-200
                  hover:bg-gray-700/50
                  transition-colors duration-200
                "
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
