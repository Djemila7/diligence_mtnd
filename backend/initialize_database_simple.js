// Script pour initialiser la base de données avec le schéma complet
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Initialisation de la base de données...');

// Instructions SQL à exécuter séquentiellement
const sqlStatements = [
  // Table des utilisateurs
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user')),
    direction TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // Table des diligences
  `CREATE TABLE IF NOT EXISTS diligences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titre TEXT NOT NULL,
    directiondestinataire TEXT NOT NULL,
    datedebut TEXT NOT NULL,
    datefin TEXT NOT NULL,
    description TEXT NOT NULL,
    priorite TEXT DEFAULT 'Moyenne' CHECK(priorite IN ('Haute', 'Moyenne', 'Basse')),
    statut TEXT DEFAULT 'Planifié' CHECK(statut IN ('Planifié', 'En cours', 'Terminé', 'En retard', 'À valider')),
    destinataire TEXT DEFAULT '[]',
    piecesjointes TEXT DEFAULT '[]',
    progression INTEGER DEFAULT 0,
    assigned_to INTEGER,
    created_by INTEGER,
    archived BOOLEAN DEFAULT 0,
    archived_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`,

  // Table des fichiers joints aux diligences
  `CREATE TABLE IF NOT EXISTS diligence_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    diligence_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    uploaded_by INTEGER NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (diligence_id) REFERENCES diligences(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
  )`,

  // Table des traitements des diligences
  `CREATE TABLE IF NOT EXISTS diligence_traitements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    diligence_id INTEGER NOT NULL,
    commentaire TEXT,
    progression INTEGER NOT NULL,
    statut TEXT NOT NULL CHECK(statut IN ('En cours', 'Terminé', 'À valider')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (diligence_id) REFERENCES diligences(id) ON DELETE CASCADE
  )`,

  // Table de configuration SMTP
  `CREATE TABLE IF NOT EXISTS smtp_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    host TEXT NOT NULL,
    port INTEGER NOT NULL,
    secure BOOLEAN DEFAULT 0,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    from_email TEXT NOT NULL,
    from_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // Table des logs d'emails
  `CREATE TABLE IF NOT EXISTS email_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT,
    status TEXT CHECK(status IN ('sent', 'failed', 'pending')),
    error_message TEXT,
    sent_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // Table des profils utilisateurs
  `CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    phone TEXT,
    poste TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  // Table des tokens de réinitialisation de mot de passe
  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  // Table des validations de diligences
  `CREATE TABLE IF NOT EXISTS diligence_validations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    diligence_id INTEGER NOT NULL,
    validated_by INTEGER NOT NULL,
    validation_status TEXT NOT NULL CHECK(validation_status IN ('approved', 'rejected')),
    comment TEXT,
    validated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (diligence_id) REFERENCES diligences(id) ON DELETE CASCADE,
    FOREIGN KEY (validated_by) REFERENCES users(id)
  )`,

  // Table d'archivage des diligences
  `CREATE TABLE IF NOT EXISTS diligence_archives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    diligence_id INTEGER NOT NULL,
    validated_by INTEGER NOT NULL,
    validation_status TEXT NOT NULL CHECK(validation_status IN ('approved', 'rejected')),
    comment TEXT,
    validated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    archived_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (diligence_id) REFERENCES diligences(id) ON DELETE CASCADE,
    FOREIGN KEY (validated_by) REFERENCES users(id)
  )`,

  // Insertion d'un utilisateur admin par défaut
  `INSERT OR IGNORE INTO users (email, password_hash, name, role) VALUES ('admin@example.com', '$2a$10$MLrPGy6hzDQzEmUaBom7.OSNaPPIWX42gf2CPL/ANmUihHKKnXYEK', 'Administrateur', 'admin')`,

  // Insertion d'un utilisateur de test
  `INSERT OR IGNORE INTO users (email, password_hash, name, role) VALUES ('user@example.com', '$2a$10$tHlMPEGKKoYhcYxORYsqOOOA6WP1GYY9WJCPCHML9I/LKX/6v7eRS', 'Utilisateur Test', 'user')`
];

// Exécuter chaque instruction SQL séquentiellement
function executeStatements(index = 0) {
  if (index >= sqlStatements.length) {
    console.log('✅ Toutes les instructions SQL exécutées avec succès !');
    
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
      console.log('\n🚀 Base de données initialisée avec succès !');
    });
    return;
  }

  const sql = sqlStatements[index];
  console.log(`📝 Exécution de l'instruction ${index + 1}/${sqlStatements.length}...`);
  
  db.run(sql, (err) => {
    if (err) {
      console.error(`❌ Erreur lors de l'exécution de l'instruction ${index + 1}:`, err);
      console.error('SQL:', sql);
      db.close();
      process.exit(1);
    }
    
    executeStatements(index + 1);
  });
}

// Démarrer l'exécution
executeStatements();