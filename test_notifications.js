// Script de test pour vérifier le système de notifications
console.log('🧪 Test du système de notifications');

// Fonction pour simuler un événement d'assignation de diligence
function testDiligenceAssignedEvent() {
  console.log('🔔 Test: Simulation d\'événement diligenceAssigned');
  
  const eventDetail = {
    diligenceTitle: "Test de diligence",
    userId: "1", // ID de l'utilisateur test
    userName: "Utilisateur Test"
  };
  
  const event = new CustomEvent('diligenceAssigned', {
    detail: eventDetail,
    bubbles: true,
    composed: true
  });
  
  window.dispatchEvent(event);
  console.log('✅ Événement diligenceAssigned simulé avec succès');
}

// Fonction pour simuler un événement de validation de diligence
function testDiligenceValidationEvent() {
  console.log('🔔 Test: Simulation d\'événement diligenceValidation');
  
  const eventDetail = {
    diligenceTitle: "Test de diligence à valider",
    diligenceId: 123,
    status: "approved",
    validatedBy: "2" // ID d'un autre utilisateur
  };
  
  const event = new CustomEvent('diligenceValidation', {
    detail: eventDetail,
    bubbles: true,
    composed: true
  });
  
  window.dispatchEvent(event);
  console.log('✅ Événement diligenceValidation simulé avec succès');
}

// Ajouter les fonctions au scope global pour les tester depuis la console
window.testNotifications = {
  testDiligenceAssignedEvent,
  testDiligenceValidationEvent
};

console.log('📋 Commandes disponibles:');
console.log('- testNotifications.testDiligenceAssignedEvent()');
console.log('- testNotifications.testDiligenceValidationEvent()');
console.log('💡 Exécutez ces commandes dans la console du navigateur pour tester');