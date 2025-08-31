// Script simple pour tester l'API SMTP avec curl
console.log('📋 Pour tester l\'API SMTP, utilisez cette commande curl:');
console.log('');
console.log('curl -X POST http://localhost:3003/api/smtp/test-connection \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -d \'{');
console.log('    "host": "smtp.gmail.com",');
console.log('    "port": "587",');
console.log('    "secure": "TLS",');
console.log('    "username": "votre-email@gmail.com",');
console.log('    "password": "votre-mot-de-passe-app"');
console.log('  }\'');
console.log('');
console.log('💡 Remplacez les valeurs par vos informations SMTP réelles');
console.log('📧 Pour Gmail, utilisez un "mot de passe d\'application"');
console.log('🔗 Guide: https://support.google.com/accounts/answer/185833');