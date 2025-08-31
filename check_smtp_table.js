const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/database.sqlite');

console.log('🔍 Vérification de la table smtp_config...');

db.serialize(() => {
  // Vérifier si la table existe
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='smtp_config'", (err, row) => {
    if (err) {
      console.error('❌ Erreur:', err);
      return;
    }
    
    if (row) {
      console.log('✅ Table smtp_config existe');
      
      // Vérifier la structure de la table
      db.all("PRAGMA table_info(smtp_config)", (err, columns) => {
        if (err) {
          console.error('❌ Erreur:', err);
          return;
        }
        
        console.log('📋 Structure de la table:');
        columns.forEach(col => {
          console.log(`  - ${col.name} (${col.type})`);
        });
        
        // Vérifier les données existantes
        db.all("SELECT * FROM smtp_config", (err, rows) => {
          if (err) {
            console.error('❌ Erreur:', err);
            return;
          }
          
          console.log('📊 Données dans la table:');
          console.log(rows);
          
          db.close();
        });
      });
    } else {
      console.log('❌ Table smtp_config n\'existe pas');
      db.close();
    }
  });
});