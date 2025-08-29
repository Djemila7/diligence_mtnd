"use client";
import { useState, useEffect } from "react";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (userData: {
    email: string;
    password: string;
    name: string;
    role: string;
    direction: string;
  }) => Promise<void>;
  editingUser?: {
    id: string;
    email?: string;
    name?: string;
    role?: string;
    direction?: string;
  };
  isEditing?: boolean;
}

export default function CreateUserModal({ isOpen, onClose, onCreate, editingUser, isEditing = false }: CreateUserModalProps) {
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    role: "user",
    password: "",
    direction: ""
  });

  // Réinitialiser les données lorsque le modal s'ouvre/ferme ou que l'utilisateur à éditer change
  useEffect(() => {
    if (isOpen) {
      setUserData({
        name: editingUser?.name || "",
        email: editingUser?.email || "",
        role: editingUser?.role || "user",
        password: "", // Touvider le mot de passe pour l'édition
        direction: editingUser?.direction || ""
      });
    }
  }, [isOpen, editingUser]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    // Validation : l'email doit être valide
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      setError("Veuillez entrer une adresse email valide");
      setLoading(false);
      return;
    }
    
    try {
      await onCreate(userData);
      onClose();
      setUserData({
        name: "",
        email: "",
        role: "user",
        password: "",
        direction: ""
      });
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-white/30" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-6 text-gray-800">
            👤 {isEditing ? 'Modifier l\'utilisateur' : 'Créer un nouvel utilisateur'}
          </h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom complet
                </label>
                <input
                  type="text"
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-colors text-gray-900"
                  value={userData.name}
                  onChange={(e) => setUserData({...userData, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-colors text-gray-900"
                  value={userData.email}
                  onChange={(e) => setUserData({...userData, email: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe
                </label>
                <input
                  type="password"
                  required={!isEditing}
                  minLength={6}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-colors text-gray-900"
                  value={userData.password}
                  onChange={(e) => setUserData({...userData, password: e.target.value})}
                  placeholder={isEditing ? "Laisser vide pour ne pas modifier" : ""}
                />
                {isEditing && (
                  <p className="text-sm text-gray-500 mt-1">
                    Laisser vide pour ne pas modifier le mot de passe
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rôle
                </label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-colors text-gray-900"
                  value={userData.role}
                  onChange={(e) => setUserData({...userData, role: e.target.value})}
                >
                  <option value="admin">Administrateur</option>
                  <option value="user">Utilisateur</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Direction
                </label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-colors text-gray-900"
                  value={userData.direction}
                  onChange={(e) => setUserData({...userData, direction: e.target.value})}
                  placeholder="Direction de l'utilisateur"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                disabled={loading}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                disabled={loading}
              >
                {loading ? (isEditing ? "Modification..." : "Création...") : (isEditing ? "Modifier" : "Créer")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}