import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configurar el transportador SMTP usando las variables de entorno
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '2525'),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const enviarCorreoVerificacion = async (emailDestino: string, nombreUsuario: string, usuarioId: number) => {
  // Enlace simulado que el usuario clickeará para verificar su cuenta
  // Nota: Apunta al Backend, pero en el flujo real pasará por el Proxy
  const urlVerificacion = `http://localhost:5000/api/auth/verify?id=${usuarioId}`;

  const htmlContent = `
    <h1>¡Hola ${nombreUsuario}!</h1>
    <p>Gracias por registrarte en nuestra Billetera Virtual.</p>
    <p>Para activar tu cuenta y poder empezar a operar, por favor haz clic en el siguiente enlace:</p>
    <a href="${urlVerificacion}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">
      Verificar mi Cuenta
    </a>
    <p>Si no te registraste en nuestro sitio, puedes ignorar este correo.</p>
  `;

  await transporter.sendMail({
    from: '"Billetera Virtual" <no-reply@billeteravirtual.com>',
    to: emailDestino,
    subject: '🔑 Verifica tu cuenta - Billetera Virtual',
    html: htmlContent,
  });
};