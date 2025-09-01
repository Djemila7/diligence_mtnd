"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { apiClient } from "@/lib/api/client";
import DiligenceValidation from "@/components/DiligenceValidation";

interface Diligence {
  id: number;
  titre: string;
  directiondestinataire: string;
  datedebut: string;
  datefin: string;
  description: string;
  priorite: "Haute" | "Moyenne" | "Basse";
  statut: "Planifié" | "En cours" | "Terminé" | "En retard" | "À valider";
  destinataire: string | string[] | null;
  destinataire_details?: { id: string; name: string; email: string }[];
  piecesjointes: string[];
  progression: number;
  created_at: string;
  updated_at: string;
  assigned_name?: string;
  created_by_name?: string;
  created_by?: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export default function DiligenceDetailPage() {
  const params = useParams();
  const diligenceId = params.id as string;
  const [diligence, setDiligence] = useState<Diligence | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [statusUpdated, setStatusUpdated] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fonction pour sauvegarder la diligence dans le cache local
  const saveDiligenceToCache = (diligenceData: Diligence) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`diligence_${diligenceId}`, JSON.stringify({
        data: diligenceData,
        timestamp: Date.now()
      }));
    }
  };

  // Fonction pour récupérer la diligence depuis le cache local
  const getDiligenceFromCache = (): Diligence | null => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(`diligence_${diligenceId}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Vérifier si le cache est encore valide (5 minutes)
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          return data;
        }
      }
    }
    return null;
  };

  useEffect(() => {
    const fetchDiligence = async () => {
      try {
        setLoading(true);
        
        // Vérifier d'abord le cache local
        const cachedDiligence = getDiligenceFromCache();
        if (cachedDiligence) {
          setDiligence(cachedDiligence);
        }
        
        // Toujours récupérer les données fraîches du serveur
        const foundDiligence = await apiClient.getDiligence(diligenceId);
        
        if (foundDiligence) {
          setDiligence(foundDiligence);
          // Sauvegarder dans le cache local
          saveDiligenceToCache(foundDiligence);
        } else {
          setError("Diligence non trouvée");
        }
      } catch (err) {
        console.error("Erreur lors du chargement de la diligence:", err);
        // Si on a une erreur mais qu'on a des données en cache, on les utilise
        if (!diligence && getDiligenceFromCache()) {
          setDiligence(getDiligenceFromCache());
        } else {
          setError("Erreur lors du chargement des données");
        }
      } finally {
        setLoading(false);
      }
    };

    const fetchUsers = async () => {
      try {
        const usersData = await apiClient.getUsers();
        setUsers(usersData);
      } catch (err) {
        console.error("Erreur lors du chargement des utilisateurs:", err);
      }
    };

    const fetchCurrentUser = async () => {
      try {
        const userData = await apiClient.getCurrentUser();
        if (userData) {
          setCurrentUser({
            id: userData.id.toString(),
            name: userData.name || userData.email || 'Utilisateur',
            email: userData.email || '',
            role: userData.role || 'user'
          });
        }
      } catch (err) {
        console.error("Erreur lors du chargement de l'utilisateur courant:", err);
      }
    };

    if (diligenceId) {
      fetchDiligence();
      fetchUsers();
      fetchCurrentUser();
    }
  }, [diligenceId, refreshTrigger]);

  // Vérifier si l'utilisateur courant est un destinataire de la diligence
  const isCurrentUserRecipient = (diligence: Diligence, currentUser: User | null): boolean => {
    if (!currentUser) return false;
    
    try {
      console.log('=== DÉBUT VÉRIFICATION DESTINATAIRE ===');
      console.log('Utilisateur courant:', currentUser);
      console.log('Diligence ID:', diligence.id);
      console.log('Destinataire brut:', diligence.destinataire);
      console.log('Destinataire details:', diligence.destinataire_details);
      console.log('Créé par:', diligence.created_by_name);
      
      // Vérifier via destinataire_details si disponible
      if (diligence.destinataire_details && Array.isArray(diligence.destinataire_details)) {
        console.log('Vérification via destinataire_details...');
        console.log('Contenu détaillé destinataire_details:', JSON.stringify(diligence.destinataire_details, null, 2));
        
        // Vérifier si les données contiennent des [object Object] mal formatés
        const hasMalformedData = diligence.destinataire_details.some(dest =>
          dest.id === '[object Object]' || dest.name === 'Utilisateur [object Object]'
        );
        
        if (hasMalformedData) {
          console.log('⚠️ Données mal formatées détectées dans destinataire_details - utilisation du format de secours');
          
          // Extraire les IDs réels à partir des données mal formatées
          const realRecipientIds: string[] = [];
          
          // Essayer de récupérer les IDs depuis le champ destinataire brut
          if (diligence.destinataire) {
            try {
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
              }
              
              realRecipientIds.push(...destinataireIds);
              console.log('IDs réels extraits du champ destinataire:', realRecipientIds);
              console.log('Contenu détaillé du champ destinataire brut:', diligence.destinataire);
            } catch (error) {
              console.error('Erreur lors de l\'extraction des IDs réels:', error);
            }
          }
          
          // Vérifier par ID réel
          const isRecipientById = realRecipientIds.includes(String(currentUser.id));
          const isRecipientByEmail = realRecipientIds.includes(currentUser.email);
          const isRecipientByName = realRecipientIds.includes(currentUser.name);
          
          console.log('Destinataire par ID (secours):', isRecipientById, `(User ID: ${currentUser.id})`);
          console.log('Destinataire par email (secours):', isRecipientByEmail, `(User email: ${currentUser.email})`);
          console.log('Destinataire par nom (secours):', isRecipientByName, `(User name: ${currentUser.name})`);
          
          const result = isRecipientById || isRecipientByEmail || isRecipientByName;
          console.log('Résultat final via format de secours:', result);
          return result;
        }
        
        // Vérification normale si les données sont bien formatées
        const isRecipientById = diligence.destinataire_details.some(dest =>
          String(dest.id) === String(currentUser.id)
        );
        const isRecipientByEmail = diligence.destinataire_details.some(dest =>
          dest.email === currentUser.email
        );
        const isRecipientByName = diligence.destinataire_details.some(dest =>
          dest.name === currentUser.name
        );
        
        console.log('Destinataire par ID:', isRecipientById, `(User ID: ${currentUser.id})`);
        console.log('Destinataire par email:', isRecipientByEmail, `(User email: ${currentUser.email})`);
        console.log('Destinataire par nom:', isRecipientByName, `(User name: ${currentUser.name})`);
        
        // Log chaque destinataire pour le débogage
        diligence.destinataire_details.forEach((dest, index) => {
          console.log(`Destinataire ${index}:`, `ID: ${dest.id}, Name: ${dest.name}, Email: ${dest.email}`);
        });
        
        const result = isRecipientById || isRecipientByEmail || isRecipientByName;
        console.log('Résultat final via destinataire_details:', result);
        return result;
      }
      
      // Vérifier via l'ancien format avec les IDs et emails
      console.log('Vérification via format ancien...');
      let destinataires: string[] = [];
      const destinataire = diligence.destinataire;
      
      if (typeof destinataire === 'string') {
        try {
          const parsed = JSON.parse(destinataire);
          destinataires = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
        } catch {
          destinataires = [destinataire];
        }
      } else if (Array.isArray(destinataire)) {
        destinataires = destinataire.map(String);
      }
      
      console.log('Destinataires trouvés:', destinataires);
      
      // Vérifier par ID
      const isRecipientById = destinataires.includes(String(currentUser.id));
      
      // Vérifier par email
      const isRecipientByEmail = destinataires.includes(currentUser.email);
      
      // Vérifier par nom (pour les cas où le nom est stocké directement)
      const isRecipientByName = destinataires.includes(currentUser.name);
      
      console.log('Est destinataire par ID:', isRecipientById);
      console.log('Est destinataire par email:', isRecipientByEmail);
      console.log('Est destinataire par nom:', isRecipientByName);
      
      const result = isRecipientById || isRecipientByEmail || isRecipientByName;
      console.log('Résultat final via format ancien:', result);
      console.log('=== FIN VÉRIFICATION DESTINATAIRE ===');
      
      return result;
    } catch (error) {
      console.error('Erreur lors de la vérification du destinataire:', error);
      return false;
    }
  };

  // Vérifier si l'utilisateur peut modifier la diligence
  const canEditDiligence = (diligence: Diligence, currentUser: User | null): boolean => {
    if (!currentUser) return false;
    
    // Les administrateurs peuvent toujours modifier
    if (currentUser.role === 'admin') return true;
    
    // Vérifier si l'utilisateur est un destinataire
    const isRecipient = isCurrentUserRecipient(diligence, currentUser);
    
    // Les destinataires ne peuvent pas modifier
    if (isRecipient) return false;
    
    // Pour les autres utilisateurs (créateur ou autres), permettre la modification
    return true;
  };

  // Vérifier si l'utilisateur peut supprimer la diligence
  const canDeleteDiligence = (diligence: Diligence, currentUser: User | null): boolean => {
    if (!currentUser) return false;
    
    // Les administrateurs peuvent toujours supprimer
    if (currentUser.role === 'admin') return true;
    
    // Vérifier si l'utilisateur est un destinataire
    const isRecipient = isCurrentUserRecipient(diligence, currentUser);
    
    // Les destinataires ne peuvent pas supprimer
    if (isRecipient) return false;
    
    // Pour les autres utilisateurs (créateur ou autres), permettre la suppression
    return true;
  };

  // Mettre à jour le statut de la diligence si nécessaire
  useEffect(() => {
    const updateDiligenceStatusIfNeeded = async () => {
      console.log('Vérification mise à jour statut - diligence:', diligence?.statut);
      console.log('Current user:', currentUser);
      console.log('Status déjà mis à jour:', statusUpdated);
      
      if (diligence && currentUser && diligence.statut === 'Planifié' && !statusUpdated) {
        console.log('Conditions de base remplies - vérification destinataire');
        
        // Vérifier si l'utilisateur courant est un destinataire
        const isRecipient = isCurrentUserRecipient(diligence, currentUser);
        console.log('=== RÉSULTAT VÉRIFICATION DESTINATAIRE ===');
        console.log('Utilisateur est destinataire:', isRecipient);
        console.log('Données complètes diligence:', diligence);
        console.log('Données complètes utilisateur:', currentUser);
        
        if (isRecipient) {
          console.log('Destinataire consultant la diligence - mise à jour du statut vers "En cours"');
          console.log('Diligence ID:', diligence.id);
          console.log('Données à envoyer:', {
            ...diligence,
            statut: 'En cours' as const
          });
          
          try {
            // Utiliser la nouvelle API pour marquer la diligence comme consultée
            const result = await apiClient.markDiligenceAsViewed(diligence.id, parseInt(currentUser.id));
            
            console.log('Résultat de la mise à jour automatique:', result);
            
            if (result.updated) {
              // Mettre à jour l'état local
              setDiligence(prev => prev ? { ...prev, statut: 'En cours' } : null);
              setStatusUpdated(true);
              console.log('Statut de la diligence mis à jour avec succès (En cours)');
            } else {
              console.log('Aucune mise à jour nécessaire ou utilisateur non destinataire');
            }
          } catch (error) {
            console.error('Erreur lors de la mise à jour automatique du statut:', error);
            if (error instanceof Error) {
              console.error('Message d\'erreur:', error.message);
            }
          }
        } else {
          console.log('Utilisateur n\'est pas destinataire - pas de mise à jour');
        }
      } else {
        console.log('Conditions non remplies pour la mise à jour automatique');
      }
    };

    updateDiligenceStatusIfNeeded();
  }, [diligence, currentUser, statusUpdated]);

  const handleDeleteDiligence = async () => {
    if (!diligence) return;
    
    try {
      await apiClient.deleteDiligence(parseInt(diligence.id.toString()));
      // Supprimer du cache local
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`diligence_${diligenceId}`);
      }
      // Rediriger vers la liste des diligences après suppression
      window.location.href = '/diligence';
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression de la diligence');
    }
  };

  // Mettre à jour le cache lorsque la diligence change
  useEffect(() => {
    if (diligence) {
      saveDiligenceToCache(diligence);
    }
  }, [diligence]);

  const confirmDelete = () => {
    setShowDeleteModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatutColor = (statut: string) => {
    switch(statut) {
      case "En cours": return "bg-blue-100 text-blue-800";
      case "Terminé": return "bg-green-100 text-green-800";
      case "Planifié": return "bg-orange-100 text-orange-800";
      case "En retard": return "bg-red-100 text-red-800";
      case "À valider": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPrioriteColor = (priorite: string) => {
    switch(priorite) {
      case "Haute": return "bg-red-100 text-red-800";
      case "Moyenne": return "bg-orange-100 text-orange-800";
      case "Basse": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPiecesJointes = (diligence: Diligence): string[] => {
    if (Array.isArray(diligence.piecesjointes)) {
      return diligence.piecesjointes;
    }
    
    try {
      if (typeof diligence.piecesjointes === 'string') {
        const parsed = JSON.parse(diligence.piecesjointes);
        return Array.isArray(parsed) ? parsed : [];
      }
      return [];
    } catch (error) {
      console.error('Erreur lors du parsing des pièces jointes:', error);
      return [];
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="pl-64 p-8 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement de la diligence...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !diligence) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="pl-64 p-8 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="bg-red-100 text-red-800 p-4 rounded-lg mb-4">
              <p className="font-medium">{error || "Diligence non trouvée"}</p>
            </div>
            <Link
              href="/diligence"
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              ← Retour à la liste des diligences
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="pl-64 p-8 min-h-screen">
        {/* Header avec bouton retour */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link
              href="/diligence"
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <span>←</span>
              <span>Retour</span>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Détails de la Diligence
              </h1>
              <p className="text-gray-600">Consultation complète des informations</p>
            </div>
          </div>
        </div>

        {/* Carte principale */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          {/* En-tête avec titre et statuts */}
          <div className="flex justify-between items-start mb-8">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {diligence.titre}
              </h2>
              <p className="text-gray-600 text-sm">
                Créée le {formatDate(diligence.created_at)}
              </p>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatutColor(diligence.statut)}`}>
                {diligence.statut}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPrioriteColor(diligence.priorite)}`}>
                {diligence.priorite}
              </span>
            </div>
          </div>

          {/* Grille d'informations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Informations générales</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Direction destinataire</label>
                  <p className="text-gray-800">{diligence.directiondestinataire}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    {isCurrentUserRecipient(diligence, currentUser) ? "Émetteur" : "Destinataires"}
                  </label>
                  <div className="space-y-1">
                    {isCurrentUserRecipient(diligence, currentUser) ? (
                      <p className="text-gray-800 text-sm">
                        {diligence.created_by_name || "Non spécifié"}
                      </p>
                    ) : (
                      getDestinataireNames(diligence).map((name, index) => (
                        <p key={index} className="text-gray-800 text-sm">
                          • {name}
                        </p>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Période</label>
                  <p className="text-gray-800">
                    Du {formatDate(diligence.datedebut)} au {formatDate(diligence.datefin)}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">État davancement</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Progression</label>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-orange-500 h-2.5 rounded-full" 
                      style={{ width: `${diligence.progression}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{diligence.progression}% complété</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Dernière mise à jour</label>
                  <p className="text-gray-800">{formatDate(diligence.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Description</h3>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-gray-800 whitespace-pre-wrap">{diligence.description}</p>
            </div>
          </div>

          {/* Pièces jointes */}
          {diligence.piecesjointes && getPiecesJointes(diligence).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Pièces jointes</h3>
              <div className="space-y-2">
                {getPiecesJointes(diligence).map((piece: string, index: number) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <span className="text-gray-800 text-sm">{piece}</span>
                    <button className="text-orange-600 hover:text-orange-800 text-sm font-medium">
                      Télécharger
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Actions</h3>
          <div className="flex space-x-4">
            {isCurrentUserRecipient(diligence, currentUser) ? (
              <Link
                href={`/diligence/${diligence.id}/traitement`}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Traiter la diligence
              </Link>
            ) : (
              <>
                {canEditDiligence(diligence, currentUser) && (
                  <Link
                    href={`/diligence?edit=${diligence.id}`}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Modifier
                  </Link>
                )}
                <button className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors">
                  Historique
                </button>
                {canDeleteDiligence(diligence, currentUser) && (
                  <button
                    onClick={confirmDelete}
                    className="bg-red-100 hover:bg-red-200 text-red-700 px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Supprimer
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Composant de validation */}
        <DiligenceValidation
          diligenceId={diligence.id}
          isCreator={diligence.created_by === parseInt(currentUser?.id || '0') || currentUser?.role === 'admin'}
          currentStatus={diligence.statut}
          onValidationComplete={() => {
            // Supprimer le cache local pour forcer le rechargement des données fraîches
            if (typeof window !== 'undefined') {
              localStorage.removeItem(`diligence_${diligenceId}`);
            }
            setRefreshTrigger(prev => prev + 1);
          }}
        />
      </div>

      {/* Modal de confirmation de suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Confirmer la suppression</h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer la diligence &quot;{diligence?.titre}&quot; ? Cette action est irréversible.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteDiligence}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}