import { getDatabase } from './backend/src/database/db.js';

async function resetSmtpConfig() {
  try {
    const db = await getDatabase();
    
    console.log('🔄 Réinitialisation complète de la table smtp_config...');
    
    // Supprimer toutes les configurations existantes
    await db.run('DELETE FROM smtp_config');
    console.log('🗑️ Toutes les configurations supprimées');
    
    // Créer une configuration par défaut avec vos identifiants réels
    await db.run(
      `INSERT INTO smtp_config (host, port, secure, username, password, from_email, from_name, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      ['smtp.gmail.com', 587, 1, 'tiabohdjemila7@gmail.com', 'ygmr irgf bnhn trkt', 'tiabohdjemila7@gmail.com', 'Système de Diligence']
    );
    
    console.log('✅ Configuration réinitialisée avec vos identifiants:');
    console.log({
      host: 'smtp.gmail.com',
      port: 587,
      username: 'tiabohdjemila7@gmail.com',
      from_email: 'tiabohdjemila7@gmail.com',
      from_name: 'Système de Diligence'
    });
    
    // Vérifier le résultat
    const config = await db.get('SELECT * FROM smtp_config WHERE is_active = 1');
    console.log('📋 Configuration active actuelle:');
    console.log(config);
    
  } catch (error) {
    console.error('❌ Erreur lors de la réinitialisation:', error);
  }
}

resetSmtpConfig();