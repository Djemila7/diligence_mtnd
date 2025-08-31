import nodemailer from 'nodemailer';

// Configuration Gmail avec vos informations
const gmailConfig = {
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // SSL
  auth: {
    user: 'tiabohdjemila7@gmail.com',
    pass: 'bdqg kyuw gdxz jlvx' // Mot de passe d'application
  }
};

async function testGmailConnection() {
  console.log('🚀 Test de connexion Gmail en cours...');
  console.log('📧 Utilisateur:', gmailConfig.auth.user);
  console.log('🔗 Configuration:', {
    host: gmailConfig.host,
    port: gmailConfig.port,
    secure: gmailConfig.secure
  });

  try {
    // Créer le transporteur
    const transporter = nodemailer.createTransport(gmailConfig);

    console.log('\n🔍 Test de vérification de connexion...');
    
    // Tester la connexion
    await transporter.verify();
    console.log('✅ Connexion SMTP réussie !');

    // Tester l'envoi d'un email
    console.log('\n📤 Test d\'envoi d\'email...');
    const info = await transporter.sendMail({
      from: '"Test System" <tiabohdjemila7@gmail.com>',
      to: 'tiabohdjemila7@gmail.com', // Envoyer à vous-même
      subject: '✅ Test SMTP Gmail Réussi',
      text: 'Félicitations ! Votre configuration Gmail fonctionne correctement.',
      html: '<h1>Félicitations !</h1><p>Votre configuration Gmail fonctionne correctement.</p>'
    });

    console.log('✅ Email envoyé avec succès !');
    console.log('📨 Message ID:', info.messageId);
    
    return true;

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    
    // Messages d'erreur spécifiques Gmail
    if (error.code === 'EAUTH') {
      console.log('\n🔒 Problème d\'authentification:');
      console.log('• Vérifiez que l\'authentification à 2 facteurs est activée');
      console.log('• Utilisez un mot de passe d\'application (16 caractères)');
      console.log('• Assurez-vous que le mot de passe est correct');
    } else if (error.code === 'ECONNECTION') {
      console.log('\n🌐 Problème de connexion:');
      console.log('• Vérifiez votre connexion Internet');
      console.log('• Firewall/antivirus peut bloquer le port 465');
      console.log('• Essayez le port 587 avec TLS');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('\n⏰ Timeout:');
      console.log('• Problème réseau ou port bloqué');
      console.log('• Essayez avec un autre réseau');
    }
    
    return false;
  }
}

// Alternative avec port 587 (TLS)
async function testGmailPort587() {
  console.log('\n🔧 Test avec port 587 (TLS)...');
  
  const config587 = {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // TLS
    auth: {
      user: 'tiabohdjemila7@gmail.com',
      pass: 'bdqg kyuw gdxz jlvx'
    }
  };

  try {
    const transporter = nodemailer.createTransport(config587);
    await transporter.verify();
    console.log('✅ Port 587 fonctionne !');
    return true;
  } catch (error) {
    console.log('❌ Port 587 échoue aussi:', error.message);
    return false;
  }
}

// Exécuter les tests
async function main() {
  console.log('🎯 Test de configuration Gmail\n');
  
  const success465 = await testGmailConnection();
  
  if (!success465) {
    console.log('\n🔄 Essai avec une configuration alternative...');
    await testGmailPort587();
  }
  
  console.log('\n📋 Résumé:');
  if (success465) {
    console.log('✅ Gmail est configuré correctement');
  } else {
    console.log('❌ Problème avec la configuration Gmail');
    console.log('💡 Conseil: Utilisez le service Ethereal Email pour le développement');
  }
}

main();