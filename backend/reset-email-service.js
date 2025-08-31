import { getDatabase } from './src/database/db.js';

async function resetEmailService() {
  console.log('🔄 Réinitialisation du service email...');
  
  try {
    const database = await getDatabase();
    
    // Vérifier la configuration actuelle
    const config = await database.get(
      'SELECT * FROM smtp_config WHERE is_active = 1 ORDER BY id DESC LIMIT 1'
    );
    
    console.log('📋 Configuration SMTP actuelle:');
    console.log('- Host:', config.host);
    console.log('- Port:', config.port);
    console.log('- Secure:', Boolean(config.secure));
    console.log('- Username:', config.username);
    console.log('- From Email:', config.from_email);
    console.log('- From Name:', config.from_name);
    
    // Forcer la réinitialisation en mettant à jour un champ
    await database.run(
      'UPDATE smtp_config SET updated_at = datetime("now") WHERE is_active = 1'
    );
    
    console.log('✅ Service email réinitialisé');
    console.log('🔄 Redémarrez le serveur backend pour appliquer les changements');
    
  } catch (error) {
    console.error('❌ Erreur lors de la réinitialisation:', error);
  }
}

resetEmailService();