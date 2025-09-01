// Script pour mettre à jour la contrainte CHECK de la table diligences
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemin vers la base de données
const dbPath = process.env.DATABASE_URL || path.join(__dirname, '../database.sqlite');

async function fixDiligencesTable() {
  try {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    console.log('🔧 Correction de la table diligences...');

    // 1. Créer une table temporaire avec la nouvelle contrainte
    await db.exec(`
      CREATE TABLE IF NOT EXISTS diligences_temp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titre TEXT NOT NULL,
        directiondestinataire TEXT NOT NULL,
        datedebut TEXT NOT NULL,
        datefin TEXT NOT NULL,
        description TEXT NOT NULL,
        priorite TEXT DEFAULT 'Moyenne' CHECK(priorite IN ('Haute', 'Moyenne', 'Basse')),
        statut TEXT DEFAULT 'Planifié' CHECK(statut IN ('Planifié', 'En cours', 'Terminé', 'En retard', 'À valider')),
        destinataire TEXT,
        piecesjointes TEXT DEFAULT '[]',
        progression INTEGER DEFAULT 0,
        assigned_to INTEGER,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assigned_to) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    // 2. Copier les données de l'ancienne table vers la nouvelle
    await db.exec(`
      INSERT INTO diligences_temp 
      (id, titre, directiondestinataire, datedebut, datefin, description, priorite, statut, destinataire, piecesjointes, progression, assigned_to, created_by, created_at, updated_at)
      SELECT id, titre, directiondestinataire, datedebut, datefin, description, priorite, statut, destinataire, piecesjointes, progression, assigned_to, created_by, created_at, updated_at
      FROM diligences
    `);

    // 3. Supprimer l'ancienne table
    await db.exec('DROP TABLE diligences');

    // 4. Renommer la table temporaire
    await db.exec('ALTER TABLE diligences_temp RENAME TO diligences');

    console.log('✅ Table diligences corrigée avec succès !');
    
    await db.close();
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction de la table:', error);
  }
}

// Exécuter la correction
fixDiligencesTable();