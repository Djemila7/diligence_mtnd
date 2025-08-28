"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";

interface Diligence {
  id: number;
  nom: string;
  client: string;
  statut: string;
  created_at: string;
  assigned_to?: number;
  assigned_user?: {
    id: number;
    name: string;
    email: string;
  };
}

interface DiligenceNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDiligenceClick: (diligenceId: number) => void;
}

export function DiligenceNotificationsModal({
  isOpen,
  onClose,
  onDiligenceClick
}: DiligenceNotificationsModalProps) {
  const [recentDiligences, setRecentDiligences] = useState<Diligence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchRecentDiligences();
    }
  }, [isOpen]);

  const fetchRecentDiligences = async () => {
    try {
      setLoading(true);
      const diligences = await apiClient.getDiligences();
      
      if (Array.isArray(diligences)) {
        // Trier par date de création (les plus récentes d'abord)
        const sortedDiligences = diligences
          .filter((d: Diligence) => d.created_at)
          .sort((a: Diligence, b: Diligence) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          .slice(0, 10); // Limiter à 10 dernières

        setRecentDiligences(sortedDiligences);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des diligences récentes:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffDays > 0) {
      return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    } else if (diffMinutes > 0) {
      return `Il y a ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    } else {
      return "À l'instant";
    }
  };

  const getStatusColor = (statut: string) => {
    switch (statut.toLowerCase()) {
      case 'en cours':
        return 'bg-blue-100 text-blue-800';
      case 'terminé':
        return 'bg-green-100 text-green-800';
      case 'planifié':
        return 'bg-orange-100 text-orange-800';
      case 'en retard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Diligences récentes</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
              <p className="text-gray-600 mt-2">Chargement des diligences...</p>
            </div>
          ) : recentDiligences.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">Aucune diligence récente</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentDiligences.map((diligence) => (
                <div
                  key={diligence.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onDiligenceClick(diligence.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 text-sm mb-1">
                        {diligence.nom}
                      </h4>
                      {diligence.client && (
                        <p className="text-gray-600 text-xs mb-2">
                          Client: {diligence.client}
                        </p>
                      )}
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(diligence.statut)}`}>
                          {diligence.statut}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(diligence.created_at)}
                        </span>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-gray-400 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}