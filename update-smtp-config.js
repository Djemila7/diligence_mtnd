// Script pour mettre à jour la configuration SMTP
import { getDatabase } from './backend/src/database/db.js';

async function updateSmtpConfig() {
  console.log('🔄 Mise à jour de la configuration SMTP...\n');

  try {
    const database = await getDatabase();

    // Demander les informations SMTP (vous pouvez modifier ces valeurs)
    const smtpConfig = {
      host: 'smtp.gmail.com',
      port: 587,
      secure: true,
      username: 'votre-email@gmail.com', // ← Modifier avec votre email
      password: 'votre-mot-de-passe-app', // ← Modifier avec votre mot de passe d'application
      from_email: 'noreply@votre-domaine.com',
      from_name: 'Système de Diligence',
      is_active: true
    };

    // Mettre à jour la configuration
    await database.run(
      `UPDATE smtp_config SET 
        host = ?, port = ?, secure = ?, username = ?, password = ?,
        from_email = ?, from_name = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = 1`,
      [
        smtpConfig.host,
        smtpConfig.port,
        smtpConfig.secure ? 1 : 0,
        smtpConfig.username,
        smtpConfig.password,
        smtpConfig.from_email,
        smtpConfig.from_name,
        smtpConfig.is_active ? 1 : 0
      ]
    );

    console.log('✅ Configuration SMTP mise à jour !');
    console.log('\n📋 Configuration appliquée:');
    console.log('   Host:', smtpConfig.host);
    console.log('   Port:', smtpConfig.port);
    console.log('   Username:', smtpConfig.username);
    console.log('   From Email:', smtpConfig.from_email);
    console.log('   From Name:', smtpConfig.from_name);
    console.log('   Secure:', smtpConfig.secure ? 'Oui' : 'Non');
    console.log('   Actif:', smtpConfig.is_active ? 'Oui' : 'Non');

    console.log('\n💡 Instructions importantes:');
    console.log('   1. Pour Gmail: Activez l\'authentification 2 facteurs');
    console.log('   2. Générez un mot de passe d\'application');
    console.log('   3. Utilisez le mot de passe d\'application dans le champ "password"');
    console.log('   4. Redémarrez le serveur backend après modification');

  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error.message);
  }
}

updateSmtpConfig();