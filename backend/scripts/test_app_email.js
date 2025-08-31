import sqlite3 from 'sqlite3';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'database.sqlite');

console.log('🎯 Test d\'envoi d\'email depuis l\'application...\n');

async function testAppEmail() {
  try {
    // Récupérer la configuration SMTP depuis la base de données
    const smtpConfig = await getSmtpConfig();
    
    if (!smtpConfig) {
      console.log('❌ Aucune configuration SMTP trouvée');
      return;
    }

    console.log('📋 Configuration SMTP chargée:');
    console.log('• Host:', smtpConfig.host);
    console.log('• Port:', smtpConfig.port);
    console.log('• Secure:', smtpConfig.secure);
    console.log('• User:', smtpConfig.user);

    // Créer le transporteur
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure === 1,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.password
      }
    });

    // Simuler un email de diligence (comme le ferait l'application)
    console.log('\n📤 Envoi d\'email de test (simulation application)...');
    
    const emailContent = {
      from: `"Système de Diligence" <${smtpConfig.user}>`,
      to: 'tiabohdjemila7@gmail.com', // Destinataire de test
      subject: '✅ Test d\'envoi depuis l\'application',
      text: `Bonjour,

Ceci est un test d'envoi d'email depuis votre application de diligence.

Configuration utilisée:
- Serveur: ${smtpConfig.host}:${smtpConfig.port}
- Utilisateur: ${smtpConfig.user}

L'application devrait maintenant pouvoir envoyer des emails correctement.

Cordialement,
Votre système de diligence`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">✅ Test d'envoi depuis l'application</h2>
          <p>Bonjour,</p>
          <p>Ceci est un test d'envoi d'email depuis votre application de diligence.</p>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Configuration utilisée:</h3>
            <ul>
              <li><strong>Serveur:</strong> ${smtpConfig.host}:${smtpConfig.port}</li>
              <li><strong>Utilisateur:</strong> ${smtpConfig.user}</li>
              <li><strong>Sécurité:</strong> ${smtpConfig.secure ? 'SSL' : 'TLS'}</li>
            </ul>
          </div>
          
          <p>L'application devrait maintenant pouvoir envoyer des emails correctement.</p>
          
          <p style="margin-top: 30px; color: #6b7280;">
            Cordialement,<br>
            <strong>Votre système de diligence</strong>
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(emailContent);
    
    console.log('✅ Email envoyé avec succès depuis l\'application !');
    console.log('📨 Message ID:', info.messageId);
    console.log('👤 Destinataire:', emailContent.to);
    console.log('\n🎉 Votre configuration SMTP est maintenant opérationnelle !');
    console.log('📧 Les emails devraient être envoyés correctement depuis votre application.');

  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi:', error.message);
    if (error.response) {
      console.error('📨 Réponse SMTP:', error.response);
    }
  }
}

function getSmtpConfig() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }

      db.get('SELECT * FROM smtp_config ORDER BY id DESC LIMIT 1', (err, row) => {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  });
}

// Exécuter le test
testAppEmail();