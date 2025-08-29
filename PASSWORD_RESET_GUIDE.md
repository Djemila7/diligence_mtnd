# Guide d'utilisation du système de réinitialisation de mot de passe

## 📋 Fonctionnalités implémentées

### 1. Création d'utilisateur avec envoi d'email automatique
Lorsqu'un administrateur crée un nouvel utilisateur :
- Un mot de passe temporaire est défini
- Un token de réinitialisation sécurisé est généré
- Un email est envoyé automatiquement à l'utilisateur avec un lien de réinitialisation

### 2. Lien de réinitialisation sécurisé
Le lien contient :
- Un token unique valable 24 heures
- L'email de l'utilisateur encodé
- Redirection vers la page de réinitialisation

### 3. Page de réinitialisation frontend
Accessible via `/reset-password?token=...&email=...`
- Validation des tokens
- Interface utilisateur intuitive
- Confirmation de mot de passe
- Redirection automatique après succès

### 4. API backend sécurisée
- Vérification des tokens
- Validation des mots de passe
- Mise à jour sécurisée des mots de passe

## 🚀 Comment tester le système

### 1. Démarrer le backend
```bash
cd diligence_app/backend
npm start
```

### 2. Configurer SMTP (optionnel)
Par défaut, le système utilise une configuration SMTP de test. Pour utiliser un vrai service email :

1. Modifier la configuration dans la table `smtp_config`
2. Ou utiliser les variables d'environnement :
```bash
# Dans .env.local
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USERNAME=votre-email@gmail.com
SMTP_PASSWORD=votre-mot-de-passe-app
FROM_EMAIL=noreply@example.com
FROM_NAME="Système de Diligence"
```

### 3. Créer un utilisateur de test
Via l'interface admin ou l'API :
```bash
curl -X POST http://localhost:3003/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "temp123",
    "name": "Utilisateur Test",
    "role": "user"
  }'
```

### 4. Tester la réinitialisation
1. Récupérer le token depuis les logs de la base de données
2. Accéder à : `http://localhost:3000/reset-password?token=TOKEN&email=test@example.com`
3. Définir un nouveau mot de passe

## 🔧 Configuration SMTP

### Configuration par défaut
Le système inclut une configuration SMTP par défaut pour Gmail. Pour l'utiliser :

1. **Gmail** : Activer l'authentification 2 facteurs et générer un mot de passe d'application
2. **Mettre à jour la configuration** :
```sql
UPDATE smtp_config SET 
  username = 'votre-email@gmail.com',
  password = 'votre-mot-de-passe-app',
  is_active = 1;
```

### Autres providers
Modifier les paramètres selon votre provider :
- **Outlook/Hotmail** : `smtp.office365.com`, port 587
- **Yahoo** : `smtp.mail.yahoo.com`, port 587
- **Autre** : Consulter la documentation de votre provider

## 🐛 Dépannage

### Emails non envoyés
1. Vérifier la configuration SMTP
2. Vérifier les logs dans la table `email_logs`
3. Tester la connexion SMTP

### Token invalide
1. Vérifier que le token n'a pas expiré (24h)
2. Vérifier que le token n'a pas déjà été utilisé

### Erreur de connexion
1. Vérifier que le backend est démarré
2. Vérifier les ports (3003 pour le backend)

## 📊 Monitoring

### Logs des emails
Consulter la table `email_logs` pour :
- Suivre les envois d'emails
- Identifier les échecs d'envoi
- Debugger les problèmes SMTP

### Tokens actifs
Consulter la table `password_reset_tokens` pour :
- Voir les tokens générés
- Vérifier leur expiration
- Surveiller leur utilisation

## 🔒 Sécurité

### Mesures implémentées
- Tokens valables 24 heures uniquement
- Tokens à usage unique
- Validation côté serveur
- Mots de passe hashés avec bcrypt
- Protection contre les attaques par force brute

### Bonnes pratiques
- Utiliser des mots de passe complexes
- Changer régulièrement les mots de passe
- Surveiller les tentatives de réinitialisation
- Maintenir le système à jour

## 📞 Support

En cas de problème :
1. Vérifier les logs du backend
2. Consulter les tables de logs (`email_logs`, `password_reset_tokens`)
3. Tester la configuration SMTP
4. Vérifier la connectivité réseau

Le système est maintenant entièrement fonctionnel et prêt à être utilisé en production !