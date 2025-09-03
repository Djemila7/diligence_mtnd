// Script pour vérifier les diligences archivées
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'backend', 'database.sqlite');

console.log('🔍 Vérification des diligences archivées...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erreur lors de l\'ouverture de la base de données:', err.message);
    return;
  }
  console.log('✅ Connecté à la base de données SQLite');

  // Vérifier les diligences archivées
  db.all(`
    SELECT d.id, d.titre, d.archived, d.archived_at, 
           va.validation_status, va.validated_at, 
           validator.name as validated_by_name
    FROM diligences d
    LEFT JOIN diligence_archives va ON d.id = va.diligence_id
    LEFT JOIN users validator ON va.validated_by = validator.id
    WHERE d.archived = 1
    ORDER BY d.archived_at DESC
  `, (err, rows) => {
    if (err) {
      console.error('Erreur lors de la récupération des archives:', err.message);
      db.close();
      return;
    }

    console.log(`\n📊 ${rows.length} diligence(s) archivée(s) trouvée(s):`);
    
    if (rows.length === 0) {
      console.log('ℹ️ Aucune diligence archivée dans la base de données.');
    } else {
      rows.forEach((row, index) => {
        console.log(`\n${index + 1}. ID: ${row.id}`);
        console.log(`   Titre: ${row.titre}`);
        console.log(`   Archivée: ${row.archived ? 'Oui' : 'Non'}`);
        console.log(`   Date d'archivage: ${row.archived_at || 'Non spécifiée'}`);
        console.log(`   Statut de validation: ${row.validation_status || 'Non spécifié'}`);
        console.log(`   Validé par: ${row.validated_by_name || 'Non spécifié'}`);
        console.log(`   Date de validation: ${row.validated_at || 'Non spécifiée'}`);
      });
    }

    // Vérifier aussi le nombre total de diligences
    db.get("SELECT COUNT(*) as total FROM diligences", (err, countRow) => {
      if (err) {
        console.error('Erreur lors du comptage total:', err.message);
      } else {
        console.log(`\n📈 Total des diligences dans la base: ${countRow.total}`);
      }

      db.close((closeErr) => {
        if (closeErr) {
          console.error('Erreur lors de la fermeture:', closeErr.message);
        } else {
          console.log('\n✅ Vérification terminée.');
        }
      });
    });
  });
});