"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api/client";
import { useNotifications } from "@/contexts/NotificationContext";

interface ArchiveDiligence {
  id: number;
  titre: string;
  directiondestinataire: string;
  datedebut: string;
  datefin: string;
  description: string;
  priorite: string;
  statut: string;
  progression: number;
  created_by: number;
  created_by_name: string;
  assigned_to: number;
  assigned_name: string;
  archived: boolean;
  archived_at: string;
  archived_by: number;
  archived_by_name: string;
  destinataire_details: Array<{
    id: number;
    name: string;
    email: string;
  }>;
}

export default function ArchivesPage() {
  const [archivedDiligences, setArchivedDiligences] = useState<ArchiveDiligence[]>([]);
  const [loading, setLoading] = useState(true);
  const { addNotification } = useNotifications();

  useEffect(() => {
    fetchArchivedDiligences();
  }, []);

  const fetchArchivedDiligences = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getArchivedDiligences();
      setArchivedDiligences(response);
    } catch (error) {
      console.error("Erreur lors de la récupération des archives:", error);
      addNotification("Erreur lors du chargement des archives", "error");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadgeClass = () => {
    return "bg-blue-100 text-blue-800";
  };

  const getStatusText = () => {
    return "Archivé";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow p-6">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">📁 Archives des Diligences</h1>
          <p className="text-gray-600 mt-2">
            Liste de toutes les diligences terminées et validées
          </p>
        </div>

        {archivedDiligences.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-gray-400 text-6xl mb-4">📂</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune diligence archivée
            </h3>
            <p className="text-gray-600">
              Les diligences approuvées apparaîtront ici automatiquement.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {archivedDiligences.map((diligence) => (
              <div
                key={diligence.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {diligence.titre}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">
                      Direction: {diligence.directiondestinataire}
                    </p>
                    <p className="text-gray-600 text-sm">
                      Période: {formatDate(diligence.datedebut)} - {formatDate(diligence.datefin)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass()}`}
                    >
                      {getStatusText()}
                    </span>
                    <p className="text-gray-500 text-xs mt-1">
                      Archivé le {formatDate(diligence.archived_at)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Créateur</h4>
                    <p className="text-gray-600 text-sm">{diligence.created_by_name}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Destinataires</h4>
                    <div className="flex flex-wrap gap-1">
                      {diligence.destinataire_details.map((dest) => (
                        <span
                          key={dest.id}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                        >
                          {dest.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    Archivé par: {diligence.archived_by_name}
                  </div>
                  <Link
                    href={`/diligence/${diligence.id}`}
                    className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                  >
                    Voir les détails →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}