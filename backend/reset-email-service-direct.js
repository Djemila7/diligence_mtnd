import emailService from './src/services/emailService.js';

async function resetEmailServiceDirect() {
  console.log('🔄 Réinitialisation directe du service email...');
  
  try {
    await emailService.reinitialize();
    console.log('✅ Service email réinitialisé avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de la réinitialisation:', error);
  }
}

resetEmailServiceDirect();