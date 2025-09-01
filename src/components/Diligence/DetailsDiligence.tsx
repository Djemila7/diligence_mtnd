"use client";
import { FC, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";

interface DetailsDiligenceProps {
  id: string;
  title: string;
  description: string;
  date: string;
  status: "en_cours" | "termine" | "en_attente" | "en_retard" | "À valider";
  directionDestinataire: string;
  destinataire: string;
  echeance: string;
  documents: number;
  commentaires: number;
  priorite: "Haute" | "Moyenne" | "Basse";
  progression: number;
  created_by?: number;
  currentUserId?: number;
  onValidationComplete?: () => void;
}

const DetailsDiligence: FC<DetailsDiligenceProps> = ({
  id,
  title,
  description,
  date,
  status,
  directionDestinataire,
  destinataire,
  echeance,
  documents,
  commentaires,
  priorite,
  progression,
  created_by,
  currentUserId,
  onValidationComplete,
}) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comment, setComment] = useState("");

  const handleValidation = async (validationStatus: "approved" | "rejected") => {
    if (!id) return;
    
    setIsSubmitting(true);
    try {
      const response = await apiClient.validateDiligence(parseInt(id), validationStatus, comment);
      
      if (response.success) {
        // Rafraîchir les données si une fonction de callback est fournie
        if (onValidationComplete) {
          onValidationComplete();
        }
        // Réinitialiser le commentaire
        setComment("");
      } else {
        alert(response.error || "Erreur lors de la validation");
      }
    } catch (error) {
      console.error("Erreur lors de la validation:", error);
      alert("Erreur lors de la validation de la diligence");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Vérifier si l'utilisateur peut valider cette diligence
  const canValidate = created_by === currentUserId && status === "À valider";

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 w-full max-w-none">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-600
                   rounded-lg border border-orange-200 transition-colors shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="font-medium">Retour</span>
        </button>
        <h2 className="text-xl font-semibold text-gray-800">Détails de la diligence</h2>
        <div className="w-[72px]"></div> {/* Espace équivalent au bouton */}
      </div>
      
      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-gray-700">Titre</h3>
          <p className="text-gray-900">{title}</p>
        </div>

        <div>
          <h3 className="font-medium text-gray-700">Description</h3>
          <p className="text-gray-900">{description}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium text-gray-700">Date</h3>
            <p className="text-gray-900">{date}</p>
          </div>

          <div>
            <h3 className="font-medium text-gray-700">Statut</h3>
            <p className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              status === "termine"
                ? "bg-green-100 text-green-800"
                : status === "en_cours"
                  ? "bg-orange-100 text-orange-800"
                  : status === "en_retard"
                    ? "bg-red-100 text-red-800"
                    : status === "À valider"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
            }`}>
              {status === "termine"
                ? "Terminé"
                : status === "en_cours"
                  ? "En cours"
                  : status === "en_retard"
                    ? "En retard"
                    : status === "À valider"
                      ? "À valider"
                      : "En attente"}
            </p>
          </div>

          <div>
            <h3 className="font-medium text-gray-700">Priorité</h3>
            <p className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              priorite === "Haute"
                ? "bg-red-100 text-red-800"
                : priorite === "Moyenne"
                  ? "bg-orange-100 text-orange-800"
                  : "bg-green-100 text-green-800"
            }`}>
              {priorite}
            </p>
          </div>

          <div>
            <h3 className="font-medium text-gray-700">Progression</h3>
            <div className="flex items-center space-x-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progression}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-gray-600">{progression}%</span>
            </div>
          </div>
        </div>

        {/* Formulaire de validation pour l'émetteur */}
        {canValidate && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-800 mb-3">✅ Validation requise</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-yellow-700 mb-2">
                  Commentaire (optionnel)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Ajoutez un commentaire sur votre décision..."
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => handleValidation("approved")}
                  disabled={isSubmitting}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  {isSubmitting ? "Validation..." : "✅ Valider"}
                </button>
                
                <button
                  onClick={() => handleValidation("rejected")}
                  disabled={isSubmitting}
                  className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  {isSubmitting ? "Validation..." : "❌ Refuser"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DetailsDiligence;