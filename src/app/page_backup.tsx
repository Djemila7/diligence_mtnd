
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { apiClient } from "@/lib/api/client";
import { useNotifications } from "@/contexts/NotificationContext";
import { useStatsEvolution } from "@/hooks/useStatsEvolution";

interface Echeance {
  id: number;
  nom: string;
  client: string;
  echeance: string;
  priorite: string;
  progression: number;
  type?: string;
}

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface Statistics {
  diligencesEnCours: number;
  diligencesTerminees: number;
  diligencesPlanifiees: number;
  diligencesEnRetard: number;
  tauxCompletion: number;
  evolutionEnCours: number; // Pourcentage d'évolution des diligences en cours
  evolutionTerminees: number; // Pourcentage d'évolution des diligences terminées
  utilisateursActifs?: number;
  documentsTraites?: number;
  rapportsGeneres?: number;
  mesDocuments?: number;
  mesRapports?: number;
}

interface DestinataireDetail {
  id: number | string;
  name: string;
  email?: string;
}

interface DiligenceData {
  id: number;
  titre: string;
  statut: string;
  piecesJointes?: string[];
  destinataire?: string[];
  destinataire_details?: DestinataireDetail[];
  assigned_to?: number;
  created_by?: number;
  dateFin?: string;
  priorite?: string;
  progression?: number;
  client?: string;
  nom?: string;
  // autres propriétés si nécessaire
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [selectedDiligence, setSelectedDiligence] = useState<Echeance | null>(null);
  const [stats, setStats] = useState<Statistics | null>(null);
  const [diligencesData, setDiligencesData] = useState<DiligenceData[]>([]);
  const [usersData, setUsersData] = useState<User[]>([]);
  const [previousStats, setPreviousStats] = useState<Statistics | null>(null);
  const { addNotification } = useNotifications();
  const { stats: evolutionStats } = useStatsEvolution();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const token = apiClient.getToken();
        
        if (!token) {
          if (window.location.pathname !== '/login') {
            router.push('/login');
          }
          setLoading(false);
          return;
        }

        try {
          const userData = await apiClient.getCurrentUser();
          if (userData) {
            setUser({
              id: userData.id || 1,
              email: userData.email || '',
              name: userData.name || userData.email?.split('@')[0] || 'Utilisateur',
              role: userData.role || 'user'
            });
          } else {
            throw new Error('Aucune donnée utilisateur');
          }
        } catch (apiError) {
          console.warn("Erreur API, utilisation des données de fallback:", apiError);
          const mockUser: User = {
            id: 1,
            email: 'admin@example.com',
            name: 'Administrateur',
            role: 'admin'
          };
          setUser(mockUser);
        }

        // Charger les données initiales
        const loadInitialData = async () => {
          try {
            const diligences = await apiClient.getDiligences();
            console.log('📋 Données des diligences reçues:', diligences);
            if (diligences && diligences.length > 0) {
              console.log('📋 Première diligence:', diligences[0]);
              console.log('📋 Destinataire details:', diligences[0]?.destinataire_details);
              console.log('📋 Created by:', diligences[0]?.created_by);
              console.log('📋 Date fin:', diligences[0]?.dateFin);
            }
            setDiligencesData(diligences || []);
            
            const calculateRealStatistics = (diligences: DiligenceData[]): Statistics => {
              const enCours = diligences.filter(d => d.statut === 'En cours').length;
              const terminees = diligences.filter(d => d.statut === 'Terminé').length;
              const planifiees = diligences.filter(d => d.statut === 'Planifié').length;
              const enRetard = diligences.filter(d => d.statut === 'En retard').length;
              
              const tauxCompletion = terminees > 0 ? Math.round((terminees / diligences.length) * 100) : 0;
          
              // Calculer l'évolution par rapport aux statistiques précédentes
              let evolutionEnCours = 0;
              let evolutionTerminees = 0;
          
              if (previousStats) {
                evolutionEnCours = previousStats.diligencesEnCours > 0 ?
                  Math.round(((enCours - previousStats.diligencesEnCours) / previousStats.diligencesEnCours) * 100) : 0;
                
                evolutionTerminees = previousStats.diligencesTerminees > 0 ?
                  Math.round(((terminees - previousStats.diligencesTerminees) / previousStats.diligencesTerminees) * 100) : 0;
              }
          
              const isAdmin = user?.role === 'admin' || user?.role === 'Administrateur';
              
              // Calculer les documents et rapports basés sur les données réelles
              let mesDocuments = 0;
              let mesRapports = 0;
          
              if (!isAdmin && user) {
                // Pour les utilisateurs normaux : documents des diligences assignées
                const userDiligences = diligences.filter(diligence =>
                  diligence.assigned_to === user.id ||
                  (Array.isArray(diligence.destinataire) && diligence.destinataire.includes(user.id.toString()))
                );
                
                // Compter les documents des diligences assignées
                mesDocuments = userDiligences.reduce((total, diligence) => {
                  return total + (Array.isArray(diligence.piecesJointes) ? diligence.piecesJointes.length : 0);
                }, 0);
          
                // Les rapports sont les diligences terminées assignées à l'utilisateur
                mesRapports = userDiligences.filter(d => d.statut === 'Terminé').length;
              }
          
              if (isAdmin) {
                return {
                  diligencesEnCours: enCours,
                  diligencesTerminees: terminees,
                  diligencesPlanifiees: planifiees,
                  diligencesEnRetard: enRetard,
                  tauxCompletion: tauxCompletion,
                  evolutionEnCours,
                  evolutionTerminees,
                  utilisateursActifs: 247,
                  documentsTraites: 1248,
                  rapportsGeneres: 89
                };
              } else {
                return {
                  diligencesEnCours: enCours,
                  diligencesTerminees: terminees,
                  diligencesPlanifiees: planifiees,
                  diligencesEnRetard: enRetard,
                  tauxCompletion: tauxCompletion,
                  evolutionEnCours,
                  evolutionTerminees,
                  mesDocuments,
                  mesRapports
                };
              }
            };
            
            const calculatedStats = calculateRealStatistics(diligences || []);
            setStats(calculatedStats);
            setPreviousStats(calculatedStats);

            const users = await apiClient.getUsers();
            console.log('👥 Utilisateurs chargés:', users);
            setUsersData(users || []);
          } catch (error) {
            console.error("Erreur lors du chargement des données:", error);
            setStats(getDefaultStatistics(user?.role === 'admin' || user?.role === 'Administrateur'));
          }
        };
        
