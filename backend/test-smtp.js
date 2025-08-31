const nodemailer = require('nodemailer');

// Configuration de test SMTP
const testConfig = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: true, // true pour 465, false pour les autres ports
  auth: {
    user: 'your-real-email@gmail.com', // Remplacez par votre email réel
    pass: 'your-real-app-password'     // Remplacez par votre mot de passe d'application
  }
};

async function testSMTPConnection() {
  console.log('🧪 Test de connexion SMTP...');
  console.log('Configuration:', testConfig);

  try {
    // Créer un transporteur
    const transporter = nodemailer.createTransport(testConfig);

    // Tester la connexion
    console.log('🔗 Test de connexion en cours...');
    await transporter.verify();
    console.log('✅ Connexion SMTP réussie !');

    // Tester l'envoi d'un email
    console.log('📧 Test d\'envoi d\'email en cours...');
    const info = await transporter.sendMail({
      from: '"Test System" <your-real-email@gmail.com>',
      to: 'test@example.com',
      subject: 'Test SMTP Connection',
      text: 'Ceci est un email de test pour vérifier la connexion SMTP.',
      html: '<p>Ceci est un email de test pour vérifier la connexion SMTP.</p>'
    });

    console.log('✅ Email envoyé avec succès !');
    console.log('Message ID:', info.messageId);

  } catch (error) {
    console.error('❌ Erreur de connexion SMTP:');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Stack:', error.stack);
    
    // Informations détaillées pour le débogage
    if (error.code === 'EAUTH') {
      console.log('🔍 Problème d\'authentification - vérifiez email/mot de passe');
    } else if (error.code === 'ECONNECTION') {
      console.log('🔍 Problème de connexion - vérifiez host/port');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('🔍 Timeout - le serveur ne répond pas');
    }
  }
}

testSMTPConnection();