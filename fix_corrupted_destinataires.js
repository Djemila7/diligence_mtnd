// Script pour corriger les données corrompues dans la base de données
// Ce script va réparer les enregistrements où le champ destinataire contient [object Object]

import sqlite3 from 'sqlite3';
const { verbose } = sqlite3;
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemin vers la base de données
const dbPath = path.join(__dirname, 'database.sqlite');

console.log('🔧 Début de la correction des données corrompues...');

// Ouvrir la base de données
const db = new verbose().Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erreur lors de l\'ouverture de la base de données:', err.message);
    return;
  }
  console.log('✅ Connecté à la base de données SQLite.');

  // Trouver les diligences avec des données corrompues
  db.all("SELECT id, destinataire FROM diligences WHERE destinataire LIKE '%object Object%'", (err, rows) => {
    if (err) {
      console.error('❌ Erreur lors de la recherche des données corrompues:', err.message);
      db.close();
      return;
    }

    console.log(`📋 ${rows.length} diligence(s) avec des données corrompues trouvée(s):`);
    
    rows.forEach(row => {
      console.log(`- Diligence ID: ${row.id}, Destinataire: ${row.destinataire}`);
      
      // Pour chaque diligence corrompue, nous devons déterminer le bon ID de destinataire
      // Comme nous ne pouvons pas deviner l'ID correct, nous allons soit:
      // 1. Demander à l'utilisateur de spécifier l'ID correct
      // 2. Ou utiliser une valeur par défaut (comme l'ID de Djemila: 245)
      
      const correctDestinataireId = 245; // ID de Djemila
      
      console.log(`🔄 Correction de la diligence ${row.id} avec l'ID destinataire: ${correctDestinataireId}`);
      
      // Mettre à jour la base de données
      db.run(
        "UPDATE diligences SET destinataire = ? WHERE id = ?",
        [JSON.stringify([correctDestinataireId]), row.id],
        function(updateErr) {
          if (updateErr) {
            console.error(`❌ Erreur lors de la mise à jour de la diligence ${row.id}:`, updateErr.message);
          } else {
            console.log(`✅ Diligence ${row.id} corrigée avec succès`);
          }
        }
      );
    });

    if (rows.length === 0) {
      console.log('✅ Aucune donnée corrompue trouvée.');
    }

    // Fermer la base de données après un court délai pour laisser les mises à jour se terminer
    setTimeout(() => {
      db.close((closeErr) => {
        if (closeErr) {
          console.error('❌ Erreur lors de la fermeture:', closeErr.message);
        } else {
          console.log('✅ Base de données fermée.');
          console.log('🎉 Correction terminée ! Redémarrez l\'application pour voir les changements.');
        }
      });
    }, 1000);
  });
});