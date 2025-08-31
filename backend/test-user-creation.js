import fetch from 'node-fetch';

async function testUserCreation() {
  console.log('🧪 Test de création d\'utilisateur avec envoi d\'email...');
  
  const userData = {
    email: 'test.user@example.com',
    password: 'tempPassword123',
    name: 'Test User',
    role: 'user',
    direction: 'Test Direction'
  };

  try {
    const response = await fetch('http://localhost:3003/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const result = await response.json();
    
    console.log('📋 Réponse du serveur:');
    console.log('- Status:', response.status);
    console.log('- Success:', result.success);
    console.log('- Message:', result.message);
    
    if (result.success) {
      console.log('✅ Utilisateur créé avec succès!');
      console.log('📧 L\'email de réinitialisation devrait avoir été envoyé');
    } else {
      console.log('❌ Erreur lors de la création:', result.error);
    }

  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);
  }
}

testUserCreation();