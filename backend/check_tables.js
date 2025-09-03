// Script pour vérifier les tables de la base de données
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Vérification des tables de la base de données...');

// Vérifier toutes les tables
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
  if (err) {
    console.error('❌ Erreur lors de la récupération des tables:', err);
    db.close();
    return;
  }

  console.log('📋 Tables existantes:');
  tables.forEach(table => {
    console.log(`   - ${table.name}`);
  });

  // Vérifier la structure de chaque table importante
  const importantTables = ['diligences', 'diligence_validations', 'diligence_archives'];
  
  function checkTableStructure(tableName) {
    console.log(`\n🔍 Structure de la table ${tableName}:`);
    db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
      if (err) {
        console.error(`❌ Erreur lors de la vérification de la table ${tableName}:`, err.message);
      } else if (columns.length === 0) {
        console.log(`   ❌ Table ${tableName} n'existe pas ou est vide`);
      } else {
        columns.forEach(col => {
          console.log(`   - ${col.name} (${col.type})${col.notnull ? ' NOT NULL' : ''}${col.dflt_value ? ` DEFAULT ${col.dflt_value}` : ''}`);
        });
      }

      // Passer à la table suivante
      const nextTable = importantTables.shift();
      if (nextTable) {
        checkTableStructure(nextTable);
      } else {
        console.log('\n✅ Vérification des tables terminée');
        db.close();
      }
    });
  }

  // Commencer la vérification
  const firstTable = importantTables.shift();
  if (firstTable) {
    checkTableStructure(firstTable);
  } else {
    db.close();
  }
});