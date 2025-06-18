"use client"

import React from "react"
import { useNotifications } from "../../contexts/NotificationContext"
import { NotificationItem } from "./NotificationItem"

export function NotificationContainer() {
  const { notifications } = useNotifications()

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification, index) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          index={index}
        />
      ))}
    </div>
  )
}
