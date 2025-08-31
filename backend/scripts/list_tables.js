import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'database.sqlite');

console.log('📋 Liste des tables dans la base de données...\n');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erreur ouverture DB:', err.message);
    process.exit(1);
  }
  console.log('✅ Connecté à la base de données SQLite');
});

// Lister toutes les tables
db.all(`SELECT name FROM sqlite_master WHERE type='table'`, (err, tables) => {
  if (err) {
    console.error('❌ Erreur lecture tables:', err.message);
    db.close();
    return;
  }

  console.log('📊 Tables disponibles:');
  tables.forEach((table, index) => {
    console.log(`${index + 1}. ${table.name}`);
  });

  // Vérifier spécifiquement smtp_config
  const hasSmtpTable = tables.some(table => table.name === 'smtp_config');
  console.log('\n🔍 Table smtp_config:', hasSmtpTable ? '✅ PRÉSENTE' : '❌ ABSENTE');

  if (!hasSmtpTable) {
    console.log('\n💡 La table smtp_config doit être créée pour sauvegarder la configuration SMTP');
    console.log('📋 Structure attendue:');
    console.log('CREATE TABLE smtp_config (');
    console.log('  id INTEGER PRIMARY KEY AUTOINCREMENT,');
    console.log('  host TEXT NOT NULL,');
    console.log('  port INTEGER NOT NULL,');
    console.log('  secure INTEGER DEFAULT 0,');
    console.log('  user TEXT NOT NULL,');
    console.log('  password TEXT NOT NULL,');
    console.log('  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP');
    console.log(');');
  }

  db.close();
});