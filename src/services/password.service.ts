import bcrypt from 'bcrypt';
import crypto from 'crypto';

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