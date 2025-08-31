# Guide de Configuration SMTP

## Problème Actuel : Erreur d'Authentification Google
**"Invalid login: 535-5.7.8 Username and Password not accepted"**

Cette erreur signifie que Google rejette les identifiants. Causes possibles :

### 1. 🔐 Mot de Passe d'Application Requis
Google n'accepte plus les mots de passe principaux pour les applications SMTP.

**Solution :**
1. Allez sur https://myaccount.google.com/
2. Activez la **"Validation en 2 étapes"** (obligatoire)
3. Générez un **"Mot de passe d'application"**
4. Utilisez ce mot de passe (16 caractères) au lieu de votre mot de passe principal

### 2. ⚠️ Applications Moins Sécurisées Désactivées
Google peut bloquer les connexions des applications "moins sécurisées".

**Solution :**
1. Allez sur https://myaccount.google.com/security
2. Activez **"Accès moins sécurisé des applications"** (déconseillé)
3. **OU mieux** : Utilisez OAuth2 ou gardez "Accès moins sécurisé" activé temporairement

### 3. 🔒 Restrictions de Compte
Votre compte Gmail peut avoir des restrictions.

**Vérifiez :**
- Le compte n'est pas verrouillé pour sécurité
- Les connexions SMTP sont autorisées
- Aucune alerte de sécurité en attente

## Configuration Gmail Recommandée

### Paramètres SMTP :
- **Serveur** : `smtp.gmail.com`
- **Port** : `587` (recommandé) ou `465`
- **Sécurité** : `TLS` pour le port 587, `SSL` pour le port 465
- **Nom d'utilisateur** : Votre adresse Gmail complète
- **Mot de passe** : **Mot de passe d'application** (16 caractères)

## Test Rapide avec Ethereal Email

Pour tester sans configurer Gmail :

1. Allez sur https://ethereal.email/
2. Créez un compte gratuit
3. Utilisez ces paramètres :
   - **Serveur**: `smtp.ethereal.email`
   - **Port**: `587`
   - **Sécurité**: `false` (aucun chiffrement)
   - **Username/Password**: Ceux fournis par Ethereal

## Commandes de Test

```bash
# Test avec curl
curl -X POST http://localhost:3003/api/smtp/test-connection \
  -H "Content-Type: application/json" \
  -d '{
    "host": "smtp.gmail.com",
    "port": "587",
    "secure": "TLS",
    "username": "votre-email@gmail.com",
    "password": "votre-mot-de-passe-app"
  }'
```

## Erreurs Courantes et Solutions

- **535-5.7.8** : Mauvais identifiants → Utilisez un mot de passe d'application
- **534-5.7.14** : Validation 2 étapes required → Activez-la et créez un mot de passe app
- **550-5.7.1** : Envoi non autorisé → Vérifiez les restrictions du compte

## 📞 Support Google
Si les problèmes persistent : https://support.google.com/mail/answer/7126229