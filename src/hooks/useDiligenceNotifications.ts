"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { apiClient } from "@/lib/api/client";
import { useNotifications } from "@/contexts/NotificationContext";

interface Diligence {
  id: number;
  titre: string;
  directiondestinataire: string;
  datedebut: string;
  datefin: string;
  description: string;
  priorite: string;
  statut: string;
  destinataire: string | string[] | null;
  destinataire_details?: {
    id: string;
    name: string;
    email: string;
  }[];
  piecesjointes: string[];
  progression: number;
  created_at?: string;
  updated_at?: string;
  assigned_to?: number;
  created_by?: number;
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
        // Filtrer les diligences créées ou mises à jour depuis la dernière vérification
        const newDiligences = diligences.filter((diligence: Diligence) => {
          if (!diligence.updated_at) return false;
          const diligenceDate = new Date(diligence.updated_at);
          return diligenceDate > lastChecked;
        });
  
        console.log('🔍 Vérification des nouvelles diligences:', {
          totalDiligences: diligences.length,
          nouvellesDiligences: newDiligences.length,
          currentUserId: currentUser?.id,
          currentUserRole: currentUser?.role
        });
  
        // Filtrer les diligences assignées à l'utilisateur courant
        const userDiligences = newDiligences.filter((diligence: Diligence) => {
          // Si l'utilisateur est admin, voir toutes les diligences
          if (currentUser?.role?.toLowerCase().includes('admin')) {
            console.log('👑 Admin: voir toutes les diligences');
            return true;
          }
          
          // Vérifier si l'utilisateur est dans les destinataires
          let isDestinataire = false;
          
          if (diligence.destinataire) {
            try {
              let destinataireIds: string[] = [];
              
              // Parser les destinataires (peut être string JSON, array, ou string simple)
              if (typeof diligence.destinataire === 'string') {
                try {
                  const parsed = JSON.parse(diligence.destinataire);
                  destinataireIds = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
                } catch {
                  // Si ce n'est pas du JSON valide, traiter comme un ID simple
                  destinataireIds = [diligence.destinataire];
                }
              } else if (Array.isArray(diligence.destinataire)) {
                destinataireIds = diligence.destinataire.map(String);
              }
              
              console.log('📋 Destinataires de la diligence:', {
                diligenceId: diligence.id,
                diligenceTitre: diligence.titre,
                destinataireRaw: diligence.destinataire,
                destinataireIds,
                currentUserId: String(currentUser?.id)
              });
              
              // Vérifier si l'utilisateur courant est dans la liste des destinataires
              isDestinataire = destinataireIds.some(id =>
                String(id) === String(currentUser?.id)
              );
              
              console.log('✅ Utilisateur est destinataire:', isDestinataire);
              
            } catch (error) {
              console.error('❌ Erreur lors du parsing des destinataires:', error);
            }
          }
          
          // Vérifier aussi l'ancien système assigned_to pour compatibilité
          const isAssignedTo = diligence.assigned_to === currentUser?.id;
          console.log('📌 Ancien système assigned_to:', isAssignedTo);
          
          const result = isDestinataire || isAssignedTo;
          console.log('🎯 Résultat final - Diligence pour utilisateur:', result);
          
          return result;
        });

