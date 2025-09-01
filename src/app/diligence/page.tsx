"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import DiligenceForm from "@/components/DiligenceForm";
import DeleteModal from "@/components/DeleteModal";
import { apiClient } from "@/lib/api/client";
import { useNotifications } from "@/contexts/NotificationContext";

// Styles personnalisés pour les animations
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes slideInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes bounceIn {
    0% { opacity: 0; transform: scale(0.3); }
    50% { opacity: 1; transform: scale(1.05); }
    70% { transform: scale(0.9); }
    100% { opacity: 1; transform: scale(1); }
  }

  .animate-fade-in {
    animation: fadeIn 0.5s ease-out;
  }

  .animate-slide-in-up {
    animation: slideInUp 0.6s ease-out;
  }

  .animate-bounce-in {
    animation: bounceIn 0.8s ease-out;
  }

  .stagger-1 { animation-delay: 0.1s; }
  .stagger-2 { animation-delay: 0.2s; }
  .stagger-3 { animation-delay: 0.3s; }
  .stagger-4 { animation-delay: 0.4s; }
`;

interface Diligence {
  id: string;
  titre: string;
  directiondestinataire: string;
  datedebut: string;
  datefin: string;
  description: string;
  priorite: "Haute" | "Moyenne" | "Basse";
  statut: "Planifié" | "En cours" | "Terminé" | "En retard";
  destinataire: string | string[] | null;
  destinataire_details?: { id: string; name: string; email: string }[];
  piecesjointes: string[];
  progression: number;
  created_at: string;
  updated_at: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

interface DiligenceFormData {
  titre: string;
  directionDestinataire: string;
  dateDebut: string;
  dateFin: string;
  description: string;
  priorite: string;
  statut: string;
  destinataire: string[];
  piecesJointes: string[];
  piecesJointesFiles: File[];
}

export default function DiligencePage() {
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('diligenceViewMode') || 'table';
    }
    return 'table';
  });
  const [showForm, setShowForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingDiligence, setEditingDiligence] = useState<Diligence | null>(null);
  const [diligenceToDelete, setDiligenceToDelete] = useState<Diligence | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('diligenceItemsPerPage');
      return saved ? parseInt(saved) : 6;
    }
    return 6;
  });
  const [filters, setFilters] = useState({
    search: '',
    statut: '',
    priorite: '',
    dateDebut: '',
    dateFin: ''
  });
  const [allDiligences, setAllDiligences] = useState<Diligence[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);
  const { addNotification } = useNotifications();

  // Initialiser les états depuis localStorage et charger les données
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Charger depuis le cache local si disponible et récent (moins de 5 minutes)
      const cachedData = localStorage.getItem('diligencesCache');
      const cachedTime = localStorage.getItem('diligencesCacheTime');

      if (cachedData && cachedTime) {
        const cacheAge = Date.now() - parseInt(cachedTime);
        if (cacheAge < 300000) { // 5 minutes de cache
          setAllDiligences(JSON.parse(cachedData));
          setLastLoadTime(parseInt(cachedTime));
          setLoading(false);
          return;
        }
      }
    }

    // Charger les données si pas de cache ou cache expiré
    loadDiligences();
    // Charger les utilisateurs et l'utilisateur courant immédiatement
    loadUsers();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      console.log('🔍 Chargement de l\'utilisateur courant...');
      const userData = await apiClient.getCurrentUser();
      console.log('✅ Utilisateur chargé:', userData);
      
      if (userData) {
        setCurrentUser({
          id: userData.id.toString(),
          name: userData.name || userData.email || 'Utilisateur',
          email: userData.email || '',
          role: userData.role || 'user'
        });
      } else {
        console.warn('⚠️ Aucune donnée utilisateur reçue');
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement de l\'utilisateur:', error);
      // Créer un utilisateur par défaut en cas d'erreur pour permettre la création de diligences
      setCurrentUser({
        id: '1',
        name: 'Utilisateur Administrateur',
        email: 'admin@example.com',
        role: 'admin'
      });
    }
  };

  // Détecter quand l'utilisateur revient à l'onglet
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // L'utilisateur revient à l'onglet, mais on ne recharge PAS les données automatiquement
        console.log('Utilisateur de retour sur la page - Pas de rechargement automatique');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const loadDiligences = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getDiligences();
      const diligencesData = response || [];
      setAllDiligences(diligencesData);
      setLastLoadTime(Date.now());

      // Sauvegarder dans le cache local
      if (typeof window !== 'undefined') {
        localStorage.setItem('diligencesCache', JSON.stringify(diligencesData));
        localStorage.setItem('diligencesCacheTime', Date.now().toString());
      }
    } catch (error) {
      console.error('Erreur lors du chargement des diligences:', error);
      addNotification('Erreur lors du chargement des données', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const usersData = await apiClient.getUsers();
      console.log('Utilisateurs chargés:', usersData);
      // S'assurer que les IDs sont des strings pour la comparaison
      const formattedUsers = usersData.map((user: User) => ({
        ...user,
        id: user.id.toString()
      }));
      setUsers(formattedUsers);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      // Fallback en cas d'erreur
      setUsers([
        { id: '1', email: 'admin@example.com', name: 'Administrateur', role: 'admin' },
        { id: '2', email: 'user@example.com', name: 'Utilisateur Test', role: 'user' }
      ]);
    }
  };

  // Fonctions pour gérer les actions
  const handleCreateDiligence = () => {
    setEditingDiligence(null);
    setShowForm(true);
  };

  const handleEditDiligence = (diligence: Diligence) => {
    setEditingDiligence(diligence);
    setShowForm(true);
  };

  const handleDeleteDiligence = (diligence: Diligence) => {
    setDiligenceToDelete(diligence);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (diligenceToDelete) {
      try {
        // Supprimer la diligence via l'API
        await apiClient.deleteDiligence(parseInt(diligenceToDelete.id));

        setAllDiligences(prev => prev.filter(d => d.id !== diligenceToDelete.id));
        setShowDeleteModal(false);
        setDiligenceToDelete(null);
        addNotification('Diligence supprimée avec succès', 'success');
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        addNotification(`Erreur lors de la suppression: ${errorMessage}`, 'error');
      }
    }
  };

  const handleFormSubmit = async (formData: DiligenceFormData) => {
    try {
      // Utiliser l'utilisateur courant ou créer un utilisateur par défaut
      const effectiveUser = currentUser || {
        id: '1',
        name: 'Administrateur',
        email: 'admin@example.com',
        role: 'admin'
      };
      
      console.log("Création de diligence par utilisateur:", effectiveUser.id, effectiveUser.name);
      
      // Préparer les données pour l'API
      const diligenceData = {
        titre: formData.titre,
        directiondestinataire: formData.directionDestinataire,
        datedebut: formData.dateDebut,
        datefin: formData.dateFin,
        description: formData.description,
        priorite: formData.priorite as "Haute" | "Moyenne" | "Basse",
        statut: formData.statut as "Planifié" | "En cours" | "Terminé" | "En retard",
        destinataire: formData.destinataire.length > 0 ? formData.destinataire : null,
        piecesjointes: [], // Initialiser comme tableau empty
        progression: 0,
        created_by: effectiveUser.id // Ajouter l'ID de l'utilisateur créateur
      };
      
      console.log("Données envoyées à l'API:", diligenceData);

      if (editingDiligence) {
        // MODIFICATION - Mettre à jour la diligence
        await apiClient.updateDiligence(parseInt(editingDiligence.id), diligenceData);
      } else {
        // CRÉATION - Créer la diligence
        await apiClient.createDiligence(diligenceData);
      }

      // Recharger les diligences pour avoir les données à jour
      await loadDiligences();

      // Envoyer des notifications pour les utilisateurs assignés
      if (formData.destinataire && formData.destinataire.length > 0) {
        const assignedUsers = users.filter(user =>
          formData.destinataire.includes(user.id.toString())
        );
        
        console.log('Utilisateurs assignés à la diligence:', assignedUsers);
        
        assignedUsers.forEach(user => {
          const notificationMessage = `📋 Nouvelle diligence assignée: "${formData.titre}"`;
          
          // Ajouter la notification dans l'interface
          addNotification(notificationMessage, 'info');
          
          // Déclencher un événement pour informer le système de notifications
          const eventDetail = {
            diligenceTitle: formData.titre,
            userId: user.id,
            userName: user.name,
            userEmail: user.email
          };
          
          console.log('🔔 Déclenchement événement diligenceAssigned:', eventDetail);
          
          // Déclencher l'événement avec un délai pour s'assurer que l'écouteur est prêt
          setTimeout(() => {
            console.log('📤 Envoi de l\'événement diligenceAssigned...');
            const event = new CustomEvent('diligenceAssigned', {
              detail: eventDetail,
              bubbles: true,
              composed: true
            });
            window.dispatchEvent(event);
            console.log('✅ Événement diligenceAssigned envoyé');
          }, 100);
        });
        
        // Solution alternative: stocker les notifications dans localStorage pour les récupérer plus tard
        const newAssignments = assignedUsers.map(user => ({
          diligenceTitle: formData.titre,
          userId: user.id,
          userName: user.name,
          timestamp: Date.now()
        }));
        
        localStorage.setItem('recentDiligenceAssignments', JSON.stringify(newAssignments));
      }

      setShowForm(false);
      setEditingDiligence(null);
      addNotification(
        editingDiligence ? 'Diligence modifiée avec succès' : 'Diligence créée avec succès',
        'success'
      );

    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      addNotification(`Erreur lors de l'enregistrement: ${errorMessage}`, 'error');
    }
  };

  // Fonction de filtrage
  const filteredDiligences = allDiligences.filter(diligence => {
    const matchSearch = !filters.search ||
      diligence.titre.toLowerCase().includes(filters.search.toLowerCase()) ||
      diligence.directiondestinataire.toLowerCase().includes(filters.search.toLowerCase()) ||
      (diligence.destinataire &&
        (Array.isArray(diligence.destinataire)
          ? diligence.destinataire.some(dest => dest.toLowerCase().includes(filters.search.toLowerCase()))
          : diligence.destinataire.toLowerCase().includes(filters.search.toLowerCase())));

    const matchStatut = !filters.statut || diligence.statut === filters.statut;
    const matchPriorite = !filters.priorite || diligence.priorite === filters.priorite;

    return matchSearch && matchStatut && matchPriorite;
  });

  // Calculs de pagination
  const totalItems = filteredDiligences.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDiligences = filteredDiligences.slice(startIndex, endIndex);

  // Réinitialiser la page quand les filtres changent
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      statut: '',
      priorite: '',
      dateDebut: '',
      dateFin: ''
    });
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getStatutColor = (statut: string) => {
    switch(statut) {
      case "En cours": return "bg-blue-50 text-blue-700 border border-blue-200";
      case "Terminé": return "bg-green-50 text-green-700 border border-green-200";
      case "Planifié": return "bg-orange-50 text-orange-700 border border-orange-200";
      case "En retard": return "bg-red-50 text-red-700 border border-red-200";
      default: return "bg-gray-50 text-gray-700 border border-gray-200";
    }
  };

  const getPrioriteColor = (priorite: string) => {
    switch(priorite) {
      case "Haute": return "bg-red-50 text-red-700 border border-red-200";
      case "Moyenne": return "bg-orange-50 text-orange-700 border border-orange-200";
      case "Basse": return "bg-green-50 text-green-700 border border-green-200";
      default: return "bg-gray-50 text-gray-700 border border-gray-200";
    }
  };

  // Formater la date pour l'affichage
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  // Convertir les IDs des destinataires en noms d'utilisateurs
  const getDestinataireNames = (diligence: Diligence): string[] => {
    if (!diligence.destinataire && !diligence.destinataire_details) return ["Non spécifié"];
    
    try {
      // Utiliser d'abord destinataire_details si disponible (depuis l'API mise à jour)
      if (diligence.destinataire_details && Array.isArray(diligence.destinataire_details) && diligence.destinataire_details.length > 0) {
        // Filtrer les entrées problématiques
        const validDetails = diligence.destinataire_details.filter(dest =>
          dest &&
          dest.id !== '[object Object]' &&
          dest.name !== 'Utilisateur [object Object]' &&
          !dest.name?.includes('[object Object]')
        );
        
        if (validDetails.length > 0) {
          return validDetails.map(dest => dest.name || `Utilisateur ${dest.id}`);
        }
      }
      
      // Sinon, traiter l'ancien format avec les IDs
      let destinataireIds: string[] = [];
      const destinataire = diligence.destinataire;
      
      if (typeof destinataire === 'string') {
        try {
          const parsed = JSON.parse(destinataire);
          destinataireIds = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
        } catch {
          destinataireIds = [destinataire];
        }
      } else if (Array.isArray(destinataire)) {
        destinataireIds = destinataire.map(String);
      } else {
        return ["Non spécifié"];
      }
      
      // Filtrer les IDs problématiques
      const validIds = destinataireIds.filter(id =>
        id !== '[object Object]' &&
        id !== 'Utilisateur [object Object]' &&
        id !== null &&
        id !== undefined
      );
      
      const result = validIds.map(id => {
        const user = users.find(u => String(u.id) === String(id));
        return user ? user.name : `Utilisateur ${id}`;
      });
      
      return result.length > 0 ? result : ["Non spécifié"];
    } catch (error) {
      console.error('Erreur lors de la conversion des destinataires:', error);
      return ["Non spécifié"];
    }
  };

  // Vérifier si l'utilisateur courant est un destinataire de la diligence
  const isCurrentUserDestinataire = (diligence: Diligence): boolean => {
    if (!currentUser || !diligence.destinataire) return false;
    
    try {
      let destinataireIds: string[] = [];
      
      // Parser les destinataires
      if (typeof diligence.destinataire === 'string') {
        try {
          const parsed = JSON.parse(diligence.destinataire);
          destinataireIds = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
        } catch {
          destinataireIds = [diligence.destinataire];
        }
      } else if (Array.isArray(diligence.destinataire)) {
        destinataireIds = diligence.destinataire.map(String);
      }
      
      // Vérifier si l'utilisateur courant est dans la liste des destinataires
      return destinataireIds.some(id => String(id) === String(currentUser.id));
    } catch (error) {
      console.error('Erreur lors de la vérification des destinataires:', error);
      return false;
    }
  };

  // Vérifier si l'utilisateur peut supprimer la diligence
  const canDeleteDiligence = (diligence: Diligence): boolean => {
    // Les administrateurs peuvent toujours supprimer
    if (currentUser?.role?.toLowerCase().includes('admin')) {
      return true;
    }
    
    // Les utilisateurs normaux ne peuvent pas supprimer s'ils sont destinataires
    return !isCurrentUserDestinataire(diligence);
  };

  // Vérifier si l'utilisateur peut modifier la diligence
  const canEditDiligence = (diligence: Diligence): boolean => {
    // Les administrateurs peuvent toujours modifier
    if (currentUser?.role?.toLowerCase().includes('admin')) {
      return true;
    }
    
    // Les utilisateurs normaux ne peuvent pas modifier s'ils sont destinataires
    return !isCurrentUserDestinataire(diligence);
  };

  // Composant de pagination
  const Pagination = () => {
    const getPageNumbers = () => {
      const pages = [];
      const maxVisible = 5;

      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        if (currentPage <= 3) {
          for (let i = 1; i <= 4; i++) {
            pages.push(i);
          }
          pages.push('...');
          pages.push(totalPages);
        } else if (currentPage >= totalPages - 2) {
          pages.push(1);
          pages.push('...');
          for (let i = totalPages - 3; i <= totalPages; i++) {
            pages.push(i);
          }
        } else {
          pages.push(1);
          pages.push('...');
          for (let i = currentPage - 1; i <= currentPage + 1; i++) {
            pages.push(i);
          }
          pages.push('...');
          pages.push(totalPages);
        }
      }

      return pages;
    };

    if (totalPages <= 1) return null;

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between mt-6 px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="flex items-center text-sm text-gray-700 mb-4 sm:mb-0">
          <span>
            Affichage de {startIndex + 1} à {Math.min(endIndex, totalItems)} sur {totalItems} résultats
          </span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              const newItemsPerPage = Number(e.target.value);
              setItemsPerPage(newItemsPerPage);
              localStorage.setItem('diligenceItemsPerPage', newItemsPerPage.toString());
              setCurrentPage(1);
            }}
            className="ml-4 border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value={6}>6 par page</option>
            <option value={12}>12 par page</option>
            <option value={24}>24 par page</option>
          </select>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            Précédent
          </button>

          {getPageNumbers().map((page, index) => (
            <button
              key={index}
              onClick={() => typeof page === 'number' && handlePageChange(page)}
              disabled={page === '...'}
              className={`px-3 py-2 text-sm font-medium border rounded-md transition-all duration-200 ${
                page === currentPage
                  ? 'text-white bg-orange-500 border-orange-500 shadow-md'
                  : page === '...'
                  ? 'text-gray-400 bg-white border-gray-300 cursor-default'
                  : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50 hover:shadow-sm'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            Suivant
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50">
        <Sidebar />
        <div className="pl-64 p-8 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-200 mx-auto mb-4"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent absolute top-0 left-1/2 transform -translate-x-1/2"></div>
            </div>
            <p className="text-gray-600 font-medium">Chargement des diligences...</p>
            <div className="mt-2 flex justify-center space-x-1">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50">
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <Sidebar />
      <div className="pl-64 p-8 min-h-screen animate-fade-in">
        {/* Header avec statistiques */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-6">
            <div className="mb-6 lg:mb-0">
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">
                Gestion des Diligences
              </h1>
              <p className="text-gray-600 text-base lg:text-lg">Suivi et gestion des missions de diligence gouvernementales</p>
            </div>
            <button
              onClick={handleCreateDiligence}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 lg:px-8 py-3 lg:py-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 animate-bounce-in"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Nouvelle Diligence</span>
            </button>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-300 animate-slide-in-up stagger-1">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-blue-100">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{allDiligences.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-300 animate-slide-in-up stagger-2">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-blue-100">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">En cours</p>
                  <p className="text-2xl font-bold text-blue-600">{allDiligences.filter(d => d.statut === 'En cours').length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-300 animate-slide-in-up stagger-3">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-green-100">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Terminées</p>
                  <p className="text-2xl font-bold text-green-600">{allDiligences.filter(d => d.statut === 'Terminé').length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-300 animate-slide-in-up stagger-4">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-red-100">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">En retard</p>
                  <p className="text-2xl font-bold text-red-600">{allDiligences.filter(d => d.statut === 'En retard').length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filtres et contrôles */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-200 animate-slide-in-up">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rechercher</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Titre, direction, destinataire..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all duration-300 bg-white text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
              <select
                value={filters.statut}
                onChange={(e) => handleFilterChange('statut', e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white text-gray-900 appearance-none border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all duration-300"
              >
                <option value="">Tous les statuts</option>
                <option value="En cours">En cours</option>
                <option value="Planifié">Planifié</option>
                <option value="Terminé">Terminé</option>
                <option value="En retard">En retard</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priorité</label>
              <select
                value={filters.priorite}
                onChange={(e) => handleFilterChange('priorite', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all duration-300 text-gray-900"
              >
                <option value="">Toutes priorités</option>
                <option value="Haute">Haute</option>
                <option value="Moyenne">Moyenne</option>
                <option value="Basse">Basse</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date début</label>
              <input
                type="date"
                value={filters.dateDebut}
                onChange={(e) => handleFilterChange('dateDebut', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all duration-300 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date fin</label>
              <input
                type="date"
                value={filters.dateFin}
                onChange={(e) => handleFilterChange('dateFin', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all duration-300 text-gray-900"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <button
              onClick={resetFilters}
              className="text-orange-600 hover:text-orange-700 font-medium text-sm transition-colors duration-200"
            >
              Réinitialiser les filtres
            </button>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setViewMode('table');
                    localStorage.setItem('diligenceViewMode', 'table');
                  }}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    viewMode === 'table'
                      ? 'bg-orange-100 text-orange-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    setViewMode('grid');
                    localStorage.setItem('diligenceViewMode', 'grid');
                  }}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    viewMode === 'grid'
                      ? 'bg-orange-100 text-orange-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Table des diligences */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-slide-in-up">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Titre
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Direction
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Priorité
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {paginatedDiligences.map((diligence, index) => (
                  <tr key={diligence.id} className="hover:bg-gradient-to-r hover:from-orange-50 hover:to-transparent transition-all duration-200 animate-slide-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{diligence.titre}</div>
                      <div className="text-sm text-gray-500">
                        {getDestinataireNames(diligence).join(', ')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{diligence.directiondestinataire}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(diligence.datedebut)} - {formatDate(diligence.datefin)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatutColor(diligence.statut)}`}>
                        {diligence.statut === 'En cours' && (
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        )}
                        {diligence.statut === 'Terminé' && (
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        {diligence.statut === 'Planifié' && (
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        )}
                        {diligence.statut === 'En retard' && (
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        {diligence.statut}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getPrioriteColor(diligence.priorite)}`}>
                        {diligence.priorite === 'Haute' && (
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                          </svg>
                        )}
                        {diligence.priorite === 'Moyenne' && (
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                          </svg>
                        )}
                        {diligence.priorite === 'Basse' && (
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                        )}
                        {diligence.priorite}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                        <Link
                          href={`/diligence/${diligence.id}`}
                          className="text-blue-600 hover:text-blue-900 transition-colors duration-200 flex items-center space-x-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span className="hidden sm:inline">Voir</span>
                        </Link>
                        {canEditDiligence(diligence) && (
                          <button
                            onClick={() => handleEditDiligence(diligence)}
                            className="text-orange-600 hover:text-orange-900 transition-colors duration-200 flex items-center space-x-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span className="hidden sm:inline">Modifier</span>
                          </button>
                        )}
                        {canDeleteDiligence(diligence) && (
                          <button
                            onClick={() => handleDeleteDiligence(diligence)}
                            className="text-red-600 hover:text-red-900 transition-colors duration-200 flex items-center space-x-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span className="hidden sm:inline">Supprimer</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {totalItems === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200 mt-6 animate-slide-in-up">
            <div className="max-w-sm mx-auto">
              <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune diligence</h3>
              <p className="text-gray-600 mb-6">
                Commencez par créer votre première diligence.
              </p>
              <button
                onClick={handleCreateDiligence}
                className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-300"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Créer une diligence
              </button>
            </div>
          </div>
        )}

        {totalItems > 0 && <Pagination />}

        {/* Modals */}
        {showForm && (
          <DiligenceForm
            initialData={editingDiligence ? {
              titre: editingDiligence.titre,
              directionDestinataire: editingDiligence.directiondestinataire,
              dateDebut: editingDiligence.datedebut,
              dateFin: editingDiligence.datefin,
              description: editingDiligence.description,
              priorite: editingDiligence.priorite,
              statut: editingDiligence.statut,
              destinataire: Array.isArray(editingDiligence.destinataire)
                ? editingDiligence.destinataire
                : editingDiligence.destinataire ? [editingDiligence.destinataire] : [],
              piecesJointes: editingDiligence.piecesjointes
            } : undefined}
            onClose={() => {
              setShowForm(false);
              setEditingDiligence(null);
            }}
            onSubmit={handleFormSubmit}
          />
        )}

        {showDeleteModal && (
          <DeleteModal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={confirmDelete}
            itemName={diligenceToDelete?.titre || ''}
            itemType="diligence"
          />
        )}

      </div>
    </div>
  );
}
