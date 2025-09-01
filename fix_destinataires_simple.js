// Script simple pour corriger les données corrompues en utilisant la base de données du backend
import { initializeDatabase, getDatabase } from './backend/src/database/db.js';

async function fixCorruptedDestinataires() {
  console.log('🔧 Début de la correction des données corrompues...');

  try {
    const database = await getDatabase();
    
    // Trouver les diligences avec des données corrompues
    const corruptedRows = await database.all(
      "SELECT id, destinataire FROM diligences WHERE destinataire LIKE '%object Object%'"
    );

    console.log(`📋 ${corruptedRows.length} diligence(s) avec des données corrompues trouvée(s):`);
    
    for (const row of corruptedRows) {
      console.log(`- Diligence ID: ${row.id}, Destinataire: ${row.destinataire}`);
      
      // Corriger avec l'ID de Djemila (245)
      const correctDestinataireId = 245;
      
      console.log(`🔄 Correction de la diligence ${row.id} avec l'ID destinataire: ${correctDestinataireId}`);
      
      await database.run(
        "UPDATE diligences SET destinataire = ? WHERE id = ?",
        [JSON.stringify([correctDestinataireId]), row.id]
      );
      
      console.log(`✅ Diligence ${row.id} corrigée avec succès`);
    }

    if (corruptedRows.length === 0) {
      console.log('✅ Aucune donnée corrompue trouvée.');
    }

    console.log('🎉 Correction terminée ! Redémarrez l\'application pour voir les changements.');

  } catch (error) {
    console.error('❌ Erreur lors de la correction des données:', error.message);
  }
}

// Exécuter la fonction
fixCorruptedDestinataires();