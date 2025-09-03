// Script pour vérifier spécifiquement la diligence 43
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

console.log('🔍 Vérification spécifique de la diligence 43...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erreur lors de l\'ouverture de la base de données:', err.message);
    return;
  }
  console.log('✅ Connecté à la base de données SQLite');

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
      console.error('Erreur lors de la récupération de la diligence 43:', err.message);
      db.close();
      return;
    }

    if (!row) {
      console.log('❌ Diligence 43 non trouvée dans la base de données');
    } else {
      console.log('\n📋 Détails de la diligence 43:');
      console.log(`   ID: ${row.id}`);
      console.log(`   Titre: ${row.titre}`);
      console.log(`   Statut: ${row.statut}`);
      console.log(`   Archivée: ${row.archived ? 'Oui' : 'Non'}`);
      console.log(`   Date d'archivage: ${row.archived_at || 'Non spécifiée'}`);
      console.log(`   Statut de validation: ${row.validation_status || 'Non spécifié'}`);
      console.log(`   Validé par: ${row.validated_by_name || 'Non spécifié'}`);
      console.log(`   Date de validation: ${row.validated_at || 'Non spécifiée'}`);
      
      if (row.statut === 'Terminé' && !row.archived) {
        console.log('\n⚠️  PROBLEME: La diligence est terminée mais non archivée!');
        console.log('   Le processus d\'archivage automatique ne fonctionne pas correctement.');
      }
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