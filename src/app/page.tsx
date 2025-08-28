
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { apiClient } from "@/lib/api/client";
import { useNotifications } from "@/contexts/NotificationContext";

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
  utilisateursActifs?: number;
  documentsTraites?: number;
  rapportsGeneres?: number;
  mesDocuments?: number;
  mesRapports?: number;
}

interface DiligenceData {
  statut: string;
  // autres propriétés si nécessaire
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [selectedDiligence, setSelectedDiligence] = useState<Echeance | null>(null);
  const [stats, setStats] = useState<Statistics | null>(null);
  const [diligencesData, setDiligencesData] = useState<DiligenceData[]>([]);
  const { addNotification } = useNotifications();

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

        await loadDiligencesData();
        
      } catch (error) {
        console.error("Erreur:", error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    const loadDiligencesData = async () => {
      try {
        const diligences = await apiClient.getDiligences();
        setDiligencesData(diligences || []);
        
        const calculatedStats = calculateRealStatistics(diligences || []);
        setStats(calculatedStats);
      } catch (error) {
        console.error("Erreur lors du chargement des diligences:", error);
        setStats(getDefaultStatistics(user?.role === 'admin' || user?.role === 'Administrateur'));
      }
    };

    const calculateRealStatistics = (diligences: DiligenceData[]): Statistics => {
      const enCours = diligences.filter(d => d.statut === 'En cours').length;
      const terminees = diligences.filter(d => d.statut === 'Terminé').length;
      const planifiees = diligences.filter(d => d.statut === 'Planifié').length;
      const enRetard = diligences.filter(d => d.statut === 'En retard').length;
      
      const tauxCompletion = terminees > 0 ? Math.round((terminees / diligences.length) * 100) : 0;

      const isAdmin = user?.role === 'admin' || user?.role === 'Administrateur';
      
      if (isAdmin) {
        return {
          diligencesEnCours: enCours,
          diligencesTerminees: terminees,
          diligencesPlanifiees: planifiees,
          diligencesEnRetard: enRetard,
          tauxCompletion: tauxCompletion,
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
          mesDocuments: 45,
          mesRapports: 8
        };
      }
    };


    checkUser();
  }, [router]);

  const getDefaultStatistics = (isAdmin: boolean): Statistics => {
    return isAdmin ? {
      diligencesEnCours: 24,
      diligencesTerminees: 156,
      diligencesPlanifiees: 18,
      diligencesEnRetard: 3,
      tauxCompletion: 87,
      utilisateursActifs: 247,
      documentsTraites: 1248,
      rapportsGeneres: 89
    } : {
      diligencesEnCours: 3,
      diligencesTerminees: 12,
      diligencesPlanifiees: 2,
      diligencesEnRetard: 0,
      tauxCompletion: 92,
      mesDocuments: 45,
      mesRapports: 8
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
    { id: 2, action: "Diligence #245 terminée", details: "Vérification légale - Direction des Marchés", temps: "Aujourd'hui, 09:30", type: "completion" },
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

  const prochainesEcheances = isAdmin ? [
    { id: 1, nom: "Maintenance système", client: "Système", echeance: "Demain, 02:00", priorite: "Haute", progression: 0, type: "admin" },
    { id: 2, nom: "Sauvegarde BDD", client: "Sauvegarde", echeance: "15/02/2025", priorite: "Haute", progression: 0, type: "admin" },
    { id: 3, nom: "Rapport administratif", client: "Rapports", echeance: "25/02/2025", priorite: "Moyenne", progression: 10, type: "admin" },
    { id: 4, nom: "Audit sécurité", client: "Ministère Défense", echeance: "22/02/2025", priorite: "Haute", progression: 75, type: "diligence" }
  ] : [
    { id: 1, nom: "Rapport hebdomadaire", client: "Projet Alpha", echeance: "Demain, 17:00", priorite: "Moyenne", progression: 85, type: "diligence" },
    { id: 2, nom: "Vérification documents", client: "Client XYZ", echeance: "15/02/2025", priorite: "Haute", progression: 60, type: "diligence" }
  ];

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
    const typeInfo = diligence.type === 'admin' ? ' (Tâche administrative)' : ' (Diligence)';
    const message = `${diligence.nom}${typeInfo}\nClient: ${diligence.client}\nÉchéance: ${diligence.echeance}\nPriorité: ${diligence.priorite}\nProgression: ${diligence.progression}%`;
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
                <p className="text-green-600 text-sm mt-1 font-medium">+12% ce mois</p>
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
                <p className="text-green-600 text-sm mt-1 font-medium">+8 cette semaine</p>
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
                 {isAdmin ? null : <th className="text-left p-3 font-semibold text-gray-700">Client</th>}
                 <th className="text-left p-3 font-semibold text-gray-700">Échéance</th>
                 <th className="text-left p-3 font-semibold text-gray-700">Priorité</th>
                 <th className="text-left p-3 font-semibold text-gray-700">Progression</th>
               </tr>
             </thead>
              <tbody>
                {prochainesEcheances.map((echeance) => (
                  <tr key={echeance.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${getEcheanceStyle(echeance)}`}>
                    <td className="p-3 font-medium text-gray-800">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{getEcheanceIcon(echeance)}</span>
                        <div>
                          <div>{echeance.nom}</div>
                          {isAdmin && <div className="text-sm text-gray-500">{echeance.client}</div>}
                        </div>
                      </div>
                    </td>
                    {!isAdmin && <td className="p-3 text-gray-600">{echeance.client}</td>}
                    <td className="p-3 text-gray-600">{echeance.echeance}</td>
                    <td className="p-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPrioriteColor(echeance.priorite)}`}>
                        {echeance.priorite}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${echeance.progression}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-600">{echeance.progression}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}