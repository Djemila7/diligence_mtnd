// Script pour tester la mise à jour directe de la diligence
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemin vers la base de données
const dbPath = process.env.DATABASE_URL || path.join(__dirname, '../database.sqlite');

async function testUpdateDiligence() {
  try {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    console.log('🧪 Test de mise à jour de la diligence...');

    // Mettre à jour la diligence directement
    const result = await db.run(
      `UPDATE diligences
       SET progression = ?, statut = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [100, 'À valider', 44]
    );

    console.log('✅ Diligence mise à jour:', result.changes, 'ligne(s) modifiée(s)');

    // Vérifier le nouveau statut
    const diligence = await db.get('SELECT statut, progression FROM diligences WHERE id = ?', [44]);
    console.log('📊 Nouveau statut:', diligence.statut, 'Progression:', diligence.progression);

    await db.close();
    
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour de la diligence:', error.message);
  }
}

// Exécuter le test
testUpdateDiligence();