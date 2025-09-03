import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import multer from 'multer';
import fs from 'fs';
import { initializeDatabase, getDatabase } from './database/db.js';
import emailService from './services/emailService.js';

// Configuration des chemins pour ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const app = express();
const PORT = process.env.BACKEND_PORT || 3003;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3006'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration de multer pour l'upload de fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max par fichier
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé'));
    }
  }
});

// Initialiser la base de données
let db;
initializeDatabase().then(database => {
  db = database;
  console.log('✅ Base de données initialisée');
  
  // Démarrer le service de mise à jour automatique des diligences
  import('./services/diligenceUpdater.js').then(updaterModule => {
    const diligenceUpdater = updaterModule.default;
    diligenceUpdater.startAutoUpdate(5); // Mise à jour toutes les 5 minutes
  }).catch(error => {
    console.error('❌ Erreur lors du chargement du service de mise à jour:', error);
  });
  
}).catch(error => {
  console.error('❌ Erreur lors de l\'initialisation de la base de données:', error);
  process.exit(1);
});

// Routes de base pour tester le serveur
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend Node.js fonctionne correctement',
    timestamp: new Date().toISOString(),
    database: db ? 'Connectée' : 'Non connectée'
  });
});

// Route pour obtenir la liste des utilisateurs
app.get('/api/users', async (req, res) => {
  try {
    const database = await getDatabase();
    const users = await database.all('SELECT id, email, name, role, direction, created_at FROM users WHERE is_active = 1');
    res.json(users);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Route pour créer un nouvel utilisateur
app.post('/api/users', async (req, res) => {
  const { email, password, name, role, direction } = req.body;
  
  if (!email || !name) {
    return res.status(400).json({
      error: 'Email et nom complet sont requis'
    });
  }

  // Validation : l'email doit être valide
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: 'Veuillez entrer une adresse email valide'
    });
  }

  // Pour la création, le mot de passe est requis
  if (!password) {
    return res.status(400).json({
      error: 'Le mot de passe est requis pour la création d\'un utilisateur'
    });
  }

  try {
    const database = await getDatabase();
    
    // Vérifier si l'utilisateur existe déjà (uniquement les utilisateurs actifs)
    const existingUser = await database.get(
      'SELECT id FROM users WHERE email = ? AND is_active = 1',
      [email]
    );
    
    if (existingUser) {
      return res.status(409).json({
        error: 'Un utilisateur avec cet email existe déjà'
      });
    }

    // Hasher le mot de passe
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Créer l'utilisateur avec un mot de passe temporaire
    const result = await database.run(
      `INSERT INTO users (email, password_hash, name, role, direction, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, 1, datetime('now'))`,
      [email, passwordHash, name, role || 'user', direction || '']
    );

    const userId = result.lastID;

    // Générer un token de réinitialisation
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures

    await database.run(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, resetToken, expiresAt.toISOString()]
    );

    // Envoyer l'email de réinitialisation (en arrière-plan)
    emailService.sendPasswordResetEmail(email, resetToken, name)
      .then(success => {
        if (success) {
          console.log(`✅ Email de réinitialisation envoyé à ${email}`);
        } else {
          console.warn(`⚠️ Échec de l'envoi de l'email à ${email}`);
        }
      })
      .catch(error => {
        console.error(`❌ Erreur lors de l'envoi de l'email:`, error);
      });

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès. Un email de réinitialisation a été envoyé.',
      userId: userId
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Route pour modifier un utilisateur
app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { email, name, role, password, direction } = req.body;
  
  if (!email || !name) {
    return res.status(400).json({
      error: 'Email et nom complet sont requis'
    });
  }

  // Validation : l'email doit être valide
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: 'Veuillez entrer une adresse email valide'
    });
  }

  try {
    const database = await getDatabase();
    
    // Vérifier si l'utilisateur existe
    const user = await database.get(
      'SELECT id, email FROM users WHERE id = ? AND is_active = 1',
      [id]
    );
    
    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé'
      });
    }

    // Vérifier si l'email est déjà utilisé par un autre utilisateur
    if (email !== user.email) {
      const existingUser = await database.get(
        'SELECT id FROM users WHERE email = ? AND id != ? AND is_active = 1',
        [email, id]
      );
      
      if (existingUser) {
        return res.status(409).json({
          error: 'Un utilisateur avec cet email existe déjà'
        });
      }
    }

    let updateQuery = 'UPDATE users SET email = ?, name = ?, role = ?, direction = ?';
    let queryParams = [email, name, role || 'user', direction || ''];

    // Mettre à jour le mot de passe seulement si fourni
    if (password) {
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      updateQuery += ', password_hash = ?';
      queryParams.push(passwordHash);
    }

    updateQuery += ' WHERE id = ?';
    queryParams.push(id);

    await database.run(updateQuery, queryParams);

    res.json({
      success: true,
      message: 'Utilisateur modifié avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la modification de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Route pour supprimer un utilisateur
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({
      error: 'ID utilisateur requis'
    });
  }

  try {
    const database = await getDatabase();
    
    // Vérifier si l'utilisateur existe
    const user = await database.get(
      'SELECT id FROM users WHERE id = ? AND is_active = 1',
      [id]
    );
    
    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé'
      });
    }

    // Désactiver l'utilisateur (soft delete)
    await database.run(
      'UPDATE users SET is_active = 0 WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Utilisateur supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Route d'authentification
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email et mot de passe requis' 
    });
  }

  try {
    const database = await getDatabase();
    const user = await database.get(
      'SELECT id, email, name, role, password_hash FROM users WHERE email = ? AND is_active = 1',
      [email]
    );

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
    }

    // Vérification du mot de passe avec bcrypt
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (isValidPassword) {
      // Générer un token JWT
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        process.env.JWT_SECRET || 'fallback-secret-key-change-in-production',
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        message: 'Connexion réussie',
        token: token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Mot de passe incorrect'
      });
    }
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
  });
  
  // Middleware pour vérifier l'authentification JWT
  const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token d\'accès requis'
      });
    }
  
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'fallback-secret-key-change-in-production'
      );
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(403).json({
        success: false,
        message: 'Token invalide ou expiré'
      });
    }
  };
  
  // Route pour obtenir les informations de l'utilisateur connecté
  app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
      const database = await getDatabase();
      const user = await database.get(
        `SELECT u.id, u.email, u.name, u.role, p.phone, p.poste
         FROM users u
         LEFT JOIN profiles p ON u.id = p.user_id
         WHERE u.id = ? AND u.is_active = 1`,
        [req.user.id]
      );
  
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }
  
      res.json(user);
    } catch (error) {
      console.error('Erreur lors de la récupération des informations utilisateur:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  });

  // Route pour mettre à jour le profil utilisateur
  app.put('/api/auth/profile', authenticateToken, async (req, res) => {
    const { name, phone, poste } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Le nom est requis'
      });
    }

    try {
      const database = await getDatabase();
      
      // Mettre à jour les informations de base dans la table users
      await database.run(
        'UPDATE users SET name = ?, updated_at = datetime("now") WHERE id = ?',
        [name, req.user.id]
      );

      // Vérifier si un profil existe déjà
      const existingProfile = await database.get(
        'SELECT id FROM profiles WHERE user_id = ?',
        [req.user.id]
      );

      if (existingProfile) {
        // Mettre à jour le profil existant
        await database.run(
          'UPDATE profiles SET phone = ?, poste = ?, updated_at = datetime("now") WHERE user_id = ?',
          [phone, poste, req.user.id]
        );
      } else {
        // Créer un nouveau profil
        await database.run(
          'INSERT INTO profiles (user_id, phone, poste) VALUES (?, ?, ?)',
          [req.user.id, phone, poste]
        );
      }

      res.json({
        success: true,
        message: 'Profil mis à jour avec succès'
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur'
      });
    }
  });
  
  // Route pour tester la connexion SMTP
  app.post('/api/smtp/test-connection', async (req, res) => {
    const { host, port, secure, username, password } = req.body;
  
    console.log('📨 Requête de test SMTP reçue:', { host, port, secure, username });
  
    if (!host || !port || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs SMTP sont requis'
      });
    }
  
    try {
      // Convertir correctement le paramètre secure en fonction du port
      let secureBool;
      const portNumber = parseInt(port);
      
      if (isNaN(portNumber)) {
        return res.status(400).json({
          success: false,
          message: 'Le port doit être un nombre valide'
        });
      }
      
      // Gestion spéciale pour les ports courants
      if (portNumber === 465) {
        secureBool = true; // SSL
      } else if (portNumber === 587) {
        secureBool = false; // STARTTLS (pas secure=true pour nodemailer)
      } else if (secure === 'TLS' || secure === 'SSL' || secure === 'true') {
        secureBool = true;
      } else if (secure === 'false') {
        secureBool = false;
      } else {
        // Déduire du port si non spécifié
        secureBool = portNumber === 465 || portNumber === 993 || portNumber === 995;
      }
  
      console.log('🔧 Configuration SMTP pour test:', {
        host,
        port: portNumber,
        secure: secureBool,
        username
      });
  
      // Créer un transporteur temporaire pour tester la connexion
      const testTransporter = nodemailer.createTransport({
        host: host,
        port: portNumber,
        secure: secureBool,
        auth: {
          user: username,
          pass: password
        },
        // Options de débogage
        debug: true,
        logger: true
      });
  
      // Tester la connexion avec la méthode verify()
      console.log('🔗 Test de connexion SMTP en cours...');
      await testTransporter.verify();
      console.log('✅ Connexion SMTP réussie !');
  
      res.json({
        success: true,
        message: 'Connexion SMTP réussie !'
      });
  
    } catch (error) {
      console.error('❌ Erreur de connexion SMTP détaillée:');
      console.error('Message:', error.message);
      console.error('Code:', error.code);
      console.error('Stack:', error.stack);
      
      let errorMessage = `Échec de la connexion SMTP: ${error.message}`;
      
      // Messages d'erreur plus spécifiques
      if (error.code === 'EAUTH') {
        errorMessage = 'Erreur d\'authentification - vérifiez le nom d\'utilisateur et le mot de passe';
      } else if (error.code === 'ECONNECTION') {
        errorMessage = 'Impossible de se connecter au serveur - vérifiez l\'hôte et le port';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Timeout de connexion - le serveur ne répond pas';
      }
  
      res.status(500).json({
        success: false,
        message: errorMessage
      });
    }
  });
  
  // Route pour réinitialiser le mot de passe avec un token
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, email, password } = req.body;
  
  if (!token || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Token, email et nouveau mot de passe requis'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Le mot de passe doit contenir au moins 6 caractères'
    });
  }

  try {
    const database = await getDatabase();
    
    // Vérifier si le token est valide et non expiré
    const resetToken = await database.get(
      `SELECT prt.*, u.email
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = ? AND u.email = ? AND prt.expires_at > datetime('now') AND prt.used = 0`,
      [token, email]
    );

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: 'Token de réinitialisation invalide, expiré ou déjà utilisé'
      });
    }

    // Hasher le nouveau mot de passe
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Mettre à jour le mot de passe de l'utilisateur
    await database.run(
      'UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?',
      [passwordHash, resetToken.user_id]
    );

    // Marquer le token comme utilisé
    await database.run(
      'UPDATE password_reset_tokens SET used = 1 WHERE id = ?',
      [resetToken.id]
    );

    res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

