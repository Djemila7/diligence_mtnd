#!/usr/bin/env node

/**
 * Script de test pour le service de mise à jour automatique des diligences
 * Ce script permet de tester manuellement la mise à jour des statuts
 */

import { initializeDatabase } from '../src/database/db.js';
import diligenceUpdater from '../src/services/diligenceUpdater.js';

async function testDiligenceUpdater() {
  console.log('🧪 Démarrage du test du service de mise à jour des diligences...\n');

  try {
    // Initialiser la base de données
    console.log('📦 Initialisation de la base de données...');
    await initializeDatabase();
    console.log('✅ Base de données initialisée\n');

    // Créer quelques données de test
    console.log('📋 Création de données de test...');
    const db = await initializeDatabase();
    
    // Insérer des diligences de test avec différentes dates
    const aujourdHui = new Date();
    const hier = new Date(aujourdHui);
    hier.setDate(aujourdHui.getDate() - 1);
    const demain = new Date(aujourdHui);
    demain.setDate(aujourdHui.getDate() + 1);

    const diligencesTest = [
      {
        titre: 'Diligence en retard (date hier)',
        directiondestinataire: 'Test Direction',
        datedebut: hier.toISOString().split('T')[0],
        datefin: hier.toISOString().split('T')[0],
        description: 'Diligence de test avec date dépassée',
        priorite: 'Haute',
        statut: 'En cours', // Doit devenir "En retard"
        created_by: 1
      },
      {
        titre: 'Diligence normale (date demain)',
        directiondestinataire: 'Test Direction',
        datedebut: aujourdHui.toISOString().split('T')[0],
        datefin: demain.toISOString().split('T')[0],
        description: 'Diligence de test avec date future',
        priorite: 'Moyenne',
        statut: 'En cours', // Doit rester "En cours"
        created_by: 1
      },
      {
        titre: 'Diligence planifiée (début aujourd\'hui)',
        directiondestinataire: 'Test Direction',
        datedebut: aujourdHui.toISOString().split('T')[0],
        datefin: demain.toISOString().split('T')[0],
        description: 'Diligence de test qui doit démarrer',
        priorite: 'Basse',
        statut: 'Planifié', // Doit devenir "En cours"
        created_by: 1
      }
    ];

    // Nettoyer les anciennes données de test
    await db.run("DELETE FROM diligences WHERE titre LIKE 'Diligence de test%'");

    // Insérer les nouvelles données
    for (const diligence of diligencesTest) {
      await db.run(
        `INSERT INTO diligences (titre, directiondestinataire, datedebut, datefin, description, priorite, statut, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [diligence.titre, diligence.directiondestinataire, diligence.datedebut, diligence.datefin, 
         diligence.description, diligence.priorite, diligence.statut, diligence.created_by]
      );
    }

    console.log('✅ Données de test créées\n');

    // Afficher l'état avant la mise à jour
    console.log('📊 État avant la mise à jour:');
    const avantUpdate = await db.all("SELECT id, titre, statut, datefin FROM diligences WHERE titre LIKE 'Diligence de test%' ORDER BY id");
    avantUpdate.forEach(d => {
      console.log(`   ${d.id}. ${d.titre} - Statut: ${d.statut} - Date fin: ${d.datefin}`);
    });
    console.log('');

    // Exécuter la mise à jour
    console.log('🔄 Exécution de la mise à jour automatique...');
    await diligenceUpdater.forceUpdate();
    console.log('✅ Mise à jour terminée\n');

    // Afficher l'état après la mise à jour
    console.log('📊 État après la mise à jour:');
    const apresUpdate = await db.all("SELECT id, titre, statut, datefin FROM diligences WHERE titre LIKE 'Diligence de test%' ORDER BY id");
    apresUpdate.forEach(d => {
      console.log(`   ${d.id}. ${d.titre} - Statut: ${d.statut} - Date fin: ${d.datefin}`);
    });
    console.log('');

    // Vérifier les résultats
    console.log('✅ Résultats du test:');
    const results = apresUpdate.map(d => {
      const expectedStatus = d.titre.includes('retard') ? 'En retard' : 
                            d.titre.includes('planifiée') ? 'En cours' : 'En cours';
      
      const isCorrect = d.statut === expectedStatus;
      console.log(`   ${d.titre}: ${isCorrect ? '✅' : '❌'} (Attendu: ${expectedStatus}, Obtenu: ${d.statut})`);
      return isCorrect;
    });

    const successCount = results.filter(r => r).length;
    const totalCount = results.length;

    console.log(`\n📈 Résumé: ${successCount}/${totalCount} tests réussis`);

    if (successCount === totalCount) {
      console.log('\n🎉 Tous les tests ont réussi ! Le service de mise à jour fonctionne correctement.');
    } else {
      console.log('\n⚠️  Certains tests ont échoué. Vérifiez la logique de mise à jour.');
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    process.exit(1);
  }
}

// Exécuter le test
testDiligenceUpdater().then(() => {
  console.log('\n🧪 Test terminé');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erreur non gérée:', error);
  process.exit(1);
});