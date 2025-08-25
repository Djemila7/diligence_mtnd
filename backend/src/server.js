import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { initializeDatabase, getDatabase } from './database/db.js';

// Configuration des chemins pour ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialiser la base de données
let db;
initializeDatabase().then(database => {
  db = database;
  console.log('✅ Base de données initialisée');
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
    const users = await database.all('SELECT id, email, name, role, created_at FROM users WHERE is_active = 1');
    res.json(users);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Route pour créer un nouvel utilisateur
app.post('/api/users', async (req, res) => {
  const { email, password, name, role } = req.body;
  
  if (!email || !name) {
    return res.status(400).json({
      error: 'Email et nom complet sont requis'
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
    
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await database.get(
      'SELECT id FROM users WHERE email = ?',
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

    // Créer l'utilisateur
    const result = await database.run(
      `INSERT INTO users (email, password_hash, name, role, is_active, created_at)
       VALUES (?, ?, ?, ?, 1, datetime('now'))`,
      [email, passwordHash, name, role || 'user']
    );

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      userId: result.lastID
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Route pour modifier un utilisateur
app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { email, name, role, password } = req.body;
  
  if (!email || !name) {
    return res.status(400).json({
      error: 'Email et nom complet sont requis'
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
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, id]
      );
      
      if (existingUser) {
        return res.status(409).json({
          error: 'Un utilisateur avec cet email existe déjà'
        });
      }
    }

    let updateQuery = 'UPDATE users SET email = ?, name = ?, role = ?';
    let queryParams = [email, name, role || 'user'];

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

// Route pour obtenir les diligences
app.get('/api/diligences', async (req, res) => {
  try {
    const database = await getDatabase();
    const diligences = await database.all(`
      SELECT d.*, u.name as assigned_name, creator.name as created_by_name
      FROM diligences d
      LEFT JOIN users u ON d.assigned_to = u.id
      LEFT JOIN users creator ON d.created_by = creator.id
      ORDER BY d.created_at DESC
    `);
    res.json(diligences);
  } catch (error) {
    console.error('Erreur lors de la récupération des diligences:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
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
});

export default app;