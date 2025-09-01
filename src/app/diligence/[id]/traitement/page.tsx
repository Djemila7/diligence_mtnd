"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
  statut: "Planifié" | "En cours" | "Terminé" | "En retard" | "À valider";
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

interface TraitementFormData {
  commentaire: string;
  fichiers: File[];
  progression: number;
  statut: "En cours" | "Terminé" | "À valider";
}

export default function TraitementDiligencePage() {
  const params = useParams();
  const router = useRouter();
  const diligenceId = params.id as string;
  const [diligence, setDiligence] = useState<Diligence | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [formData, setFormData] = useState<TraitementFormData>({
    commentaire: "",
    fichiers: [],
    progression: 0,
    statut: "En cours"
  });
  const [showSubmitButton, setShowSubmitButton] = useState(false);
  const [isReadyForValidation, setIsReadyForValidation] = useState(false);

  useEffect(() => {
    const fetchDiligence = async () => {
      try {
        setLoading(true);
        const diligences = await apiClient.getDiligences();
        const foundDiligence = diligences.find((d: Diligence) => d.id.toString() === diligenceId);
        
        if (foundDiligence) {
          setDiligence(foundDiligence);
          // Initialiser la progression avec la valeur actuelle
          setFormData(prev => ({
            ...prev,
            progression: foundDiligence.progression
          }));
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
      fetchCurrentUser();
    }
  }, [diligenceId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData(prev => ({
      ...prev,
      fichiers: [...prev.fichiers, ...files]
    }));
  };

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      fichiers: prev.fichiers.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Préparer les données pour l'envoi
      const formDataToSend = new FormData();
      formDataToSend.append('commentaire', formData.commentaire);
      formDataToSend.append('progression', formData.progression.toString());
      
      // Si c'est pour la validation finale, envoyer le statut "Terminé"
      const finalStatut = isReadyForValidation ? "Terminé" : formData.statut;
      formDataToSend.append('statut', finalStatut);
      
      // Ajouter les fichiers
      formData.fichiers.forEach((file) => {
        formDataToSend.append(`fichiers`, file);
      });

      // Utiliser la méthode de l'API client pour le traitement
      const result = await apiClient.traiterDiligence(parseInt(diligenceId), formDataToSend);

      if (result.success) {
        setSuccess(true);
        // Définir le message de succès approprié
        if (isReadyForValidation) {
          setSuccessMessage("La diligence a été soumise avec succès ! Redirection...");
        } else {
          setSuccessMessage("Traitement enregistré avec succès ! Redirection...");
        }
        setTimeout(() => {
          router.push(`/diligence/${diligenceId}`);
        }, 2000);
      } else {
        throw new Error(result.error || 'Erreur lors du traitement');
      }

    } catch (err) {
      console.error("Erreur lors du traitement de la diligence:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement du traitement");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitForValidation = () => {
    setIsReadyForValidation(true);
    setSubmitting(true);
    
    // Simuler la soumission du formulaire
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
    const form = document.querySelector('form');
    if (form) {
      form.dispatchEvent(submitEvent);
    } else {
      // Fallback: appeler handleSubmit directement
      handleSubmit(new Event('submit') as unknown as React.FormEvent);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
              href={`/diligence/${diligenceId}`}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <span>←</span>
              <span>Retour</span>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Traiter la Diligence
              </h1>
              <p className="text-gray-600">Soumission de documents et mise à jour du statut</p>
            </div>
          </div>
        </div>

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6">
            <p className="font-medium">{successMessage}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p className="font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Informations de la diligence */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Informations de la diligence</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Titre</label>
                <p className="text-gray-800 font-medium">{diligence.titre}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
                <p className="text-gray-800 text-sm">{diligence.description}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Période</label>
                <p className="text-gray-800 text-sm">
                  Du {formatDate(diligence.datedebut)} au {formatDate(diligence.datefin)}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Priorité</label>
                <p className="text-gray-800 text-sm">{diligence.priorite}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Statut actuel</label>
                <p className="text-gray-800 text-sm">{diligence.statut}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Progression actuelle</label>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                  <div 
                    className="bg-orange-500 h-2.5 rounded-full" 
                    style={{ width: `${diligence.progression}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600">{diligence.progression}% complété</p>
              </div>
            </div>
          </div>

          {/* Formulaire de traitement */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Formulaire de traitement</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Commentaire */}
              <div>
                <label htmlFor="commentaire" className="block text-sm font-medium text-gray-700 mb-2">
                  Commentaire sur le traitement
                </label>
                <textarea
                  id="commentaire"
                  name="commentaire"
                  rows={4}
                  value={formData.commentaire}
                  onChange={(e) => setFormData(prev => ({ ...prev, commentaire: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Décrivez le traitement effectué, les difficultés rencontrées, les résultats obtenus..."
                />
              </div>

              {/* Upload de fichiers */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Documents joints
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    id="fichiers"
                    name="fichiers"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="fichiers"
                    className="cursor-pointer bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors inline-block mb-3"
                  >
                    Sélectionner des fichiers
                  </label>
                  <p className="text-sm text-gray-500">
                    Formats acceptés: PDF, Word, Excel, Images (max 10MB par fichier)
                  </p>
                </div>

                {/* Liste des fichiers sélectionnés */}
                {formData.fichiers.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-gray-700">Fichiers sélectionnés:</p>
                    {formData.fichiers.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="text-sm text-gray-600 truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Progression */}
              <div>
                <label htmlFor="progression" className="block text-sm font-medium text-gray-700 mb-2">
                  Nouveau pourcentage de progression
                </label>
                <input
                  type="range"
                  id="progression"
                  name="progression"
                  min="0"
                  max="100"
                  step="5"
                  value={formData.progression}
                  onChange={(e) => setFormData(prev => ({ ...prev, progression: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-600">0%</span>
                  <span className="text-sm font-medium text-orange-600">{formData.progression}%</span>
                  <span className="text-sm text-gray-600">100%</span>
                </div>
              </div>

              {/* Statut */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nouveau statut
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                   <input
                     type="radio"
                     name="statut"
                     value="En cours"
                     checked={formData.statut === "En cours"}
                     onChange={(e) => {
                       setFormData(prev => ({ ...prev, statut: e.target.value as "En cours" | "Terminé" | "À valider" }));
                       setShowSubmitButton(false);
                     }}
                     className="text-orange-500 focus:ring-orange-500"
                   />
                   <span className="ml-2 text-sm text-gray-700">En cours</span>
                 </label>
                  <label className="flex items-center">
                   <input
                     type="radio"
                     name="statut"
                     value="Terminé"
                     checked={formData.statut === "Terminé"}
                     onChange={(e) => {
                       setFormData(prev => ({ ...prev, statut: e.target.value as "En cours" | "Terminé" | "À valider" }));
                       setShowSubmitButton(true);
                       setIsReadyForValidation(false);
                     }}
                     className="text-orange-500 focus:ring-orange-500"
                   />
                   <span className="ml-2 text-sm text-gray-700">Terminé (soumettre pour validation)</span>
                 </label>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex space-x-4 pt-4">
                {showSubmitButton && !isReadyForValidation ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSubmitForValidation}
                      disabled={submitting}
                      className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                      {submitting ? "Soumission..." : "Soumettre pour validation"}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setShowSubmitButton(false);
                        setFormData(prev => ({ ...prev, statut: "En cours" }));
                      }}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                      Annuler
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                      {submitting ? "Enregistrement..." : "Enregistrer le traitement"}
                    </button>
                    
                    <Link
                      href={`/diligence/${diligenceId}`}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                      Annuler
                    </Link>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}