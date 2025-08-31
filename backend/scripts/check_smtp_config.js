import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemin vers la base de données
const dbPath = path.join(__dirname, '..', 'database.sqlite');

// Ouvrir la base de données
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erreur ouverture DB:', err.message);
    process.exit(1);
  }
  console.log('✅ Connecté à la base de données SQLite');
});

console.log('🔍 Vérification de la configuration SMTP...\n');

// Vérifier la table smtp_config
db.get('SELECT * FROM smtp_config', (err, row) => {
  if (err) {
    console.error('❌ Erreur lecture smtp_config:', err.message);
    
    // Vérifier si la table existe
    db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='smtp_config'`, (err, table) => {
      if (err) {
        console.error('❌ Erreur vérification table:', err.message);
      } else if (!table) {
        console.log('📋 La table smtp_config n\'existe pas');
      } else {
        console.log('📋 Table smtp_config existe mais vide');
      }
      db.close();
    });
    return;
  }

  if (row) {
    console.log('📋 Configuration SMTP trouvée:');
    console.log('• Host:', row.host);
    console.log('• Port:', row.port);
    console.log('• Secure:', row.secure);
    console.log('• User:', row.user);
    console.log('• Password:', row.password ? '*** (présent)' : '❌ absent');
    console.log('• Updated At:', row.updated_at);
    
    // Tester la configuration
    testSmtpConfig(row);
  } else {
    console.log('❌ Aucune configuration SMTP trouvée');
    db.close();
  }
});

async function testSmtpConfig(config) {
  console.log('\n🧪 Test de la configuration sauvegardée...');
  
  try {
    const nodemailer = await import('nodemailer');
    
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure === 1,
      auth: {
        user: config.user,
        pass: config.password
      }
    });

    console.log('🔍 Vérification de la connexion...');
    await transporter.verify();
    console.log('✅ Connexion SMTP réussie avec la config sauvegardée !');

    console.log('\n📤 Test d\'envoi d\'email...');
    const info = await transporter.sendMail({
      from: `"Test System" <${config.user}>`,
      to: config.user, // Envoyer à soi-même
      subject: '✅ Test SMTP depuis la config sauvegardée',
      text: 'La configuration SMTP sauvegardée fonctionne correctement !',
      html: '<h1>✅ Test Réussi</h1><p>La configuration SMTP sauvegardée fonctionne correctement !</p>'
    });

    console.log('✅ Email envoyé avec succès !');
    console.log('📨 Message ID:', info.messageId);

  } catch (error) {
    console.error('❌ Erreur avec la config sauvegardée:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('🔒 Problème d\'authentification - le mot de passe est peut-être incorrect');
    }
  } finally {
    db.close();
  }
}