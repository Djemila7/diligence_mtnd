// Script pour initialiser la base de données avec le schéma complet
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'database.sqlite');
const schemaPath = join(__dirname, 'src', 'database', 'schema.sql');

console.log('🔧 Initialisation de la base de données...');

// Vérifier si le fichier de schéma existe
if (!fs.existsSync(schemaPath)) {
  console.error('❌ Fichier de schéma non trouvé:', schemaPath);
  process.exit(1);
}

// Lire le schéma SQL
const schema = fs.readFileSync(schemaPath, 'utf8');
const db = new sqlite3.Database(dbPath);

console.log('📋 Exécution du schéma SQL...');

// Exécuter le schéma SQL complet
db.exec(schema, (err) => {
  if (err) {
    console.error('❌ Erreur lors de l\'exécution du schéma:', err);
    db.close();
    process.exit(1);
  }
  
  console.log('✅ Base de données initialisée avec succès !');
  console.log('📊 Tables créées:');
  
  // Lister toutes les tables pour vérification
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
      console.error('❌ Erreur lors de la liste des tables:', err);
    } else {
      tables.forEach(table => {
        console.log(`   - ${table.name}`);
      });
    }
    
    // Vérifier la structure de la table diligences
    db.all("PRAGMA table_info(diligences)", (err, columns) => {
      if (err) {
        console.error('❌ Erreur lors de la vérification de la table diligences:', err);
      } else {
        console.log('\n📋 Colonnes de la table diligences:');
        columns.forEach(col => {
          console.log(`   - ${col.name} (${col.type})`);
        });
      }
      
      db.close();
      console.log('\n🚀 Base de données prête !');
    });
  });
});