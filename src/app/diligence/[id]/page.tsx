"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { apiClient } from "@/lib/api/client";

interface Diligence {
  id: number;
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
  assigned_name?: string;
  created_by_name?: string;
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

  useEffect(() => {
    const fetchDiligence = async () => {
      try {
        setLoading(true);
        const diligences = await apiClient.getDiligences();
        const foundDiligence = diligences.find((d: Diligence) => d.id.toString() === diligenceId);
        
        if (foundDiligence) {
          setDiligence(foundDiligence);
        } else {
          setError("Diligence non trouvée");
        }
      } catch (err) {
        console.error("Erreur lors du chargement de la diligence:", err);
        setError("Erreur lors du chargement des données");
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

    if (diligenceId) {
      fetchDiligence();
      fetchUsers();
    }
  }, [diligenceId]);

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
        return diligence.destinataire_details.map(dest => dest.name || `Utilisateur ${dest.id}`);
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
      
      const result = destinataireIds.map(id => {
        const user = users.find(u => String(u.id) === String(id));
        return user ? user.name : `Utilisateur ${id}`;
      });
      
      return result;
    } catch (error) {
      console.error('Erreur lors de la conversion des destinataires:', error);
      return ["Erreur d'affichage"];
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
                  <label className="block text-sm font-medium text-gray-600 mb-1">Destinataires</label>
                  <div className="space-y-1">
                    {getDestinataireNames(diligence).map((name, index) => (
                      <p key={index} className="text-gray-800 text-sm">
                        • {name}
                      </p>
                    ))}
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
            <Link
              href={`/diligence?edit=${diligence.id}`}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Modifier
            </Link>
            <button className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors">
              Historique
            </button>
            <button className="bg-red-100 hover:bg-red-200 text-red-700 px-6 py-2 rounded-lg font-medium transition-colors">
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}