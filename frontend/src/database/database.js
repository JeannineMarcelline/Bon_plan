import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

// Ouvrir la base de données (synchrone)
const db = SQLite.openDatabaseSync('bonplan.db');

const hashPassword = async (password) => {
  const hashed = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password
  );
  return hashed;
};




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
        description TEXT
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
        latitude REAL,
        longitude REAL,
        statutAbonnement TEXT DEFAULT 'expire' CHECK (statutAbonnement IN ('actif', 'expire', 'suspendu')),
        dateFinAbonnement TEXT,
        statutValidation TEXT DEFAULT 'en_attente' CHECK (statutValidation IN ('en_attente', 'valide', 'refuse')),
        type_activite TEXT DEFAULT 'service' CHECK (type_activite IN ('hotel', 'restaurant', 'transport', 'artisan', 'agriculteur', 'service')),
        ville_id INTEGER NOT NULL,
        categorie_id INTEGER NOT NULL,
        utilisateur_id INTEGER NOT NULL,
        FOREIGN KEY (ville_id) REFERENCES villes(id) ON DELETE CASCADE,
        FOREIGN KEY (categorie_id) REFERENCES categories(id) ON DELETE CASCADE,
        FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS vehicules(
      id_vehicule INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      type TEXT NOT NULL,
      photo TEXT,
      capacite INTEGER NOT NULL,
      prix_place REAL NOT NULL,
      ville_depart TEXT NOT NULL,
      ville_arrivee TEXT NOT NULL,
      places_cote_chauffeur INTEGER DEFAULT 0,
      date_depart TEXT NOT NULL,
      heure_depart TEXT NOT NULL,
      id_entreprise INTEGER NOT NULL,
      FOREIGN KEY (id_entreprise) REFERENCES entreprises(id)
      );

      CREATE TABLE IF NOT EXISTS places(
      id_place INTEGER PRIMARY KEY AUTOINCREMENT,
      id_vehicule INTEGER NOT NULL,
      numero_place INTEGER NOT NULL,
      position TEXT DEFAULT 'standard',
      statut TEXT NOT NULL CHECK (statut IN ('disponible', 'reservee')),
      FOREIGN KEY (id_vehicule) REFERENCES vehicules(id_vehicule)
      );

      CREATE TABLE IF NOT EXISTS reservation_transport(
      id_reservation INTEGER PRIMARY KEY AUTOINCREMENT,
      id_utilisateur INTEGER NOT NULL,
      id_vehicule INTEGER NOT NULL,
      id_place INTEGER NOT NULL,
      horaire_reservation TEXT NOT NULL,
      date_reservation TEXT NOT NULL,
      statut TEXT DEFAULT 'confirmee',
      FOREIGN KEY (id_utilisateur) REFERENCES utilisateurs(id),
      FOREIGN KEY (id_vehicule) REFERENCES vehicules(id_vehicule),
      FOREIGN KEY (id_place) REFERENCES places(id_place)
      );

     CREATE TABLE IF NOT EXISTS avis (
     id_avis INTEGER PRIMARY KEY AUTOINCREMENT,
     id_utilisateur INTEGER NOT NULL,
     id_entreprise INTEGER NOT NULL,
     note INTEGER NOT NULL CHECK (note >= 1 and note <= 5),
     commentaire TEXT,
     date_avis TEXT DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY(id_utilisateur) REFERENCES utilisateurs(id) ON DELETE CASCADE,
     FOREIGN KEY(id_entreprise) REFERENCES entreprises(id) ON DELETE CASCADE
     );
    `);

    // ===== DONNÉES DE TEST TRANSPORT =====
    


const entreprise = await db.getAllAsync('SELECT id FROM entreprises WHERE id = 1');
if (entreprise.length === 0) {
  console.log('⚠️ Entreprise id=1 non trouvée, création...');
  const result = await db.runAsync(`
    INSERT INTO entreprises (nom, description, adresse, telephone, ville_id, categorie_id, utilisateur_id, statutValidation, type_activite)
    VALUES ('Transport Test', 'Entreprise de test', 'Adresse test', '034 00 00 00', 1, 1, 1, 'valide', 'transport')
  `);
  var idEntreprise = result.lastInsertRowId;
} else {
  var idEntreprise = entreprise[0].id;
}



// ===== FIN DONNÉES DE TEST =====

    // 3. Admin par défaut
const adminExists = await db.getAllAsync('SELECT * FROM utilisateurs WHERE role = "admin"');
   if (adminExists.length === 0) {
      const hashedPassword = await hashPassword('admin123');
      await db.runAsync(
        `INSERT INTO utilisateurs (nom, email, motDePasse, telephone, role)
         VALUES ('Admin', 'admin@bonplan.mg', ?, '034 09 755 55', 'admin')`,
        [hashedPassword]
      );
    
    }


  } catch (error) {
    console.error('❌ Erreur:', error);
  }
};

export default db;