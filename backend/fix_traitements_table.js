// Script pour mettre à jour la contrainte CHECK de la table diligence_traitements
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemin vers la base de données
const dbPath = process.env.DATABASE_URL || path.join(__dirname, '../database.sqlite');

async function fixTraitementsTable() {
  try {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    console.log('🔧 Correction de la table diligence_traitements...');

    // 1. Créer une table temporaire avec la nouvelle contrainte
    await db.exec(`
      CREATE TABLE IF NOT EXISTS diligence_traitements_temp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        diligence_id INTEGER NOT NULL,
        commentaire TEXT,
        progression INTEGER NOT NULL,
        statut TEXT NOT NULL CHECK(statut IN ('En cours', 'Terminé', 'À valider')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (diligence_id) REFERENCES diligences(id) ON DELETE CASCADE
      )
    `);

    // 2. Copier les données de l'ancienne table vers la nouvelle
    await db.exec(`
      INSERT INTO diligence_traitements_temp 
      (id, diligence_id, commentaire, progression, statut, created_at)
      SELECT id, diligence_id, commentaire, progression, statut, created_at
      FROM diligence_traitements
    `);

    // 3. Supprimer l'ancienne table
    await db.exec('DROP TABLE diligence_traitements');

    // 4. Renommer la table temporaire
    await db.exec('ALTER TABLE diligence_traitements_temp RENAME TO diligence_traitements');

    console.log('✅ Table diligence_traitements corrigée avec succès !');
    
    await db.close();
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction de la table:', error);
  }
}

// Exécuter la correction
fixTraitementsTable();