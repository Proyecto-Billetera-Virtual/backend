import { type Request, type Response } from 'express';
import bcrypt from 'bcrypt';
import { dbRun, dbQueryGet } from '../db/connection.js';
import { enviarCorreoVerificacion, enviarCorreoRecuperacion } from '../services/mail.service.js';
import crypto from 'crypto';

function generarCodigo6Digitos(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const registrarUsuario = async (req: Request, res: Response): Promise<void> => {
  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    return;
  }

  try {
    const usuarioExistente = await dbQueryGet('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (usuarioExistente) {
      res.status(400).json({ error: 'El correo electronico ya se encuentra registrado.' });
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

      const codigo = generarCodigo6Digitos();
      const expiracion = new Date();
      expiracion.setHours(expiracion.getHours() + 1);

      await dbRun(
        'INSERT INTO codigos_verificacion (email, codigo, expiracion, usado) VALUES (?, ?, ?, 0)',
        [email, codigo, expiracion.toISOString()]
      );

      console.log('========================================');
      console.log(`CODIGO DE VERIFICACION para ${email}: ${codigo}`);
      console.log('========================================');

      await enviarCorreoVerificacion(email, nombre, codigo);

      res.status(201).json({
        message: 'Usuario registrado con exito. Se ha enviado un codigo de verificacion a su correo.',
        usuarioId: nuevoUsuarioId,
        email: email
      });

    } catch (transactionError) {
      await dbRun('ROLLBACK;');
      throw transactionError;
    }

  } catch (error) {
    console.error('Error en el registro de usuario:', error);
    res.status(500).json({ error: 'Ocurrio un error interno en el servidor.' });
  }
};

export const verificarConCodigo = async (req: Request, res: Response): Promise<void> => {
  const { email, codigo } = req.body;

  if (!email || !codigo) {
    res.status(400).json({ error: 'Email y codigo son obligatorios.' });
    return;
  }

  try {
    const usuario = await dbQueryGet('SELECT id, verificado FROM usuarios WHERE email = ?', [email]);

    if (!usuario) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }

    if (usuario.verificado === 1) {
      res.status(400).json({ error: 'Esta cuenta ya ha sido verificada.' });
      return;
    }

    const registro = await dbQueryGet(
      'SELECT id, expiracion FROM codigos_verificacion WHERE email = ? AND codigo = ? AND usado = 0 ORDER BY id DESC LIMIT 1',
      [email, codigo]
    );

    if (!registro) {
      res.status(400).json({ error: 'Codigo invalido. Solicite uno nuevo.' });
      return;
    }

    const ahora = new Date();
    const expiracion = new Date(registro.expiracion);

    if (ahora > expiracion) {
      res.status(400).json({ error: 'El codigo ha expirado. Solicite uno nuevo.' });
      return;
    }

    await dbRun('BEGIN TRANSACTION;');

    try {
      await dbRun('UPDATE usuarios SET verificado = 1 WHERE id = ?', [usuario.id]);
      await dbRun('UPDATE codigos_verificacion SET usado = 1 WHERE id = ?', [registro.id]);
      await dbRun('COMMIT;');
    } catch (transactionError) {
      await dbRun('ROLLBACK;');
      throw transactionError;
    }

    res.status(200).json({ message: 'Cuenta verificada con exito. Ya puedes iniciar sesion.' });

  } catch (error) {
    console.error('Error al verificar codigo:', error);
    res.status(500).json({ error: 'Error interno al verificar el codigo.' });
  }
};

export const reenviarCodigo = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: 'El email es obligatorio.' });
    return;
  }

  try {
    const usuario = await dbQueryGet('SELECT id, nombre FROM usuarios WHERE email = ?', [email]);

    if (!usuario) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }

    if (usuario.verificado === 1) {
      res.status(400).json({ error: 'La cuenta ya esta verificada.' });
      return;
    }

    const codigo = generarCodigo6Digitos();
    const expiracion = new Date();
    expiracion.setHours(expiracion.getHours() + 1);

    await dbRun(
      'INSERT INTO codigos_verificacion (email, codigo, expiracion, usado) VALUES (?, ?, ?, 0)',
      [email, codigo, expiracion.toISOString()]
    );

    console.log('========================================');
    console.log(`NUEVO CODIGO DE VERIFICACION para ${email}: ${codigo}`);
    console.log('========================================');

    await enviarCorreoVerificacion(email, usuario.nombre, codigo);

    res.status(200).json({ message: 'Codigo reenviado a su correo.' });

  } catch (error) {
    console.error('Error al reenviar codigo:', error);
    res.status(500).json({ error: 'Error interno.' });
  }
};

