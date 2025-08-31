import { getDatabase } from './backend/src/database/db.js';

async function checkDatabase() {
  try {
    const db = await getDatabase();
    
    // Vérifier si la table smtp_config existe
    const tables = await db.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='smtp_config'
    `);
    
    console.log('📊 Tables dans la base de données:');
    const allTables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
    console.log(allTables.map(t => t.name).join(', '));
    
    if (tables.length > 0) {
      console.log('✅ Table smtp_config existe');
      
      // Vérifier le contenu de la table
      const configs = await db.all('SELECT * FROM smtp_config');
      console.log('📋 Contenu de la table smtp_config:');
      console.log(configs);
      
      // Vérifier la structure de la table
      const columns = await db.all('PRAGMA table_info(smtp_config)');
      console.log('🏗️ Structure de la table smtp_config:');
      console.log(columns);
    } else {
      console.log('❌ Table smtp_config n\'existe pas');
      
      // Vérifier si le schéma a été exécuté
      const schemaCheck = await db.all(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name IN ('users', 'diligences')
      `);
      
      if (schemaCheck.length >= 2) {
        console.log('⚠️ Le schéma a été exécuté mais smtp_config manque');
      } else {
        console.log('⚠️ Le schéma n\'a pas été exécuté correctement');
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification de la base de données:', error);
  }
}

checkDatabase();