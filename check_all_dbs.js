// Script pour vérifier la diligence 43 dans toutes les bases de données
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Vérifier les deux bases de données
const dbPaths = [
  path.join(__dirname, 'backend', 'database.sqlite'),
  path.join(__dirname, 'database.sqlite')
];

console.log('🔍 Vérification de la diligence 43 dans toutes les bases de données...');

async function checkDatabase(dbPath, dbName) {
  return new Promise((resolve, reject) => {
    console.log(`\n📁 Vérification de la base: ${dbName}`);
    
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error(`❌ Erreur avec ${dbName}:`, err.message);
        resolve(false);
        return;
      }

      // Vérifier si la table diligences existe
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='diligences'", (err, table) => {
        if (err || !table) {
          console.log(`ℹ️ Table 'diligences' non trouvée dans ${dbName}`);
          db.close();
          resolve(false);
          return;
        }

        // Vérifier la diligence 43
        db.get(`
          SELECT d.*, 
                 va.validation_status, va.validated_at, va.comment as validation_comment,
                 validator.name as validated_by_name
          FROM diligences d
          LEFT JOIN diligence_archives va ON d.id = va.diligence_id
          LEFT JOIN users validator ON va.validated_by = validator.id
          WHERE d.id = 43
        `, (err, row) => {
          if (err) {
            console.error(`❌ Erreur avec ${dbName}:`, err.message);
            db.close();
            resolve(false);
            return;
          }

          if (!row) {
            console.log(`❌ Diligence 43 non trouvée dans ${dbName}`);
          } else {
            console.log(`✅ Diligence 43 trouvée dans ${dbName}:`);
            console.log(`   Titre: ${row.titre}`);
            console.log(`   Statut: ${row.statut}`);
            console.log(`   Archivée: ${row.archived ? 'Oui' : 'Non'}`);
            console.log(`   Date d'archivage: ${row.archived_at || 'Non spécifiée'}`);
            console.log(`   Statut de validation: ${row.validation_status || 'Non spécifié'}`);
            
            if (row.statut === 'Terminé' && !row.archived) {
              console.log('⚠️  PROBLEME: La diligence est terminée mais non archivée!');
            }
          }

          db.close((closeErr) => {
            if (closeErr) {
              console.error(`❌ Erreur fermeture ${dbName}:`, closeErr.message);
            }
            resolve(!!row);
          });
        });
      });
    });
  });
}

async function main() {
  let found = false;
  
  for (const dbPath of dbPaths) {
    const dbName = path.basename(dbPath);
    const exists = await checkDatabase(dbPath, dbName);
    if (exists) {
      found = true;
    }
  }

  if (!found) {
    console.log('\n❌ Diligence 43 non trouvée dans aucune base de données.');
    console.log('ℹ️ Vérifiez que la diligence existe et a été correctement validée.');
  }

  console.log('\n✅ Vérification terminée.');
}

main().catch(console.error);