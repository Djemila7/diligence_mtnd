/**
 * Client API pour la mise à jour des statuts des diligences
 * Permet de forcer la mise à jour des échéances depuis le frontend
 */

import { apiClient } from './client.js';

export const diligenceUpdater = {
  /**
   * Force la mise à jour des statuts des diligences
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async forceUpdateStatuses() {
    try {
      const response = await fetch('/api/diligences/update-statuses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiClient.getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Erreur lors de la mise à jour forcée des statuts:', error);
      throw new Error(`Impossible de mettre à jour les statuts: ${error.message}`);
    }
  },

  /**
   * Vérifie si l'utilisateur a des échéances en retard
   * @param {number} userId - ID de l'utilisateur
   * @returns {Promise<{hasLateDiligences: boolean, count: number}>}
   */
  async checkUserLateDiligences(userId) {
    try {
      const diligences = await apiClient.getDiligences();
      
      const userLateDiligences = diligences.filter(diligence => {
        const isAssigned = diligence.assigned_to === userId ||
                         (Array.isArray(diligence.destinataire) && 
                          diligence.destinataire.includes(userId.toString())) ||
                         diligence.created_by === userId;
        
        return isAssigned && diligence.statut === 'En retard';
      });

      return {
        hasLateDiligences: userLateDiligences.length > 0,
        count: userLateDiligences.length,
        diligences: userLateDiligences
      };
    } catch (error) {
      console.error('Erreur lors de la vérification des échéances en retard:', error);
      throw new Error(`Impossible de vérifier les échéances en retard: ${error.message}`);
    }
  },

  /**
   * Met à jour les échéances pour un utilisateur spécifique
   * @param {string} userEmail - Email de l'utilisateur
   * @returns {Promise<{success: boolean, updated: number}>}
   */
  async updateUserEcheances(userEmail) {
    try {
      // D'abord forcer la mise à jour globale
      const updateResult = await this.forceUpdateStatuses();
      
      // Ensuite vérifier les échéances de l'utilisateur
      const users = await apiClient.getUsers();
      const user = users.find(u => u.email === userEmail);
      
      if (!user) {
        throw new Error(`Utilisateur ${userEmail} non trouvé`);
      }

      const lateCheck = await this.checkUserLateDiligences(user.id);
      
      return {
        success: updateResult.success,
        updated: lateCheck.count,
        hasLateDiligences: lateCheck.hasLateDiligences,
        message: `Mise à jour terminée. ${lateCheck.count} échéance(s) en retard pour ${userEmail}`
      };
    } catch (error) {
      console.error('Erreur lors de la mise à jour des échéances utilisateur:', error);
      throw error;
    }
  }
};

export default diligenceUpdater;