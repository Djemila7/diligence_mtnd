import { getDatabase } from '../database/db.js';

/**
 * Service de mise à jour automatique des statuts des diligences
 * Vérifie les dates d'échéance et met à jour les statuts en conséquence
 */
class DiligenceUpdater {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Vérifie et met à jour les statuts des diligences
   */
  async updateDiligenceStatuses() {
    if (this.isRunning) {
      console.log('⚠️ Mise à jour des diligences déjà en cours, skip...');
      return;
    }

    this.isRunning = true;
    console.log('🔄 Début de la mise à jour automatique des statuts des diligences...');

    try {
      const database = await getDatabase();
      const now = new Date().toISOString().split('T')[0]; // Date du jour au format YYYY-MM-DD

      // 1. Mettre à jour les diligences dont la date de fin est dépassée (statut → "En retard")
      const updateLateDiligences = await database.run(
        `UPDATE diligences 
         SET statut = 'En retard', updated_at = datetime('now')
         WHERE statut IN ('Planifié', 'En cours') 
         AND datefin < ? 
         AND datefin IS NOT NULL 
         AND datefin != ''`,
        [now]
      );

      if (updateLateDiligences.changes > 0) {
        console.log(`✅ ${updateLateDiligences.changes} diligence(s) marquée(s) comme "En retard"`);
      }

      // 2. Mettre à jour les diligences planifiées dont la date de début est atteinte (statut → "En cours")
      const updateStartedDiligences = await database.run(
        `UPDATE diligences 
         SET statut = 'En cours', updated_at = datetime('now')
         WHERE statut = 'Planifié' 
         AND datedebut <= ? 
         AND datedebut IS NOT NULL 
         AND datedebut != ''`,
        [now]
      );

      if (updateStartedDiligences.changes > 0) {
        console.log(`✅ ${updateStartedDiligences.changes} diligence(s) marquée(s) comme "En cours"`);
      }

      // 3. Mettre à jour les diligences terminées dont la date de fin est dans le futur (statut → "En cours")
      // Cela peut arriver si une diligence a été marquée manuellement comme terminée avant la date de fin
      const updateIncorrectlyFinished = await database.run(
        `UPDATE diligences 
         SET statut = 'En cours', updated_at = datetime('now')
         WHERE statut = 'Terminé' 
         AND datefin > ? 
         AND datefin IS NOT NULL 
         AND datefin != ''`,
        [now]
      );

      if (updateIncorrectlyFinished.changes > 0) {
        console.log(`⚠️ ${updateIncorrectlyFinished.changes} diligence(s) remise(s) en cours (terminée avant la date de fin)`);
      }

      console.log('✅ Mise à jour automatique des statuts terminée');

    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour automatique des statuts:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Démarre le service de mise à jour périodique
   * @param {number} intervalMinutes - Intervalle en minutes entre les mises à jour
   */
  startAutoUpdate(intervalMinutes = 5) {
    console.log(`🚀 Démarrage du service de mise à jour automatique (intervalle: ${intervalMinutes} minutes)`);
    
    // Exécuter immédiatement une première mise à jour
    this.updateDiligenceStatuses();
    
    // Configurer la mise à jour périodique
    this.intervalId = setInterval(() => {
      this.updateDiligenceStatuses();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Arrête le service de mise à jour périodique
   */
  stopAutoUpdate() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      console.log('⏹️ Service de mise à jour automatique arrêté');
    }
  }

  /**
   * Force une mise à jour immédiate (pour tests ou appels manuels)
   */
  async forceUpdate() {
    console.log('🔧 Mise à jour forcée des statuts des diligences...');
    await this.updateDiligenceStatuses();
  }
}

// Export singleton instance
export default new DiligenceUpdater();