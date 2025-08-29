// Script de test pour le service email sans configuration SMTP réelle
import { getDatabase } from './backend/src/database/db.js';

async function testEmailService() {
  console.log('🧪 Test du service email (mode simulation)...\n');

  try {
    const database = await getDatabase();

    // Simuler l'envoi d'un email
    const testEmail = 'test@example.com';
    const testToken = 'test-token-12345';
    const testName = 'Utilisateur Test';

    console.log('📧 Simulation d\'envoi d\'email:');
    console.log('   À:', testEmail);
    console.log('   Token:', testToken);
    console.log('   Nom:', testName);

    // Générer le lien de réinitialisation
    const frontendUrl = 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${testToken}&email=${encodeURIComponent(testEmail)}`;

    console.log('\n🔗 Lien de réinitialisation généré:');
    console.log('   ', resetLink);

    // Enregistrer dans les logs (simulation)
    await database.run(
      'INSERT INTO email_logs (to_email, subject, body, status, error_message) VALUES (?, ?, ?, ?, ?)',
      [
        testEmail,
        '🔐 TEST - Réinitialisation de mot de passe',
        `Email de test - Lien: ${resetLink}`,
        'sent',
        'TEST - Email simulé (configuration SMTP nécessaire pour envoi réel)'
      ]
    );

    console.log('\n✅ Test terminé !');
    console.log('\n💡 Pour envoyer de vrais emails:');
    console.log('   1. Modifiez la configuration SMTP avec update-smtp-config.js');
    console.log('   2. Utilisez un vrai service email (Gmail, Outlook, etc.)');
    console.log('   3. Redémarrez le serveur backend');

    console.log('\n🌐 Lien de test frontend:');
    console.log('   ', resetLink);

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }
}

testEmailService();