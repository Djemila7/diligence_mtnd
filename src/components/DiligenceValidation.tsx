"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api/client";
import { useNotifications } from "@/contexts/NotificationContext";

interface DiligenceValidationProps {
  diligenceId: number;
  isCreator: boolean;
  currentStatus: string;
  onValidationComplete: () => void;
}

export default function DiligenceValidation({
  diligenceId,
  isCreator,
  currentStatus,
  onValidationComplete
}: DiligenceValidationProps) {
  const [validationStatus, setValidationStatus] = useState<"approved" | "rejected" | "">("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addNotification } = useNotifications();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validationStatus) {
      addNotification("Veuillez sélectionner un statut de validation", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiClient.validateDiligence(diligenceId, validationStatus, comment);
      
      if (response.success) {
        addNotification(
          validationStatus === "approved" 
            ? "Diligence validée avec succès" 
            : "Diligence rejetée avec succès",
          "success"
        );
        setValidationStatus("");
        setComment("");
        onValidationComplete();
      } else {
        throw new Error(response.error || "Erreur lors de la validation");
      }
    } catch (error) {
      console.error("Erreur lors de la validation:", error);
      addNotification(
        error instanceof Error ? error.message : "Erreur lors de la validation",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Afficher le composant seulement si la diligence est à valider et que l'utilisateur est le créateur
  if (currentStatus !== "À valider" || !isCreator) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">✅ Validation de la diligence</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Statut de validation
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="validationStatus"
                value="approved"
                checked={validationStatus === "approved"}
                onChange={(e) => setValidationStatus(e.target.value as "approved")}
                className="text-green-500 focus:ring-green-500"
              />
              <span className="ml-2 text-sm text-gray-700">Approuver</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="validationStatus"
                value="rejected"
                checked={validationStatus === "rejected"}
                onChange={(e) => setValidationStatus(e.target.value as "rejected")}
                className="text-red-500 focus:ring-red-500"
              />
              <span className="ml-2 text-sm text-gray-700">Rejeter</span>
            </label>
          </div>
        </div>

        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
            Commentaire (optionnel)
          </label>
          <textarea
            id="comment"
            name="comment"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Ajoutez un commentaire sur votre décision de validation..."
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !validationStatus}
          className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          {isSubmitting ? "Validation..." : "Valider la décision"}
        </button>
      </form>
    </div>
  );
}