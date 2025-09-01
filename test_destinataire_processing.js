// Script pour tester le traitement des destinataires comme le fait le backend
console.log('🧪 Test du traitement des destinataires...');

// Simuler les données comme elles viennent de la base
const sampleDestinataires = [
  // Cas normal - ID numérique
  '[1, 2, 3]',
  // Cas problématique - ID comme objet
  '[object Object]',
  // Autre cas problématique
  'Utilisateur [object Object]',
  // Tableau mixte
  '[1, "Utilisateur [object Object]", 3]',
  // Chaîne simple
  '2',
  // Tableau vide
  '[]',
  // Null
  null
];

const usersList = [
  { id: 1, name: 'Utilisateur 1', email: 'user1@example.com' },
  { id: 2, name: 'Utilisateur 2', email: 'user2@example.com' },
  { id: 3, name: 'Utilisateur 3', email: 'user3@example.com' }
];

sampleDestinataires.forEach((destinataire, index) => {
  console.log(`\n=== Test ${index + 1}: "${destinataire}" ===`);
  
  let destinataireIds = [];
  let destinataireDetails = [];
  
  if (destinataire) {
    try {
      // Parser comme le fait le backend
      if (typeof destinataire === 'string') {
        try {
          const parsed = JSON.parse(destinataire);
          destinataireIds = Array.isArray(parsed) ? parsed : [parsed];
          console.log('Parsé comme JSON:', destinataireIds);
        } catch {
          destinataireIds = [destinataire];
          console.log('Non JSON, utilisé comme chaîne:', destinataireIds);
        }
      } else if (Array.isArray(destinataire)) {
        destinataireIds = destinataire;
        console.log('Déjà un tableau:', destinataireIds);
      }
      
      // Traiter chaque ID comme le fait le backend
      destinataireDetails = destinataireIds.map(id => {
        console.log('Traitement de l\'ID:', id, 'Type:', typeof id);
        
        // Vérifier si l'ID est un objet mal formaté
        if (id && typeof id === 'object') {
          console.log('⚠️  ID est un objet:', id);
          // Essayer de convertir en string
          const stringId = String(id);
          console.log('Converti en string:', stringId);
          
          if (stringId === '[object Object]') {
            console.log('❌ Objet mal formaté détecté!');
            return { id: stringId, name: `Utilisateur ${stringId}` };
          }
          
          // Essayer de trouver l'utilisateur avec l'ID converti
          const user = usersList.find(u => u.id == stringId);
          return user ? { id: user.id, name: user.name, email: user.email } : { id: stringId, name: `Utilisateur ${stringId}` };
        }
        
        // Traitement normal
        const user = usersList.find(u => u.id == id);
        return user ? { id: user.id, name: user.name, email: user.email } : { id, name: `Utilisateur ${id}` };
      });
      
    } catch (error) {
      console.error('Erreur lors du traitement:', error.message);
      destinataireDetails = [{ id: 'error', name: 'Erreur de traitement' }];
    }
  }
  
  console.log('Résultat final:', destinataireDetails);
  
  // Vérifier si des [object Object] sont présents
  const hasObjectObject = destinataireDetails.some(dest => 
    dest.id === '[object Object]' || dest.name.includes('[object Object]')
  );
  
  if (hasObjectObject) {
    console.log('🚨 PROBLEME DÉTECTÉ: [object Object] présent dans les résultats!');
  } else {
    console.log('✅ Aucun problème détecté');
  }
});

console.log('\n🔍 Vérification des cas problématiques spécifiques:');
const problematicCases = [
  { id: { toString: () => '[object Object]' }, name: 'Test Object' },
  { id: {}, name: 'Empty Object' },
  { id: null, name: 'Null ID' }
];

problematicCases.forEach((caseData, index) => {
  console.log(`\nCas problématique ${index + 1}:`, caseData);
  
  // Simuler ce qui se passe dans le map
  const result = { 
    id: caseData.id, 
    name: `Utilisateur ${caseData.id}` 
  };
  
  console.log('Résultat:', result);
  
  if (result.id === '[object Object]' || result.name.includes('[object Object]')) {
    console.log('🚨 PROBLÈME: Génération de [object Object]');
  }
});