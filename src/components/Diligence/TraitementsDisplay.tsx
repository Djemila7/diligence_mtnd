"use client";

import { FC } from "react";

interface Traitement {
  id: number;
  diligence_id: number;
  commentaire: string;
  progression: number;
  statut: "En cours" | "Terminé" | "À valider";
  created_at: string;
}

interface TraitementsDisplayProps {
  traitements: Traitement[];
  loading?: boolean;
}

const TraitementsDisplay: FC<TraitementsDisplayProps> = ({ traitements, loading = false }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatutColor = (statut: string) => {
    switch(statut) {
      case "En cours": return "bg-blue-100 text-blue-800";
      case "Terminé": return "bg-green-100 text-green-800";
      case "À valider": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 Traitements effectués</h3>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des traitements...</p>
        </div>
      </div>
    );
  }

  if (traitements.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 Traitements effectués</h3>
        <div className="text-center py-8">
          <p className="text-gray-500">Aucun traitement enregistré pour cette diligence</p>
        </div>
      </div>
    );
  }

  // Trier les traitements par date (du plus récent au plus ancien)
  const sortedTraitements = [...traitements].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">📋 Traitements effectués par le destinataire</h3>
      
      <div className="space-y-6">
        {sortedTraitements.map((traitement) => (
          <div key={traitement.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center space-x-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatutColor(traitement.statut)}`}>
                  {traitement.statut}
                </span>
                <span className="text-sm text-gray-500">
                  Progression: {traitement.progression}%
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {formatDate(traitement.created_at)}
              </span>
            </div>
            
            {traitement.commentaire && (
              <div className="mt-3">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Commentaire :</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded border border-gray-200">
                  {traitement.commentaire}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TraitementsDisplay;