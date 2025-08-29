# 🔧 Configuration SMTP Rapide

## Pourquoi les emails ne sont pas envoyés ?

Le système est configuré mais utilise des valeurs par défaut :
- Email: `your-email@gmail.com` (non valide)
- Mot de passe: `your-app-password` (non valide)

## 🚀 Configuration en 3 étapes

### 1. Pour Gmail (recommandé)
1. **Activez l'authentification 2 facteurs** sur votre compte Gmail
2. **Générez un mot de passe d'application** :
   - Allez dans: Paramètres Google → Sécurité → Validation en 2 étapes
   - En bas: "Mots de passe d'application"
   - Générez un mot de passe pour "Mail"
3. **Utilisez ce mot de passe** dans la configuration SMTP

### 2. Mettez à jour la configuration

Modifiez le fichier `update-smtp-config.js` avec vos informations :

```javascript
const smtpConfig = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: true,
  username: 'VOTRE-EMAIL@gmail.com',        // ← Votre email Gmail
  password: 'VOTRE-MOT-DE-PASSE-APP',       // ← Mot de passe d'application
  from_email: 'noreply@votre-domaine.com',  // ← Email d'envoi
  from_name: 'Système de Diligence',
  is_active: true
};
```

### 3. Exécutez la mise à jour

```bash
cd diligence_app
node update-smtp-config.js
```

## 🧪 Test immédiat

### Sans configuration SMTP
Utilisez le lien généré pour tester le frontend :
```
http://localhost:3000/reset-password?token=test-token-12345&email=test%40example.com
```

### Avec configuration SMTP
1. Redémarrez le backend : `cd backend && npm start`
2. Créez un utilisateur via l'interface admin
3. Vérifiez les logs : `node check-smtp-config.js`

## 🔍 Vérification

Après configuration, vérifiez que :
- ✅ Le service email s'initialise sans erreur
- ✅ Les emails apparaissent dans `email_logs`
- ✅ Le statut est "sent" et non "failed"

## 📞 Support

Si les emails ne sont toujours pas envoyés :
1. Vérifiez les logs du backend
2. Confirmez la configuration SMTP
3. Testez avec un autre service email (Outlook, etc.)

Le système est fonctionnel - il ne manque que la configuration SMTP réelle !