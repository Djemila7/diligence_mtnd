import { getDatabase } from './backend/src/database/db.js';

async function checkActiveConfig() {
  try {
    const db = await getDatabase();
    
    // Vérifier quelle configuration est active
    const activeConfig = await db.get(`
      SELECT * FROM smtp_config 
      WHERE is_active = 1 
      ORDER BY id DESC 
      LIMIT 1
    `);
    
    console.log('🔍 Configuration active actuelle:');
    console.log(activeConfig);
    
    // Vérifier toutes les configurations actives
    const allActiveConfigs = await db.all(`
      SELECT id, host, port, username, from_email, from_name, is_active, updated_at
      FROM smtp_config 
      WHERE is_active = 1 
      ORDER BY id DESC
    `);
    
    console.log('\n📋 Toutes les configurations actives:');
    console.log(allActiveConfigs);
    
    // Vérifier la configuration la plus récente (peu importe is_active)
    const latestConfig = await db.get(`
      SELECT * FROM smtp_config 
      ORDER BY updated_at DESC 
      LIMIT 1
    `);
    
    console.log('\n🆕 Configuration la plus récente:');
    console.log(latestConfig);
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification de la configuration active:', error);
  }
}

checkActiveConfig();