export const loginUsuario = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'El email y la contrasena son obligatorios.' });
    return;
  }

  try {
    const usuario = await dbQueryGet(
      'SELECT id, nombre, email, password_hash, verificado FROM usuarios WHERE email = ?',
      [email]
    );

    if (!usuario) {
      res.status(401).json({ error: 'Credenciales invalidas.' });
      return;
    }

    if (usuario.verificado === 0) {
      res.status(403).json({ error: 'Por favor, verifique su correo electronico antes de iniciar sesion.' });
      return;
    }

    const passwordCorrecto = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordCorrecto) {
      res.status(401).json({ error: 'Credenciales invalidas.' });
      return;
    }

    const tokenSesion = crypto.randomUUID();

    const fechaExpiracion = new Date();
    fechaExpiracion.setHours(fechaExpiracion.getHours() + 24);
    const fechaExpiracionISO = fechaExpiracion.toISOString();

    await dbRun(
      'INSERT INTO sesiones (id, usuario_id, fecha_expiracion) VALUES (?, ?, ?)',
      [tokenSesion, usuario.id, fechaExpiracionISO]
    );

    res.status(200).json({
      message: 'Inicio de sesion exitoso.',
      token: tokenSesion,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email
      }
    });

  } catch (error) {
    console.error('Error en el login de usuario:', error);
    res.status(500).json({ error: 'Ocurrio un error interno en el servidor.' });
  }
};

export const recuperarPassword = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: 'El email es obligatorio.' });
    return;
  }

  try {
    const usuario = await dbQueryGet('SELECT id, nombre FROM usuarios WHERE email = ?', [email]);

    if (!usuario) {
      res.status(200).json({ message: 'Si el correo existe, recibiras un codigo de recuperacion.' });
      return;
    }

    const codigo = generarCodigo6Digitos();
    const expiracion = new Date();
    expiracion.setHours(expiracion.getHours() + 1);

    await dbRun(
      'INSERT INTO codigos_verificacion (email, codigo, expiracion, usado) VALUES (?, ?, ?, 0)',
      [email, codigo, expiracion.toISOString()]
    );

    console.log('========================================');
    console.log(`CODIGO DE RECUPERACION para ${email}: ${codigo}`);
    console.log('========================================');

    await enviarCorreoRecuperacion(email, usuario.nombre, codigo);

    res.status(200).json({ message: 'Correo de recuperacion enviado.' });

  } catch (error) {
    console.error('Error en recuperar contrasena:', error);
    res.status(500).json({ error: 'Error interno al procesar la solicitud.' });
  }
};

export const resetearPassword = async (req: Request, res: Response): Promise<void> => {
  const { email, codigo, nueva_password } = req.body;

  if (!email || !codigo || !nueva_password) {
    res.status(400).json({ error: 'Email, codigo y nueva contrasena son obligatorios.' });
    return;
  }

  if (nueva_password.length < 6) {
    res.status(400).json({ error: 'La contrasena debe tener al menos 6 caracteres.' });
    return;
  }

  try {
    const registro = await dbQueryGet(
      'SELECT id, expiracion FROM codigos_verificacion WHERE email = ? AND codigo = ? AND usado = 0 ORDER BY id DESC LIMIT 1',
      [email, codigo]
    );

    if (!registro) {
      res.status(400).json({ error: 'Codigo invalido o ya utilizado.' });
      return;
    }

    const ahora = new Date();
    const expiracion = new Date(registro.expiracion);

    if (ahora > expiracion) {
      res.status(400).json({ error: 'El codigo ha expirado. Solicita uno nuevo.' });
      return;
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(nueva_password, saltRounds);

    await dbRun('BEGIN TRANSACTION;');

    try {
      await dbRun('UPDATE usuarios SET password_hash = ? WHERE email = ?', [passwordHash, email]);
      await dbRun('UPDATE codigos_verificacion SET usado = 1 WHERE id = ?', [registro.id]);
      await dbRun('COMMIT;');
    } catch (transactionError) {
      await dbRun('ROLLBACK;');
      throw transactionError;
    }

    res.status(200).json({ message: 'Contrasena actualizada con exito.' });

  } catch (error) {
    console.error('Error al resetear contrasena:', error);
    res.status(500).json({ error: 'Error interno al procesar el cambio de contrasena.' });
  }
};
