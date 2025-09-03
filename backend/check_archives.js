// Script pour vérifier l'état des archives
import { initializeDatabase, getDatabase } from './src/database/db.js';

async function checkArchives() {
  try {
    await initializeDatabase();
    const database = await getDatabase();
    
    console.log('🔍 Vérification de l\'état des archives...');
    
    // Vérifier si la table diligence_archives existe
    const archivesTable = await database.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='diligence_archives'"
    );
    
    if (!archivesTable) {
      console.log('❌ Table diligence_archives non trouvée');
      return;
    }
    
    console.log('✅ Table diligence_archives existe');
    
    // Compter les entrées dans diligence_archives
    const archivesCount = await database.get(
      "SELECT COUNT(*) as count FROM diligence_archives"
    );
    console.log(`📊 Nombre d\'entrées dans diligence_archives: ${archivesCount.count}`);
    
    // Vérifier les diligences archivées
    const archivedDiligences = await database.all(
      "SELECT id, titre, statut, archived, archived_at FROM diligences WHERE archived = 1"
    );
    
    console.log(`📊 Nombre de diligences archivées: ${archivedDiligences.length}`);
    
    if (archivedDiligences.length > 0) {
      console.log('📋 Liste des diligences archivées:');
      archivedDiligences.forEach(d => {
        console.log(`   - ID: ${d.id}, Titre: ${d.titre}, Statut: ${d.statut}, Archivée le: ${d.archived_at}`);
      });
    }
    
    // Vérifier la correspondance entre diligences archivées et table d'archives
    const archivesWithDiligences = await database.all(`
      SELECT da.*, d.titre, d.statut 
      FROM diligence_archives da
      LEFT JOIN diligences d ON da.diligence_id = d.id
      ORDER BY da.archived_at DESC
    `);
    
    console.log(`📊 Correspondance archives-diligences: ${archivesWithDiligences.length} entrées`);
    
    if (archivesWithDiligences.length > 0) {
      console.log('📋 Dernières validations archivées:');
      archivesWithDiligences.slice(0, 5).forEach(archive => {
        console.log(`   - Diligence ID: ${archive.diligence_id}, Titre: ${archive.titre}, Statut: ${archive.statut}`);
        console.log(`     Validation: ${archive.validation_status}, Archivée le: ${archive.archived_at}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des archives:', error);
  }
}

checkArchives();