// Route pour sauvegarder la configuration SMTP
app.post('/api/smtp/save-config', async (req, res) => {
  const { host, port, secure, username, password, from_email, from_name } = req.body;

  if (!host || !port || !username || !from_email || !from_name) {
    return res.status(400).json({
      success: false,
      message: 'Tous les champs SMTP sont requis'
    });
  }

  try {
    const database = await getDatabase();

    // Convertir correctement le paramètre secure en fonction du port
    let isSecure;
    const portNumber = parseInt(port);
    
    if (isNaN(portNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Le port doit être un nombre valide'
      });
    }
    
    // Gestion spéciale pour les ports courants
    if (portNumber === 465) {
      isSecure = true; // SSL
    } else if (portNumber === 587) {
      isSecure = false; // STARTTLS (pas secure=true pour nodemailer)
    } else if (secure === 'TLS' || secure === 'SSL' || secure === 'true') {
      isSecure = true;
    } else if (secure === 'false') {
      isSecure = false;
    } else {
      // Déduire du port si non spécifié
      isSecure = portNumber === 465 || portNumber === 993 || portNumber === 995;
    }

    console.log('💾 Sauvegarde configuration SMTP:', {
      host,
      port: portNumber,
      secure: isSecure,
      username,
      from_email,
      from_name
    });

    try {
      // Désactiver TOUTES les configurations existantes (pas seulement les actives)
      await database.run('UPDATE smtp_config SET is_active = 0');

      // Si le mot de passe est fourni, l'utiliser, sinon récupérer l'ancien mot de passe
      let finalPassword = password;
      if (!password || password.trim() === '') {
        // Récupérer le mot de passe de la configuration active précédente
        const previousConfig = await database.get(
          'SELECT password FROM smtp_config WHERE is_active = 1 ORDER BY id DESC LIMIT 1'
        );
        if (previousConfig) {
          finalPassword = previousConfig.password;
        } else {
          // Pour la première configuration, le mot de passe doit être fourni
          return res.status(400).json({
            success: false,
            message: 'Mot de passe requis pour la première configuration'
          });
        }
      }

      // Créer une nouvelle configuration active
      const result = await database.run(
        `INSERT INTO smtp_config (host, port, secure, username, password, from_email, from_name, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [host, portNumber, isSecure ? 1 : 0, username, finalPassword, from_email, from_name]
      );

      console.log('✅ Configuration SMTP sauvegardée avec succès, ID:', result.lastID);

      res.json({
        success: true,
        message: password
          ? 'Configuration SMTP sauvegardée avec succès, y compris le mot de passe'
          : 'Configuration SMTP sauvegardée avec succès (mot de passe conservé)'
      });

    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde SMTP:', error);
      throw error;
    }

  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde de la configuration SMTP:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur lors de la sauvegarde'
    });
  }
});

// Route pour obtenir la configuration SMTP
app.get('/api/smtp/config', async (req, res) => {
  try {
    const database = await getDatabase();
    const config = await database.get(
      'SELECT * FROM smtp_config WHERE is_active = 1 ORDER BY id DESC LIMIT 1'
    );

    if (config) {
      res.json({
        host: config.host,
        port: config.port,
        secure: Boolean(config.secure),
        username: config.username, // Correction: utiliser 'username' au lieu de 'user'
        password: config.password, // Inclure le mot de passe dans la réponse
        from_email: config.from_email,
        from_name: config.from_name
      });
    } else {
      res.json(null);
    }

  } catch (error) {
    console.error('Erreur lors de la récupération de la configuration SMTP:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

// Route pour réinitialiser le service email (pour forcer le rechargement de la configuration)
app.post('/api/smtp/reinitialize', async (req, res) => {
  try {
    await emailService.reinitialize();
    res.json({
      success: true,
      message: 'Service email réinitialisé avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur lors de la réinitialisation du service email:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

// Route pour envoyer des notifications par email
app.post('/api/smtp/send-notification', async (req, res) => {
  const { to, subject, message, type } = req.body;
  
  if (!to || !subject || !message) {
    return res.status(400).json({
      success: false,
      message: 'Destinataire, sujet et message sont requis'
    });
  }

  try {
    // Formater le message HTML avec un template professionnel
    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .notification { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Système de Diligence</h1>
          </div>
          <div class="content">
            <div class="notification">
              ${message}
            </div>
          </div>
          <div class="footer">
            <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            <p>© 2025 Système de Diligence. Tous droits réservés.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const success = await emailService.sendEmail(to, subject, htmlTemplate);
    
    if (success) {
      res.json({
        success: true,
        message: 'Notification envoyée avec succès'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Échec de l\'envoi de la notification'
      });
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de la notification:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

// Route pour obtenir les diligences
app.get('/api/diligences', async (req, res) => {
  try {
    const database = await getDatabase();
    const diligences = await database.all(`
      SELECT d.*, u.name as assigned_name, u.direction as assigned_direction, creator.name as created_by_name, creator.direction as created_by_direction
      FROM diligences d
      LEFT JOIN users u ON d.assigned_to = u.id
      LEFT JOIN users creator ON d.created_by = creator.id
      ORDER BY d.created_at DESC
    `);

    // Convertir les IDs des destinataires en noms d'utilisateurs
    const usersList = await database.all('SELECT id, name, email FROM users WHERE is_active = 1');
    
    const diligencesWithDestinataireNames = diligences.map(diligence => {
      let destinataireDetails = [];
      
      if (diligence.destinataire) {
        try {
          let destinataireIds = [];
          
          if (typeof diligence.destinataire === 'string') {
            try {
              const parsed = JSON.parse(diligence.destinataire);
              destinataireIds = Array.isArray(parsed) ? parsed : [parsed];
            } catch {
              destinataireIds = [diligence.destinataire];
            }
          } else if (Array.isArray(diligence.destinataire)) {
            destinataireIds = diligence.destinataire;
          }
          
          // Filtrer les IDs problématiques avant de mapper
          const validDestinataireIds = destinataireIds.filter(id =>
            id !== '[object Object]' &&
            id !== 'Utilisateur [object Object]' &&
            id !== null &&
            id !== undefined
          );
          
          destinataireDetails = validDestinataireIds.map(id => {
            const user = usersList.find(u => u.id == id);
            return user ? { id: user.id, name: user.name, email: user.email } : { id, name: `Utilisateur ${id}` };
          });
        } catch (error) {
          console.error('Erreur lors de la conversion des destinataires:', error);
        }
      }
      
      return {
        ...diligence,
        created_by: diligence.created_by, // S'assurer que created_by est inclus
        destinataire_details: destinataireDetails
      };
    });

    res.json(diligencesWithDestinataireNames);
  } catch (error) {
    console.error('Erreur lors de la récupération des diligences:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Route pour récupérer les diligences archivées
app.get('/api/diligences/archives', authenticateToken, async (req, res) => {
  try {
    const database = await getDatabase();
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;
    
    // Récupérer les diligences archivées avec les informations des utilisateurs
    let query = `
      SELECT d.*, u.name as assigned_name, u.direction as assigned_direction,
             creator.name as created_by_name, creator.direction as created_by_direction,
             va.validated_at as archived_at, va.validated_by as archived_by,
             archiver.name as archived_by_name
      FROM diligences d
      LEFT JOIN users u ON d.assigned_to = u.id
      LEFT JOIN users creator ON d.created_by = creator.id
      LEFT JOIN diligence_archives va ON d.id = va.diligence_id
      LEFT JOIN users archiver ON va.validated_by = archiver.id
      WHERE d.archived = 1
    `;
    
    // Si l'utilisateur n'est pas admin, filtrer pour ne voir que ses propres diligences
    if (currentUserRole !== 'admin') {
      query += ` AND (
        d.created_by = ?
        OR d.assigned_to = ?
        OR d.destinataire LIKE '%' || ? || '%'
        OR d.destinataire LIKE '%' || ? || '%'
      )`;
    }
    
    query += ` ORDER BY d.archived_at DESC`;
    
    const archivedDiligences = currentUserRole === 'admin'
      ? await database.all(query)
      : await database.all(query, [currentUserId, currentUserId, currentUserId, currentUserId]);

    // Convertir les IDs des destinataires en noms d'utilisateurs
    const usersList = await database.all('SELECT id, name, email FROM users WHERE is_active = 1');
    
    const diligencesWithDestinataireNames = archivedDiligences.map(diligence => {
      let destinataireDetails = [];
      
      if (diligence.destinataire) {
        try {
          let destinataireIds = [];
          
          if (typeof diligence.destinataire === 'string') {
            try {
              const parsed = JSON.parse(diligence.destinataire);
              destinataireIds = Array.isArray(parsed) ? parsed : [parsed];
            } catch {
              destinataireIds = [diligence.destinataire];
            }
          } else if (Array.isArray(diligence.destinataire)) {
            destinataireIds = diligence.destinataire;
          }
          
          // Filtrer les IDs problématiques avant de mapper
          const validDestinataireIds = destinataireIds.filter(id =>
            id !== '[object Object]' &&
            id !== 'Utilisateur [object Object]' &&
            id !== null &&
            id !== undefined
          );
          
          destinataireDetails = validDestinataireIds.map(id => {
            const user = usersList.find(u => u.id == id);
            return user ? { id: user.id, name: user.name, email: user.email } : { id, name: `Utilisateur ${id}` };
          });
        } catch (error) {
          console.error('Erreur lors de la conversion des destinataires:', error);
        }
      }
      
      return {
        ...diligence,
        created_by: diligence.created_by,
        destinataire_details: destinataireDetails
      };
    });

    res.json(diligencesWithDestinataireNames);
  } catch (error) {
    console.error('Erreur lors de la récupération des diligences archivées:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Route pour obtenir une diligence spécifique
app.get('/api/diligences/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const database = await getDatabase();
    const diligence = await database.get(`
      SELECT d.*, u.name as assigned_name, u.direction as assigned_direction, creator.name as created_by_name, creator.direction as created_by_direction
      FROM diligences d
      LEFT JOIN users u ON d.assigned_to = u.id
      LEFT JOIN users creator ON d.created_by = creator.id
      WHERE d.id = ?
    `, [id]);
    
    if (!diligence) {
      return res.status(404).json({ error: 'Diligence non trouvée' });
    }

    // Convertir les IDs des destinataires en noms d'utilisateurs
    const usersList = await database.all('SELECT id, name, email FROM users WHERE is_active = 1');
    let destinataireDetails = [];
    
    if (diligence.destinataire) {
      try {
        let destinataireIds = [];
        
        if (typeof diligence.destinataire === 'string') {
          try {
            const parsed = JSON.parse(diligence.destinataire);
            destinataireIds = Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            destinataireIds = [diligence.destinataire];
          }
        } else if (Array.isArray(diligence.destinataire)) {
          destinataireIds = diligence.destinataire;
        }
        
        // Filtrer les IDs problématiques avant de mapper
        const validDestinataireIds = destinataireIds.filter(id =>
          id !== '[object Object]' &&
          id !== 'Utilisateur [object Object]' &&
          id !== null &&
          id !== undefined
        );
        
        destinataireDetails = validDestinataireIds.map(id => {
          const user = usersList.find(u => u.id == id);
          return user ? { id: user.id, name: user.name, email: user.email } : { id, name: `Utilisateur ${id}` };
        });
      } catch (error) {
        console.error('Erreur lors de la conversion des destinataires:', error);
      }
    }
    
    const diligenceWithDetails = {
      ...diligence,
      created_by: diligence.created_by, // S'assurer que created_by est inclus
      destinataire_details: destinataireDetails
    };

    res.json(diligenceWithDetails);
  } catch (error) {
    console.error('Erreur lors de la récupération de la diligence:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Route pour créer une nouvelle diligence
app.post('/api/diligences', async (req, res) => {
  const { titre, directiondestinataire, datedebut, datefin, description, priorite, statut, destinataire, piecesjointes, progression, created_by, assigned_to } = req.body;
  
  console.log("Données reçues pour création de diligence:", req.body);
  
  if (!titre || !directiondestinataire || !datedebut || !datefin || !description) {
    return res.status(400).json({
      error: 'Tous les champs obligatoires sont requis'
    });
  }

  try {
    const database = await getDatabase();
    
    console.log("Insertion avec created_by:", created_by);
    
    // Déterminer assigned_to: prendre le premier destinataire si disponible
    let assignedTo = null;
    let finalDestinataire = destinataire;
    
    if (destinataire && destinataire !== '[]' && destinataire !== '') {
      try {
        let destinataireIds = [];
        
        // Parser les destinataires
        if (typeof destinataire === 'string') {
          try {
            const parsed = JSON.parse(destinataire);
            destinataireIds = Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            // Si ce n'est pas un JSON valide, vérifier si c'est un ID simple
            if (!isNaN(parseInt(destinataire))) {
              destinataireIds = [parseInt(destinataire)];
            } else {
              console.error('Format de destinataire invalide (string):', destinataire);
              destinataireIds = [];
            }
          }
        } else if (Array.isArray(destinataire)) {
          // Filtrer et convertir les IDs valides
          destinataireIds = destinataire
            .filter(dest => dest !== null && dest !== undefined && dest !== '[object Object]')
            .map(dest => {
              if (typeof dest === 'object' && dest !== null && dest.id) {
                // Si c'est un objet utilisateur, prendre l'ID
                return parseInt(dest.id);
              } else if (typeof dest === 'number') {
                return dest;
              } else if (typeof dest === 'string' && !isNaN(parseInt(dest))) {
                return parseInt(dest);
              }
              return null;
            })
            .filter(id => id !== null && !isNaN(id));
        } else if (typeof destinataire === 'object' && destinataire !== null) {
          // Si un seul objet utilisateur est reçu
          if (destinataire.id) {
            destinataireIds = [parseInt(destinataire.id)];
          }
        }
        
        // Prendre le premier destinataire comme assigned_to
        if (destinataireIds.length > 0) {
          assignedTo = parseInt(destinataireIds[0]);
        }
        
        // S'assurer que destinataire est bien un tableau JSON d'IDs numériques
        finalDestinataire = JSON.stringify(destinataireIds);
        
      } catch (error) {
        console.error('Erreur lors du parsing des destinataires:', error);
        finalDestinataire = '[]';
      }
    } else {
      finalDestinataire = '[]';
    }

    const result = await database.run(
      `INSERT INTO diligences (titre, directiondestinataire, datedebut, datefin, description, priorite, statut, destinataire, piecesjointes, progression, created_by, assigned_to, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [titre, directiondestinataire, datedebut, datefin, description, priorite || 'Moyenne', statut || 'Planifié', finalDestinataire, JSON.stringify(piecesjointes || []), progression || 0, created_by, assignedTo]
    );

    const diligenceId = result.lastID;

    // Récupérer les informations du créateur
    console.log(`🔍 Recherche de l'utilisateur créateur avec ID: ${created_by}`);
    const creator = await database.get(
      'SELECT name FROM users WHERE id = ? AND is_active = 1',
      [created_by]
    );
    
    let creatorName = 'Un utilisateur';
    
    if (!creator) {
      console.warn(`⚠️ Utilisateur créateur avec ID ${created_by} non trouvé ou désactivé`);
      
      // Vérifier si l'utilisateur existe mais est désactivé
      const inactiveUser = await database.get(
        'SELECT name FROM users WHERE id = ? AND is_active = 0',
        [created_by]
      );
      
      if (inactiveUser) {
        console.warn(`ℹ️ Utilisateur avec ID ${created_by} existe mais est désactivé: ${inactiveUser.name}`);
        creatorName = inactiveUser.name;
      } else {
        console.warn(`❌ Aucun utilisateur trouvé avec ID ${created_by} (même désactivé)`);
        
        // Tentative de récupérer le nom depuis le token JWT si disponible
        try {
          const authHeader = req.headers['authorization'];
          if (authHeader) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(
              token,
              process.env.JWT_SECRET || 'fallback-secret-key-change-in-production'
            );
            if (decoded && decoded.name) {
              creatorName = decoded.name;
              console.log(`✅ Nom récupéré depuis le token JWT: ${creatorName}`);
            }
          }
        } catch (jwtError) {
          console.warn('❌ Impossible de récupérer le nom depuis le token JWT:', jwtError.message);
        }
      }
    } else {
      console.log(`✅ Utilisateur créateur trouvé: ${creator.name}`);
      creatorName = creator.name;
    }

    // Envoyer des emails aux destinataires assignés (en arrière-plan)
    if (finalDestinataire && finalDestinataire !== '[]' && finalDestinataire !== '') {
      try {
        let destinataireIds = [];
        
        // Parser les destinataires (qui est maintenant un JSON stringifié)
        try {
          const parsed = JSON.parse(finalDestinataire);
          destinataireIds = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          console.error('Erreur lors du parsing des destinataires pour les emails:', finalDestinataire);
          destinataireIds = [];
        }

        if (destinataireIds.length > 0) {
          // Récupérer les informations des utilisateurs destinataires
          const placeholders = destinataireIds.map(() => '?').join(',');
          const users = await database.all(
            `SELECT id, email, name FROM users WHERE id IN (${placeholders}) AND is_active = 1`,
            destinataireIds
          );

          // Envoyer un email à chaque destinataire
          users.forEach(user => {
            emailService.sendNewDiligenceEmail(
              user.email,
              user.name,
              titre,
              creatorName,
              diligenceId
            )
            .then(success => {
              if (success) {
                console.log(`✅ Email de nouvelle diligence envoyé à ${user.email}`);
              } else {
                console.warn(`⚠️ Échec de l'envoi de l'email à ${user.email}`);
              }
            })
            .catch(error => {
              console.error(`❌ Erreur lors de l'envoi de l'email à ${user.email}:`, error);
            });
          });

          console.log(`📧 Emails de notification envoyés à ${users.length} destinataire(s)`);
        }
      } catch (emailError) {
        console.error('❌ Erreur lors de l\'envoi des emails de notification:', emailError);
        // Ne pas bloquer la création de la diligence en cas d'erreur d'email
      }
    }

    res.status(201).json({
      success: true,
      message: 'Diligence créée avec succès',
      diligenceId: diligenceId
    });
  } catch (error) {
    console.error('Erreur lors de la création de la diligence:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Route pour modifier une diligence
app.put('/api/diligences/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { titre, directiondestinataire, datedebut, datefin, description, priorite, statut, destinataire, piecesjointes, progression } = req.body;
  
  if (!titre || !directiondestinataire || !datedebut || !datefin || !description) {
    return res.status(400).json({
      error: 'Tous les champs obligatoires sont requis'
    });
  }

  try {
    const database = await getDatabase();
    
    // Vérifier si la diligence existe et récupérer ses informations
    const diligence = await database.get(
      'SELECT d.*, creator.name as created_by_name FROM diligences d LEFT JOIN users creator ON d.created_by = creator.id WHERE d.id = ?',
      [id]
    );
    
    if (!diligence) {
      return res.status(404).json({
        error: 'Diligence non trouvée'
      });
    }

    // Vérifier les permissions de l'utilisateur
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;
    
    // Les administrateurs peuvent toujours modifier
    if (currentUserRole === 'admin') {
      // Admin peut modifier, continuer
    } else {
      // Vérifier si l'utilisateur est un destinataire de la diligence
      let isRecipient = false;
      
      if (diligence.destinataire) {
        try {
          let destinataireIds = [];
          
          if (typeof diligence.destinataire === 'string') {
            try {
              const parsed = JSON.parse(diligence.destinataire);
              destinataireIds = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
            } catch {
              destinataireIds = [diligence.destinataire];
            }
          } else if (Array.isArray(diligence.destinataire)) {
            destinataireIds = diligence.destinataire.map(String);
          }
          
          // Vérifier si l'utilisateur courant est dans la liste des destinataires
          isRecipient = destinataireIds.includes(String(currentUserId));
        } catch (error) {
          console.error('Erreur lors de la vérification des destinataires:', error);
        }
      }
      
      // Les destinataires ne peuvent PAS modifier les diligences (même s'ils ne sont pas terminées)
      if (isRecipient) {
        return res.status(403).json({
          error: 'Accès refusé : les destinataires ne peuvent pas modifier les diligences'
        });
      }
      
      // Seuls les administrateurs et le créateur peuvent modifier
      // Vérifier si l'utilisateur est le créateur
      const isCreator = parseInt(diligence.created_by) === parseInt(currentUserId);
      
      if (!isCreator && currentUserRole !== 'admin') {
        return res.status(403).json({
          error: 'Accès refusé : seuls les administrateurs et le créateur peuvent modifier les diligences'
        });
      }
      
      // Vérification supplémentaire : si la diligence est "Terminé", bloquer l'accès même pour le créateur
      if (diligence.statut === 'Terminé') {
        return res.status(403).json({
          error: 'Accès refusé : les diligences terminées ne peuvent pas être modifiées'
        });
      }
    }

    await database.run(
      `UPDATE diligences
       SET titre = ?, directiondestinataire = ?, datedebut = ?, datefin = ?, description = ?,
           priorite = ?, statut = ?, destinataire = ?, piecesjointes = ?, progression = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [titre, directiondestinataire, datedebut, datefin, description, priorite, statut, JSON.stringify(destinataire || []), JSON.stringify(piecesjointes || []), progression, id]
    );

    res.json({
      success: true,
      message: 'Diligence modifiée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la modification de la diligence:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Route pour supprimer une diligence
app.delete('/api/diligences/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({
      error: 'ID diligence requis'
    });
  }

  try {
    const database = await getDatabase();
    
    // Vérifier si la diligence existe et récupérer ses informations
    const diligence = await database.get(
      'SELECT d.*, creator.name as created_by_name FROM diligences d LEFT JOIN users creator ON d.created_by = creator.id WHERE d.id = ?',
      [id]
    );
    
    if (!diligence) {
      return res.status(404).json({
        error: 'Diligence non trouvée'
      });
    }

    // Vérifier les permissions de l'utilisateur
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;
    
    // Les administrateurs peuvent toujours supprimer
    if (currentUserRole === 'admin') {
      // Admin peut supprimer, continuer
    } else {
      // Vérifier si l'utilisateur est un destinataire de la diligence
      let isRecipient = false;
      
      if (diligence.destinataire) {
        try {
          let destinataireIds = [];
          
          if (typeof diligence.destinataire === 'string') {
            try {
              const parsed = JSON.parse(diligence.destinataire);
              destinataireIds = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
            } catch {
              destinataireIds = [diligence.destinataire];
            }
          } else if (Array.isArray(diligence.destinataire)) {
            destinataireIds = diligence.destinataire.map(String);
          }
          
          // Vérifier si l'utilisateur courant est dans la liste des destinataires
          isRecipient = destinataireIds.includes(String(currentUserId));
        } catch (error) {
          console.error('Erreur lors de la vérification des destinataires:', error);
        }
      }
      
      // Les destinataires ne peuvent PAS supprimer les diligences (même s'ils ne sont pas terminées)
      if (isRecipient) {
        return res.status(403).json({
          error: 'Accès refusé : les destinataires ne peuvent pas supprimer les diligences'
        });
      }
      
      // Seuls les administrateurs et le créateur peuvent supprimer
      // Vérifier si l'utilisateur est le créateur
      const isCreator = parseInt(diligence.created_by) === parseInt(currentUserId);
      
      if (!isCreator && currentUserRole !== 'admin') {
        return res.status(403).json({
          error: 'Accès refusé : seuls les administrateurs et le créateur peuvent supprimer les diligences'
        });
      }
      
      // Vérification supplémentaire : si la diligence est "Terminé", bloquer l'accès même pour le créateur
      if (diligence.statut === 'Terminé') {
        return res.status(403).json({
          error: 'Accès refusé : les diligences terminées ne peuvent pas être supprimées'
        });
      }
    }

    await database.run(
      'DELETE FROM diligences WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Diligence supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la diligence:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Route pour forcer la mise à jour des statuts des diligences (admin seulement)
app.post('/api/diligences/update-statuses', async (req, res) => {
  try {
    const diligenceUpdater = await import('./services/diligenceUpdater.js');
    await diligenceUpdater.default.forceUpdate();
    
    res.json({
      success: true,
      message: 'Mise à jour des statuts des diligences effectuée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour forcée des statuts:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur lors de la mise à jour des statuts'
    });
  }
});

// Route pour forcer l'archivage automatique des diligences terminées (admin seulement)
app.post('/api/diligences/archive-finished', authenticateToken, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est administrateur
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès réservé aux administrateurs'
      });
    }

    const database = await getDatabase();
    
    // Archiver les diligences terminées depuis plus de 24 heures
    const result = await database.run(
      `UPDATE diligences
       SET archived = 1, archived_at = datetime('now'), updated_at = datetime('now')
       WHERE statut = 'Terminé'
       AND archived = 0
       AND updated_at <= datetime('now', '-1 day')`
    );

    res.json({
      success: true,
      message: `${result.changes} diligence(s) terminée(s) archivée(s) avec succès`,
      archivedCount: result.changes
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'archivage automatique des diligences:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur lors de l\'archivage'
    });
  }
});

// Route pour marquer une diligence comme "En cours" lorsqu'un destinataire la consulte
app.post('/api/diligences/:id/mark-viewed', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'ID utilisateur requis' });
    }

    const diligenceUpdater = await import('./services/diligenceUpdater.js');
    const updated = await diligenceUpdater.default.markAsInProgressWhenViewed(parseInt(id), parseInt(userId));
    
    res.json({
      success: true,
      updated,
      message: updated ? 'Statut mis à jour avec succès' : 'Aucune mise à jour nécessaire'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut après consultation:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Route pour traiter une diligence (soumission de documents et mise à jour)
app.post('/api/diligences/:id/traitement', authenticateToken, upload.array('fichiers', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const { commentaire, progression, statut } = req.body;
    const fichiers = req.files || [];
    const database = await getDatabase();
    
    console.log('📋 Traitement de la diligence - Données reçues:', {
      diligenceId: id,
      commentaire,
      progression,
      statut,
      fichiersCount: fichiers.length,
      fichiers: fichiers.map(f => f.originalname)
    });

    // Vérifier si la diligence existe
    const diligence = await database.get(
      'SELECT d.*, creator.email as created_by_email, creator.name as created_by_name FROM diligences d LEFT JOIN users creator ON d.created_by = creator.id WHERE d.id = ?',
      [id]
    );
    
    if (!diligence) {
      // Nettoyer les fichiers uploadés en cas d'erreur
      fichiers.forEach(file => {
        fs.unlink(file.path, () => {});
      });
      return res.status(404).json({
        success: false,
        error: 'Diligence non trouvée'
      });
    }

    // Mettre à jour la diligence - si le statut est "Terminé", passer à "À valider"
    const newStatut = statut === "Terminé" ? "À valider" : statut;
    
    await database.run(
      `UPDATE diligences
       SET progression = ?, statut = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [parseInt(progression), newStatut, id]
    );

    // Enregistrer les informations de traitement dans une table dédiée
    await database.run(
      `INSERT INTO diligence_traitements (diligence_id, commentaire, progression, statut, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [id, commentaire, progression, newStatut]
    );

    // Enregistrer les fichiers uploadés
    for (const file of fichiers) {
      await database.run(
        `INSERT INTO diligence_files (diligence_id, file_name, file_path, file_size, mime_type, uploaded_by, uploaded_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [id, file.originalname, file.path, file.size, file.mimetype, req.user?.id || 0]
      );
    }

    console.log('✅ Diligence mise à jour avec succès');

    // Envoyer une notification email au créateur de la diligence
    if (diligence.created_by_email) {
      const subject = statut === "Terminé"
        ? `✅ Diligence terminée - ${diligence.titre} (À valider)`
        : `📋 Diligence traitée - ${diligence.titre}`;
      
      const message = statut === "Terminé"
        ? `
          <p>Bonjour ${diligence.created_by_name},</p>
          <p>La diligence "<strong>${diligence.titre}</strong>" a été terminée et est maintenant en attente de validation.</p>
          <p><strong>Progression:</strong> ${progression}%</p>
          ${commentaire ? `<p><strong>Commentaire:</strong> ${commentaire}</p>` : ''}
          ${fichiers.length > 0 ? `<p><strong>Fichiers joints:</strong> ${fichiers.length} document(s)</p>` : ''}
          <p><strong>Action requise:</strong> Veuillez valider ou rejeter le travail effectué dans votre tableau de bord.</p>
          <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/diligence/${id}" style="color: #007bff; text-decoration: none;">→ Valider la diligence</a></p>
        `
        : `
          <p>Bonjour ${diligence.created_by_name},</p>
          <p>La diligence "<strong>${diligence.titre}</strong>" a été mise à jour.</p>
          <p><strong>Nouveau statut:</strong> ${statut}</p>
          <p><strong>Progression:</strong> ${progression}%</p>
          ${commentaire ? `<p><strong>Commentaire:</strong> ${commentaire}</p>` : ''}
          ${fichiers.length > 0 ? `<p><strong>Fichiers joints:</strong> ${fichiers.length} document(s)</p>` : ''}
          <p>Vous pouvez consulter les détails dans votre tableau de bord.</p>
        `;

      try {
        // Utiliser directement le service email plutôt que l'API frontend
        const emailSuccess = await emailService.sendEmail(
          diligence.created_by_email,
          subject,
          message
        );

        if (emailSuccess) {
          console.log('✅ Notification email envoyée au créateur');
        } else {
          console.warn('⚠️ Échec de l\'envoi de la notification email');
        }
      } catch (emailError) {
        console.error('❌ Erreur lors de l\'envoi de l\'email:', emailError);
        // Ne pas bloquer le traitement en cas d'erreur d'email
      }
    }

    res.json({
      success: true,
      message: 'Diligence traitée avec succès. Une notification a été envoyée au créateur.'
    });

  } catch (error) {
    console.error('❌ Erreur lors du traitement de la diligence:', error);
    
    // Nettoyer les fichiers uploadés en cas d'erreur
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path, () => {});
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur lors du traitement'
    });
  }
});

