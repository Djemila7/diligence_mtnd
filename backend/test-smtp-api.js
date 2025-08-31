import fetch from 'node-fetch';

async function testSmtpApi() {
  console.log('🧪 Test de l\'API SMTP...');
  
  const testData = {
    host: 'smtp.gmail.com',
    port: '587',
    secure: 'TLS',
    username: 'your-real-email@gmail.com', // Remplacez par votre email réel
    password: 'your-real-app-password'     // Remplacez par votre mot de passe d'application
  };

  console.log('Données de test:', testData);

  try {
    const response = await fetch('http://localhost:3003/api/smtp/test-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    console.log('Status:', response.status);
    console.log('Réponse:', result);

    if (response.ok) {
      console.log('✅ Test API SMTP réussi !');
    } else {
      console.log('❌ Test API SMTP échoué');
    }

  } catch (error) {
    console.error('❌ Erreur lors du test API:');
    console.error('Message:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('🔍 Le serveur backend n\'est pas démarré ou n\'écoute pas sur le port 3003');
      console.log('💡 Exécutez: cd backend && npm start');
    }
  }
}

testSmtpApi();