        loadInitialData();
        
      } catch (error) {
        console.error("Erreur:", error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [router]);

  const loadDiligencesData = async () => {
    try {
      const diligences = await apiClient.getDiligences();
      setDiligencesData(diligences || []);
      
      const calculateRealStatistics = (diligences: DiligenceData[]): Statistics => {
        const enCours = diligences.filter(d => d.statut === 'En cours').length;
        const terminees = diligences.filter(d => d.statut === 'Terminé').length;
        const planifiees = diligences.filter(d => d.statut === 'Planifié').length;
        const enRetard = diligences.filter(d => d.statut === 'En retard').length;
        
        const tauxCompletion = terminees > 0 ? Math.round((terminees / diligences.length) * 100) : 0;
    
        // Calculer l'évolution par rapport aux statistiques précédentes
        let evolutionEnCours = 0;
        let evolutionTerminees = 0;
    
        if (previousStats) {
          evolutionEnCours = previousStats.diligencesEnCours > 0 ?
            Math.round(((enCours - previousStats.diligencesEnCours) / previousStats.diligencesEnCours) * 100) : 0;
          
          evolutionTerminees = previousStats.diligencesTerminees > 0 ?
            Math.round(((terminees - previousStats.diligencesTerminees) / previousStats.diligencesTerminees) * 100) : 0;
        }
    
        const isAdmin = user?.role === 'admin' || user?.role === 'Administrateur';
        
        // Calculer les documents et rapports basés sur les données réelles
        let mesDocuments = 0;
        let mesRapports = 0;
    
        if (!isAdmin && user) {
          // Pour les utilisateurs normaux : documents des diligences assignées
          const userDiligences = diligences.filter(diligence =>
            diligence.assigned_to === user.id ||
            (Array.isArray(diligence.destinataire) && diligence.destinataire.includes(user.id.toString()))
          );
          
          // Compter les documents des diligences assignées
          mesDocuments = userDiligences.reduce((total, diligence) => {
            return total + (Array.isArray(diligence.piecesJointes) ? diligence.piecesJointes.length : 0);
          }, 0);
    
          // Les rapports sont les diligences terminées assignées à l'utilisateur
          mesRapports = userDiligences.filter(d => d.statut === 'Terminé').length;
        }
    
        if (isAdmin) {
          return {
            diligencesEnCours: enCours,
            diligencesTerminees: terminees,
            diligencesPlanifiees: planifiees,
            diligencesEnRetard: enRetard,
            tauxCompletion: tauxCompletion,
            evolutionEnCours,
            evolutionTerminees,
            utilisateursActifs: 247,
            documentsTraites: 1248,
            rapportsGeneres: 89
          };
        } else {
          return {
            diligencesEnCours: enCours,
            diligencesTerminees: terminees,
            diligencesPlanifiees: planifiees,
            diligencesEnRetard: enRetard,
            tauxCompletion: tauxCompletion,
            evolutionEnCours,
            evolutionTerminees,
            mesDocuments,
            mesRapports
          };
        }
      };
      
      const calculatedStats = calculateRealStatistics(diligences || []);
      setStats(calculatedStats);
      // Stocker les statistiques actuelles comme précédentes pour le prochain calcul
      setPreviousStats(calculatedStats);
    } catch (error) {
      console.error("Erreur lors du chargement des diligences:", error);
      setStats(getDefaultStatistics(user?.role === 'admin' || user?.role === 'Administrateur'));
    }
  };

  const loadUsersData = async () => {
    try {
      console.log("Chargement des utilisateurs...");
      const users = await apiClient.getUsers();
      console.log("Utilisateurs chargés:", users);
      setUsersData(users || []);
    } catch (error) {
      console.error("Erreur lors du chargement des utilisateurs:", error);
    }
  };


  // Rafraîchir les données automatiquement toutes les 60 secondes
  useEffect(() => {
    const refreshData = async () => {
      try {
        const diligences = await apiClient.getDiligences();
        setDiligencesData(diligences || []);
        
        const users = await apiClient.getUsers();
        setUsersData(users || []);
        
        // Recalculer les statistiques
        const calculateRealStatistics = (diligences: DiligenceData[]): Statistics => {
          const enCours = diligences.filter(d => d.statut === 'En cours').length;
          const terminees = diligences.filter(d => d.statut === 'Terminé').length;
          const planifiees = diligences.filter(d => d.statut === 'Planifié').length;
          const enRetard = diligences.filter(d => d.statut === 'En retard').length;
          
          const tauxCompletion = terminees > 0 ? Math.round((terminees / diligences.length) * 100) : 0;
      
          const isAdmin = user?.role === 'admin' || user?.role === 'Administrateur';
          
          // Calculer les documents et rapports basés sur les données réelles
          let mesDocuments = 0;
          let mesRapports = 0;
      
          if (!isAdmin && user) {
            // Pour les utilisateurs normaux : documents des diligences assignées
            const userDiligences = diligences.filter(diligence =>
              diligence.assigned_to === user.id ||
              (Array.isArray(diligence.destinataire) && diligence.destinataire.includes(user.id.toString()))
            );
            
            // Compter les documents des diligences assignées
            mesDocuments = userDiligences.reduce((total, diligence) => {
              return total + (Array.isArray(diligence.piecesJointes) ? diligence.piecesJointes.length : 0);
            }, 0);
      
            // Les rapports sont les diligences terminées assignées à l'utilisateur
            mesRapports = userDiligences.filter(d => d.statut === 'Terminé').length;
          }
      
          if (isAdmin) {
            return {
              diligencesEnCours: enCours,
              diligencesTerminees: terminees,
              diligencesPlanifiees: planifiees,
              diligencesEnRetard: enRetard,
              tauxCompletion: tauxCompletion,
              evolutionEnCours: 0,
              evolutionTerminees: 0,
              utilisateursActifs: 247,
              documentsTraites: 1248,
              rapportsGeneres: 89
            };
          } else {
            return {
              diligencesEnCours: enCours,
              diligencesTerminees: terminees,
              diligencesPlanifiees: planifiees,
              diligencesEnRetard: enRetard,
              tauxCompletion: tauxCompletion,
              evolutionEnCours: 0,
              evolutionTerminees: 0,
              mesDocuments,
              mesRapports
            };
          }
        };
        
        const calculatedStats = calculateRealStatistics(diligences || []);
        setStats(calculatedStats);
        
      } catch (error) {
        console.error("Erreur lors du rafraîchissement des données:", error);
      }
    };

    const pollingInterval = setInterval(() => {
      refreshData();
    }, 60000); // Rafraîchir toutes les 60 secondes

    return () => {
      clearInterval(pollingInterval);
    };
  }, [user]);

  const getDefaultStatistics = (isAdmin: boolean): Statistics => {
    return isAdmin ? {
      diligencesEnCours: 24,
      diligencesTerminees: 156,
      diligencesPlanifiees: 18,
      diligencesEnRetard: 3,
      tauxCompletion: 87,
      evolutionEnCours: 12,
      evolutionTerminees: 8,
      utilisateursActifs: 247,
      documentsTraites: 1248,
      rapportsGeneres: 89
    } : {
      diligencesEnCours: 3,
      diligencesTerminees: 12,
      diligencesPlanifiees: 2,
      diligencesEnRetard: 0,
      tauxCompletion: 92,
      evolutionEnCours: 5,
      evolutionTerminees: 3,
      mesDocuments: 0, // Maintenant calculé dynamiquement
      mesRapports: 0   // Maintenant calculé dynamiquement
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const userRole = user?.role || (user?.email?.includes('admin') ? 'admin' : 'user');
  const isAdmin = userRole === 'admin' || userRole === 'Administrateur';
  const currentStats = stats || getDefaultStatistics(isAdmin);

  const activitesRecentes = isAdmin ? [
    { id: 1, action: "Nouvelle diligence créée", details: "Audit financier - Ministère des Finances", temps: "Il y a 2 heures", type: "creation" },
    { id: 2, action: "Diligence #245 terminée", details: "Vérification légale - Direction des Marchés", temps: "Aujourd'hui, 09:30