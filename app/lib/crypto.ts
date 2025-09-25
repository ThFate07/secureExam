import CryptoJS from 'crypto-js';

const SECRET_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'fallback-secret-key';

export const encrypt = (text: string): string => {
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

export const decrypt = (ciphertext: string): string => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

export const hashPassword = (password: string): string => {
  return CryptoJS.SHA256(password).toString();
};

export const generateToken = (): string => {
  return CryptoJS.lib.WordArray.random(32).toString();
};

export const validateCSRF = (token: string, sessionToken: string): boolean => {
  return token === sessionToken;
};