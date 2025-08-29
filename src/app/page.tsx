
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
  statut?: string;
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
    { id: 1, action: "Maintenance système planifiée", details: "Maintenance système - Mise à jour de sécurité", temps: "Demain, 02:00", type: "admin" },
    { id: 2, action: "Sauvegarde BDD programmée", details: "Sauvegarde base de données - Archive mensuelle", temps: "15/02/2025", type: "admin" },
    { id: 3, action: "Rapport mensuel généré", details: "Synthèse des activités de janvier", temps: "Hier, 16:45", type: "rapport" },
    { id: 4, action: "Utilisateur ajouté", details: "Marie Kouamé - Analyste junior", temps: "Hier, 14:20", type: "user" },
    { id: 5, action: "Document uploadé", details: "Contrat #2025-001.pdf", temps: "Il y a 3 jours", type: "document" }
  ] : [
    { id: 1, action: "Votre diligence #78 terminée", details: "Vérification documents - Projet Alpha", temps: "Aujourd'hui, 11:30", type: "completion" },
    { id: 2, action: "Nouveau document ajouté", details: "Rapport intermédiaire.pdf", temps: "Hier, 15:45", type: "document" },
    { id: 3, action: "Commentaire reçu", details: "Feedback sur votre travail", temps: "Hier, 14:20", type: "feedback" },
    { id: 4, action: "Diligence assignée", details: "Contrôle qualité - Client XYZ", temps: "Il y a 2 jours", type: "assignment" },
    { id: 5, action: "Formation complétée", details: "Module sécurité des données", temps: "Il y a 3 jours", type: "training" }
  ];

  // Calculer les prochaines échéances basées sur les diligences réelles
  const getProchainesEcheances = () => {
    if (!diligencesData || diligencesData.length === 0) {
      return isAdmin ? [
        { id: 1, nom: "Maintenance système", client: "Système", echeance: "Demain, 02:00", priorite: "Haute", progression: 0, type: "admin" },
        { id: 2, nom: "Sauvegarde BDD", client: "Sauvegarde", echeance: "15/02/2025", priorite: "Haute", progression: 0, type: "admin" }
      ] : [
        { id: 1, nom: "Rapport hebdomadaire", client: "Projet Alpha", echeance: "Demain, 17:00", priorite: "Moyenne", progression: 85, type: "diligence" },
        { id: 2, nom: "Vérification documents", client: "Client XYZ", echeance: "15/02/2025", priorite: "Haute", progression: 60, type: "diligence" }
      ];
    }

    // Filtrer les diligences selon le rôle de l'utilisateur
    let userDiligences = diligencesData;
    
    if (!isAdmin && user) {
      // Pour les utilisateurs normaux : diligences assignées ET diligences qu'ils ont assignées à d'autres
      userDiligences = diligencesData.filter(diligence =>
        diligence.assigned_to === user.id ||
        (Array.isArray(diligence.destinataire) && diligence.destinataire.includes(user.id.toString())) ||
        diligence.created_by === user.id
      );
    }

    // Convertir les diligences en format d'échéance
    const echeances = userDiligences
      .filter(d => d.statut !== 'Terminé') // Exclure seulement les terminées (inclure les en retard)
      .map(diligence => {
        const dateFin = diligence.dateFin ? new Date(diligence.dateFin) : null;
        const aujourdHui = new Date();
        
        // Déterminer si l'échéance est dépassée
        const estEnRetard = dateFin && dateFin < aujourdHui && diligence.statut !== 'Terminé';
        
        return {
          id: diligence.id,
          nom: diligence.titre || 'Diligence sans titre',
          client: diligence.client || 'Client non spécifié',
          echeance: dateFin ? dateFin.toLocaleDateString('fr-FR') : 'Date non définie',
          priorite: diligence.priorite || 'Moyenne',
          progression: diligence.progression || 0,
          type: 'diligence',
          statut: diligence.statut,
          estEnRetard: estEnRetard,
          dateFinObj: dateFin // Garder l'objet Date pour le tri
        };
      })
      .sort((a, b) => {
        // Priorité 1: Les échéances en retard d'abord
        if (a.estEnRetard && !b.estEnRetard) return -1;
        if (!a.estEnRetard && b.estEnRetard) return 1;
        
        // Priorité 2: Les échéances les plus proches d'abord
        if (a.dateFinObj && b.dateFinObj) {
          return a.dateFinObj.getTime() - b.dateFinObj.getTime();
        }
        
        // Priorité 3: Les sans date à la fin
        if (!a.dateFinObj && b.dateFinObj) return 1;
        if (a.dateFinObj && !b.dateFinObj) return -1;
        
        return 0;
      })
      .slice(0, 8) // Augmenter à 8 échéances pour mieux voir les priorités
      .map(({ dateFinObj, ...rest }) => rest); // Retirer l'objet Date pour l'affichage

    // Ajouter des tâches administratives pour les admins si peu d'échéances
    if (isAdmin && echeances.length < 3) {
      echeances.push(
        { id: 1001, nom: "Maintenance système", client: "Système", echeance: "Demain, 02:00", priorite: "Haute", progression: 0, type: "admin", statut: "Planifié", estEnRetard: false },
        { id: 1002, nom: "Sauvegarde BDD", client: "Sauvegarde", echeance: "15/02/2025", priorite: "Haute", progression: 0, type: "admin", statut: "Planifié", estEnRetard: false }
      );
    }

    return echeances;
  };

  const prochainesEcheances = getProchainesEcheances();

  const performanceEquipe = isAdmin ? [
    { nom: "Jean Kouassi", role: "Senior Analyst", diligences: 12, taux: 95, avatar: "JK" },
    { nom: "Marie Traoré", role: "Project Manager", diligences: 8, taux: 92, avatar: "MT" },
    { nom: "Amadou Diallo", role: "Legal Expert", diligences: 15, taux: 88, avatar: "AD" },
    { nom: "Fatou Camara", role: "IT Auditor", diligences: 6, taux: 90, avatar: "FC" }
  ] : [
    { nom: user?.name || user?.email?.split('@')[0], role: "Votre performance", diligences: currentStats.diligencesTerminees, taux: currentStats.tauxCompletion, avatar: "VO" }
  ];

  const getTypeIcon = (type: string) => {
    switch(type) {
      case "creation": return "🆕";
      case "completion": return "✅";
      case "rapport": return "📊";
      case "user": return "👤";
      case "document": return "📄";
      case "feedback": return "💬";
      case "assignment": return "📋";
      case "training": return "🎓";
      default: return "📋";
    }
  };

  const getEcheanceIcon = (echeance: Echeance) => {
    if (echeance.type === 'admin') {
      return "⚙️";
    }
    return "📋";
  };

  const getEcheanceStyle = (echeance: Echeance) => {
    if (echeance.type === 'admin') {
      return "bg-blue-50 border-l-4 border-blue-500";
    }
    return "";
  };

  const getPrioriteColor = (priorite: string) => {
    switch(priorite) {
      case "Haute": return "bg-red-50 text-red-700 border border-red-200";
      case "Moyenne": return "bg-orange-50 text-orange-700 border border-orange-200";
      case "Basse": return "bg-green-50 text-green-700 border border-green-200";
      default: return "bg-gray-50 text-gray-700 border border-gray-200";
    }
  };

  const showDiligenceDetails = (diligence: Echeance) => {
    setSelectedDiligence(diligence);
    
    // Trouver la diligence correspondante pour récupérer les informations détaillées
    const diligenceDetail = diligencesData.find(d => d.id === diligence.id);
    const destinataireData = diligenceDetail?.destinataire;
    
    // Gérer le cas où destinataire est une chaîne JSON
    let destinatairesIds: (string | number)[] = [];
    if (typeof destinataireData === 'string') {
      try {
        destinatairesIds = JSON.parse(destinataireData);
      } catch (error) {
        console.error('Erreur parsing JSON destinataire:', error);
        // Si le parsing échoue, traiter comme une chaîne simple
        destinatairesIds = [destinataireData];
      }
    } else if (Array.isArray(destinataireData)) {
      destinatairesIds = destinataireData;
    } else if (destinataireData) {
      destinatairesIds = [destinataireData];
    }
    
    // Convertir les IDs en noms d'utilisateurs
    const destinatairesNoms = destinatairesIds.map((id: string | number) => {
      // Convertir l'ID en nombre pour la comparaison
      const idNum = typeof id === 'string' ? parseInt(id, 10) : id;
      const user = usersData.find(u => u.id === idNum);
      return user?.name || `Utilisateur ${id}`;
    });
    
    const typeInfo = diligence.type === 'admin' ? ' (Tâche administrative)' : ' (Diligence)';
    let message = `${diligence.nom}${typeInfo}\nÉchéance: ${diligence.echeance}\nPriorité: ${diligence.priorite}\nProgression: ${diligence.progression}%`;
    
    // Ajouter les destinataires si disponibles
    if (destinatairesNoms.length > 0) {
      message += `\nDestinataires: ${destinatairesNoms.join(', ')}`;
    }
    
    addNotification(message, 'info');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50">
      <Sidebar />
      <div className="pl-64 p-8 min-h-screen">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Tableau de bord des diligences</h1>
          <p className="text-gray-600">
            {`Bienvenue ${user?.name || user?.email?.split('@')[0] || 'Utilisateur'}`}
          </p>
        </div>

        {/* Statistiques principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-500 text-sm font-medium">En cours</h3>
                <p className="text-3xl font-bold mt-2 text-blue-600">{currentStats.diligencesEnCours}</p>
                <p className={`text-sm mt-1 font-medium ${
                  evolutionStats.evolutionEnCours >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {evolutionStats.evolutionEnCours >= 0 ? '+' : ''}{evolutionStats.evolutionEnCours}% évolution
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🔄</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-500 text-sm font-medium">Terminées</h3>
                <p className="text-3xl font-bold mt-2 text-green-600">{currentStats.diligencesTerminees}</p>
                <p className={`text-sm mt-1 font-medium ${
                  evolutionStats.evolutionTerminees >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {evolutionStats.evolutionTerminees >= 0 ? '+' : ''}{evolutionStats.evolutionTerminees} évolution
                </p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-500 text-sm font-medium">Planifiées</h3>
                <p className="text-3xl font-bold mt-2 text-orange-600">{currentStats.diligencesPlanifiees}</p>
                <p className="text-orange-600 text-sm mt-1 font-medium">Pour ce mois</p>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📅</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-500 text-sm font-medium">En retard</h3>
                <p className="text-3xl font-bold mt-2 text-red-600">{currentStats.diligencesEnRetard}</p>
                <p className="text-red-600 text-sm mt-1 font-medium">Action requise</p>
              </div>
              <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
            </div>
          </div>
        </div>

        {/* Métriques rapides */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {isAdmin ? "Métriques clés" : "Vos indicateurs"}
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Taux de complétion</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{width: `${currentStats.tauxCompletion}%`}}></div>
                  </div>
                  <span className="text-sm font-semibold text-green-600">{currentStats.tauxCompletion}%</span>
                </div>
              </div>
              {isAdmin ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Utilisateurs actifs</span>
                    <span className="font-semibold text-gray-800">{currentStats.utilisateursActifs}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Documents traités</span>
                    <span className="font-semibold text-gray-800">{currentStats.documentsTraites}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Rapports générés</span>
                    <span className="font-semibold text-gray-800">{currentStats.rapportsGeneres}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Vos documents</span>
                    <span className="font-semibold text-gray-800">{currentStats.mesDocuments}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Vos rapports</span>
                    <span className="font-semibold text-gray-800">{currentStats.mesRapports}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Prochaines échéances */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Prochaines échéances</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
               <tr className="border-b border-gray-200">
                 <th className="text-left p-3 font-semibold text-gray-700">{isAdmin ? "Tâche" : "Diligence"}</th>
                 {!isAdmin && (
                   <>
                     <th className="text-left p-3 font-semibold text-gray-700">Destinataire</th>
                     <th className="text-left p-3 font-semibold text-gray-700">Échéance</th>
                   </>
                 )}
                 <th className="text-left p-3 font-semibold text-gray-700">Priorité</th>
                 <th className="text-left p-3 font-semibold text-gray-700">Progression</th>
               </tr>
             </thead>
              <tbody>
                {prochainesEcheances.map((echeance) => {
                  // Trouver la diligence correspondante pour récupérer les informations détaillées
                  const diligence = diligencesData.find(d => d.id === echeance.id);
                  
                  // Récupérer les informations des destinataires avec fallback
                  let destinatairesNoms: string[] = [];
                  
                  console.log('📋 Diligence en cours de traitement:', diligence);
                  console.log('📋 User ID:', user?.id);
                  console.log('📋 Created by:', diligence?.created_by);
                  
                  if (diligence?.destinataire_details && diligence.destinataire_details.length > 0) {
                    // Utiliser les détails des destinataires fournis par le backend
                    destinatairesNoms = diligence.destinataire_details.map((dest: DestinataireDetail) =>
                      dest.name || `Utilisateur ${dest.id}`
                    );
                    console.log('📋 Destinataires from details:', destinatairesNoms);
                  } else if (diligence?.destinataire && diligence.destinataire.length > 0) {
                    // Fallback: convertir les IDs en noms manuellement
                    const destinataireIds = Array.isArray(diligence.destinataire) ?
                      diligence.destinataire :
                      [diligence.destinataire];
                    
                    destinatairesNoms = destinataireIds.map((id: string | number) => {
                      const idNum = typeof id === 'string' ? parseInt(id, 10) : id;
                      const user = usersData.find(u => u.id === idNum);
                      return user?.name || `Utilisateur ${id}`;
                    });
                    console.log('📋 Destinataires from fallback:', destinatairesNoms);
                  }
                  
                  // Déterminer l'affichage du destinataire selon le contexte
                  let destinataireAffichage = 'Aucun destinataire';
                  if (user && diligence) {
                    console.log('📋 Comparaison created_by vs user.id:', diligence.created_by, '===', user.id);
                    if (diligence.created_by === user.id) {
                      // Côté émetteur : afficher le nom du destinataire
                      destinataireAffichage = destinatairesNoms.length > 0 ? destinatairesNoms.join(', ') : 'Aucun destinataire';
                      console.log('📋 Affichage émetteur:', destinataireAffichage);
                    } else {
                      // Côté destinataire : afficher le nom de l'émetteur
                      const createur = usersData.find(u => u.id === diligence.created_by);
                      destinataireAffichage = createur?.name || `Utilisateur ${diligence.created_by}`;
                      console.log('📋 Affichage destinataire:', destinataireAffichage);
                    }
                  }
                  
                  const dateEcheance = diligence?.dateFin ? new Date(diligence.dateFin).toLocaleDateString('fr-FR') : 'Non définie';
                  console.log('📋 Date échéance:', dateEcheance);
                  
                  const isEnRetard = diligence?.statut === 'En retard';
                  
                  return (
                    <tr key={echeance.id} className={`border-b border-gray-100 transition-colors ${
                      isEnRetard
                        ? 'bg-red-50 hover:bg-red-100'
                        : 'hover:bg-gray-50'
                    } ${getEcheanceStyle(echeance)}`}>
                      <td className="p-3 font-medium">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">{getEcheanceIcon(echeance)}</span>
                          <div>
                            <div className={isEnRetard ? 'text-red-800 font-semibold' : 'text-gray-800'}>
                              {echeance.nom}
                              {isEnRetard && (
                                <span className="ml-2 text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">
                                  ⚠️ EN RETARD
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      {!isAdmin && (
                        <>
                          <td className="p-3">
                            <div className={`text-sm ${isEnRetard ? 'text-red-700' : 'text-gray-600'}`}>
                              {destinataireAffichage}
                            </div>
                          </td>
                          <td className={`p-3 ${isEnRetard ? 'text-red-700 font-semibold' : 'text-gray-600'}`}>
                            {dateEcheance}
                            {isEnRetard && (
                              <div className="text-xs text-red-500 mt-1">
                                Échéance dépassée
                              </div>
                            )}
                          </td>
                        </>
                      )}
                      <td className="p-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          isEnRetard
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : getPrioriteColor(echeance.priorite)
                        }`}>
                          {echeance.priorite}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                isEnRetard ? 'bg-red-500' : 'bg-orange-500'
                              }`}
                              style={{ width: `${echeance.progression}%` }}
                            ></div>
                          </div>
                          <span className={`text-sm font-medium ${
                            isEnRetard ? 'text-red-700' : 'text-gray-600'
                          }`}>
                            {echeance.progression}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}