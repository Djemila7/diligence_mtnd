// Script pour vérifier la configuration SMTP
import { getDatabase } from './backend/src/database/db.js';

async function checkSmtpConfig() {
  console.log('🔍 Vérification de la configuration SMTP...\n');

  try {
    const database = await getDatabase();
    
    // Vérifier la configuration SMTP
    const smtpConfig = await database.get(
      'SELECT * FROM smtp_config WHERE is_active = 1 ORDER BY id DESC LIMIT 1'
    );

    if (smtpConfig) {
      console.log('✅ Configuration SMTP trouvée:');
      console.log('   Host:', smtpConfig.host);
      console.log('   Port:', smtpConfig.port);
      console.log('   Username:', smtpConfig.username);
      console.log('   From Email:', smtpConfig.from_email);
      console.log('   From Name:', smtpConfig.from_name);
      console.log('   Secure:', smtpConfig.secure ? 'Oui' : 'Non');
      console.log('   Actif:', smtpConfig.is_active ? 'Oui' : 'Non');
    } else {
      console.log('❌ Aucune configuration SMTP active trouvée');
      console.log('\n💡 Pour configurer SMTP:');
      console.log('   1. Modifier la table smtp_config dans la base de données');
      console.log('   2. Ou utiliser les variables d\'environnement');
      console.log('   3. Voir le guide PASSWORD_RESET_GUIDE.md');
    }

    // Vérifier les logs d'emails
    console.log('\n📧 Logs d\'emails récents:');
    const emailLogs = await database.all(
      'SELECT to_email, subject, status, error_message, created_at FROM email_logs ORDER BY created_at DESC LIMIT 5'
    );

    if (emailLogs.length > 0) {
      emailLogs.forEach(log => {
        console.log(`   ${log.created_at} - ${log.to_email} - ${log.subject} - ${log.status}`);
        if (log.error_message) {
          console.log(`     Erreur: ${log.error_message}`);
        }
      });
    } else {
      console.log('   Aucun log d\'email trouvé');
    }

  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error.message);
  }
}

checkSmtpConfig();