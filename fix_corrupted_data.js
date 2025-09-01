import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// Chemin vers la base de données
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'database.sqlite');

console.log('🔧 Début de la correction des données corrompues...');
console.log(`📁 Chemin de la base de données: ${dbPath}`);

// Ouvrir la base de données
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erreur lors de l\'ouverture de la base de données:', err.message);
    return;
  }
  console.log('✅ Connexion à la base de données SQLite établie');

  // Trouver les diligences avec des données corrompues
  db.all(
    "SELECT id, destinataire FROM diligences WHERE destinataire LIKE '%object Object%'",
    (err, rows) => {
      if (err) {
        console.error('❌ Erreur lors de la recherche des données corrompues:', err.message);
        db.close();
        return;
      }

      console.log(`📋 ${rows.length} diligence(s) avec des données corrompues trouvée(s):`);
      
      if (rows.length === 0) {
        console.log('✅ Aucune donnée corrompue trouvée.');
        db.close();
        return;
      }

      let correctedCount = 0;
      
      rows.forEach((row, index) => {
        console.log(`- Diligence ID: ${row.id}, Destinataire: ${row.destinataire}`);
        
        // Corriger avec l'ID de Djemila (245)
        const correctDestinataireId = 245;
        
        db.run(
          "UPDATE diligences SET destinataire = ? WHERE id = ?",
          [JSON.stringify([correctDestinataireId]), row.id],
          function(err) {
            if (err) {
              console.error(`❌ Erreur lors de la correction de la diligence ${row.id}:`, err.message);
            } else {
              console.log(`✅ Diligence ${row.id} corrigée avec succès`);
              correctedCount++;
            }

            // Fermer la base de données après la dernière correction
            if (index === rows.length - 1) {
              setTimeout(() => {
                console.log(`\n🎉 Correction terminée ! ${correctedCount}/${rows.length} diligences corrigées.`);
                console.log('🔄 Redémarrez l\'application pour voir les changements.');
                db.close();
              }, 100);
            }
          }
        );
      });
    }
  );
});