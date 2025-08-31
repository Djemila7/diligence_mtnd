import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'database.sqlite');

console.log('🔧 Création de la table smtp_config...\n');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erreur ouverture DB:', err.message);
    process.exit(1);
  }
  console.log('✅ Connecté à la base de données SQLite');
});

// SQL pour créer la table smtp_config avec la structure complète
const createTableSQL = `
CREATE TABLE IF NOT EXISTS smtp_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  host TEXT NOT NULL,
  port INTEGER NOT NULL,
  secure INTEGER DEFAULT 0,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

db.run(createTableSQL, function(err) {
  if (err) {
    console.error('❌ Erreur création table:', err.message);
    db.close();
    return;
  }

  console.log('✅ Table smtp_config créée avec succès !');

  // Vérifier que la table existe maintenant
  db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='smtp_config'`, (err, table) => {
    if (err) {
      console.error('❌ Erreur vérification table:', err.message);
    } else if (table) {
      console.log('📋 Table smtp_config confirmée: ✅ PRÉSENTE');
      
      // Insérer une configuration SMTP par défaut (Gmail)
      const insertConfigSQL = `
        INSERT INTO smtp_config (host, port, secure, username, password, from_email, from_name, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `;
      
      const gmailConfig = [
        'smtp.gmail.com',
        465,
        1,
        'tiabohdjemila7@gmail.com',
        'bdqg kyuw gdxz jlvx',
        'noreply@gouv.ci',
        'Système de Diligence'
      ];

      db.run(insertConfigSQL, gmailConfig, function(err) {
        if (err) {
          console.error('❌ Erreur insertion config:', err.message);
        } else {
          console.log('✅ Configuration SMTP insérée avec succès !');
          console.log('📧 Host: smtp.gmail.com');
          console.log('🚪 Port: 465 (SSL)');
          console.log('👤 User: tiabohdjemila7@gmail.com');
          console.log('🔑 Password: *** (présent)');
          console.log('🆔 ID:', this.lastID);
        }
        
        db.close();
      });

    } else {
      console.log('❌ Table smtp_config toujours absente');
      db.close();
    }
  });
});