import nodemailer from 'nodemailer';
import { getDatabase } from '../src/database/db.js';

// Créer un compte de test Ethereal Email
async function createTestAccount() {
  try {
    console.log('🔄 Création d\'un compte SMTP de test...');
    
    // Créer un compte de test Ethereal
    const testAccount = await nodemailer.createTestAccount();
    
    console.log('✅ Compte de test créé:');
    console.log('📧 Email:', testAccount.user);
    console.log('🔑 Mot de passe:', testAccount.pass);
    console.log('🌐 SMTP:', testAccount.smtp.host);
    console.log('🚪 Port:', testAccount.smtp.port);
    
    return testAccount;
  } catch (error) {
    console.error('❌ Erreur création compte test:', error);
    throw error;
  }
}

// Configurer la base de données avec le compte de test
async function setupTestSmtpConfig(testAccount) {
  try {
    const database = await getDatabase();
    
    // Désactiver toutes les configurations existantes
    await database.run('UPDATE smtp_config SET is_active = 0');
    
    // Insérer la configuration de test
    await database.run(
      `INSERT INTO smtp_config (host, port, secure, username, password, from_email, from_name, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        testAccount.smtp.host,
        testAccount.smtp.port,
        0, // secure = false pour Ethereal
        testAccount.user,
        testAccount.pass,
        testAccount.user, // from_email = même que username
        'Système de Test Diligence'
      ]
    );
    
    console.log('✅ Configuration SMTP de test sauvegardée en base de données');
    
  } catch (error) {
    console.error('❌ Erreur configuration base de données:', error);
    throw error;
  }
}

// Tester l'envoi d'email
async function testEmailSending() {
  try {
    const testAccount = await createTestAccount();
    await setupTestSmtpConfig(testAccount);
    
    console.log('\n🎯 Test d\'envoi d\'email...');
    
    // Créer un transporteur avec le compte de test
    const transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    
    // Envoyer un email test
    const info = await transporter.sendMail({
      from: `"Système de Test" <${testAccount.user}>`,
      to: 'test@example.com',
      subject: '✅ Test SMTP Réussi',
      text: 'Félicitations ! Votre configuration SMTP fonctionne correctement.',
      html: '<h1>Félicitations !</h1><p>Votre configuration SMTP fonctionne correctement.</p>'
    });
    
    console.log('✅ Email envoyé avec succès !');
    console.log('📨 Message ID:', info.messageId);
    console.log('🔗 Preview URL:', nodemailer.getTestMessageUrl(info));
    
    return testAccount;
    
  } catch (error) {
    console.error('❌ Erreur envoi email test:', error);
    throw error;
  }
}

// Exécuter le setup
async function main() {
  try {
    console.log('🚀 Configuration SMTP de test en cours...\n');
    const testAccount = await testEmailSending();
    
    console.log('\n🎉 Configuration terminée !');
    console.log('\n📋 Informations de connexion:');
    console.log('Host:', testAccount.smtp.host);
    console.log('Port:', testAccount.smtp.port);
    console.log('Username:', testAccount.user);
    console.log('Password:', testAccount.pass);
    console.log('Secure: false');
    
    console.log('\n🌐 Pour voir les emails: https://ethereal.email/');
    console.log('📧 Connectez-vous avec:', testAccount.user);
    console.log('🔑 Mot de passe:', testAccount.pass);
    
  } catch (error) {
    console.error('❌ Échec de la configuration:', error);
    process.exit(1);
  }
}

main();