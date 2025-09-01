// Script pour corriger les données corrompues des destinataires dans la base de données
// Ce script va réparer les enregistrements où le champ destinataire contient [object Object]

import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemin vers la base de données
const dbPath = path.join(__dirname, 'database.sqlite');

console.log('🔧 Début de la correction des données corrompues des destinataires...');

// Ouvrir la base de données
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erreur lors de l\'ouverture de la base de données:', err.message);
    return;
  }
  console.log('✅ Connecté à la base de données SQLite.');

  // Trouver les diligences avec des données corrompues
  db.all("SELECT id, destinataire, created_by FROM diligences WHERE destinataire LIKE '%object Object%' OR destinataire LIKE '%[object Object]%'", async (err, rows) => {
    if (err) {
      console.error('❌ Erreur lors de la recherche des données corrompues:', err.message);
      db.close();
      return;
    }

    console.log(`📋 ${rows.length} diligence(s) avec des données corrompues trouvée(s):`);
    
    if (rows.length === 0) {
      console.log('✅ Aucune donnée corrompue trouvée.');
      db.close();
      return;
    }

    // Récupérer tous les utilisateurs pour les suggestions
    const users = await new Promise((resolve, reject) => {
      db.all("SELECT id, name, email FROM users WHERE is_active = 1", (err, userRows) => {
        if (err) reject(err);
        else resolve(userRows);
      });
    });

    console.log('\n👥 Utilisateurs disponibles:');
    users.forEach(user => {
      console.log(`   ID: ${user.id}, Nom: ${user.name}, Email: ${user.email}`);
    });

    for (const row of rows) {
      console.log(`\n--- Diligence ID: ${row.id} ---`);
      console.log(`Destinataire corrompu: ${row.destinataire}`);
      console.log(`Créée par: ${row.created_by}`);
      
      // Essayer de déterminer l'ID correct basé sur le créateur ou l'utilisateur Djemila
      let correctDestinataireId = null;
      
      // Chercher d'abord un utilisateur Djemila
      const djemilaUser = users.find(u => u.name.toLowerCase().includes('djemila'));
      if (djemilaUser) {
        correctDestinataireId = djemilaUser.id;
        console.log(`✅ Utilisateur Djemila trouvé: ID ${djemilaUser.id} (${djemilaUser.name})`);
      } else {
        // Sinon, utiliser le créateur de la diligence
        const creator = users.find(u => u.id === row.created_by);
        if (creator) {
          correctDestinataireId = creator.id;
          console.log(`ℹ️  Utilisation du créateur comme destinataire: ID ${creator.id} (${creator.name})`);
        } else {
          // Fallback: premier utilisateur actif
          correctDestinataireId = users[0]?.id || 1;
          console.log(`⚠️  Utilisation du premier utilisateur disponible: ID ${correctDestinataireId}`);
        }
      }

      console.log(`🔄 Correction avec l'ID destinataire: ${correctDestinataireId}`);
      
      // Mettre à jour la base de données
      await new Promise((resolve, reject) => {
        db.run(
          "UPDATE diligences SET destinataire = ?, assigned_to = ? WHERE id = ?",
          [JSON.stringify([correctDestinataireId]), correctDestinataireId, row.id],
          function(updateErr) {
            if (updateErr) {
              console.error(`❌ Erreur lors de la mise à jour de la diligence ${row.id}:`, updateErr.message);
              reject(updateErr);
            } else {
              console.log(`✅ Diligence ${row.id} corrigée avec succès`);
              resolve();
            }
          }
        );
      });
    }

    // Fermer la base de données
    db.close((closeErr) => {
      if (closeErr) {
        console.error('❌ Erreur lors de la fermeture:', closeErr.message);
      } else {
        console.log('\n🎉 Correction terminée ! Redémarrez l\'application pour voir les changements.');
        console.log('📋 Résumé des corrections:');
        rows.forEach(row => {
          console.log(`   - Diligence ${row.id}: [object Object] → [ID correct]`);
        });
      }
    });
  });
});