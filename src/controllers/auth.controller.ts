import { type Request, type Response } from 'express';
import bcrypt from 'bcrypt';
import { dbRun, dbQueryGet } from '../db/connection.js';
import { enviarCorreoVerificacion } from '../services/mail.service.js'; 

// 1. CONTROLADOR DE REGISTRO (Actualizado con envío de Mail)
export const registrarUsuario = async (req: Request, res: Response): Promise<void> => {
  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    return;
  }

  try {
    const usuarioExistente = await dbQueryGet('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (usuarioExistente) {
      res.status(400).json({ error: 'El correo electrónico ya se encuentra registrado.' });
      return;
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    await dbRun('BEGIN TRANSACTION;');

    try {
      const resultadoUsuario = await dbRun(
        'INSERT INTO usuarios (nombre, email, password_hash, verificado) VALUES (?, ?, ?, 0)',
        [nombre, email, passwordHash]
      );
      
      const nuevoUsuarioId = resultadoUsuario.lastID;

      await dbRun('INSERT INTO cuentas (usuario_id, moneda, saldo) VALUES (?, "ARS", 0.0)', [nuevoUsuarioId]);
      await dbRun('INSERT INTO cuentas (usuario_id, moneda, saldo) VALUES (?, "USD", 0.0)', [nuevoUsuarioId]);

      await dbRun('COMMIT;');

      // DISPARAR EL CORREO ELECTRÓNICO (Fuera de la transacción de la BD)
      // Se hace de forma asíncrona pero sin trabar la respuesta, o con un await controlado
      await enviarCorreoVerificacion(email, nombre, nuevoUsuarioId);

      res.status(201).json({
        message: 'Usuario registrado con éxito. Se ha enviado un correo de verificación a su casilla.',
        usuarioId: nuevoUsuarioId
      });

    } catch (transactionError) {
      await dbRun('ROLLBACK;');
      throw transactionError;
    }

  } catch (error) {
    console.error('❌ Error en el registro de usuario:', error);
    res.status(500).json({ error: 'Ocurrió un error interno en el servidor.' });
  }
};

// 2. NUEVO CONTROLADOR DE VERIFICACIÓN (Cambia verificado a 1)
export const verificarCuenta = async (req: Request, res: Response): Promise<void> => {
  const usuarioId = req.query.id;

  if (!usuarioId) {
    res.status(400).json({ error: 'Falta el identificador de usuario para la verificación.' });
    return;
  }

  try {
    // Verificar si el usuario existe
    const usuario = await dbQueryGet('SELECT id, verificado FROM usuarios WHERE id = ?', [usuarioId]);
    
    if (!usuario) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }

    if (usuario.verificado === 1) {
      res.status(400).json({ message: 'Esta cuenta ya ha sido verificada previamente.' });
      return;
    }

    // Cambiar estado a verificado (1)
    await dbRun('UPDATE usuarios SET verificado = 1 WHERE id = ?', [usuarioId]);

    res.status(200).send(`
      <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
        <h1 style="color: #4CAF50;">¡Cuenta activada con éxito!</h1>
        <p>Tu correo ha sido validado correctamente. Ya puedes iniciar sesión en la plataforma.</p>
      </div>
    `);

  } catch (error) {
    console.error('❌ Error al verificar cuenta:', error);
    res.status(500).json({ error: 'Error interno al procesar la verificación.' });
  }
};