// Script pour ajouter les colonnes manquantes à la table diligences
import { getDatabase } from './src/database/db.js';

async function addMissingColumns() {
  try {
    const database = await getDatabase();
    
    console.log('🔧 Ajout des colonnes manquantes à la table diligences...');
    
    // Ajouter la colonne archived si elle n'existe pas
    try {
      await database.run('ALTER TABLE diligences ADD COLUMN archived BOOLEAN DEFAULT 0');
      console.log('✅ Colonne "archived" ajoutée avec succès');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('ℹ️ Colonne "archived" existe déjà');
      } else {
        throw error;
      }
    }
    
    // Ajouter la colonne archived_at si elle n'existe pas
    try {
      await database.run('ALTER TABLE diligences ADD COLUMN archived_at DATETIME');
      console.log('✅ Colonne "archived_at" ajoutée avec succès');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('ℹ️ Colonne "archived_at" existe déjà');
      } else {
        throw error;
      }
    }
    
    console.log('✅ Mise à jour de la structure de la base de données terminée');
    
    // Vérifier la nouvelle structure
    const columns = await database.all('PRAGMA table_info(diligences)');
    console.log('\n🔍 Nouvelle structure de la table diligences:');
    columns.forEach(col => {
      console.log(`   - ${col.name} (${col.type})`);
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout des colonnes:', error);
  }
}

addMissingColumns();