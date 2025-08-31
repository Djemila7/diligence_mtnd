import { getDatabase } from './backend/src/database/db.js';

async function finalCleanup() {
  try {
    const db = await getDatabase();
    
    console.log('🧹 Nettoyage final de la table smtp_config...');
    
    // Supprimer toutes les configurations existantes
    await db.run('DELETE FROM smtp_config');
    console.log('🗑️ Toutes les anciennes configurations supprimées');
    
    // Créer une seule configuration correcte avec vos identifiants
    await db.run(
      `INSERT INTO smtp_config (host, port, secure, username, password, from_email, from_name, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      ['smtp.gmail.com', 465, 1, 'tiabohdjemila7@gmail.com', 'ygmr irgf bnhn trkt', 'tiabohdjemila7@gmail.com', 'Système de Diligence']
    );
    
    console.log('✅ Configuration finale créée:');
    console.log({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      username: 'tiabohdjemila7@gmail.com',
      from_email: 'tiabohdjemila7@gmail.com',
      from_name: 'Système de Diligence'
    });
    
    // Vérifier qu'il n'y a qu'une seule configuration active
    const count = await db.get('SELECT COUNT(*) as total FROM smtp_config');
    console.log(`📊 Total des configurations: ${count.total}`);
    
    const activeCount = await db.get('SELECT COUNT(*) as active FROM smtp_config WHERE is_active = 1');
    console.log(`✅ Configurations actives: ${activeCount.active}`);
    
    const config = await db.get('SELECT * FROM smtp_config WHERE is_active = 1');
    console.log('🔍 Configuration active finale:');
    console.log({
      id: config.id,
      host: config.host,
      port: config.port,
      username: config.username,
      from_email: config.from_email,
      from_name: config.from_name
    });
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage final:', error);
  }
}

finalCleanup();