"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { apiClient } from "@/lib/api/client";
import { useNotifications } from "@/contexts/NotificationContext";

interface Diligence {
  id: number;
  nom: string;
  client: string;
  statut: string;
  created_at?: string;
  updated_at?: string;
  assigned_to?: number;
  assigned_user?: {
    id: number;
    name: string;
    email: string;
  };
}

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

export function useDiligenceNotifications() {
  const [notificationCount, setNotificationCount] = useState(0);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [isPolling, setIsPolling] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const { addNotification } = useNotifications();

  // Récupérer l'utilisateur connecté
  const fetchCurrentUser = useCallback(async () => {
    try {
      const user = await apiClient.getCurrentUser();
      if (user) {
        setCurrentUser(user);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération de l'utilisateur:", error);
    }
  }, []);

  // Fonction pour récupérer les nouvelles diligences
  const checkForNewDiligences = useCallback(async () => {
    try {
      await fetchCurrentUser(); // S'assurer qu'on a l'utilisateur à jour
      
      const diligences = await apiClient.getDiligences();
      
      if (Array.isArray(diligences)) {
        // Filtrer les diligences créées depuis la dernière vérification
        const newDiligences = diligences.filter((diligence: Diligence) => {
          if (!diligence.created_at) return false;
          const diligenceDate = new Date(diligence.created_at);
          return diligenceDate > lastChecked;
        });

        // Filtrer les diligences assignées à l'utilisateur courant
        const userDiligences = newDiligences.filter((diligence: Diligence) => {
          // Si l'utilisateur est admin, voir toutes les diligences
          if (currentUser?.role?.toLowerCase().includes('admin')) {
            return true;
          }
          // Sinon, seulement les diligences assignées à cet utilisateur
          return diligence.assigned_to === currentUser?.id;
        });

        if (userDiligences.length > 0) {
          // Mettre à jour le compteur de notifications
          setNotificationCount(prev => prev + userDiligences.length);
          
          // Ajouter des notifications pour chaque nouvelle diligence
          userDiligences.forEach((diligence: Diligence) => {
            let message = `Nouvelle diligence: ${diligence.nom}`;
            if (diligence.client) {
              message += ` - ${diligence.client}`;
            }
            
            if (currentUser?.role?.toLowerCase().includes('admin') && diligence.assigned_user) {
              message += ` (Assignée à: ${diligence.assigned_user.name})`;
            }

            addNotification(message, 'info');
          });

          // Mettre à jour la date de dernière vérification
          setLastChecked(new Date());
          
          // Déclencher un événement pour informer les composants qu'une nouvelle diligence a été détectée
          if (userDiligences.length > 0) {
            window.dispatchEvent(new CustomEvent('newDiligence', {
              detail: { count: userDiligences.length }
            }));
          }
        }
      }
    } catch (error) {
      console.error("Erreur lors de la vérification des nouvelles diligences:", error);
    }
  }, [lastChecked, currentUser, addNotification, fetchCurrentUser]);

  // Démarrer le polling
  const startPolling = useCallback(() => {
    if (isPolling) return;
    
    setIsPolling(true);
    pollingRef.current = setInterval(() => {
      checkForNewDiligences();
    }, 30000); // Vérifier toutes les 30 secondes
  }, [isPolling, checkForNewDiligences]);

  // Arrêter le polling
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // Réinitialiser le compteur
  const resetNotificationCount = useCallback(() => {
    setNotificationCount(0);
    setLastChecked(new Date());
  }, []);

  // Démarrer automatiquement le polling quand le composant est monté
  useEffect(() => {
    // Récupérer l'utilisateur d'abord
    fetchCurrentUser().then(() => {
      startPolling();
    });
    
    return () => {
      stopPolling();
    };
  }, []); // Supprimer les dépendances pour éviter les boucles infinies

  return {
    notificationCount,
    isPolling,
    startPolling,
    stopPolling,
    resetNotificationCount,
    checkForNewDiligences
  };
}