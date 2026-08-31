import * as SQLite from 'expo-sqlite';

// On réutilise le même fichier bonplan.db, mais dans des tables dédiées au cache
// pour ne pas toucher à l'ancien schéma local (utilisateurs, entreprises, etc.)
const db = SQLite.openDatabaseSync('bonplan.db');

export const initOfflineCache = async () => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS cache_vehicules (
      id_vehicule INTEGER PRIMARY KEY,
      raw_json TEXT NOT NULL,
      cached_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cache_reservations (
      id_reservation INTEGER PRIMARY KEY,
      raw_json TEXT NOT NULL,
      cached_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cache_entreprises (
      id INTEGER PRIMARY KEY,
      raw_json TEXT NOT NULL,
      cached_at TEXT NOT NULL
    );
  `);
};

// ===== ENTREPRISES (HomeScreen) =====

export const setCacheEntreprises = async (entreprises) => {
  const now = new Date().toISOString();
  await db.execAsync('DELETE FROM cache_entreprises');
  for (const e of entreprises) {
    await db.runAsync(
      'INSERT OR REPLACE INTO cache_entreprises (id, raw_json, cached_at) VALUES (?, ?, ?)',
      [e.id, JSON.stringify(e), now]
    );
  }
};

export const getCacheEntreprises = async () => {
  const rows = await db.getAllAsync('SELECT raw_json FROM cache_entreprises');
  return rows.map((r) => JSON.parse(r.raw_json));
};

// ===== VÉHICULES (HomeScreen) =====

export const setCacheVehicules = async (vehicules) => {
  const now = new Date().toISOString();
  await db.execAsync('DELETE FROM cache_vehicules');
  for (const v of vehicules) {
    await db.runAsync(
      'INSERT OR REPLACE INTO cache_vehicules (id_vehicule, raw_json, cached_at) VALUES (?, ?, ?)',
      [v.id_vehicule, JSON.stringify(v), now]
    );
  }
};

export const getCacheVehicules = async () => {
  const rows = await db.getAllAsync('SELECT raw_json FROM cache_vehicules');
  return rows.map((r) => JSON.parse(r.raw_json));
};

// ===== RÉSERVATIONS (MesReservationsScreen) =====

export const setCacheReservations = async (reservations) => {
  const now = new Date().toISOString();
  await db.execAsync('DELETE FROM cache_reservations');
  for (const r of reservations) {
    await db.runAsync(
      'INSERT OR REPLACE INTO cache_reservations (id_reservation, raw_json, cached_at) VALUES (?, ?, ?)',
      [r.id_reservation, JSON.stringify(r), now]
    );
  }
};

export const getCacheReservations = async () => {
  const rows = await db.getAllAsync('SELECT raw_json FROM cache_reservations');
  return rows.map((r) => JSON.parse(r.raw_json));
};

export default db;

