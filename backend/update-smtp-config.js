import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('database.sqlite');

db.run(
  'UPDATE smtp_config SET username = ?, password = ?, from_email = ? WHERE is_active = 1',
  ['tiabohdjemila7@gmail.com', 'bdqg kyuw gdxz jlvx', 'noreply@gouv.ci'],
  function(err) {
    if (err) {
      console.error('❌ Erreur:', err.message);
    } else {
      console.log('✅ Informations d\'authentification mises à jour');
    }
    db.close();
  }
);