// Route pour récupérer les traitements d'une diligence
app.get('/api/diligences/:id/traitements', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const database = await getDatabase();
    
    // Récupérer tous les traitements de la diligence
    const traitements = await database.all(`
      SELECT id, diligence_id, commentaire, progression, statut, created_at
      FROM diligence_traitements
      WHERE diligence_id = ?
      ORDER BY created_at DESC
    `, [id]);
    
    res.json(traitements);
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des traitements:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur lors de la récupération des traitements'
    });
  }
});

// Route pour récupérer tous les fichiers d'une diligence (pièces jointes + fichiers des traitements)
app.get('/api/diligences/:id/files', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const database = await getDatabase();
    
    // Récupérer les pièces jointes originales de la diligence
    const diligence = await database.get(
      'SELECT piecesjointes FROM diligences WHERE id = ?',
      [id]
    );
    
    let allFiles = [];
    
    // Ajouter les pièces jointes originales
    if (diligence && diligence.piecesjointes) {
      try {
        const piecesJointes = JSON.parse(diligence.piecesjointes);
        if (Array.isArray(piecesJointes)) {
          allFiles = piecesJointes.map(filePath => ({
            type: 'original',
            filePath: filePath,
            fileName: filePath.split('/').pop() || filePath,
            uploadedAt: null
          }));
        }
      } catch (error) {
        console.error('Erreur lors du parsing des pièces jointes:', error);
      }
    }
    
    // Récupérer les fichiers des traitements
    const traitementFiles = await database.all(`
      SELECT file_name, file_path, uploaded_at
      FROM diligence_files
      WHERE diligence_id = ?
      ORDER BY uploaded_at DESC
    `, [id]);
    
    // Ajouter les fichiers des traitements
    const traitementFilesFormatted = traitementFiles.map(file => ({
      type: 'traitement',
      filePath: file.file_path,
      fileName: file.file_name,
      uploadedAt: file.uploaded_at
    }));
    
    // Combiner tous les fichiers
    const combinedFiles = [...allFiles, ...traitementFilesFormatted];
    
    res.json(combinedFiles);
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des fichiers:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur lors de la récupération des fichiers'
    });
  }
});

