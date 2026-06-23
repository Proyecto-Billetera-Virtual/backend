import sqlite3 from 'sqlite3';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// Obtener la ruta de la base de datos desde el .env o usar una por defecto
const dbPath = process.env.DB_PATH || './database.sqlite';
const absolutePath = path.resolve(dbPath);

console.log(`⏳ Inicializando base de datos en: ${absolutePath}...`);

// Conectar con la base de datos (si el archivo no existe, SQLite lo crea automáticamente)
const db = new sqlite3.Database(absolutePath, (err) => {
  if (err) {
    console.error('❌ Error al abrir la base de datos:', err.message);
    process.exit(1);
  }
});

// Función auxiliar para ejecutar queries usando Promesas de manera limpia
const ejecutarQuery = (sql: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

const inicializarTablas = async () => {
  try {
    // Activar soporte para Claves Foráneas (Foreign Keys) en SQLite de forma explícita
    await ejecutarQuery('PRAGMA foreign_keys = ON;');

    // 1. Crear Tabla de Usuarios
    await ejecutarQuery(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        verificado INTEGER DEFAULT 0
      );
    `);
    console.log('✅ Tabla "usuarios" verificada/creada.');

    // 2. Crear Tabla de Cuentas (Pesos y Dólares)
    await ejecutarQuery(`
      CREATE TABLE IF NOT EXISTS cuentas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        moneda TEXT CHECK(moneda IN ('ARS', 'USD')) NOT NULL,
        saldo REAL DEFAULT 0.0,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      );
    `);
    console.log('✅ Tabla "cuentas" verificada/creada.');

    // 3. Crear Tabla de Sesiones Opacas (Control de accesos alternativo a JWT)
    await ejecutarQuery(`
      CREATE TABLE IF NOT EXISTS sesiones (
        id TEXT PRIMARY KEY,
        usuario_id INTEGER NOT NULL,
        fecha_expiracion TEXT NOT NULL,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      );
    `);
    console.log('✅ Tabla "sesiones" verificada/creada.');

    console.log('🚀 Base de datos inicializada con éxito.');
  } catch (error) {
    console.error('❌ Error construyendo las tablas:', error);
  } finally {
    // Cerrar la conexión al terminar el script
    db.close();
  }
};

inicializarTablas();