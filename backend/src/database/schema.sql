-- Schema de la base de données SQLite pour l'application de diligence

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user')),
    direction TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table des diligences
CREATE TABLE IF NOT EXISTS diligences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titre TEXT NOT NULL,
    directiondestinataire TEXT NOT NULL,
    datedebut TEXT NOT NULL,
    datefin TEXT NOT NULL,
    description TEXT NOT NULL,
    priorite TEXT DEFAULT 'Moyenne' CHECK(priorite IN ('Haute', 'Moyenne', 'Basse')),
    statut TEXT DEFAULT 'Planifié' CHECK(statut IN ('Planifié', 'En cours', 'Terminé', 'En retard')),
    destinataire TEXT DEFAULT '[]',
    piecesjointes TEXT DEFAULT '[]',
    progression INTEGER DEFAULT 0,
    assigned_to INTEGER,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Table des fichiers joints aux diligences
CREATE TABLE IF NOT EXISTS diligence_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    diligence_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    uploaded_by INTEGER NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (diligence_id) REFERENCES diligences(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Table de configuration SMTP
CREATE TABLE IF NOT EXISTS smtp_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    host TEXT NOT NULL,
    port INTEGER NOT NULL,
    secure BOOLEAN DEFAULT 0,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    from_email TEXT NOT NULL,
    from_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table des logs d'emails
CREATE TABLE IF NOT EXISTS email_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT,
    status TEXT CHECK(status IN ('sent', 'failed', 'pending')),
    error_message TEXT,
    sent_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insertion d'un utilisateur admin par défaut (mot de passe: admin123)
-- Le mot de passe est hashé avec bcrypt (coût 10)
INSERT OR IGNORE INTO users (email, password_hash, name, role)
VALUES ('admin@example.com', '$2a$10$MLrPGy6hzDQzEmUaBom7.OSNaPPIWX42gf2CPL/ANmUihHKKnXYEK', 'Administrateur', 'admin');

-- Insertion d'un utilisateur de test (mot de passe: user123)
INSERT OR IGNORE INTO users (email, password_hash, name, role)
VALUES ('user@example.com', '$2a$10$tHlMPEGKKoYhcYxORYsqOOOA6WP1GYY9WJCPCHML9I/LKX/6v7eRS', 'Utilisateur Test', 'user');

-- Insertion d'une configuration SMTP par défaut
INSERT OR IGNORE INTO smtp_config (host, port, secure, username, password, from_email, from_name)
VALUES ('smtp.gmail.com', 587, 1, 'your-email@gmail.com', 'your-app-password', 'noreply@example.com', 'Système de Diligence');

-- Table des profils utilisateurs
CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    phone TEXT,
    poste TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Ajouter la colonne phone à la table users si elle n'existe pas
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;

-- Ajouter la colonne direction à la table users si elle n'existe pas
ALTER TABLE users ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT '';

-- Création des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_diligences_status ON diligences(status);
CREATE INDEX IF NOT EXISTS idx_diligences_assigned ON diligences(assigned_to);
CREATE INDEX IF NOT EXISTS idx_files_diligence ON diligence_files(diligence_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);

-- Table des tokens de réinitialisation de mot de passe
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  used BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_expires ON password_reset_tokens(expires_at);