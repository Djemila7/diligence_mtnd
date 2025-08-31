import nodemailer from 'nodemailer';

async function testGmailDirect() {
  console.log('🧪 Test direct de Gmail SMTP...');
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: 'tiabohdjemila7@gmail.com',
      pass: 'bdqg kyuw gdxz jlvx'
    },
    debug: true,
    logger: true
  });

  try {
    console.log('🔗 Test de connexion...');
    await transporter.verify();
    console.log('✅ Connexion SMTP réussie!');

    console.log('📧 Envoi d\'email test...');
    const info = await transporter.sendMail({
      from: '"Système de Diligence" <tiabohdjemila7@gmail.com>',
      to: 'tiabohdjemila7@gmail.com',
      subject: 'Test SMTP Direct',
      text: 'Ceci est un test de configuration SMTP',
      html: '<b>Ceci est un test de configuration SMTP</b>'
    });

    console.log('✅ Email envoyé! Message ID:', info.messageId);
    
  } catch (error) {
    console.error('❌ Erreur détaillée:');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Stack:', error.stack);
    
    if (error.code === 'EAUTH') {
      console.log('🔐 Problème d\'authentification - vérifiez le mot de passe d\'application');
    } else if (error.code === 'ECONNECTION') {
      console.log('🌐 Problème de connexion - vérifiez le firewall/antivirus');
    }
  }
}

testGmailDirect();