import nodemailer from 'nodemailer';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

// 1. Configuramos el transporte.
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  }
});

export const generateResetToken = () => {
  const resetToken = crypto.randomBytes(32).toString('hex');
  const passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  return { resetToken, passwordResetToken };
};

export const getResetExpiresAt = (minutes = 30) => {
  return new Date(Date.now() + minutes * 60 * 1000); // 30 minutos de validez
};

// Agregamos 'userName' aquí para que el HTML pueda usarlo
export const sendResetEmail = async (email: string, resetLink: string, userName: string = 'Usuario') => {
  const mailOptions = {
    from: '"QuickTech Support" <noreply@quicktech.com>',
    to: email,
    subject: "Recuperación de contraseña - QuickTech",
    html: `
    <div style="background-color: #141414; padding: 50px 0; font-family: system-ui, -apple-system, sans-serif;">
      <div style="max-width: 520px; margin: 0 auto; background-color: #1b1b1b; border: 1px solid #2a2a2a; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.35);">
        
        <div style="padding: 20px; border-bottom: 1px solid #2a2a2a; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 1.35rem; font-weight: 800; letter-spacing: 0.5px;">QuickTech</h1>
        </div>

        <div style="padding: 40px; text-align: center;">
          <h2 style="margin-top: 0; color: #7aa2ff; font-size: 1.25rem;">¡Hola, ${userName}!</h2>
          
          <p style="font-size: 16px; line-height: 1.6; color: rgba(255, 255, 255, 0.75); margin-bottom: 30px;">
            Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para configurar una nueva.
          </p>
          
          <div style="margin: 35px 0;">
            <a href="${resetLink}" style="background-color: #7aa2ff; color: #0a0a0a; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 16px; display: inline-block;">
              Restablecer Contraseña
            </a>
          </div>

          <p style="font-size: 13px; color: rgba(255, 255, 255, 0.5); margin-top: 40px; border-top: 1px solid #2a2a2a; padding-top: 20px;">
            Este enlace es válido por 30 minutos.<br>
            Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura.
          </p>
        </div>

        <div style="background-color: #161616; padding: 20px; text-align: center; border-top: 1px solid #2a2a2a;">
          <p style="font-size: 12px; color: rgba(255, 255, 255, 0.4); margin: 0;">
            &copy; 2026 QuickTech E-commerce. Tecnología al alcance de tu mano.
          </p>
        </div>
      </div>
    </div>
    `,
  };
  return transporter.sendMail(mailOptions);
};

export const hashResetToken = (token: string) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 10);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};
/*
const SALT_ROUNDS = 10;

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

//comparacion de la contraseña


export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};


export const generateResetToken = (): { token: string; tokenHash: string } => {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
};


export const hashResetToken = (token: string): string =>{
    return crypto.createHash('sha256').update(token).digest('hex');
};

export const getResetExpiresAt = (minutes = 30): Date =>{
    return new Date(Date.now() + minutes * 60 * 1000);
}

*/