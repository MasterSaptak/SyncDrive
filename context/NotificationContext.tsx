'use client';

import React, { createContext, useContext, useState, useCallback } from "react";

let idCounter = 0;
function createNotificationId() {
  idCounter = (idCounter + 1) % 1000000;
  return `notif_${Date.now()}_${idCounter}`;
}

function createToastId() {
  idCounter = (idCounter + 1) % 1000000;
  return `toast_${Date.now()}_${idCounter}`;
}

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  type: "info" | "warning" | "success" | "alert";
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: Omit<AppNotification, "id" | "time" | "read">) => void;
  toasts: Array<{ id: string; message: string; type: "success" | "error" | "info" }>;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  dismissToast: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const USER_DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: "n_usr_1",
    title: "25 GB Free Trial Ready",
    description: "Your free high-speed cloud allocation is active.",
    time: "Just now",
    read: false,
    type: "success"
  },
  {
    id: "n_usr_2",
    title: "Storage Usage Alert",
    description: "Your storage pool is at 49% capacity.",
    time: "1h ago",
    read: false,
    type: "info"
  }
];

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(USER_DEFAULT_NOTIFICATIONS);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: "success" | "error" | "info" }>>([]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const addNotification = useCallback((n: Omit<AppNotification, "id" | "time" | "read">) => {
    const item: AppNotification = {
      ...n,
      id: createNotificationId(),
      time: "Just now",
      read: false,
    };
    setNotifications((prev) => [item, ...prev]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    const id = createToastId();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4000);
  }, [dismissToast]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        addNotification,
        toasts,
        showToast,
        dismissToast
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
}
