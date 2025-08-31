import { getDatabase } from './backend/src/database/db.js';

async function updateSmtpConfig() {
  try {
    const db = await getDatabase();
    
    console.log('🔄 Mise à jour de la configuration SMTP avec les paramètres corrects...');
    
    // Mettre à jour la configuration existante avec le port 465 et SSL
    await db.run(
      `UPDATE smtp_config SET 
        port = ?, secure = ?, updated_at = datetime('now')
       WHERE is_active = 1`,
      [465, 1] // Port 465 avec SSL
    );
    
    console.log('✅ Configuration mise à jour avec succès:');
    console.log({
      port: 465,
      secure: true,
      protocol: 'SSL'
    });
    
    // Vérifier la configuration actuelle
    const config = await db.get('SELECT * FROM smtp_config WHERE is_active = 1');
    console.log('📋 Configuration active finale:');
    console.log({
      host: config.host,
      port: config.port,
      secure: Boolean(config.secure),
      username: config.username,
      from_email: config.from_email,
      from_name: config.from_name
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour de la configuration:', error);
  }
}

updateSmtpConfig();