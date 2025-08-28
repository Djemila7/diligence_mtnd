"use client";
import { useState, useEffect } from "react";
import CreateUserModal from "./CreateUserModal";
import DeleteModal from "../DeleteModal";

interface User {
  id: string;
  email?: string;
  name?: string;
  role?: string;
  direction?: string;
  created_at?: string;
}

export default function UtilisateursTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const users = await res.json();
      setUsers(users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: userToDelete.id }),
      });

      if (!response.ok) {
        let errorMessage = 'Erreur lors de la suppression';
        // Cloner la réponse pour pouvoir lire le corps plusieurs fois
        const responseClone = response.clone();
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          try {
            errorMessage = await responseClone.text() || errorMessage;
          } catch {
            errorMessage = `Erreur ${response.status}: ${response.statusText}`;
          }
        }
        throw new Error(errorMessage);
      }

      setSuccess("Utilisateur supprimé avec succès");
      fetchUsers();
    } catch (error: unknown) {
      console.error('Error deleting user:', error);
      setError(error instanceof Error ? error.message : "Erreur lors de la suppression de l'utilisateur");
    } finally {
      setDeleteModalOpen(false);
      setUserToDelete(null);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleCreateUser = async (userData: {
    email: string;
    password: string;
    name: string;
    role: string;
    direction: string;
  }) => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la création de l'utilisateur");
      }

      setSuccess("Utilisateur créé avec succès");
      fetchUsers();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Erreur lors de la création de l'utilisateur");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userData: {
    email: string;
    password: string;
    name: string;
    role: string;
    direction: string;
  }) => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/admin/users?id=${editingUser?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la modification de l'utilisateur");
      }

      setSuccess("Utilisateur modifié avec succès");
      fetchUsers();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Erreur lors de la modification de l'utilisateur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">👥 Gestion des utilisateurs</h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Nouvel utilisateur
          </button>
        </div>

        {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg">{error}</div>}
        {success && <div className="p-3 bg-green-50 text-green-700 rounded-lg">{success}</div>}

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-semibold mb-6 text-gray-800">📋 Liste des utilisateurs</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-3 font-semibold text-gray-700">Nom</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Email</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Direction</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Rôle</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Statut</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-3 text-gray-900">{user.name || 'N/A'}</td>
                    <td className="p-3 text-gray-900">{user.email}</td>
                    <td className="p-3 text-gray-900">{user.direction || 'Non spécifié'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs border ${
                        user.role === 'admin'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="bg-green-50 text-green-700 px-2 py-1 rounded-full text-xs border border-green-200">Actif</span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-orange-600 hover:text-orange-800 mr-2 transition-colors"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteClick(user)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <CreateUserModal
       isOpen={isModalOpen}
       onClose={() => {
         setIsModalOpen(false);
         setEditingUser(null);
       }}
       onCreate={editingUser ? handleUpdateUser : handleCreateUser}
       editingUser={editingUser || undefined}
       isEditing={!!editingUser}
     />

      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setUserToDelete(null);
        }}
        onConfirm={handleDeleteUser}
        itemName={userToDelete?.name || userToDelete?.email || "cet utilisateur"}
        itemType="utilisateur"
      />
    </>
  );
}