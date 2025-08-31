import http from 'http';

console.log('🧪 Test de l\'API SMTP...\n');

// Test de récupération de la configuration SMTP
function testGetSmtpConfig() {
  return new Promise((resolve, reject) => {
    console.log('📡 Récupération de la configuration SMTP via API...');
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/smtp/config',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('📊 Status:', res.statusCode);
        
        if (res.statusCode === 200) {
          try {
            const config = JSON.parse(data);
            console.log('✅ Configuration SMTP récupérée:');
            console.log('• Host:', config.host);
            console.log('• Port:', config.port);
            console.log('• Secure:', config.secure);
            console.log('• User:', config.user);
            console.log('• Password:', config.password ? '*** (présent)' : '❌ absent');
            resolve(config);
          } catch (error) {
            console.error('❌ Erreur parsing JSON:', error.message);
            reject(error);
          }
        } else {
          console.error('❌ Erreur API:', data);
          reject(new Error(`Status: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Erreur connexion API:', error.message);
      reject(error);
    });

    req.end();
  });
}

// Test d'envoi d'email via l'API
function testSendEmail() {
  return new Promise((resolve, reject) => {
    console.log('\n📤 Test d\'envoi d\'email via API...');
    
    const postData = JSON.stringify({
      to: 'tiabohdjemila7@gmail.com',
      subject: 'Test API SMTP',
      text: 'Ceci est un test d\'envoi d\'email via l\'API SMTP',
      html: '<h1>Test API SMTP</h1><p>Ceci est un test d\'envoi d\'email via l\'API SMTP</p>'
    });

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/smtp/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('📊 Status:', res.statusCode);
        
        if (res.statusCode === 200) {
          try {
            const result = JSON.parse(data);
            console.log('✅ Email envoyé via API !');
            console.log('📨 Message ID:', result.messageId);
            console.log('💬 Message:', result.message);
            resolve(result);
          } catch (error) {
            console.error('❌ Erreur parsing JSON:', error.message);
            console.log('📄 Réponse brute:', data);
            reject(error);
          }
        } else {
          console.error('❌ Erreur API:', data);
          reject(new Error(`Status: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Erreur connexion API:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Exécuter les tests
async function runTests() {
  try {
    console.log('🎯 Démarrage des tests API SMTP...\n');
    
    // Test 1: Récupération configuration
    await testGetSmtpConfig();
    
    // Attendre un peu pour éviter les timeouts
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Envoi d'email
    await testSendEmail();
    
    console.log('\n🎉 Tous les tests API SMTP ont réussi !');
    console.log('📧 Votre système est maintenant complètement opérationnel.');
    
  } catch (error) {
    console.error('\n❌ Erreur lors des tests:', error.message);
    console.log('💡 Vérifiez que le serveur backend est bien démarré sur le port 3001');
  }
}

runTests();