// Route pour valider ou rejeter une diligence
app.post('/api/diligences/:id/validate', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { validation_status, comment } = req.body;
    
    console.log('🔍 Validation de diligence - Données reçues:', { id, validation_status, comment });
    
    if (!validation_status || !['approved', 'rejected'].includes(validation_status)) {
      console.log('❌ Erreur de validation: statut manquant ou invalide');
      return res.status(400).json({
        success: false,
        error: 'Statut de validation requis (approved ou rejected)'
      });
    }

    const database = await getDatabase();
    
    // Vérifier si la diligence existe et récupérer ses informations
    const diligence = await database.get(`
      SELECT d.*, creator.email as created_by_email, creator.name as created_by_name
      FROM diligences d
      LEFT JOIN users creator ON d.created_by = creator.id
      WHERE d.id = ?
    `, [id]);
    
    if (!diligence) {
      return res.status(404).json({
        success: false,
        error: 'Diligence non trouvée'
      });
    }

    // Vérifier que la diligence est en statut "À valider"
    if (diligence.statut !== 'À valider') {
      return res.status(400).json({
        success: false,
        error: 'La diligence n\'est pas en attente de validation'
      });
    }

    // Vérifier que l'utilisateur est le créateur de la diligence
    if (diligence.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Seul le créateur de la diligence peut la valider'
      });
    }

    // Enregistrer la validation
    await database.run(
      `INSERT INTO diligence_validations (diligence_id, validated_by, validation_status, comment, validated_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [id, req.user.id, validation_status, comment || null]
    );

    // Mettre à jour le statut de la diligence (archivage manuel désormais)
    const newStatut = validation_status === 'approved' ? 'Terminé' : 'En cours';
    
    // Mettre à jour seulement le statut, sans archiver automatiquement
    await database.run(
      `UPDATE diligences SET statut = ?, updated_at = datetime('now') WHERE id = ?`,
      [newStatut, id]
    );
    
    // Enregistrer la validation dans la table d'archivage (mais sans archiver la diligence)
    await database.run(
      `INSERT INTO diligence_validations (diligence_id, validated_by, validation_status, comment, validated_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [id, req.user.id, validation_status, comment || null]
    );

    // Envoyer une notification email au destinataire
    if (diligence.destinataire) {
      try {
        let destinataireIds = [];
        
        // Parser les destinataires
        if (typeof diligence.destinataire === 'string') {
          try {
            const parsed = JSON.parse(diligence.destinataire);
            destinataireIds = Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            destinataireIds = [diligence.destinataire];
          }
        } else if (Array.isArray(diligence.destinataire)) {
          destinataireIds = diligence.destinataire;
        }

        if (destinataireIds.length > 0) {
          const placeholders = destinataireIds.map(() => '?').join(',');
          const users = await database.all(
            `SELECT id, email, name FROM users WHERE id IN (${placeholders}) AND is_active = 1`,
            destinataireIds
          );

          // Envoyer un email à chaque destinataire
          users.forEach(user => {
            const subject = validation_status === 'approved'
              ? `✅ Diligence validée - ${diligence.titre}`
              : `❌ Diligence rejetée - ${diligence.titre}`;
            
            const message = validation_status === 'approved'
              ? `
                <p>Bonjour ${user.name},</p>
                <p>Votre travail sur la diligence "<strong>${diligence.titre}</strong>" a été validé avec succès.</p>
                ${comment ? `<p><strong>Commentaire du validateur:</strong> ${comment}</p>` : ''}
                <p>Félicitations pour votre travail !</p>
              `
              : `
                <p>Bonjour ${user.name},</p>
                <p>Votre travail sur la diligence "<strong>${diligence.titre}</strong>" a été rejeté.</p>
                ${comment ? `<p><strong>Commentaire du validateur:</strong> ${comment}</p>` : ''}
                <p>Veuillez reprendre le travail et soumettre à nouveau la diligence une fois terminée.</p>
              `;

            emailService.sendEmail(
              user.email,
              subject,
              message
            )
            .then(success => {
              if (success) {
                console.log(`✅ Email de validation envoyé à ${user.email}`);
              } else {
                console.warn(`⚠️ Échec de l'envoi de l'email à ${user.email}`);
              }
            })
            .catch(error => {
              console.error(`❌ Erreur lors de l'envoi de l'email à ${user.email}:`, error);
            });
          });
        }
      } catch (emailError) {
        console.error('❌ Erreur lors de l\'envoi des emails de validation:', emailError);
      }
    }

    res.json({
      success: true,
      message: validation_status === 'approved'
        ? 'Diligence validée avec succès'
        : 'Diligence rejetée avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur lors de la validation de la diligence:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur lors de la validation'
    });
  }
});

