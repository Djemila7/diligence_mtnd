# Fonctionnalité de Traitement de Diligence

## 📋 Description
Cette nouvelle fonctionnalité permet aux destinataires de diligences de soumettre un formulaire de traitement avec :
- Upload de documents
- Commentaires sur le traitement effectué
- Mise à jour de la progression
- Changement de statut

## 🚀 Fonctionnalités implémentées

### 1. Page de Formulaire de Traitement
- **Route**: `/diligence/[id]/traitement`
- **Composant**: `src/app/diligence/[id]/traitement/page.tsx`
- **Accès**: Uniquement pour les utilisateurs destinataires de la diligence

### 2. API Endpoint
- **Route**: `/api/diligences/[id]/traitement`
- **Méthode**: POST
- **Fonctionnalités**:
  - Upload de fichiers (PDF, Word, Excel, Images)
  - Validation de taille (max 10MB par fichier)
  - Stockage dans `public/uploads/diligences/[id]/`
  - Mise à jour de la diligence dans le backend

### 3. Intégration avec l'API Client
- **Méthode**: `apiClient.traiterDiligence(diligenceId, formData)`
- **Gestion automatique** des tokens d'authentification
- **Logs de débogage** complets

## 🎯 Utilisation

### Pour les destinataires :
1. Naviguer vers la page de détail d'une diligence (`/diligence/[id]`)
2. Cliquer sur le bouton "Traiter la diligence" (visible uniquement si destinataire)
3. Remplir le formulaire :
   - Ajouter un commentaire
   - Sélectionner des fichiers à uploader
   - Ajuster la progression (0-100%)
   - Choisir le nouveau statut (En cours/Terminé)
4. Soumettre le formulaire

### Structure des données :
```typescript
interface TraitementFormData {
  commentaire: string;
  fichiers: File[];
  progression: number;
  statut: "En cours" | "Terminé";
}
```

## 🔧 Configuration technique

### Répertoire d'upload :
```
public/
  uploads/
    diligences/
      [diligence_id]/
        fichier1.pdf
        fichier2.docx
        ...
```

### Sécurité :
- Validation de la taille des fichiers (10MB max)
- Noms de fichiers uniques avec timestamp
- Vérification des permissions (destinataires seulement)

### API Backend :
L'endpoint proxy transmet les requêtes au backend Node.js sur `BACKEND_URL` et gère :
- L'authentification via tokens JWT
- Le formatage des données
- La gestion des erreurs

## 📦 Dépendances
Aucune nouvelle dépendance n'a été ajoutée. Utilisation des APIs natives :
- `FormData` pour l'upload de fichiers
- `fs/promises` pour le stockage des fichiers
- API Routes Next.js pour le traitement

## 🐛 Dépannage

### Problèmes courants :
1. **Erreur 404** : Vérifier que le backend est démarré sur le port 3003
2. **Erreur d'upload** : Vérifier les permissions d'écriture dans `public/uploads/`
3. **Erreur d'authentification** : Vérifier que l'utilisateur est connecté et destinataire

### Logs de débogage :
Les logs détaillés sont disponibles dans la console :
- Requêtes API
- État de l'upload
- Erreurs de validation

## 🔮 Améliorations futures
- Historique des traitements
- Notifications par email lors du traitement
- Prévisualisation des fichiers uploadés
- Validation des types de fichiers
- Compression automatique des images