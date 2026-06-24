import { type Request, type Response } from 'express';
import { db } from '../db/connection.js';

export const obtenerSaldos = (req: Request, res: Response): void => {
  const usuarioId = req.usuarioId; // Obtenido de forma segura desde el middleware

  // Consulta directa a la tabla cuentas en SQLite
  db.all('SELECT moneda, saldo FROM cuentas WHERE usuario_id = ?', [usuarioId], (err, rows: any[]) => {
    if (err) {
      console.error('❌ Error al obtener saldos:', err.message);
      res.status(500).json({ error: 'Error interno al consultar los saldos.' });
      return;
    }

    // Mapear las filas a un JSON cómodo para el Frontend/Proxy
    const respuestaSaldos = {
      saldo_ars: 0,
      saldo_usd: 0
    };

    rows.forEach((row) => {
      if (row.moneda === 'ARS') respuestaSaldos.saldo_ars = row.saldo;
      if (row.moneda === 'USD') respuestaSaldos.saldo_usd = row.saldo;
    });

    res.status(200).json(respuestaSaldos);
  });
};