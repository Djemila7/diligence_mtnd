// Script pour configurer SMTP avec vos paramètres réels
// MODIFIEZ CES VALEURS AVEC VOS INFORMATIONS RÉELLES
import { getDatabase } from './backend/src/database/db.js';

async function configureRealSmtp() {
  console.log('🔧 Configuration SMTP avec vos paramètres réels...\n');

  // ⚠️ MODIFIEZ CES VALEURS AVEC VOS INFORMATIONS RÉELLES ⚠️
  const YOUR_SMTP_CONFIG = {
    host: 'smtp.gmail.com',          // Serveur SMTP Gmail
    port: 587,                       // Port TLS
    secure: true,                    // TLS activé
    username: 'zaromussa@gmail.com', // Votre email
    password: 'ygmr irgf bnhn trkt', // Votre mot de passe d'application
    from_email: 'zaromussa@gmail.com', // Email d'envoi
    from_name: 'Système de Diligence'  // Nom d'envoi
  };

  try {
    const database = await getDatabase();

    console.log('📋 Configuration à appliquer:');
    console.log('   Serveur:', YOUR_SMTP_CONFIG.host);
    console.log('   Port:', YOUR_SMTP_CONFIG.port);
    console.log('   Email:', YOUR_SMTP_CONFIG.username);
    console.log('   From Email:', YOUR_SMTP_CONFIG.from_email);
    console.log('   Secure:', YOUR_SMTP_CONFIG.secure ? 'Oui (TLS/SSL)' : 'Non');
    
    console.log('\n💡 Pour Gmail:');
    console.log('   1. Activez l\'authentification 2 facteurs');
    console.log('   2. Générez un mot de passe d\'application');
    console.log('   3. Utilisez ce mot de passe ici, PAS votre mot de passe normal');

    // Mettre à jour la configuration
    await database.run(
      `UPDATE smtp_config SET 
        host = ?, port = ?, secure = ?, username = ?, password = ?,
        from_email = ?, from_name = ?, is_active = 1, updated_at = datetime('now')
      WHERE id = 1`,
      [
        YOUR_SMTP_CONFIG.host,
        YOUR_SMTP_CONFIG.port,
        YOUR_SMTP_CONFIG.secure ? 1 : 0,
        YOUR_SMTP_CONFIG.username,
        YOUR_SMTP_CONFIG.password,
        YOUR_SMTP_CONFIG.from_email,
        YOUR_SMTP_CONFIG.from_name
      ]
    );

    console.log('\n✅ Configuration SMTP mise à jour avec succès !');
    console.log('\n🚀 Redémarrez le serveur backend:');
    console.log('   cd diligence_app/backend && npm start');
    console.log('\n📧 Testez ensuite la création d\'un utilisateur');

  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error.message);
  }
}

configureRealSmtp();