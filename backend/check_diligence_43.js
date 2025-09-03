// Script pour vérifier la diligence ID 43
import { getDatabase } from './src/database/db.js';

async function checkDiligence() {
  try {
    const database = await getDatabase();
    
    // Vérifier la diligence 43
    const diligence = await database.get(
      'SELECT id, titre, statut, archived, created_by FROM diligences WHERE id = ?', 
      [43]
    );
    
    console.log('🔍 Diligence 43:', diligence);
    
    if (!diligence) {
      console.log('❌ Diligence 43 non trouvée');
      return;
    }
    
    // Vérifier les validations existantes
    const validations = await database.all(
      'SELECT * FROM diligence_validations WHERE diligence_id = ?', 
      [43]
    );
    
    console.log('✅ Validations existantes:', validations);
    
    // Vérifier le créateur de la diligence
    const creator = await database.get(
      'SELECT id, name, email FROM users WHERE id = ?', 
      [diligence.created_by]
    );
    
    console.log('👤 Créateur de la diligence:', creator);
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
  }
}

checkDiligence();