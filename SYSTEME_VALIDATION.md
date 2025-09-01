# Système de Validation des Diligences

## 📋 Aperçu

Ce document décrit le nouveau système de validation des diligences qui permet aux émetteurs de valider ou rejeter le travail effectué par les destinataires.

## 🎯 Fonctionnalités Implémentées

### 1. Nouveau Statut "À valider"
- Ajout du statut "À valider" dans le système
- Une diligence passe automatiquement à "À valider" lorsqu'un destinataire la marque comme "Terminé"

### 2. Notification Automatique
- L'émetteur reçoit une notification email lorsque la diligence est terminée
- Notification dans l'interface avec badge sur l'icône de cloche
- Email avec lien direct vers la page de validation

### 3. Interface de Validation
- Composant dédié pour valider/rejeter les diligences
- Champ de commentaire optionnel pour justifier la décision
- Affichage conditionnel : seulement visible pour l'émetteur et les admins

### 4. Notifications de Résultat
- Email automatique au destinataire lorsque la diligence est validée/rejetée
- Commentaire du validateur inclus dans l'email

## 🗃️ Modifications de la Base de Données

### Nouvelle Table `diligence_validations`
```sql
CREATE TABLE diligence_validations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  diligence_id INTEGER NOT NULL,
  validated_by INTEGER NOT NULL,
  validation_status TEXT NOT NULL CHECK(validation_status IN ('approved', 'rejected')),
  comment TEXT,
  validated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (diligence_id) REFERENCES diligences(id) ON DELETE CASCADE,
  FOREIGN KEY (validated_by) REFERENCES users(id)
);
```

### Mise à jour de la Table `diligences`
- Ajout du statut "À valider" dans les contraintes CHECK
- Mise à jour du schéma SQL

## 🔄 Workflow de Validation

1. **Destinataire termine la diligence** → Statut passe à "À valider"
2. **Notification automatique** à l'émetteur
3. **Émetteur consulte la diligence** et utilise le composant de validation
4. **Validation/Rejet** avec commentaire optionnel
5. **Notification automatique** au destinataire avec le résultat
6. **Statut final** : "Terminé" (validé) ou "En cours" (rejeté)

## 📧 Templates d'Emails

### Email de Notification à l'Émetteur
```
Sujet: ✅ Diligence terminée - [Titre] (À valider)

Bonjour [Nom Émetteur],

La diligence "[Titre]" a été terminée et est maintenant en attente de validation.

Progression: 100%
Commentaire: [Commentaire du destinataire]
Fichiers joints: [Nombre] document(s)

Action requise: Veuillez valider ou rejeter le travail effectué dans votre tableau de bord.

→ Valider la diligence: [Lien vers la diligence]
```

### Email de Validation Acceptée
```
Sujet: ✅ Diligence validée - [Titre]

Bonjour [Nom Destinataire],

Votre travail sur la diligence "[Titre]" a été validé avec succès.

Commentaire du validateur: [Commentaire]

Félicitations pour votre travail !
```

### Email de Validation Rejetée
```
Sujet: ❌ Diligence rejetée - [Titre]

Bonjour [Nom Destinataire],

Votre travail sur la diligence "[Titre]" a été rejeté.

Commentaire du validateur: [Commentaire]

Veuillez reprendre le travail et soumettre à nouveau la diligence une fois terminée.
```

## 🛠️ API Endpoints

### POST `/api/diligences/:id/validate`
Valide ou rejette une diligence

**Body:**
```json
{
  "validation_status": "approved" | "rejected",
  "comment": "string (optionnel)"
}
```

**Permissions:**
- Seul l'émetteur de la diligence peut valider
- Les administrateurs peuvent également valider

## 🎨 Composants Frontend

### `DiligenceValidation.tsx`
Composant React pour gérer la validation des diligences

**Props:**
- `diligenceId: number` - ID de la diligence
- `isCreator: boolean` - Si l'utilisateur est le créateur
- `currentStatus: string` - Statut actuel de la diligence
- `onValidationComplete: () => void` - Callback après validation

## 🔧 Configuration Requise

### Mise à jour de la Base de Données
Le schéma de base de données doit être mis à jour avec les nouvelles tables et contraintes.

### Redémarrage du Serveur
Le serveur backend doit être redémarré pour prendre en compte les modifications.

## 🧪 Tests Recommandés

1. Créer une nouvelle diligence
2. Assigner à un destinataire
3. Destinataire traite et termine la diligence
4. Vérifier la notification à l'émetteur
5. Émetteur valide/rejette la diligence
6. Vérifier la notification au destinataire
7. Vérifier le statut final de la diligence

## 📊 Logs de Débogage

Le système inclut des logs détaillés pour :
- Vérification des nouvelles diligences
- Envoi d'emails de notification
- Processus de validation
- Erreurs éventuelles

## 🔒 Sécurité

- Vérification des permissions : seul l'émetteur peut valider
- Validation des données d'entrée
- Gestion des erreurs robuste
- Transactions sécurisées avec la base de données