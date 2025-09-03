// Script de test pour valider une diligence
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3003/api';

async function testValidation() {
  console.log('🧪 Test de validation de diligence...');

  try {
    // 1. Se connecter en tant qu'admin
    console.log('🔐 Connexion en tant qu\'admin...');
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Échec de la connexion: ${loginResponse.status} ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    console.log('✅ Connexion réussie:', loginData.message);
    
    const token = loginData.token;
    if (!token) {
      throw new Error('Token non reçu dans la réponse de connexion');
    }

    // 2. Récupérer les diligences
    console.log('📋 Récupération des diligences...');
    const diligencesResponse = await fetch(`${BASE_URL}/diligences`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (!diligencesResponse.ok) {
      throw new Error(`Échec de la récupération des diligences: ${diligencesResponse.status} ${diligencesResponse.statusText}`);
    }

    const diligences = await diligencesResponse.json();
    console.log(`📊 ${diligences.length} diligence(s) trouvée(s)`);

    // Trouver une diligence en statut "À valider"
    const diligenceAValider = diligences.find(d => d.statut === 'À valider');
    
    if (!diligenceAValider) {
      console.log('ℹ️ Aucune diligence en statut "À valider". Création d\'une nouvelle diligence...');
      
      // Créer une nouvelle diligence
      const createResponse = await fetch(`${BASE_URL}/diligences`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          titre: 'Diligence de test pour validation',
          directiondestinataire: 'Test',
          datedebut: '2025-01-01',
          datefin: '2025-01-10',
          description: 'Diligence créée pour tester le processus de validation',
          priorite: 'Moyenne',
          statut: 'À valider',
          destinataire: '[]',
          progression: 100,
          created_by: loginData.user.id
        })
      });

      if (!createResponse.ok) {
        throw new Error(`Échec de la création de la diligence: ${createResponse.status} ${createResponse.statusText}`);
      }

      const createData = await createResponse.json();
      console.log('✅ Diligence créée:', createData.message);
      
      // Utiliser cette nouvelle diligence pour le test
      const diligenceId = createData.diligenceId;
      
      // 3. Valider la diligence
      console.log(`✅ Validation de la diligence ${diligenceId}...`);
      const validateResponse = await fetch(`${BASE_URL}/diligences/${diligenceId}/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          validation_status: 'approved',
          comment: 'Test de validation réussi'
        })
      });

      if (!validateResponse.ok) {
        const errorText = await validateResponse.text();
        console.error('❌ Réponse de validation:', validateResponse.status, validateResponse.statusText);
        console.error('❌ Détails de l\'erreur:', errorText);
        throw new Error(`Échec de la validation: ${validateResponse.status} ${validateResponse.statusText}`);
      }

      const validateData = await validateResponse.json();
      console.log('🎉 Validation réussie:', validateData.message);
      
    } else {
      console.log(`✅ Diligence trouvée en statut "À valider": ${diligenceAValider.id} - ${diligenceAValider.titre}`);
      
      // 3. Valider la diligence existante
      console.log(`✅ Validation de la diligence ${diligenceAValider.id}...`);
      const validateResponse = await fetch(`${BASE_URL}/diligences/${diligenceAValider.id}/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          validation_status: 'approved',
          comment: 'Test de validation réussi'
        })
      });

      if (!validateResponse.ok) {
        const errorText = await validateResponse.text();
        console.error('❌ Réponse de validation:', validateResponse.status, validateResponse.statusText);
        console.error('❌ Détails de l\'erreur:', errorText);
        throw new Error(`Échec de la validation: ${validateResponse.status} ${validateResponse.statusText}`);
      }

      const validateData = await validateResponse.json();
      console.log('🎉 Validation réussie:', validateData.message);
    }

    console.log('✅ Test de validation terminé avec succès !');

  } catch (error) {
    console.error('❌ Erreur lors du test de validation:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Exécuter le test
testValidation();