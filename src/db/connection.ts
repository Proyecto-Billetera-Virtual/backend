import sqlite3 from 'sqlite3';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const dbPath = process.env.DB_PATH || './database.sqlite';

export const db = new sqlite3.Database(path.resolve(dbPath), (err) => {
  if (err) {
    console.error('❌ Error al conectar a SQLite:', err.message);
  }
});
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS movimientos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cuenta_id INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      monto REAL NOT NULL,
      detalle TEXT,
      fecha INTEGER NOT NULL,
      FOREIGN KEY(cuenta_id) REFERENCES cuentas(id)
    );
  `, (err) => {
    if (err) {
      console.error('❌ Error al crear la tabla movimientos:', err.message);
    } else {
      console.log('✅ Tabla "movimientos" verificada/creada con éxito.');
    }
  });
});
// Helpers para usar async/await con el driver nativo de sqlite3
export const dbQueryGet = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

//  salvaguarda por si 'this' es undefined en comandos de control (BEGIN, COMMIT)
export const dbRun = function (sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        // Si 'this' existe (en INSERTs/UPDATEs), pasamos los datos. Si no (en transacciones), devolvemos 0 de forma segura.
        const lastID = this ? this.lastID : 0;
        const changes = this ? this.changes : 0;
        resolve({ lastID, changes });
      }
    });
  });
};