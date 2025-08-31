import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemin vers la base de données
const dbPath = path.join(__dirname, '../../database.sqlite');

// Créer une connexion à la base de données
const db = new sqlite3.Database(dbPath);

console.log('🚀 Début de la migration : suppression de la contrainte UNIQUE sur email...');

// Fonction pour exécuter la migration
const runMigration = () => {
  db.serialize(() => {
    // Démarrer une transaction
    db.run('BEGIN TRANSACTION');
    
    // 1. Créer une table temporaire avec la nouvelle structure
    db.run(`
      CREATE TABLE IF NOT EXISTS users_temp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        direction TEXT DEFAULT '',
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('❌ Erreur création table temporaire:', err);
        db.run('ROLLBACK');
        db.close();
        return;
      }
      
      // 2. Copier les données
      db.run(`
        INSERT INTO users_temp 
        (id, email, password_hash, name, role, direction, is_active, created_at, updated_at)
        SELECT id, email, password_hash, name, role, direction, is_active, created_at, updated_at
        FROM users
      `, (err) => {
        if (err) {
          console.error('❌ Erreur copie données:', err);
          db.run('ROLLBACK');
          db.close();
          return;
        }
        
        // 3. Supprimer l'ancienne table
        db.run('DROP TABLE users', (err) => {
          if (err) {
            console.error('❌ Erreur suppression table:', err);
            db.run('ROLLBACK');
            db.close();
            return;
          }
          
          // 4. Renommer la table temporaire
          db.run('ALTER TABLE users_temp RENAME TO users', (err) => {
            if (err) {
              console.error('❌ Erreur renommage table:', err);
              db.run('ROLLBACK');
              db.close();
              return;
            }
            
            // 5. Recréer les index
            db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)', (err) => {
              if (err) {
                console.error('❌ Erreur création index:', err);
                db.run('ROLLBACK');
                db.close();
                return;
              }
              
              // Valider la transaction
              db.run('COMMIT', (err) => {
                if (err) {
                  console.error('❌ Erreur commit:', err);
                  db.run('ROLLBACK');
                } else {
                  console.log('✅ Migration terminée avec succès !');
                  console.log('📧 La contrainte UNIQUE sur email a été supprimée');
                  console.log('🔁 Vous pouvez maintenant réutiliser les emails des utilisateurs désactivés');
                }
                
                // Fermer la connexion
                db.close((closeErr) => {
                  if (closeErr) {
                    console.error('❌ Erreur fermeture DB:', closeErr);
                  } else {
                    console.log('✅ Base de données fermée');
                  }
                });
              });
            });
          });
        });
      });
    });
  });
};

// Vérifier si la table users existe avant de migrer
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
  if (err) {
    console.error('❌ Erreur vérification table:', err);
    db.close();
    return;
  }
  
  if (row) {
    runMigration();
  } else {
    console.log('ℹ️ Table users non trouvée, migration non nécessaire');
    db.close();
  }
});