        if (userDiligences.length > 0) {
          // Mettre à jour le compteur de notifications
          setNotificationCount(prev => prev + userDiligences.length);
          
          // Ajouter des notifications pour chaque nouvelle diligence
          userDiligences.forEach((diligence: Diligence) => {
            let message = '';
            let notificationType: 'info' | 'warning' = 'info';
            
            if (diligence.statut === 'À valider') {
              message = `✅ Diligence à valider: "${diligence.titre}"`;
              notificationType = 'warning'; // Plus visible pour les validations
            } else {
              message = `📋 Nouvelle diligence: "${diligence.titre}"`;
              if (diligence.directiondestinataire) {
                message += ` - ${diligence.directiondestinataire}`;
              }
            }
  
            addNotification(message, notificationType);
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

  // Vérifier les notifications stockées dans localStorage au chargement
  useEffect(() => {
    if (currentUser) {
      try {
        const storedAssignments = localStorage.getItem('recentDiligenceAssignments');
        if (storedAssignments) {
          interface Assignment {
            diligenceTitle: string;
            userId: string;
            userName: string;
            timestamp: number;
          }
          
          const assignments: Assignment[] = JSON.parse(storedAssignments);
          const userAssignments = assignments.filter(assignment =>
            String(assignment.userId) === String(currentUser.id)
          );
          
          if (userAssignments.length > 0) {
            console.log('📦 Notifications stockées trouvées pour l\'utilisateur:', userAssignments.length, 'diligences');
            setNotificationCount(prev => prev + userAssignments.length);
            
            userAssignments.forEach(assignment => {
              const message = `📋 Nouvelle diligence assignée: "${assignment.diligenceTitle}"`;
              addNotification(message, 'info');
            });
            
            // Nettoyer les notifications traitées
            const remainingAssignments = assignments.filter(assignment =>
              String(assignment.userId) !== String(currentUser.id)
            );
            localStorage.setItem('recentDiligenceAssignments', JSON.stringify(remainingAssignments));
          }
        }
      } catch (error) {
        console.error('❌ Erreur lors de la récupération des notifications stockées:', error);
      }
    }
  }, [currentUser, addNotification]);

  // Écouter les événements d'attribution de diligences
  useEffect(() => {
    const handleDiligenceAssigned = (event: Event) => {
      try {
        const customEvent = event as CustomEvent;
        const { diligenceTitle, userId, userName } = customEvent.detail;
        
        console.log('🔔 Événement diligenceAssigned reçu:', {
          diligenceTitle,
          userId,
          userName,
          currentUserId: currentUser?.id,
          currentUserRole: currentUser?.role,
          userIdType: typeof userId,
          currentUserIdType: typeof currentUser?.id
        });
        
        // Vérifier si la diligence est assignée à l'utilisateur courant
        // Conversion en string pour éviter les problèmes de type (number vs string)
        const currentUserIdStr = currentUser?.id?.toString();
        const eventUserIdStr = userId?.toString();
        
        if (currentUserIdStr && eventUserIdStr && currentUserIdStr === eventUserIdStr) {
          console.log('✅ Diligence assignée à l\'utilisateur courant, mise à jour du compteur');
          
          // Mettre à jour le compteur de notifications
          setNotificationCount(prev => prev + 1);
          
          // Ajouter une notification
          const message = `📋 Nouvelle diligence assignée: "${diligenceTitle}"`;
          addNotification(message, 'info');
          
          // Stocker également dans localStorage pour récupération ultérieure
          try {
            const storedAssignments = localStorage.getItem('recentDiligenceAssignments');
            const assignments = storedAssignments ? JSON.parse(storedAssignments) : [];
            
            assignments.push({
              diligenceTitle,
              userId: String(userId),
              userName,
              timestamp: Date.now()
            });
            
            localStorage.setItem('recentDiligenceAssignments', JSON.stringify(assignments));
          } catch (storageError) {
            console.error('Erreur lors du stockage dans localStorage:', storageError);
          }
        } else {
          console.log('❌ Diligence assignée à un autre utilisateur:', userId, 'vs current:', currentUser?.id);
        }
      } catch (error) {
        console.error('❌ Erreur lors du traitement de l\'événement diligenceAssigned:', error);
      }
    };

    // Écouter aussi les événements de validation
    const handleDiligenceValidation = (event: Event) => {
      try {
        const customEvent = event as CustomEvent;
        const { diligenceTitle, diligenceId, status, validatedBy } = customEvent.detail;
        
        console.log('🔔 Événement diligenceValidation reçu:', {
          diligenceTitle,
          diligenceId,
          status,
          validatedBy,
          currentUserId: currentUser?.id
        });

        // Si c'est l'utilisateur courant qui a validé, pas de notification
        if (validatedBy && currentUser && String(validatedBy) === String(currentUser.id)) {
          console.log('✅ Validation effectuée par l\'utilisateur courant, pas de notification');
          return;
        }

        // Notification pour les administrateurs ou responsables
        if (currentUser?.role?.toLowerCase().includes('admin')) {
          const message = `✅ Diligence ${status === 'approved' ? 'approuvée' : 'rejetée'}: "${diligenceTitle}"`;
          addNotification(message, 'success');
          setNotificationCount(prev => prev + 1);
        }
      } catch (error) {
        console.error('❌ Erreur lors du traitement de l\'événement diligenceValidation:', error);
      }
    };

    console.log('👂 Démarrage des écouteurs d\'événements');
    window.addEventListener('diligenceAssigned', handleDiligenceAssigned);
    window.addEventListener('diligenceValidation', handleDiligenceValidation);

    return () => {
      console.log('👋 Arrêt des écouteurs d\'événements');
      window.removeEventListener('diligenceAssigned', handleDiligenceAssigned);
      window.removeEventListener('diligenceValidation', handleDiligenceValidation);
    };
  }, [currentUser, addNotification]);

  // Démarrer automatiquement le polling quand le composant est monté
  useEffect(() => {
    // Récupérer l'utilisateur d'abord
    fetchCurrentUser().then(() => {
      startPolling();
      
      // Test: Écouter manuellement les événements pour débogage
      const testEventListener = (event: Event) => {
        const customEvent = event as CustomEvent;
        console.log('🎯 Événement test reçu:', customEvent.detail);
      };
      
      window.addEventListener('diligenceAssigned', testEventListener);
      
      return () => {
        window.removeEventListener('diligenceAssigned', testEventListener);
      };
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