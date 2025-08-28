import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemin vers la base de données
const dbPath = process.env.DATABASE_URL || path.join(__dirname, '../../../database.sqlite');

// Créer le répertoire de la base de données si nécessaire
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialiser la base de données
let db = null;

export async function initializeDatabase() {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    console.log('📦 Connexion à la base de données SQLite établie');

    // Exécuter le schéma de base de données
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Exécuter chaque instruction SQL séparément
    const statements = schema.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await db.exec(statement);
        } catch (error) {
          // Ignorer les erreurs de colonnes déjà existantes
          if (!error.message.includes('duplicate column name') &&
              !error.message.includes('syntax error')) {
            console.warn('Warning lors de l\'exécution du schéma:', error.message);
          }
        }
      }
    }

    // Vérifier et ajouter la colonne phone si elle n'existe pas
    try {
      const columns = await db.all("PRAGMA table_info(users)");
      const hasPhoneColumn = columns.some(col => col.name === 'phone');
      
      if (!hasPhoneColumn) {
        await db.exec("ALTER TABLE users ADD COLUMN phone TEXT");
        console.log('✅ Colonne phone ajoutée à la table users');
      }
    } catch (error) {
      console.warn('Warning lors de la vérification de la colonne phone:', error.message);
    }

    // Vérifier et ajouter la colonne direction si elle n'existe pas
    try {
      const columns = await db.all("PRAGMA table_info(users)");
      const hasDirectionColumn = columns.some(col => col.name === 'direction');
      
      if (!hasDirectionColumn) {
        await db.exec("ALTER TABLE users ADD COLUMN direction TEXT DEFAULT ''");
        console.log('✅ Colonne direction ajoutée à la table users');
      }
    } catch (error) {
      console.warn('Warning lors de la vérification de la colonne direction:', error.message);
    }

    console.log('✅ Schéma de base de données initialisé avec succès');
    return db;
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de la base de données:', error);
    throw error;
  }
}

export async function getDatabase() {
  if (!db) {
    await initializeDatabase();
  }
  return db;
}

// Fonctions utilitaires pour la base de données
export async function runQuery(query, params = []) {
  const database = await getDatabase();
  try {
    const result = await database.run(query, params);
    return result;
  } catch (error) {
    console.error('Erreur lors de l\'exécution de la requête:', error);
    throw error;
  }
}

export async function getQuery(query, params = []) {
  const database = await getDatabase();
  try {
    const result = await database.get(query, params);
    return result;
  } catch (error) {
    console.error('Erreur lors de la récupération des données:', error);
    throw error;
  }
}

export async function allQuery(query, params = []) {
  const database = await getDatabase();
  try {
    const result = await database.all(query, params);
    return result;
  } catch (error) {
    console.error('Erreur lors de la récupération de toutes les données:', error);
    throw error;
  }
}

// Fermer la connexion à la base de données
export async function closeDatabase() {
  if (db) {
    await db.close();
    console.log('📦 Connexion à la base de données fermée');
  }
}

export default {
  initializeDatabase,
  getDatabase,
  runQuery,
  getQuery,
  allQuery,
  closeDatabase
};