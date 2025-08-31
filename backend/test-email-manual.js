import emailService from './src/services/emailService.js';

async function testEmailService() {
  console.log('🧪 Test manuel du service d\'email...');
  
  try {
    // Attendre que le service soit initialisé
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const testEmail = 'tiabohdjemila7@gmail.com';
    const testToken = 'test-token-123456';
    const testName = 'Test User';
    
    console.log('📧 Envoi d\'email de test à:', testEmail);
    
    const success = await emailService.sendPasswordResetEmail(testEmail, testToken, testName);
    
    if (success) {
      console.log('✅ Email envoyé avec succès!');
    } else {
      console.log('❌ Échec de l\'envoi de l\'email');
    }
    
  } catch (error) {
    console.error('💥 Erreur lors du test:', error);
  }
}

testEmailService();