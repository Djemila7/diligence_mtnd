"use client";

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';

interface User {
  id: number;
  email: string;
  name: string;
  role?: string;
  direction?: string;
}

interface DiligenceData {
  titre: string;
  directionDestinataire: string;
  dateDebut: string;
  dateFin: string;
  description: string;
  priorite: string;
  statut: string;
  destinataire: string[];
  piecesJointes: string[];
}

interface DiligenceFormProps {
  onClose: () => void;
  onSubmit: (formData: DiligenceData & { piecesJointesFiles: File[] }) => void;
  initialData?: Partial<DiligenceData>;
}

export default function DiligenceForm({ onClose, onSubmit, initialData }: DiligenceFormProps) {
  const [formData, setFormData] = useState({
    titre: '',
    directionDestinataire: '',
    dateDebut: '',
    dateFin: '',
    description: '',
    priorite: 'Moyenne',
    statut: 'Planifié',
    destinataire: [] as string[],
    piecesJointes: [] as string[]
  });
  const [piecesJointesFiles, setPiecesJointesFiles] = useState<File[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Charger les utilisateurs depuis notre API
  useEffect(() => {
    const loadUsers = async () => {
      try {
        console.log('Chargement des utilisateurs depuis API...');
        const response = await apiClient.getUsers();
        console.log('Réponse API utilisateurs:', response);
        
        const formattedUsers = response.map((user: { id: number; email?: string; name?: string; role?: string; direction?: string }) => ({
          id: user.id,
          email: user.email || 'Email non défini',
          name: user.name || user.email || `Utilisateur ${user.id}`,
          role: user.role || 'user',
          direction: user.direction || ''
        }));

        console.log('Utilisateurs formatés:', formattedUsers);
        setUsers(formattedUsers);
      } catch (error) {
        console.error('Erreur lors du chargement des utilisateurs:', error);
        // Fallback en cas d'erreur
        setUsers([
          { id: 1, email: 'admin@example.com', name: 'Administrateur', role: 'admin', direction: '' },
          { id: 2, email: 'user1@example.com', name: 'Utilisateur 1', role: 'user', direction: '' },
          { id: 3, email: 'user2@example.com', name: 'Utilisateur 2', role: 'user', direction: '' }
        ]);
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, []);

  // Remplir le formulaire si on modifie une diligence existante
  useEffect(() => {
    if (initialData) {
      setFormData({
        titre: initialData.titre || '',
        directionDestinataire: initialData.directionDestinataire || '',
        dateDebut: initialData.dateDebut || '',
        dateFin: initialData.dateFin || '',
        description: initialData.description || '',
        priorite: initialData.priorite || 'Moyenne',
        statut: initialData.statut || 'Planifié',
        destinataire: Array.isArray(initialData.destinataire)
          ? initialData.destinataire
          : initialData.destinataire ? [initialData.destinataire] : [],
        piecesJointes: initialData.piecesJointes || []
      });
    }
  }, [initialData]);

  // Mettre à jour automatiquement la direction quand un destinataire est sélectionné
  useEffect(() => {
    if (formData.destinataire.length > 0) {
      const selectedUserId = parseInt(formData.destinataire[0]); // Prendre le premier destinataire
      const selectedUser = users.find(user => user.id === selectedUserId);
      
      if (selectedUser && selectedUser.direction) {
        setFormData(prev => ({
          ...prev,
          directionDestinataire: selectedUser.direction || ''
        }));
      }
    }
  }, [formData.destinataire, users]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Créer un objet avec les données du formulaire
    const diligenceData = {
      ...formData,
      piecesJointes: formData.piecesJointes, // Noms des fichiers
      piecesJointesFiles: piecesJointesFiles // Objets File pour l'upload
    };

    // Convertir les destinataires en tableau si ce n'est pas déjà le cas
    const finalData = {
      ...diligenceData,
      destinataire: Array.isArray(diligenceData.destinataire)
        ? diligenceData.destinataire
        : diligenceData.destinataire ? [diligenceData.destinataire] : []
    };
    
    onSubmit(finalData as DiligenceData & { piecesJointesFiles: File[] });
  };

  const getPiecesJointes = (piecesJointes: string[] | string): string[] => {
    if (Array.isArray(piecesJointes)) {
      return piecesJointes;
    }

    try {
      if (typeof piecesJointes === 'string') {
        const parsed = JSON.parse(piecesJointes);
        return Array.isArray(parsed) ? parsed : [];
      }
      return [];
    } catch (error) {
      console.error('Erreur lors du parsing des pièces jointes:', error);
      return [];
    }
  };

  const isEditing = !!initialData;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
      onClick={onClose}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-200 animate-slide-in-up" onClick={(e) => e.stopPropagation()}>
        <div className="p-8">
          {/* Header amélioré */}
          <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                {isEditing ? (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  {isEditing ? 'Modifier la Diligence' : 'Nouvelle Diligence'}
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  {isEditing ? 'Modifiez les informations de la diligence' : 'Renseignez les informations de la nouvelle diligence'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Section Informations principales */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Informations principales
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Titre de la diligence *
                    </span>
                  </label>
                  <input
                    type="text"
                    className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all duration-300 bg-white text-gray-900 placeholder-gray-500 shadow-sm hover:shadow-md"
                    value={formData.titre}
                    onChange={(e) => setFormData({...formData, titre: e.target.value})}
                    placeholder="Ex: Audit financier ministère"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Direction du destinataire *
                    </span>
                  </label>
                  <input
                    type="text"
                    className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all duration-300 bg-white text-gray-900 placeholder-gray-500 shadow-sm hover:shadow-md"
                    value={formData.directionDestinataire}
                    onChange={(e) => setFormData({...formData, directionDestinataire: e.target.value})}
                    placeholder="Ex: Direction des Finances"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Destinataires *
                    </span>
                  </label>
                  <div className="relative">
                    <select
                      multiple
                      className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all duration-300 bg-white text-gray-900 appearance-none shadow-sm hover:shadow-md min-h-32"
                      value={formData.destinataire}
                      onChange={(e) => {
                        const selectedOptions = Array.from(e.target.selectedOptions);
                        const selectedValues = selectedOptions.map(option => option.value);
                        setFormData({...formData, destinataire: selectedValues});
                      }}
                      required
                      disabled={loadingUsers}
                    >
                      {loadingUsers ? (
                        <option value="">Chargement des utilisateurs...</option>
                      ) : (
                        users.map(user => (
                          <option key={user.id} value={user.id.toString()}>
                            {user.name} ({user.email})
                          </option>
                        ))
                      )}
                    </select>
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Maintenez Ctrl (ou Cmd) pour sélectionner plusieurs destinataires
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Priorité
                    </span>
                  </label>
                  <div className="relative">
                    <select
                      className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all duration-300 bg-white text-gray-900 appearance-none shadow-sm hover:shadow-md"
                      value={formData.priorite}
                      onChange={(e) => setFormData({...formData, priorite: e.target.value})}
                    >
                      <option value="Haute">🔴 Haute</option>
                      <option value="Moyenne">🟡 Moyenne</option>
                      <option value="Basse">🟢 Basse</option>
                    </select>
                    <svg className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {isEditing && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Statut
                      </span>
                    </label>
                    <div className="relative">
                      <select
                        className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all duration-300 bg-white text-gray-900 appearance-none shadow-sm hover:shadow-md"
                        value={formData.statut}
                        onChange={(e) => setFormData({...formData, statut: e.target.value})}
                      >
                        <option value="Planifié">📅 Planifié</option>
                        <option value="En cours">🔄 En cours</option>
                        <option value="Terminé">✅ Terminé</option>
                        <option value="En retard">⚠️ En retard</option>
                      </select>
                      <svg className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section Dates */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Période de réalisation
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-7 4h12l-.5 5a2 2 0 01-2 1.5H8a2 2 0 01-2-1.5L5.5 14z" />
                      </svg>
                      Date de début *
                    </span>
                  </label>
                  <input
                    type="date"
                    className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all duration-300 bg-white text-gray-900 shadow-sm hover:shadow-md"
                    value={formData.dateDebut}
                    onChange={(e) => setFormData({...formData, dateDebut: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-7 4h12l-.5 5a2 2 0 01-2 1.5H8a2 2 0 01-2-1.5L5.5 14z" />
                      </svg>
                      Date de fin prévue *
                    </span>
                  </label>
                  <input
                    type="date"
                    className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all duration-300 bg-white text-gray-900 shadow-sm hover:shadow-md"
                    value={formData.dateFin}
                    onChange={(e) => setFormData({...formData, dateFin: e.target.value})}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Section Description */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Description détaillée
              </h3>

              <textarea
                className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all duration-300 bg-white text-gray-900 placeholder-gray-500 shadow-sm hover:shadow-md"
                rows={5}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Décrivez les objectifs et le périmètre de cette diligence..."
                required
              />
            </div>

            {/* Section Pièces jointes */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                Pièces jointes (PDF)
              </h3>

              <div className="space-y-4">
                <div className="flex flex-col space-y-2">
                  <input
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={(e) => {
                      if (e.target.files) {
                        const newFiles = Array.from(e.target.files);
                        setPiecesJointesFiles([...piecesJointesFiles, ...newFiles]);
                        setFormData({
                          ...formData,
                          piecesJointes: [...formData.piecesJointes, ...newFiles.map(file => file.name)]
                        });
                      }
                    }}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-4 px-6 rounded-xl border border-transparent transition-all duration-300 text-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    📄 Ajouter des fichiers PDF
                  </label>
                </div>

                {getPiecesJointes(formData.piecesJointes).length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Fichiers sélectionnés :</h4>
                    {getPiecesJointes(formData.piecesJointes).map((fileName, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex items-center space-x-3">
                          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm text-gray-900 truncate max-w-xs">
                            {fileName}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updatedFiles = [...piecesJointesFiles];
                            updatedFiles.splice(index, 1);
                            setPiecesJointesFiles(updatedFiles);

                            const updatedFileNames = [...formData.piecesJointes];
                            updatedFileNames.splice(index, 1);
                            setFormData({
                              ...formData,
                              piecesJointes: updatedFileNames
                            });
                          }}
                          className="text-red-500 hover:text-red-700 transition-colors duration-200 p-1 rounded-full hover:bg-red-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-8 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-all duration-300 shadow-sm hover:shadow-md"
              >
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Annuler
                </span>
              </button>
              <button
                type="submit"
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <span className="flex items-center">
                  {isEditing ? (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Modifier la Diligence
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Créer la Diligence
                    </>
                  )}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
