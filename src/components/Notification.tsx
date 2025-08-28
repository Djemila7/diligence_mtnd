"use client";

import { useState, useEffect } from "react";

interface NotificationProps {
  message: string;
  type: "success" | "error" | "info" | "warning";
  duration?: number;
  onClose: () => void;
}

export function Notification({ message, type, duration = 3000, onClose }: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade-out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getBgColor = () => {
    switch (type) {
      case "success": return "bg-green-100 border-green-400 text-green-800";
      case "error": return "bg-red-100 border-red-400 text-red-800";
      case "warning": return "bg-orange-100 border-orange-400 text-orange-800";
      case "info": return "bg-blue-100 border-blue-400 text-blue-800";
      default: return "bg-gray-100 border-gray-400 text-gray-800";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "success": return "✅";
      case "error": return "❌";
      case "warning": return "⚠️";
      case "info": return "ℹ️";
      default: return "💡";
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`
      fixed top-4 right-4 z-50 
      border rounded-lg p-4 shadow-lg 
      transition-all duration-300 ease-in-out
      ${getBgColor()}
      ${isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
    `}>
      <div className="flex items-center space-x-2">
        <span className="text-lg">{getIcon()}</span>
        <span className="font-medium">{message}</span>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="ml-4 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// Hook pour utiliser les notifications
export function useNotification() {
  const [notifications, setNotifications] = useState<Array<{
    id: number;
    message: string;
    type: "success" | "error" | "info" | "warning";
  }>>([]);

  const addNotification = (message: string, type: "success" | "error" | "info" | "warning" = "info") => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const NotificationContainer = () => (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );

  return {
    addNotification,
    removeNotification,
    NotificationContainer
  };
}