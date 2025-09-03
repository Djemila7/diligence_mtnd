// Script pour vérifier la structure exacte de la table diligences
import { getDatabase } from './src/database/db.js';

async function checkStructure() {
  try {
    const database = await getDatabase();
    
    // Vérifier toutes les colonnes de la table diligences
    const columns = await database.all('PRAGMA table_info(diligences)');
    
    console.log('🔍 Structure de la table diligences:');
    columns.forEach(col => {
      console.log(`   - ${col.name} (${col.type})`);
    });
    
    // Vérifier si la colonne 'archived' existe
    const hasArchived = columns.some(col => col.name === 'archived');
    console.log(`\n✅ Colonne 'archived' existe: ${hasArchived}`);
    
    // Vérifier si la colonne 'statut' ou 'status' existe
    const hasStatut = columns.some(col => col.name === 'statut');
    const hasStatus = columns.some(col => col.name === 'status');
    console.log(`✅ Colonne 'statut' existe: ${hasStatut}`);
    console.log(`✅ Colonne 'status' existe: ${hasStatus}`);
    
    // Vérifier quelques enregistrements pour voir les noms de colonnes réels
    const sample = await database.get('SELECT * FROM diligences LIMIT 1');
    if (sample) {
      console.log('\n🔍 Noms de colonnes réels dans un enregistrement:');
      Object.keys(sample).forEach(key => {
        console.log(`   - ${key}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification de la structure:', error);
  }
}

checkStructure();