"use client"

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react"

export interface Notification {
  id: string
  type: "success" | "error" | "warning" | "info" | "loading"
  title: string
  message?: string
  duration?: number // en millisecondes, 0 = permanent
  component?: ReactNode // pour des notifications complexes
  data?: any // données additionnelles pour les notifications complexes
  onClick?: () => void // fonction appelée lors du clic sur la notification
}

interface NotificationContextType {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, "id">) => string
  removeNotification: (id: string) => void
  updateNotification: (id: string, updates: Partial<Notification>) => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = useCallback(
    (notification: Omit<Notification, "id">) => {
      const id = Math.random().toString(36).substr(2, 9)
      const newNotification: Notification = {
        ...notification,
        id,
        duration:
          notification.duration ?? (notification.type === "loading" ? 0 : 5000),
      }

      setNotifications((prev) => [newNotification, ...prev])

      // Auto-remove après la durée spécifiée (sauf si duration = 0)
      if (newNotification.duration && newNotification.duration > 0) {
        setTimeout(() => {
          setNotifications((prev) =>
            prev.filter((notification) => notification.id !== id)
          )
        }, newNotification.duration)
      }

      return id
    },
    []
  )

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id)
    )
  }, [])

  const updateNotification = useCallback(
    (id: string, updates: Partial<Notification>) => {
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id
            ? { ...notification, ...updates }
            : notification
        )
      )
    },
    []
  )

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        updateNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    )
  }
  return context
}

// Hook simplifié pour les cas d'usage courants
export function useNotify() {
  const { addNotification } = useNotifications()

  return {
    success: (title: string, message?: string) =>
      addNotification({ type: "success", title, message }),

    error: (title: string, message?: string) =>
      addNotification({ type: "error", title, message }),

    warning: (title: string, message?: string) =>
      addNotification({ type: "warning", title, message }),

    info: (title: string, message?: string) =>
      addNotification({ type: "info", title, message }),

    loading: (title: string, message?: string) =>
      addNotification({ type: "loading", title, message, duration: 0 }),

    custom: (notification: Omit<Notification, "id">) =>
      addNotification(notification),
  }
}
