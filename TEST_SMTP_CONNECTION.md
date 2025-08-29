# 🧪 Test de la connexion SMTP

## Comment tester le bouton "Tester la connexion"

### 1. Remplissez le formulaire SMTP
Dans l'interface Paramètres → Configuration SMTP, remplissez :
- **Serveur SMTP** : `smtp.gmail.com`
- **Port** : `587`
- **Nom d'utilisateur** : Votre email Gmail complet
- **Mot de passe** : Votre mot de passe d'application Gmail
- **Chiffrement** : `TLS`

### 2. Cliquez sur "Tester la connexion"
Le système va :
1. Envoyer une requête à l'API `/api/smtp/test-connection`
2. Créer un transporteur Nodemailer temporaire
3. Utiliser la méthode `verify()` pour tester la connexion
4. Afficher le résultat (succès ou échec)

### 3. Résultats possibles

**✅ Succès** : 
```
Connexion SMTP réussie !
```

**❌ Échec** : 
- `Échec de la connexion SMTP: Invalid login`
- `Échec de la connexion SMTP: Connection timeout`
- `Tous les champs SMTP sont requis`

### 4. Dépannage des erreurs courantes

**"Invalid login"** :
- Vérifiez votre email et mot de passe d'application
- Assurez-vous que l'authentification 2 facteurs est activée
- Régénérez le mot de passe d'application si nécessaire

**"Connection timeout"** :
- Vérifiez le serveur SMTP et le port
- Vérifiez votre connexion internet
- Essayez avec un autre fournisseur SMTP

**"Tous les champs sont requis"** :
- Remplissez tous les champs du formulaire

## 📧 Configuration Gmail recommandée

```javascript
{
  host: 'smtp.gmail.com',
  port: 587,
  secure: true, // TLS
  auth: {
    user: 'votre-email@gmail.com',
    pass: 'votre-mot-de-passe-app' // Pas votre mot de passe normal !
  }
}
```

## 🔧 API endpoint

**POST** `/api/smtp/test-connection`
```json
{
  "host": "smtp.gmail.com",
  "port": "587",
  "secure": "TLS",
  "username": "email@gmail.com",
  "password": "mot-de-passe-app"
}
```

Le système est maintenant entièrement fonctionnel ! Le bouton "Tester la connexion" devrait travailler correctement avec une configuration SMTP valide.