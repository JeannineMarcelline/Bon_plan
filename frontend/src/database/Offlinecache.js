import * as SQLite from 'expo-sqlite';


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

    CREATE TABLE IF NOT EXISTS cache_generic (
    key TEXT PRIMARY KEY,
    raw_json TEXT NOT NULL,
    cached_at NOT NULL
    );
  `);
};

export const setCache = async(key, data) => {
try{
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT OR REPLACE INTO cache_generic(key, raw_json, cached_at) VALUES (?, ?, ?)',
    [key, JSON.stringify(data), now]
  );
}catch(error){
console.error(`Erreur setCache(${key}):`, error);
}
};

export const getCache = async (key) => {
 try{
  const row = await db.getFirstAsync(
    'SELECT raw_json FROM cache_generic WHERE key = ?',
    [key]
  );

  if(!row) return null;
  return JSON.parse(row.raw_json);
 }catch(error){

  console.error(`Erreur getCache(${key}):`, error);
  return null
 }

};

export const getCacheMeta = async (key) => {
 try{
  const row = await db.getFirstAsync(
    'SELECT  cached_at FROM cache_generic WHERE key = ?',
    [key]
  );

 return row?.cached_at || null;
 
 }catch(error){
  console.error(`Erreur getCacheMeta(${key}):`, error);
  return null
 }
};

export const clearCache = async(key) => {

try{

await db.runAsync('DELETE FROM cache_generic WHERE key = ?', [key]);

}catch(error){
console.error(`Erreur clearCache(${key}):`, error);
}
};

export const clearAllCache = async () => {
try{
  await db.execAsync( `
  DELETE FROM cache_entreprises,
  DELETE FROM cache_vehicules,
  DELETE FROM cache_reservations,
  DELETE FROM cache_generic;  
    `);
}catch(error){
console.error('Erreur de clearAllCache:', error)
}
};


export const getLastCacheUpdate = async () => {
  try {
    const row = await db.getFirstAsync(`
      SELECT MAX(cached_at) AS last FROM (
        SELECT cached_at FROM cache_generic
        UNION ALL
        SELECT cached_at FROM cache_entreprises
        UNION ALL
        SELECT cached_at FROM cache_reservations
      )
    `);
    return row?.last || null;
  } catch (error) {
    console.error('Erreur getLastCacheUpdate:', error);
    return null;
  }
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

