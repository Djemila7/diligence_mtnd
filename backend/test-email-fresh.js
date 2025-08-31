import nodemailer from 'nodemailer';
import { getDatabase } from './src/database/db.js';

async function testEmailFresh() {
  console.log('🧪 Test avec nouvelle instance de transporteur...');
  
  try {
    const database = await getDatabase();
    const smtpConfig = await database.get(
      'SELECT * FROM smtp_config WHERE is_active = 1 ORDER BY id DESC LIMIT 1'
    );

    if (!smtpConfig) {
      console.error('❌ Aucune configuration SMTP active');
      return;
    }

    console.log('📋 Configuration utilisée:');
    console.log('- Host:', smtpConfig.host);
    console.log('- Port:', smtpConfig.port);
    console.log('- Secure:', Boolean(smtpConfig.secure));
    console.log('- Username:', smtpConfig.username);

    // Créer un nouveau transporteur
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: Boolean(smtpConfig.secure),
      auth: {
        user: smtpConfig.username,
        pass: smtpConfig.password
      },
      debug: true,
      logger: true
    });

    console.log('🔗 Test de connexion...');
    await transporter.verify();
    console.log('✅ Connexion SMTP réussie!');

    console.log('📧 Envoi d\'email test...');
    const info = await transporter.sendMail({
      from: {
        name: smtpConfig.from_name,
        address: smtpConfig.from_email
      },
      to: 'tiabohdjemila7@gmail.com',
      subject: 'Test Email Service Réparé',
      html: '<b>Ceci est un test du service email réparé</b>'
    });

    console.log('✅ Email envoyé! Message ID:', info.messageId);

  } catch (error) {
    console.error('❌ Erreur détaillée:');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Stack:', error.stack);
  }
}

testEmailFresh();