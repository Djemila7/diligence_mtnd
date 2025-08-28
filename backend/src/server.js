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

  // Validation : l'email doit se terminer par @gmail.com
  if (!email.endsWith('@gmail.com')) {
    return res.status(400).json({
      error: 'L\'adresse email doit se terminer par @gmail.com'
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
      `INSERT INTO users (email, password_hash, name, role, direction, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, 1, datetime('now'))`,
      [email, passwordHash, name, role || 'user', direction || '']
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
  const { email, name, role, password, direction } = req.body;
  
  if (!email || !name) {
    return res.status(400).json({
      error: 'Email et nom complet sont requis'
    });
  }

  // Validation : l'email doit se terminer par @gmail.com
  if (!email.endsWith('@gmail.com')) {
    return res.status(400).json({
      error: 'L\'adresse email doit se terminer par @gmail.com'
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
          
          destinataireDetails = destinataireIds.map(id => {
            const user = usersList.find(u => u.id == id);
            return user ? { id: user.id, name: user.name, email: user.email } : { id, name: `Utilisateur ${id}` };
          });
        } catch (error) {
          console.error('Erreur lors de la conversion des destinataires:', error);
        }
      }
      
      return {
        ...diligence,
        destinataire_details: destinataireDetails
      };
    });

    res.json(diligencesWithDestinataireNames);
  } catch (error) {
    console.error('Erreur lors de la récupération des diligences:', error);
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
        
        destinataireDetails = destinataireIds.map(id => {
          const user = usersList.find(u => u.id == id);
          return user ? { id: user.id, name: user.name, email: user.email } : { id, name: `Utilisateur ${id}` };
        });
      } catch (error) {
        console.error('Erreur lors de la conversion des destinataires:', error);
      }
    }
    
    const diligenceWithDetails = {
      ...diligence,
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
  const { titre, directiondestinataire, datedebut, datefin, description, priorite, statut, destinataire, piecesjointes, progression } = req.body;
  
  if (!titre || !directiondestinataire || !datedebut || !datefin || !description) {
    return res.status(400).json({
      error: 'Tous les champs obligatoires sont requis'
    });
  }

  try {
    const database = await getDatabase();
    
    const result = await database.run(
      `INSERT INTO diligences (titre, directiondestinataire, datedebut, datefin, description, priorite, statut, destinataire, piecesjointes, progression, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [titre, directiondestinataire, datedebut, datefin, description, priorite || 'Moyenne', statut || 'Planifié', destinataire, JSON.stringify(piecesjointes || []), progression || 0]
    );

    res.status(201).json({
      success: true,
      message: 'Diligence créée avec succès',
      diligenceId: result.lastID
    });
  } catch (error) {
    console.error('Erreur lors de la création de la diligence:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Route pour modifier une diligence
app.put('/api/diligences/:id', async (req, res) => {
  const { id } = req.params;
  const { titre, directiondestinataire, datedebut, datefin, description, priorite, statut, destinataire, piecesjointes, progression } = req.body;
  
  if (!titre || !directiondestinataire || !datedebut || !datefin || !description) {
    return res.status(400).json({
      error: 'Tous les champs obligatoires sont requis'
    });
  }

  try {
    const database = await getDatabase();
    
    // Vérifier si la diligence existe
    const diligence = await database.get(
      'SELECT id FROM diligences WHERE id = ?',
      [id]
    );
    
    if (!diligence) {
      return res.status(404).json({
        error: 'Diligence non trouvée'
      });
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
app.delete('/api/diligences/:id', async (req, res) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({
      error: 'ID diligence requis'
    });
  }

  try {
    const database = await getDatabase();
    
    // Vérifier si la diligence existe
    const diligence = await database.get(
      'SELECT id FROM diligences WHERE id = ?',
      [id]
    );
    
    if (!diligence) {
      return res.status(404).json({
        error: 'Diligence non trouvée'
      });
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