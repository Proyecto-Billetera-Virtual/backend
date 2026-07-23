import { type Request, type Response } from 'express';
import { db, dbRun, dbQueryGet } from '../db/connection.js';

async function registrarMovimiento(
  usuario_id: number,
  tipo: string,
  moneda: string,
  monto: number,
  saldo_resultante: number,
  descripcion?: string
): Promise<void> {
  await dbRun(
    'INSERT INTO movimientos (usuario_id, tipo, moneda, monto, saldo_resultante, descripcion, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [usuario_id, tipo, moneda, monto, saldo_resultante, descripcion || null, new Date().toISOString()]
  );
}

async function getSaldoActual(usuario_id: number, moneda: string): Promise<number> {
  const cuenta = await dbQueryGet('SELECT saldo FROM cuentas WHERE usuario_id = ? AND moneda = ?', [usuario_id, moneda]);
  return cuenta ? cuenta.saldo : 0;
}

export const obtenerSaldos = (req: Request, res: Response): void => {
  const usuarioId = req.usuarioId;

  db.all('SELECT moneda, saldo FROM cuentas WHERE usuario_id = ?', [usuarioId], (err, rows: any[]) => {
    if (err) {
      console.error('Error al obtener saldos:', err.message);
      res.status(500).json({ error: 'Error interno al consultar los saldos.' });
      return;
    }

    const respuestaSaldos = { saldo_ars: 0, saldo_usd: 0 };

    rows.forEach((row) => {
      if (row.moneda === 'ARS') respuestaSaldos.saldo_ars = row.saldo;
      if (row.moneda === 'USD') respuestaSaldos.saldo_usd = row.saldo;
    });

    res.status(200).json(respuestaSaldos);
  });
};

export const ingresarFondos = async (req: Request, res: Response): Promise<void> => {
  const usuarioId = req.usuarioId;
  const { moneda, monto } = req.body;

  if (usuarioId === undefined) {
    res.status(401).json({ error: 'No autenticado.' });
    return;
  }

  if (!moneda || monto === undefined) {
    res.status(400).json({ error: 'La moneda (ARS/USD) y el monto son obligatorios.' });
    return;
  }

  if (moneda !== 'ARS' && moneda !== 'USD') {
    res.status(400).json({ error: 'Moneda no soportada. Solo se permite ARS o USD.' });
    return;
  }

  if (typeof monto !== 'number' || monto <= 0) {
    res.status(400).json({ error: 'El monto debe ser un número mayor a cero.' });
    return;
  }

  try {
    const cuenta = await dbQueryGet(
      'SELECT id, saldo FROM cuentas WHERE usuario_id = ? AND moneda = ?',
      [usuarioId, moneda]
    );

    if (!cuenta) {
      res.status(404).json({ error: `No se encontró una billetera en ${moneda} para este usuario.` });
      return;
    }

    const nuevoSaldo = cuenta.saldo + monto;

    await dbRun('BEGIN TRANSACTION;');

    try {
      await dbRun(
        'UPDATE cuentas SET saldo = ? WHERE usuario_id = ? AND moneda = ?',
        [nuevoSaldo, usuarioId, moneda]
      );

      await registrarMovimiento(usuarioId, 'deposito', moneda, monto, nuevoSaldo, `Deposito de ${monto} ${moneda}`);

      await dbRun('COMMIT;');

    } catch (transactionError) {
      try { await dbRun('ROLLBACK;'); } catch {}
      throw transactionError;
    }

    res.status(200).json({
      message: `Ingreso de ${moneda} exitoso.`,
      moneda,
      monto_ingresado: monto,
      nuevo_saldo: nuevoSaldo
    });

  } catch (error) {
    console.error('Error al ingresar fondos:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Ocurrió un error interno al procesar el depósito.' });
    }
  }
};

export const obtenerMovimientos = async (req: Request, res: Response): Promise<void> => {
  const usuarioId = req.usuarioId;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

  try {
    const rows: any[] = await new Promise((resolve, reject) => {
      db.all(
        'SELECT id, tipo, moneda, monto, saldo_resultante, descripcion, created_at FROM movimientos WHERE usuario_id = ? ORDER BY created_at DESC LIMIT ?',
        [usuarioId, limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener movimientos:', error);
    res.status(500).json({ error: 'Error interno.' });
  }
};

export const consultarSaldoInterno = async (req: Request, res: Response): Promise<void> => {
  const usuario_id = req.params.usuario_id as string;

  if (!usuario_id) {
    res.status(400).json({ error: 'Falta el ID de usuario.' });
    return;
  }

  try {
    const rows: any[] = await new Promise((resolve, reject) => {
      db.all('SELECT moneda, saldo FROM cuentas WHERE usuario_id = ?', [usuario_id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const uid = parseInt(usuario_id);
    const respuesta = { usuario_id: uid, saldo_ars: 0, saldo_usd: 0 };

    rows.forEach((row: any) => {
      if (row.moneda === 'ARS') respuesta.saldo_ars = row.saldo;
      if (row.moneda === 'USD') respuesta.saldo_usd = row.saldo;
    });

    res.status(200).json(respuesta);
  } catch (error) {
    console.error('Error al consultar saldo interno:', error);
    res.status(500).json({ error: 'Error interno.' });
  }
};

export const actualizarSaldoInterno = async (req: Request, res: Response): Promise<void> => {
  const { usuario_id, moneda, monto } = req.body;

  if (!usuario_id || !moneda || monto === undefined) {
    res.status(400).json({ error: 'Faltan datos: usuario_id, moneda y monto.' });
    return;
  }

  if (moneda !== 'ARS' && moneda !== 'USD') {
    res.status(400).json({ error: 'Moneda no soportada.' });
    return;
  }

  try {
    const cuenta = await dbQueryGet(
      'SELECT id, saldo FROM cuentas WHERE usuario_id = ? AND moneda = ?',
      [usuario_id, moneda]
    );

    if (!cuenta) {
      res.status(404).json({ error: 'Cuenta no encontrada.' });
      return;
    }

    const nuevoSaldo = cuenta.saldo + monto;

    if (nuevoSaldo < 0) {
      res.status(400).json({ error: 'Saldo insuficiente.', saldo_actual: cuenta.saldo });
      return;
    }

    await dbRun('UPDATE cuentas SET saldo = ? WHERE id = ?', [nuevoSaldo, cuenta.id]);

    res.status(200).json({ status: 'updated', nuevo_saldo: nuevoSaldo });
  } catch (error) {
    console.error('Error al actualizar saldo interno:', error);
    res.status(500).json({ error: 'Error interno.' });
  }
};

export { registrarMovimiento, getSaldoActual };
