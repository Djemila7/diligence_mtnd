import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemin vers la base de données
const dbPath = path.join(__dirname, 'database.sqlite');

// Ouvrir la base de données
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erreur lors de l\'ouverture de la base de données:', err.message);
    return;
  }
  console.log('✅ Connecté à la base de données SQLite');
});

// Fonction pour corriger les IDs corrompus
function fixCorruptedUserIds() {
  console.log('🔍 Recherche de données corrompues dans la table diligences...');
  
  // Vérifier les données corrompues dans le champ destinataire
  db.all("SELECT id, destinataire FROM diligences WHERE destinataire LIKE '%[object Object]%'", (err, rows) => {
    if (err) {
      console.error('Erreur lors de la recherche des données corrompues:', err.message);
      db.close();
      return;
    }

    console.log(`📋 ${rows.length} diligence(s) avec des données corrompues trouvée(s)`);
    
    if (rows.length === 0) {
      console.log('✅ Aucune donnée corrompue à corriger');
      db.close();
      return;
    }

    rows.forEach((row, index) => {
      console.log(`\n--- Diligence ${index + 1} ---`);
      console.log('ID:', row.id);
      console.log('Destinataire corrompu:', row.destinataire);
      
      let fixedDestinataire = null;
      
      try {
        // Essayer de parser le JSON
        const parsed = JSON.parse(row.destinataire);
        
        if (Array.isArray(parsed)) {
          // Filtrer les valeurs "[object Object]"
          const filtered = parsed.filter(item => item !== '[object Object]' && item !== 'Utilisateur [object Object]');
          fixedDestinataire = JSON.stringify(filtered.length > 0 ? filtered : null);
          console.log('Destinataire corrigé (array):', fixedDestinataire);
        } else if (parsed === '[object Object]' || parsed === 'Utilisateur [object Object]') {
          fixedDestinataire = null;
          console.log('Destinataire corrigé (null):', fixedDestinataire);
        } else {
          fixedDestinataire = JSON.stringify(parsed);
          console.log('Destinataire corrigé (valeur simple):', fixedDestinataire);
        }
      } catch (parseError) {
        // Si ce n'est pas du JSON valide, vérifier si c'est une simple chaîne corrompue
        if (row.destinataire === '[object Object]' || row.destinataire === 'Utilisateur [object Object]') {
          fixedDestinataire = null;
          console.log('Destinataire corrigé (chaîne corrompue -> null):', fixedDestinataire);
        } else {
          // Essayer d'extraire des IDs valides de la chaîne
          const match = row.destinataire.match(/\d+/);
          if (match) {
            fixedDestinataire = JSON.stringify([match[0]]);
            console.log('Destinataire corrigé (ID extrait):', fixedDestinataire);
          } else {
            fixedDestinataire = null;
            console.log('Destinataire corrigé (aucun ID valide -> null):', fixedDestinataire);
          }
        }
      }

      // Mettre à jour la base de données
      if (fixedDestinataire !== null) {
        db.run(
          "UPDATE diligences SET destinataire = ? WHERE id = ?",
          [fixedDestinataire, row.id],
          function(updateErr) {
            if (updateErr) {
              console.error(`❌ Erreur lors de la mise à jour de la diligence ${row.id}:`, updateErr.message);
            } else {
              console.log(`✅ Diligence ${row.id} corrigée avec succès`);
            }
            
            // Fermer la base de données après la dernière mise à jour
            if (index === rows.length - 1) {
              db.close((closeErr) => {
                if (closeErr) {
                  console.error('Erreur lors de la fermeture de la base de données:', closeErr.message);
                } else {
                  console.log('📦 Connexion à la base de données fermée');
                }
              });
            }
          }
        );
      } else {
        db.run(
          "UPDATE diligences SET destinataire = NULL WHERE id = ?",
          [row.id],
          function(updateErr) {
            if (updateErr) {
              console.error(`❌ Erreur lors de la mise à jour de la diligence ${row.id}:`, updateErr.message);
            } else {
              console.log(`✅ Diligence ${row.id} corrigée avec succès (destinataire mis à NULL)`);
            }
            
            // Fermer la base de données après la dernière mise à jour
            if (index === rows.length - 1) {
              db.close((closeErr) => {
                if (closeErr) {
                  console.error('Erreur lors de la fermeture de la base de données:', closeErr.message);
                } else {
                  console.log('📦 Connexion à la base de données fermée');
                }
              });
            }
          }
        );
      }
    });
  });
}

// Démarrer la correction
fixCorruptedUserIds();