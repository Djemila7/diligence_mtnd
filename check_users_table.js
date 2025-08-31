import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'database.sqlite');

console.log('🔍 Vérification de la structure de la table users...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erreur connexion DB:', err.message);
    return;
  }
  console.log('✅ Connecté à la base de données');
});

// Vérifier la structure de la table
db.all("PRAGMA table_info(users)", (err, rows) => {
  if (err) {
    console.error('❌ Erreur PRAGMA:', err.message);
    db.close();
    return;
  }
  
  console.log('\n📋 Structure de la table users:');
  rows.forEach(row => {
    console.log(`- ${row.name} (${row.type}) ${row.pk ? 'PRIMARY KEY' : ''} ${row.notnull ? 'NOT NULL' : ''}`);
  });
  
  // Vérifier les contraintes d'unicité
  db.all("SELECT * FROM sqlite_master WHERE type='table' AND name='users'", (err, tables) => {
    if (err) {
      console.error('❌ Erreur sqlite_master:', err.message);
      db.close();
      return;
    }
    
    if (tables.length > 0) {
      console.log('\n🔍 Contraintes de la table:');
      const sql = tables[0].sql;
      if (sql.includes('UNIQUE')) {
        console.log('❌ Contrainte UNIQUE encore présente');
        console.log('Extrait:', sql.match(/UNIQUE[^,)]*/)?.[0] || 'UNIQUE trouvé');
      } else {
        console.log('✅ Aucune contrainte UNIQUE trouvée');
      }
    }
    
    db.close();
  });
});

db.on('close', () => {
  console.log('\n🔚 Connexion fermée');
});