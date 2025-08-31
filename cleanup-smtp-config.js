import { getDatabase } from './backend/src/database/db.js';

async function cleanupSmtpConfig() {
  try {
    const db = await getDatabase();
    
    console.log('🧹 Nettoyage de la table smtp_config...');
    
    // Désactiver toutes les configurations
    await db.run('UPDATE smtp_config SET is_active = 0');
    
    // Garder seulement la configuration la plus récente
    const latestConfig = await db.get(`
      SELECT * FROM smtp_config 
      ORDER BY updated_at DESC 
      LIMIT 1
    `);
    
    if (latestConfig) {
      // Réactiver seulement la configuration la plus récente
      await db.run(
        'UPDATE smtp_config SET is_active = 1 WHERE id = ?',
        [latestConfig.id]
      );
      
      console.log('✅ Configuration maintenue active:');
      console.log({
        id: latestConfig.id,
        host: latestConfig.host,
        port: latestConfig.port,
        username: latestConfig.username,
        from_email: latestConfig.from_email,
        from_name: latestConfig.from_name,
        updated_at: latestConfig.updated_at
      });
    }
    
    // Compter le nombre de configurations
    const count = await db.get('SELECT COUNT(*) as total FROM smtp_config');
    console.log(`📊 Total des configurations: ${count.total}`);
    
    const activeCount = await db.get('SELECT COUNT(*) as active FROM smtp_config WHERE is_active = 1');
    console.log(`✅ Configurations actives: ${activeCount.active}`);
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  }
}

cleanupSmtpConfig();