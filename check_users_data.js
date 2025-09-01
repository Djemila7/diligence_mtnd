import sqlite3 from 'sqlite3';
import path from 'path';
const { verbose } = sqlite3;

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

// Vérifier les données des utilisateurs
db.all("SELECT id, email, name, role, direction, created_at FROM users WHERE is_active = 1", (err, rows) => {
  if (err) {
    console.error('Erreur lors de la requête:', err.message);
    db.close();
    return;
  }

  console.log('📋 Données des utilisateurs actifs:');
  console.log('====================================');
  
  rows.forEach((row, index) => {
    console.log(`\nUtilisateur ${index + 1}:`);
    console.log('ID:', row.id);
    console.log('Email:', row.email);
    console.log('Nom:', row.name);
    console.log('Rôle:', row.role);
    console.log('Direction:', row.direction);
    console.log('Créé le:', row.created_at);
    
    // Vérifier si des valeurs sont des objets mal formatés
    Object.entries(row).forEach(([key, value]) => {
      if (value && typeof value === 'string' && value.includes('[object Object]')) {
        console.warn(`⚠️  ATTENTION: ${key} contient "[object Object]":`, value);
      }
    });
  });

  console.log('\n🔍 Vérification des données problématiques:');
  console.log('==========================================');
  
  // Vérifier spécifiquement pour des objets mal formatés
  const problematicRows = rows.filter(row => 
    Object.values(row).some(value => 
      value && typeof value === 'string' && value.includes('[object Object]')
    )
  );

  if (problematicRows.length === 0) {
    console.log('✅ Aucune donnée problématique trouvée');
  } else {
    console.log(`❌ ${problematicRows.length} utilisateur(s) avec des données problématiques:`);
    problematicRows.forEach((row, index) => {
      console.log(`\nProblème ${index + 1}:`);
      Object.entries(row).forEach(([key, value]) => {
        if (value && typeof value === 'string' && value.includes('[object Object]')) {
          console.log(`  ${key}: "${value}"`);
        }
      });
    });
  }

  db.close((err) => {
    if (err) {
      console.error('Erreur lors de la fermeture de la base de données:', err.message);
    } else {
      console.log('\n📦 Connexion à la base de données fermée');
    }
  });
});