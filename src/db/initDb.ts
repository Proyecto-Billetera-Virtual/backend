import { db, dbRun } from './connection.js';

const inicializarTablas = async () => {
  try {
    await dbRun('PRAGMA foreign_keys = ON;');

    await dbRun(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        verificado INTEGER DEFAULT 0
      );
    `);
    console.log('Tabla "usuarios" verificada/creada.');

    await dbRun(`
      CREATE TABLE IF NOT EXISTS cuentas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        moneda TEXT CHECK(moneda IN ('ARS', 'USD')) NOT NULL,
        saldo REAL DEFAULT 0.0,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      );
    `);
    console.log('Tabla "cuentas" verificada/creada.');

    await dbRun(`
      CREATE TABLE IF NOT EXISTS sesiones (
        id TEXT PRIMARY KEY,
        usuario_id INTEGER NOT NULL,
        fecha_expiracion TEXT NOT NULL,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      );
    `);
    console.log('Tabla "sesiones" verificada/creada.');

    await dbRun(`
      CREATE TABLE IF NOT EXISTS codigos_verificacion (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        codigo TEXT NOT NULL,
        expiracion TEXT NOT NULL,
        usado INTEGER DEFAULT 0
      );
    `);
    console.log('Tabla "codigos_verificacion" verificada/creada.');

    await dbRun(`
      CREATE TABLE IF NOT EXISTS operaciones_pendientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL CHECK(tipo IN ('transferencia', 'pago')),
        email_usuario TEXT NOT NULL,
        datos_json TEXT NOT NULL,
        codigo TEXT NOT NULL,
        expiracion TEXT NOT NULL,
        confirmado INTEGER DEFAULT 0
      );
    `);
    console.log('Tabla "operaciones_pendientes" verificada/creada.');

    await dbRun(`
      CREATE TABLE IF NOT EXISTS movimientos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        tipo TEXT NOT NULL,
        moneda TEXT NOT NULL CHECK(moneda IN ('ARS', 'USD')),
        monto REAL NOT NULL,
        saldo_resultante REAL NOT NULL,
        descripcion TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      );
    `);
    console.log('Tabla "movimientos" verificada/creada.');

    console.log('Base de datos inicializada con exito.');
  } catch (error) {
    console.error('Error construyendo las tablas:', error);
    throw error;
  }
};

export default inicializarTablas;
