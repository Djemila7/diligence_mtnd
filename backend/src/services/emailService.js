import nodemailer from 'nodemailer';
import { getDatabase } from '../database/db.js';

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  async initializeTransporter() {
    try {
      const database = await getDatabase();
      const smtpConfig = await database.get(
        'SELECT * FROM smtp_config WHERE is_active = 1 ORDER BY id DESC LIMIT 1'
      );

      if (smtpConfig) {
        this.transporter = nodemailer.createTransport({
          host: smtpConfig.host,
          port: smtpConfig.port,
          secure: smtpConfig.secure,
          auth: {
            user: smtpConfig.username,
            pass: smtpConfig.password
          }
        });

        console.log('✅ Service email initialisé avec succès');
      } else {
        console.warn('⚠️ Aucune configuration SMTP active trouvée');
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation du service email:', error);
    }
  }

  async sendEmail(to, subject, html) {
    if (!this.transporter) {
      console.warn('⚠️ Service email non initialisé - impossible d\'envoyer l\'email');
      return false;
    }

    try {
      const database = await getDatabase();
      const smtpConfig = await database.get(
        'SELECT * FROM smtp_config WHERE is_active = 1 ORDER BY id DESC LIMIT 1'
      );

      if (!smtpConfig) {
        console.error('❌ Aucune configuration SMTP active');
        return false;
      }

      const mailOptions = {
        from: {
          name: smtpConfig.from_name,
          address: smtpConfig.from_email
        },
        to,
        subject,
        html
      };

      const result = await this.transporter.sendMail(mailOptions);

      // Log de l'email
      await database.run(
        'INSERT INTO email_logs (to_email, subject, body, status, sent_at) VALUES (?, ?, ?, ?, datetime("now"))',
        [to, subject, html, 'sent']
      );

      console.log('✅ Email envoyé avec succès à:', to);
      return true;

    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi de l\'email:', error);

      try {
        const database = await getDatabase();
        await database.run(
          'INSERT INTO email_logs (to_email, subject, body, status, error_message) VALUES (?, ?, ?, ?, ?)',
          [to, subject, html, 'failed', error.message]
        );
      } catch (logError) {
        console.error('❌ Erreur lors du log de l\'email:', logError);
      }

      return false;
    }
  }

  async sendPasswordResetEmail(email, resetToken, userName) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    const subject = '🔐 Réinitialisation de votre mot de passe - Système de Diligence';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Système de Diligence</h1>
          </div>
          <div class="content">
            <h2>Bonjour ${userName},</h2>
            <p>Votre compte a été créé avec succès sur notre plateforme de gestion des diligences.</p>
            <p>Pour finaliser votre inscription, veuillez définir votre mot de passe en cliquant sur le bouton ci-dessous :</p>
            
            <div style="text-align: center;">
              <a href="${resetLink}" class="button">Définir mon mot de passe</a>
            </div>

            <p>Ou copiez ce lien dans votre navigateur :</p>
            <p style="word-break: break-all; color: #667eea;">${resetLink}</p>

            <p><strong>Important :</strong> Ce lien expirera dans 24 heures pour des raisons de sécurité.</p>
            
            <p>Si vous n'avez pas demandé cette création de compte, veuillez ignorer cet email.</p>
          </div>
          <div class="footer">
            <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            <p>© 2025 Système de Diligence. Tous droits réservés.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(email, subject, html);
  }
}

// Instance singleton
const emailService = new EmailService();
export default emailService;