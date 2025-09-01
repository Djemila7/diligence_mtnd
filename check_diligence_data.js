import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

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

// Vérifier toutes les diligences pour détecter des problèmes
console.log('🔍 Analyse complète des données de diligences...');

// 1. Vérifier le nombre total de diligences
db.get("SELECT COUNT(*) as total FROM diligences", (err, countRow) => {
  if (err) {
    console.error('Erreur lors du comptage des diligences:', err.message);
    db.close();
    return;
  }

  console.log(`📊 Total des diligences: ${countRow.total}`);

  // 2. Vérifier les données problématiques dans divers champs
  const checks = [
    { field: 'destinataire', query: "SELECT id, destinataire FROM diligences WHERE destinataire LIKE '%object%' OR destinataire LIKE '%Object%'" },
    { field: 'titre', query: "SELECT id, titre FROM diligences WHERE titre LIKE '%object%' OR titre LIKE '%Object%'" },
    { field: 'directiondestinataire', query: "SELECT id, directiondestinataire FROM diligences WHERE directiondestinataire LIKE '%object%' OR directiondestinataire LIKE '%Object%'" },
    { field: 'description', query: "SELECT id, description FROM diligences WHERE description LIKE '%object%' OR description LIKE '%Object%'" }
  ];

  let completedChecks = 0;

  checks.forEach((check, index) => {
    db.all(check.query, (err, rows) => {
      if (err) {
        console.error(`Erreur lors de la vérification du champ ${check.field}:`, err.message);
      } else {
        console.log(`\n🔎 Champ "${check.field}": ${rows.length} entrée(s) problématique(s)`);
        
        if (rows.length > 0) {
          rows.forEach((row, rowIndex) => {
            console.log(`   Diligence ${rowIndex + 1}: ID=${row.id}, Valeur="${row[check.field]}"`);
            
            // Si c'est le champ destinataire, analyser plus en détail
            if (check.field === 'destinataire' && row.destinataire) {
              try {
                const parsed = JSON.parse(row.destinataire);
                console.log(`   → Parsé:`, parsed);
                
                if (Array.isArray(parsed)) {
                  const problematic = parsed.filter(item => 
                    typeof item === 'string' && (item.includes('[object') || item.includes('Object]'))
                  );
                  if (problematic.length > 0) {
                    console.log(`   → Éléments problématiques:`, problematic);
                  }
                }
              } catch (e) {
                console.log(`   → Non JSON: ${row.destinataire}`);
              }
            }
          });
        } else {
          console.log(`   ✅ Aucun problème détecté`);
        }
      }

      completedChecks++;
      
      // Fermer la base de données après la dernière vérification
      if (completedChecks === checks.length) {
        // Vérifier également les données des utilisateurs
        console.log('\n👥 Vérification des données utilisateurs...');
        db.all("SELECT id, name, email, direction FROM users WHERE name LIKE '%object%' OR email LIKE '%object%' OR direction LIKE '%object%'", (userErr, userRows) => {
          if (userErr) {
            console.error('Erreur lors de la vérification des utilisateurs:', userErr.message);
          } else {
            console.log(`Utilisateurs problématiques: ${userRows.length}`);
            userRows.forEach(user => {
              console.log(`   ID: ${user.id}, Nom: "${user.name}", Email: "${user.email}", Direction: "${user.direction}"`);
            });
          }
          
          db.close((closeErr) => {
            if (closeErr) {
              console.error('Erreur lors de la fermeture de la base de données:', closeErr.message);
            } else {
              console.log('\n📦 Analyse terminée. Connexion à la base de données fermée.');
            }
          });
        });
      }
    });
  });
});