// Route pour archiver manuellement une diligence
app.post('/api/diligences/:id/archive', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const database = await getDatabase();
    
    // Vérifier si la diligence existe et récupérer ses informations
    const diligence = await database.get(`
      SELECT d.*, creator.name as created_by_name
      FROM diligences d
      LEFT JOIN users creator ON d.created_by = creator.id
      WHERE d.id = ?
    `, [id]);
    
    if (!diligence) {
      return res.status(404).json({
        success: false,
        error: 'Diligence non trouvée'
      });
    }
    
    // Vérifier que la diligence est terminée
    if (diligence.statut !== 'Terminé') {
      return res.status(400).json({
        success: false,
        error: 'Seules les diligences terminées peuvent être archivées'
      });
    }
    
    // Vérifier que l'utilisateur est le créateur de la diligence ou un administrateur
    if (diligence.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Seul le créateur de la diligence ou un administrateur peut l\'archiver'
      });
    }
    
    // Vérifier que la diligence n'est pas déjà archivée
    if (diligence.archived === 1) {
      return res.status(400).json({
        success: false,
        error: 'Cette diligence est déjà archivée'
      });
    }
    
    // Archiver la diligence
    await database.run(
      `UPDATE diligences SET archived = 1, archived_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
      [id]
    );
    
    // Enregistrer dans la table d'archivage
    await database.run(
      `INSERT INTO diligence_archives (diligence_id, validated_by, validated_at, validation_status)
       VALUES (?, ?, datetime('now'), 'approved')`,
      [id, req.user.id]
    );
    
    res.json({
      success: true,
      message: 'Diligence archivée avec succès'
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'archivage manuel de la diligence:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur lors de l\'archivage'
    });
  }
});


// Route pour télécharger les fichiers
app.get('/api/files/download', async (req, res) => {
  const { filePath, fileName } = req.query;
  
  if (!filePath) {
    return res.status(400).json({
      error: 'Chemin du fichier requis'
    });
  }

  try {
    // Construire le chemin complet du fichier
    const uploadsDir = path.join(__dirname, '../../uploads');
    const fullPath = path.join(uploadsDir, filePath);
    
    // Vérifier que le chemin est sécurisé (empêcher les attaques de traversal)
    if (!fullPath.startsWith(uploadsDir)) {
      return res.status(403).json({
        error: 'Accès non autorisé au fichier'
      });
    }

    // Vérifier si le fichier existe
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        error: 'Fichier non trouvé'
      });
    }

    // Déterminer le type MIME en fonction de l'extension
    const ext = path.extname(fullPath).toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (ext === '.pdf') {
      contentType = 'application/pdf';
    } else if (ext === '.jpg' || ext === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (ext === '.png') {
      contentType = 'image/png';
    } else if (ext === '.gif') {
      contentType = 'image/gif';
    } else if (ext === '.doc') {
      contentType = 'application/msword';
    } else if (ext === '.docx') {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (ext === '.xls') {
      contentType = 'application/vnd.ms-excel';
    } else if (ext === '.xlsx') {
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (ext === '.txt') {
      contentType = 'text/plain';
    }

    // Définir le nom du fichier pour le téléchargement
    const downloadName = fileName || path.basename(fullPath);
    
    // Configurer les en-têtes pour le téléchargement
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(downloadName)}"`);
    
    // Envoyer le fichier
    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('Erreur lors de l\'envoi du fichier:', error);
      res.status(500).json({
        error: 'Erreur lors de l\'envoi du fichier'
      });
    });

  } catch (error) {
    console.error('Erreur lors du téléchargement du fichier:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur'
    });
  }
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    path: req.originalUrl
  });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  res.status(500).json({
    error: 'Erreur interne du serveur',
    message: err.message
  });
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur backend démarré sur le port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`👥 API Utilisateurs: http://localhost:${PORT}/api/users`);
  console.log(`📋 API Diligences: http://localhost:${PORT}/api/diligences`);
  console.log(`👁️  API Mark Viewed: http://localhost:${PORT}/api/diligences/:id/mark-viewed`);
  console.log(`📝 API Traitements: http://localhost:${PORT}/api/diligences/:id/traitements`);
});

export default app;