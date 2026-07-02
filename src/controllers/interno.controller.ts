import { type Request, type Response } from 'express';
import { db, dbRun, dbQueryGet } from '../db/connection.js';

function generarCodigo6Digitos(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const buscarUsuarioPorEmail = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: 'Email es obligatorio.' });
    return;
  }

  try {
    const usuario = await dbQueryGet('SELECT id, nombre, email FROM usuarios WHERE email = ?', [email]);

    if (!usuario) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }

    const cuentas = await new Promise((resolve, reject) => {
      db.all('SELECT moneda, saldo FROM cuentas WHERE usuario_id = ?', [usuario.id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    }) as any[];

    const saldo_ars = cuentas.find((c: any) => c.moneda === 'ARS')?.saldo || 0;
    const saldo_usd = cuentas.find((c: any) => c.moneda === 'USD')?.saldo || 0;

    res.json({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      saldo_ars,
      saldo_usd,
    });
  } catch (error) {
    console.error('Error al buscar usuario:', error);
    res.status(500).json({ error: 'Error interno.' });
  }
};

export const crearOperacionPendiente = async (req: Request, res: Response): Promise<void> => {
  const { tipo, email_usuario, datos_json } = req.body;

  if (!tipo || !email_usuario || !datos_json) {
    res.status(400).json({ error: 'Faltan datos: tipo, email_usuario, datos_json.' });
    return;
  }

  try {
    const codigo = generarCodigo6Digitos();
    const expiracion = new Date();
    expiracion.setMinutes(expiracion.getMinutes() + 10);

    await dbRun(
      'INSERT INTO operaciones_pendientes (tipo, email_usuario, datos_json, codigo, expiracion) VALUES (?, ?, ?, ?, ?)',
      [tipo, email_usuario, JSON.stringify(datos_json), codigo, expiracion.toISOString()]
    );

    console.log('========================================');
    console.log(`CODIGO ${tipo.toUpperCase()} para ${email_usuario}: ${codigo}`);
    console.log('========================================');

    res.json({
      status: 'pending',
      codigo,
      expiracion: expiracion.toISOString(),
    });
  } catch (error) {
    console.error('Error al crear operacion pendiente:', error);
    res.status(500).json({ error: 'Error interno.' });
  }
};

async function registrarMovimientoInterno(
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

export const registrarMovimientoExterno = async (req: Request, res: Response): Promise<void> => {
  const { usuario_id, tipo, moneda, monto, saldo_resultante, descripcion } = req.body;

  if (!usuario_id || !tipo || !moneda || monto === undefined) {
    res.status(400).json({ error: 'Faltan datos: usuario_id, tipo, moneda, monto.' });
    return;
  }

  try {
    await registrarMovimientoInterno(usuario_id, tipo, moneda, monto, saldo_resultante, descripcion);
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Error al registrar movimiento:', error);
    res.status(500).json({ error: 'Error interno.' });
  }
};

export const confirmarOperacionPendiente = async (req: Request, res: Response): Promise<void> => {
  const { email_usuario, codigo, tipo } = req.body;

  if (!email_usuario || !codigo || !tipo) {
    res.status(400).json({ error: 'Faltan datos: email_usuario, codigo, tipo.' });
    return;
  }

  try {
    const registro = await dbQueryGet(
      'SELECT id, datos_json, expiracion FROM operaciones_pendientes WHERE email_usuario = ? AND codigo = ? AND tipo = ? AND confirmado = 0 ORDER BY id DESC LIMIT 1',
      [email_usuario, codigo, tipo]
    );

    if (!registro) {
      res.status(400).json({ error: 'Codigo invalido o ya utilizado.' });
      return;
    }

    const ahora = new Date();
    const expiracion = new Date(registro.expiracion);

    if (ahora > expiracion) {
      res.status(400).json({ error: 'El codigo ha expirado.' });
      return;
    }

    await dbRun('UPDATE operaciones_pendientes SET confirmado = 1 WHERE id = ?', [registro.id]);

    res.json({
      status: 'confirmed',
      datos: JSON.parse(registro.datos_json),
    });
  } catch (error) {
    console.error('Error al confirmar operacion:', error);
    res.status(500).json({ error: 'Error interno.' });
  }
};
