// Script de test pour l'archivage automatique des diligences terminées
import { initializeDatabase, getDatabase } from './src/database/db.js';

async function testArchiveFinished() {
  try {
    console.log('🧪 Début du test d\'archivage automatique des diligences terminées...');
    
    const database = await getDatabase();
    
    // 1. Créer une diligence de test avec statut "Terminé" et date de mise à jour ancienne
    console.log('📋 Création d\'une diligence de test terminée...');
    
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayISO = yesterday.toISOString().split('T')[0];
    
    // Créer une diligence terminée avec une date de mise à jour ancienne
    const result = await database.run(
      `INSERT INTO diligences 
       (titre, directiondestinataire, datedebut, datefin, description, priorite, statut, 
        destinataire, piecesjointes, progression, created_by, assigned_to, updated_at, archived)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'Test Archivage Automatique',
        'Direction Test',
        '2025-01-01',
        '2025-01-10',
        'Diligence de test pour l\'archivage automatique',
        'Moyenne',
        'Terminé',
        '[]',
        '[]',
        100,
        1, // admin user
        1, // admin user
        yesterdayISO, // Mise à jour hier pour déclencher l'archivage
        0  // Non archivée
      ]
    );
    
    const diligenceId = result.lastID;
    console.log(`✅ Diligence de test créée avec ID: ${diligenceId}`);
    
    // 2. Vérifier l'état avant archivage
    const diligenceBefore = await database.get(
      'SELECT id, titre, statut, archived, archived_at, updated_at FROM diligences WHERE id = ?',
      [diligenceId]
    );
    
    console.log('📊 État avant archivage:');
    console.log(`   - ID: ${diligenceBefore.id}`);
    console.log(`   - Titre: ${diligenceBefore.titre}`);
    console.log(`   - Statut: ${diligenceBefore.statut}`);
    console.log(`   - Archivée: ${diligenceBefore.archived}`);
    console.log(`   - Date archivage: ${diligenceBefore.archived_at}`);
    console.log(`   - Dernière mise à jour: ${diligenceBefore.updated_at}`);
    
    // 3. Importer et exécuter le service d'archivage
    console.log('🔄 Exécution de l\'archivage automatique...');
    
    const diligenceUpdater = await import('./src/services/diligenceUpdater.js');
    await diligenceUpdater.default.forceUpdate();
    
    // 4. Vérifier l'état après archivage
    const diligenceAfter = await database.get(
      'SELECT id, titre, statut, archived, archived_at, updated_at FROM diligences WHERE id = ?',
      [diligenceId]
    );
    
    console.log('📊 État après archivage:');
    console.log(`   - ID: ${diligenceAfter.id}`);
    console.log(`   - Titre: ${diligenceAfter.titre}`);
    console.log(`   - Statut: ${diligenceAfter.statut}`);
    console.log(`   - Archivée: ${diligenceAfter.archived}`);
    console.log(`   - Date archivage: ${diligenceAfter.archived_at}`);
    console.log(`   - Dernière mise à jour: ${diligenceAfter.updated_at}`);
    
    // 5. Vérifier le résultat
    if (diligenceAfter.archived === 1 && diligenceAfter.archived_at !== null) {
      console.log('✅ TEST RÉUSSI: La diligence a été archivée automatiquement !');
    } else {
      console.log('❌ TEST ÉCHOUÉ: La diligence n\'a pas été archivée');
    }
    
    // 6. Nettoyer - supprimer la diligence de test
    await database.run('DELETE FROM diligences WHERE id = ?', [diligenceId]);
    console.log('🧹 Diligence de test nettoyée');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Exécuter le test
initializeDatabase()
  .then(() => testArchiveFinished())
  .catch(error => {
    console.error('❌ Erreur d\'initialisation de la base de données:', error);
    process.exit(1);
  });