import * as SQLite from 'expo-sqlite';

// Ouvrir la base de données (synchrone)
const db = SQLite.openDatabaseSync('bonplan.db');

export const initDatabase = async () => {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS villes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nom TEXT NOT NULL,
        region TEXT
      );

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nom TEXT NOT NULL UNIQUE,
        description TEXT,
       
      );

      CREATE TABLE IF NOT EXISTS utilisateurs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nom TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        motDePasse TEXT NOT NULL,
        telephone TEXT,
        adresse TEXT,
        role TEXT NOT NULL CHECK (role IN ('client', 'pro', 'admin')),
        dateInscription TEXT DEFAULT CURRENT_TIMESTAMP,
        statut TEXT DEFAULT 'actif' CHECK (statut IN ('actif', 'suspendu'))
      );

      CREATE TABLE IF NOT EXISTS entreprises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nom TEXT NOT NULL,
        description TEXT,
        logo TEXT,
        adresse TEXT NOT NULL,
        telephone TEXT,
        horaires TEXT,
        siteWeb TEXT,
        note REAL DEFAULT 0,
        statutAbonnement TEXT DEFAULT 'expire' CHECK (statutAbonnement IN ('actif', 'expire', 'suspendu')),
        dateFinAbonnement TEXT,
        ville_id INTEGER NOT NULL,
        categorie_id INTEGER NOT NULL,
        utilisateur_id INTEGER NOT NULL,
        FOREIGN KEY (ville_id) REFERENCES villes(id) ON DELETE CASCADE,
        FOREIGN KEY (categorie_id) REFERENCES categories(id) ON DELETE CASCADE,
        FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
      );
    `);
    console.log('✅ Base de données initialisée');

    // ===== AJOUT DES DONNÉES DE TEST =====
    
    // 1. Villes par défaut
    await db.runAsync(`
      INSERT OR IGNORE INTO villes (nom, region) VALUES 
        ('Antananarivo', 'Analamanga'),
        ('Fianarantsoa', 'Haute Matsiatra'),
        ('Toamasina', 'Atsinanana'),
        ('Mahajanga', 'Boeny'),
        ('Antsiranana', 'Diana'),
        ('Toliara', 'Atsimo-Andrefana')
    `);

    // 3. Admin par défaut
  await db.runAsync(`
  INSERT OR IGNORE INTO utilisateurs (nom, email, motDePasse, telephone, role)
  VALUES ('Admin', 'admin@bonplan.mg', 'admin123', '034 00 00 00', 'admin')
`); 


    // 2. Catégories par défaut
    await db.runAsync(`
      INSERT OR IGNORE INTO categories (nom, description, icone) VALUES 
        ('Hôtels', 'Établissements d\'hébergement', '🏨'),
        ('Restaurants', 'Établissements de restauration', '🍽️'),
        ('Cybercafés', 'Services internet et informatique', '💻'),
        ('Artisans', 'Artisanat et créations locales', '🎨'),
        ('Agriculture', 'Produits agricoles et fermes', '🌾'),
        ('Services', 'Services divers', '🔧')
    `);

    console.log('✅ Données de test insérées');
    // ===== FIN DES DONNÉES DE TEST =====

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
};

export default db;