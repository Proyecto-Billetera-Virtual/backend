import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function templateHTML(titulo: string, nombre: string, codigo: string, instrucciones: string, expiracion: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 10px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
        <tr>
          <td style="background:#FF6B35;padding:28px 40px;text-align:center">
            <div style="font-size:32px;font-weight:800;color:#fff;letter-spacing:2px">
              <span style="display:inline-block;background:#fff;color:#FF6B35;width:40px;height:40px;line-height:40px;border-radius:8px;margin-right:8px;font-size:24px">B</span>
              BurgerPay
            </div>
            <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px">Tu billetera virtual</p>
          </td>
        </tr>
        <tr><td style="padding:36px 40px 24px">
          <h1 style="font-size:22px;color:#1a1a1a;margin:0 0 6px">${titulo}</h1>
          <p style="font-size:15px;color:#555;margin:0 0 20px">Hola <strong style="color:#FF6B35">${nombre}</strong>,</p>
          <p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 20px">${instrucciones}</p>
          <div style="background:#fff7f0;border:2px dashed #FF6B35;border-radius:12px;padding:20px;text-align:center;margin:0 0 20px">
            <p style="font-size:13px;color:#888;margin:0 0 10px;text-transform:uppercase;letter-spacing:1px">Tu codigo</p>
            <p style="font-size:36px;font-weight:800;color:#FF6B35;letter-spacing:10px;margin:0;font-family:monospace">${codigo}</p>
          </div>
          <p style="font-size:13px;color:#888;margin:0">${expiracion}</p>
        </td></tr>
        <tr>
          <td style="background:#fafafa;padding:20px 40px;text-align:center;border-top:1px solid #eee">
            <p style="font-size:12px;color:#aaa;margin:0">BurgerPay &mdash; Billetera virtual segura</p>
            <p style="font-size:11px;color:#bbb;margin:6px 0 0">Si no solicitaste este codigo, ignora este mensaje.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export const enviarCorreoVerificacion = async (emailDestino: string, nombreUsuario: string, codigo: string) => {
  await transporter.sendMail({
    from: `"BurgerPay" <${process.env.SMTP_USER}>`,
    to: emailDestino,
    subject: 'Verifica tu cuenta en BurgerPay',
    html: templateHTML(
      'Verifica tu cuenta',
      nombreUsuario,
      codigo,
      'Gracias por registrarte. Ingresa el codigo de verificacion para activar tu cuenta.',
      'Este codigo expira en 1 hora.'
    ),
  });
};

export const enviarCorreoRecuperacion = async (emailDestino: string, nombreUsuario: string, resetToken: string) => {
  await transporter.sendMail({
    from: `"BurgerPay" <${process.env.SMTP_USER}>`,
    to: emailDestino,
    subject: 'Restablece tu contrasena - BurgerPay',
    html: templateHTML(
      'Restablece tu contrasena',
      nombreUsuario,
      resetToken,
      'Recibiste este correo porque solicitaste restablecer tu contrasena. Usa el codigo para crear una nueva.',
      'Este codigo expira en 1 hora.'
    ),
  });
};
